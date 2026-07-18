const assert = require("assert");
const fs = require("fs/promises");
const Module = require("module");
const os = require("os");
const path = require("path");
const { MAX_BACKUP_ARCHIVE_BYTES } = require("../src/shared/backupLimits");

const handlers = new Map();
let openPath = null;
let savePath = null;
let importCalls = 0;
let importedPayload = null;

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") {
    return {
      dialog: {
        showOpenDialog: async () => ({ canceled: false, filePaths: [openPath] }),
        showSaveDialog: async () => ({ canceled: false, filePath: savePath }),
      },
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    };
  }
  if (request === "../services/serviceRouter") {
    return {
      createBackup: async () => ({}),
      deleteBackup: async () => ({}),
      deleteBackupSchedule: async () => ({}),
      downloadBackup: async () => ({ buffer: Buffer.from("archive-content") }),
      importBackup: async (payload) => {
        importCalls += 1;
        importedPayload = payload;
        return { backup: { id: "imported-backup" } };
      },
      listBackupSchedules: async () => [],
      listBackups: async () => [],
      restoreBackup: async () => ({}),
      saveBackupSchedule: async () => ({}),
    };
  }
  if (request === "../services/securityService") return { audit: () => {}, requirePermission: () => {} };
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
  const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anx-backup-transfer-"));
  try {
    savePath = path.join(testRoot, "export.tar.gz");
    const download = await handlers.get("backups:download")({}, { backupId: "backup-a", nodeId: "node-a" });
    assert.strictEqual(download.canceled, false);
    assert.strictEqual(await fs.readFile(savePath, "utf8"), "archive-content");
    assert.deepStrictEqual((await fs.readdir(testRoot)).filter((name) => name.endsWith(".tmp")), []);

    openPath = path.join(testRoot, "import.tar.gz");
    await fs.writeFile(openPath, "valid-small-archive");
    await handlers.get("backups:import")({}, { instanceId: "instance-a", nodeId: "node-a" });
    assert.strictEqual(importCalls, 1);
    assert.strictEqual(Buffer.from(importedPayload.content, "base64").toString("utf8"), "valid-small-archive");

    const oversizedPath = path.join(testRoot, "oversized.tar.gz");
    const handle = await fs.open(oversizedPath, "w");
    await handle.truncate(MAX_BACKUP_ARCHIVE_BYTES + 1);
    await handle.close();
    openPath = oversizedPath;
    await assert.rejects(
      handlers.get("backups:import")({}, { instanceId: "instance-a", nodeId: "node-a" }),
      (error) => error?.code === "BACKUP_ARCHIVE_LIMIT_EXCEEDED",
      "Desktop backup import must reject oversized archives before reading or forwarding them.",
    );
    assert.strictEqual(importCalls, 1, "Oversized backup imports must not reach the Agent service.");

    console.log("Backup transfer safety smoke checks passed.");
  } finally {
    await fs.rm(testRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
