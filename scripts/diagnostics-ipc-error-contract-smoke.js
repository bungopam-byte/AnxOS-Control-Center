const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let shouldFail = false;
const diagnostics = {
  captureSnapshot: () => {
    if (shouldFail) {
      throw Object.assign(new Error("Authorization: Bearer diagnostic-secret"), {
        code: "DIAGNOSTIC_CAPTURE_FAILED",
        statusCode: 500,
        details: { diagnostics: { password: "hidden", source: "runtime-state" } },
      });
    }
    return { runtimeState: { applicationRunning: true } };
  },
  copySummary: async () => "summary",
  exportBundle: async () => ({}),
  log: () => ({}),
  openFolder: async () => ({}),
  readLogs: () => ({}),
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") {
    return {
      BrowserWindow: { fromWebContents: () => null },
      clipboard: { writeText: () => {} },
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler), on: () => {} },
    };
  }
  if (request === "../services/diagnosticsService") return diagnostics;
  if (request === "../services/securityService") return { checkRateLimit: () => {}, requirePermission: () => ({ role: "Owner" }) };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/diagnosticsIpc").registerDiagnosticsIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const handler = handlers.get("diagnostics:capture");
  assert.deepStrictEqual(await handler({}, {}), { runtimeState: { applicationRunning: true } });
  shouldFail = true;
  await assert.rejects(handler({}, {}), (error) => {
    assert.strictEqual(error.code, "DIAGNOSTIC_CAPTURE_FAILED");
    assert.strictEqual(error.statusCode, 500);
    const serialized = JSON.stringify(error);
    assert(!serialized.includes("diagnostic-secret"));
    assert(!serialized.includes("hidden"));
    assert(serialized.includes("[redacted]"));
    return true;
  });
  console.log("Diagnostics IPC error contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
