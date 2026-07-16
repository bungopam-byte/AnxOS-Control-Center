const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const instanceService = require("../src/shared/instances/instanceServiceCore");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anx-instance-health-"));
  instanceService.configureInstanceService({ getConfig: () => ({ instanceRoot: root }) });

  await instanceService.createInstance({
    id: "ready-health-smoke",
    name: "Ready Health Smoke",
    type: "custom-command",
    executable: process.execPath,
    args: ["-e", "console.log('Done (0.1s)! For help, type help'); setInterval(() => {}, 1000)"],
    startupTimeoutMs: 1000,
  });
  await instanceService.startInstance("ready-health-smoke");
  await wait(100);
  const ready = await instanceService.getStatus("ready-health-smoke");
  assert.strictEqual(ready.processState, "Running");
  assert.strictEqual(ready.readinessState, "ready");
  assert.strictEqual(ready.healthState, "healthy");
  assert.strictEqual(ready.serverReady, true);
  await instanceService.stopInstance("ready-health-smoke");

  await instanceService.createInstance({
    id: "degraded-health-smoke",
    name: "Degraded Health Smoke",
    type: "custom-command",
    executable: process.execPath,
    args: ["-e", "setInterval(() => {}, 1000)"],
    startupTimeoutMs: 50,
  });
  await instanceService.startInstance("degraded-health-smoke");
  await wait(120);
  const degraded = await instanceService.getStatus("degraded-health-smoke");
  assert.strictEqual(degraded.processState, "Running");
  assert.strictEqual(degraded.readinessState, "timeout");
  assert.strictEqual(degraded.healthState, "degraded");
  assert.strictEqual(degraded.serverReady, false);
  await instanceService.stopInstance("degraded-health-smoke");

  await instanceService.deleteInstance("ready-health-smoke");
  await instanceService.deleteInstance("degraded-health-smoke");
  instanceService.disposeInstanceService();
  fs.rmSync(root, { recursive: true, force: true });
  console.log("Instance health state smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
