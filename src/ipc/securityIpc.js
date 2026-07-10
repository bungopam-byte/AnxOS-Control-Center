const { ipcMain, shell } = require("electron");
const {
  getStatus,
  getSecurityDashboard,
  login,
  logout,
  logoutAllSessions,
  revokePersistentSession,
  revokeOtherSessions,
  removeTrustedDevice,
  renameTrustedDevice,
  rotateAgentToken,
  revokeAgentToken,
  generateReplacementAgentToken,
  getAuditFolderForOpen,
  updateRemoteAccessSettings,
  updateSessionSecuritySettings,
  disableRemoteAccess,
  lockOwnerWorkspace,
  emergencySecurityAction,
  setupAdmin,
} = require("../services/securityService");

function getSecurityErrorMessage(error) {
  return String(error?.message || error?.code || "Security request failed.")
    .replace(/(authorization|cookie|password|refresh[_-]?token|access[_-]?token|agent[_-]?token|api[_-]?key|secret)\s*[:=]\s*[^,\s}]+/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[redacted]");
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
  ipcMain.handle("security:getDashboard", async () => invokeSecurityOperation(() => getSecurityDashboard(), "security:getDashboard"));
  ipcMain.handle("security:setupAdmin", async (_, payload = {}) => invokeSecurityOperation(() => setupAdmin(payload), "security:setupAdmin"));
  ipcMain.handle("security:login", async (_, payload = {}) => invokeSecurityOperation(() => login(payload), "security:login"));
  ipcMain.handle("security:logout", async () => invokeSecurityOperation(() => logout(), "security:logout"));
  ipcMain.handle("security:logoutAllSessions", async () => invokeSecurityOperation(() => logoutAllSessions(), "security:logoutAllSessions"));
  ipcMain.handle("security:rotateAgentToken", async () => invokeSecurityOperation(() => rotateAgentToken(), "security:rotateAgentToken"));
  ipcMain.handle("security:revokeSession", async (_, payload = {}) => invokeSecurityOperation(() => revokePersistentSession(payload.sessionId), "security:revokeSession"));
  ipcMain.handle("security:revokeOtherSessions", async () => invokeSecurityOperation(() => revokeOtherSessions(), "security:revokeOtherSessions"));
  ipcMain.handle("security:removeTrustedDevice", async (_, payload = {}) => invokeSecurityOperation(() => removeTrustedDevice(payload.deviceId), "security:removeTrustedDevice"));
  ipcMain.handle("security:renameTrustedDevice", async (_, payload = {}) => invokeSecurityOperation(() => renameTrustedDevice(payload.deviceId, payload.name), "security:renameTrustedDevice"));
  ipcMain.handle("security:updateSessionSettings", async (_, payload = {}) => invokeSecurityOperation(() => updateSessionSecuritySettings(payload), "security:updateSessionSettings"));
  ipcMain.handle("security:updateRemoteAccess", async (_, payload = {}) => invokeSecurityOperation(() => updateRemoteAccessSettings(payload), "security:updateRemoteAccess"));
  ipcMain.handle("security:disableRemoteAccess", async () => invokeSecurityOperation(() => disableRemoteAccess(), "security:disableRemoteAccess"));
  ipcMain.handle("security:revokeAgentToken", async () => invokeSecurityOperation(() => revokeAgentToken(), "security:revokeAgentToken"));
  ipcMain.handle("security:generateReplacementAgentToken", async () => invokeSecurityOperation(() => generateReplacementAgentToken(), "security:generateReplacementAgentToken"));
  ipcMain.handle("security:lockOwnerWorkspace", async () => invokeSecurityOperation(() => lockOwnerWorkspace(), "security:lockOwnerWorkspace"));
  ipcMain.handle("security:emergencyAction", async (_, payload = {}) => invokeSecurityOperation(() => emergencySecurityAction(payload.action, payload.confirmation), "security:emergencyAction"));
  ipcMain.handle("security:openAuditFolder", async () => invokeSecurityOperation(async () => {
    const folder = getAuditFolderForOpen();
    await shell.openPath(folder);
    return { opened: true };
  }, "security:openAuditFolder"));
}

module.exports = {
  registerSecurityIpc,
};
