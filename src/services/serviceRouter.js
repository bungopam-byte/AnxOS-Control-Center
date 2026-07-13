const localAmpService = require("./ampService");
const localDockerService = require("./dockerService");
const localPlayitService = require("./playitService");
const localInstanceService = require("./localInstanceService");
const agentClient = require("./agentClient");
const { getExecutionTarget, getNode, getSelectedNodeId } = require("./nodeService");
const diagnostics = require("./diagnosticsService");
const {
  clearForgottenInstance,
  filterForgottenInstances,
  rememberForgottenInstance,
} = require("./instanceForgetService");
const fs = require("fs");
const path = require("path");
const { resolveTemplateDependencyIds } = require("../shared/marketplaceDependencies");

const MARKETPLACE_TEMPLATE_PATH = path.join(__dirname, "..", "..", "config", "marketplace-templates.json");
let marketplaceTemplateCache = null;

class AgentUnavailableError extends Error {
  constructor() {
    super("Agent unavailable. Check Agent settings.");
    this.name = "AgentUnavailableError";
    this.code = "AGENT_UNAVAILABLE";
    this.statusCode = 503;
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

async function getAgentDockerSnapshot(options = {}) {
  try {
    return await agentClient.getDockerSnapshot(getOptionalNodeConfig(options));
  } catch (error) {
    diagnostics.log("warn", "docker", "agent-snapshot-failed", "Remote Docker snapshot request failed", {
      nodeId: options?.nodeId || getSelectedNodeId(),
      stage: "agent-request",
      errorCode: error?.code || error?.payload?.error?.code || "DOCKER_AGENT_REQUEST_FAILED",
      endpointCategory: "agent",
    }, { file: "docker" });
    throw error;
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

function loadMarketplaceTemplatesForDependencies() {
  if (marketplaceTemplateCache) {
    return marketplaceTemplateCache;
  }
  try {
    marketplaceTemplateCache = JSON.parse(fs.readFileSync(MARKETPLACE_TEMPLATE_PATH, "utf8"));
  } catch {
    marketplaceTemplateCache = [];
  }
  return marketplaceTemplateCache;
}

function findMarketplaceTemplateById(templateId) {
  const id = String(templateId || "").trim();
  if (!id) return null;
  return loadMarketplaceTemplatesForDependencies().find((template) => template?.id === id) || null;
}

async function ensureInstanceDependenciesBeforeStart(instanceId, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return;
  }
  const status = await agentClient.getInstanceStatus(instanceId, getOptionalNodeConfig(options)).catch(() => null);
  const instance = status?.instance || status;
  const template = findMarketplaceTemplateById(instance?.templateId);
  const dependencyIds = template ? resolveTemplateDependencyIds(template) : [];
  if (dependencyIds.length === 0) {
    return;
  }
  const check = await agentClient.checkDependencies({ dependencyIds }, getOptionalNodeConfig(options));
  if (check.ok) {
    return;
  }
  if (options.autoInstallDependencies === true) {
    await agentClient.installDependencies({ dependencyIds: check.missingDependencyIds || dependencyIds }, getOptionalNodeConfig(options));
    const recheck = await agentClient.checkDependencies({ dependencyIds }, getOptionalNodeConfig(options));
    if (recheck.ok) {
      return;
    }
  }
  const error = new Error("This instance requires node dependencies before it can start.");
  error.code = "DEPENDENCIES_REQUIRED";
  error.details = {
    instanceId,
    templateId: instance?.templateId || null,
    dependencyIds,
    dependencies: check.dependencies,
    missingDependencies: check.dependencies?.filter((dependency) => !dependency.installed || dependency.state === "update-required") || [],
  };
  throw error;
}

async function getDockerSnapshot(options = {}) {
  if (isDockerDisabledForNode(options)) {
    return createDockerUnavailableSnapshot("Docker is disabled for this node.");
  }

  if (isApplicationHostTarget(options)) {
    return localDockerService.getDockerSnapshot();
  }
  return getAgentDockerSnapshot(options);
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
  return isApplicationHostTarget(options);
}

function shouldUseLocalInstances(options = {}) {
  return isApplicationHostTarget(options);
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

async function routeDockerOperation(localMethod, agentMethod, args = [], options = {}) {
  assertDockerEnabledForNode(options);
  if (shouldUseLocalDocker(options)) {
    return localDockerService[localMethod](...args);
  }
  return agentClient[agentMethod](...args, getOptionalNodeConfig(options));
}

async function pullDockerImage(image, options = {}) { return routeDockerOperation("pullImage", "pullDockerImage", [image], options); }
async function inspectDockerImage(image, options = {}) { return routeDockerOperation("inspectImage", "inspectDockerImage", [image], options); }
async function pruneDockerImages(options = {}) { return routeDockerOperation("pruneImages", "pruneDockerImages", [], options); }
async function pauseDockerContainer(container, options = {}) { return routeDockerOperation("pauseContainer", "pauseDockerContainer", [container], options); }
async function unpauseDockerContainer(container, options = {}) { return routeDockerOperation("unpauseContainer", "unpauseDockerContainer", [container], options); }
async function killDockerContainer(container, options = {}) { return routeDockerOperation("killContainer", "killDockerContainer", [container], options); }
async function renameDockerContainer(container, name, options = {}) { return routeDockerOperation("renameContainer", "renameDockerContainer", [container, name], options); }
async function execDockerContainer(container, payload = {}, options = {}) { return routeDockerOperation("execContainer", "execDockerContainer", [container, payload], options); }
async function inspectDockerVolume(volume, options = {}) { return routeDockerOperation("inspectVolume", "inspectDockerVolume", [volume], options); }
async function removeDockerVolume(volume, options = {}) { return routeDockerOperation("removeVolume", "removeDockerVolume", [volume], options); }
async function pruneDockerVolumes(options = {}) { return routeDockerOperation("pruneVolumes", "pruneDockerVolumes", [], options); }
async function inspectDockerNetwork(network, options = {}) { return routeDockerOperation("inspectNetwork", "inspectDockerNetwork", [network], options); }
async function createDockerNetwork(payload = {}) { return routeDockerOperation("createNetwork", "createDockerNetwork", [payload], payload); }
async function removeDockerNetwork(network, options = {}) { return routeDockerOperation("removeNetwork", "removeDockerNetwork", [network], options); }
async function connectDockerNetwork(network, container, options = {}) { return routeDockerOperation("connectNetwork", "connectDockerNetwork", [network, container], options); }
async function disconnectDockerNetwork(network, container, options = {}) { return routeDockerOperation("disconnectNetwork", "disconnectDockerNetwork", [network, container], options); }
async function pruneDockerNetworks(options = {}) { return routeDockerOperation("pruneNetworks", "pruneDockerNetworks", [], options); }
async function listDockerComposeProjects(options = {}) { return routeDockerOperation("listComposeProjects", "listDockerComposeProjects", [], options); }
async function dockerComposeAction(action, payload = {}) {
  assertDockerEnabledForNode(payload);
  if (shouldUseLocalDocker(payload)) {
    const map = {
      config: "validateComposeConfig",
      up: "startComposeProject",
      stop: "stopComposeProject",
      restart: "restartComposeProject",
      pull: "pullComposeProject",
      build: "buildComposeProject",
      recreate: "recreateComposeProject",
      logs: "getComposeLogs",
      status: "getComposeStatus",
      down: "removeComposeProject",
    };
    if (!map[action]) throw Object.assign(new Error("Invalid Compose action."), { code: "INVALID_COMPOSE_ACTION" });
    return localDockerService[map[action]](payload);
  }
  return agentClient.dockerComposeAction(action, payload, getOptionalNodeConfig(payload));
}
async function getDockerCleanupPreview(options = {}) { return routeDockerOperation("getCleanupPreview", "getDockerCleanupPreview", [], options); }
async function runDockerCleanup(payload = {}) { return routeDockerOperation("runCleanup", "runDockerCleanup", [payload], payload); }

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

async function getAgentPlayitSnapshot(options = {}) {
  try {
    return await agentClient.getPlayitSnapshot(getOptionalNodeConfig(options));
  } catch {
    throw new AgentUnavailableError();
  }
}

async function getPlayitSnapshot(options = {}) {
  return isApplicationHostTarget(options) ? localPlayitService.getPlayitSnapshot() : getAgentPlayitSnapshot(options);
}

async function getAgentAmpSnapshot(options = {}) {
  try {
    return await agentClient.getAmpSnapshot(getOptionalNodeConfig(options));
  } catch {
    throw new AgentUnavailableError();
  }
}

async function getAmpSnapshot(options = {}) {
  return isApplicationHostTarget(options) ? localAmpService.getAmpSnapshot() : getAgentAmpSnapshot(options);
}

async function getAgentFileListing(options = {}) {
  const config = getOptionalNodeConfig(options);
  if (!(await agentClient.isHealthy(config))) {
    throw new AgentUnavailableError();
  }

  try {
    return await agentClient.getFileListing(".", config);
  } catch {
    throw new AgentUnavailableError();
  }
}

async function getFileListing(options = {}) {
  return isApplicationHostTarget(options)
    ? createUnavailableFileListing("Use the renderer-local filesystem provider for the application host.")
    : getAgentFileListing(options);
}

function getOptionalNodeConfig(options = {}) {
  const nodeId = options?.nodeId || getSelectedNodeId();
  const target = getExecutionTarget(nodeId);
  return target.type === "agent" ? target.config : null;
}

function isApplicationHostTarget(options = {}) {
  return getExecutionTarget(options?.nodeId || getSelectedNodeId()).type === "application-host";
}

async function listInstances(options = {}) {
  const nodeId = options?.nodeId || getSelectedNodeId();
  if (shouldUseLocalInstances(options)) {
    return filterForgottenInstances(await localInstanceService.listInstances(), nodeId);
  }
  try {
    return filterForgottenInstances(await agentClient.listInstances(getOptionalNodeConfig(options)), nodeId);
  } catch (error) {
    diagnostics.log("warn", "instances", "list-failed", "Instance list request failed.", {
      nodeId,
      errorCode: error?.code || error?.payload?.error?.code || "INSTANCE_LIST_FAILED",
    }, { file: "instances" });
    throw new AgentUnavailableError();
  }
}

async function createInstance(payload) {
  const nodeId = payload?.nodeId || getSelectedNodeId();
  const result = shouldUseLocalInstances(payload)
    ? await localInstanceService.createInstance(payload)
    : await agentClient.createInstance(payload, getOptionalNodeConfig(payload));
  clearForgottenInstance(nodeId, result?.id || result?.instance?.id || payload?.id);
  return result;
}

async function updateInstance(instanceId, payload, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.updateInstance(instanceId, payload);
  }
  return agentClient.updateInstance(instanceId, payload, getOptionalNodeConfig(options));
}

async function getInstanceStatus(instanceId, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.getStatus(instanceId);
  }
  return agentClient.getInstanceStatus(instanceId, getOptionalNodeConfig(options));
}

async function getInstanceMetrics(instanceId, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.getMetrics(instanceId);
  }
  return agentClient.getInstanceMetrics(instanceId, getOptionalNodeConfig(options));
}

async function getInstanceLogs(instanceId, options) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.readLogs(instanceId, options);
  }
  return agentClient.getInstanceLogs(instanceId, options, getOptionalNodeConfig(options));
}

