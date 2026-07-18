const assert = require("assert");
const { EventEmitter } = require("events");
const Module = require("module");

const handlers = new Map();
let shouldFail = false;

class FakeFileService extends EventEmitter {
  async list() {
    if (shouldFail) {
      throw Object.assign(new Error("password=hunter2 Authorization: Bearer file-secret"), {
        code: "PATH_NOT_ALLOWED",
        statusCode: 403,
        details: {
          nodeId: "node-a",
          causeCode: "SYMLINK_ESCAPE",
          diagnostics: { token: "file-secret", path: "/outside" },
          suggestion: "Choose a path inside the configured root.",
        },
      });
    }
    return { connected: true, entries: [{ name: "safe.txt" }] };
  }
  dispose() {}
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") {
    return {
      BrowserWindow: { getAllWindows: () => [] },
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    };
  }
  if (request === "../services/fileService") return { FileService: FakeFileService };
  if (request === "../services/storageConnectionService") {
    return {
      deleteConnection: async () => ({}),
      listConnections: async () => [],
      saveConnection: async () => ({}),
      setDefaultConnection: async () => ({}),
      testConnection: async () => ({}),
    };
  }
  if (request === "../services/securityService") {
    return { audit: () => {}, checkRateLimit: () => {}, requirePermission: () => {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/filesIpc").registerFilesIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const handler = handlers.get("files:list");
  assert(handler, "Files listing handler should be registered.");
  assert.deepStrictEqual(
    await handler({}, { path: "/safe" }),
    { connected: true, entries: [{ name: "safe.txt" }] },
    "Files IPC migration must not change successful response shapes.",
  );

  shouldFail = true;
  await assert.rejects(handler({}, { path: "/outside" }), (error) => {
    assert.strictEqual(error.code, "PATH_NOT_ALLOWED");
    assert.strictEqual(error.statusCode, 403);
    assert.strictEqual(error.retryable, false);
    assert.strictEqual(error.details.causeCode, "SYMLINK_ESCAPE");
    assert.strictEqual(error.details.suggestion, "Choose a path inside the configured root.");
    const serialized = JSON.stringify(error);
    assert(!serialized.includes("hunter2"));
    assert(!serialized.includes("file-secret"));
    assert(serialized.includes("[redacted]"));
    return true;
  });
  console.log("Files IPC error contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
