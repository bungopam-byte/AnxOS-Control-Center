const { ipcMain } = require("electron");
const { getAmpSnapshot } = require("../services/serviceRouter");
const { wrapExpectedAgentRead } = require("./expectedAgentError");
const { requireNodeContext } = require("./nodeContext");
const { requirePermission } = require("../services/securityService");

function registerAmpIpc() {
  ipcMain.handle("amp:getSnapshot", async (_, payload = {}) => wrapExpectedAgentRead("amp:getSnapshot", () => { requirePermission("instance:read", payload.nodeId); return getAmpSnapshot(requireNodeContext(payload, "AMP snapshot")); }));
}

module.exports = {
  registerAmpIpc,
};