async function clearInstanceLogs(instanceId, options) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.clearLogs(instanceId, options);
  }
  return agentClient.clearInstanceLogs(instanceId, options, getOptionalNodeConfig(options));
}

async function sendInstanceCommand(instanceId, command, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.writeInstanceInput(instanceId, command);
  }
  return agentClient.sendInstanceCommand(instanceId, command, getOptionalNodeConfig(options));
}

async function forceKillInstance(instanceId, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.forceKillInstance(instanceId);
  }
  return agentClient.forceKillInstance(instanceId, getOptionalNodeConfig(options));
}

async function listInstanceFiles(instanceId, currentPath, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.listInstanceFiles(instanceId, currentPath);
  }
  return agentClient.listInstanceFiles(instanceId, currentPath, getOptionalNodeConfig(options));
}

async function readInstanceFile(instanceId, filePath, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.readInstanceFile(instanceId, filePath);
  }
  return agentClient.readInstanceFile(instanceId, filePath, getOptionalNodeConfig(options));
}

async function writeInstanceFile(instanceId, filePath, content, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.writeInstanceFile(instanceId, filePath, content, options);
  }
  return agentClient.writeInstanceFile(instanceId, filePath, content, options, getOptionalNodeConfig(options));
}

async function deleteInstanceFile(instanceId, filePath, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.deleteInstanceFile(instanceId, filePath);
  }
  return agentClient.deleteInstanceFile(instanceId, filePath, getOptionalNodeConfig(options));
}

