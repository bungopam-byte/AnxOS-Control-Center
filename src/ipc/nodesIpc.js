const { ipcMain } = require("electron");
const {
  deleteNode,
  listNodes,
  saveNode,
  selectNode,
  testNode,
} = require("../services/nodeService");
const { audit, requirePermission } = require("../services/securityService");

function getNodeErrorMessage(error) {
  return error?.message || error?.code || "Node request failed.";
}

async function invokeNodeOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getNodeErrorMessage(error));
  }
}

function registerNodesIpc() {
  ipcMain.handle("nodes:list", async () => invokeNodeOperation(() => listNodes()));
  ipcMain.handle("nodes:save", async (_, payload = {}) => invokeNodeOperation(() => {
    requirePermission("settings:write", "nodes");
    audit({ action: "node.save", target: payload.id || payload.agentUrl });
    return saveNode(payload);
  }));
  ipcMain.handle("nodes:delete", async (_, payload = {}) => invokeNodeOperation(() => {
    requirePermission("settings:write", payload.nodeId);
    audit({ action: "node.delete", target: payload.nodeId });
    return deleteNode(payload.nodeId);
  }));
  ipcMain.handle("nodes:select", async (_, payload = {}) => invokeNodeOperation(() => selectNode(payload.nodeId || "application-host")));
  ipcMain.handle("nodes:test", async (_, payload = {}) => invokeNodeOperation(() => testNode(payload.nodeId || "application-host")));
}

module.exports = {
  registerNodesIpc,
};
