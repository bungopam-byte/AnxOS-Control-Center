const { ipcMain } = require("electron");
const {
  cancelDownload,
  getDownloads,
  installTemplate,
  listTemplates,
  retryDownload,
} = require("../services/marketplaceService");

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
  ipcMain.handle("marketplace:listTemplates", async () => invokeMarketplaceOperation(() => listTemplates()));
  ipcMain.handle("marketplace:installTemplate", async (_, payload = {}) => invokeMarketplaceOperation(() => installTemplate(payload)));
  ipcMain.handle("marketplace:getDownloads", async () => invokeMarketplaceOperation(() => getDownloads()));
  ipcMain.handle("marketplace:cancelDownload", async (_, payload = {}) => invokeMarketplaceOperation(() => cancelDownload(payload.downloadId)));
  ipcMain.handle("marketplace:retryDownload", async (_, payload = {}) => invokeMarketplaceOperation(() => retryDownload(payload.downloadId)));
}

module.exports = {
  registerMarketplaceIpc,
};