async function createInstanceFolder(instanceId, folderPath, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.createInstanceFolder(instanceId, folderPath);
  }
  return agentClient.createInstanceFolder(instanceId, folderPath, getOptionalNodeConfig(options));
}

async function renameInstanceFile(instanceId, oldPath, newPath, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.renameInstanceFile(instanceId, oldPath, newPath);
  }
  return agentClient.renameInstanceFile(instanceId, oldPath, newPath, getOptionalNodeConfig(options));
}

async function getMinecraftProperties(instanceId, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.readMinecraftProperties(instanceId);
  }
  return agentClient.getMinecraftProperties(instanceId, getOptionalNodeConfig(options));
}

async function saveMinecraftProperties(instanceId, properties, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.writeMinecraftProperties(instanceId, properties);
  }
  return agentClient.saveMinecraftProperties(instanceId, properties, getOptionalNodeConfig(options));
}

async function getDependencyCatalog(options = {}) {
  if (shouldUseLocalInstances(options)) {
    return {
      dependencies: [],
      groups: [],
      distribution: {
        id: process.platform,
        name: process.platform,
        packageManager: null,
      },
    };
  }
  return agentClient.getDependencyCatalog(getOptionalNodeConfig(options));
}

async function checkDependencies(payload = {}) {
  if (shouldUseLocalInstances(payload)) {
    return {
      ok: true,
      dependencies: [],
      missingDependencyIds: [],
      checkedAt: new Date().toISOString(),
    };
  }
  return agentClient.checkDependencies(payload, getOptionalNodeConfig(payload));
}

