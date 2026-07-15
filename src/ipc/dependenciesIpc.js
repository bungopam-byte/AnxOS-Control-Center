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
const diagnostics = require("../services/diagnosticsService");
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
  ipcMain.handle("dependencies:check", async (_, payload = {}) => invokeDependencyOperation(async () => {
    const result = await checkDependencies(payload);
    diagnostics.updateRuntimeState({
      dependencyCheck: result,
      dependencyNodeId: result.nodeId || payload.nodeId || null,
      dependencyCheckedAt: new Date().toISOString(),
    });
    return result;
  }));
  ipcMain.handle("dependencies:plan", async (_, payload = {}) => invokeDependencyOperation(async () => {
    const result = await planDependencyPreparation(payload);
    diagnostics.updateRuntimeState({
      dependencyPlan: result,
      dependencyNodeId: result.nodeId || payload.nodeId || null,
      dependencyPlannedAt: new Date().toISOString(),
    });
    return result;
  }));
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
      diagnostics.updateRuntimeState({
        dependencyInstall: {
          state: result?.degraded ? "degraded" : result?.ok === false ? "failed" : "completed",
          nodeId: result.nodeId || payload.nodeId || null,
          dependencyIds: Array.isArray(payload.dependencyIds) ? payload.dependencyIds : [],
          jobs: Array.isArray(result?.jobs) ? result.jobs : [],
          restartRequired: Array.isArray(result?.jobs) ? result.jobs.some((job) => job.restartRequired === true) : false,
          completedAt: new Date().toISOString(),
        },
      });
      return {
        ...result,
        downloadId: download.id,
      };
    } catch (error) {
      finalizeDependencyInstallRecord(download.id, null, error);
      diagnostics.updateRuntimeState({
        dependencyInstall: {
          state: "failed",
          nodeId: payload.nodeId || null,
          dependencyIds: Array.isArray(payload.dependencyIds) ? payload.dependencyIds : [],
          error: {
            code: error?.code || error?.payload?.error?.code || "DEPENDENCY_INSTALL_FAILED",
            message: error?.payload?.error?.message || error?.message || "Dependency installation failed.",
          },
          completedAt: new Date().toISOString(),
        },
      });
      throw error;
    }
  }));
}

module.exports = { registerDependenciesIpc };
