const { ipcMain } = require("electron");
const {
  clearInstanceLogs,
  createInstance,
  createInstanceFolder,
  deleteInstance,
  deleteInstanceFile,
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
    throw new Error(getInstanceErrorMessage(error));
  }
}

function registerInstancesIpc() {
  ipcMain.handle("instances:list", async () => invokeInstanceOperation(() => listInstances()));
  ipcMain.handle("instances:create", async (_, payload = {}) => invokeInstanceOperation(() => createInstance(payload)));
  ipcMain.handle("instances:update", async (_, payload = {}) => invokeInstanceOperation(() => updateInstance(payload.instanceId, payload.config || {})));
  ipcMain.handle("instances:getStatus", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceStatus(payload.instanceId)));
  ipcMain.handle("instances:getMetrics", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceMetrics(payload.instanceId)));
  ipcMain.handle("instances:getLogs", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceLogs(payload.instanceId, payload)));
  ipcMain.handle("instances:clearLogs", async (_, payload = {}) => invokeInstanceOperation(() => clearInstanceLogs(payload.instanceId, payload)));
  ipcMain.handle("instances:sendCommand", async (_, payload = {}) => invokeInstanceOperation(() => sendInstanceCommand(payload.instanceId, payload.command)));
  ipcMain.handle("instances:start", async (_, payload = {}) => invokeInstanceOperation(() => startInstance(payload.instanceId)));
  ipcMain.handle("instances:stop", async (_, payload = {}) => invokeInstanceOperation(() => stopInstance(payload.instanceId)));
  ipcMain.handle("instances:restart", async (_, payload = {}) => invokeInstanceOperation(() => restartInstance(payload.instanceId)));
  ipcMain.handle("instances:forceKill", async (_, payload = {}) => invokeInstanceOperation(() => forceKillInstance(payload.instanceId)));
  ipcMain.handle("instances:delete", async (_, payload = {}) => invokeInstanceOperation(() => deleteInstance(payload.instanceId)));
  ipcMain.handle("instances:listFiles", async (_, payload = {}) => invokeInstanceOperation(() => listInstanceFiles(payload.instanceId, payload.path)));
  ipcMain.handle("instances:readFile", async (_, payload = {}) => invokeInstanceOperation(() => readInstanceFile(payload.instanceId, payload.path)));
  ipcMain.handle("instances:writeFile", async (_, payload = {}) => invokeInstanceOperation(() => writeInstanceFile(payload.instanceId, payload.path, payload.content, { encoding: payload.encoding })));
  ipcMain.handle("instances:deleteFile", async (_, payload = {}) => invokeInstanceOperation(() => deleteInstanceFile(payload.instanceId, payload.path)));
  ipcMain.handle("instances:createFolder", async (_, payload = {}) => invokeInstanceOperation(() => createInstanceFolder(payload.instanceId, payload.path)));
  ipcMain.handle("instances:renameFile", async (_, payload = {}) => invokeInstanceOperation(() => renameInstanceFile(payload.instanceId, payload.oldPath, payload.newPath)));
  ipcMain.handle("instances:getMinecraftProperties", async (_, payload = {}) => invokeInstanceOperation(() => getMinecraftProperties(payload.instanceId)));
  ipcMain.handle("instances:saveMinecraftProperties", async (_, payload = {}) => invokeInstanceOperation(() => saveMinecraftProperties(payload.instanceId, payload.properties)));
}

module.exports = {
  registerInstancesIpc,
};
