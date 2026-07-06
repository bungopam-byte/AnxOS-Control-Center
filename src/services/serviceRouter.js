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

  try {
    return await agentClient.getDockerSnapshot();
  } catch {
    return localDockerService.getDockerSnapshot();
  }
}

async function getAgentPlayitSnapshot() {
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

  try {
    return await agentClient.getPlayitSnapshot();
  } catch {
    return localPlayitService.getPlayitSnapshot();
  }
}

async function getAgentAmpSnapshot() {
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

  try {
    return await agentClient.getAmpSnapshot();
  } catch {
    return localAmpService.getAmpSnapshot();
  }
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

async function listInstances() {
  try {
    return await agentClient.listInstances();
  } catch {
    throw new AgentUnavailableError();
  }
}

async function createInstance(payload) {
  return agentClient.createInstance(payload);
}

async function updateInstance(instanceId, payload) {
  return agentClient.updateInstance(instanceId, payload);
}

async function getInstanceStatus(instanceId) {
  return agentClient.getInstanceStatus(instanceId);
}

async function getInstanceMetrics(instanceId) {
  return agentClient.getInstanceMetrics(instanceId);
}

async function getInstanceLogs(instanceId, options) {
  return agentClient.getInstanceLogs(instanceId, options);
}

async function clearInstanceLogs(instanceId, options) {
  return agentClient.clearInstanceLogs(instanceId, options);
}

async function sendInstanceCommand(instanceId, command) {
  return agentClient.sendInstanceCommand(instanceId, command);
}

async function forceKillInstance(instanceId) {
  return agentClient.forceKillInstance(instanceId);
}

async function listInstanceFiles(instanceId, currentPath) {
  return agentClient.listInstanceFiles(instanceId, currentPath);
}

async function readInstanceFile(instanceId, filePath) {
  return agentClient.readInstanceFile(instanceId, filePath);
}

async function writeInstanceFile(instanceId, filePath, content, options = {}) {
  return agentClient.writeInstanceFile(instanceId, filePath, content, options);
}

async function deleteInstanceFile(instanceId, filePath) {
  return agentClient.deleteInstanceFile(instanceId, filePath);
}

async function createInstanceFolder(instanceId, folderPath) {
  return agentClient.createInstanceFolder(instanceId, folderPath);
}

async function renameInstanceFile(instanceId, oldPath, newPath) {
  return agentClient.renameInstanceFile(instanceId, oldPath, newPath);
}

async function getMinecraftProperties(instanceId) {
  return agentClient.getMinecraftProperties(instanceId);
}

async function saveMinecraftProperties(instanceId, properties) {
  return agentClient.saveMinecraftProperties(instanceId, properties);
}

async function startInstance(instanceId) {
  return agentClient.startInstance(instanceId);
}

async function stopInstance(instanceId) {
  return agentClient.stopInstance(instanceId);
}

async function restartInstance(instanceId) {
  return agentClient.restartInstance(instanceId);
}

async function deleteInstance(instanceId) {
  return agentClient.deleteInstance(instanceId);
}

module.exports = {
  clearInstanceLogs,
  createInstance,
  createInstanceFolder,
  deleteInstance,
  deleteInstanceFile,
  forceKillInstance,
  getAmpSnapshot,
  getBackendMode,
  getDockerSnapshot,
  getFileListing,
  getInstanceLogs,
  getInstanceMetrics,
  getInstanceStatus,
  getMinecraftProperties,
  getPlayitSnapshot,
  listInstanceFiles,
  listInstances,
  readInstanceFile,
  renameInstanceFile,
  restartInstance,
  saveMinecraftProperties,
  sendInstanceCommand,
  startInstance,
  stopInstance,
  updateInstance,
  writeInstanceFile,
};
