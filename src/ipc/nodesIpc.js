const { ipcMain } = require("electron");
const {
  checkAllNodeHealth,
  checkNodeHealth,
  deleteNode,
  getNodeCredentialStatus,
  listNodes,
  pairNodeFromCode,
  repairNodeCredential,
  saveNode,
  testNode,
  testNodeConnectionPayload,
} = require("../services/nodeService");
const { restorePersistedActiveNode, setActiveNode } = require("../services/activeNodeSelectionService");
const { generateAgentToken } = require("../shared/agentTokenStore");
const { audit, requirePermission } = require("../services/securityService");
const { requireNodeContext } = require("./nodeContext");

function getNodeErrorMessage(error) {
  return error?.message || error?.code || "Node request failed.";
}

async function invokeNodeOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    const wrapped = new Error(getNodeErrorMessage(error));
    wrapped.code = error?.code || "NODE_OPERATION_FAILED";
    wrapped.statusCode = error?.statusCode || error?.status || null;
    wrapped.details = error?.details || null;
    throw wrapped;
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
    const context = requireNodeContext(payload, "node deletion");
    requirePermission("settings:write", context.nodeId);
    audit({ action: "node.delete", target: context.nodeId });
    return deleteNode(context.nodeId);
  }));
  ipcMain.handle("nodes:select", async (_, payload = {}) => invokeNodeOperation(() => setActiveNode(requireNodeContext(payload, "node selection").nodeId, { reason: "ipc-select" })));
  ipcMain.handle("nodes:test", async (_, payload = {}) => invokeNodeOperation(() => testNode(requireNodeContext(payload, "node connection test").nodeId)));
  ipcMain.handle("nodes:testConnection", async (_, payload = {}) => invokeNodeOperation(() => testNodeConnectionPayload(payload)));
  ipcMain.handle("nodes:health", async (_, payload = {}) => invokeNodeOperation(() => checkNodeHealth(requireNodeContext(payload, "node health check").nodeId)));
  ipcMain.handle("nodes:healthAll", async () => invokeNodeOperation(() => checkAllNodeHealth()));
  ipcMain.handle("nodes:credentialStatus", async (_, payload = {}) => invokeNodeOperation(() => getNodeCredentialStatus(requireNodeContext(payload, "node credential status").nodeId)));
  ipcMain.handle("nodes:repairCredential", async (_, payload = {}) => invokeNodeOperation(() => {
    const context = requireNodeContext(payload, "node credential repair");
    requirePermission("settings:write", context.nodeId);
    audit({ action: "node.repair-credential", target: context.nodeId });
    return repairNodeCredential(context);
  }));
  ipcMain.handle("nodes:generateToken", async () => invokeNodeOperation(() => {
    requirePermission("settings:write", "nodes");
    audit({ action: "node.generate-token", target: "node-agent-token" });
    return { token: generateAgentToken(), tokenFormat: "anxos-base64url-v1" };
  }));
  ipcMain.handle("nodes:pair", async (_, payload = {}) => invokeNodeOperation(async () => {
    requirePermission("settings:write", "nodes");
    const paired = await pairNodeFromCode(payload);
    audit({ action: "node.pair-agent", target: paired.node?.id || paired.selectedNodeId || "paired-node" });
    return setActiveNode(paired.selectedNodeId, { reason: "agent-pairing", state: paired });
  }));
}

module.exports = {
  registerNodesIpc,
};
