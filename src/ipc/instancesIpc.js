const { ipcMain } = require("electron");
const {
  createInstance,
  deleteInstance,
  getInstanceLogs,
  getInstanceMetrics,
  getInstanceStatus,
  listInstances,
  restartInstance,
  startInstance,
  stopInstance,
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
  ipcMain.handle("instances:getStatus", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceStatus(payload.instanceId)));
  ipcMain.handle("instances:getMetrics", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceMetrics(payload.instanceId)));
  ipcMain.handle("instances:getLogs", async (_, payload = {}) => invokeInstanceOperation(() => getInstanceLogs(payload.instanceId, payload)));
  ipcMain.handle("instances:start", async (_, payload = {}) => invokeInstanceOperation(() => startInstance(payload.instanceId)));
  ipcMain.handle("instances:stop", async (_, payload = {}) => invokeInstanceOperation(() => stopInstance(payload.instanceId)));
  ipcMain.handle("instances:restart", async (_, payload = {}) => invokeInstanceOperation(() => restartInstance(payload.instanceId)));
  ipcMain.handle("instances:delete", async (_, payload = {}) => invokeInstanceOperation(() => deleteInstance(payload.instanceId)));
}

module.exports = {
  registerInstancesIpc,
};
