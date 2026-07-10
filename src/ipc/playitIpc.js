const { ipcMain } = require("electron");
const { getPlayitSnapshot } = require("../services/serviceRouter");

function registerPlayitIpc() {
  ipcMain.handle("playit:getSnapshot", async (_, payload = {}) => getPlayitSnapshot(payload));
}

module.exports = {
  registerPlayitIpc,
};
