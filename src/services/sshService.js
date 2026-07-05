const { randomUUID } = require("crypto");
const { EventEmitter } = require("events");
const fs = require("fs");
const path = require("path");
const { Client } = require("ssh2");

const SSH_PROFILES_PATH = path.resolve(__dirname, "..", "..", "config", "ssh-profiles.json");
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const DEFAULT_SHELL_COLS = 120;
const DEFAULT_SHELL_ROWS = 32;
const VALID_AUTH_TYPES = new Set(["password", "privateKey"]);

class SshServiceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "SshServiceError";
    this.code = details.code || null;
    this.status = details.status || null;
  }
}

function getDefaultProfilesConfig() {
  return {
    servers: [
      {
        id: "debian-server",
        displayName: "Debian Server",
        host: "192.168.1.134",
      },
    ],
    profiles: [
      {
        id: "debian-anx-password",
        serverId: "debian-server",
        displayName: "anx (Password)",
        host: "192.168.1.134",
        port: 22,
        username: "anx",
        authType: "password",
      },
    ],
    defaultServerId: "debian-server",
    defaultProfileId: "debian-anx-password",
  };
}

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePort(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 65535 ? number : 22;
}

function normalizeAuthType(value) {
  const normalized = trimValue(value);
  return VALID_AUTH_TYPES.has(normalized) ? normalized : "password";
}

function ensureProfilesDirectory() {
  fs.mkdirSync(path.dirname(SSH_PROFILES_PATH), { recursive: true });
}

function ensureProfilesFile() {
  ensureProfilesDirectory();

  if (!fs.existsSync(SSH_PROFILES_PATH)) {
    fs.writeFileSync(
      SSH_PROFILES_PATH,
      `${JSON.stringify(getDefaultProfilesConfig(), null, 2)}\n`,
      "utf8",
    );
  }
}

function normalizeServer(server, fallbackHost = "") {
  const host = trimValue(server?.host) || fallbackHost;
  const id = trimValue(server?.id) || (host ? host.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "");

  if (!id || !host) {
    return null;
  }

  return {
    id,
    displayName: trimValue(server?.displayName) || host,
    host,
  };
}

