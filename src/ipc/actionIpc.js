const { ipcMain } = require("electron");
const { executeAction } = require("../services/actionRouter");
const { audit, requirePermission } = require("../services/securityService");

function registerActionIpc() {
  ipcMain.handle("action:execute", async (_, payload = {}) => {
    if (String(payload.actionId || "").startsWith("backup.")) {
      requirePermission("backups:write", payload.actionId);
      audit({ action: "backup.action", target: payload.actionId });
    }
    return executeAction(payload.actionId, payload.params);
  });
}

module.exports = {
  registerActionIpc,
};
