const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { AMPAPI } = require("@cubecoders/ampapi");

const REQUIRED_ENV = ["AMP_URL", "AMP_USERNAME", "AMP_PASSWORD"];
const AMP_TIMEOUT_MS = 4500;
const SAFE_ERROR_FIELDS = ["code", "errno", "syscall"];
const UNSPECIFIED_BIND_ADDRESSES = new Set(["", "0.0.0.0", "::", "[::]"]);
const PLACEHOLDER_ENV_VALUES = new Set([
  "your_amp_url",
  "your_amp_username",
  "your_amp_password",
  "change_me",
  "changeme",
]);
const AMP_POLL_STATE = {
  sequence: 0,
  lastSuccessfulPollAt: null,
};
const DETAIL_CONTAINER_KEYS = [
  "ApplicationState",
  "AppState",
  "Controller",
  "Endpoint",
  "Endpoints",
  "Metrics",
  "Network",
  "Performance",
  "Ports",
  "Resources",
  "ServerState",
  "Status",
  "State",
];

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean))];
}

function getEnvCandidates() {
  return uniquePaths([
    process.env.ANXHUB_ENV_PATH,
    path.join(process.cwd(), ".env"),
    process.resourcesPath ? path.join(process.resourcesPath, ".env") : null,
    process.resourcesPath ? path.join(process.resourcesPath, "app", ".env") : null,
    process.execPath ? path.join(path.dirname(process.execPath), ".env") : null,
    path.join(__dirname, "..", "..", ".env"),
  ]);
}

function getEnvExampleCandidates() {
  return uniquePaths([
    process.env.ANXHUB_ENV_EXAMPLE_PATH,
    path.join(process.cwd(), ".env.example"),
    process.resourcesPath ? path.join(process.resourcesPath, ".env.example") : null,
    process.resourcesPath ? path.join(process.resourcesPath, "app", ".env.example") : null,
    path.join(__dirname, "..", "..", ".env.example"),
  ]);
}

function bootstrapEnvFile(candidates) {
  const targetPath = process.env.ANXHUB_ENV_PATH || path.join(process.cwd(), ".env");
  const existingPath = process.env.ANXHUB_ENV_PATH
    ? (fs.existsSync(process.env.ANXHUB_ENV_PATH) ? process.env.ANXHUB_ENV_PATH : null)
    : candidates.find((candidate) => fs.existsSync(candidate));

  if (existingPath) {
    return {
      resolvedEnvPath: existingPath,
      envAutoCreated: false,
      envTemplatePath: null,
      envCreateErrorCode: null,
    };
  }

  const templatePath = getEnvExampleCandidates().find((candidate) => fs.existsSync(candidate));

  if (!templatePath) {
    return {
      resolvedEnvPath: targetPath,
      envAutoCreated: false,
      envTemplatePath: null,
      envCreateErrorCode: "ENOENT",
    };
  }

  try {
    fs.copyFileSync(templatePath, targetPath, fs.constants.COPYFILE_EXCL);

    return {
      resolvedEnvPath: targetPath,
      envAutoCreated: true,
      envTemplatePath: templatePath,
      envCreateErrorCode: null,
    };
  } catch (error) {
    return {
      resolvedEnvPath: targetPath,
      envAutoCreated: false,
      envTemplatePath: templatePath,
      envCreateErrorCode: getSafeErrorCode(error),
    };
  }
}

function loadEnv() {
  const candidates = getEnvCandidates();
  const bootstrap = bootstrapEnvFile(candidates);
  const result = dotenv.config({ path: bootstrap.resolvedEnvPath, quiet: true });

  return {
    cwd: process.cwd(),
    resolvedEnvPath: bootstrap.resolvedEnvPath,
    envFileExists: fs.existsSync(bootstrap.resolvedEnvPath),
    envAutoCreated: bootstrap.envAutoCreated,
    envTemplatePath: bootstrap.envTemplatePath,
    envCreateErrorCode: bootstrap.envCreateErrorCode,
    envLoadErrorCode: result.error?.code || null,
    ampUrlLoaded: Boolean(process.env.AMP_URL),
  };
}

const ENV_LOAD_INFO = loadEnv();

function getConfig() {
  const config = {
    url: process.env.AMP_URL,
    username: process.env.AMP_USERNAME,
    password: process.env.AMP_PASSWORD,
  };

  const missing = REQUIRED_ENV.filter((key) => {
    const value = process.env[key];
    return !value || PLACEHOLDER_ENV_VALUES.has(String(value).trim().toLowerCase());
  });

  return {
    ...config,
    configured: missing.length === 0,
    missing,
    env: {
      ...ENV_LOAD_INFO,
      ampUrlLoaded: Boolean(process.env.AMP_URL),
      ampUrl: process.env.AMP_URL || null,
    },
  };
}

