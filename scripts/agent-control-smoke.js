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
  const serviceSource = fs.readFileSync(path.join(__dirname, "..", "src", "services", "agentControlService.js"), "utf8");
  const ipcSource = fs.readFileSync(path.join(__dirname, "..", "src", "ipc", "agentControlIpc.js"), "utf8");
  const rendererSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert(serviceSource.includes("getConfiguredAgentStatus"), "Agent Control must expose configured Agent status separately from local status.");
  assert(serviceSource.includes('targetLabel: "configured-agent"'), "Configured Agent checks must be labeled separately.");
  assert(serviceSource.includes("normalizeAgentUrlForComparison"), "Agent Control should normalize Agent URLs before deduping probes.");
  assert(serviceSource.includes("reusedConfiguredAgentProbe"), "Agent Control should reuse configured Agent probe results for matching registered nodes.");
  assert(serviceSource.includes("REMOTE_DIAGNOSTICS_CACHE_MS") && serviceSource.includes("remoteDiagnosticsRequests"), "Remote diagnostics capture must dedupe repeated Agent diagnostics exports.");
  assert(serviceSource.includes("normalizeAgentRuntimeStatus"), "Agent Control must normalize runtime status before rendering.");
  assert(serviceSource.includes("getSystemStats(getConfiguredAgentHealthConfig(effective))"), "Configured Agent status must include lightweight Agent metrics.");
  assert(serviceSource.includes("runtime-payload-shape"), "Development diagnostics should log sanitized runtime payload shapes.");
  assert(ipcSource.includes("runAuthorized") && ipcSource.includes('outcome: "failed"'), "Agent Control IPC must audit failed service operations as failures.");
  assert(ipcSource.includes('ipcMain.handle("agentControl:diagnostics", () => runAudited("diagnostics", null'), "Local Agent diagnostics must remain read-only and available without owner authorization.");
  assert(ipcSource.includes('authorize("remote-diagnostics")'), "Remote Agent diagnostic capture must remain owner-authorized.");
  assert(rendererSource.includes("getAgentControlOverviewTarget"), "Renderer must select the configured Agent state for the overview when applicable.");
  assert(rendererSource.includes("agentControlRefreshInFlight"), "Renderer must avoid overlapping Agent Control refreshes.");
  assert(rendererSource.includes("formatAgentCpu") && rendererSource.includes("formatAgentMemory") && rendererSource.includes("formatAgentProcess"), "Renderer must format normalized Agent runtime metrics.");
  assert(!rendererSource.includes('"Service managed"'), "Agent Control must not use Service managed as the primary process value.");
  assert(htmlSource.includes("Agent Connection") && htmlSource.includes('data-agent-setting="agentUrl"'), "Agent Connection must render in Agent Control.");
  const control = require("../src/services/agentControlService");
  try {
    const saved = control.saveConfig({ name: "Control Smoke Agent", host: "127.0.0.1", port, allowedFolders: [root], restartPolicy: "never" });
    assert.strictEqual(saved.port, port);
    const started = await control.start();
    assert(started.running, "Agent Control should start a real local Agent process.");
    assert(started.pid && started.identity?.deviceId, "Started Agent should report process and stable identity.");
    assert(started.runtime?.connected, "Started Agent should report a connected normalized runtime.");
    assert.strictEqual(started.runtime.serviceState, "running", "Started Agent should normalize the process state to running.");
    assert(started.runtime.version, "Started Agent should expose the real Agent version.");
    assert(Number.isFinite(started.runtime.uptimeSeconds), "Started Agent should expose runtime uptime.");
    assert(Number.isFinite(started.runtime.memory.usedBytes), "Started Agent should expose normalized RAM usage.");
    assert(Number.isFinite(started.runtime.memory.totalBytes), "Started Agent should expose normalized RAM total.");
    assert(started.runtime.capabilities.lifecycle, "Local Agent runtime should report lifecycle support.");
    const connectedAgain = await control.start();
    assert(connectedAgain.running, "Starting while a healthy local Agent is already listening should reconnect instead of spawning a duplicate process.");
    assert.strictEqual(connectedAgain.pid, started.pid, "Starting an already managed Agent should not spawn a duplicate process.");
    const diagnostics = await control.runDiagnostics();
    assert(diagnostics.checks.some((check) => check.id === "process" && check.result === "Passed"));
    const restarted = await control.restart();
    assert(restarted.running, "Agent Control should restart the local Agent.");
    assert.strictEqual(restarted.runtime?.serviceState, "running", "Restarted Agent should remain normalized as running.");
    const stopped = await control.stop();
    assert(!stopped.running, "Agent Control should stop the local Agent.");
    assert(["stopped", "stopping", "unknown"].includes(stopped.runtime?.serviceState), "Stopped Agent should not normalize as running.");
    assert(fs.existsSync(path.join(root, "logs", "service-manager.log")), "Lifecycle operations should produce service-manager diagnostics.");
    console.log("Agent Control smoke checks passed.");
  } finally {
    await control.stop({ force: true }).catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
