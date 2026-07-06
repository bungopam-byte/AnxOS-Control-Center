const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { app } = require("electron");

const DEFAULT_BACKEND_MODE = "local";
const DEFAULT_AGENT_URL = "http://127.0.0.1:47131";
const REQUEST_TIMEOUT_MS = 3500;
const VALID_BACKEND_MODES = new Set(["local", "agent", "auto"]);

let environmentLoaded = false;
let lastLoggedAgentSelection = null;
let lastLoggedAgentConfigMeta = null;

class AgentClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AgentClientError";
    this.status = details.status || null;
    this.code = details.code || null;
    this.payload = details.payload || null;
  }
}

function loadEnvironment() {
  if (environmentLoaded) {
    return;
  }

  environmentLoaded = true;

  try {
    dotenv.config({
      path: process.env.ANXHUB_ENV_PATH || path.join(process.cwd(), ".env"),
      quiet: true,
    });
  } catch {
    // Environment variables are optional for the default local backend.
  }
}

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stripByteOrderMark(value) {
  return typeof value === "string" ? value.replace(/^\uFEFF/, "") : value;
}

function hasOwn(object, key) {
  return Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
}

function firstDefined(object, keys) {
  for (const key of keys) {
    if (hasOwn(object, key) && object[key] !== undefined) {
      return object[key];
    }
  }

  return undefined;
}

function normalizeBackendMode(value) {
  const normalized = trimValue(value).toLowerCase();
  return VALID_BACKEND_MODES.has(normalized) ? normalized : DEFAULT_BACKEND_MODE;
}

function getDefaultAgentSettings() {
  return {
    backendMode: DEFAULT_BACKEND_MODE,
    agentUrl: DEFAULT_AGENT_URL,
    agentToken: "",
  };
}

function normalizeAgentSettings(settings = {}) {
  const modeValue = firstDefined(settings, ["backendMode", "mode"]);
  const urlValue = firstDefined(settings, ["agentUrl", "url"]);
  const tokenValue = firstDefined(settings, ["agentToken", "token"]);

  return {
    backendMode: modeValue === undefined ? DEFAULT_BACKEND_MODE : normalizeBackendMode(modeValue),
    agentUrl: trimValue(urlValue) || DEFAULT_AGENT_URL,
    agentToken: trimValue(tokenValue),
  };
}

function getAgentConfigDirectory() {
  const explicitConfigDir = trimValue(process.env.ANXHUB_CONFIG_DIR);

  if (explicitConfigDir) {
    return explicitConfigDir;
  }

  if (app) {
    try {
      return path.join(app.getPath("userData"), "config");
    } catch {
      // Fall through to a writable non-Electron fallback.
    }
  }

  return path.join(process.cwd(), "config");
}

function getAgentConfigPath() {
  return path.join(getAgentConfigDirectory(), "agent.json");
}

function logAgentConfigMetadata(reason, configPath, settings = null) {
  const payload = {
    reason,
    configPath,
    keys: settings && typeof settings === "object" && !Array.isArray(settings)
      ? Object.keys(settings).sort()
      : [],
  };
  const serialized = JSON.stringify(payload);

  if (serialized === lastLoggedAgentConfigMeta) {
    return;
  }

  lastLoggedAgentConfigMeta = serialized;
  console.info(
    `[AnxHub][Agent] Config path: ${payload.configPath} (source=${reason}, keys=${payload.keys.join(",") || "<none>"})`,
  );
}

function logAgentSelection(reason, source) {
  const payload = {
    reason,
    backendMode: source.backendMode,
    agentUrl: source.agentUrl || DEFAULT_AGENT_URL,
    hasToken: Boolean(trimValue(source.agentToken)),
  };
  const serialized = JSON.stringify(payload);

  if (serialized === lastLoggedAgentSelection) {
    return;
  }

  lastLoggedAgentSelection = serialized;
  console.info(
    `[AnxHub][Agent] Selected agent URL: ${payload.agentUrl} (mode=${payload.backendMode}, source=${reason}, token=${payload.hasToken ? "set" : "unset"})`,
  );
}

function ensureAgentConfigDirectory() {
  fs.mkdirSync(getAgentConfigDirectory(), { recursive: true });
}

function ensureAgentConfigFile() {
  ensureAgentConfigDirectory();
  const agentConfigPath = getAgentConfigPath();

  if (!fs.existsSync(agentConfigPath)) {
    const defaults = getDefaultAgentSettings();
    fs.writeFileSync(agentConfigPath, `${JSON.stringify(defaults, null, 2)}\n`, "utf8");
    logAgentConfigMetadata("created-default-config", agentConfigPath, defaults);
  }
}

function readAgentSettings() {
  const agentConfigPath = getAgentConfigPath();

  try {
    ensureAgentConfigFile();
    const rawConfig = stripByteOrderMark(fs.readFileSync(agentConfigPath, "utf8"));
    const parsed = JSON.parse(rawConfig);
    logAgentConfigMetadata("read-config", agentConfigPath, parsed);
    return normalizeAgentSettings(parsed);
  } catch {
    logAgentConfigMetadata("read-config-fallback", agentConfigPath, null);
    return getDefaultAgentSettings();
  }
}

