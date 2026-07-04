const { ipcMain } = require("electron");
const { getSystemSnapshot } = require("../services/systemService");

function registerSystemIpc() {
  ipcMain.handle("system:getSnapshot", async () => getSystemSnapshot());
}

module.exports = {
  registerSystemIpc,
};
