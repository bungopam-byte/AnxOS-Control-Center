const { ipcMain } = require("electron");
const {
  getStatus,
  login,
  logout,
  rotateAgentToken,
  setupAdmin,
} = require("../services/securityService");

function getSecurityErrorMessage(error) {
  return error?.message || error?.code || "Security request failed.";
}

async function invokeSecurityOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getSecurityErrorMessage(error));
  }
}

function registerSecurityIpc() {
  ipcMain.handle("security:getStatus", async () => invokeSecurityOperation(() => getStatus()));
  ipcMain.handle("security:setupAdmin", async (_, payload = {}) => invokeSecurityOperation(() => setupAdmin(payload)));
  ipcMain.handle("security:login", async (_, payload = {}) => invokeSecurityOperation(() => login(payload)));
  ipcMain.handle("security:logout", async () => invokeSecurityOperation(() => logout()));
  ipcMain.handle("security:rotateAgentToken", async () => invokeSecurityOperation(() => rotateAgentToken()));
}

module.exports = {
  registerSecurityIpc,
};
