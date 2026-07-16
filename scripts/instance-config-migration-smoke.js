const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-instance-schema-"));
const service = require("../src/shared/instances/instanceServiceCore");
service.configureInstanceService({ getConfig: () => ({ instanceRoot: root }) });

function filePath(id) {
  return path.join(root, id, "config.json");
}

async function main() {
  const created = await service.createInstance({ id: "schema-smoke", displayName: "Schema Smoke", type: "node-app", executable: "node", args: ["app.js"] });
  let persisted = JSON.parse(fs.readFileSync(filePath(created.id), "utf8"));
  assert.strictEqual(persisted.schemaVersion, service.INSTANCE_CONFIG_SCHEMA_VERSION, "New instance metadata should include the current schema version.");

  delete persisted.schemaVersion;
  fs.writeFileSync(filePath(created.id), `${JSON.stringify(persisted, null, 2)}\n`);
  await service.getStatus(created.id);
  const backupPath = `${filePath(created.id)}.schema-v0.backup`;
  assert(fs.existsSync(backupPath), "Legacy instance migration should preserve the original file.");
  assert.strictEqual(JSON.parse(fs.readFileSync(backupPath, "utf8")).schemaVersion, undefined, "Migration backup should contain the legacy payload.");
  assert.strictEqual(JSON.parse(fs.readFileSync(filePath(created.id), "utf8")).schemaVersion, service.INSTANCE_CONFIG_SCHEMA_VERSION, "Legacy metadata should migrate to the current schema.");

  persisted = JSON.parse(fs.readFileSync(filePath(created.id), "utf8"));
  persisted.schemaVersion = service.INSTANCE_CONFIG_SCHEMA_VERSION + 1;
  const futureRaw = `${JSON.stringify(persisted, null, 2)}\n`;
  fs.writeFileSync(filePath(created.id), futureRaw);
  await assert.rejects(() => service.getStatus(created.id), (error) => error.code === "INSTANCE_CONFIG_SCHEMA_UNSUPPORTED");
  assert.strictEqual(fs.readFileSync(filePath(created.id), "utf8"), futureRaw, "Unknown future instance metadata must remain unchanged.");
  console.log("Instance config migration smoke checks passed.");
}

main().finally(() => fs.rmSync(root, { recursive: true, force: true })).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