function saveAgentSettings(settings = {}) {
  const existing = readAgentSettings();
  const explicitMode = firstDefined(settings, ["backendMode", "mode"]);
  const explicitUrl = firstDefined(settings, ["agentUrl", "url"]);
  const hasExplicitToken = hasOwn(settings, "agentToken") || hasOwn(settings, "token");
  const explicitToken = firstDefined(settings, ["agentToken", "token"]);
  const normalized = normalizeAgentSettings({
    backendMode: explicitMode === undefined ? existing.backendMode : explicitMode,
    agentUrl: explicitUrl === undefined ? existing.agentUrl : explicitUrl,
    agentToken: hasExplicitToken ? explicitToken : existing.agentToken,
  });
  const agentConfigPath = getAgentConfigPath();
  ensureAgentConfigDirectory();
  fs.writeFileSync(agentConfigPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  logAgentConfigMetadata("saved-config", agentConfigPath, normalized);
  logAgentSelection("saved-config", normalized);
  return normalized;
}

function getEffectiveAgentSettings() {
  loadEnvironment();

  const stored = readAgentSettings();
  const environmentMode = trimValue(process.env.BACKEND_MODE || process.env.backendMode || process.env.ANXHUB_BACKEND_MODE);
  const environmentUrl = trimValue(process.env.AGENT_URL);
  const environmentToken = trimValue(process.env.AGENT_TOKEN);

  const effective = {
    backendMode: environmentMode ? normalizeBackendMode(environmentMode) : stored.backendMode,
    agentUrl: environmentUrl || stored.agentUrl || DEFAULT_AGENT_URL,
    agentToken: environmentToken || stored.agentToken || "",
    overrides: {
      backendMode: Boolean(environmentMode),
      agentUrl: Boolean(environmentUrl),
      agentToken: Boolean(environmentToken),
    },
  };

  logAgentSelection("effective-config", effective);
  return effective;
}

function getBackendMode() {
  return getEffectiveAgentSettings().backendMode;
}

function getAgentConfig(configOverride = null) {
  const source = configOverride ? normalizeAgentSettings(configOverride) : getEffectiveAgentSettings();

  return {
    url: source.agentUrl || DEFAULT_AGENT_URL,
    token: trimValue(source.agentToken) || null,
  };
}

function buildAgentUrl(pathname, configOverride = null) {
  const config = getAgentConfig(configOverride);
  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  return new URL(pathname, baseUrl).toString();
}

function logAgentRequestFailure(pathname, status, errorCode = null) {
  console.info(
    `[AnxHub][Agent] Request ${pathname} (status=${status ?? "n/a"}, ok=false, errorCode=${errorCode || "none"})`,
  );
}

function getTransportErrorCode(error) {
  return error?.cause?.code || error?.code || null;
}

function parseAgentPayload(buffer, contentType) {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  if (String(contentType || "").includes("application/json")) {
    try {
      return JSON.parse(buffer.toString("utf8"));
    } catch {
      return null;
    }
  }

  return buffer.toString("utf8");
}

async function requestJson(pathname, options = {}) {
  const {
    config: configOverride = null,
    method = "GET",
    body = null,
  } = options;
  const config = getAgentConfig(configOverride);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      Accept: "application/json",
    };

    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    if (body !== null) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(buildAgentUrl(pathname, configOverride), {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      const responseErrorCode =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? payload.error?.code || "AGENT_HTTP_ERROR"
          : "AGENT_HTTP_ERROR";
      logAgentRequestFailure(pathname, response.status, responseErrorCode);
      throw new AgentClientError(`Agent request failed with HTTP ${response.status}.`, {
        status: response.status,
        code: responseErrorCode,
        payload,
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof AgentClientError) {
      throw error;
    }

    const errorCode = error?.name === "AbortError"
      ? "AGENT_TIMEOUT"
      : getTransportErrorCode(error) || "AGENT_UNAVAILABLE";
    logAgentRequestFailure(pathname, null, errorCode);
    throw new AgentClientError("Agent unavailable.", {
      code: errorCode,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function unwrapPayload(payload, key) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  if (payload[key] !== undefined) {
    return payload[key];
  }

  if (payload.data && typeof payload.data === "object") {
    if (payload.data[key] !== undefined) {
      return payload.data[key];
    }

    return payload.data;
  }

  return payload;
}

function inferState(status) {
  if (/^up\b|running/i.test(status || "")) {
    return "running";
  }

  if (/exited|created|dead|paused|restarting|removing|stopped/i.test(status || "")) {
    return "stopped";
  }

  return status || null;
}

function normalizeName(name) {
  if (Array.isArray(name)) {
    return normalizeName(name[0]);
  }

  if (typeof name !== "string") {
    return name || null;
  }

  return name.replace(/^\/+/, "") || null;
}

function normalizePorts(ports) {
  if (!Array.isArray(ports)) {
    return ports || null;
  }

  return ports.map((port) => {
    if (!port || typeof port !== "object") {
      return port;
    }

    const privatePort = port.PrivatePort || port.privatePort;
    const publicPort = port.PublicPort || port.publicPort;
    const type = port.Type || port.type;
    const ip = port.IP || port.ip;

    if (publicPort && privatePort) {
      const host = ip ? `${ip}:` : "";
      return `${host}${publicPort}->${privatePort}${type ? `/${type}` : ""}`;
    }

    if (privatePort) {
      return `${privatePort}${type ? `/${type}` : ""}`;
    }

    return JSON.stringify(port);
  });
}

function normalizeContainer(container) {
  if (!container || typeof container !== "object") {
    return null;
  }

  const status = container.status || container.Status || container.state || container.State || null;

  return {
    id: container.id || container.ID || container.Id || null,
    name: normalizeName(container.name || container.Names || container.Name),
    image: container.image || container.Image || null,
    command: container.command || container.Command || null,
    createdAt: container.createdAt || container.CreatedAt || container.created || container.Created || null,
    status,
    state: container.state || container.State || inferState(status),
    ports: normalizePorts(container.ports || container.Ports),
    runningFor: container.runningFor || container.RunningFor || status,
  };
}

function normalizeContainers(payload) {
  const containers = unwrapPayload(payload, "containers");

  if (!Array.isArray(containers)) {
    return [];
  }

  return containers.map(normalizeContainer).filter(Boolean);
}

function coerceBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (/^(true|yes|1|running|installed|healthy|ok)$/i.test(value)) {
      return true;
    }

    if (/^(false|no|0|stopped|missing|unhealthy|error)$/i.test(value)) {
      return false;
    }
  }

  return fallback;
}

function coerceNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeSummary(payload, containers) {
  const unwrapped = unwrapPayload(payload, "summary") || {};
  const snapshot = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const summary = unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped) ? unwrapped : {};
  const runningContainers = containers.filter((container) => /^running$/i.test(container.state || "") || /^up\b/i.test(container.status || ""));

  const installed = coerceBoolean(snapshot.installed ?? summary.installed, true);
  const daemonRunning = coerceBoolean(snapshot.daemonRunning ?? summary.daemonRunning, true);

  return {
    installed,
    daemonRunning,
    version: snapshot.version || summary.version || null,
    summary: {
      installed,
      daemonRunning,
      runningContainers: coerceNumber(summary.runningContainers ?? snapshot.runningContainers, runningContainers.length),
      totalContainers: coerceNumber(summary.totalContainers ?? snapshot.totalContainers, containers.length),
    },
    lastCheckedAt: snapshot.lastCheckedAt || summary.lastCheckedAt || new Date().toISOString(),
    diagnostics: {
      ...(snapshot.diagnostics && typeof snapshot.diagnostics === "object" ? snapshot.diagnostics : {}),
      agent: {
        url: getAgentConfig().url,
      },
    },
  };
}

function isHealthyPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return true;
  }

  const status = payload.status || payload.state;

  if (typeof payload.healthy === "boolean") {
    return payload.healthy;
  }

  if (typeof payload.ok === "boolean") {
    return payload.ok;
  }

  if (typeof status === "string" && /unhealthy|error|down|unavailable/i.test(status)) {
    return false;
  }

  return true;
}

