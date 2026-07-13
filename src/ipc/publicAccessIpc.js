const { ipcMain } = require("electron");
const { getPublicAccessSnapshot } = require("../services/publicAccessProviderService");

function registerPublicAccessIpc() {
  ipcMain.handle("publicAccess:getSnapshot", async (_, payload = {}) => getPublicAccessSnapshot(payload));
}

module.exports = {
  registerPublicAccessIpc,
};