async function planDependencyPreparation(payload = {}) {
  if (shouldUseLocalInstances(payload)) {
    return {
      ok: true,
      dependencyIds: [],
      distribution: {
        id: process.platform,
        name: process.platform,
        packageManager: null,
      },
      actions: [],
      installableActions: [],
      manualActions: [],
      missingDependencyIds: [],
      requiresUserInitiation: false,
      plannedAt: new Date().toISOString(),
    };
  }
  return agentClient.planDependencyPreparation(payload, getOptionalNodeConfig(payload));
}

async function installDependencies(payload = {}) {
  if (shouldUseLocalInstances(payload)) {
    return {
      ok: true,
      results: [],
      dependencies: [],
      missingDependencyIds: [],
      completedAt: new Date().toISOString(),
    };
  }
  return agentClient.installDependencies(payload, getOptionalNodeConfig(payload));
}

async function startInstance(instanceId, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.startInstance(instanceId);
  }
  await ensureInstanceDependenciesBeforeStart(instanceId, options);
  return agentClient.startInstance(instanceId, getOptionalNodeConfig(options));
}

async function stopInstance(instanceId, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.stopInstance(instanceId);
  }
  return agentClient.stopInstance(instanceId, getOptionalNodeConfig(options));
}

async function restartInstance(instanceId, options = {}) {
  if (shouldUseLocalInstances(options)) {
    return localInstanceService.restartInstance(instanceId);
  }
  return agentClient.restartInstance(instanceId, getOptionalNodeConfig(options));
}

