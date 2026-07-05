const localAmpService = require("./ampService");
const localDockerService = require("./dockerService");
const localPlayitService = require("./playitService");
const agentClient = require("./agentClient");

class AgentUnavailableError extends Error {
  constructor() {
    super("Agent unavailable. Check Agent settings.");
    this.name = "AgentUnavailableError";
  }
}

function createUnavailableFileListing(message = "File service unavailable.") {
  return {
    configured: false,
    connected: false,
    status: "unavailable",
    message,
    currentPath: null,
    roots: [],
    breadcrumbs: [],
    entries: [],
    summary: {
      directoryCount: 0,
      fileCount: 0,
      totalCount: 0,
    },
    lastCheckedAt: new Date().toISOString(),
    diagnostics: {
      local: {
        implemented: false,
      },
    },
  };
}

function getBackendMode() {
  return agentClient.getBackendMode();
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

async function getAgentAmpSnapshot() {
  if (!(await agentClient.isHealthy())) {
    throw new AgentUnavailableError();
  }

  try {
    return await agentClient.getAmpSnapshot();
  } catch {
    throw new AgentUnavailableError();
  }
}

async function getAmpSnapshot() {
  const backendMode = getBackendMode();

  if (backendMode === "local") {
    return localAmpService.getAmpSnapshot();
  }

  if (backendMode === "agent") {
    return getAgentAmpSnapshot();
  }

  if (await agentClient.isHealthy()) {
    try {
      return await agentClient.getAmpSnapshot();
    } catch {
      return localAmpService.getAmpSnapshot();
    }
  }

  return localAmpService.getAmpSnapshot();
}

async function getAgentFileListing() {
  if (!(await agentClient.isHealthy())) {
    throw new AgentUnavailableError();
  }

  try {
    return await agentClient.getFileListing();
  } catch {
    throw new AgentUnavailableError();
  }
}

async function getFileListing() {
  const backendMode = getBackendMode();

  if (backendMode === "local") {
    return createUnavailableFileListing("Local file service is not implemented.");
  }

  if (backendMode === "agent") {
    return getAgentFileListing();
  }

  if (await agentClient.isHealthy()) {
    try {
      return await agentClient.getFileListing();
    } catch {
      return createUnavailableFileListing("Agent file service unavailable. Local file service is not implemented.");
    }
  }

  return createUnavailableFileListing("Local file service is not implemented.");
}

module.exports = {
  getAmpSnapshot,
  getBackendMode,
  getDockerSnapshot,
  getFileListing,
  getPlayitSnapshot,
};
