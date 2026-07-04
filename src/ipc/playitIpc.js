const { ipcMain } = require("electron");
const { getPlayitSnapshot } = require("../services/playitService");

function registerPlayitIpc() {
  ipcMain.handle("playit:getSnapshot", async () => getPlayitSnapshot());
}

module.exports = {
  registerPlayitIpc,
};
