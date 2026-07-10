const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");
const { app, safeStorage } = require("electron");
const {
  getAgentConfig,
  getAgentConfigPath,
  readAgentSettings,
  rotateAgentSettingsToken,
} = require("./agentClient");
const { tokenFingerprint } = require("../shared/agentTokenStore");
const { getCurrentSession: getCurrentAccountSession } = require("./accountService");
const {
  getConfiguredOwnerAccounts,
  isOwnerAccount,
} = require("./ownerAccountConfig");
const {
  getNode,
  getNodeAgentConfig,
} = require("./nodeService");

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PERSISTENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 10;
const BCRYPT_ROUNDS = 12;
const DEVELOPMENT_FALLBACK_OWNER_PASSWORD = "1245";
const SESSION_TIMEOUT_OPTIONS_MS = new Set([
  0,
  24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
  90 * 24 * 60 * 60 * 1000,
]);
const ROLE_PERMISSIONS = {
  Owner: ["*"],
  Admin: [
    "instance:write",
    "instance:lifecycle",
    "instance:delete",
    "files:write",
    "marketplace:install",
    "backups:write",
    "backups:restore",
    "settings:write",
  ],
  User: ["instance:lifecycle"],
};

let currentSession = null;
const rateBuckets = new Map();

function getConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) {
    return process.env.ANXHUB_CONFIG_DIR;
  }

  try {
    return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config");
  } catch {
    return path.join(process.cwd(), "config");
  }
}

function getSecurityPath() {
  return path.join(getConfigDirectory(), "security.json");
}

function getPersistentSessionPath() {
  return path.join(getConfigDirectory(), "session.dat");
}

function getAuditPath() {
  return path.join(getConfigDirectory(), "audit.log");
}

function isTrustedDevelopmentMode() {
  if (process.env.ANXOS_FORCE_PRODUCTION === "1") {
    return false;
  }
  if (process.env.ANXOS_TRUSTED_DEVELOPMENT_MODE === "1") {
    try {
      if (typeof app?.isPackaged === "boolean") {
        return app.isPackaged === false;
      }
    } catch {
      return process.env.NODE_ENV === "development" || process.defaultApp === true;
    }
    return process.env.NODE_ENV === "development" || process.defaultApp === true;
  }
  try {
    if (app?.isPackaged === false) {
      return true;
    }
  } catch {}
  return process.env.NODE_ENV === "development" && process.defaultApp === true;
}

function getDevelopmentOwnerPassword() {
  if (!isTrustedDevelopmentMode()) {
    return null;
  }
  return process.env.ANXOS_DEV_OWNER_PASSWORD || DEVELOPMENT_FALLBACK_OWNER_PASSWORD;
}

function ensureConfigDirectory() {
  fs.mkdirSync(getConfigDirectory(), { recursive: true });
}

function readSecurityState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getSecurityPath(), "utf8"));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      persistentSessions: Array.isArray(parsed.persistentSessions) ? parsed.persistentSessions : [],
      trustedDevices: Array.isArray(parsed.trustedDevices) ? parsed.trustedDevices : [],
      agentTokens: parsed.agentTokens && typeof parsed.agentTokens === "object" ? parsed.agentTokens : {},
      settings: {
        sessionTtlMs: Number.parseInt(parsed.settings?.sessionTtlMs, 10) || SESSION_TTL_MS,
        persistentSessionTtlMs: Number.parseInt(parsed.settings?.persistentSessionTtlMs, 10) || PERSISTENT_SESSION_TTL_MS,
        inactiveSessionExpirationMs: Number.parseInt(parsed.settings?.inactiveSessionExpirationMs, 10) || 0,
        lockOwnerWorkspaceAfterInactivity: parsed.settings?.lockOwnerWorkspaceAfterInactivity !== false,
        requireReauthForSensitiveActions: parsed.settings?.requireReauthForSensitiveActions !== false,
        requireAuthenticatedAccountForRemoteAccess: parsed.settings?.requireAuthenticatedAccountForRemoteAccess === true,
        requireTrustedDeviceForRemoteAccess: parsed.settings?.requireTrustedDeviceForRemoteAccess === true,
        remoteAccessAutoDisableMs: Number.parseInt(parsed.settings?.remoteAccessAutoDisableMs, 10) || 0,
      },
    };
  } catch {
    return {
      users: [],
      persistentSessions: [],
      trustedDevices: [],
      agentTokens: {},
      settings: {
        sessionTtlMs: SESSION_TTL_MS,
        persistentSessionTtlMs: PERSISTENT_SESSION_TTL_MS,
        inactiveSessionExpirationMs: 0,
        lockOwnerWorkspaceAfterInactivity: true,
        requireReauthForSensitiveActions: true,
        requireAuthenticatedAccountForRemoteAccess: false,
        requireTrustedDeviceForRemoteAccess: false,
        remoteAccessAutoDisableMs: 0,
      },
    };
  }
}

