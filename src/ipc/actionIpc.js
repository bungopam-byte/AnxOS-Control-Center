const { ipcMain } = require("electron");
const { executeAction } = require("../services/actionRouter");
const { audit, checkRateLimit, requirePermission } = require("../services/securityService");
const { requireNodeContext } = require("./nodeContext");
const { createIpcError } = require("../shared/ipcError");

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
const ACTION_RATE_LIMITS = new Map([
  ["backup.restore", 5],
  ["backup.create", 20],
  ["file.upload", 30],
  ["file.delete", 60],
]);
const DEFAULT_ACTION_RATE_LIMIT = 60;

function authorizeAction(actionId) {
  const normalized = String(actionId || "").trim();
  const permission = ACTION_PERMISSIONS.get(normalized);
  if (!permission) {
    throw Object.assign(new Error("This action is not available through the desktop action bridge."), { code: "ACTION_NOT_ALLOWED" });
  }
  const actor = requirePermission(permission, normalized);
  checkRateLimit(`action:${normalized}`, ACTION_RATE_LIMITS.get(normalized) || DEFAULT_ACTION_RATE_LIMIT, 60 * 1000);
  audit({ action: "agent.action", target: normalized, actor });
  return normalized;
}

function registerActionIpc() {
  ipcMain.handle("action:execute", async (_, payload = {}) => {
    try {
      requireNodeContext(payload, "action execution");
      const actionId = authorizeAction(payload.actionId);
      return await executeAction(actionId, payload.params, { nodeId: payload.nodeId });
    } catch (error) {
      throw createIpcError(error, {
        code: "ACTION_EXECUTION_FAILED",
        fallbackMessage: "Action execution failed.",
        suggestion: "Verify the selected node, permission, and action parameters, then retry.",
      });
    }
  });
}

module.exports = {
  ACTION_PERMISSIONS,
  ACTION_RATE_LIMITS,
  registerActionIpc,
};
