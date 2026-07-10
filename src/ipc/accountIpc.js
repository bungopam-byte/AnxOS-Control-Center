const { ipcMain } = require("electron");
const {
  checkDeviceLogin,
  getStatus,
  logout,
  openAccountPage,
  startDeviceLogin,
} = require("../services/accountService");

function getAccountErrorMessage(error) {
  return error?.message || error?.code || "AnxOS account request failed.";
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
      message: error?.message || String(error),
    });
    throw new Error(getAccountErrorMessage(error));
  }
}

function registerAccountIpc() {
  ipcMain.handle("account:getStatus", async () => invokeAccountOperation(() => getStatus(), "account:getStatus"));
  ipcMain.handle("account:startDeviceLogin", async () => invokeAccountOperation(() => startDeviceLogin(), "account:startDeviceLogin"));
  ipcMain.handle("account:checkDeviceLogin", async () => invokeAccountOperation(() => checkDeviceLogin(), "account:checkDeviceLogin"));
  ipcMain.handle("account:openPage", async () => invokeAccountOperation(() => openAccountPage(), "account:openPage"));
  ipcMain.handle("account:logout", async () => invokeAccountOperation(() => logout(), "account:logout"));
}

module.exports = {
  registerAccountIpc,
};
