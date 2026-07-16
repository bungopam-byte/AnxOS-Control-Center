const { ipcMain } = require("electron");
const { getSystemSnapshot } = require("../services/systemService");
const { wrapExpectedAgentRead } = require("./expectedAgentError");
const { requireNodeContext } = require("./nodeContext");
const { requirePermission } = require("../services/securityService");

function registerSystemIpc() {
  ipcMain.handle("system:getSnapshot", async (_, payload = {}) => wrapExpectedAgentRead("system:getSnapshot", () => { requirePermission("system:read", payload.nodeId); return getSystemSnapshot(requireNodeContext(payload, "system metrics")); }));
}

module.exports = {
  registerSystemIpc,
};
