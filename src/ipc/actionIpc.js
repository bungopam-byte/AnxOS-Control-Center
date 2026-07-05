const { ipcMain } = require("electron");
const { executeAction } = require("../services/actionRouter");

function registerActionIpc() {
  ipcMain.handle("action:execute", async (_, payload = {}) => executeAction(payload.actionId, payload.params));
}

module.exports = {
  registerActionIpc,
};
