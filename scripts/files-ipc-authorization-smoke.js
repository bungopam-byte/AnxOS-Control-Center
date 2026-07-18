const assert = require("assert");
const { EventEmitter } = require("events");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;
class MockFileService extends EventEmitter {
  async list() { serviceInvoked = true; return {}; }
  async identity() { serviceInvoked = true; return {}; }
  disconnect() { serviceInvoked = true; return {}; }
  async readText() { serviceInvoked = true; return {}; }
  async download() { serviceInvoked = true; return {}; }
  dispose() {}
}
const storageService = {
  deleteConnection: () => ({}),
  listConnections: () => { serviceInvoked = true; return {}; },
  saveConnection: () => ({}),
  setDefaultConnection: () => ({}),
  testConnection: async () => { serviceInvoked = true; return {}; },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { BrowserWindow: { getAllWindows: () => [] }, ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/fileService") return { FileService: MockFileService };
  if (request === "../services/storageConnectionService") return storageService;
  if (request === "../services/securityService") {
    return {
      audit: () => {},
      checkRateLimit: () => {},
      requirePermission: () => { throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" }); },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/filesIpc").registerFilesIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  for (const channel of ["files:list", "files:identity", "files:listConnections", "files:testConnection", "files:disconnect", "files:readText", "files:download"]) {
    serviceInvoked = false;
    const handler = handlers.get(channel);
    assert(handler, `${channel} should be registered.`);
    await assert.rejects(
      () => handler({}, { nodeId: "node-a", storageId: "storage-a", profileId: "profile-a", id: "storage-a", host: "host.test", path: "/private/file" }),
      (error) => error?.code === "PERMISSION_DENIED",
      `${channel} should reject an unauthorized renderer request.`,
    );
    assert.strictEqual(serviceInvoked, false, `${channel} must authorize before accessing files or opening a connection.`);
  }
  console.log("Files IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
