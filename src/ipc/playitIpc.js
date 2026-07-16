const { ipcMain } = require("electron");
const { getPlayitSnapshot } = require("../services/serviceRouter");
const { requirePermission } = require("../services/securityService");
const { requireNodeContext } = require("./nodeContext");
const { wrapExpectedAgentRead } = require("./expectedAgentError");

function registerPlayitIpc() {
  ipcMain.handle("playit:getSnapshot", async (_, payload = {}) => wrapExpectedAgentRead("playit:getSnapshot", () => {
    requirePermission("public-access:read", payload.nodeId);
    requireNodeContext(payload, "Playit snapshot");
    return getPlayitSnapshot(payload);
  }, { code: "PLAYIT_REQUEST_FAILED", fallbackMessage: "Playit request failed.", suggestion: "Verify the selected node and Playit installation, then retry." }));
}

module.exports = {
  registerPlayitIpc,
};
