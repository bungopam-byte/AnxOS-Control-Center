const { ipcMain } = require("electron");
const { getPlayitSnapshot } = require("../services/serviceRouter");
const { requirePermission } = require("../services/securityService");
const { requireNodeContext } = require("./nodeContext");

function registerPlayitIpc() {
  ipcMain.handle("playit:getSnapshot", async (_, payload = {}) => {
    requirePermission("public-access:read", payload.nodeId);
    requireNodeContext(payload, "Playit snapshot");
    return getPlayitSnapshot(payload);
  });
}

module.exports = {
  registerPlayitIpc,
};
