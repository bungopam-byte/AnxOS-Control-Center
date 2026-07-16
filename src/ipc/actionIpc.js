const { ipcMain } = require("electron");
const { executeAction } = require("../services/actionRouter");
const { audit, requirePermission } = require("../services/securityService");

const ACTION_PERMISSIONS = new Map([
  ["docker.start", "instance:lifecycle"],
  ["docker.stop", "instance:lifecycle"],
  ["docker.restart", "instance:lifecycle"],
  ["amp.start", "instance:lifecycle"],
  ["amp.stop", "instance:lifecycle"],
  ["amp.restart", "instance:lifecycle"],
  ["backup.create", "backups:write"],
  ["backup.restore", "backups:restore"],
  ["file.upload", "files:write"],
  ["file.delete", "files:write"],
]);

function authorizeAction(actionId) {
  const normalized = String(actionId || "").trim();
  const permission = ACTION_PERMISSIONS.get(normalized);
  if (!permission) {
    throw Object.assign(new Error("This action is not available through the desktop action bridge."), { code: "ACTION_NOT_ALLOWED" });
  }
  const actor = requirePermission(permission, normalized);
  audit({ action: "agent.action", target: normalized, actor });
  return normalized;
}

function registerActionIpc() {
  ipcMain.handle("action:execute", async (_, payload = {}) => {
    const actionId = authorizeAction(payload.actionId);
    return executeAction(actionId, payload.params, { nodeId: payload.nodeId });
  });
}

module.exports = {
  ACTION_PERMISSIONS,
  registerActionIpc,
};
