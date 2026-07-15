const { ipcMain } = require("electron");
const { getSystemSnapshot } = require("../services/systemService");
const { wrapExpectedAgentRead } = require("./expectedAgentError");
const { requireNodeContext } = require("./nodeContext");

function registerSystemIpc() {
  ipcMain.handle("system:getSnapshot", async (_, payload = {}) => wrapExpectedAgentRead("system:getSnapshot", () => getSystemSnapshot(requireNodeContext(payload, "system metrics"))));
}

module.exports = {
  registerSystemIpc,
};