async function getHealth(configOverride = null) {
  return requestJson("/api/v1/health", {
    config: configOverride,
  });
}

async function isHealthy(configOverride = null) {
  try {
    return isHealthyPayload(await getHealth(configOverride));
  } catch {
    return false;
  }
}

async function requestBuffer(pathname, options = {}) {
  const {
    config: configOverride = null,
    method = "GET",
    body = null,
  } = options;
  const config = getAgentConfig(configOverride);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      Accept: "application/octet-stream, application/json",
    };

    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    if (body !== null) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(buildAgentUrl(pathname, configOverride), {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (!response.ok) {
      const payload = parseAgentPayload(buffer, contentType);
      const responseErrorCode =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? payload.error?.code || "AGENT_HTTP_ERROR"
          : "AGENT_HTTP_ERROR";
      logAgentRequestFailure(pathname, response.status, responseErrorCode);
      throw new AgentClientError(`Agent request failed with HTTP ${response.status}.`, {
        status: response.status,
        code: "AGENT_HTTP_ERROR",
        payload,
      });
    }

    return {
      buffer,
      contentType,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    if (error instanceof AgentClientError) {
      throw error;
    }

    const errorCode = error?.name === "AbortError"
      ? "AGENT_TIMEOUT"
      : getTransportErrorCode(error) || "AGENT_UNAVAILABLE";
    logAgentRequestFailure(pathname, null, errorCode);
    throw new AgentClientError("Agent unavailable.", {
      code: errorCode,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function testConnection(configOverride = null) {
  const checkedAt = new Date().toISOString();
  const config = getAgentConfig(configOverride);

  try {
    const payload = await getHealth(configOverride);
    const connected = isHealthyPayload(payload);

    return {
      connected,
      status: connected ? "connected" : "disconnected",
      message: connected ? "Connected to the Agent." : "Agent health check reported a disconnected state.",
      checkedAt,
      url: config.url,
      health: payload,
    };
  } catch (error) {
    return {
      connected: false,
      status: "disconnected",
      message: error?.message || "Agent unavailable.",
      checkedAt,
      url: config.url,
      health: null,
      code: error?.code || null,
    };
  }
}

async function getDockerSummary() {
  return requestJson("/api/v1/docker/summary");
}

async function getDockerContainers() {
  return requestJson("/api/v1/docker/containers");
}

async function getDockerSnapshot(configOverride = null) {
  const payload = await requestJson("/api/v1/docker/snapshot", { config: configOverride });
  const containers = normalizeContainers(payload);

  return {
    ...normalizeSummary(payload, containers),
    containers,
  };
}

async function createDockerContainer(payload = {}, configOverride = null) {
  return requestJson("/api/v1/docker/containers", {
    config: configOverride,
    method: "POST",
    body: payload,
  });
}

async function startDockerContainer(container, configOverride = null) {
  return requestJson(`/api/v1/docker/containers/${encodeURIComponent(String(container || ""))}/start`, {
    config: configOverride,
    method: "POST",
  });
}

async function stopDockerContainer(container, configOverride = null) {
  return requestJson(`/api/v1/docker/containers/${encodeURIComponent(String(container || ""))}/stop`, {
    config: configOverride,
    method: "POST",
  });
}

async function restartDockerContainer(container, configOverride = null) {
  return requestJson(`/api/v1/docker/containers/${encodeURIComponent(String(container || ""))}/restart`, {
    config: configOverride,
    method: "POST",
  });
}

async function deleteDockerContainer(container, configOverride = null) {
  return requestJson(`/api/v1/docker/containers/${encodeURIComponent(String(container || ""))}`, {
    config: configOverride,
    method: "DELETE",
  });
}

async function getDockerContainerLogs(container, options = {}, configOverride = null) {
  const query = new URLSearchParams({ tail: String(options.tail || 200) });
  return requestJson(`/api/v1/docker/containers/${encodeURIComponent(String(container || ""))}/logs?${query.toString()}`, {
    config: configOverride,
  });
}

async function getDockerContainerStats(container, configOverride = null) {
  return requestJson(`/api/v1/docker/containers/${encodeURIComponent(String(container || ""))}/stats`, {
    config: configOverride,
  });
}

function normalizePlayitSnapshot(payload) {
  const snapshot = unwrapPayload(payload, "snapshot");
  const candidate =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? snapshot
      : payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {};

  return {
    installed: candidate.installed ?? false,
    running: candidate.running ?? false,
    connected: candidate.connected === true ? true : candidate.connected === false ? false : null,
    tunnelAddress: candidate.tunnelAddress || null,
    tunnelDomain: candidate.tunnelDomain || (candidate.tunnelAddress ? String(candidate.tunnelAddress).split(":")[0] : null),
    localTarget: candidate.localTarget || null,
    localIp: candidate.localIp || null,
    localPort: candidate.localPort || null,
    protocol: candidate.protocol || null,
    tunnelId: candidate.tunnelId || null,
    lastCheckedAt: candidate.lastCheckedAt || new Date().toISOString(),
    lastSuccessfulRefreshAt: candidate.lastSuccessfulRefreshAt || null,
    diagnostics: candidate.diagnostics && typeof candidate.diagnostics === "object"
      ? {
          ...candidate.diagnostics,
          agent: {
            url: getAgentConfig().url,
          },
        }
      : {
          agent: {
            url: getAgentConfig().url,
          },
        },
  };
}

async function getPlayitStatus() {
  return requestJson("/api/v1/playit/status");
}

async function getPlayitSnapshot() {
  return normalizePlayitSnapshot(await requestJson("/api/v1/playit/snapshot"));
}

function safeNumber(value) {
  if (value === null || value === undefined || typeof value === "boolean" || value === "" || Array.isArray(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePercent(value) {
  const number = safeNumber(value);
  if (number === null) {
    return null;
  }

  return number <= 1 ? number * 100 : number;
}

function parseDurationSeconds(value) {
  if (typeof value !== "string") {
    return safeNumber(value);
  }

  const parts = value.split(":").map((part) => safeNumber(part));

  if (parts.some((part) => part === null)) {
    return safeNumber(value);
  }

  if (parts.length === 4) {
    const [days, hours, minutes, seconds] = parts;
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return safeNumber(value);
}

function findAmpValue(source, keys) {
  if (!source || typeof source !== "object") {
    return null;
  }

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return null;
}

function hasAnyAmpKey(value, keys) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return keys.some((key) => value[key] !== undefined && value[key] !== null);
}

function unwrapAmpResult(value) {
  if (value && typeof value === "object" && Object.keys(value).length === 1 && value.result !== undefined) {
    return value.result;
  }

  return value;
}

function asAmpArray(value) {
  const unwrapped = unwrapAmpResult(value);

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  if (!unwrapped || typeof unwrapped !== "object") {
    return [];
  }

  const preferredKeys = [
    "instances",
    "Instances",
    "AvailableInstances",
    "minecraftInstances",
    "data",
    "result",
    "Result",
  ];

  for (const key of preferredKeys) {
    if (unwrapped[key] !== undefined && unwrapped[key] !== unwrapped) {
      const nested = asAmpArray(unwrapped[key]);

      if (nested.length > 0) {
        return nested;
      }
    }
  }

  if (
    hasAnyAmpKey(unwrapped, [
      "id",
      "Id",
      "ID",
      "InstanceID",
      "InstanceId",
      "name",
      "Name",
      "FriendlyName",
      "Module",
      "ModuleName",
      "ApplicationModule",
    ])
  ) {
    return [unwrapped];
  }

  return Object.entries(unwrapped)
    .filter(([, item]) => item && typeof item === "object")
    .map(([mapKey, item]) => ({ mapKey, ...item }));
}

function getAmpInstanceId(instance) {
  return findAmpValue(instance, ["id", "Id", "ID", "InstanceID", "InstanceId", "InstanceIdString", "Guid", "mapKey"]);
}

function getAmpModuleType(instance) {
  return findAmpValue(instance, ["moduleType", "Module", "ModuleName", "ApplicationModule", "AppModule", "Application"]) || "Unknown";
}

function getAmpInstanceName(instance) {
  return findAmpValue(instance, ["name", "Name", "InstanceName", "FriendlyName", "DisplayName", "Description"]) || "AMP Instance";
}

function isAmpMinecraftInstance(instance) {
  const searchable = [
    getAmpInstanceName(instance),
    getAmpModuleType(instance),
    findAmpValue(instance, ["Target", "Type", "Application", "ApplicationName"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes("minecraft") || searchable.includes("mc") || searchable.includes("atm10");
}

function normalizeAmpPorts(value) {
  if (Array.isArray(value)) {
    return value
      .map((port) => {
        if (typeof port === "number" || typeof port === "string") {
          return String(port);
        }

        if (!port || typeof port !== "object") {
          return null;
        }

        const number = findAmpValue(port, ["Port", "port", "HostPort", "ContainerPort", "PublicPort"]);
        const protocol = findAmpValue(port, ["Protocol", "protocol"]);
        return number ? `${number}${protocol ? `/${protocol}` : ""}` : null;
      })
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value)
      .map((port) => (typeof port === "object" ? findAmpValue(port, ["Port", "port", "HostPort", "PublicPort"]) : port))
      .filter((port) => port !== null && port !== undefined)
      .map(String);
  }

  const singlePort = safeNumber(value);
  return singlePort === null ? [] : [String(singlePort)];
}

function normalizeAmpInstance(instance) {
  if (!instance || typeof instance !== "object") {
    return null;
  }

  const state =
    findAmpValue(instance, ["state", "State", "Status", "ApplicationState", "DaemonState", "AppState", "InstanceState"]) ||
    "Unknown";

  return {
    id: getAmpInstanceId(instance) || getAmpInstanceName(instance),
    name: getAmpInstanceName(instance),
    friendlyName: findAmpValue(instance, ["friendlyName", "FriendlyName"]),
    moduleType: getAmpModuleType(instance),
    isMinecraft: isAmpMinecraftInstance(instance),
    state,
    playerCount: safeNumber(findAmpValue(instance, [
      "playerCount",
      "Players",
      "PlayerCount",
      "CurrentPlayers",
      "ActiveUsers",
      "UsersOnline",
      "OnlinePlayers",
      "PlayersOnline",
    ])),
    maxPlayers: safeNumber(findAmpValue(instance, ["maxPlayers", "MaxPlayers", "MaximumPlayers", "PlayerLimit", "MaxUsers"])),
    tps: safeNumber(findAmpValue(instance, ["tps", "TPS", "TicksPerSecond", "ServerTPS", "CurrentTPS"])),
    cpuUsage: normalizePercent(findAmpValue(instance, ["cpuUsage", "CPUUsage", "CpuUsage", "CPU", "ProcessorUsage", "PercentCPU"])),
    ramUsage: safeNumber(findAmpValue(instance, [
      "ramUsage",
      "MemoryUsageMB",
      "MemoryMB",
      "MemoryUsage",
      "RAMUsage",
      "UsedMemory",
      "Memory",
      "MemUsageMB",
    ])),
    ports: normalizeAmpPorts(findAmpValue(instance, ["ports", "Ports", "Port", "PortMappings", "ApplicationEndpoints", "NetworkPorts", "Endpoint", "Endpoints"])),
    uptime: parseDurationSeconds(findAmpValue(instance, ["uptime", "Uptime", "UptimeSeconds", "RunningSeconds", "StartedFor", "UptimeSec"])),
    version: findAmpValue(instance, [
      "version",
      "Version",
      "AppVersion",
      "ApplicationVersion",
      "ServerVersion",
      "MinecraftVersion",
      "ProductVersion",
      "ReleaseStream",
      "Build",
    ]),
  };
}

function getAmpSummaryCandidate(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const hasTopLevelStatus =
      payload.connected !== undefined ||
      payload.configured !== undefined ||
      payload.status !== undefined ||
      payload.message !== undefined ||
      payload.connection !== undefined ||
      payload.diagnostics !== undefined;

    if (hasTopLevelStatus) {
      return payload;
    }
  }

  const unwrapped = unwrapPayload(payload, "summary");
  return unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)
    ? unwrapped
    : payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
}

function hasAmpDataEvidence(instances, selectedInstance, summary) {
  if (Array.isArray(instances) && instances.length > 0) {
    return true;
  }

  if (selectedInstance && typeof selectedInstance === "object") {
    return true;
  }

  if (!summary || typeof summary !== "object") {
    return false;
  }

  return [
    summary.playerCount,
    summary.maxPlayers,
    summary.tps,
    summary.cpuUsage,
    summary.ramUsage,
    summary.uptime,
  ].some((value) => Number.isFinite(value)) || Boolean(summary.version) || (Array.isArray(summary.ports) && summary.ports.length > 0);
}

function selectAmpMinecraftInstance(instances) {
  const minecraftInstances = instances.filter((instance) => instance.isMinecraft);

  return {
    selected: minecraftInstances.length === 1 ? minecraftInstances[0] : null,
    minecraftInstances,
    mode: minecraftInstances.length === 0 ? "none" : minecraftInstances.length === 1 ? "auto" : "multiple",
  };
}

function summarizeAmpInstances(instances, summaryCandidate, selectedInstance, minecraftSelectionMode) {
  if (summaryCandidate && typeof summaryCandidate === "object" && summaryCandidate.selectedInstanceName !== undefined) {
    return {
      selectedInstanceId: summaryCandidate.selectedInstanceId || selectedInstance?.id || null,
      selectedInstanceName: summaryCandidate.selectedInstanceName || selectedInstance?.name || null,
      minecraftInstanceCount: coerceNumber(summaryCandidate.minecraftInstanceCount, instances.filter((instance) => instance.isMinecraft).length),
      minecraftSelectionMode: summaryCandidate.minecraftSelectionMode || minecraftSelectionMode,
      state: summaryCandidate.state || null,
      playerCount: safeNumber(summaryCandidate.playerCount),
      maxPlayers: safeNumber(summaryCandidate.maxPlayers),
      tps: safeNumber(summaryCandidate.tps),
      cpuUsage: normalizePercent(summaryCandidate.cpuUsage),
      ramUsage: safeNumber(summaryCandidate.ramUsage),
      ports: Array.isArray(summaryCandidate.ports) ? summaryCandidate.ports.map(String) : [],
      uptime: parseDurationSeconds(summaryCandidate.uptime),
      version: summaryCandidate.version || null,
    };
  }

  if (instances.length === 0) {
    return {
      selectedInstanceId: null,
      selectedInstanceName: null,
      minecraftInstanceCount: 0,
      minecraftSelectionMode,
      state: "No instances",
      playerCount: null,
      maxPlayers: null,
      tps: null,
      cpuUsage: null,
      ramUsage: null,
      ports: [],
      uptime: null,
      version: null,
    };
  }

  const primary = selectedInstance || instances[0];
  const scopedInstances = selectedInstance ? [selectedInstance] : instances;
  const playerValues = scopedInstances.map((instance) => instance.playerCount).filter(Number.isFinite);
  const cpuValues = scopedInstances.map((instance) => instance.cpuUsage).filter(Number.isFinite);
  const ramValues = scopedInstances.map((instance) => instance.ramUsage).filter(Number.isFinite);
  const tpsValues = scopedInstances.map((instance) => instance.tps).filter(Number.isFinite);

  return {
    selectedInstanceId: selectedInstance?.id || null,
    selectedInstanceName: selectedInstance?.name || null,
    minecraftInstanceCount: instances.filter((instance) => instance.isMinecraft).length,
    minecraftSelectionMode,
    state: primary.state,
    playerCount: playerValues.length > 0 ? playerValues.reduce((total, value) => total + value, 0) : null,
    maxPlayers: primary.maxPlayers,
    tps: tpsValues.length > 0 ? tpsValues[0] : null,
    cpuUsage: cpuValues.length > 0 ? cpuValues.reduce((sum, value) => sum + value, 0) : null,
    ramUsage: ramValues.length > 0 ? ramValues.reduce((sum, value) => sum + value, 0) : null,
    ports: primary.ports || [],
    uptime: primary.uptime,
    version: primary.version || null,
  };
}

function getAmpStatusMessage(status, connected) {
  if (connected || status === "connected") {
    return "Connected to AMP.";
  }

  if (status === "auth_failed") {
    return "AMP authentication failed.";
  }

  if (status === "unconfigured") {
    return "AMP is not configured.";
  }

  return "AMP unavailable.";
}

function getAmpConnectionLabel(status) {
  if (status === "connected") {
    return "Connected";
  }

  if (status === "auth_failed") {
    return "Auth failed";
  }

  if (status === "unreachable" || status === "error") {
    return "Unreachable";
  }

  if (status === "unconfigured") {
    return "Unconfigured";
  }

  return "Unavailable";
}

function normalizeAmpSnapshot(statusPayload, instancesPayload) {
  const statusCandidate = getAmpSummaryCandidate(statusPayload);
  const summaryCandidate = unwrapPayload(statusPayload, "summary");
  const instanceRows = asAmpArray(unwrapPayload(instancesPayload, "instances"));
  const normalizedInstances = instanceRows.map(normalizeAmpInstance).filter(Boolean);
  const explicitSelected = statusCandidate.selectedInstance ? normalizeAmpInstance(statusCandidate.selectedInstance) : null;
  const selection = selectAmpMinecraftInstance(normalizedInstances);
  const selectedInstance =
    explicitSelected ||
    normalizedInstances.find((instance) => instance.name === statusCandidate.summary?.selectedInstanceName) ||
    normalizedInstances.find((instance) => instance.id === statusCandidate.summary?.selectedInstanceId) ||
    selection.selected ||
    null;
  const minecraftInstances = Array.isArray(statusCandidate.minecraftInstances)
    ? statusCandidate.minecraftInstances.map(normalizeAmpInstance).filter(Boolean)
    : selection.minecraftInstances;
  const configured = typeof statusCandidate.configured === "boolean" ? statusCandidate.configured : true;
  const connected = typeof statusCandidate.connected === "boolean" ? statusCandidate.connected : coerceBoolean(statusCandidate.status, false);
  const rawStatus = statusCandidate.status || (connected ? "connected" : "unreachable");
  const diagnostics = statusCandidate.diagnostics && typeof statusCandidate.diagnostics === "object"
    ? {
        ...statusCandidate.diagnostics,
        agent: {
          url: getAgentConfig().url,
        },
      }
    : {
        agent: {
          url: getAgentConfig().url,
        },
      };
  const summary = summarizeAmpInstances(
    normalizedInstances,
    summaryCandidate && typeof summaryCandidate === "object" && !Array.isArray(summaryCandidate) ? summaryCandidate : statusCandidate.summary || statusCandidate,
    selectedInstance,
    statusCandidate.minecraftSelectionMode || selection.mode,
  );
  const derivedConnected =
    hasAmpDataEvidence(normalizedInstances, selectedInstance, summary) &&
    rawStatus !== "auth_failed" &&
    rawStatus !== "unconfigured";
  const effectiveConnected = connected || derivedConnected;
  const status = effectiveConnected ? "connected" : rawStatus;
  const message = effectiveConnected ? "Connected to AMP." : statusCandidate.message || getAmpStatusMessage(status, connected);
  const connection = statusCandidate.connection && typeof statusCandidate.connection === "object"
    ? {
        ...statusCandidate.connection,
        status,
        label: getAmpConnectionLabel(status),
        message: effectiveConnected ? "Connected to AMP." : statusCandidate.connection.message || message,
        connected: effectiveConnected,
        unreachable: !effectiveConnected && (status === "unreachable" || status === "error"),
        authFailed: !effectiveConnected && status === "auth_failed",
      }
    : {
        status,
        label: getAmpConnectionLabel(status),
        message,
        connected: effectiveConnected,
        unreachable: !effectiveConnected && (status === "unreachable" || status === "error"),
        authFailed: !effectiveConnected && status === "auth_failed",
        diagnostics,
      };

  return {
    connected: effectiveConnected,
    configured,
    status,
    message,
    diagnostics,
    connection,
    instanceCount: coerceNumber(statusCandidate.instanceCount, normalizedInstances.length),
    instances: normalizedInstances,
    selectedInstance,
    minecraftInstances,
    minecraftSelectionMode: statusCandidate.minecraftSelectionMode || selection.mode,
    playerCount: summary.playerCount ?? null,
    maxPlayers: summary.maxPlayers ?? null,
    tps: summary.tps ?? null,
    cpuUsage: summary.cpuUsage ?? null,
    ramUsage: summary.ramUsage ?? null,
    uptime: summary.uptime ?? null,
    minecraft: statusCandidate.minecraft && typeof statusCandidate.minecraft === "object"
      ? statusCandidate.minecraft
      : {
          selectedInstanceId: summary.selectedInstanceId || null,
          selectedInstanceName: summary.selectedInstanceName || null,
          instanceCount: summary.minecraftInstanceCount || 0,
          selectionMode: summary.minecraftSelectionMode || statusCandidate.minecraftSelectionMode || selection.mode,
          state: summary.state || null,
          playerCount: summary.playerCount ?? null,
          maxPlayers: summary.maxPlayers ?? null,
          tps: summary.tps ?? null,
          cpuUsage: summary.cpuUsage ?? null,
          ramUsage: summary.ramUsage ?? null,
          uptime: summary.uptime ?? null,
          version: summary.version || null,
          ports: summary.ports || [],
        },
    poll: statusCandidate.poll && typeof statusCandidate.poll === "object"
      ? statusCandidate.poll
      : {
          sequence: null,
          lastSuccessfulPollAt: null,
          status,
          instanceCount: normalizedInstances.length,
        },
    summary,
  };
}

async function getAmpStatus() {
  return requestJson("/api/v1/amp/status");
}

async function getAmpInstances() {
  return requestJson("/api/v1/amp/instances");
}

async function getAmpSnapshot() {
  const payload = await requestJson("/api/v1/amp/snapshot");
  return normalizeAmpSnapshot(payload, payload);
}

function normalizePathSegments(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getBaseName(value) {
  const segments = normalizePathSegments(value);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

function normalizeFileType(entry) {
  const explicitType = trimValue(findAmpValue(entry, ["type", "Type", "kind", "Kind", "entryType", "EntryType"]));

  if (explicitType) {
    if (/dir/i.test(explicitType)) {
      return "directory";
    }

    if (/file/i.test(explicitType)) {
      return "file";
    }

    return explicitType.toLowerCase();
  }

  if (coerceBoolean(findAmpValue(entry, ["isDirectory", "IsDirectory", "directory", "Directory"]), false)) {
    return "directory";
  }

  if (coerceBoolean(findAmpValue(entry, ["isFile", "IsFile", "file", "File"]), false)) {
    return "file";
  }

  return "file";
}

function normalizeFileEntry(entry, currentPath = null) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const rawPath =
    findAmpValue(entry, ["path", "Path", "fullPath", "FullPath", "absolutePath", "AbsolutePath"]) ||
    null;
  const name =
    findAmpValue(entry, ["name", "Name", "displayName", "DisplayName"]) ||
    getBaseName(rawPath) ||
    null;
  const entryPath = rawPath || (currentPath && name ? `${String(currentPath).replace(/[\\/]+$/, "")}/${name}` : name);
  const type = normalizeFileType(entry);
  const size = safeNumber(findAmpValue(entry, ["size", "Size", "length", "Length", "bytes", "Bytes"]));
  const modifiedAt = findAmpValue(entry, ["modifiedAt", "ModifiedAt", "modified", "Modified", "mtime", "MTime", "lastModified", "LastModified"]) || null;
  const extension = type === "file"
    ? (findAmpValue(entry, ["extension", "Extension"]) || (typeof name === "string" && name.includes(".") ? name.split(".").pop() : null))
    : null;

  return {
    name,
    path: entryPath || null,
    type,
    isDirectory: type === "directory",
    size,
    modifiedAt,
    extension: extension ? String(extension).replace(/^\./, "") : null,
  };
}

function normalizeFileEntries(payload, currentPath = null) {
  const candidate = unwrapPayload(payload, "entries");
  const source =
    Array.isArray(candidate) ? candidate
      : Array.isArray(payload?.items) ? payload.items
        : Array.isArray(payload?.files) ? payload.files
          : Array.isArray(payload?.children) ? payload.children
            : Array.isArray(payload?.listing) ? payload.listing
              : [];

  return source.map((entry) => normalizeFileEntry(entry, currentPath)).filter(Boolean);
}

function normalizeRootEntry(entry) {
  if (typeof entry === "string") {
    const trimmed = trimValue(entry);
    return trimmed
      ? {
          name: getBaseName(trimmed) || trimmed,
          path: trimmed,
          type: "directory",
          isDirectory: true,
        }
      : null;
  }

  const normalized = normalizeFileEntry(entry);

  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    type: "directory",
    isDirectory: true,
  };
}

function normalizeRoots(payload, currentPath = null) {
  const rootsSource =
    Array.isArray(payload?.roots) ? payload.roots
      : Array.isArray(payload?.mounts) ? payload.mounts
        : currentPath ? [currentPath] : [];

  return rootsSource.map(normalizeRootEntry).filter(Boolean);
}

function normalizeBreadcrumbs(payload, currentPath = null) {
  if (Array.isArray(payload?.breadcrumbs)) {
    return payload.breadcrumbs
      .map((crumb) => {
        if (typeof crumb === "string") {
          const trimmed = trimValue(crumb);
          return trimmed ? { name: getBaseName(trimmed) || trimmed, path: trimmed } : null;
        }

        if (!crumb || typeof crumb !== "object") {
          return null;
        }

        const crumbPath = findAmpValue(crumb, ["path", "Path", "fullPath", "FullPath", "absolutePath", "AbsolutePath"]) || null;
        const crumbName = findAmpValue(crumb, ["name", "Name", "displayName", "DisplayName"]) || getBaseName(crumbPath) || null;

        return crumbName || crumbPath ? { name: crumbName || crumbPath, path: crumbPath || crumbName } : null;
      })
      .filter(Boolean);
  }

  if (!currentPath) {
    return [];
  }

  const segments = normalizePathSegments(currentPath);
  const isAbsolute = /^[\\/]|^[A-Za-z]:[\\/]/.test(String(currentPath));
  const breadcrumbs = [];
  let cursor = String(currentPath).includes("\\") ? "" : isAbsolute ? "/" : "";

  segments.forEach((segment) => {
    if (/^[A-Za-z]:$/.test(segment)) {
      cursor = `${segment}/`;
    } else if (cursor === "/" || /^[A-Za-z]:\/$/.test(cursor)) {
      cursor = `${cursor}${segment}`;
    } else if (cursor) {
      cursor = `${cursor}/${segment}`;
    } else {
      cursor = segment;
    }

    breadcrumbs.push({
      name: segment,
      path: cursor,
    });
  });

  return breadcrumbs;
}

function normalizeFileListing(payload) {
  const listing = unwrapPayload(payload, "listing");
  const candidate =
    listing && typeof listing === "object" && !Array.isArray(listing)
      ? listing
      : payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {};
  const currentPath =
    findAmpValue(candidate, ["currentPath", "CurrentPath", "path", "Path", "directory", "Directory"]) ||
    null;
  const entries = normalizeFileEntries(candidate, currentPath);
  const roots = normalizeRoots(candidate, currentPath);
  const breadcrumbs = normalizeBreadcrumbs(candidate, currentPath);
  const directoryCount = entries.filter((entry) => entry.isDirectory).length;
  const fileCount = entries.filter((entry) => !entry.isDirectory).length;
  const connected = typeof candidate.connected === "boolean" ? candidate.connected : true;
  const configured = typeof candidate.configured === "boolean" ? candidate.configured : true;
  const status = candidate.status || (connected ? "connected" : "unavailable");
  const message = candidate.message || (connected ? "Connected to file service." : "File service unavailable.");

  return {
    configured,
    connected,
    status,
    message,
    currentPath,
    roots,
    breadcrumbs,
    entries,
    summary: {
      directoryCount,
      fileCount,
      totalCount: entries.length,
    },
    lastCheckedAt: candidate.lastCheckedAt || new Date().toISOString(),
    diagnostics: candidate.diagnostics && typeof candidate.diagnostics === "object"
      ? {
          ...candidate.diagnostics,
          agent: {
            url: getAgentConfig().url,
          },
        }
      : {
          agent: {
            url: getAgentConfig().url,
          },
        },
  };
}

async function getFileList(currentPath = ".") {
  const query = new URLSearchParams({
    path: currentPath || ".",
  });

  return requestJson(`/api/v1/files/list?${query.toString()}`);
}

async function getFileListing(currentPath = ".") {
  return normalizeFileListing(await getFileList(currentPath));
}

function parseContentDispositionFilename(contentDisposition = "") {
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);

  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }

  const fallbackMatch = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
  return fallbackMatch?.[1] || null;
}

async function downloadFile(currentPath) {
  const query = new URLSearchParams({
    path: currentPath || ".",
  });
  const response = await requestBuffer(`/api/v1/files/download?${query.toString()}`);
  const headers = response.headers || {};

  return {
    path: currentPath || ".",
    name:
      parseContentDispositionFilename(headers["content-disposition"]) ||
      (headers["x-anxhub-file-name"] ? decodeURIComponent(headers["x-anxhub-file-name"]) : null) ||
      getBaseName(currentPath) ||
      "download",
    size: Number.parseInt(headers["x-anxhub-file-size"] || headers["content-length"] || "0", 10) || response.buffer.length,
    modifiedAt: headers["last-modified"] || null,
    contentType: response.contentType || "application/octet-stream",
    buffer: response.buffer,
  };
}

function encodeInstanceId(instanceId) {
  return encodeURIComponent(String(instanceId || ""));
}

async function listInstances(configOverride = null) {
  return requestJson("/api/v1/instances", { config: configOverride });
}

async function createInstance(payload = {}, configOverride = null) {
  return requestJson("/api/v1/instances", {
    config: configOverride,
    method: "POST",
    body: payload,
  });
}

async function updateInstance(instanceId, payload = {}, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}`, {
    config: configOverride,
    method: "PATCH",
    body: payload,
  });
}

async function getInstanceStatus(instanceId, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/status`, { config: configOverride });
}

async function getInstanceMetrics(instanceId) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/metrics`);
}

async function getInstanceLogs(instanceId, options = {}) {
  const query = new URLSearchParams({
    stream: options.stream || "all",
    limit: String(options.limit || 200),
  });

  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/logs?${query.toString()}`);
}

async function clearInstanceLogs(instanceId, options = {}) {
  const query = new URLSearchParams({
    stream: options.stream || "all",
  });

  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/logs?${query.toString()}`, {
    method: "DELETE",
  });
}

async function sendInstanceCommand(instanceId, command) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/command`, {
    method: "POST",
    body: { command },
  });
}

async function forceKillInstance(instanceId, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/force-kill`, {
    config: configOverride,
    method: "POST",
  });
}

async function listInstanceFiles(instanceId, currentPath = ".") {
  const query = new URLSearchParams({ path: currentPath || "." });
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/files?${query.toString()}`);
}

