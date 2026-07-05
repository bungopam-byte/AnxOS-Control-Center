const { ipcMain } = require("electron");
const { getAmpSnapshot } = require("../services/serviceRouter");

function registerAmpIpc() {
  ipcMain.handle("amp:getSnapshot", async () => getAmpSnapshot());
}

module.exports = {
  registerAmpIpc,
};
