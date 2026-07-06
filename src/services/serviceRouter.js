const localAmpService = require("./ampService");
const localDockerService = require("./dockerService");
const localPlayitService = require("./playitService");
const agentClient = require("./agentClient");
const { getNodeAgentConfig } = require("./nodeService");

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

async function getAgentDockerSnapshot(options = {}) {
  try {
    return await agentClient.getDockerSnapshot(getOptionalNodeConfig(options));
  } catch {
    throw new AgentUnavailableError();
  }
}

async function getDockerSnapshot(options = {}) {
  const backendMode = getBackendMode();
  const selectedNodeId = options?.nodeId || "";

  if (backendMode === "local" && (!selectedNodeId || selectedNodeId === "default")) {
    return localDockerService.getDockerSnapshot();
  }

  if (backendMode === "agent") {
    return getAgentDockerSnapshot(options);
  }

  try {
    return await agentClient.getDockerSnapshot(getOptionalNodeConfig(options));
  } catch {
    return localDockerService.getDockerSnapshot();
  }
}

async function createDockerContainer(payload = {}) {
  return agentClient.createDockerContainer(payload, getOptionalNodeConfig(payload));
}

async function startDockerContainer(container, options = {}) {
  return agentClient.startDockerContainer(container, getOptionalNodeConfig(options));
}

async function stopDockerContainer(container, options = {}) {
  return agentClient.stopDockerContainer(container, getOptionalNodeConfig(options));
}

async function restartDockerContainer(container, options = {}) {
  return agentClient.restartDockerContainer(container, getOptionalNodeConfig(options));
}

async function deleteDockerContainer(container, options = {}) {
  return agentClient.deleteDockerContainer(container, getOptionalNodeConfig(options));
}

async function getDockerContainerLogs(container, options = {}) {
  return agentClient.getDockerContainerLogs(container, options, getOptionalNodeConfig(options));
}

async function getDockerContainerStats(container, options = {}) {
  return agentClient.getDockerContainerStats(container, getOptionalNodeConfig(options));
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

function getOptionalNodeConfig(options = {}) {
  return options?.nodeId && options.nodeId !== "default" ? getNodeAgentConfig(options.nodeId) : null;
}

async function listInstances(options = {}) {
  try {
    return await agentClient.listInstances(getOptionalNodeConfig(options));
  } catch {
    throw new AgentUnavailableError();
  }
}

async function createInstance(payload) {
  return agentClient.createInstance(payload, getOptionalNodeConfig(payload));
}

async function updateInstance(instanceId, payload, options = {}) {
  return agentClient.updateInstance(instanceId, payload, getOptionalNodeConfig(options));
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

async function startInstance(instanceId, options = {}) {
  return agentClient.startInstance(instanceId, getOptionalNodeConfig(options));
}

async function stopInstance(instanceId, options = {}) {
  return agentClient.stopInstance(instanceId, getOptionalNodeConfig(options));
}

async function restartInstance(instanceId, options = {}) {
  return agentClient.restartInstance(instanceId, getOptionalNodeConfig(options));
}

async function deleteInstance(instanceId, options = {}) {
  return agentClient.deleteInstance(instanceId, getOptionalNodeConfig(options));
}

async function listBackups(options = {}) {
  return agentClient.listBackups(options);
}

async function createBackup(payload = {}) {
  return agentClient.createBackup(payload);
}

async function restoreBackup(payload = {}) {
  return agentClient.restoreBackup(payload);
}

async function deleteBackup(backupId) {
  return agentClient.deleteBackup(backupId);
}

async function downloadBackup(backupId) {
  return agentClient.downloadBackup(backupId);
}

async function importBackup(payload = {}) {
  return agentClient.importBackup(payload);
}

async function listBackupSchedules() {
  return agentClient.listBackupSchedules();
}

async function saveBackupSchedule(payload = {}) {
  return agentClient.saveBackupSchedule(payload);
}

async function deleteBackupSchedule(instanceId) {
  return agentClient.deleteBackupSchedule(instanceId);
}

module.exports = {
  clearInstanceLogs,
  createBackup,
  createDockerContainer,
  createInstance,
  createInstanceFolder,
  deleteBackup,
  deleteBackupSchedule,
  deleteDockerContainer,
  deleteInstance,
  deleteInstanceFile,
  downloadBackup,
  forceKillInstance,
  getAmpSnapshot,
  getBackendMode,
  getDockerSnapshot,
  getDockerContainerLogs,
  getDockerContainerStats,
  getFileListing,
  getInstanceLogs,
  getInstanceMetrics,
  getInstanceStatus,
  getMinecraftProperties,
  getPlayitSnapshot,
  importBackup,
  listBackupSchedules,
  listBackups,
  listInstanceFiles,
  listInstances,
  readInstanceFile,
  renameInstanceFile,
  restartInstance,
  restartDockerContainer,
  restoreBackup,
  saveMinecraftProperties,
  saveBackupSchedule,
  sendInstanceCommand,
  startInstance,
  startDockerContainer,
  stopInstance,
  stopDockerContainer,
  updateInstance,
  writeInstanceFile,
};
