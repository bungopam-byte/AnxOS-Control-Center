const localDockerService = require("./dockerService");
const localPlayitService = require("./playitService");
const agentClient = require("./agentClient");

const VALID_BACKEND_MODES = new Set(["local", "agent", "auto"]);

class AgentUnavailableError extends Error {
  constructor() {
    super("Agent unavailable. Check AGENT_URL and AGENT_TOKEN.");
    this.name = "AgentUnavailableError";
  }
}

function getBackendMode() {
  agentClient.loadEnvironment();

  const rawMode = (
    process.env.BACKEND_MODE ||
    process.env.backendMode ||
    process.env.ANXHUB_BACKEND_MODE ||
    "local"
  ).trim().toLowerCase();

  return VALID_BACKEND_MODES.has(rawMode) ? rawMode : "local";
}

async function getAgentDockerSnapshot() {
  if (!(await agentClient.isHealthy())) {
    throw new AgentUnavailableError();
  }

  try {
    return await agentClient.getDockerSnapshot();
  } catch {
    throw new AgentUnavailableError();
  }
}

async function getDockerSnapshot() {
  const backendMode = getBackendMode();

  if (backendMode === "local") {
    return localDockerService.getDockerSnapshot();
  }

  if (backendMode === "agent") {
    return getAgentDockerSnapshot();
  }

  if (await agentClient.isHealthy()) {
    try {
      return await agentClient.getDockerSnapshot();
    } catch {
      return localDockerService.getDockerSnapshot();
    }
  }

  return localDockerService.getDockerSnapshot();
}

async function getAgentPlayitSnapshot() {
  if (!(await agentClient.isHealthy())) {
    throw new AgentUnavailableError();
  }

  try {
    return await agentClient.getPlayitSnapshot();
  } catch {
    throw new AgentUnavailableError();
  }
}

async function getPlayitSnapshot() {
  const backendMode = getBackendMode();

  if (backendMode === "local") {
    return localPlayitService.getPlayitSnapshot();
  }

  if (backendMode === "agent") {
    return getAgentPlayitSnapshot();
  }

  if (await agentClient.isHealthy()) {
    try {
      return await agentClient.getPlayitSnapshot();
    } catch {
      return localPlayitService.getPlayitSnapshot();
    }
  }

  return localPlayitService.getPlayitSnapshot();
}

module.exports = {
  getBackendMode,
  getDockerSnapshot,
  getPlayitSnapshot,
};
