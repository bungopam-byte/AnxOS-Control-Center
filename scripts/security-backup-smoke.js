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

async function main() {
  const firstRunStatus = security.getStatus();
  assert.strictEqual(firstRunStatus.setupRequired, true, "Fresh config should not have Remote Control enabled yet.");
  assert.strictEqual(firstRunStatus.localMode, true, "Fresh config should default to Single-Device Mode.");
  assert.strictEqual(firstRunStatus.authenticated, false, "Single-Device Mode should not require sign-in.");
  assert.strictEqual(security.requirePermission("instance:lifecycle", "local-smoke").localMode, true, "Local mode should allow local actions without an owner account.");
  const defaultNodes = nodeService.listNodes();
  assert.strictEqual(defaultNodes.selectedNodeId, "default", "The selected node should default to the built-in local node.");
  assert(defaultNodes.nodes.some((node) => node.id === "default" && node.displayName === "This Device" && node.local), "The built-in local node should be visible as This Device.");
  const localInstances = await serviceRouter.listInstances({ nodeId: "default" });
  assert(Array.isArray(localInstances.instances), "Dashboard/instances should work against the local node without account/session/token.");
  const localNodeTest = await nodeService.testNode("default");
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
  assert(/^anx_/.test(rotated.token), "Agent token should be generated and displayed once.");
  const savedNode = nodeService.saveNode({
    displayName: "Smoke Node",
    agentUrl: "http://127.0.0.1:47131",
    agentToken: "smoke-token",
    docker: { enabled: true },
  });
  assert(savedNode.node.id, "Node registration should create an id.");
  const nodes = nodeService.listNodes();
  assert(nodes.nodes.some((node) => node.id === savedNode.node.id), "Registered node should be listed.");
  assert.strictEqual(nodeService.selectNode(savedNode.node.id).selectedNodeId, savedNode.node.id, "Node selection should persist.");
  assert.strictEqual(nodeService.deleteNode(savedNode.node.id).deleted, true, "Node delete should work.");
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
  const list = await backupService.listBackups({ instanceId });
  assert.strictEqual(list.backups.length, 1, "Backup list should include created backup.");
  const schedule = await backupService.saveSchedule({ instanceId, intervalHours: 24, keepLast: 3, maxAgeDays: 7, type: "world" });
  assert.strictEqual(schedule.schedule.instanceId, instanceId, "Schedule should target the instance.");
  const schedules = await backupService.listSchedules();
  assert.strictEqual(schedules.schedules.length, 1, "Schedule list should include saved schedule.");
  await backupService.deleteSchedule(instanceId);
  assert.strictEqual((await backupService.listSchedules()).schedules.length, 0, "Schedule delete should remove saved schedule.");
  await backupService.deleteBackup(created.backup.id);
  const afterDelete = await backupService.listBackups({ instanceId });
  assert.strictEqual(afterDelete.backups.length, 0, "Backup delete should remove metadata and archive.");

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
