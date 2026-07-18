const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-instance-shutdown-"));
const service = require("../src/shared/instances/instanceServiceCore");
service.configureInstanceService({ getConfig: () => ({ instanceRoot: root }) });

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function main() {
  await service.createInstance({
    id: "shutdown-smoke",
    displayName: "Shutdown Smoke",
    type: "node-app",
    executable: "node",
    args: ["-e", "setInterval(() => {}, 1000)"],
    startupTimeoutMs: 10000,
    shutdownTimeoutMs: 10000,
  });
  const started = await service.startInstance("shutdown-smoke");
  assert(started.pid && alive(started.pid), "The test instance should be running before shutdown.");
  assert(service._test.getResourceCounts().versionRefreshTimers > 0, "Instance startup should own its delayed version refresh timer.");
  const result = await service.shutdownInstanceService({ timeoutMs: 2000 });
  assert.strictEqual(result.stopped, 1, "Shared shutdown should stop its owned instance.");
  assert.strictEqual(alive(started.pid), false, "Owned instance processes must not survive service shutdown.");
  const persisted = JSON.parse(fs.readFileSync(path.join(root, "shutdown-smoke", "config.json"), "utf8"));
  assert.strictEqual(persisted.state, service.INSTANCE_STATES.STOPPED, "Shutdown should persist an intentional stopped state.");
  assert.strictEqual(persisted.pid, null, "Shutdown should clear the persisted PID.");
  assert.deepStrictEqual(service._test.getResourceCounts(), { restartTimers: 0, versionRefreshTimers: 0, runningProcesses: 0 }, "Instance shutdown must release every owned timer and process record.");
  console.log("Instance shutdown smoke checks passed.");
}

main().finally(async () => {
  await service.shutdownInstanceService({ timeoutMs: 1000 }).catch(() => {});
  fs.rmSync(root, { recursive: true, force: true });
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
