const { ipcMain } = require("electron");
const { getAmpSnapshot } = require("../services/serviceRouter");
const { requireNodeContext } = require("./nodeContext");

function registerAmpIpc() {
  ipcMain.handle("amp:getSnapshot", async (_, payload = {}) => getAmpSnapshot(requireNodeContext(payload, "AMP snapshot")));
}

module.exports = {
  registerAmpIpc,
};