async function readInstanceFile(instanceId, filePath, configOverride = null) {
  const query = new URLSearchParams({ path: filePath || "." });
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/file?${query.toString()}`, { config: configOverride });
}

async function writeInstanceFile(instanceId, filePath, content, options = {}) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/file`, {
    config: options.config || null,
    method: "PUT",
    body: {
      path: filePath,
      content,
      encoding: options.encoding,
    },
  });
}

async function deleteInstanceFile(instanceId, filePath, configOverride = null) {
  const query = new URLSearchParams({ path: filePath || "." });
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/file?${query.toString()}`, {
    config: configOverride,
    method: "DELETE",
  });
}

async function createInstanceFolder(instanceId, folderPath, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/mkdir`, {
    config: configOverride,
    method: "POST",
    body: { path: folderPath },
  });
}

async function renameInstanceFile(instanceId, oldPath, newPath) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/rename`, {
    method: "POST",
    body: {
      oldPath,
      newPath,
    },
  });
}

async function getMinecraftProperties(instanceId) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/minecraft/properties`);
}

async function saveMinecraftProperties(instanceId, properties = {}, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/minecraft/properties`, {
    config: configOverride,
    method: "PUT",
    body: { properties },
  });
}

async function startInstance(instanceId, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/start`, {
    config: configOverride,
    method: "POST",
  });
}

