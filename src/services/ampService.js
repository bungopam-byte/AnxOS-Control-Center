const path = require("path");
const dotenv = require("dotenv");
const { AMPAPI } = require("@cubecoders/ampapi");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env"), quiet: true });

const REQUIRED_ENV = ["AMP_URL", "AMP_USERNAME", "AMP_PASSWORD"];
const AMP_TIMEOUT_MS = 4500;
const SAFE_ERROR_FIELDS = ["code", "errno", "syscall"];
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

function getConfig() {
  const config = {
    url: process.env.AMP_URL,
    username: process.env.AMP_USERNAME,
    password: process.env.AMP_PASSWORD,
  };

  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  return {
    ...config,
    configured: missing.length === 0,
    missing,
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
    httpStatus: details.httpStatus ?? null,
    errorCode: details.errorCode ?? null,
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
  return {
    connected,
    configured,
    status,
    message,
    diagnostics,
    connection: createConnectionState(status, message, diagnostics),
    instances,
    selectedInstance,
    minecraftInstances,
    minecraftSelectionMode,
    summary: summarizeInstances(instances),
  };
}

function logSafeAmpDiagnostics(diagnostics) {
  console.log("[AnxHub][AMP diagnostics]", diagnostics);
}

function logSafeAmpInstanceDiagnostics(label, payload) {
  console.log(`[AnxHub][AMP ${label}]`, payload);
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

function extractSessionId(loginResult) {
  if (typeof loginResult === "string" && loginResult.length > 0) {
    return loginResult;
  }

  return findValue(loginResult, ["sessionID", "SessionID", "sessionId", "SESSIONID"]);
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

  return didLoginSucceed(loginResult, sessionId);
}

function getObjectKeys(value) {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.keys(value);
}

function hasAnyKey(value, keys) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return keys.some((key) => value[key] !== undefined && value[key] !== null);
}

function getAvailableMethodNames(target) {
  return getObjectKeys(target).filter((key) => typeof target[key] === "function").sort();
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
  return findValue(instance, ["InstanceID", "InstanceId", "InstanceIdString", "Id", "ID", "Guid", "mapKey"]);
}

function getModuleType(instance) {
  return findValue(instance, ["Module", "ModuleName", "ApplicationModule", "AppModule", "ModuleDisplayName", "Application"]) || "Unknown";
}

function getInstanceName(instance) {
  return findValue(instance, ["InstanceName", "FriendlyName", "Name", "DisplayName", "Description"]) || "AMP Instance";
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
  const number = safeNumber(value);
  if (number === null) {
    return null;
  }

  return number;
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
    findValue(merged, ["State", "Status", "ApplicationState", "DaemonState", "Running", "AppState", "InstanceState", "StateText"]) ||
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

function logInstanceDiscovery(instances) {
  logSafeAmpInstanceDiagnostics("instance discovery", {
    instanceCount: instances.length,
    instances: instances.map((instance) => ({
      name: instance.name,
      moduleType: instance.moduleType,
      instanceId: instance.id,
      state: instance.state,
    })),
  });
}

function logUnexpectedShape(label, value) {
  const unwrapped = unwrapResult(value);

  logSafeAmpInstanceDiagnostics("shape", {
    source: label,
    keys: getObjectKeys(unwrapped),
    nestedKeys: asArray(unwrapped)
      .slice(0, 3)
      .map((item) => getObjectKeys(item)),
  });
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
    } else if (!result.missing && result.errorCode) {
      logSafeAmpInstanceDiagnostics("instance detail error", {
        methodName,
        instanceId,
        errorCode: result.errorCode,
      });
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

  logSafeAmpInstanceDiagnostics("selected detail", {
    name: enriched.name,
    moduleType: enriched.moduleType,
    instanceId: enriched.id,
    state: enriched.state,
    hasPlayers: Number.isFinite(enriched.playerCount),
    hasTps: Number.isFinite(enriched.tps),
    hasCpu: Number.isFinite(enriched.cpuUsage),
    hasRam: Number.isFinite(enriched.ramUsage),
    hasPorts: enriched.ports.length > 0,
    hasUptime: Number.isFinite(enriched.uptime),
    hasVersion: Boolean(enriched.version),
  });

  return enriched;
}

async function getInstances(api) {
  const instanceMethodNames = ["GetInstancesAsync", "GetAvailableInstancesAsync", "GetInstanceListAsync", "ListInstancesAsync"];
  const instanceResults = [];

  for (const methodName of instanceMethodNames) {
    const result = await callMethodDetailed(api.ADSModule, methodName);

    if (result.ok) {
      logUnexpectedShape(`ADSModule.${methodName.replace(/Async$/, "")}`, result.value);
      instanceResults.push({ methodName, value: result.value });
    } else if (!result.missing && result.errorCode) {
      logSafeAmpInstanceDiagnostics("discovery method error", {
        methodName,
        errorCode: result.errorCode,
      });
    }
  }

  const statusesResult = await callMethodDetailed(api.ADSModule, "GetInstanceStatusesAsync");

  if (statusesResult.ok) {
    logUnexpectedShape("ADSModule.GetInstanceStatuses", statusesResult.value);
  }

  const rawInstances = dedupeInstances(instanceResults.flatMap((result) => asArray(result.value)));
  const statusRows = statusesResult.ok ? asArray(statusesResult.value) : [];
  const moduleInfoResult = await callMethodDetailed(api.Core, "GetModuleInfoAsync");
  const moduleInfoRows = moduleInfoResult.ok ? asArray(moduleInfoResult.value) : [];

  if (rawInstances.length === 0 && statusRows.length === 0 && moduleInfoRows.length === 0) {
    logSafeAmpInstanceDiagnostics("instance discovery", {
      instanceCount: 0,
      instances: [],
      availableAdsMethods: getAvailableMethodNames(api.ADSModule),
    });

    return [];
  }

  const sourceRows = rawInstances.length > 0 ? rawInstances : statusRows.length > 0 ? statusRows : moduleInfoRows;
  const normalized = [];

  for (const instance of sourceRows) {
    const status = mergeStatusRows(instance, statusRows);
    normalized.push(normalizeInstance(instance, status));
  }

  logInstanceDiscovery(normalized);
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
    });
  }

  try {
    const preflight = await preflightAmpApi(config);

    if (!preflight.ok) {
      const diagnostics = createDiagnostics(config, "preflight", preflight);
      logSafeAmpDiagnostics(diagnostics);

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
      logSafeAmpDiagnostics(diagnostics);

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
      logSafeAmpDiagnostics(diagnostics);

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
    const selectedInstance = await enrichSelectedInstance(api, selection.selected);
    const finalInstances = selectedInstance
      ? instances.map((instance) => (String(instance.id) === String(selectedInstance.id) ? selectedInstance : instance))
      : instances;
    const finalMinecraftInstances = finalInstances.filter((instance) => instance.isMinecraft);

    if (selectedInstance) {
      logSafeAmpInstanceDiagnostics("selected instance", {
        name: selectedInstance.name,
        moduleType: selectedInstance.moduleType,
        instanceId: selectedInstance.id,
        state: selectedInstance.state,
      });
    } else if (selection.minecraftInstances.length > 1) {
      logSafeAmpInstanceDiagnostics("minecraft selection", {
        selected: null,
        reason: "multiple_minecraft_instances",
        minecraftInstances: selection.minecraftInstances.map((instance) => ({
          name: instance.name,
          moduleType: instance.moduleType,
          instanceId: instance.id,
          state: instance.state,
        })),
      });
    }

    return createAmpSnapshot({
      connected: true,
      configured: true,
      status: "connected",
      message: "Connected to AMP.",
      diagnostics: createDiagnostics(config, "connected"),
      instances: finalInstances,
      selectedInstance,
      minecraftInstances: finalMinecraftInstances,
      minecraftSelectionMode: selection.mode,
    });
  } catch (error) {
    const diagnostics = createDiagnostics(config, "client_error", {
      errorCode: getSafeErrorCode(error),
    });
    logSafeAmpDiagnostics(diagnostics);

    return createAmpSnapshot({
      connected: false,
      configured: true,
      status: "error",
      message: "AMP is unavailable.",
      diagnostics,
    });
  }
}

module.exports = {
  getAmpSnapshot,
};
