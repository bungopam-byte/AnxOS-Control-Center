const { ipcMain } = require("electron");
const {
  createPublicAccessService,
  deletePublicAccessService,
  getPublicAccessSnapshot,
  listPublicAccessServices,
} = require("../services/publicAccessProviderService");
const { audit, requirePermission } = require("../services/securityService");

function wrapPublicAccessOperation(operation) {
  return Promise.resolve()
    .then(operation)
    .catch((error) => ({
      ok: false,
      error: {
        code: error?.code || error?.payload?.error?.code || "PUBLIC_ACCESS_REQUEST_FAILED",
        message: error?.payload?.error?.message || error?.message || "Public Access request failed.",
        details: error?.details || error?.payload?.error?.details || null,
      },
    }));
}

function registerPublicAccessIpc() {
  ipcMain.handle("publicAccess:getSnapshot", async (_, payload = {}) => getPublicAccessSnapshot(payload));
  ipcMain.handle("publicAccess:listServices", async (_, payload = {}) => listPublicAccessServices(payload));
  ipcMain.handle("publicAccess:createService", async (_, payload = {}) => wrapPublicAccessOperation(() => {
    requirePermission("instance:write", "public-access");
    audit({ action: "publicAccess.createService", target: payload.providerId || "public-access" });
    return createPublicAccessService(payload);
  }));
  ipcMain.handle("publicAccess:deleteService", async (_, payload = {}) => wrapPublicAccessOperation(() => {
    requirePermission("instance:write", "public-access");
    audit({ action: "publicAccess.deleteService", target: payload.serviceId || payload.id || "public-access" });
    return deletePublicAccessService(payload);
  }));
}

module.exports = {
  registerPublicAccessIpc,
};
