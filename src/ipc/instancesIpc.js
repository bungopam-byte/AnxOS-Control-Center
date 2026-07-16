const { ipcMain } = require("electron");
const {
  clearInstanceLogs,
  createInstance,
  createInstanceFolder,
  deleteInstance,
  deleteInstanceFile,
  duplicateInstance,
  forgetInstance,
  forceKillInstance,
  getInstanceLogs,
  getInstanceMetrics,
  getInstanceStatus,
  getFiveMReadiness,
  getMinecraftProperties,
  listInstanceFiles,
  listInstances,
  openInstanceFolder,
  readInstanceFile,
  renameInstance,
  renameInstanceFile,
  restartInstance,
  saveMinecraftProperties,
  saveFiveMLicenseKey,
  sendInstanceCommand,
  startInstance,
  stopInstance,
  updateInstance,
  writeInstanceFile,
} = require("../services/serviceRouter");
const { audit, checkRateLimit, requirePermission } = require("../services/securityService");
const { wrapExpectedAgentRead } = require("./expectedAgentError");
const { createIpcError } = require("../shared/ipcError");

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
    throw createIpcError(error, {
      code: "INSTANCE_REQUEST_FAILED",
      fallbackMessage: getInstanceErrorMessage(error),
      suggestion: "Review the instance status and diagnostics, correct the reported problem, then retry.",
    });
  }
}

function registerInstancesIpc() {
  ipcMain.handle("instances:list", async (_, payload = {}) => wrapExpectedAgentRead("instances:list", () => { requirePermission("instance:read", payload.nodeId); return listInstances(payload); }));
  ipcMain.handle("instances:create", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:write", payload.id || payload.name || "new-instance");
    audit({ action: "instance.create", target: payload.id || payload.name || "new-instance" });
    return createInstance(payload);
  }));
  ipcMain.handle("instances:update", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:write", payload.instanceId);
    audit({ action: "instance.update", target: payload.instanceId });
    return updateInstance(payload.instanceId, payload.config || {}, payload);
  }));
  ipcMain.handle("instances:rename", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:write", payload.instanceId);
    audit({ action: "instance.rename", target: payload.instanceId });
    return renameInstance(payload.instanceId, payload.displayName || payload.name, payload);
  }));
  ipcMain.handle("instances:duplicate", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:write", payload.instanceId);
    audit({ action: "instance.duplicate", target: payload.instanceId });
    return duplicateInstance(payload.instanceId, payload.config || payload.options || payload, payload);
  }));
  ipcMain.handle("instances:openFolder", async (_, payload = {}) => invokeInstanceOperation(() => {
    audit({ action: "instance.openFolder", target: payload.instanceId });
    return openInstanceFolder(payload.instanceId, payload);
  }));
  ipcMain.handle("instances:getStatus", async (_, payload = {}) => wrapExpectedAgentRead("instances:getStatus", () => { requirePermission("instance:read", payload.instanceId); return getInstanceStatus(payload.instanceId, payload); }));
  ipcMain.handle("instances:getMetrics", async (_, payload = {}) => wrapExpectedAgentRead("instances:getMetrics", () => { requirePermission("instance:read", payload.instanceId); return getInstanceMetrics(payload.instanceId, payload); }));
  ipcMain.handle("instances:getLogs", async (_, payload = {}) => wrapExpectedAgentRead("instances:getLogs", () => { requirePermission("instance:read", payload.instanceId); return getInstanceLogs(payload.instanceId, payload); }));
  ipcMain.handle("instances:clearLogs", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("files:write", `${payload.instanceId}:logs`);
    audit({ action: "instance.logs.clear", target: payload.instanceId });
    return clearInstanceLogs(payload.instanceId, payload);
  }));
  ipcMain.handle("instances:sendCommand", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("instance:write", payload.instanceId);
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
  ipcMain.handle("instances:listFiles", async (_, payload = {}) => invokeInstanceOperation(() => { requirePermission("instance:read", payload.instanceId); return listInstanceFiles(payload.instanceId, payload.path, payload); }));
  ipcMain.handle("instances:readFile", async (_, payload = {}) => invokeInstanceOperation(() => { requirePermission("instance:read", payload.instanceId); return readInstanceFile(payload.instanceId, payload.path, payload); }));
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
  ipcMain.handle("instances:createFolder", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("files:write", `${payload.instanceId}:${payload.path}`);
    audit({ action: "instance.folder.create", target: `${payload.instanceId}:${payload.path}` });
    return createInstanceFolder(payload.instanceId, payload.path, payload);
  }));
  ipcMain.handle("instances:renameFile", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("files:write", `${payload.instanceId}:${payload.oldPath}`);
    audit({ action: "instance.file.rename", target: `${payload.instanceId}:${payload.oldPath}` });
    return renameInstanceFile(payload.instanceId, payload.oldPath, payload.newPath, payload);
  }));
  ipcMain.handle("instances:getMinecraftProperties", async (_, payload = {}) => invokeInstanceOperation(() => { requirePermission("instance:read", payload.instanceId); return getMinecraftProperties(payload.instanceId, payload); }));
  ipcMain.handle("instances:saveMinecraftProperties", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("files:write", `${payload.instanceId}:server.properties`);
    audit({ action: "instance.minecraft.properties.write", target: payload.instanceId });
    return saveMinecraftProperties(payload.instanceId, payload.properties, payload);
  }));
  ipcMain.handle("instances:getFiveMReadiness", async (_, payload = {}) => invokeInstanceOperation(() => { requirePermission("instance:read", payload.instanceId); return getFiveMReadiness(payload.instanceId, payload); }));
  ipcMain.handle("instances:saveFiveMLicenseKey", async (_, payload = {}) => invokeInstanceOperation(() => {
    requirePermission("files:write", `${payload.instanceId}:server.cfg`);
    checkRateLimit("fivem-license-save", 20, 60 * 1000);
    audit({ action: "instance.fivem.license.write", target: payload.instanceId });
    return saveFiveMLicenseKey(payload.instanceId, payload.licenseKey, payload);
  }));
}

module.exports = {
  registerInstancesIpc,
};
