const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxhub-security-backup-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");
process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");
process.env.AGENT_BACKUP_ROOT = path.join(root, "backups");

const security = require("../src/services/securityService");
const nodeService = require("../src/services/nodeService");
const backupService = require("../agent/src/services/backupService");

async function main() {
  assert.strictEqual(security.getStatus().setupRequired, true, "Security setup should be required in a fresh config.");
  await security.setupAdmin({ username: "owner", password: "correct horse battery staple" });
  const status = security.getStatus();
  assert.strictEqual(status.setupRequired, false, "Owner setup should complete.");
  assert.strictEqual(status.user.role, "Owner", "First user should be Owner.");
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
