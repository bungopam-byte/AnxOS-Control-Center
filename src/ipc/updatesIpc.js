const { ipcMain } = require("electron");
const { requirePermission } = require("../services/securityService");
const { requireSettingsCapability } = require("../services/settingsPermissionService");
const { createIpcError } = require("../shared/ipcError");

function registerHandler(channel, authorize, handler) {
  ipcMain.handle(channel, async (...args) => {
    try {
      authorize();
      return await handler(...args);
    } catch (error) {
      throw createIpcError(error, {
        code: "UPDATE_REQUEST_FAILED",
        fallbackMessage: "Update operation failed.",
        suggestion: "Retry the update action or review the update diagnostics.",
      });
    }
  });
}

function authorizeUpdate(permission, operation) {
  return () => requirePermission(permission, `updates:${operation}`);
}

function registerUpdatesIpc(updateManager) {
  updateManager.initialize();
  registerHandler("updates:getState", authorizeUpdate("system:read", "get-state"), () => updateManager.getState());
  registerHandler("updates:check", authorizeUpdate("system:read", "check"), (_, options = {}) => updateManager.check({ ...options, forceNotify: !options.silent }));
  registerHandler("updates:download", authorizeUpdate("settings:write", "download"), () => updateManager.download());
  registerHandler("updates:open-downloaded", authorizeUpdate("settings:write", "open-downloaded"), () => updateManager.install());
  registerHandler("updates:install", authorizeUpdate("settings:write", "install"), () => updateManager.install());
  registerHandler("updates:open-download", authorizeUpdate("settings:write", "open-download"), () => updateManager.openDownload());
  registerHandler("updates:open-release", authorizeUpdate("system:read", "open-release"), () => updateManager.openRelease());
  registerHandler("updates:skip", authorizeUpdate("settings:write", "skip"), (_, payload = {}) => updateManager.skip(payload.version));
}

function registerDeveloperUpdatesIpc(developerGitUpdater) {
  const authorize = () => requireSettingsCapability("canManageDeveloperSettings", "developer-updates");
  registerHandler("developerUpdates:getState", authorize, () => developerGitUpdater.getState());
  registerHandler("developerUpdates:check", authorize, (_, options = {}) => developerGitUpdater.check(options));
  registerHandler("developerUpdates:update", authorize, () => developerGitUpdater.update());
  registerHandler("developerUpdates:restart", authorize, () => developerGitUpdater.restart());
  registerHandler("developerUpdates:openChanges", authorize, () => developerGitUpdater.openChanges());
}

module.exports = { registerDeveloperUpdatesIpc, registerUpdatesIpc };
