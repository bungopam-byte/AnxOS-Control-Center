const { BrowserWindow, ipcMain } = require("electron");
const {
  cancelDownload,
  getDownloads,
  getImportSupport,
  getMinecraftVersionCatalog,
  importCommunityTemplate,
  installTemplate,
  listTemplates,
  retryDownload,
} = require("../services/marketplaceService");
const {
  getProviderPackVersions,
  getProviderPackDetails,
  installPack,
  marketplaceInstallEvents,
  searchProviderPacks,
} = require("../services/marketplaceInstallService");
const { audit, requirePermission } = require("../services/securityService");

let progressForwarderRegistered = false;

function getMarketplaceErrorMessage(error) {
  const code = error?.payload?.error?.code || error?.code;
  const message = error?.payload?.error?.message || error?.message;

  if (code) {
    return message && message !== "Request failed." ? message : code;
  }

  return message || "Marketplace request failed.";
}

async function invokeMarketplaceOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getMarketplaceErrorMessage(error));
  }
}

function registerMarketplaceIpc() {
  if (!progressForwarderRegistered) {
    progressForwarderRegistered = true;
    marketplaceInstallEvents.on("progress", (payload) => {
      BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
          window.webContents.send("marketplace:install-progress", payload);
        }
      });
    });
  }

  ipcMain.handle("marketplace:listTemplates", async () => invokeMarketplaceOperation(() => listTemplates()));
  ipcMain.handle("marketplace:getMinecraftVersions", async (_, payload = {}) => invokeMarketplaceOperation(() => getMinecraftVersionCatalog(payload.templateId)));
  ipcMain.handle("marketplace:searchProviderPacks", async (_, payload = {}) => invokeMarketplaceOperation(() => searchProviderPacks(payload)));
  ipcMain.handle("marketplace:getProviderPackVersions", async (_, payload = {}) => invokeMarketplaceOperation(() => getProviderPackVersions(payload)));
  ipcMain.handle("marketplace:getProviderPackDetails", async (_, payload = {}) => invokeMarketplaceOperation(() => getProviderPackDetails(payload)));
  ipcMain.handle("marketplace:getImportSupport", async () => invokeMarketplaceOperation(() => getImportSupport()));
  ipcMain.handle("marketplace:importCommunityTemplate", async (_, payload = {}) => invokeMarketplaceOperation(() => {
    requirePermission("marketplace:install", payload?.template?.id || payload?.id || "community-template");
    audit({ action: "marketplace.communityTemplate.import", target: payload?.template?.id || payload?.id || "community-template" });
    return importCommunityTemplate(payload);
  }));
  ipcMain.handle("marketplace:installTemplate", async (_, payload = {}) => invokeMarketplaceOperation(() => {
    requirePermission("marketplace:install", payload.templateId);
    audit({ action: "marketplace.install", target: payload.templateId });
    return installTemplate(payload);
  }));
  ipcMain.handle("marketplace:installPack", async (_, payload = {}) => invokeMarketplaceOperation(() => {
    const target = payload.providerProjectId || payload.projectId || payload.templateId || payload.id || payload.template?.id || "provider-pack";
    requirePermission("marketplace:install", target);
    audit({ action: "marketplace.providerPack.install", target });
    return installPack(payload);
  }));
  ipcMain.handle("marketplace:getDownloads", async () => invokeMarketplaceOperation(() => getDownloads()));
  ipcMain.handle("marketplace:cancelDownload", async (_, payload = {}) => invokeMarketplaceOperation(() => cancelDownload(payload.downloadId)));
  ipcMain.handle("marketplace:retryDownload", async (_, payload = {}) => invokeMarketplaceOperation(() => retryDownload(payload.downloadId)));
}

module.exports = {
  registerMarketplaceIpc,
};
