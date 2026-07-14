const { ipcMain } = require("electron");
const {
  checkDependencies,
  getDependencyCatalog,
  installDependencies,
  planDependencyPreparation,
} = require("../services/serviceRouter");
const {
  createDependencyInstallRecord,
  finalizeDependencyInstallRecord,
  updateDependencyInstallRecord,
} = require("../services/marketplaceService");
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
  ipcMain.handle("dependencies:plan", async (_, payload = {}) => invokeDependencyOperation(() => planDependencyPreparation(payload)));
  ipcMain.handle("dependencies:install", async (_, payload = {}) => invokeDependencyOperation(async () => {
    requirePermission("instance:write", "marketplace-dependencies");
    audit({ action: "dependencies.install", target: Array.isArray(payload.dependencyIds) ? payload.dependencyIds.join(",") : "marketplace" });
    const plan = await planDependencyPreparation(payload).catch(() => null);
    const download = createDependencyInstallRecord(payload, plan);
    updateDependencyInstallRecord(download.id, {
      status: "running",
      stage: "Preparing installation",
      progress: null,
      progressMode: "indeterminate",
      body: "Installing selected dependencies on the selected node.",
      logs: [{ step: "Preparing installation", message: "Dependency installation is running through the selected backend." }],
    });
    try {
      const result = await installDependencies(payload);
      finalizeDependencyInstallRecord(download.id, result, null);
      return {
        ...result,
        downloadId: download.id,
      };
    } catch (error) {
      finalizeDependencyInstallRecord(download.id, null, error);
      throw error;
    }
  }));
}

module.exports = { registerDependenciesIpc };
