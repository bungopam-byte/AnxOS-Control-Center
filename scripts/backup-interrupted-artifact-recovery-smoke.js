const assert = require("assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

async function main() {
  const testRoot = await fs.mkdtemp(path.join(os.tmpdir(), "anx-backup-recovery-"));
  const instanceRoot = path.join(testRoot, "instances");
  const backupRoot = path.join(testRoot, "backups");
  process.env.AGENT_INSTANCE_ROOT = instanceRoot;
  process.env.AGENT_BACKUP_ROOT = backupRoot;

  const backupService = require("../agent/src/services/backupService")._test;
  await fs.mkdir(backupRoot, { recursive: true });
  await fs.writeFile(path.join(backupRoot, "interrupted.tar.gz.123.tmp"), "partial");
  await fs.writeFile(path.join(backupRoot, "orphan.tar.gz"), "partial");
  await fs.writeFile(path.join(backupRoot, "committed.tar.gz"), "archive");
  await fs.writeFile(path.join(backupRoot, "committed.json"), "{}");

  const first = await backupService.recoverBackupArtifacts();
  assert.deepStrictEqual(
    first.removed.map((entry) => entry.reason).sort(),
    ["archive-without-metadata", "temporary-artifact"],
  );
  await assert.rejects(fs.stat(path.join(backupRoot, "interrupted.tar.gz.123.tmp")), { code: "ENOENT" });
  await assert.rejects(fs.stat(path.join(backupRoot, "orphan.tar.gz")), { code: "ENOENT" });
  assert.strictEqual((await fs.stat(path.join(backupRoot, "committed.tar.gz"))).isFile(), true);

  const second = await backupService.recoverBackupArtifacts();
  assert.deepStrictEqual(second, { removed: [] });
  await fs.rm(testRoot, { recursive: true, force: true });
  console.log("Backup interrupted artifact recovery smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