function buildAmpApiUrl(baseUrl, moduleName, methodName) {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmedBase}/API/${moduleName}/${methodName}`;
}

async function preflightAmpApi(config) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AMP_TIMEOUT_MS);

  try {
    const response = await fetch(buildAmpApiUrl(config.url, "Core", "GetAPISpec"), {
      method: "POST",
      headers: {
        Accept: "application/vnd.cubecoders-ampapi",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ SESSIONID: "" }),
      signal: controller.signal,
    });

    const body = await response.text();
    JSON.parse(body);
    return {
      ok: response.ok,
      httpStatus: response.status,
      errorCode: null,
    };
  } catch (error) {
    return {
      ok: false,
      httpStatus: null,
      errorCode: getSafeErrorCode(error),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getSafeErrorCode(error) {
  if (!error) {
    return null;
  }

  if (error.name === "AbortError") {
    return "ETIMEDOUT";
  }

  for (const field of SAFE_ERROR_FIELDS) {
    if (typeof error[field] === "string" && error[field]) {
      return error[field];
    }
  }

  if (error.cause) {
    return getSafeErrorCode(error.cause);
  }

  return error.name || "UNKNOWN";
}

function createDiagnostics(config, stage, details = {}) {
  return {
    ampUrl: config.url || null,
    cwd: config.env?.cwd || null,
    resolvedEnvPath: config.env?.resolvedEnvPath || null,
    envFileExists: config.env?.envFileExists ?? false,
    envAutoCreated: config.env?.envAutoCreated ?? false,
    envTemplatePath: config.env?.envTemplatePath || null,
    envCreateErrorCode: config.env?.envCreateErrorCode || null,
    envLoadErrorCode: config.env?.envLoadErrorCode || null,
    ampUrlLoaded: config.env?.ampUrlLoaded ?? false,
    loadedAmpUrl: config.env?.ampUrl || null,
    httpStatus: details.httpStatus ?? null,
    errorCode: details.errorCode ?? null,
    networkErrorCode: details.errorCode ?? null,
    lastSuccessfulPollAt: AMP_POLL_STATE.lastSuccessfulPollAt,
    pollSequence: AMP_POLL_STATE.sequence,
    stage,
    loginFailed: stage === "login",
    serverUnreachable: stage === "preflight" || stage === "api_spec" || stage === "client_error",
  };
}

function getConnectionLabel(status) {
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

function createConnectionState(status, message, diagnostics = null) {
  return {
    status,
    label: getConnectionLabel(status),
    message,
    connected: status === "connected",
    unreachable: status === "unreachable" || status === "error",
    authFailed: status === "auth_failed",
    diagnostics,
  };
}

function createAmpSnapshot({
  connected,
  configured,
  status,
  message,
  diagnostics = null,
  instances = [],
  selectedInstance = null,
  minecraftInstances = [],
  minecraftSelectionMode = "none",
}) {
  const instanceCount = Array.isArray(instances) ? instances.length : 0;

  return {
    connected,
    configured,
    status,
    message,
    diagnostics,
    connection: createConnectionState(status, message, diagnostics),
    instanceCount,
    instances,
    selectedInstance,
    minecraftInstances,
    minecraftSelectionMode,
    poll: {
      sequence: AMP_POLL_STATE.sequence,
      lastSuccessfulPollAt: AMP_POLL_STATE.lastSuccessfulPollAt,
      status,
      instanceCount,
    },
    summary: summarizeInstances(instances),
  };
}

function markSuccessfulAmpPoll(status, instances) {
  AMP_POLL_STATE.sequence += 1;
  AMP_POLL_STATE.lastSuccessfulPollAt = new Date().toISOString();
}

function safeNumber(value) {
  if (value === null || value === undefined || typeof value === "boolean" || value === "" || Array.isArray(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function findValue(source, keys) {
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
    return null;
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

function extractSessionId(loginResult) {
  if (typeof loginResult === "string" && loginResult.length > 0) {
    return loginResult;
  }

  return findValue(loginResult, ["sessionID", "SessionID", "sessionId", "SESSIONID"]);
}

function extractActionResultValue(result) {
  if (typeof result === "string" && result.length > 0) {
    return result;
  }

  return findValue(result, ["Result", "result", "Value", "value"]);
}

function didLoginSucceed(loginResult, sessionId) {
  if (sessionId) {
    return true;
  }

  if (!loginResult || typeof loginResult !== "object") {
    return false;
  }

  const result = findValue(loginResult, ["success", "Success", "result", "Result"]);
  return result === true || result === "success" || result === "Success";
}

async function callMethod(target, methodName, args = []) {
  const result = await callMethodDetailed(target, methodName, args);
  return result.ok ? result.value : null;
}

async function callMethodDetailed(target, methodName, args = []) {
  const method = target?.[methodName];

  if (typeof method !== "function") {
    return { ok: false, missing: true, value: null, errorCode: null };
  }

  try {
    return {
      ok: true,
      missing: false,
      value: await withTimeout(method(...args), AMP_TIMEOUT_MS),
      errorCode: null,
    };
  } catch (error) {
    return {
      ok: false,
      missing: false,
      value: null,
      errorCode: getSafeErrorCode(error),
    };
  }
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("AMP request timed out.")), timeoutMs);
    }),
  ]);
}

async function authenticate(api, config) {
  const loginResult = await callMethod(api.Core, "LoginAsync", [config.username, config.password, "", false]);
  const sessionId = extractSessionId(loginResult);

  if (sessionId) {
    api.sessionId = sessionId;
  }

  const authenticated = didLoginSucceed(loginResult, sessionId);

  if (!authenticated) {
    return false;
  }

  return withTimeout(api.initAsync(), AMP_TIMEOUT_MS);
}

async function authenticateWithToken(api, username, token) {
  const loginResult = await callMethod(api.Core, "LoginAsync", [username, "", token, false]);
  const sessionId = extractSessionId(loginResult);

  if (sessionId) {
    api.sessionId = sessionId;
  }

  const authenticated = didLoginSucceed(loginResult, sessionId);

  if (!authenticated) {
    return false;
  }

  return withTimeout(api.initAsync(), AMP_TIMEOUT_MS);
}

function hasAnyKey(value, keys) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return keys.some((key) => value[key] !== undefined && value[key] !== null);
}

function unwrapResult(value) {
  if (value && typeof value === "object" && Object.keys(value).length === 1 && value.result !== undefined) {
    return value.result;
  }

  return value;
}

function asArray(value) {
  const unwrapped = unwrapResult(value);

  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  if (!unwrapped || typeof unwrapped !== "object") {
    return [];
  }

  const preferredKeys = [
    "AvailableInstances",
    "Instances",
    "InstanceStatuses",
    "Statuses",
    "Result",
    "result",
    "InstanceState",
    "RemoteTargets",
  ];

  for (const key of preferredKeys) {
    if (unwrapped[key] !== undefined) {
      return asArray(unwrapped[key]);
    }
  }

  if (
    hasAnyKey(unwrapped, [
      "InstanceID",
      "InstanceId",
      "Id",
      "ID",
      "InstanceName",
      "FriendlyName",
      "Name",
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

function pickFirstObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
}

function pickDefinedValues(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined));
}

function flattenKnownContainers(value) {
  const flat = {};

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return flat;
  }

  Object.assign(flat, value);

  for (const key of DETAIL_CONTAINER_KEYS) {
    const nested = value[key];

    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      Object.assign(flat, nested);
    }
  }

  return flat;
}

function getInstanceId(instance) {
  return findValue(instance, ["InstanceID", "InstanceId", "InstanceIdString", "Id", "ID", "Guid", "id", "mapKey"]);
}

function getModuleType(instance) {
  return findValue(instance, ["Module", "ModuleName", "ApplicationModule", "AppModule", "ModuleDisplayName", "Application", "moduleType"]) || "Unknown";
}

function getInstanceName(instance) {
  return findValue(instance, ["InstanceName", "FriendlyName", "Name", "DisplayName", "Description", "name"]) || "AMP Instance";
}

function getVersion(instance) {
  return findValue(instance, [
    "Version",
    "AppVersion",
    "ApplicationVersion",
    "ServerVersion",
    "MinecraftVersion",
    "ProductVersion",
    "ReleaseStream",
    "Build",
  ]);
}

function buildManagedInstanceUrl(config, instance) {
  const port = safeNumber(findValue(instance, ["Port", "port"]));

  if (port === null) {
    return null;
  }

  const fallbackUrl = new URL(config.url);
  const rawHost = String(findValue(instance, ["IP", "ApplicationIP", "Host", "hostname"]) || "").trim();
  const host = rawHost && !UNSPECIFIED_BIND_ADDRESSES.has(rawHost) ? rawHost : fallbackUrl.hostname;
  const protocol = findValue(instance, ["IsHTTPS", "isHttps"]) === true ? "https:" : fallbackUrl.protocol;

  return `${protocol}//${host}:${port}`;
}

