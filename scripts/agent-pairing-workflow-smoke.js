#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function waitForAgent(baseUrl) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Agent did not become reachable.");
}

(async () => {
  const root = path.resolve(__dirname, "..");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "anx-agent-pairing-"));
  const controlConfig = path.join(temp, "control");
  const agentConfig = path.join(temp, "agent");
  const nodeServiceSource = fs.readFileSync(path.join(root, "src", "services", "nodeService.js"), "utf8");
  const nodesIpcSource = fs.readFileSync(path.join(root, "src", "ipc", "nodesIpc.js"), "utf8");
  const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert(nodeServiceSource.includes("agentIdentityMatchesNode") && nodeServiceSource.includes("NODE_REPAIR_URL_CONFIRMATION_REQUIRED"), "Existing-node re-pairing must verify Agent identity before changing URLs.");
  assert(nodeServiceSource.includes("repairedExistingNode"), "Pairing results should identify in-place node repairs.");
  assert(nodeServiceSource.includes("PAIRING_EXPIRED") && nodesIpcSource.includes("wrapped.code = error?.code"), "Expired pairing sessions must preserve a retryable error category across IPC.");
  assert(appSource.includes("isExpiredPairingError") && appSource.includes("restartNodePairingEntry") && htmlSource.includes("data-node-pairing-retry"), "Expired pairing sessions must show in-app retry actions.");
  fs.mkdirSync(controlConfig, { recursive: true });
  fs.mkdirSync(agentConfig, { recursive: true });
  process.env.ANXHUB_CONFIG_DIR = controlConfig;
  const port = await getFreePort();
  const agentUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(root, "agent", "src", "server.js")], {
    cwd: path.join(root, "agent"),
    env: {
      ...process.env,
      ANXHUB_CONFIG_DIR: agentConfig,
      AGENT_HOST: "127.0.0.1",
      AGENT_PORT: String(port),
      AGENT_IDENTITY_PATH: path.join(agentConfig, "identity.json"),
      ANXOS_LOG_DIR: path.join(temp, "logs"),
    },
    stdio: "ignore",
  });
  try {
    await waitForAgent(agentUrl);
    const start = await fetch(`${agentUrl}/api/v1/pairing/start`, { method: "POST" });
    assert.strictEqual(start.status, 200, "Agent should start a pairing session.");
    const session = await start.json();
    assert(session.pairingCode && session.pairingCode.startsWith("ANX-"), "Agent should return a temporary pairing code.");
    assert(!JSON.stringify(session).includes("agentToken"), "Pairing session must not expose a permanent token.");

    const { pairNodeFromCode, getNodeAgentConfig, getNodesPath, getNodeCredentialsPath, getSelectedNodeId } = require("../src/services/nodeService");
    const paired = await pairNodeFromCode({ pairingCode: session.pairingCode });
    assert.strictEqual(paired.paired, true, "Control Center should pair the Agent.");
    assert.strictEqual(paired.selectedNodeId, paired.node.id, "Pairing should make the new node active.");
    assert.strictEqual(getSelectedNodeId(), paired.node.id, "Persisted selected node should be the paired node.");
    const config = getNodeAgentConfig(paired.node.id);
    assert.strictEqual(config.agentUrl, agentUrl, "Paired node should use the Agent URL from the pairing session.");
    assert(/^anxos_[A-Za-z0-9_-]{43,}$/.test(config.agentToken), "Control Center should store a generated permanent credential.");
    assert(!fs.readFileSync(getNodesPath(), "utf8").includes(config.agentToken), "nodes.json must not contain the permanent credential.");
    assert(fs.readFileSync(getNodeCredentialsPath(), "utf8").includes(config.agentToken), "protected node credential store should contain the permanent credential.");

    const health = await fetch(`${agentUrl}/api/v1/health`, { headers: { Authorization: `Bearer ${config.agentToken}` } });
    assert.strictEqual(health.status, 200, "Agent should immediately accept the permanent credential.");
    const replay = await fetch(`${agentUrl}/api/v1/pairing/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairingCode: session.pairingCode, permanentToken: config.agentToken }),
    });
    assert.notStrictEqual(replay.status, 200, "Pairing code must be single use.");

    const staleToken = config.agentToken;
    const repairStart = await fetch(`${agentUrl}/api/v1/pairing/start`, { method: "POST" });
    assert.strictEqual(repairStart.status, 200, "Agent should allow a new limited pairing session while the saved node credential is stale.");
    const repairSession = await repairStart.json();
    const repaired = await pairNodeFromCode({
      id: paired.node.id,
      pairingCode: repairSession.pairingCode,
      displayName: paired.node.displayName,
    });
    assert.strictEqual(repaired.paired, true, "Existing node should re-pair successfully.");
    assert.strictEqual(repaired.node.id, paired.node.id, "Re-pairing must update the existing node instead of creating a duplicate.");
    assert.strictEqual(repaired.node.displayName, paired.node.displayName, "Re-pairing should preserve the node display name.");
    const repairedConfig = getNodeAgentConfig(paired.node.id);
    assert.notStrictEqual(repairedConfig.agentToken, staleToken, "Re-pairing should rotate only the existing node credential.");
    const staleProtectedRequest = await fetch(`${agentUrl}/api/v1/instances`, { headers: { Authorization: `Bearer ${staleToken}` } });
    assert.strictEqual(staleProtectedRequest.status, 401, "Old credential should be rejected after re-pairing.");
    const repairedProtectedRequest = await fetch(`${agentUrl}/api/v1/instances`, { headers: { Authorization: `Bearer ${repairedConfig.agentToken}` } });
    assert.strictEqual(repairedProtectedRequest.status, 200, "Repaired node credential should authenticate immediately.");
    const persisted = JSON.parse(fs.readFileSync(getNodesPath(), "utf8"));
    assert.strictEqual(persisted.nodes.filter((node) => node.id === paired.node.id).length, 1, "Re-pairing must not duplicate the existing node.");

    console.log("Agent pairing workflow smoke checks passed.");
  } finally {
    child.kill("SIGTERM");
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
