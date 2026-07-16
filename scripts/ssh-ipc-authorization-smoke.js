const assert = require("assert");
const { EventEmitter } = require("events");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;

class MockSshService extends EventEmitter {
  async listProfiles() { serviceInvoked = true; return []; }
  async saveProfile() { serviceInvoked = true; return {}; }
  async connect() { serviceInvoked = true; return {}; }
  async disconnect() { serviceInvoked = true; return {}; }
  async write() { serviceInvoked = true; return {}; }
  async resize() { serviceInvoked = true; return {}; }
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
  if (request === "../services/sshService") return { SshService: MockSshService };
  if (request === "../services/securityService") {
    return {
      audit: () => {},
      checkRateLimit: () => {},
      requirePermission: () => {
        throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" });
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/sshIpc").registerSshIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  for (const channel of ["ssh:saveProfile", "ssh:connect", "ssh:disconnect", "ssh:write"]) {
    serviceInvoked = false;
    const handler = handlers.get(channel);
    assert(handler, `${channel} should be registered.`);
    await assert.rejects(
      () => handler({}, { id: "profile-a", profileId: "profile-a", host: "host.test", sessionId: "session-a", input: "whoami\n" }),
      (error) => error?.code === "PERMISSION_DENIED",
      `${channel} should reject an unauthorized renderer request.`,
    );
    assert.strictEqual(serviceInvoked, false, `${channel} must authorize before calling its service.`);
  }
  console.log("SSH IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
