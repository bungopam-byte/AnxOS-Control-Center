const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;
const serviceProxy = new Proxy({}, {
  get: () => async () => {
    serviceInvoked = true;
    return { ok: true };
  },
});

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (["../services/serviceRouter", "../services/publicAccessProviderService"].includes(request)) return serviceProxy;
  if (request === "../services/securityService") return {
    audit: () => {},
    requirePermission: () => { throw Object.assign(new Error("Permission denied"), { code: "PERMISSION_DENIED" }); },
  };
  if (request === "./nodeContext") return { requireNodeContext: (payload) => payload };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/publicAccessIpc").registerPublicAccessIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  for (const channel of ["publicAccess:createService", "publicAccess:deleteService", "publicAccess:createFirewallRule"]) {
    serviceInvoked = false;
    const handler = handlers.get(channel);
    assert(handler, `${channel} should be registered.`);
    const result = await handler({}, { nodeId: "node-a", providerId: "playit", serviceId: "service-a", port: 25565 });
    assert.strictEqual(result.ok, false, `${channel} should preserve its existing failure envelope.`);
    assert.strictEqual(result.error.code, "PERMISSION_DENIED", `${channel} should report the authorization denial.`);
    assert.strictEqual(serviceInvoked, false, `${channel} must authorize before changing public access.`);
  }
  console.log("Public Access IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
