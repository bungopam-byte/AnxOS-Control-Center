const { ipcMain } = require("electron");
const { getAmpSnapshot } = require("../services/serviceRouter");
const { wrapExpectedAgentRead } = require("./expectedAgentError");
const { requireNodeContext } = require("./nodeContext");

function registerAmpIpc() {
  ipcMain.handle("amp:getSnapshot", async (_, payload = {}) => wrapExpectedAgentRead("amp:getSnapshot", () => getAmpSnapshot(requireNodeContext(payload, "AMP snapshot"))));
}

module.exports = {
  registerAmpIpc,
};