async function deleteInstance(instanceId, options = {}) {
  const nodeId = options?.nodeId || getSelectedNodeId();
  if (shouldUseLocalInstances(options)) {
    const result = await localInstanceService.deleteInstance(instanceId);
    clearForgottenInstance(nodeId, instanceId);
    diagnostics.log("info", "instances", "delete", "Local instance delete completed.", {
      nodeId,
      instanceId,
      filesDeleted: result?.filesDeleted,
      metadataRemoved: result?.metadataRemoved,
      alreadyMissing: result?.alreadyMissing,
      partiallyFailed: result?.partiallyFailed,
    }, { file: "instances" });
    return result;
  }
  try {
    const result = await agentClient.deleteInstance(instanceId, getOptionalNodeConfig(options));
    clearForgottenInstance(nodeId, instanceId);
    diagnostics.log("info", "instances", "delete", "Agent instance delete completed.", {
      nodeId,
      instanceId,
      filesDeleted: result?.filesDeleted,
      metadataRemoved: result?.metadataRemoved,
      alreadyMissing: result?.alreadyMissing,
      partiallyFailed: result?.partiallyFailed,
    }, { file: "instances" });
    return result;
  } catch (error) {
    diagnostics.logError("instances", "delete-failed", error, {
      nodeId,
      instanceId,
      errorCode: error?.code || error?.payload?.error?.code || "INSTANCE_DELETE_FAILED",
      result: error?.payload?.error?.details?.result || error?.result || null,
    }, { file: "instances" });
    throw error;
  }
}

async function forgetInstance(instanceId, options = {}) {
  const nodeId = options?.nodeId || getSelectedNodeId();
  const baseResult = {
    id: instanceId,
    deleted: false,
    filesDeleted: false,
    metadataRemoved: false,
    alreadyMissing: false,
    partiallyFailed: false,
    stale: true,
    tombstoneAdded: false,
    nodeUnavailable: false,
    errors: [],
  };
  if (shouldUseLocalInstances(options)) {
    const result = await localInstanceService.forgetInstance(instanceId);
    rememberForgottenInstance(nodeId, instanceId, { reason: "local-forget" });
    diagnostics.log("info", "instances", "forget", "Local instance record removed.", {
      nodeId,
      instanceId,
      metadataRemoved: result?.metadataRemoved,
      alreadyMissing: result?.alreadyMissing,
    }, { file: "instances" });
    return { ...baseResult, ...result, tombstoneAdded: true };
  }
  try {
    const result = await agentClient.forgetInstance(instanceId, getOptionalNodeConfig(options));
    rememberForgottenInstance(nodeId, instanceId, { reason: "agent-forget" });
    diagnostics.log("info", "instances", "forget", "Agent instance record removed.", {
      nodeId,
      instanceId,
      metadataRemoved: result?.metadataRemoved,
      alreadyMissing: result?.alreadyMissing,
    }, { file: "instances" });
    return { ...baseResult, ...result, tombstoneAdded: true };
  } catch (error) {
    if (error?.code === "AGENT_UNAVAILABLE" || error?.code === "AGENT_TIMEOUT" || error?.status === 503 || error?.statusCode === 503) {
      rememberForgottenInstance(nodeId, instanceId, { reason: "node-unavailable" });
      diagnostics.log("warn", "instances", "forget-offline", "Instance hidden because selected Agent is unavailable.", {
        nodeId,
        instanceId,
        errorCode: error?.code || "AGENT_UNAVAILABLE",
      }, { file: "instances" });
      return {
        ...baseResult,
        deleted: true,
        partiallyFailed: true,
        tombstoneAdded: true,
        nodeUnavailable: true,
        errors: [{ code: "AGENT_UNAVAILABLE", message: "Agent was unavailable; instance was removed from this Control Center list only." }],
      };
    }
    diagnostics.logError("instances", "forget-failed", error, {
      nodeId,
      instanceId,
      errorCode: error?.code || error?.payload?.error?.code || "INSTANCE_FORGET_FAILED",
    }, { file: "instances" });
    throw error;
  }
}

