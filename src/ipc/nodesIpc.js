const { ipcMain } = require("electron");
const {
  checkAllNodeHealth,
  checkNodeHealth,
  deleteNode,
  listNodes,
  saveNode,
  testNode,
  testNodeConnectionPayload,
} = require("../services/nodeService");
const { restorePersistedActiveNode, setActiveNode } = require("../services/activeNodeSelectionService");
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
  ipcMain.handle("nodes:restore", async () => invokeNodeOperation(() => restorePersistedActiveNode()));
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
  ipcMain.handle("nodes:select", async (_, payload = {}) => invokeNodeOperation(() => setActiveNode(payload.nodeId || "application-host", { reason: "ipc-select" })));
  ipcMain.handle("nodes:test", async (_, payload = {}) => invokeNodeOperation(() => testNode(payload.nodeId || "application-host")));
  ipcMain.handle("nodes:testConnection", async (_, payload = {}) => invokeNodeOperation(() => testNodeConnectionPayload(payload)));
  ipcMain.handle("nodes:health", async (_, payload = {}) => invokeNodeOperation(() => checkNodeHealth(payload.nodeId || "application-host")));
  ipcMain.handle("nodes:healthAll", async () => invokeNodeOperation(() => checkAllNodeHealth()));
}

module.exports = {
  registerNodesIpc,
};
