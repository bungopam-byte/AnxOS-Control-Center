const { ipcMain } = require("electron");
const { getSystemSnapshot } = require("../services/systemService");
const { requireNodeContext } = require("./nodeContext");

function registerSystemIpc() {
  ipcMain.handle("system:getSnapshot", async (_, payload = {}) => getSystemSnapshot(requireNodeContext(payload, "system metrics")));
}

module.exports = {
  registerSystemIpc,
};