function normalizeProfile(profile, serverMap) {
  const serverId = trimValue(profile?.serverId);
  const server = serverMap.get(serverId) || null;
  const host = trimValue(profile?.host) || server?.host || "";
  const id = trimValue(profile?.id) || (host ? `${host}-${trimValue(profile?.username || "user")}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "");

  if (!id) {
    return null;
  }

  return {
    id,
    serverId: server?.id || serverId || null,
    displayName: trimValue(profile?.displayName) || `${trimValue(profile?.username) || "user"}@${host || "server"}`,
    host,
    port: normalizePort(profile?.port),
    username: trimValue(profile?.username),
    authType: normalizeAuthType(profile?.authType),
    privateKeyPath: trimValue(profile?.privateKeyPath) || null,
  };
}

function normalizeProfilesConfig(config = {}) {
  const defaultConfig = getDefaultProfilesConfig();
  const rawServers = Array.isArray(config.servers) ? config.servers : defaultConfig.servers;
  const servers = rawServers
    .map((server) => normalizeServer(server))
    .filter(Boolean);
  const serverMap = new Map(servers.map((server) => [server.id, server]));
  const rawProfiles = Array.isArray(config.profiles) ? config.profiles : defaultConfig.profiles;
  const profiles = rawProfiles
    .map((profile) => normalizeProfile(profile, serverMap))
    .filter(Boolean);

  return {
    servers,
    profiles,
    defaultServerId: trimValue(config.defaultServerId) || profiles[0]?.serverId || servers[0]?.id || null,
    defaultProfileId: trimValue(config.defaultProfileId) || profiles[0]?.id || null,
  };
}

function readProfilesConfig() {
  try {
    ensureProfilesFile();
    const rawConfig = fs.readFileSync(SSH_PROFILES_PATH, "utf8");
    return normalizeProfilesConfig(JSON.parse(rawConfig));
  } catch {
    return normalizeProfilesConfig(getDefaultProfilesConfig());
  }
}

function sanitizeProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    serverId: profile.serverId,
    displayName: profile.displayName,
    host: profile.host,
    port: profile.port,
    username: profile.username,
    authType: profile.authType,
    privateKeyPath: profile.privateKeyPath,
  };
}

function createSessionLabel(profile) {
  const host = trimValue(profile?.host) || "server";
  const username = trimValue(profile?.username) || "user";
  return trimValue(profile?.displayName) || `${username}@${host}`;
}

function mapConnectionError(error) {
  const code = error?.level === "client-authentication" ? "SSH_AUTH_FAILED" : error?.code || null;

  if (code === "SSH_AUTH_FAILED" || /all configured authentication methods failed|authentication/i.test(error?.message || "")) {
    return new SshServiceError("Authentication failed. Check your username, password, or private key.", {
      code: "SSH_AUTH_FAILED",
    });
  }

  if (code === "ECONNREFUSED") {
    return new SshServiceError("Connection refused. Verify the SSH service is running on the target host.", {
      code: "SSH_CONNECTION_REFUSED",
    });
  }

  if (code === "ETIMEDOUT" || /timed out/i.test(error?.message || "")) {
    return new SshServiceError("Connection timed out. The SSH host did not respond in time.", {
      code: "SSH_TIMEOUT",
    });
  }

  if (code === "EHOSTUNREACH" || code === "ENETUNREACH" || code === "ENOTFOUND") {
    return new SshServiceError("Host unreachable. Check the host address and network connectivity.", {
      code: "SSH_HOST_UNREACHABLE",
    });
  }

  return new SshServiceError("SSH connection failed.", {
    code: code || "SSH_CONNECTION_FAILED",
  });
}

function createSessionSnapshot(session) {
  return {
    id: session.id,
    profileId: session.profile.id,
    serverId: session.profile.serverId || null,
    label: session.label,
    host: session.profile.host,
    port: session.profile.port,
    username: session.profile.username,
    status: session.status,
    message: session.message || "",
    connected: session.status === "connected",
    createdAt: session.createdAt,
    connectedAt: session.connectedAt || null,
  };
}

class SshService extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  listProfiles() {
    const config = readProfilesConfig();

    return {
      servers: config.servers,
      profiles: config.profiles.map(sanitizeProfile),
      defaultServerId: config.defaultServerId,
      defaultProfileId: config.defaultProfileId,
      configPath: "config/ssh-profiles.json",
    };
  }

  getProfile(profileId) {
    const config = readProfilesConfig();
    const profile = config.profiles.find((candidate) => candidate.id === profileId);

    if (!profile) {
      throw new SshServiceError("SSH profile not found.", {
        code: "SSH_PROFILE_NOT_FOUND",
      });
    }

    return profile;
  }

  validateProfile(profile) {
    const missingFields = [];

    if (!trimValue(profile.host)) {
      missingFields.push("host");
    }

    if (!normalizePort(profile.port)) {
      missingFields.push("port");
    }

    if (!trimValue(profile.username)) {
      missingFields.push("username");
    }

    if (!VALID_AUTH_TYPES.has(profile.authType)) {
      missingFields.push("authType");
    }

    if (profile.authType === "privateKey" && !trimValue(profile.privateKeyPath)) {
      missingFields.push("privateKeyPath");
    }

    if (missingFields.length > 0) {
      throw new SshServiceError(`SSH profile is missing required fields: ${missingFields.join(", ")}.`, {
        code: "SSH_PROFILE_FIELDS_REQUIRED",
      });
    }
  }

  buildConnectConfig(profile, options = {}) {
    this.validateProfile(profile);

    const connectConfig = {
      host: profile.host,
      port: normalizePort(profile.port),
      username: profile.username,
      readyTimeout: DEFAULT_CONNECT_TIMEOUT_MS,
      keepaliveInterval: 15000,
      keepaliveCountMax: 2,
      tryKeyboard: false,
    };

    if (profile.authType === "password") {
      const password = typeof options.password === "string" ? options.password : "";

      if (!password) {
        throw new SshServiceError("Password required for this SSH profile.", {
          code: "SSH_PASSWORD_REQUIRED",
        });
      }

      connectConfig.password = password;
      return connectConfig;
    }

    try {
      connectConfig.privateKey = fs.readFileSync(profile.privateKeyPath, "utf8");
    } catch {
      throw new SshServiceError("Private key file could not be read.", {
        code: "SSH_PRIVATE_KEY_READ_FAILED",
      });
    }

    if (typeof options.passphrase === "string" && options.passphrase) {
      connectConfig.passphrase = options.passphrase;
    }

    return connectConfig;
  }

  connect(options = {}) {
    const profile = this.getProfile(options.profileId);
    const connectConfig = this.buildConnectConfig(profile, options);
    const sessionId = randomUUID();
    const client = new Client();
    const session = {
      id: sessionId,
      client,
      stream: null,
      profile,
      label: createSessionLabel(profile),
      createdAt: new Date().toISOString(),
      connectedAt: null,
      status: "connecting",
      message: "Connecting...",
      didClose: false,
    };

    this.sessions.set(sessionId, session);
    this.emit("session-updated", createSessionSnapshot(session));

    client.on("ready", () => {
      client.shell(
        {
          term: "xterm-256color",
          cols: Number.isFinite(options.cols) ? options.cols : DEFAULT_SHELL_COLS,
          rows: Number.isFinite(options.rows) ? options.rows : DEFAULT_SHELL_ROWS,
        },
        (error, stream) => {
          if (error) {
            this.handleSessionFailure(sessionId, mapConnectionError(error));
            return;
          }

          session.stream = stream;
          session.status = "connected";
          session.connectedAt = new Date().toISOString();
          session.message = `Connected to ${session.label}.`;
          this.emit("session-updated", createSessionSnapshot(session));

          stream.on("data", (chunk) => {
            this.emit("session-output", {
              sessionId,
              chunk: Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk),
            });
          });

          stream.on("close", () => {
            this.handleSessionClosed(sessionId, "SSH session closed.");
          });
        },
      );
    });

    client.on("error", (error) => {
      this.handleSessionFailure(sessionId, mapConnectionError(error));
    });

    client.on("close", () => {
      this.handleSessionClosed(sessionId, "SSH session disconnected.");
    });

    client.connect(connectConfig);

    return createSessionSnapshot(session);
  }

  handleSessionFailure(sessionId, error) {
    const session = this.sessions.get(sessionId);

    if (!session || session.didClose) {
      return;
    }

    session.status = "error";
    session.message = error.message;
    this.emit("session-updated", createSessionSnapshot(session));
    this.emit("session-error", {
      sessionId,
      message: error.message,
      code: error.code || "SSH_CONNECTION_FAILED",
    });
    this.destroySession(sessionId);
  }

  handleSessionClosed(sessionId, message) {
    const session = this.sessions.get(sessionId);

    if (!session || session.didClose) {
      return;
    }

    session.status = "disconnected";
    session.message = message;
    this.emit("session-updated", createSessionSnapshot(session));
    this.emit("session-closed", {
      sessionId,
      message,
    });
    this.destroySession(sessionId);
  }

  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session || session.didClose) {
      return;
    }

    session.didClose = true;

    try {
      session.stream?.removeAllListeners();
      session.stream?.end?.();
    } catch {}

    try {
      session.client?.removeAllListeners();
      session.client?.end?.();
      session.client?.destroy?.();
    } catch {}

    this.sessions.delete(sessionId);
  }

  disconnect(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new SshServiceError("SSH session not found.", {
        code: "SSH_SESSION_NOT_FOUND",
      });
    }

    this.handleSessionClosed(sessionId, "SSH session disconnected.");
    return { sessionId };
  }

  write(sessionId, input) {
    const session = this.sessions.get(sessionId);

    if (!session || session.status !== "connected" || !session.stream) {
      throw new SshServiceError("SSH session is not connected.", {
        code: "SSH_SESSION_NOT_CONNECTED",
      });
    }

    const data = typeof input === "string" ? input : "";

    if (!data) {
      return { sessionId };
    }

    session.stream.write(data);
    return { sessionId };
  }

  resize(sessionId, size = {}) {
    const session = this.sessions.get(sessionId);

    if (!session || session.status !== "connected" || !session.stream?.setWindow) {
      return { sessionId };
    }

    const rows = Number.isFinite(size.rows) ? size.rows : DEFAULT_SHELL_ROWS;
    const cols = Number.isFinite(size.cols) ? size.cols : DEFAULT_SHELL_COLS;
    session.stream.setWindow(rows, cols, 0, 0);
    return { sessionId };
  }
}

module.exports = {
  SSH_PROFILES_PATH,
  SshService,
  SshServiceError,
};