async function listBackups(options = {}) {
  return agentClient.listBackups(options, getOptionalNodeConfig(options));
}

async function createBackup(payload = {}) {
  return agentClient.createBackup(payload, getOptionalNodeConfig(payload));
}

async function restoreBackup(payload = {}) {
  return agentClient.restoreBackup(payload, getOptionalNodeConfig(payload));
}

async function deleteBackup(backupId, options = {}) {
  return agentClient.deleteBackup(backupId, getOptionalNodeConfig(options));
}

async function downloadBackup(backupId, options = {}) {
  return agentClient.downloadBackup(backupId, getOptionalNodeConfig(options));
}

async function importBackup(payload = {}) {
  return agentClient.importBackup(payload, getOptionalNodeConfig(payload));
}

async function listBackupSchedules(options = {}) {
  return agentClient.listBackupSchedules(getOptionalNodeConfig(options));
}

async function saveBackupSchedule(payload = {}) {
  return agentClient.saveBackupSchedule(payload, getOptionalNodeConfig(payload));
}

async function deleteBackupSchedule(instanceId, options = {}) {
  return agentClient.deleteBackupSchedule(instanceId, getOptionalNodeConfig(options));
}

module.exports = {
  checkDependencies,
  clearInstanceLogs,
  createBackup,
  createDockerContainer,
  createDockerNetwork,
  deleteDockerImage,
  createInstance,
  createInstanceFolder,
  deleteBackup,
  deleteBackupSchedule,
  deleteDockerContainer,
  disconnectDockerNetwork,
  dockerComposeAction,
  execDockerContainer,
  deleteInstance,
  deleteInstanceFile,
  downloadBackup,
  forceKillInstance,
  forgetInstance,
  getAmpSnapshot,
  getDependencyCatalog,
  getDockerSnapshot,
  getDockerCleanupPreview,
  getDockerContainerLogs,
  getDockerContainerStats,
  getFileListing,
  inspectDockerContainer,
  inspectDockerImage,
  inspectDockerNetwork,
  inspectDockerVolume,
  getInstanceLogs,
  getInstanceMetrics,
  getInstanceStatus,
  getMinecraftProperties,
  getPlayitSnapshot,
  importBackup,
  installDependencies,
  listDockerContainers,
  listDockerComposeProjects,
  listDockerImages,
  listDockerNetworks,
  listDockerVolumes,
  connectDockerNetwork,
  killDockerContainer,
  pauseDockerContainer,
  pullDockerImage,
  pruneDockerImages,
  pruneDockerNetworks,
  pruneDockerVolumes,
  listBackupSchedules,
  listBackups,
  listInstanceFiles,
  listInstances,
  planDependencyPreparation,
  readInstanceFile,
  renameInstanceFile,
  restartInstance,
  restartDockerContainer,
  removeDockerNetwork,
  removeDockerVolume,
  renameDockerContainer,
  runDockerCleanup,
  restoreBackup,
  saveMinecraftProperties,
  saveBackupSchedule,
  sendInstanceCommand,
  startInstance,
  startDockerContainer,
  stopInstance,
  stopDockerContainer,
  unpauseDockerContainer,
  updateInstance,
  writeInstanceFile,
};
