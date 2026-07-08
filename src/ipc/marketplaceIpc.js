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
  const details = error?.details || error?.payload?.error?.details || {};
  const status = details.status || error?.status || error?.payload?.status || null;
  const url = details.url || details.invalidUrl || null;
  const body = details.body || details.responseBody || null;
  const name = details.originalName || error?.name || null;
  const stack = details.originalStack || error?.stack || null;

  const parts = [];
  const usefulMessage = message && message !== "Request failed." && message !== "HTTP" && message !== "URL"
    ? message
    : null;
  parts.push(usefulMessage || "Marketplace request failed.");
  if (code) parts.push(`code=${code}`);
  if (status) parts.push(`status=${status}`);
  if (details.provider) parts.push(`provider=${details.provider}`);
  if (details.fileName) parts.push(`file=${details.fileName}`);
  if (url) parts.push(`${details.invalidUrl ? "invalidUrl" : "url"}=${url}`);
  if (body) parts.push(`body=${String(body).slice(0, 1000)}`);
  if (details.recovery) parts.push(`recovery=${details.recovery}`);
  if (details.suggestion) parts.push(`suggestion=${details.suggestion}`);
  if (Array.isArray(details.expectedEnvNames)) parts.push(`expectedEnvNames=${details.expectedEnvNames.join(",")}`);
  if (Array.isArray(details.expectedFileEnvNames)) parts.push(`expectedFileEnvNames=${details.expectedFileEnvNames.join(",")}`);
  if (Array.isArray(details.envSourcesChecked)) parts.push(`envSourcesChecked=${details.envSourcesChecked.join(";")}`);
  if (details.cwd || details.env?.cwd) parts.push(`cwd=${details.cwd || details.env.cwd}`);
  if (details.isPackaged !== undefined || details.env?.isPackaged !== undefined) parts.push(`isPackaged=${details.isPackaged ?? details.env.isPackaged}`);
  if (details.appPath || details.env?.appPath) parts.push(`appPath=${details.appPath || details.env.appPath}`);
  if (details.userDataPath || details.env?.userDataPath) parts.push(`userDataPath=${details.userDataPath || details.env.userDataPath}`);
  if (details.env?.resolvedEnvPath !== undefined) parts.push(`resolvedEnvPath=${details.env.resolvedEnvPath || "none"}`);
  if (details.env?.envFileExists !== undefined) parts.push(`envFileExists=${details.env.envFileExists}`);
  if (details.env?.envLoaded !== undefined) parts.push(`envLoaded=${details.env.envLoaded}`);
  if (details.source !== undefined) parts.push(`keySource=${details.source || "none"}`);
  if (name && name !== "Error") parts.push(`error=${name}`);
  if (message === "URL" && !url) parts.push("hint=A URL constructor failed before the invalid value was attached.");

  const detailed = parts.filter(Boolean).join(" | ");

  if (detailed !== "Marketplace request failed.") {
    return detailed;
  }

  return stack ? `${detailed} | stack=${String(stack).split("\n")[0]}` : detailed;
}

async function invokeMarketplaceOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    const message = getMarketplaceErrorMessage(error);
    console.error("[Marketplace][IPC] Operation failed.", {
      name: error?.name || null,
      code: error?.code || error?.payload?.error?.code || null,
      message,
      originalMessage: error?.message || null,
      status: error?.status || error?.payload?.status || error?.details?.status || null,
      url: error?.details?.url || error?.details?.invalidUrl || error?.payload?.error?.details?.url || error?.payload?.error?.details?.invalidUrl || null,
      responseBody: error?.details?.body || error?.details?.responseBody || error?.payload?.error?.details?.body || error?.payload?.error?.details?.responseBody || null,
      details: error?.details || error?.payload?.error?.details || null,
      payload: error?.payload || null,
      stack: error?.stack || null,
    });
    const wrapped = new Error(message);
    wrapped.code = error?.code || error?.payload?.error?.code || "MARKETPLACE_IPC_ERROR";
    wrapped.details = error?.details || error?.payload?.error?.details || {};
    throw wrapped;
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
  ipcMain.handle("marketplace:searchProviderPacks", async (_, payload = {}) => invokeMarketplaceOperation(async () => {
    console.info("[Marketplace][IPC] searchProviderPacks request.", {
      provider: payload.provider || "modrinth",
      mode: payload.mode || "featured",
      query: payload.query || "",
      minecraftVersion: payload.minecraftVersion || payload.version || "",
      loader: payload.loader || "",
      offset: payload.offset || 0,
      limit: payload.limit || null,
    });
    const result = await searchProviderPacks(payload);
    console.info("[Marketplace][IPC] searchProviderPacks response.", {
      provider: result?.provider || payload.provider || "modrinth",
      resultCount: Array.isArray(result?.results) ? result.results.length : 0,
      responseBytes: Buffer.byteLength(JSON.stringify(result || {}), "utf8"),
      diagnostics: result?.diagnostics || null,
    });
    return result;
  }));
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
