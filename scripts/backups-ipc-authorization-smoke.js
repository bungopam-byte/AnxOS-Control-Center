const assert = require("assert");
const Module = require("module");

const handlers = new Map();
let serviceInvoked = false;
const serviceRouter = {
  createBackup: async () => {},
  deleteBackup: async () => {},
  deleteBackupSchedule: async () => {},
  downloadBackup: async () => { serviceInvoked = true; return { buffer: Buffer.from("backup") }; },
  importBackup: async () => { serviceInvoked = true; return {}; },
  listBackupSchedules: async () => [],
  listBackups: async () => [],
  restoreBackup: async () => {},
  saveBackupSchedule: async () => {},
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") {
    return {
      dialog: { showOpenDialog: async () => ({ canceled: true }), showSaveDialog: async () => ({ canceled: true }) },
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    };
  }
  if (request === "../services/serviceRouter") return serviceRouter;
  if (request === "../services/securityService") {
    return {
      audit: () => {},
      requirePermission: () => {
        throw Object.assign(new Error("Permission denied."), { code: "PERMISSION_DENIED" });
      },
    };
  }
  if (request === "./expectedAgentError") return { wrapExpectedAgentRead: async (_channel, task) => task() };
  if (request === "./nodeContext") return { requireNodeContext: (payload) => payload };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/backupsIpc").registerBackupsIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  for (const channel of ["backups:download", "backups:import"]) {
    serviceInvoked = false;
    const handler = handlers.get(channel);
    assert(handler, `${channel} should be registered.`);
    await assert.rejects(
      () => handler({}, { nodeId: "agent-a", instanceId: "instance-a", backupId: "backup-a" }),
      /Permission denied/,
      `${channel} should reject an unauthorized renderer request.`,
    );
    assert.strictEqual(serviceInvoked, false, `${channel} must authorize before reading an archive or opening a file picker.`);
  }
  console.log("Backup IPC authorization smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
