const { ipcMain } = require("electron");
const {
  createDockerContainer,
  deleteDockerImage,
  deleteDockerContainer,
  getDockerContainerLogs,
  getDockerContainerStats,
  getDockerSnapshot,
  inspectDockerContainer,
  listDockerContainers,
  listDockerImages,
  listDockerNetworks,
  listDockerVolumes,
  restartDockerContainer,
  startDockerContainer,
  stopDockerContainer,
} = require("../services/serviceRouter");
const { audit, requirePermission } = require("../services/securityService");

function invokeDockerOperation(operation) {
  return Promise.resolve()
    .then(operation)
    .catch((error) => {
      throw new Error(error?.message || error?.code || "Docker request failed.");
    });
}

function registerDockerIpc() {
  ipcMain.handle("docker:getSnapshot", async (_, payload = {}) => getDockerSnapshot(payload));
  ipcMain.handle("docker:listContainers", async (_, payload = {}) => invokeDockerOperation(() => listDockerContainers(payload)));
  ipcMain.handle("docker:inspectContainer", async (_, payload = {}) => invokeDockerOperation(() => inspectDockerContainer(payload.container, payload)));
  ipcMain.handle("docker:listImages", async (_, payload = {}) => invokeDockerOperation(() => listDockerImages(payload)));
  ipcMain.handle("docker:removeImage", async (_, payload = {}) => invokeDockerOperation(() => {
    requirePermission("instance:delete", payload.image);
    audit({ action: "docker.image.delete", target: payload.image });
    return deleteDockerImage(payload.image, payload);
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
}

module.exports = {
  registerDockerIpc,
};
