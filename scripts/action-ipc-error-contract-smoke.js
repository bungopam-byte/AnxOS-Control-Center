const assert = require("assert");
const Module = require("module");

const handlers = new Map();
const rateLimits = [];
let failExecution = false;

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/actionRouter") {
    return {
      executeAction: async () => {
        if (failExecution) throw Object.assign(new Error("token=action-secret"), { code: "ACTION_PROVIDER_FAILED", statusCode: 502 });
        return { actionId: "docker.start", status: "accepted" };
      },
    };
  }
  if (request === "../services/securityService") {
    return {
      audit: () => {},
      checkRateLimit: (...args) => rateLimits.push(args),
      requirePermission: () => ({ role: "Owner" }),
    };
  }
  if (request === "./nodeContext") return { requireNodeContext: (payload) => payload };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/actionIpc").registerActionIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const handler = handlers.get("action:execute");
  assert.deepStrictEqual(
    await handler({}, { actionId: "docker.start", nodeId: "node-a", params: {} }),
    { actionId: "docker.start", status: "accepted" },
  );
  assert.deepStrictEqual(rateLimits[0], ["action:docker.start", 60, 60000]);

  failExecution = true;
  await assert.rejects(handler({}, { actionId: "backup.restore", nodeId: "node-a", params: {} }), (error) => {
    assert.strictEqual(error.code, "ACTION_PROVIDER_FAILED");
    assert.strictEqual(error.statusCode, 502);
    assert(!JSON.stringify(error).includes("action-secret"));
    return true;
  });
  assert.deepStrictEqual(rateLimits[1], ["action:backup.restore", 5, 60000]);
  console.log("Action IPC error contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
