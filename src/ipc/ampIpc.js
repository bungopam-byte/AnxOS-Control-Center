const { ipcMain } = require("electron");
const { getAmpSnapshot } = require("../services/serviceRouter");
const { wrapExpectedAgentRead } = require("./expectedAgentError");
const { requireNodeContext } = require("./nodeContext");
const { requirePermission } = require("../services/securityService");

function registerAmpIpc() {
  ipcMain.handle("amp:getSnapshot", async (_, payload = {}) => wrapExpectedAgentRead(
    "amp:getSnapshot",
    () => { requirePermission("instance:read", payload.nodeId); return getAmpSnapshot(requireNodeContext(payload, "AMP snapshot")); },
    { code: "AMP_REQUEST_FAILED", fallbackMessage: "AMP request failed.", suggestion: "Verify the selected node and AMP configuration, then retry." },
  ));
}

module.exports = {
  registerAmpIpc,
};
