const { ipcMain } = require("electron");
const {
  createDockerContainer,
  createDockerNetwork,
  deleteDockerImage,
  deleteDockerContainer,
  disconnectDockerNetwork,
  dockerComposeAction,
  execDockerContainer,
  getDockerCleanupPreview,
  getDockerContainerLogs,
  getDockerContainerStats,
  getDockerSnapshot,
  inspectDockerImage,
  inspectDockerContainer,
  inspectDockerNetwork,
  inspectDockerVolume,
  killDockerContainer,
  listDockerContainers,
  listDockerComposeProjects,
  listDockerImages,
  listDockerNetworks,
  listDockerVolumes,
  pauseDockerContainer,
  pullDockerImage,
  pruneDockerImages,
  pruneDockerNetworks,
  pruneDockerVolumes,
  removeDockerNetwork,
  removeDockerVolume,
  renameDockerContainer,
  restartDockerContainer,
  runDockerCleanup,
  startDockerContainer,
  stopDockerContainer,
  unpauseDockerContainer,
  connectDockerNetwork,
} = require("../services/serviceRouter");
const { audit, requirePermission } = require("../services/securityService");

function invokeDockerOperation(operation) {
  return Promise.resolve()
    .then(operation)
    .catch((error) => {
      const code = error?.code || error?.payload?.error?.code || "DOCKER_REQUEST_FAILED";
      const wrapped = new Error(`${code}: ${error?.message || "Docker request failed."}`);
      wrapped.code = code;
      wrapped.statusCode = error?.statusCode || error?.status || null;
      throw wrapped;
    });
}

