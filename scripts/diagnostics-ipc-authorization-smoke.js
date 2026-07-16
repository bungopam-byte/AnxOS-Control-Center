const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;
const diagnostics = {
  log: () => ({ ok: true }),
  captureSnapshot: () => { serviceInvoked = true; return {}; },
  readLogs: () => { serviceInvoked = true; return {}; },
  openFolder: async () => { serviceInvoked = true; return {}; },
  copySummary: async () => { serviceInvoked = true; return "summary"; },
  exportBundle: async () => { serviceInvoked = true; return {}; },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") {
    return {
      BrowserWindow: { fromWebContents: () => null },
      clipboard: { writeText: () => {} },
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    };
  }
  if (request === "../services/diagnosticsService") return diagnostics;
  if (request === "../services/securityService") {
    return {
      requirePermission: () => {
        throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" });
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/diagnosticsIpc").registerDiagnosticsIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  for (const channel of ["diagnostics:capture", "diagnostics:read", "diagnostics:openFolder", "diagnostics:copySummary", "diagnostics:export"]) {
    serviceInvoked = false;
    const handler = handlers.get(channel);
    assert(handler, `${channel} should be registered.`);
    await assert.rejects(
      () => Promise.resolve().then(() => handler({ sender: {} }, {})),
      (error) => error?.code === "PERMISSION_DENIED",
      `${channel} should reject an unauthorized renderer request.`,
    );
    assert.strictEqual(serviceInvoked, false, `${channel} must authorize before accessing diagnostics.`);
  }
  console.log("Diagnostics IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
