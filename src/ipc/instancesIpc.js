const { ipcMain } = require("electron");
const {
  clearInstanceLogs,
  createInstance,
  createInstanceFolder,
  deleteInstance,
  deleteInstanceFile,
  forgetInstance,
  forceKillInstance,
  getInstanceLogs,
  getInstanceMetrics,
  getInstanceStatus,
  getMinecraftProperties,
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
} = require("../services/serviceRouter");
const { audit, checkRateLimit, requirePermission } = require("../services/securityService");

function getInstanceErrorMessage(error) {
  const code = error?.payload?.error?.code || error?.code;
  const message = error?.payload?.error?.message;

  if (code) {
    return message && message !== "Request failed." ? `${code}: ${message}` : code;
  }

  return error?.message || "Instance request failed.";
}

async function invokeInstanceOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    const code = error?.payload?.error?.code || error?.code || null;
    const wrapped = new Error(getInstanceErrorMessage(error));
    wrapped.code = code;
    wrapped.statusCode = error?.statusCode || error?.status || null;
    throw wrapped;
  }
}

function registerInstancesIpc() {
  ipcMain.handle("instances:list", async (_, payload = {}) => invokeInstanceOperation(() => listInstances(payload)));
  ipcMain.handle("instances:create", async (_, payload = {}) => invokeInstanceOperation(() => createInstance(payload)));
  ipcMain.handle("instances:update", async (_, payload = {}) => invokeInstanceOperation(() => updateInstance(payload.instanceId, payload.config || {}, payload)));
  ipcMain.handle("instances:getStatus", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceStatus(payload.instanceId, payload)));
  ipcMain.handle("instances:getMetrics", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceMetrics(payload.instanceId, payload)));
  ipcMain.handle("instances:getLogs", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceLogs(payload.instanceId, payload)));
  ipcMain.handle("instances:clearLogs", async (_, payload = {}) => invokeInstanceOperation(() => clearInstanceLogs(payload.instanceId, payload)));
  ipcMain.handle("instances:sendCommand", async (_, payload = {}) => invokeInstanceOperation(() => {
    checkRateLimit("console-command", 120, 60 * 1000);
    audit({ action: "instance.command", target: payload.instanceId });
    return sendInstanceCommand(payload.instanceId, payload.command, payload);
  }));
  ipcMain.handle("instances:start", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:lifecycle", payload.instanceId);
    audit({ action: "instance.start", target: payload.instanceId });
    return startInstance(payload.instanceId, payload);
  }));
  ipcMain.handle("instances:stop", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:lifecycle", payload.instanceId);
    audit({ action: "instance.stop", target: payload.instanceId });
    return stopInstance(payload.instanceId, payload);
  }));
  ipcMain.handle("instances:restart", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:lifecycle", payload.instanceId);
    audit({ action: "instance.restart", target: payload.instanceId });
    return restartInstance(payload.instanceId, payload);
  }));
  ipcMain.handle("instances:forceKill", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:lifecycle", payload.instanceId);
    audit({ action: "instance.forceKill", target: payload.instanceId });
    return forceKillInstance(payload.instanceId, payload);
  }));
  ipcMain.handle("instances:delete", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:delete", payload.instanceId);
    audit({ action: "instance.delete", target: payload.instanceId });
    return deleteInstance(payload.instanceId, payload);
  }));
  ipcMain.handle("instances:forget", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:delete", payload.instanceId);
    audit({ action: "instance.forget", target: payload.instanceId });
    return forgetInstance(payload.instanceId, payload);
  }));
  ipcMain.handle("instances:listFiles", async (_, payload = {}) => invokeInstanceOperation(() => listInstanceFiles(payload.instanceId, payload.path, payload)));
  ipcMain.handle("instances:readFile", async (_, payload = {}) => invokeInstanceOperation(() => readInstanceFile(payload.instanceId, payload.path, payload)));
  ipcMain.handle("instances:writeFile", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("files:write", `${payload.instanceId}:${payload.path}`);
    checkRateLimit("instance-file-write", 120, 60 * 1000);
    audit({ action: "instance.file.write", target: `${payload.instanceId}:${payload.path}` });
    return writeInstanceFile(payload.instanceId, payload.path, payload.content, { ...payload, encoding: payload.encoding });
  }));
  ipcMain.handle("instances:deleteFile", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("files:write", `${payload.instanceId}:${payload.path}`);
    audit({ action: "instance.file.delete", target: `${payload.instanceId}:${payload.path}` });
    return deleteInstanceFile(payload.instanceId, payload.path, payload);
  }));
  ipcMain.handle("instances:createFolder", async (_, payload = {}) => invokeInstanceOperation(() => createInstanceFolder(payload.instanceId, payload.path, payload)));
  ipcMain.handle("instances:renameFile", async (_, payload = {}) => invokeInstanceOperation(() => renameInstanceFile(payload.instanceId, payload.oldPath, payload.newPath, payload)));
  ipcMain.handle("instances:getMinecraftProperties", async (_, payload = {}) => invokeInstanceOperation(() => getMinecraftProperties(payload.instanceId, payload)));
  ipcMain.handle("instances:saveMinecraftProperties", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("files:write", `${payload.instanceId}:server.properties`);
    audit({ action: "instance.minecraft.properties.write", target: payload.instanceId });
    return saveMinecraftProperties(payload.instanceId, payload.properties, payload);
  }));
}

module.exports = {
  registerInstancesIpc,
};