function registerDockerIpc() {
  ipcMain.handle("docker:getSnapshot", async (_, payload = {}) => invokeDockerOperation(() => getDockerSnapshot(payload)));
  ipcMain.handle("docker:listContainers", async (_, payload = {}) => invokeDockerOperation(() => listDockerContainers(payload)));
  ipcMain.handle("docker:inspectContainer", async (_, payload = {}) => invokeDockerOperation(() => inspectDockerContainer(payload.container, payload)));
  ipcMain.handle("docker:listImages", async (_, payload = {}) => invokeDockerOperation(() => listDockerImages(payload)));
  ipcMain.handle("docker:removeImage", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", payload.image);
    audit({ action: "docker.image.delete", target: payload.image });
    return deleteDockerImage(payload.image, payload);
  }));
  ipcMain.handle("docker:pullImage", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:write", payload.image);
    audit({ action: "docker.image.pull", target: payload.image });
    return pullDockerImage(payload.image, payload);
  }));
  ipcMain.handle("docker:inspectImage", async (_, payload = {}) => invokeDockerOperation(() => inspectDockerImage(payload.image, payload)));
  ipcMain.handle("docker:pruneImages", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", "docker-images");
    audit({ action: "docker.images.prune", target: "unused-images" });
    return pruneDockerImages(payload);
  }));
  ipcMain.handle("docker:listNetworks", async (_, payload = {}) => invokeDockerOperation(() => listDockerNetworks(payload)));
  ipcMain.handle("docker:listVolumes", async (_, payload = {}) => invokeDockerOperation(() => listDockerVolumes(payload)));
  ipcMain.handle("docker:create", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:write", payload.name || payload.image);
    audit({ action: "docker.create", target: payload.name || payload.image });
    return createDockerContainer(payload);
  }));
  ipcMain.handle("docker:start", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:lifecycle", payload.container);
    return startDockerContainer(payload.container, payload);
  }));
  ipcMain.handle("docker:stop", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:lifecycle", payload.container);
    return stopDockerContainer(payload.container, payload);
  }));
  ipcMain.handle("docker:restart", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:lifecycle", payload.container);
    return restartDockerContainer(payload.container, payload);
  }));
  ipcMain.handle("docker:pause", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:lifecycle", payload.container);
    return pauseDockerContainer(payload.container, payload);
  }));
  ipcMain.handle("docker:unpause", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:lifecycle", payload.container);
    return unpauseDockerContainer(payload.container, payload);
  }));
  ipcMain.handle("docker:kill", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:lifecycle", payload.container);
    audit({ action: "docker.kill", target: payload.container });
    return killDockerContainer(payload.container, payload);
  }));
  ipcMain.handle("docker:rename", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:write", payload.container);
    audit({ action: "docker.rename", target: payload.container });
    return renameDockerContainer(payload.container, payload.name, payload);
  }));
  ipcMain.handle("docker:delete", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", payload.container);
    audit({ action: "docker.delete", target: payload.container });
    return deleteDockerContainer(payload.container, payload);
  }));
  ipcMain.handle("docker:removeContainer", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", payload.container);
    audit({ action: "docker.delete", target: payload.container });
    return deleteDockerContainer(payload.container, payload);
  }));
  ipcMain.handle("docker:getLogs", async (_, payload = {}) => invokeDockerOperation(() => getDockerContainerLogs(payload.container, payload)));
  ipcMain.handle("docker:getStats", async (_, payload = {}) => invokeDockerOperation(() => getDockerContainerStats(payload.container, payload)));
  ipcMain.handle("docker:exec", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:write", payload.container);
    audit({ action: "docker.exec", target: payload.container });
    return execDockerContainer(payload.container, payload, payload);
  }));
  ipcMain.handle("docker:inspectVolume", async (_, payload = {}) => invokeDockerOperation(() => inspectDockerVolume(payload.volume, payload)));
  ipcMain.handle("docker:removeVolume", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", payload.volume);
    audit({ action: "docker.volume.delete", target: payload.volume });
    return removeDockerVolume(payload.volume, payload);
  }));
  ipcMain.handle("docker:pruneVolumes", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", "docker-volumes");
    audit({ action: "docker.volumes.prune", target: "unused-volumes" });
    return pruneDockerVolumes(payload);
  }));
  ipcMain.handle("docker:inspectNetwork", async (_, payload = {}) => invokeDockerOperation(() => inspectDockerNetwork(payload.network, payload)));
  ipcMain.handle("docker:createNetwork", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:write", payload.name);
    audit({ action: "docker.network.create", target: payload.name });
    return createDockerNetwork(payload);
  }));
  ipcMain.handle("docker:removeNetwork", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", payload.network);
    audit({ action: "docker.network.delete", target: payload.network });
    return removeDockerNetwork(payload.network, payload);
  }));
  ipcMain.handle("docker:connectNetwork", async (_, payload = {}) => invokeDockerOperation(() => connectDockerNetwork(payload.network, payload.container, payload)));
  ipcMain.handle("docker:disconnectNetwork", async (_, payload = {}) => invokeDockerOperation(() => disconnectDockerNetwork(payload.network, payload.container, payload)));
  ipcMain.handle("docker:pruneNetworks", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", "docker-networks");
    audit({ action: "docker.networks.prune", target: "unused-networks" });
    return pruneDockerNetworks(payload);
  }));
  ipcMain.handle("docker:listComposeProjects", async (_, payload = {}) => invokeDockerOperation(() => listDockerComposeProjects(payload)));
  ipcMain.handle("docker:compose", async (_, payload = {}) => invokeDockerOperation(() => {
    if (!["config", "logs", "status"].includes(payload.action)) requirePermission("instance:write", payload.projectName);
    audit({ action: `docker.compose.${payload.action || "unknown"}`, target: payload.projectName || payload.projectDirectory });
    return dockerComposeAction(payload.action, payload);
  }));
  ipcMain.handle("docker:getCleanupPreview", async (_, payload = {}) => invokeDockerOperation(() => getDockerCleanupPreview(payload)));
  ipcMain.handle("docker:cleanup", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", `docker-cleanup-${payload.kind || "unknown"}`);
    audit({ action: "docker.cleanup", target: payload.kind });
    return runDockerCleanup(payload);
  }));
}

module.exports = {
  registerDockerIpc,
};
