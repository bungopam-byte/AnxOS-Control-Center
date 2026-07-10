const { ipcMain } = require("electron");
const {
  cancelDeviceLogin,
  checkDeviceLogin,
  getStatus,
  listAccountDevices,
  loginWithPassword,
  logout,
  openAccountPage,
  refreshSession,
  revokeCurrentDevice,
  startDeviceLogin,
  redactSecret,
} = require("../services/accountAuthService");

function getAccountErrorMessage(error) {
  return redactSecret(error?.message || error?.code || "AnxOS account request failed.");
}

async function invokeAccountOperation(operation, operationName = "account") {
  console.info("[Account][IPC] Operation started.", { operation: operationName });
  try {
    const result = await operation();
    console.info("[Account][IPC] Operation completed.", { operation: operationName });
    return result;
  } catch (error) {
    console.warn("[Account][IPC] Operation failed.", {
      operation: operationName,
      code: error?.code || null,
      message: getAccountErrorMessage(error),
    });
    throw new Error(getAccountErrorMessage(error));
  }
}

function registerAccountAuthIpc() {
  ipcMain.handle("account:getStatus", async () => invokeAccountOperation(() => getStatus(), "account:getStatus"));
  ipcMain.handle("account:startDeviceLogin", async () => invokeAccountOperation(() => startDeviceLogin(), "account:startDeviceLogin"));
  ipcMain.handle("account:loginWithPassword", async (_, payload = {}) => invokeAccountOperation(() => loginWithPassword(payload), "account:loginWithPassword"));
  ipcMain.handle("account:checkDeviceLogin", async () => invokeAccountOperation(() => checkDeviceLogin(), "account:checkDeviceLogin"));
  ipcMain.handle("account:cancelDeviceLogin", async () => invokeAccountOperation(() => cancelDeviceLogin(), "account:cancelDeviceLogin"));
  ipcMain.handle("account:refresh", async () => invokeAccountOperation(() => refreshSession(), "account:refresh"));
  ipcMain.handle("account:openPage", async () => invokeAccountOperation(() => openAccountPage(), "account:openPage"));
  ipcMain.handle("account:listDevices", async () => invokeAccountOperation(() => listAccountDevices(), "account:listDevices"));
  ipcMain.handle("account:revokeCurrentDevice", async () => invokeAccountOperation(() => revokeCurrentDevice(), "account:revokeCurrentDevice"));
  ipcMain.handle("account:logout", async () => invokeAccountOperation(() => logout(), "account:logout"));
}

module.exports = {
  registerAccountAuthIpc,
};
