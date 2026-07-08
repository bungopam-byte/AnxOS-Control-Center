const localAmpService = require("./ampService");
const localDockerService = require("./dockerService");
const localPlayitService = require("./playitService");
const agentClient = require("./agentClient");
const { getNode, getNodeAgentConfig, getSelectedNodeId } = require("./nodeService");

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

function createDockerUnavailableSnapshot(message = "Docker is unavailable for this node.") {
  return {
    installed: false,
    daemonRunning: false,
    dockerVersion: null,
    version: null,
    message,
    containers: [],
    images: 0,
    imageCount: 0,
    volumeCount: 0,
    summary: {
      installed: false,
      daemonRunning: false,
      runningContainers: 0,
      stoppedContainers: 0,
      totalContainers: 0,
      images: 0,
      volumes: 0,
    },
    lastCheckedAt: new Date().toISOString(),
  };
}

function isDockerDisabledForNode(options = {}) {
  const selectedNodeId = options?.nodeId || "";
  if (!selectedNodeId || selectedNodeId === "default") {
    return false;
  }
  try {
    return getNode(selectedNodeId)?.docker?.enabled === false;
  } catch {
    return false;
  }
}

function assertDockerEnabledForNode(options = {}) {
  if (isDockerDisabledForNode(options)) {
    const error = new Error("Docker is disabled for this node.");
    error.code = "DOCKER_DISABLED_FOR_NODE";
    error.statusCode = 503;
    throw error;
  }
}

async function getDockerSnapshot(options = {}) {
  if (isDockerDisabledForNode(options)) {
    return createDockerUnavailableSnapshot("Docker is disabled for this node.");
  }

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
  assertDockerEnabledForNode(payload);
  if (shouldUseLocalDocker(payload)) {
    return localDockerService.createContainer(payload);
  }
  return agentClient.createDockerContainer(payload, getOptionalNodeConfig(payload));
}

async function startDockerContainer(container, options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.startContainer(container);
  }
  return agentClient.startDockerContainer(container, getOptionalNodeConfig(options));
}

async function stopDockerContainer(container, options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.stopContainer(container);
  }
  return agentClient.stopDockerContainer(container, getOptionalNodeConfig(options));
}

async function restartDockerContainer(container, options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.restartContainer(container);
  }
  return agentClient.restartDockerContainer(container, getOptionalNodeConfig(options));
}

async function deleteDockerContainer(container, options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.deleteContainer(container);
  }
  return agentClient.deleteDockerContainer(container, getOptionalNodeConfig(options));
}

async function getDockerContainerLogs(container, options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.getContainerLogs(container, options);
  }
  return agentClient.getDockerContainerLogs(container, options, getOptionalNodeConfig(options));
}

async function getDockerContainerStats(container, options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.getContainerStats(container);
  }
  return agentClient.getDockerContainerStats(container, getOptionalNodeConfig(options));
}

function shouldUseLocalDocker(options = {}) {
  const selectedNodeId = options?.nodeId || "";
  return getBackendMode() === "local" && (!selectedNodeId || selectedNodeId === "default");
}

async function listDockerContainers(options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.getDockerContainers();
  }
  return agentClient.getDockerContainers(getOptionalNodeConfig(options));
}

async function inspectDockerContainer(container, options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.inspectContainer(container);
  }
  return agentClient.inspectDockerContainer(container, getOptionalNodeConfig(options));
}

async function listDockerImages(options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.listImages();
  }
  return agentClient.listDockerImages(getOptionalNodeConfig(options));
}

async function deleteDockerImage(image, options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.removeImage(image);
  }
  return agentClient.deleteDockerImage(image, getOptionalNodeConfig(options));
}

async function listDockerNetworks(options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.listNetworks();
  }
  return agentClient.listDockerNetworks(getOptionalNodeConfig(options));
}

async function listDockerVolumes(options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService.listVolumes();
  }
  return agentClient.listDockerVolumes(getOptionalNodeConfig(options));
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
  const nodeId = options?.nodeId || getSelectedNodeId();
  return nodeId && nodeId !== "default" ? getNodeAgentConfig(nodeId) : null;
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

async function getInstanceStatus(instanceId, options = {}) {
  return agentClient.getInstanceStatus(instanceId, getOptionalNodeConfig(options));
}

async function getInstanceMetrics(instanceId, options = {}) {
  return agentClient.getInstanceMetrics(instanceId, getOptionalNodeConfig(options));
}

async function getInstanceLogs(instanceId, options) {
  return agentClient.getInstanceLogs(instanceId, options, getOptionalNodeConfig(options));
}

async function clearInstanceLogs(instanceId, options) {
  return agentClient.clearInstanceLogs(instanceId, options, getOptionalNodeConfig(options));
}

async function sendInstanceCommand(instanceId, command, options = {}) {
  return agentClient.sendInstanceCommand(instanceId, command, getOptionalNodeConfig(options));
}

async function forceKillInstance(instanceId, options = {}) {
  return agentClient.forceKillInstance(instanceId, getOptionalNodeConfig(options));
}

async function listInstanceFiles(instanceId, currentPath, options = {}) {
  return agentClient.listInstanceFiles(instanceId, currentPath, getOptionalNodeConfig(options));
}

async function readInstanceFile(instanceId, filePath, options = {}) {
  return agentClient.readInstanceFile(instanceId, filePath, getOptionalNodeConfig(options));
}

async function writeInstanceFile(instanceId, filePath, content, options = {}) {
  return agentClient.writeInstanceFile(instanceId, filePath, content, options, getOptionalNodeConfig(options));
}

async function deleteInstanceFile(instanceId, filePath, options = {}) {
  return agentClient.deleteInstanceFile(instanceId, filePath, getOptionalNodeConfig(options));
}

async function createInstanceFolder(instanceId, folderPath, options = {}) {
  return agentClient.createInstanceFolder(instanceId, folderPath, getOptionalNodeConfig(options));
}

async function renameInstanceFile(instanceId, oldPath, newPath, options = {}) {
  return agentClient.renameInstanceFile(instanceId, oldPath, newPath, getOptionalNodeConfig(options));
}

async function getMinecraftProperties(instanceId, options = {}) {
  return agentClient.getMinecraftProperties(instanceId, getOptionalNodeConfig(options));
}

async function saveMinecraftProperties(instanceId, properties, options = {}) {
  return agentClient.saveMinecraftProperties(instanceId, properties, getOptionalNodeConfig(options));
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
  deleteDockerImage,
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
  inspectDockerContainer,
  getInstanceLogs,
  getInstanceMetrics,
  getInstanceStatus,
  getMinecraftProperties,
  getPlayitSnapshot,
  importBackup,
  listDockerContainers,
  listDockerImages,
  listDockerNetworks,
  listDockerVolumes,
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
