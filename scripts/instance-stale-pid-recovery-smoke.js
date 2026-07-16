const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const instanceService = require("../src/shared/instances/instanceServiceCore");

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-stale-pid-"));
  instanceService.configureInstanceService({ getConfig: () => ({ instanceRoot: root }) });
  await instanceService.createInstance({
    id: "stale-pid-smoke",
    name: "Stale PID Smoke",
    type: "custom-command",
    executable: process.execPath,
    args: ["-e", "process.exit(0)"],
  });

  const configPath = path.join(root, "stale-pid-smoke", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  fs.writeFileSync(configPath, `${JSON.stringify({ ...config, state: "Running", pid: 2147483647 }, null, 2)}\n`);
  const repaired = await instanceService.getStatus("stale-pid-smoke");
  assert.strictEqual(repaired.processState, "Unknown");
  assert.strictEqual(repaired.lifecycleState, "Unknown");
  assert.strictEqual(repaired.healthState, "unknown");
  assert.strictEqual(repaired.failureReason, "STALE_PID");
  assert.strictEqual(repaired.pid, null);

  await instanceService.deleteInstance("stale-pid-smoke");
  fs.rmSync(root, { recursive: true, force: true });
  console.log("Instance stale PID recovery smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
