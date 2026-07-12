const { ipcMain } = require("electron");
const {
  checkDependencies,
  getDependencyCatalog,
  installDependencies,
} = require("../services/serviceRouter");
const { audit, requirePermission } = require("../services/securityService");

function invokeDependencyOperation(operation) {
  return Promise.resolve()
    .then(operation)
    .catch((error) => ({
      ok: false,
      error: {
        code: error?.code || error?.payload?.error?.code || "DEPENDENCY_REQUEST_FAILED",
        message: error?.payload?.error?.message || error?.message || "Dependency request failed.",
        details: error?.details || error?.payload?.error?.details || null,
      },
    }));
}

function registerDependenciesIpc() {
  ipcMain.handle("dependencies:getCatalog", async (_, payload = {}) => invokeDependencyOperation(() => getDependencyCatalog(payload)));
  ipcMain.handle("dependencies:check", async (_, payload = {}) => invokeDependencyOperation(() => checkDependencies(payload)));
  ipcMain.handle("dependencies:install", async (_, payload = {}) => invokeDependencyOperation(() => {
    requirePermission("instance:write", "marketplace-dependencies");
    audit({ action: "dependencies.install", target: Array.isArray(payload.dependencyIds) ? payload.dependencyIds.join(",") : "marketplace" });
    return installDependencies(payload);
  }));
}

module.exports = { registerDependenciesIpc };