async function stopInstance(instanceId, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/stop`, {
    config: configOverride,
    method: "POST",
  });
}

async function restartInstance(instanceId, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}/restart`, {
    config: configOverride,
    method: "POST",
  });
}

async function deleteInstance(instanceId, configOverride = null) {
  return requestJson(`/api/v1/instances/${encodeInstanceId(instanceId)}`, {
    config: configOverride,
    method: "DELETE",
  });
}

async function listBackups(options = {}) {
  const query = new URLSearchParams();
  if (options.instanceId) {
    query.set("instanceId", options.instanceId);
  }
  return requestJson(`/api/v1/backups/list${query.toString() ? `?${query.toString()}` : ""}`);
}

async function createBackup(payload = {}) {
  return requestJson("/api/v1/backups", {
    method: "POST",
    body: payload,
  });
}

async function restoreBackup(payload = {}) {
  return requestJson("/api/v1/backups/restore", {
    method: "POST",
    body: payload,
  });
}

async function importBackup(payload = {}) {
  return requestJson("/api/v1/backups/import", {
    method: "POST",
    body: payload,
  });
}

async function deleteBackup(backupId) {
  return requestJson(`/api/v1/backups/${encodeURIComponent(String(backupId || ""))}`, {
    method: "DELETE",
  });
}