function isMinecraftInstance(instance) {
  const searchable = [
    getInstanceName(instance),
    getModuleType(instance),
    findValue(instance, ["Target", "Type", "Application", "ApplicationName"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes("minecraft") || searchable.includes("mc") || searchable.includes("atm10");
}

function normalizePorts(value) {
  if (Array.isArray(value)) {
    return value
      .map((port) => {
        if (typeof port === "number" || typeof port === "string") {
          return String(port);
        }

        if (!port || typeof port !== "object") {
          return null;
        }

        const number = findValue(port, ["Port", "port", "HostPort", "ContainerPort", "PublicPort"]);
        const protocol = findValue(port, ["Protocol", "protocol"]);
        return number ? `${number}${protocol ? `/${protocol}` : ""}` : null;
      })
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value)
      .map((port) => (typeof port === "object" ? findValue(port, ["Port", "port", "HostPort", "PublicPort"]) : port))
      .filter((port) => port !== null && port !== undefined)
      .map(String);
  }

  const singlePort = safeNumber(value);
  return singlePort === null ? [] : [String(singlePort)];
}

function normalizeUptime(value) {
  const number = parseDurationSeconds(value);
  if (number === null) {
    return null;
  }

  return number;
}

function getMetric(metrics, metricName) {
  const metric = metrics?.[metricName];
  return metric && typeof metric === "object" ? metric : null;
}

function getFirstMetric(metrics, metricNames) {
  for (const metricName of metricNames) {
    const metric = getMetric(metrics, metricName);

    if (metric) {
      return metric;
    }
  }

  return null;
}

function getMetricRawValue(metrics, metricName) {
  return safeNumber(findValue(getMetric(metrics, metricName), ["RawValue", "rawValue", "Value", "value"]));
}

function getFirstMetricRawValue(metrics, metricNames) {
  return safeNumber(findValue(getFirstMetric(metrics, metricNames), ["RawValue", "rawValue", "Value", "value"]));
}

function getMetricMaxValue(metrics, metricName) {
  return safeNumber(findValue(getMetric(metrics, metricName), ["MaxValue", "maxValue", "Maximum", "maximum"]));
}

function getFirstMetricMaxValue(metrics, metricNames) {
  return safeNumber(findValue(getFirstMetric(metrics, metricNames), ["MaxValue", "maxValue", "Maximum", "maximum"]));
}

function getMetricPercent(metrics, metricName) {
  return normalizePercent(findValue(getMetric(metrics, metricName), ["Percent", "percent"]));
}

function getFirstMetricPercent(metrics, metricNames) {
  return normalizePercent(findValue(getFirstMetric(metrics, metricNames), ["Percent", "percent"]));
}

function normalizeMemoryUsage(value) {
  const number = safeNumber(value);
  if (number === null) {
    return null;
  }

  return number;
}

function mergeStatusRows(instance, statuses) {
  const instanceId = getInstanceId(instance);

  if (!instanceId) {
    return null;
  }

  return statuses.find((status) => {
    const statusId = getInstanceId(status);
    return statusId && String(instanceId) === String(statusId);
  });
}

function dedupeInstances(instances) {
  const seen = new Set();
  const deduped = [];

  for (const instance of instances) {
    const key = String(getInstanceId(instance) || getInstanceName(instance)).toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(instance);
  }

  return deduped;
}

function normalizeInstance(instance, status, detail = null) {
  const merged = {
    ...flattenKnownContainers(pickFirstObject(instance)),
    ...flattenKnownContainers(pickFirstObject(status)),
    ...flattenKnownContainers(pickFirstObject(detail)),
  };
  const name = getInstanceName(merged);
  const state =
    findValue(merged, ["State", "Status", "ApplicationState", "DaemonState", "AppState", "InstanceState", "StateText", "Running", "state"]) ||
    "Unknown";
  const players = findValue(merged, [
    "Players",
    "PlayerCount",
    "CurrentPlayers",
    "ActiveUsers",
    "UsersOnline",
    "OnlinePlayers",
    "PlayersOnline",
  ]);
  const maxPlayers = findValue(merged, ["MaxPlayers", "MaximumPlayers", "PlayerLimit", "PlayerLimitMax", "MaxUsers"]);
  const memory = findValue(merged, [
    "MemoryUsageMB",
    "MemoryMB",
    "MemoryUsage",
    "RAMUsage",
    "UsedMemory",
    "Memory",
    "MemUsageMB",
  ]);
  const ports = normalizePorts(
    findValue(merged, ["Ports", "Port", "PortMappings", "ApplicationEndpoints", "NetworkPorts", "Endpoint", "Endpoints"]),
  );

  return {
    id: getInstanceId(merged) || name,
    name,
    friendlyName: findValue(merged, ["FriendlyName", "friendlyName"]),
    moduleType: getModuleType(merged),
    isMinecraft: isMinecraftInstance(merged),
    state,
    playerCount: safeNumber(players),
    maxPlayers: safeNumber(maxPlayers),
    tps: safeNumber(findValue(merged, ["TPS", "TicksPerSecond", "ServerTPS", "CurrentTPS"])),
    cpuUsage: normalizePercent(findValue(merged, ["CPUUsage", "CpuUsage", "CPU", "ProcessorUsage", "PercentCPU", "CPUPercent"])),
    ramUsage: normalizeMemoryUsage(memory),
    ports,
    uptime: normalizeUptime(findValue(merged, ["Uptime", "UptimeSeconds", "RunningSeconds", "StartedFor", "UptimeSec"])),
    version: getVersion(merged),
  };
}

async function getInstanceDetail(api, instance) {
  const instanceId = getInstanceId(instance);

  if (!instanceId) {
    return null;
  }

  const attempts = [
    ["GetInstanceStatusAsync", [instanceId]],
    ["GetInstanceInfoAsync", [instanceId]],
    ["GetInstanceAsync", [instanceId]],
    ["GetInstanceDetailsAsync", [instanceId]],
    ["GetInstanceMetricsAsync", [instanceId]],
  ];

  const details = {};

  for (const [methodName, args] of attempts) {
    const result = await callMethodDetailed(api.ADSModule, methodName, args);

    if (result.ok && result.value) {
      Object.assign(details, pickFirstObject(unwrapResult(result.value)));
    }
  }

  return Object.keys(details).length > 0 ? details : null;
}

async function enrichSelectedInstance(api, selectedInstance) {
  if (!selectedInstance) {
    return null;
  }

  const detail = await getInstanceDetail(api, selectedInstance);
  const enriched = normalizeInstance(selectedInstance, null, detail);

  return enriched;
}

async function getAdsInstance(api, instanceId) {
  if (!instanceId) {
    return null;
  }

  const result = await callMethodDetailed(api.ADSModule, "GetInstanceAsync", [instanceId]);

  if (result.ok && result.value) {
    return pickFirstObject(unwrapResult(result.value));
  }

  return null;
}

async function authenticateManagedInstance(adsApi, config, selectedInstance) {
  const instanceId = getInstanceId(selectedInstance);

  if (!instanceId) {
    return null;
  }

  const adsInstance = await getAdsInstance(adsApi, instanceId);
  const managedUrl = adsInstance ? buildManagedInstanceUrl(config, adsInstance) : null;

  if (!adsInstance || !managedUrl) {
    return null;
  }

  const handoffResult = await callMethodDetailed(adsApi.ADSModule, "ManageInstanceAsync", [instanceId]);
  const handoffToken = handoffResult.ok ? extractActionResultValue(handoffResult.value) : null;

  if (!handoffToken) {
    return null;
  }

  const managedApi = new AMPAPI(managedUrl);
  const initialized = await withTimeout(managedApi.initAsync(), AMP_TIMEOUT_MS);
  const authenticated = initialized ? await authenticateWithToken(managedApi, config.username, handoffToken) : false;

  return authenticated ? managedApi : null;
}

async function getMinecraftVersion(managedApi) {
  const result = await callMethodDetailed(managedApi.Core, "GetConfigAsync", ["MinecraftModule.Minecraft.SpecificVersion"]);

  if (!result.ok || !result.value) {
    return null;
  }

  const config = pickFirstObject(unwrapResult(result.value));
  return findValue(config, ["CurrentValue", "currentValue", "Value", "value"]);
}

async function getManagedInstanceMetrics(managedApi) {
  if (!managedApi) {
    return null;
  }

  const statusResult = await callMethodDetailed(managedApi.Core, "GetStatusAsync");

  if (!statusResult.ok || !statusResult.value) {
    return null;
  }

  const status = pickFirstObject(unwrapResult(statusResult.value));
  const metrics = pickFirstObject(status.Metrics);
  const version = await getMinecraftVersion(managedApi);
  const usersMetricNames = ["Active Users", "Users", "Players", "Online Players", "Player Count"];
  const tpsMetricNames = ["TPS", "Ticks Per Second", "Server TPS"];
  const cpuMetricNames = ["CPU Usage", "CPU", "Processor Usage"];
  const memoryMetricNames = ["Memory Usage", "RAM Usage", "Memory", "RAM"];

  const normalized = pickDefinedValues({
    state: findValue(status, ["State", "Status", "ApplicationState", "DaemonState", "AppState", "InstanceState", "StateText", "Running", "state"]),
    playerCount: getFirstMetricRawValue(metrics, usersMetricNames),
    maxPlayers: getFirstMetricMaxValue(metrics, usersMetricNames),
    tps: getFirstMetricRawValue(metrics, tpsMetricNames),
    cpuUsage: getFirstMetricPercent(metrics, cpuMetricNames),
    ramUsage: getFirstMetricRawValue(metrics, memoryMetricNames),
    uptime: normalizeUptime(findValue(status, ["Uptime", "uptime"])),
    version,
  });

  return normalized;
}

async function getSelectedInstanceChildMetrics(api, config, selectedInstance) {
  if (!selectedInstance) {
    return {
      managedInstanceApi: null,
      managedMetrics: null,
    };
  }

  try {
    const managedInstanceApi = await authenticateManagedInstance(api, config, selectedInstance);
    const managedMetrics = await getManagedInstanceMetrics(managedInstanceApi);

    return {
      managedInstanceApi,
      managedMetrics,
    };
  } catch {
    return {
      managedInstanceApi: null,
      managedMetrics: null,
    };
  }
}

async function getInstances(api) {
  const instanceMethodNames = ["GetInstancesAsync", "GetAvailableInstancesAsync", "GetInstanceListAsync", "ListInstancesAsync"];
  const instanceResults = [];

  for (const methodName of instanceMethodNames) {
    const result = await callMethodDetailed(api.ADSModule, methodName);

    if (result.ok) {
      instanceResults.push({ methodName, value: result.value });
    }
  }

  const statusesResult = await callMethodDetailed(api.ADSModule, "GetInstanceStatusesAsync");

  const rawInstances = dedupeInstances(instanceResults.flatMap((result) => asArray(result.value)));
  const statusRows = statusesResult.ok ? asArray(statusesResult.value) : [];
  const statusInstances = [];

  for (const status of statusRows) {
    const instanceId = getInstanceId(status);
    const instance = await getAdsInstance(api, instanceId);
    statusInstances.push(instance ? { ...status, ...instance } : status);
  }

  const moduleInfoResult = await callMethodDetailed(api.Core, "GetModuleInfoAsync");
  const moduleInfoRows = moduleInfoResult.ok ? asArray(moduleInfoResult.value) : [];

  if (rawInstances.length === 0 && statusInstances.length === 0 && moduleInfoRows.length === 0) {
    return [];
  }

  const sourceRows = dedupeInstances([...statusInstances, ...rawInstances, ...moduleInfoRows]);
  const normalized = [];

  for (const instance of sourceRows) {
    const status = mergeStatusRows(instance, statusRows);
    normalized.push(normalizeInstance(instance, status));
  }

  return normalized;
}

function selectMinecraftInstance(instances) {
  const minecraftInstances = instances.filter((instance) => instance.isMinecraft);

  return {
    selected: minecraftInstances.length === 1 ? minecraftInstances[0] : null,
    minecraftInstances,
    mode: minecraftInstances.length === 0 ? "none" : minecraftInstances.length === 1 ? "auto" : "multiple",
  };
}

function summarizeInstances(instances) {
  if (instances.length === 0) {
    return {
      state: "No instances",
      playerCount: null,
      tps: null,
      cpuUsage: null,
      ramUsage: null,
    };
  }

  const { selected } = selectMinecraftInstance(instances);
  const primary = selected || instances[0];
  const scopedInstances = selected ? [selected] : instances;
  const playerValues = scopedInstances.map((instance) => instance.playerCount).filter(Number.isFinite);
  const cpuValues = scopedInstances.map((instance) => instance.cpuUsage).filter(Number.isFinite);
  const ramValues = scopedInstances.map((instance) => instance.ramUsage).filter(Number.isFinite);
  const tpsValues = scopedInstances.map((instance) => instance.tps).filter(Number.isFinite);

  return {
    selectedInstanceId: selected?.id || null,
    selectedInstanceName: selected?.name || null,
    minecraftInstanceCount: instances.filter((instance) => instance.isMinecraft).length,
    minecraftSelectionMode: selectMinecraftInstance(instances).mode,
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

async function getAmpSnapshot() {
  const config = getConfig();

  if (!config.configured) {
    return createAmpSnapshot({
      connected: false,
      configured: false,
      status: "unconfigured",
      message: `Missing ${config.missing.join(", ")}`,
      diagnostics: createDiagnostics(config, "config"),
    });
  }

  try {
    const preflight = await preflightAmpApi(config);

    if (!preflight.ok) {
      const diagnostics = createDiagnostics(config, "preflight", preflight);

      return createAmpSnapshot({
        connected: false,
        configured: true,
        status: "unreachable",
        message: "AMP API is unreachable.",
        diagnostics,
      });
    }

    const api = new AMPAPI(config.url);
    const initialized = await withTimeout(api.initAsync(), AMP_TIMEOUT_MS);

    if (!initialized) {
      const diagnostics = createDiagnostics(config, "api_spec");

      return createAmpSnapshot({
        connected: false,
        configured: true,
        status: "unreachable",
        message: "AMP API spec is unavailable.",
        diagnostics,
      });
    }

    const authenticated = await authenticate(api, config);

    if (!authenticated) {
      const diagnostics = createDiagnostics(config, "login");

      return createAmpSnapshot({
        connected: false,
        configured: true,
        status: "auth_failed",
        message: "AMP authentication failed.",
        diagnostics,
      });
    }

    const instances = await getInstances(api);
    const selection = selectMinecraftInstance(instances);
    const adsSelectedInstance = await enrichSelectedInstance(api, selection.selected);
    const adsInstances = adsSelectedInstance
      ? instances.map((instance) => (String(instance.id) === String(adsSelectedInstance.id) ? adsSelectedInstance : instance))
      : instances;
    const adsMinecraftInstances = adsInstances.filter((instance) => instance.isMinecraft);

    markSuccessfulAmpPoll("connected", adsInstances);

    const adsSnapshot = createAmpSnapshot({
      connected: true,
      configured: true,
      status: "connected",
      message: "Connected to AMP.",
      diagnostics: createDiagnostics(config, "connected"),
      instances: adsInstances,
      selectedInstance: adsSelectedInstance,
      minecraftInstances: adsMinecraftInstances,
      minecraftSelectionMode: selection.mode,
    });

    const { managedInstanceApi, managedMetrics } = await getSelectedInstanceChildMetrics(api, config, adsSelectedInstance);

    if (!managedMetrics) {
      return adsSnapshot;
    }

    const finalSelectedInstance = {
      ...adsSelectedInstance,
      ...pickFirstObject(managedMetrics),
      childAuthenticated: Boolean(managedInstanceApi),
    };
    const finalInstances = adsInstances.map((instance) =>
      String(instance.id) === String(finalSelectedInstance.id) ? finalSelectedInstance : instance,
    );
    const finalMinecraftInstances = finalInstances.filter((instance) => instance.isMinecraft);

    return createAmpSnapshot({
      connected: true,
      configured: true,
      status: "connected",
      message: "Connected to AMP.",
      diagnostics: createDiagnostics(config, "connected"),
      instances: finalInstances,
      selectedInstance: finalSelectedInstance,
      minecraftInstances: finalMinecraftInstances,
      minecraftSelectionMode: selection.mode,
    });
  } catch (error) {
    const diagnostics = createDiagnostics(config, "client_error", {
      errorCode: getSafeErrorCode(error),
    });

    return createAmpSnapshot({
      connected: false,
      configured: true,
      status: "unreachable",
      message: "AMP ADS discovery failed.",
      diagnostics,
    });
  }
}

function getMethodNames(target) {
  if (!target || typeof target !== "object") {
    return [];
  }

  const names = new Set();
  let cursor = target;

  while (cursor && cursor !== Object.prototype) {
    Object.getOwnPropertyNames(cursor).forEach((name) => {
      if (name !== "constructor" && typeof target[name] === "function") {
        names.add(name);
      }
    });
    cursor = Object.getPrototypeOf(cursor);
  }

  return [...names].sort();
}

function getApiMethods(api) {
  return Object.fromEntries(
    Object.entries(api)
      .filter(([, moduleValue]) => moduleValue && typeof moduleValue === "object")
      .map(([moduleName, moduleValue]) => [moduleName, getMethodNames(moduleValue)])
      .filter(([, methods]) => methods.length > 0),
  );
}

function getJsonKeys(value, prefix = "", output = new Set()) {
  if (!value || typeof value !== "object") {
    return output;
  }

  if (Array.isArray(value)) {
    output.add(`${prefix || "<root>"}[]`);
    value.slice(0, 3).forEach((item) => getJsonKeys(item, `${prefix}[]`, output));
    return output;
  }

  Object.keys(value).forEach((key) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    output.add(nextPrefix);
    getJsonKeys(value[key], nextPrefix, output);
  });

  return output;
}

function sanitizeDiagnosticValue(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeDiagnosticValue);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (/password|token|session|secret/i.test(key)) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeDiagnosticValue(item)];
    }),
  );
}

