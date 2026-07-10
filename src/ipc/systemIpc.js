const { ipcMain } = require("electron");
const { getSystemSnapshot } = require("../services/systemService");

function registerSystemIpc() {
  ipcMain.handle("system:getSnapshot", async (_, payload = {}) => getSystemSnapshot(payload));
}

module.exports = {
  registerSystemIpc,
};
