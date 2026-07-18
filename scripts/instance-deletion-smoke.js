const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

async function main() {
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "anx-instance-delete-"));
  process.env.AGENT_INSTANCE_ROOT = path.join(tempRoot, "instances");
  process.env.ANXHUB_CONFIG_DIR = path.join(tempRoot, "config");

  const service = require("../src/shared/instances/instanceServiceCore");
  const {
    FORGOTTEN_SCHEMA_VERSION,
    filterForgottenInstances,
    getForgottenInstancesPath,
    isInstanceForgotten,
    rememberForgottenInstance,
  } = require("../src/services/instanceForgetService");

  const normal = await service.createInstance({
    id: "normal-delete",
    displayName: "Normal Delete",
    type: "custom-command",
    executable: "node",
    args: ["server.js"],
  });
  assert.strictEqual(normal.id, "normal-delete");
  await fs.promises.writeFile(path.join(process.env.AGENT_INSTANCE_ROOT, "normal-delete", "data", "server.js"), "setInterval(() => {}, 1000);\n");
  const deleted = await service.deleteInstance("normal-delete");
  assert.strictEqual(deleted.deleted, true, "normal deletion should report deleted");
  assert.strictEqual(deleted.filesDeleted, true, "normal deletion should remove files");
  assert.strictEqual(deleted.metadataRemoved, true, "normal deletion should remove metadata");
  assert(!(await exists(path.join(process.env.AGENT_INSTANCE_ROOT, "normal-delete"))), "normal deletion should remove the instance directory");

  const stale = await service.deleteInstance("missing-folder");
  assert.strictEqual(stale.deleted, true, "missing folder delete should succeed as stale");
  assert.strictEqual(stale.alreadyMissing, true, "missing folder delete should report already missing");
  assert.strictEqual(stale.metadataRemoved, true, "missing folder delete should report metadata removed/idempotent");

  const oldId = "old-record";
  await fs.promises.mkdir(path.join(process.env.AGENT_INSTANCE_ROOT, oldId), { recursive: true });
  await fs.promises.writeFile(path.join(process.env.AGENT_INSTANCE_ROOT, oldId, "config.json"), `${JSON.stringify({
    id: oldId,
    displayName: "Old Record",
    type: "custom-command",
    executable: "node",
    args: ["server.js"],
    state: "Stopped",
  }, null, 2)}\n`);
  const oldDeleted = await service.deleteInstance(oldId);
  assert.strictEqual(oldDeleted.deleted, true, "old persisted record should delete");
  assert.strictEqual(oldDeleted.filesDeleted, true, "old persisted record files should delete");

  await service.createInstance({
    id: "restart-delete",
    displayName: "Restart Delete",
    type: "custom-command",
    executable: "node",
    args: ["server.js"],
  });
  await service.deleteInstance("restart-delete");
  const afterRestartLikeList = await service.listInstances();
  assert(!afterRestartLikeList.instances.some((instance) => instance.id === "restart-delete"), "deleted instance must not return after restart-like reload");

  const forgotten = rememberForgottenInstance("offline-node", "offline-stale", { reason: "node-unavailable" });
  assert(forgotten, "offline forget should persist a tombstone");
  const filtered = filterForgottenInstances({
    instances: [
      { id: "offline-stale", displayName: "Offline Stale" },
      { id: "active-instance", displayName: "Active Instance" },
    ],
  }, "offline-node");
  assert.deepStrictEqual(filtered.instances.map((instance) => instance.id), ["active-instance"], "offline tombstone should hide stale instance after node reconnect");

  await service.createInstance({
    id: "forget-record",
    displayName: "Forget Record",
    type: "custom-command",
    executable: "node",
    args: ["server.js"],
  });
  await fs.promises.writeFile(path.join(process.env.AGENT_INSTANCE_ROOT, "forget-record", "data", "keep.txt"), "keep\n");
  const forgot = await service.forgetInstance("forget-record");
  assert.strictEqual(forgot.deleted, true, "forget should succeed");
  assert.strictEqual(forgot.metadataRemoved, true, "forget should remove metadata");
  assert.strictEqual(forgot.filesDeleted, false, "forget should not delete files");
  assert(await exists(path.join(process.env.AGENT_INSTANCE_ROOT, "forget-record", "data", "keep.txt")), "forget should leave instance files on disk");

  const agentRoute = fs.readFileSync(path.join(__dirname, "..", "agent", "src", "routes", "instances.js"), "utf8");
  const ipc = fs.readFileSync(path.join(__dirname, "..", "src", "ipc", "instancesIpc.js"), "utf8");
  const preload = fs.readFileSync(path.join(__dirname, "..", "preload.js"), "utf8");
  assert(agentRoute.includes('getInstanceIdFromPath(url.pathname, "/record")'), "Agent must expose metadata-only forget endpoint.");
  assert(ipc.includes("instances:forget") && preload.includes("instances:forget"), "Desktop IPC/preload must expose forget operation.");

  const forgottenPath = getForgottenInstancesPath();
  const futureState = { schemaVersion: FORGOTTEN_SCHEMA_VERSION + 1, entries: [{ nodeId: "future", instanceId: "future" }] };
  fs.writeFileSync(forgottenPath, `${JSON.stringify(futureState)}\n`, { mode: 0o600 });
  const futureRaw = fs.readFileSync(forgottenPath, "utf8");
  assert.throws(
    () => isInstanceForgotten("future", "future"),
    (error) => error?.code === "FORGOTTEN_INSTANCE_SCHEMA_UNSUPPORTED",
    "future forgotten-instance schemas must fail without being downgraded.",
  );
  assert.strictEqual(fs.readFileSync(forgottenPath, "utf8"), futureRaw, "future forgotten-instance state must remain unchanged.");

  fs.writeFileSync(forgottenPath, "{not-json\n", { mode: 0o600 });
  assert.throws(
    () => isInstanceForgotten("offline-node", "offline-stale"),
    (error) => error?.code === "FORGOTTEN_INSTANCE_STORE_CORRUPT",
    "corrupt forgotten-instance state must not silently clear tombstones.",
  );
  assert(fs.readdirSync(path.dirname(forgottenPath)).some((name) => name.startsWith(`${path.basename(forgottenPath)}.corrupt-`)), "corrupt forgotten-instance state should be preserved.");

  console.log("Instance deletion smoke checks passed.");
}

async function exists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
