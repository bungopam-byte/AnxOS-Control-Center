const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/actionRouter") {
    return { executeAction: async () => { serviceInvoked = true; return {}; } };
  }
  if (request === "../services/securityService") {
    return {
      audit: () => {},
      requirePermission: () => {
        throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" });
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

let actionIpc;
try {
  actionIpc = require("../src/ipc/actionIpc");
  actionIpc.registerActionIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const handler = handlers.get("action:execute");
  assert(handler, "Generic action execution should be registered.");
  for (const actionId of actionIpc.ACTION_PERMISSIONS.keys()) {
    serviceInvoked = false;
    await assert.rejects(
      () => handler({}, { actionId, nodeId: "agent-a", params: {} }),
      (error) => error?.code === "PERMISSION_DENIED",
      `${actionId} should reject an unauthorized renderer request.`,
    );
    assert.strictEqual(serviceInvoked, false, `${actionId} must authorize before reaching the Agent.`);
  }
  await assert.rejects(
    () => handler({}, { actionId: "future.destructive", nodeId: "agent-a" }),
    (error) => error?.code === "ACTION_NOT_ALLOWED",
    "Unknown action IDs must fail closed.",
  );
  assert.strictEqual(serviceInvoked, false, "Unknown actions must not reach the Agent.");
  console.log("Action IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
