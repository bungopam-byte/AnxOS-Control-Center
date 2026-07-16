const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;
const nodeService = new Proxy({}, {
  get: () => async () => { serviceInvoked = true; return {}; },
});
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/nodeService") return nodeService;
  if (request === "../services/activeNodeSelectionService") return { restorePersistedActiveNode: async () => ({}), setActiveNode: async () => ({}) };
  if (request === "../shared/agentTokenStore") return { generateAgentToken: () => "test-token" };
  if (request === "../services/securityService") {
    return {
      audit: () => {},
      requirePermission: () => { throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" }); },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/nodesIpc").registerNodesIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const handler = handlers.get("nodes:testConnection");
  assert(handler, "Node connection-test handler should be registered.");
  await assert.rejects(
    () => handler({}, { agentUrl: "https://internal.example.test", agentToken: "hidden" }),
    (error) => error?.code === "PERMISSION_DENIED",
    "Node connection tests should reject an unauthorized renderer request.",
  );
  assert.strictEqual(serviceInvoked, false, "Node connection tests must authorize before making an outbound request.");
  console.log("Node IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
