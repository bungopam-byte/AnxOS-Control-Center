const { ipcMain } = require("electron");
const {
  getStatus,
  login,
  logout,
  logoutAllSessions,
  rotateAgentToken,
  setupAdmin,
} = require("../services/securityService");

function getSecurityErrorMessage(error) {
  return error?.message || error?.code || "Security request failed.";
}

async function invokeSecurityOperation(operation, operationName = "security") {
  console.info("[Security][IPC] Operation started.", { operation: operationName });
  try {
    const result = await operation();
    console.info("[Security][IPC] Operation completed.", { operation: operationName });
    return result;
  } catch (error) {
    console.warn("[Security][IPC] Operation failed.", {
      operation: operationName,
      code: error?.code || null,
      message: error?.message || String(error),
    });
    throw new Error(getSecurityErrorMessage(error));
  }
}

function registerSecurityIpc() {
  ipcMain.handle("security:getStatus", async () => invokeSecurityOperation(() => getStatus(), "security:getStatus"));
  ipcMain.handle("security:setupAdmin", async (_, payload = {}) => invokeSecurityOperation(() => setupAdmin(payload), "security:setupAdmin"));
  ipcMain.handle("security:login", async (_, payload = {}) => invokeSecurityOperation(() => login(payload), "security:login"));
  ipcMain.handle("security:logout", async () => invokeSecurityOperation(() => logout(), "security:logout"));
  ipcMain.handle("security:logoutAllSessions", async () => invokeSecurityOperation(() => logoutAllSessions(), "security:logoutAllSessions"));
  ipcMain.handle("security:rotateAgentToken", async () => invokeSecurityOperation(() => rotateAgentToken(), "security:rotateAgentToken"));
}

module.exports = {
  registerSecurityIpc,
};