async function downloadBackup(backupId) {
  return requestBuffer(`/api/v1/backups/${encodeURIComponent(String(backupId || ""))}/download`);
}

async function listBackupSchedules() {
  return requestJson("/api/v1/backups/schedules");
}

async function saveBackupSchedule(payload = {}) {
  return requestJson("/api/v1/backups/schedules", {
    method: "PUT",
    body: payload,
  });
}

async function deleteBackupSchedule(instanceId) {
  return requestJson(`/api/v1/backups/${encodeURIComponent(String(instanceId || ""))}/schedule`, {
    method: "DELETE",
  });
}

module.exports = {
  AgentClientError,
  clearInstanceLogs,
  createBackup,
  createDockerContainer,
  downloadFile,
  downloadBackup,
  createInstance,
  createInstanceFolder,
  deleteBackup,
  deleteBackupSchedule,
  deleteDockerContainer,
  deleteInstance,
  deleteInstanceFile,
  forceKillInstance,
  getAgentConfigPath,
  getBackendMode,
  getDefaultAgentSettings,
  getEffectiveAgentSettings,
  getAmpInstances,
  getAmpSnapshot,
  getAmpStatus,
  getAgentConfig,
  getDockerContainers,
  getDockerContainerLogs,
  getDockerContainerStats,
  getDockerSnapshot,
  getDockerSummary,
  getFileList,
  getFileListing,
  getHealth,
  getInstanceLogs,
  getInstanceMetrics,
  getInstanceStatus,
  getMinecraftProperties,
  getPlayitSnapshot,
  getPlayitStatus,
  isHealthy,
  importBackup,
  listBackupSchedules,
  listBackups,
  listInstanceFiles,
  listInstances,
  loadEnvironment,
  normalizeAgentSettings,
  readAgentSettings,
  requestBuffer,
  requestJson,
  saveAgentSettings,
  saveBackupSchedule,
  saveMinecraftProperties,
  sendInstanceCommand,
  startDockerContainer,
  restartInstance,
  restoreBackup,
  testConnection,
  startInstance,
  stopInstance,
  stopDockerContainer,
  restartDockerContainer,
  readInstanceFile,
  renameInstanceFile,
  updateInstance,
  writeInstanceFile,
};
