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

module.exports = {
  AgentClientError,
  getAgentConfig,
  getDockerContainers,
  getDockerSnapshot,
  getDockerSummary,
  getHealth,
  isHealthy,
  loadEnvironment,
};
