const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let mode = "success";

function resultFor(domain) {
  if (mode === "expected") throw Object.assign(new Error("Agent offline"), { code: "AGENT_UNAVAILABLE", statusCode: 503 });
  if (mode === "unexpected") {
    throw Object.assign(new Error(`Authorization: Bearer ${domain}-secret`), { code: `${domain.toUpperCase()}_BROKEN`, statusCode: 500 });
  }
  return { domain, available: true };
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/serviceRouter") {
    return {
      getAmpSnapshot: async () => resultFor("amp"),
      getPlayitSnapshot: async () => resultFor("playit"),
    };
  }
  if (request === "../services/securityService") return { requirePermission: () => {} };
  if (request === "./nodeContext") return { requireNodeContext: (payload) => payload };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/ampIpc").registerAmpIpc();
  require("../src/ipc/playitIpc").registerPlayitIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  for (const [channel, domain] of [["amp:getSnapshot", "amp"], ["playit:getSnapshot", "playit"]]) {
    const handler = handlers.get(channel);
    assert.deepStrictEqual(await handler({}, { nodeId: "node-a" }), { domain, available: true });

    mode = "expected";
    const expected = await handler({}, { nodeId: "node-a" });
    assert.strictEqual(expected.ok, false);
    assert.strictEqual(expected.error.code, "AGENT_UNAVAILABLE");

    mode = "unexpected";
    await assert.rejects(handler({}, { nodeId: "node-a" }), (error) => {
      assert.strictEqual(error.code, `${domain.toUpperCase()}_BROKEN`);
      assert.strictEqual(error.statusCode, 500);
      assert(!JSON.stringify(error).includes(`${domain}-secret`));
      return true;
    });
    mode = "success";
  }
  console.log("Compatibility IPC error contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