function writeSecurityState(state) {
  ensureConfigDirectory();
  fs.writeFileSync(getSecurityPath(), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

function removePersistentSessionFile() {
  try {
    fs.rmSync(getPersistentSessionPath(), { force: true });
  } catch {}
}

function getFallbackEncryptionKey() {
  let username = "local-user";
  try {
    username = os.userInfo().username || username;
  } catch {}

  return crypto.scryptSync(
    `${username}:${os.hostname()}:${getSecurityPath()}`,
    "anxhub-local-session",
    32
  );
}

function encryptLocalSession(value) {
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  if (safeStorage?.isEncryptionAvailable?.()) {
    return {
      method: "safeStorage",
      data: safeStorage.encryptString(payload.toString("utf8")).toString("base64"),
    };
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getFallbackEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return {
    method: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptLocalSession(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  if (record.method === "safeStorage" && safeStorage?.isEncryptionAvailable?.()) {
    return JSON.parse(safeStorage.decryptString(Buffer.from(record.data || "", "base64")));
  }

  if (record.method === "aes-256-gcm") {
    const decipher = crypto.createDecipheriv("aes-256-gcm", getFallbackEncryptionKey(), Buffer.from(record.iv || "", "base64"));
    decipher.setAuthTag(Buffer.from(record.tag || "", "base64"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(record.data || "", "base64")), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  }

  return null;
}

function writePersistentSessionFile(payload) {
  ensureConfigDirectory();
  fs.writeFileSync(getPersistentSessionPath(), `${JSON.stringify(encryptLocalSession(payload))}\n`, { mode: 0o600 });
}

function readPersistentSessionFile() {
  try {
    return decryptLocalSession(JSON.parse(fs.readFileSync(getPersistentSessionPath(), "utf8")));
  } catch {
    removePersistentSessionFile();
    return null;
  }
}

function getPasswordHashDigest(user) {
  return crypto.createHash("sha256").update(String(user?.passwordHash || "")).digest("base64url");
}

function pruneExpiredPersistentSessions(state, now = Date.now()) {
  const originalCount = state.persistentSessions.length;
  state.persistentSessions = state.persistentSessions.filter((session) => Date.parse(session.expiresAt || "") > now);
  return state.persistentSessions.length !== originalCount;
}

function removePersistentSessionRecord(sessionId) {
  if (!sessionId) {
    return;
  }
  const state = readSecurityState();
  const nextSessions = state.persistentSessions.filter((entry) => entry.id !== sessionId);
  if (nextSessions.length !== state.persistentSessions.length) {
    state.persistentSessions = nextSessions;
    writeSecurityState(state);
  }
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    account: Boolean(user.account),
    email: user.email || null,
    provider: user.provider || null,
    ownerAuthorized: Boolean(user.ownerAuthorized),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null,
  };
}

function accountSessionToSecurityUser(accountSession) {
  if (!accountSession) {
    return null;
  }
  const account = accountSession.account || accountSession.user || {};
  const ownerAuthorized = isOwnerAccount({
    id: account.id,
    email: account.email,
  });
  return {
    id: account.id || "anxos-account",
    username: account.displayName || account.username || account.email || "AnxOS Account",
    email: account.email || null,
    provider: accountSession.provider || account.provider || "AnxOS",
    role: ownerAuthorized ? "Owner" : "Account",
    account: true,
    ownerAuthorized,
    createdAt: accountSession.createdAt || null,
    updatedAt: null,
    lastLoginAt: null,
  };
}

function getCurrentUser() {
  restorePersistentSession();
  if (!currentSession || currentSession.expiresAt <= Date.now()) {
    if (currentSession?.persistent) {
      removePersistentSessionFile();
    }
    currentSession = null;
    return null;
  }

  if (currentSession.developmentOwner === true) {
    if (!isTrustedDevelopmentMode()) {
      currentSession = null;
      return null;
    }
    return publicUser(currentSession.userSnapshot);
  }

  const user = readSecurityState().users.find((entry) => entry.id === currentSession.userId);
  if (!user) {
    if (currentSession.persistent) {
      removePersistentSessionFile();
    }
    currentSession = null;
    return null;
  }

  if (currentSession.persistent && currentSession.passwordHashDigest !== getPasswordHashDigest(user)) {
    removePersistentSessionRecord(currentSession.persistentSessionId);
    removePersistentSessionFile();
    currentSession = null;
    return null;
  }

  return publicUser(user);
}

async function createPersistentSession(state, user) {
  const rawToken = crypto.randomBytes(48).toString("base64url");
  const session = {
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: await bcrypt.hash(rawToken, BCRYPT_ROUNDS),
    passwordHashDigest: getPasswordHashDigest(user),
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (state.settings.persistentSessionTtlMs || PERSISTENT_SESSION_TTL_MS)).toISOString(),
  };
  state.persistentSessions.push(session);
  writePersistentSessionFile({
    sessionId: session.id,
    token: rawToken,
    expiresAt: session.expiresAt,
  });
  return session;
}

function createRuntimeSession(user, expiresAt, persistent = false, persistentSessionId = null) {
  currentSession = {
    token: crypto.randomBytes(32).toString("base64url"),
    userId: user.id,
    expiresAt,
    persistent,
    persistentSessionId,
    passwordHashDigest: getPasswordHashDigest(user),
  };
}

function restorePersistentSession() {
  if (currentSession) {
    return null;
  }

  const localSession = readPersistentSessionFile();
  if (!localSession?.sessionId || !localSession?.token) {
    return null;
  }

  const state = readSecurityState();
  const now = Date.now();
  let changed = pruneExpiredPersistentSessions(state, now);
  const session = state.persistentSessions.find((entry) => entry.id === localSession.sessionId);
  const user = session ? state.users.find((entry) => entry.id === session.userId) : null;

  if (!session || !user || Date.parse(session.expiresAt || "") <= now || session.passwordHashDigest !== getPasswordHashDigest(user)) {
    removePersistentSessionFile();
    if (session) {
      state.persistentSessions = state.persistentSessions.filter((entry) => entry.id !== session.id);
      changed = true;
    }
    if (changed) {
      writeSecurityState(state);
    }
    return null;
  }

  let ok = false;
  try {
    ok = bcrypt.compareSync(String(localSession.token), session.tokenHash);
  } catch {
    ok = false;
  }

  if (!ok) {
    removePersistentSessionFile();
    state.persistentSessions = state.persistentSessions.filter((entry) => entry.id !== session.id);
    writeSecurityState(state);
    return null;
  }

  session.lastUsedAt = new Date().toISOString();
  writeSecurityState(state);
  createRuntimeSession(user, Date.parse(session.expiresAt), true, session.id);
  audit({ action: "security.session.restore", outcome: "ok", actor: publicUser(user) });
  return publicUser(user);
}

function audit(event) {
  ensureConfigDirectory();
  const actor = event.actor || getCurrentUser();
  const record = {
    at: new Date().toISOString(),
    actor: actor ? { id: actor.id, username: actor.username, role: actor.role } : null,
    action: event.action,
    outcome: event.outcome || "ok",
    target: event.target || null,
    reason: event.reason || null,
  };

  fs.appendFileSync(getAuditPath(), `${JSON.stringify(record)}\n`, { mode: 0o600 });
}

function redactSensitive(value) {
  return String(value || "")
    .replace(/(authorization|cookie|password|refresh[_-]?token|access[_-]?token|agent[_-]?token|api[_-]?key|secret)\s*[:=]\s*[^,\s}]+/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[redacted]");
}

function getCurrentDeviceId() {
  return crypto
    .createHash("sha256")
    .update(`${os.hostname()}:${os.platform()}:${os.arch()}:${getSecurityPath()}`)
    .digest("hex")
    .slice(0, 16);
}

function getCurrentDeviceInfo() {
  return {
    id: getCurrentDeviceId(),
    name: os.hostname(),
    platform: `${os.platform()} ${os.arch()}`,
    firstSeen: null,
    lastSeen: new Date().toISOString(),
    current: true,
  };
}

function normalizeTrustedDevices(state) {
  const current = getCurrentDeviceInfo();
  const devices = Array.isArray(state.trustedDevices) ? state.trustedDevices : [];
  let changed = false;
  const existing = devices.find((device) => device.id === current.id);
  if (!existing) {
    devices.push({
      ...current,
      trusted: true,
      firstSeen: new Date().toISOString(),
      trustExpiresAt: null,
    });
    changed = true;
  } else {
    existing.name = existing.name || current.name;
    existing.platform = existing.platform || current.platform;
    existing.lastSeen = current.lastSeen;
    existing.trusted = existing.trusted !== false;
    changed = true;
  }
  state.trustedDevices = devices;
  return changed;
}

function safeIso(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function getAuditEvents(limit = 80) {
  try {
    return fs.readFileSync(getAuditPath(), "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(250, limit)))
      .map((line) => {
        try {
          const entry = JSON.parse(line);
          return {
            timestamp: safeIso(entry.at) || new Date().toISOString(),
            type: String(entry.action || "security.event"),
            category: categorizeSecurityEvent(entry.action),
            device: os.hostname(),
            actor: entry.actor ? {
              id: entry.actor.id || null,
              username: entry.actor.username || null,
              role: entry.actor.role || null,
            } : null,
            result: entry.outcome || "ok",
            details: {
              target: redactSensitive(entry.target || ""),
              reason: redactSensitive(entry.reason || ""),
            },
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();
  } catch {
    return [];
  }
}

function categorizeSecurityEvent(action = "") {
  if (/login|logout|session|account/i.test(action)) return "authentication";
  if (/token/i.test(action)) return "tokens";
  if (/remote|agent/i.test(action)) return "remote";
  if (/owner|workspace/i.test(action)) return "owner";
  if (/trusted|device/i.test(action)) return "sessions";
  if (/failed|denied|warn/i.test(action)) return "warnings";
  return "all";
}

function getSessionRows(state, status) {
  const now = Date.now();
  const currentDevice = getCurrentDeviceInfo();
  const rows = state.persistentSessions.map((session) => ({
    id: session.id,
    deviceName: session.deviceName || currentDevice.name,
    operatingSystem: session.platform || currentDevice.platform,
    location: session.location || "Unavailable",
    ipAddress: session.ipAddress || "Unavailable",
    lastActiveAt: safeIso(session.lastUsedAt),
    createdAt: safeIso(session.createdAt),
    expiresAt: safeIso(session.expiresAt),
    current: currentSession?.persistentSessionId === session.id,
    trusted: state.trustedDevices.some((device) => device.id === currentDevice.id && device.trusted !== false),
    expired: Date.parse(session.expiresAt || "") <= now,
  }));
  if (status.authenticated && !rows.some((row) => row.current)) {
    rows.unshift({
      id: "runtime-current",
      deviceName: currentDevice.name,
      operatingSystem: currentDevice.platform,
      location: "Unavailable",
      ipAddress: "Unavailable",
      lastActiveAt: new Date().toISOString(),
      createdAt: currentSession?.expiresAt ? new Date(Math.min(Date.now(), currentSession.expiresAt)).toISOString() : null,
      expiresAt: currentSession?.expiresAt ? new Date(currentSession.expiresAt).toISOString() : null,
      current: true,
      trusted: true,
      runtimeOnly: true,
      expired: false,
    });
  }
  return rows;
}

function getNodeScopedAgentSettings(options = {}) {
  if (options?.nodeId && options.nodeId !== "default") {
    return getNodeAgentConfig(options.nodeId);
  }
  return readAgentSettings();
}

function getAgentTokenSummary(state, options = {}) {
  const settings = getNodeScopedAgentSettings(options);
  const effectiveConfig = options?.nodeId && options.nodeId !== "default"
    ? getAgentConfig(settings)
    : getAgentConfig();
  const agentToken = effectiveConfig.token || settings.agentToken || "";
  const agentUrl = settings.agentUrl || effectiveConfig.url || "";
  let stat = null;
  try {
    stat = fs.statSync(getAgentConfigPath());
  } catch {}
  const fingerprint = tokenFingerprint(agentToken);
  const tokenRecord = state.agentTokens?.[fingerprint] || {};
  return {
    configured: Boolean(agentToken),
    fingerprint,
    createdAt: safeIso(tokenRecord.createdAt) || (stat ? stat.birthtime.toISOString() : null),
    lastRotatedAt: safeIso(tokenRecord.lastRotatedAt) || (stat ? stat.mtime.toISOString() : null),
    lastUsedAt: safeIso(tokenRecord.lastUsedAt),
    scope: options?.nodeId && options.nodeId !== "default" ? "Selected remote node" : settings.backendMode === "agent" ? "Remote agent" : "Local device",
    expirationState: "No expiration",
    associatedDevice: options?.nodeId && options.nodeId !== "default"
      ? getNode(options.nodeId)?.displayName || agentUrl
      : agentUrl || "This Device",
    configPath: getAgentConfigPath(),
  };
}

function getRemoteAccessSummary(state, options = {}) {
  const settings = getNodeScopedAgentSettings(options);
  const enabled = settings.backendMode === "agent" || settings.backendMode === "auto";
  let parsed = null;
  try {
    parsed = new URL(settings.agentUrl);
  } catch {}
  const host = parsed?.hostname || null;
  const localOnly = !host || host === "127.0.0.1" || host === "localhost";
  const localNetwork = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host || "");
  return {
    enabled,
    address: settings.agentUrl || null,
    port: parsed?.port || "Unavailable",
    scope: !enabled ? "Disabled" : localOnly ? "Localhost only" : localNetwork ? "Local network only" : "Remote",
    exposedBeyondLocalNetwork: Boolean(enabled && !localOnly && !localNetwork),
    requireAuthenticatedAccount: Boolean(state.settings.requireAuthenticatedAccountForRemoteAccess),
    requireTrustedDevice: Boolean(state.settings.requireTrustedDeviceForRemoteAccess),
    autoDisableMs: state.settings.remoteAccessAutoDisableMs || 0,
  };
}

function buildRecommendations({ status, sessions, trustedDevices, remoteAccess, token, events, state }) {
  const recommendations = [];
  if (status.accountAuthenticated && status.user?.email && !status.user?.emailConfirmedAt) {
    recommendations.push({
      id: "email-verification-unavailable",
      severity: "info",
      title: "Email verification status unavailable",
      explanation: "Supabase email verification details are not reported to this desktop build.",
      action: "Open Account Page",
      dismissible: true,
    });
  }
  if (sessions.length > 1) {
    recommendations.push({
      id: "review-active-sessions",
      severity: "medium",
      title: "Review active sessions",
      explanation: `${sessions.length} sessions are known on this device.`,
      action: "Review",
      dismissible: true,
    });
  }
  if (remoteAccess.exposedBeyondLocalNetwork) {
    recommendations.push({
      id: "remote-access-exposed",
      severity: "high",
      title: "Remote access is exposed beyond the local network",
      explanation: "Review the listening address and disable remote access when you do not need it.",
      action: "Disable Remote Access",
      dismissible: false,
    });
  }
  if (!token.configured && remoteAccess.enabled) {
    recommendations.push({
      id: "agent-token-missing",
      severity: "critical",
      title: "Agent token is not configured",
      explanation: "Protected remote-agent routes require a shared token.",
      action: "Generate Token",
      dismissible: false,
    });
  }
  const lastRotation = Date.parse(token.lastRotatedAt || token.createdAt || "");
  if (token.configured && Number.isFinite(lastRotation) && Date.now() - lastRotation > 90 * 24 * 60 * 60 * 1000) {
    recommendations.push({
      id: "rotate-old-token",
      severity: "medium",
      title: "Rotate an old agent token",
      explanation: "The current agent token appears older than 90 days.",
      action: "Rotate Token",
      dismissible: true,
    });
  }
  const failedLogins = events.filter((event) => /login/i.test(event.type) && event.result === "failed");
  if (failedLogins.length > 0) {
    recommendations.push({
      id: "failed-signins",
      severity: "medium",
      title: "Review recent failed sign-in attempts",
      explanation: `${failedLogins.length} failed sign-in event${failedLogins.length === 1 ? "" : "s"} found in the recent audit log.`,
      action: "Review Events",
      dismissible: true,
    });
  }
  if (!state.settings.inactiveSessionExpirationMs) {
    recommendations.push({
      id: "session-expiration",
      severity: "low",
      title: "Configure automatic session expiration",
      explanation: "Inactive sessions are currently not set to expire automatically beyond normal token lifetime.",
      action: "Configure",
      dismissible: true,
    });
  }
  return recommendations;
}

function getSecurityDashboard(options = {}) {
  const actor = requirePermission("settings:write", "security-dashboard");
  const status = getStatus();
  const state = readSecurityState();
  if (normalizeTrustedDevices(state)) {
    writeSecurityState(state);
  }
  const events = getAuditEvents();
  const sessions = getSessionRows(state, status);
  const trustedDevices = state.trustedDevices.map((device) => ({
    id: device.id,
    name: device.name || "Unnamed device",
    platform: device.platform || "Unavailable",
    firstSeen: safeIso(device.firstSeen),
    lastSeen: safeIso(device.lastSeen),
    trustExpiresAt: safeIso(device.trustExpiresAt),
    current: device.id === getCurrentDeviceId(),
    trusted: device.trusted !== false,
  }));
  const token = getAgentTokenSummary(state, options);
  const remoteAccess = getRemoteAccessSummary(state, options);
  const recommendations = buildRecommendations({ status, sessions, trustedDevices, remoteAccess, token, events, state });
  const unresolvedWarnings = recommendations.filter((item) => item.severity !== "info" && item.severity !== "low").length;
  const overall = unresolvedWarnings >= 2 || recommendations.some((item) => item.severity === "critical")
    ? "Critical"
    : unresolvedWarnings > 0 || recommendations.length > 0
      ? "Needs Attention"
      : "Good";
  return {
    actor: publicUser(actor),
    overview: {
      status: overall,
      signedInAccount: status.user?.username || "This Device",
      deviceTrustState: trustedDevices.find((device) => device.current)?.trusted ? "Trusted" : "Untrusted",
      activeSessionCount: sessions.length,
      remoteAccessStatus: remoteAccess.enabled ? remoteAccess.scope : "Disabled",
      agentTokenStatus: token.configured ? "Configured" : "Missing",
      lastSecurityEvent: events[0] || null,
      unresolvedWarnings,
    },
    recommendations,
    sessions,
    trustedDevices,
    remoteAccess,
    agentToken: token,
    authentication: {
      emailVerification: status.accountAuthenticated ? "Unavailable" : "Not connected",
      twoFactor: "Not reported",
      passwordLastChangedAt: null,
      accountRecovery: status.accountAuthenticated ? "Manage on account website" : "Not connected",
      recentFailedSignIns: events.filter((event) => /login/i.test(event.type) && event.result === "failed").length,
      sessionTimeoutMs: state.settings.inactiveSessionExpirationMs || 0,
      lockOwnerWorkspaceAfterInactivity: Boolean(state.settings.lockOwnerWorkspaceAfterInactivity),
      requireReauthForSensitiveActions: Boolean(state.settings.requireReauthForSensitiveActions),
    },
    events,
    auditPath: getAuditPath(),
  };
}

function getAuditFolderForOpen() {
  requirePermission("settings:write", "audit-log");
  return path.dirname(getAuditPath());
}

function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || [];
  const active = bucket.filter((timestamp) => now - timestamp < windowMs);
  active.push(now);
  rateBuckets.set(key, active);

  if (active.length > limit) {
    const error = new Error("Too many requests. Try again shortly.");
    error.code = "RATE_LIMITED";
    throw error;
  }
}

function getRateLimitState(key, windowMs) {
  const now = Date.now();
  const active = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  rateBuckets.set(key, active);
  return {
    key,
    count: active.length,
    windowMs,
  };
}

function recordRateLimitAttempt(key, limit, windowMs, details = {}) {
  const now = Date.now();
  const active = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  active.push(now);
  rateBuckets.set(key, active);
  console.warn("[Security] Rate-limit attempt recorded.", {
    key,
    count: active.length,
    limit,
    windowMs,
    reason: details.reason || null,
  });
  if (active.length > limit) {
    const error = new Error("Too many requests. Try again shortly.");
    error.code = "RATE_LIMITED";
    console.warn("[Security] Rate limit triggered.", {
      key,
      count: active.length,
      limit,
      windowMs,
      reason: details.reason || null,
    });
    throw error;
  }
}

function resetRateLimit(key, reason = "reset") {
  if (rateBuckets.delete(key)) {
    console.info("[Security] Rate-limit bucket reset.", { key, reason });
  }
}

function normalizeUsername(value) {
  const username = String(value || "").trim();
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
    const error = new Error("Use a username with 3-40 letters, numbers, dots, dashes, or underscores.");
    error.code = "INVALID_USERNAME";
    throw error;
  }
  return username;
}

function normalizeRole(value, fallback = "User") {
  const role = String(value || fallback).trim();
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) {
    const error = new Error("Invalid role.");
    error.code = "INVALID_ROLE";
    throw error;
  }
  return role;
}

function validatePassword(value) {
  const password = String(value || "");
  if (password.length < PASSWORD_MIN_LENGTH) {
    const error = new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    error.code = "WEAK_PASSWORD";
    throw error;
  }
  return password;
}

function validateProductionOwnerPassword(password) {
  if (isTrustedDevelopmentMode()) {
    return;
  }
  const normalized = String(password || "");
  if (normalized === DEVELOPMENT_FALLBACK_OWNER_PASSWORD) {
    const error = new Error("Choose a stronger owner password.");
    error.code = "WEAK_PASSWORD";
    throw error;
  }
  if (/^(password|admin|owner|anxos|qwerty|letmein|123456|1234567890)$/i.test(normalized) || /^(\d)\1+$/.test(normalized)) {
    const error = new Error("Choose a stronger owner password.");
    error.code = "WEAK_PASSWORD";
    throw error;
  }
}

function getStatus() {
  const user = getCurrentUser();
  const accountSession = getCurrentAccountSession();
  const accountUser = accountSessionToSecurityUser(accountSession);
  const state = readSecurityState();
  if (pruneExpiredPersistentSessions(state)) {
    writeSecurityState(state);
  }
  const hasAdminUser = state.users.some((entry) => entry.role === "Owner" || entry.role === "Admin");
  const localMode = !hasAdminUser;
  return {
    setupRequired: !hasAdminUser,
    localMode,
    remoteControlEnabled: hasAdminUser,
    authenticated: Boolean(user || accountUser),
    user: user || accountUser,
    accountAuthenticated: Boolean(accountUser),
    roles: Object.keys(ROLE_PERMISSIONS),
    permissions: (user || accountUser) ? ROLE_PERMISSIONS[(user || accountUser).role] || [] : localMode ? ["local:*"] : [],
    ownerWorkspaceAvailable: Boolean((user || accountUser)?.role === "Owner" && (user || accountUser)?.ownerAuthorized !== false),
    ownerAccountConfigured: Boolean(getConfiguredOwnerAccounts().userIds.length || getConfiguredOwnerAccounts().emails.length),
    trustedDevelopmentMode: isTrustedDevelopmentMode(),
    agentTokenConfigured: Boolean(readAgentSettings().agentToken || getAgentConfig().token),
    persistentSession: Boolean(currentSession?.persistent),
    persistentSessionCount: state.persistentSessions.length,
    securityPath: getSecurityPath(),
    auditPath: getAuditPath(),
  };
}

async function setupAdmin(payload = {}) {
  checkRateLimit("setup-admin", 5, 10 * 60 * 1000);
  const state = readSecurityState();
  if (state.users.some((entry) => entry.role === "Owner" || entry.role === "Admin")) {
    const error = new Error("Security setup is already complete.");
    error.code = "SETUP_COMPLETE";
    throw error;
  }

  const username = normalizeUsername(payload.username || "owner");
  const rawPassword = String(payload.password || "");
  const developmentPassword = getDevelopmentOwnerPassword();
  const password = developmentPassword && rawPassword === developmentPassword ? rawPassword : validatePassword(rawPassword);
  if (payload.passwordConfirm !== undefined && String(payload.passwordConfirm || "") !== password) {
    const error = new Error("Password confirmation does not match.");
    error.code = "PASSWORD_CONFIRMATION_MISMATCH";
    throw error;
  }
  validateProductionOwnerPassword(password);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = {
    id: crypto.randomUUID(),
    username,
    role: "Owner",
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  state.users.push(user);
  writeSecurityState(state);
  audit({ action: "security.setup", outcome: "ok", actor: publicUser(user) });
  return login({ username, password, staySignedIn: payload.staySignedIn });
}

async function login(payload = {}) {
  const username = normalizeUsername(payload.username);
  const activeUser = getCurrentUser();
  if (activeUser?.username?.toLowerCase() === username.toLowerCase() && currentSession) {
    console.info("[Security] Login request ignored because the user is already signed in.", {
      username,
      persistent: currentSession.persistent === true,
    });
    return {
      token: currentSession.token,
      expiresAt: new Date(currentSession.expiresAt).toISOString(),
      persistent: currentSession.persistent === true,
      user: activeUser,
    };
  }

  const rateLimitKey = `login:${username.toLowerCase()}`;
  const rateLimitWindowMs = 5 * 60 * 1000;
  const rateLimitLimit = 6;
  const rateLimitState = getRateLimitState(rateLimitKey, rateLimitWindowMs);
  console.info("[Security] Login attempt started.", {
    username,
    failedAttemptCount: rateLimitState.count,
    limit: rateLimitLimit,
    staySignedIn: payload.staySignedIn === true,
  });
  if (rateLimitState.count >= rateLimitLimit) {
    console.warn("[Security] Login blocked by rate limit before credential check.", {
      username,
      failedAttemptCount: rateLimitState.count,
      limit: rateLimitLimit,
    });
    const error = new Error("Too many requests. Try again shortly.");
    error.code = "RATE_LIMITED";
    throw error;
  }
  const state = readSecurityState();
  const user = state.users.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
  const password = String(payload.password || "");
  const developmentPassword = getDevelopmentOwnerPassword();
  const devFallbackOk = !user && state.users.length === 0 && username.toLowerCase() === "anx" && developmentPassword && password === developmentPassword;
  const ok = devFallbackOk || (user ? await bcrypt.compare(password, user.passwordHash) : false);

  if (!isTrustedDevelopmentMode() && password === DEVELOPMENT_FALLBACK_OWNER_PASSWORD) {
    audit({ action: "security.login", outcome: "failed", target: username, reason: "DEFAULT_DEV_PASSWORD_REJECTED" });
    recordRateLimitAttempt(rateLimitKey, rateLimitLimit, rateLimitWindowMs, { reason: "INVALID_CREDENTIALS" });
    const error = new Error("Invalid username or password. This is the local owner account for this device, not an online Anx account.");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  if (!ok) {
    audit({ action: "security.login", outcome: "failed", target: username, reason: "INVALID_CREDENTIALS" });
    recordRateLimitAttempt(rateLimitKey, rateLimitLimit, rateLimitWindowMs, { reason: "INVALID_CREDENTIALS" });
    const error = new Error("Invalid username or password. This is the local owner account for this device, not an online Anx account.");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  resetRateLimit(rateLimitKey, "successful-login");

  const authenticatedUser = user || {
    id: "development-owner",
    username: "Anx",
    role: "Owner",
    passwordHash: "development-runtime-only",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  if (user) {
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    pruneExpiredPersistentSessions(state);
  }
  let persistentSession = null;
  if (payload.staySignedIn === true && user) {
    persistentSession = await createPersistentSession(state, user);
  } else {
    removePersistentSessionFile();
  }
  if (user) {
    writeSecurityState(state);
  }
  const expiresAt = persistentSession
    ? Date.parse(persistentSession.expiresAt)
    : Date.now() + (state.settings.sessionTtlMs || SESSION_TTL_MS);
  createRuntimeSession(authenticatedUser, expiresAt, Boolean(persistentSession), persistentSession?.id || null);
  if (devFallbackOk) {
    currentSession.developmentOwner = true;
    currentSession.userSnapshot = publicUser(authenticatedUser);
  }
  audit({ action: "security.login", outcome: "ok", actor: publicUser(authenticatedUser), reason: devFallbackOk ? "DEVELOPMENT_OWNER_FALLBACK" : null });

  return {
    token: currentSession.token,
    expiresAt: new Date(currentSession.expiresAt).toISOString(),
    persistent: Boolean(persistentSession),
    user: publicUser(authenticatedUser),
  };
}

function logout() {
  const actor = getCurrentUser();
  const persistentSessionId = currentSession?.persistentSessionId || null;
  if (persistentSessionId) {
    const state = readSecurityState();
    state.persistentSessions = state.persistentSessions.filter((entry) => entry.id !== persistentSessionId);
    writeSecurityState(state);
    removePersistentSessionFile();
  }
  currentSession = null;
  audit({ action: "security.logout", outcome: "ok", actor });
  return { ok: true };
}

function logoutAllSessions() {
  const actor = requirePermission("settings:write", "security-sessions");
  const state = readSecurityState();
  state.persistentSessions = [];
  writeSecurityState(state);
  removePersistentSessionFile();
  currentSession = null;
  audit({ action: "security.sessions.logoutAll", outcome: "ok", actor });
  return { ok: true };
}

function userHasPermission(user, permission) {
  if (!permission) {
    return true;
  }

  if (!user) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}

function requirePermission(permission, target = null) {
  const status = getStatus();
  if (status.accountAuthenticated && status.user?.role === "Owner" && status.user?.ownerAuthorized === true) {
    return {
      ...status.user,
      permissions: ["*"],
    };
  }

  if (status.setupRequired) {
    return {
      id: "local-device",
      username: "This Device",
      role: "Local",
      localMode: true,
      permissions: ["local:*"],
    };
  }

  if (!status.user) {
    const error = new Error("Sign in to continue.");
    error.code = "LOGIN_REQUIRED";
    throw error;
  }

  if (!userHasPermission(status.user, permission)) {
    audit({ action: "security.permission", outcome: "denied", target, reason: permission });
    const error = new Error("Your role does not allow this action.");
    error.code = "PERMISSION_DENIED";
    throw error;
  }

  return status.user;
}

function requireOwner(target = "owner-workspace") {
  const status = getStatus();
  if (!status.user || status.user.role !== "Owner" || (status.user.account === true && status.user.ownerAuthorized !== true)) {
    audit({ action: "security.ownerWorkspace", outcome: "denied", target, reason: "OWNER_REQUIRED" });
    const error = new Error("Owner access is required.");
    error.code = "OWNER_REQUIRED";
    throw error;
  }
  return status.user;
}

function allowReadCompatibility() {
  const status = getStatus();
  return status.setupRequired || status.authenticated;
}

function rotateAgentToken() {
  const actor = requirePermission("settings:write", "agent-token");
  checkRateLimit("agent-token-rotate", 10, 10 * 60 * 1000);
  const current = readAgentSettings();
  const rotated = rotateAgentSettingsToken(current);
  const state = readSecurityState();
  state.agentTokens = state.agentTokens || {};
  state.agentTokens[rotated.fingerprint] = {
    createdAt: state.agentTokens[rotated.fingerprint]?.createdAt || new Date().toISOString(),
    lastRotatedAt: new Date().toISOString(),
    lastUsedAt: null,
    scope: current.backendMode === "agent" ? "Remote agent" : "Local device",
    associatedDevice: current.agentUrl || "This Device",
  };
  writeSecurityState(state);
  audit({ action: "agent.token.rotate", outcome: "ok", actor, target: getAgentConfigPath() });
  return {
    configured: true,
    fingerprint: rotated.fingerprint,
    restartRequired: true,
    message: "Agent token rotated. Restart the AnxOS agent and desktop app so both reload the shared token.",
  };
}

function revokePersistentSession(sessionId) {
  const actor = requirePermission("settings:write", "security-session");
  const target = String(sessionId || "");
  if (!target || target === "runtime-current") {
    const error = new Error("This session cannot be revoked from the session list.");
    error.code = "INVALID_SESSION";
    throw error;
  }
  const state = readSecurityState();
  const before = state.persistentSessions.length;
  state.persistentSessions = state.persistentSessions.filter((entry) => entry.id !== target);
  if (state.persistentSessions.length === before) {
    const error = new Error("Session was not found.");
    error.code = "SESSION_NOT_FOUND";
    throw error;
  }
  writeSecurityState(state);
  if (currentSession?.persistentSessionId === target) {
    currentSession = null;
    removePersistentSessionFile();
  }
  audit({ action: "security.session.revoke", outcome: "ok", actor, target });
  return getSecurityDashboard();
}

function revokeOtherSessions() {
  const actor = requirePermission("settings:write", "security-sessions");
  const currentId = currentSession?.persistentSessionId || null;
  const state = readSecurityState();
  state.persistentSessions = currentId
    ? state.persistentSessions.filter((entry) => entry.id === currentId)
    : [];
  writeSecurityState(state);
  audit({ action: "security.sessions.revokeOther", outcome: "ok", actor });
  return getSecurityDashboard();
}

function removeTrustedDevice(deviceId) {
  const actor = requirePermission("settings:write", "trusted-device");
  const target = String(deviceId || "");
  if (!target) {
    const error = new Error("Device ID is required.");
    error.code = "DEVICE_REQUIRED";
    throw error;
  }
  const state = readSecurityState();
  normalizeTrustedDevices(state);
  state.trustedDevices = state.trustedDevices.map((device) => (
    device.id === target ? { ...device, trusted: false, removedAt: new Date().toISOString() } : device
  ));
  writeSecurityState(state);
  audit({ action: "security.trustedDevice.remove", outcome: "ok", actor, target });
  return getSecurityDashboard();
}

function renameTrustedDevice(deviceId, name) {
  const actor = requirePermission("settings:write", "trusted-device");
  const target = String(deviceId || "");
  const nextName = String(name || "").trim().slice(0, 80);
  if (!target || !nextName) {
    const error = new Error("Device ID and name are required.");
    error.code = "DEVICE_RENAME_INVALID";
    throw error;
  }
  const state = readSecurityState();
  normalizeTrustedDevices(state);
  const device = state.trustedDevices.find((entry) => entry.id === target);
  if (!device) {
    const error = new Error("Device was not found.");
    error.code = "DEVICE_NOT_FOUND";
    throw error;
  }
  device.name = nextName;
  device.updatedAt = new Date().toISOString();
  writeSecurityState(state);
  audit({ action: "security.trustedDevice.rename", outcome: "ok", actor, target });
  return getSecurityDashboard();
}

function updateSessionSecuritySettings(payload = {}) {
  const actor = requirePermission("settings:write", "security-settings");
  const state = readSecurityState();
  const inactiveSessionExpirationMs = Number.parseInt(payload.inactiveSessionExpirationMs, 10);
  if (!SESSION_TIMEOUT_OPTIONS_MS.has(inactiveSessionExpirationMs)) {
    const error = new Error("Unsupported session expiration setting.");
    error.code = "INVALID_SESSION_TIMEOUT";
    throw error;
  }
  state.settings.inactiveSessionExpirationMs = inactiveSessionExpirationMs;
  state.settings.lockOwnerWorkspaceAfterInactivity = payload.lockOwnerWorkspaceAfterInactivity !== false;
  state.settings.requireReauthForSensitiveActions = payload.requireReauthForSensitiveActions !== false;
  writeSecurityState(state);
  audit({ action: "security.settings.update", outcome: "ok", actor, target: "session-expiration" });
  return getSecurityDashboard();
}

function updateRemoteAccessSettings(payload = {}) {
  const actor = requirePermission("settings:write", "remote-access");
  const state = readSecurityState();
  state.settings.requireAuthenticatedAccountForRemoteAccess = payload.requireAuthenticatedAccount === true;
  state.settings.requireTrustedDeviceForRemoteAccess = payload.requireTrustedDevice === true;
  state.settings.remoteAccessAutoDisableMs = Number.parseInt(payload.autoDisableMs, 10) || 0;
  writeSecurityState(state);
  audit({ action: "security.remoteAccess.settings", outcome: "ok", actor });
  return getSecurityDashboard();
}

function disableRemoteAccess() {
  const actor = requirePermission("settings:write", "remote-access");
  const current = readAgentSettings();
  const { saveAgentSettings } = require("./agentClient");
  saveAgentSettings({
    backendMode: "local",
    agentUrl: current.agentUrl,
    agentToken: current.agentToken,
  });
  audit({ action: "security.remoteAccess.disable", outcome: "ok", actor });
  return getSecurityDashboard();
}

function revokeAgentToken() {
  const actor = requirePermission("settings:write", "agent-token");
  checkRateLimit("agent-token-revoke", 6, 10 * 60 * 1000);
  const { saveAgentSettings } = require("./agentClient");
  const current = readAgentSettings();
  const fingerprint = tokenFingerprint(current.agentToken);
  saveAgentSettings({
    backendMode: current.backendMode,
    agentUrl: current.agentUrl,
    agentToken: "",
  });
  audit({ action: "agent.token.revoke", outcome: "ok", actor, target: fingerprint });
  return getSecurityDashboard();
}

function generateReplacementAgentToken() {
  return rotateAgentToken();
}

function lockOwnerWorkspace() {
  const actor = requireOwner("owner-workspace-lock");
  audit({ action: "security.ownerWorkspace.lock", outcome: "ok", actor });
  return { ok: true, locked: true };
}

function emergencySecurityAction(action, confirmation = "") {
  const actor = requirePermission("settings:write", "security-emergency");
  if (String(confirmation || "").trim() !== "SECURE ANXOS") {
    const error = new Error("Type SECURE ANXOS to confirm this action.");
    error.code = "CONFIRMATION_REQUIRED";
    throw error;
  }
  const normalized = String(action || "");
  if (normalized === "sign-out-all") {
    return logoutAllSessions();
  }
  if (normalized === "revoke-agent-tokens") {
    return revokeAgentToken();
  }
  if (normalized === "remove-trusted-devices") {
    const state = readSecurityState();
    normalizeTrustedDevices(state);
    state.trustedDevices = state.trustedDevices.map((device) => ({ ...device, trusted: false, removedAt: new Date().toISOString() }));
    writeSecurityState(state);
    audit({ action: "security.trustedDevices.removeAll", outcome: "ok", actor });
    return getSecurityDashboard();
  }
  if (normalized === "disable-remote-access") {
    return disableRemoteAccess();
  }
  if (normalized === "lock-owner-workspace") {
    return lockOwnerWorkspace();
  }
  if (normalized === "reset-local-security") {
    const state = readSecurityState();
    state.persistentSessions = [];
    state.trustedDevices = [];
    writeSecurityState(state);
    removePersistentSessionFile();
    audit({ action: "security.localState.reset", outcome: "ok", actor });
    return getSecurityDashboard();
  }
  const error = new Error("Unsupported emergency security action.");
  error.code = "UNSUPPORTED_SECURITY_ACTION";
  throw error;
}

module.exports = {
  audit,
  checkRateLimit,
  disableRemoteAccess,
  emergencySecurityAction,
  generateReplacementAgentToken,
  getAuditFolderForOpen,
  getSecurityDashboard,
  getStatus,
  login,
  logout,
  logoutAllSessions,
  lockOwnerWorkspace,
  removeTrustedDevice,
  requirePermission,
  requireOwner,
  renameTrustedDevice,
  revokeAgentToken,
  revokeOtherSessions,
  revokePersistentSession,
  rotateAgentToken,
  setupAdmin,
  updateRemoteAccessSettings,
  updateSessionSecuritySettings,
  allowReadCompatibility,
};