function summarizeDiagnosticCall(label, result) {
  const value = sanitizeDiagnosticValue(unwrapResult(result.value));

  return {
    label,
    ok: result.ok,
    missing: result.missing,
    errorCode: result.errorCode,
    topLevelKeys: value && typeof value === "object" ? Object.keys(value) : [],
    jsonKeys: [...getJsonKeys(value)].sort(),
    value,
  };
}

function isSafeRuntimeMethod(methodName) {
  return /^Get/i.test(methodName) && /status|metric|player|user|tps|performance|usage|state|uptime|memory|ram|cpu|version/i.test(methodName);
}

function collectMetricCandidates(calls) {
  const wanted = /player|user|tps|cpu|processor|ram|memory|uptime|state|version/i;
  const candidates = [];

  function visit(value, path = "") {
    if (!value || typeof value !== "object") {
      if (path && wanted.test(path)) {
        candidates.push({ path, value });
      }
      return;
    }

    if (Array.isArray(value)) {
      value.slice(0, 3).forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    Object.entries(value).forEach(([key, item]) => {
      const nextPath = path ? `${path}.${key}` : key;
      if (wanted.test(nextPath) && (!item || typeof item !== "object")) {
        candidates.push({ path: nextPath, value: item });
      }
      visit(item, nextPath);
    });
  }

  calls.forEach((call) => visit(call.value, call.label));
  return candidates;
}

async function inspectManagedMinecraftRuntime({ instanceHint = "Coolpals01" } = {}) {
  const config = getConfig();

  if (!config.configured) {
    throw new Error(`AMP is not configured. Missing ${config.missing.join(", ")}`);
  }

  const api = new AMPAPI(config.url);
  const initialized = await withTimeout(api.initAsync(), AMP_TIMEOUT_MS);

  if (!initialized) {
    throw new Error("AMP API spec is unavailable.");
  }

  const authenticated = await authenticate(api, config);

  if (!authenticated) {
    throw new Error("AMP authentication failed.");
  }

  const instances = await getInstances(api);
  const hint = String(instanceHint || "").toLowerCase();
  const selected =
    instances.find((instance) =>
      [instance.name, instance.friendlyName, instance.moduleType, instance.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(hint),
    ) || selectMinecraftInstance(instances).selected;

  if (!selected) {
    throw new Error(`No managed Minecraft instance matched "${instanceHint}".`);
  }

  const adsSelectedInstance = await enrichSelectedInstance(api, selected);
  const managedApi = await authenticateManagedInstance(api, config, adsSelectedInstance);

  if (!managedApi) {
    throw new Error("Managed Minecraft instance authentication failed.");
  }

  const readOnlyCalls = [];
  const coreCalls = [
    ["Core.GetStatusAsync", managedApi.Core, "GetStatusAsync", []],
    ["Core.GetUpdatesAsync", managedApi.Core, "GetUpdatesAsync", []],
    ["Core.GetModuleInfoAsync", managedApi.Core, "GetModuleInfoAsync", []],
    [
      "Core.GetConfigAsync(MinecraftModule.Minecraft.SpecificVersion)",
      managedApi.Core,
      "GetConfigAsync",
      ["MinecraftModule.Minecraft.SpecificVersion"],
    ],
  ];

  for (const [label, moduleValue, methodName, args] of coreCalls) {
    readOnlyCalls.push(summarizeDiagnosticCall(label, await callMethodDetailed(moduleValue, methodName, args)));
  }

  const managedMethods = getApiMethods(managedApi);

  for (const [moduleName, methods] of Object.entries(managedMethods)) {
    if (moduleName === "Core") {
      continue;
    }

    for (const methodName of methods.filter(isSafeRuntimeMethod)) {
      readOnlyCalls.push(
        summarizeDiagnosticCall(`${moduleName}.${methodName}`, await callMethodDetailed(managedApi[moduleName], methodName, [])),
      );
    }
  }

  return {
    envPath: config.env?.resolvedEnvPath || null,
    ampUrl: config.url,
    selectedInstance: sanitizeDiagnosticValue(adsSelectedInstance),
    managedUrl: adsSelectedInstance ? buildManagedInstanceUrl(config, adsSelectedInstance) : null,
    managedAuthenticated: true,
    adsMethods: getApiMethods(api),
    managedMethods,
    readOnlyCalls,
    metricCandidates: collectMetricCandidates(readOnlyCalls),
  };
}

module.exports = {
  getAmpSnapshot,
  inspectManagedMinecraftRuntime,
};
