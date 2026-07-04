const { ipcMain } = require("electron");
const { getAmpSnapshot } = require("../services/ampService");

function registerAmpIpc() {
  ipcMain.handle("amp:getSnapshot", async () => getAmpSnapshot());
}

module.exports = {
  registerAmpIpc,
};
