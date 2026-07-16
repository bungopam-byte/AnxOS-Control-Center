const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;
const serviceRouter = new Proxy({}, { get: () => async () => { serviceInvoked = true; return {}; } });
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/serviceRouter") return serviceRouter;
  if (request === "../services/securityService") return { audit: () => {}, requirePermission: () => { throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" }); } };
  if (request === "./expectedAgentError") return { wrapExpectedAgentRead: async (_channel, task) => task() };
  if (request === "./nodeContext") return { requireNodeContext: (payload) => payload };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/dockerIpc").registerDockerIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const channels = ["docker:getSnapshot", "docker:listContainers", "docker:inspectContainer", "docker:listImages", "docker:inspectImage", "docker:listNetworks", "docker:listVolumes", "docker:getLogs", "docker:getStats", "docker:inspectVolume", "docker:inspectNetwork", "docker:listComposeProjects", "docker:getCleanupPreview"];
  for (const channel of channels) {
    serviceInvoked = false;
    const handler = handlers.get(channel);
    assert(handler, `${channel} should be registered.`);
    await assert.rejects(
      () => handler({}, { nodeId: "node-a", container: "container-a", image: "image-a", volume: "volume-a", network: "network-a" }),
      (error) => error?.code === "PERMISSION_DENIED",
      `${channel} should reject an unauthorized renderer request.`,
    );
    assert.strictEqual(serviceInvoked, false, `${channel} must authorize before querying Docker.`);
  }
  console.log("Docker IPC authorization smoke checks passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
