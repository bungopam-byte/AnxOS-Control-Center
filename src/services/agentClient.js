const path = require("path");
const dotenv = require("dotenv");

const DEFAULT_AGENT_URL = "http://127.0.0.1:47131";
const REQUEST_TIMEOUT_MS = 3500;

let environmentLoaded = false;

class AgentClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AgentClientError";
    this.status = details.status || null;
    this.code = details.code || null;
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

function getAgentConfig() {
  loadEnvironment();

  return {
    url: trimValue(process.env.AGENT_URL) || DEFAULT_AGENT_URL,
    token: trimValue(process.env.AGENT_TOKEN) || null,
  };
}

function buildAgentUrl(pathname) {
  const config = getAgentConfig();
  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  return new URL(pathname, baseUrl).toString();
}

async function requestJson(pathname) {
  const config = getAgentConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      Accept: "application/json",
    };

    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    const response = await fetch(buildAgentUrl(pathname), {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      throw new AgentClientError(`Agent request failed with HTTP ${response.status}.`, {
        status: response.status,
        code: "AGENT_HTTP_ERROR",
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof AgentClientError) {
      throw error;
    }

    throw new AgentClientError("Agent unavailable.", {
      code: error?.name === "AbortError" ? "AGENT_TIMEOUT" : "AGENT_UNAVAILABLE",
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

async function getHealth() {
  return requestJson("/api/v1/health");
}

async function isHealthy() {
  try {
    return isHealthyPayload(await getHealth());
  } catch {
    return false;
  }
}

async function getDockerSummary() {
  return requestJson("/api/v1/docker/summary");
}

async function getDockerContainers() {
  return requestJson("/api/v1/docker/containers");
}

async function getDockerSnapshot() {
  const [summaryPayload, containersPayload] = await Promise.all([
    getDockerSummary(),
    getDockerContainers(),
  ]);
  const containers = normalizeContainers(containersPayload);

  return {
    ...normalizeSummary(summaryPayload, containers),
    containers,
  };
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
    connected: candidate.connected ?? false,
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
  return normalizePlayitSnapshot(await getPlayitStatus());
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
  const unwrapped = unwrapPayload(payload, "summary");
  return unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)
    ? unwrapped
    : payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
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
  const status = statusCandidate.status || (connected ? "connected" : "unreachable");
  const message = statusCandidate.message || getAmpStatusMessage(status, connected);
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
    statusCandidate.summary || statusCandidate,
    selectedInstance,
    statusCandidate.minecraftSelectionMode || selection.mode,
  );
  const connection = statusCandidate.connection && typeof statusCandidate.connection === "object"
    ? {
        ...statusCandidate.connection,
        status: statusCandidate.connection.status || status,
        label: statusCandidate.connection.label || getAmpConnectionLabel(status),
        message: statusCandidate.connection.message || message,
      }
    : {
        status,
        label: getAmpConnectionLabel(status),
        message,
        connected: status === "connected",
        unreachable: status === "unreachable" || status === "error",
        authFailed: status === "auth_failed",
        diagnostics,
      };

  return {
    connected: connected || status === "connected",
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
  const [statusPayload, instancesPayload] = await Promise.all([
    getAmpStatus(),
    getAmpInstances(),
  ]);

  return normalizeAmpSnapshot(statusPayload, instancesPayload);
}

module.exports = {
  AgentClientError,
  getAmpInstances,
  getAmpSnapshot,
  getAmpStatus,
  getAgentConfig,
  getDockerContainers,
  getDockerSnapshot,
  getDockerSummary,
  getHealth,
  getPlayitSnapshot,
  getPlayitStatus,
  isHealthy,
  loadEnvironment,
};
