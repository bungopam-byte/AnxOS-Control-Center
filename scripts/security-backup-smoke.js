const assert = require("assert");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-security-backup-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");
process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");
process.env.AGENT_BACKUP_ROOT = path.join(root, "backups");

const securityPath = require.resolve("../src/services/securityService");
let security = require(securityPath);
const nodeService = require("../src/services/nodeService");
const serviceRouter = require("../src/services/serviceRouter");
const storageConnections = require("../src/services/storageConnectionService");
const { FileService } = require("../src/services/fileService");
const backupService = require("../agent/src/services/backupService");
const { resetLocalPassword } = require("./reset-local-password");

function countAuditActions(action) {
  const auditPath = path.join(process.env.ANXHUB_CONFIG_DIR, "audit.log");
  if (!fs.existsSync(auditPath)) {
    return 0;
  }
  return fs.readFileSync(auditPath, "utf8")
    .trim()
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((entry) => entry.action === action)
    .length;
}

async function main() {
  const firstRunStatus = security.getStatus();
  assert.strictEqual(firstRunStatus.setupRequired, true, "Fresh config should not have Remote Control enabled yet.");
  assert.strictEqual(firstRunStatus.localMode, true, "Fresh config should default to Single-Device Mode.");
  assert.strictEqual(firstRunStatus.authenticated, false, "Single-Device Mode should not require sign-in.");
  assert.strictEqual(security.requirePermission("instance:lifecycle", "local-smoke").localMode, true, "Local mode should allow local actions without an owner account.");
  const defaultNodes = await nodeService.listNodes();
  assert.strictEqual(defaultNodes.selectedNodeId, "application-host", "The selected node should default to the application host.");
  assert(defaultNodes.nodes.some((node) => node.id === "application-host" && node.kind === "application-host"), "The application host should be a distinct visible node.");
  const localInstances = await serviceRouter.listInstances({ nodeId: "application-host" });
  assert(Array.isArray(localInstances.instances), "Dashboard/instances should work against the local node without account/session/token.");
  const localNodeTest = await nodeService.testNode("application-host");
  assert.strictEqual(localNodeTest.connected, true, "The local node health check should pass without contacting an agent.");
  const fileService = new FileService();
  const localFiles = await fileService.list({ storageId: "local", path: root });
  assert.strictEqual(localFiles.provider, "local", "Local provider should list local files through the storage API.");
  const savedStorage = storageConnections.saveConnection({
    provider: "sftp",
    name: "Kinetic Smoke",
    host: "sftp.example.test",
    port: 22,
    username: "abc123",
    authType: "password",
    password: "super-secret-storage-password",
    rootDirectory: "/home/container",
  });
  assert(savedStorage.connection.id, "SFTP storage connection should be saved.");
  const storageFile = fs.readFileSync(path.join(process.env.ANXHUB_CONFIG_DIR, "storage-connections.json"), "utf8");
  assert(!storageFile.includes("super-secret-storage-password"), "Storage credentials must not be stored in plain text.");
  const listedStorage = storageConnections.listConnections();
  assert(listedStorage.connections.some((connection) => connection.provider === "sftp" && connection.hasPassword), "Saved SFTP connection should expose metadata without secrets.");
  assert.strictEqual(storageConnections.deleteConnection(savedStorage.connection.id).deleted, true, "SFTP storage connection delete should work.");

  await security.setupAdmin({ username: "owner", password: "correct horse battery staple", staySignedIn: true });
  const status = security.getStatus();
  assert.strictEqual(status.setupRequired, false, "Owner setup should complete.");
  assert.strictEqual(status.remoteControlEnabled, true, "Owner setup should enable Remote Control.");
  assert.strictEqual(status.user.role, "Owner", "First user should be Owner.");
  assert.strictEqual(status.persistentSession, true, "Stay signed in should create a persistent session.");
  assert.strictEqual(status.persistentSessionCount, 1, "Persistent session should be tracked.");
  const sessionFile = fs.readFileSync(path.join(process.env.ANXHUB_CONFIG_DIR, "session.dat"), "utf8");
  assert(!sessionFile.includes("correct horse battery staple"), "Persistent session file must not contain the password.");
  delete require.cache[securityPath];
  security = require(securityPath);
  const restoredStatus = security.getStatus();
  assert.strictEqual(restoredStatus.authenticated, true, "Persistent session should restore after relaunch.");
  assert.strictEqual(restoredStatus.user.username, "owner", "Restored session should belong to the Owner.");
  const securityConfigPath = path.join(process.env.ANXHUB_CONFIG_DIR, "security.json");
  const securityConfig = JSON.parse(fs.readFileSync(securityConfigPath, "utf8"));
  securityConfig.users[0].passwordHash = bcrypt.hashSync("new correct horse battery staple", 12);
  fs.writeFileSync(securityConfigPath, `${JSON.stringify(securityConfig, null, 2)}\n`);
  delete require.cache[securityPath];
  security = require(securityPath);
  const passwordChangedStatus = security.getStatus();
  assert.strictEqual(passwordChangedStatus.authenticated, false, "Owner password changes should invalidate remembered sessions.");
  await security.login({ username: "owner", password: "new correct horse battery staple", staySignedIn: true });
  delete require.cache[securityPath];
  security = require(securityPath);
  assert.strictEqual(security.getStatus().authenticated, true, "New remembered session should restore.");
  security.logoutAllSessions();
  delete require.cache[securityPath];
  security = require(securityPath);
  const invalidatedStatus = security.getStatus();
  assert.strictEqual(invalidatedStatus.authenticated, false, "Log out of all sessions should invalidate persistent restore.");
  await security.login({ username: "owner", password: "new correct horse battery staple" });
  const rotated = security.rotateAgentToken();
  assert.strictEqual(rotated.configured, true, "Agent token should be rotated through the shared token store.");
  assert(rotated.fingerprint && !rotated.token, "Agent token rotation should return only safe status metadata.");
  assert.strictEqual(rotated.restartRequired, true, "Agent token rotation should require app and agent restart.");
  const nodes = await nodeService.listNodes();
  assert(nodes.nodes.some((node) => node.kind === "application-host"), "Security context should retain the explicit application host node.");
  security.logout();
  await assert.rejects(
    () => security.login({ username: "owner", password: "wrong password 1" }),
    /Invalid username or password/,
    "A failed login should be rejected without logging in.",
  );
  await assert.rejects(
    () => security.login({ username: "owner", password: "wrong password 2" }),
    /Invalid username or password/,
    "A second failed login should be rejected.",
  );
  await security.login({ username: "owner", password: "new correct horse battery staple" });
  const loginAuditCount = countAuditActions("security.login");
  await security.login({ username: "owner", password: "wrong password while already signed in" });
  assert.strictEqual(
    countAuditActions("security.login"),
    loginAuditCount,
    "Duplicate login calls while already authenticated should not create extra login audit entries.",
  );
  security.logout();
  await security.login({ username: "owner", password: "new correct horse battery staple" });
  security.logout();
  for (let index = 0; index < 6; index += 1) {
    await assert.rejects(
      () => security.login({ username: "owner", password: `wrong password ${index + 3}` }),
      /Invalid username or password/,
      "Failed login attempts before the limit should return credential errors.",
    );
  }
  await assert.rejects(
    () => security.login({ username: "owner", password: "new correct horse battery staple" }),
    /Too many requests|RATE_LIMITED/,
    "Rate limiting should only block after genuine repeated failed attempts.",
  );

  const securityFile = path.join(process.env.ANXHUB_CONFIG_DIR, "security.json");
  fs.writeFileSync(path.join(process.env.ANXHUB_CONFIG_DIR, "session.dat"), "stale-session");
  const resetResult = resetLocalPassword({
    securityPath: securityFile,
    username: "owner",
    password: "reset correct horse battery",
  });
  assert(fs.existsSync(resetResult.backupPath), "Password reset should create a security.json backup.");
  assert(!fs.existsSync(path.join(process.env.ANXHUB_CONFIG_DIR, "session.dat")), "Password reset should clear remembered session data.");
  delete require.cache[securityPath];
  security = require(securityPath);
  await security.login({ username: "owner", password: "reset correct horse battery" });
  security.logout();

  security.checkRateLimit("smoke-limit", 1, 60000);
  assert.throws(() => security.checkRateLimit("smoke-limit", 1, 60000), /Too many requests|RATE_LIMITED/);

  const instanceId = "smoke-instance";
  const instancePath = path.join(process.env.AGENT_INSTANCE_ROOT, instanceId);
  fs.mkdirSync(path.join(instancePath, "data", "world"), { recursive: true });
  fs.writeFileSync(path.join(instancePath, "config.json"), JSON.stringify({ id: instanceId, displayName: "Smoke", state: "Stopped" }));
  fs.writeFileSync(path.join(instancePath, "data", "world", "level.dat"), "world");

  const created = await backupService.createBackup({ instanceId, type: "world", name: "Smoke world", createdBy: "smoke" });
  assert(created.backup.id, "Backup should have an id.");
  assert.strictEqual(created.backup.type, "world", "World backup type should persist.");
  assert(created.backup.sourcePaths.includes("data/world"), "World backup should include world path.");
  assert(created.backup.uncompressedSize >= 5, "Backup metadata should include uncompressed size.");
  assert(created.backup.requiredDiskSpace >= created.backup.uncompressedSize, "Backup metadata should include required restore disk space.");
  const list = await backupService.listBackups({ instanceId });
  assert.strictEqual(list.backups.length, 1, "Backup list should include created backup.");
  assert.strictEqual(list.backups[0].entryCount > 0, true, "Backup list should preserve archive entry count.");
  fs.writeFileSync(path.join(instancePath, "data", "world", "level.dat"), "changed");
  await assert.rejects(
    () => backupService.restoreBackup({ backupId: created.backup.id }),
    (error) => error?.code === "RESTORE_OVERWRITE_CONFIRMATION_REQUIRED",
    "Restore should require explicit overwrite confirmation.",
  );
  const restored = await backupService.restoreBackup({ backupId: created.backup.id, confirmOverwrite: true });
  assert.strictEqual(restored.restore.instanceId, instanceId, "Restore should target the original instance.");
  assert(restored.restore.safetyBackupId, "Restore should create a safety snapshot before replacing files.");
  assert.strictEqual(fs.readFileSync(path.join(instancePath, "data", "world", "level.dat"), "utf8"), "world", "World restore should replace changed world files.");
  const imported = await backupService.importBackup({
    instanceId,
    content: fs.readFileSync(list.backups[0].path).toString("base64"),
    encoding: "base64",
    name: "Imported smoke backup",
  });
  assert.strictEqual(imported.backup.status, "imported", "Valid imported archives should be accepted.");
  await assert.rejects(
    () => backupService.importBackup({ instanceId, content: Buffer.from("not a tarball").toString("base64"), encoding: "base64" }),
    (error) => error?.code === "BACKUP_ARCHIVE_INVALID",
    "Invalid imported archives should be rejected.",
  );
  const schedule = await backupService.saveSchedule({ instanceId, intervalHours: 24, keepLast: 3, maxAgeDays: 7, type: "world" });
  assert.strictEqual(schedule.schedule.instanceId, instanceId, "Schedule should target the instance.");
  const schedules = await backupService.listSchedules();
  assert.strictEqual(schedules.schedules.length, 1, "Schedule list should include saved schedule.");
  await backupService.deleteSchedule(instanceId);
  assert.strictEqual((await backupService.listSchedules()).schedules.length, 0, "Schedule delete should remove saved schedule.");
  await backupService.deleteBackup(created.backup.id);
  await backupService.deleteBackup(imported.backup.id);
  await backupService.deleteBackup(restored.restore.safetyBackupId);
  const afterDelete = await backupService.listBackups({ instanceId });
  assert.strictEqual(afterDelete.backups.length, 0, "Backup delete should remove metadata and archive.");
  const staleDelete = await backupService.deleteBackup(created.backup.id);
  assert.strictEqual(staleDelete.alreadyDeleted, true, "Deleting a stale backup should be idempotent.");

  const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  [
    "function promptBackupText",
    "function chooseBackupType",
    "function parseBackupWholeNumber",
    "createSecurityTextPrompt({ title, message, label, initialValue, confirmLabel })",
    "Restart after restore?",
    "Backup schedule values are invalid.",
  ].forEach((needle) => assert(appSource.includes(needle), `Backup renderer modal guard missing: ${needle}`));
  [
    "createBackupForInstance",
    "restoreSelectedBackup",
    "importBackupForInstance",
    "configureBackupSchedule",
  ].forEach((functionName) => {
    const start = appSource.indexOf(`async function ${functionName}`);
    assert(start >= 0, `Renderer should define ${functionName}.`);
    const open = appSource.indexOf("{", start);
    let depth = 0;
    let body = "";
    for (let index = open; index < appSource.length; index += 1) {
      const char = appSource[index];
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          body = appSource.slice(start, index + 1);
          break;
        }
      }
    }
    assert(!/window\.prompt|prompt\(|window\.confirm|confirm\(/.test(body), `${functionName} should use AnxOS modals instead of browser dialogs.`);
  });

  fs.rmSync(root, { recursive: true, force: true });
  console.log("Security and backup smoke checks passed.");
}

main().catch((error) => {
  try {
    fs.rmSync(root, { recursive: true, force: true });
  } catch {}
  console.error(error);
  process.exit(1);
});
