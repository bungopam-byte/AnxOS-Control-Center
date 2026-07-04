const path = require("path");
const dotenv = require("dotenv");
const { AMPAPI } = require("@cubecoders/ampapi");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env"), quiet: true });

const REQUIRED_ENV = ["AMP_URL", "AMP_USERNAME", "AMP_PASSWORD"];
const AMP_TIMEOUT_MS = 4500;
const SAFE_ERROR_FIELDS = ["code", "errno", "syscall"];

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

function logSafeAmpDiagnostics(diagnostics) {
  console.log("[AnxHub][AMP diagnostics]", diagnostics);
}

function safeNumber(value) {
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
  const method = target?.[methodName];

  if (typeof method !== "function") {
    return null;
  }

  try {
    return await withTimeout(method(...args), AMP_TIMEOUT_MS);
  } catch {
    return null;
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

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value.result)) {
    return value.result;
  }

  if (Array.isArray(value.Instances)) {
    return value.Instances;
  }

  return Object.values(value).filter((item) => item && typeof item === "object");
}

function normalizeInstance(instance, status) {
  const merged = { ...(instance || {}), ...(status || {}) };
  const name = findValue(merged, ["InstanceName", "FriendlyName", "Name", "DisplayName"]) || "AMP Instance";
  const state = findValue(merged, ["State", "Status", "ApplicationState", "DaemonState", "Running"]) || "Unknown";
  const players = findValue(merged, ["Players", "PlayerCount", "CurrentPlayers", "ActiveUsers"]);
  const maxPlayers = findValue(merged, ["MaxPlayers", "MaximumPlayers"]);
  const memory = findValue(merged, ["MemoryUsageMB", "MemoryMB", "MemoryUsage", "RAMUsage", "UsedMemory"]);

  return {
    id: findValue(merged, ["InstanceID", "Id", "ID", "InstanceId"]) || name,
    name,
    state,
    playerCount: safeNumber(players),
    maxPlayers: safeNumber(maxPlayers),
    tps: safeNumber(findValue(merged, ["TPS", "TicksPerSecond"])),
    cpuUsage: normalizePercent(findValue(merged, ["CPUUsage", "CpuUsage", "CPU", "ProcessorUsage"])),
    ramUsage: safeNumber(memory),
  };
}

async function getInstances(api) {
  const instances =
    (await callMethod(api.ADSModule, "GetInstancesAsync")) ||
    (await callMethod(api.ADSModule, "GetInstanceStatusesAsync")) ||
    [];
  const statuses = (await callMethod(api.ADSModule, "GetInstanceStatusesAsync")) || [];
  const statusRows = asArray(statuses);

  return asArray(instances).map((instance) => {
    const id = findValue(instance, ["InstanceID", "Id", "ID", "InstanceId"]);
    const matchingStatus = statusRows.find((status) => {
      const statusId = findValue(status, ["InstanceID", "Id", "ID", "InstanceId"]);
      return id && statusId && String(id) === String(statusId);
    });

    return normalizeInstance(instance, matchingStatus);
  });
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

  const primary = instances[0];
  const playerCount = instances.reduce((total, instance) => total + (instance.playerCount || 0), 0);
  const cpuValues = instances.map((instance) => instance.cpuUsage).filter(Number.isFinite);
  const ramValues = instances.map((instance) => instance.ramUsage).filter(Number.isFinite);
  const tpsValues = instances.map((instance) => instance.tps).filter(Number.isFinite);

  return {
    state: primary.state,
    playerCount,
    tps: tpsValues.length > 0 ? tpsValues[0] : null,
    cpuUsage: cpuValues.length > 0 ? cpuValues.reduce((sum, value) => sum + value, 0) : null,
    ramUsage: ramValues.length > 0 ? ramValues.reduce((sum, value) => sum + value, 0) : null,
  };
}

async function getAmpSnapshot() {
  const config = getConfig();

  if (!config.configured) {
    return {
      connected: false,
      configured: false,
      status: "unconfigured",
      message: `Missing ${config.missing.join(", ")}`,
      instances: [],
      summary: summarizeInstances([]),
    };
  }

  try {
    const preflight = await preflightAmpApi(config);

    if (!preflight.ok) {
      const diagnostics = createDiagnostics(config, "preflight", preflight);
      logSafeAmpDiagnostics(diagnostics);

      return {
        connected: false,
        configured: true,
        status: "unreachable",
        message: "AMP API is unreachable.",
        diagnostics,
        instances: [],
        summary: summarizeInstances([]),
      };
    }

    const api = new AMPAPI(config.url);
    const initialized = await withTimeout(api.initAsync(), AMP_TIMEOUT_MS);

    if (!initialized) {
      const diagnostics = createDiagnostics(config, "api_spec");
      logSafeAmpDiagnostics(diagnostics);

      return {
        connected: false,
        configured: true,
        status: "unreachable",
        message: "AMP API spec is unavailable.",
        diagnostics,
        instances: [],
        summary: summarizeInstances([]),
      };
    }

    const authenticated = await authenticate(api, config);

    if (!authenticated) {
      const diagnostics = createDiagnostics(config, "login");
      logSafeAmpDiagnostics(diagnostics);

      return {
        connected: false,
        configured: true,
        status: "auth_failed",
        message: "AMP authentication failed.",
        diagnostics,
        instances: [],
        summary: summarizeInstances([]),
      };
    }

    const instances = await getInstances(api);

    return {
      connected: true,
      configured: true,
      status: "connected",
      message: "Connected to AMP.",
      diagnostics: createDiagnostics(config, "connected"),
      instances,
      summary: summarizeInstances(instances),
    };
  } catch (error) {
    const diagnostics = createDiagnostics(config, "client_error", {
      errorCode: getSafeErrorCode(error),
    });
    logSafeAmpDiagnostics(diagnostics);

    return {
      connected: false,
      configured: true,
      status: "error",
      message: "AMP is unavailable.",
      diagnostics,
      instances: [],
      summary: summarizeInstances([]),
    };
  }
}

module.exports = {
  getAmpSnapshot,
};
