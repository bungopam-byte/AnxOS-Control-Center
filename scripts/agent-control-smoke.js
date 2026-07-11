const assert = require("assert");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

function freePort() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close(() => resolve(port)); }); }); }

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-agent-control-"));
  process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");
  process.env.ANXOS_LOG_DIR = path.join(root, "logs");
  const port = await freePort();
  const control = require("../src/services/agentControlService");
  try {
    const saved = control.saveConfig({ name: "Control Smoke Agent", host: "127.0.0.1", port, allowedFolders: [root], restartPolicy: "never" });
    assert.strictEqual(saved.port, port);
    const started = await control.start();
    assert(started.running, "Agent Control should start a real local Agent process.");
    assert(started.pid && started.identity?.deviceId, "Started Agent should report process and stable identity.");
    const diagnostics = await control.runDiagnostics();
    assert(diagnostics.checks.some((check) => check.id === "process" && check.result === "Passed"));
    const restarted = await control.restart();
    assert(restarted.running, "Agent Control should restart the local Agent.");
    const stopped = await control.stop();
    assert(!stopped.running, "Agent Control should stop the local Agent.");
    assert(fs.existsSync(path.join(root, "logs", "service-manager.log")), "Lifecycle operations should produce service-manager diagnostics.");
    console.log("Agent Control smoke checks passed.");
  } finally {
    await control.stop({ force: true }).catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
