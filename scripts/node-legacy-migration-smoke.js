const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-node-legacy-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");
fs.mkdirSync(process.env.ANXHUB_CONFIG_DIR, { recursive: true });

const nodes = require("../src/services/nodeService");

function removeIfExists(filePath) {
  fs.rmSync(filePath, { force: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
}

function resetConfig() {
  removeIfExists(nodes.getNodesPath());
  removeIfExists(nodes.getNodeCredentialsPath());
  removeIfExists(path.join(process.env.ANXHUB_CONFIG_DIR, "agent.json"));
}

async function listStoredNodes() {
  return nodes.listNodes({ discoverLocalAgent: false, refreshIdentity: false });
}

async function main() {
  resetConfig();
  writeJson(path.join(process.env.ANXHUB_CONFIG_DIR, "agent.json"), {
    backendMode: "local",
    agentUrl: "http://127.0.0.1:47131",
    agentToken: "local-token",
  });
  let state = await listStoredNodes();
  assert.strictEqual(state.nodes.filter((node) => node.kind === "agent").length, 0, "Fresh local configuration should not create a remote Agent node.");

  resetConfig();
  writeJson(path.join(process.env.ANXHUB_CONFIG_DIR, "agent.json"), {
    backendMode: "agent",
    agentUrl: "http://192.168.1.134:47131",
    agentToken: "legacy-token",
  });
  writeJson(nodes.getNodesPath(), { schemaVersion: 1, selectedNodeId: "default", nodes: [] });
  state = await listStoredNodes();
  let agentNodes = state.nodes.filter((node) => node.kind === "agent");
  assert.strictEqual(agentNodes.length, 1, "Legacy global Agent settings should create one default Agent node.");
  assert.notStrictEqual(state.selectedNodeId, "application-host", "Legacy default selection should migrate to the Agent node.");
  assert.strictEqual(agentNodes[0].baseUrl, "http://192.168.1.134:47131", "Legacy migration should preserve the Agent URL.");
  assert.strictEqual(agentNodes[0].hasToken, true, "Legacy migration should preserve token presence.");
  assert.strictEqual(nodes.getNodeAgentConfig(agentNodes[0].id).agentToken, "legacy-token", "Legacy migration should store the token in the credential store.");
  assert(!JSON.stringify(readJson(nodes.getNodesPath())).includes("legacy-token"), "Legacy migration must not leave raw tokens in nodes.json.");
  const schemaOneBackup = `${nodes.getNodesPath()}.schema-v1.backup`;
  assert(fs.existsSync(schemaOneBackup), "Legacy node migration should preserve a backup of the original schema.");
  assert.strictEqual(readJson(schemaOneBackup).schemaVersion, 1, "Migration backup should preserve the original schema version.");

  const persistedOnce = fs.readFileSync(nodes.getNodesPath(), "utf8");
  const credentialsOnce = fs.readFileSync(nodes.getNodeCredentialsPath(), "utf8");
  await listStoredNodes();
  assert.strictEqual(fs.readFileSync(nodes.getNodesPath(), "utf8"), persistedOnce, "Repeated migration should not rewrite node metadata.");
  assert.strictEqual(fs.readFileSync(nodes.getNodeCredentialsPath(), "utf8"), credentialsOnce, "Repeated migration should not rewrite credentials.");

  resetConfig();
  writeJson(path.join(process.env.ANXHUB_CONFIG_DIR, "agent.json"), {
    backendMode: "agent",
    agentUrl: "http://10.0.0.25:47131",
    agentToken: "partial-token",
  });
  writeJson(nodes.getNodesPath(), {
    schemaVersion: 2,
    selectedNodeId: "existing-node",
    nodes: [{
      id: "existing-node",
      kind: "agent",
      name: "Existing Node",
      displayName: "Existing Node",
      baseUrl: "http://10.0.0.25:47131",
      agentUrl: "http://10.0.0.25:47131",
      enabled: true,
      agentIdentity: { deviceId: "legacy-partial", hostname: "", operatingSystem: "", platform: "", architecture: "", agentVersion: "" },
    }],
  });
  state = await listStoredNodes();
  agentNodes = state.nodes.filter((node) => node.kind === "agent");
  assert.strictEqual(agentNodes.length, 1, "Partially migrated node should not duplicate.");
  assert.strictEqual(state.selectedNodeId, "existing-node", "Partially migrated selected node should remain selected.");
  assert.strictEqual(nodes.getNodeAgentConfig("existing-node").agentToken, "partial-token", "Partially migrated node should recover legacy token.");

  resetConfig();
  writeJson(path.join(process.env.ANXHUB_CONFIG_DIR, "agent.json"), {
    backendMode: "agent",
    agentUrl: "http://10.0.0.55:47131",
  });
  writeJson(nodes.getNodesPath(), { schemaVersion: 1, selectedNodeId: "default", nodes: [] });
  state = await listStoredNodes();
  agentNodes = state.nodes.filter((node) => node.kind === "agent");
  assert.strictEqual(agentNodes.length, 1, "Legacy URL without token should still migrate the node.");
  assert.strictEqual(agentNodes[0].baseUrl, "http://10.0.0.55:47131", "Missing-token migration should preserve URL.");
  assert(!JSON.stringify(readJson(nodes.getNodesPath())).match(/agentToken"\s*:/), "Missing-token migration should not write raw token fields to nodes.json.");

  resetConfig();
  writeJson(path.join(process.env.ANXHUB_CONFIG_DIR, "agent.json"), {
    backendMode: "agent",
    agentToken: "url-missing-token",
  });
  writeJson(nodes.getNodesPath(), { schemaVersion: 1, selectedNodeId: "default", nodes: [] });
  state = await listStoredNodes();
  agentNodes = state.nodes.filter((node) => node.kind === "agent");
  assert.strictEqual(agentNodes.length, 0, "Legacy settings without an explicit URL should not create a default Agent node.");
  assert.strictEqual(state.selectedNodeId, "application-host", "Missing URL should preserve application-host fallback.");

  resetConfig();
  const futureState = { schemaVersion: nodes.NODE_SCHEMA_VERSION + 1, selectedNodeId: "future-node", nodes: [{ id: "future-node", futureField: true }] };
  writeJson(nodes.getNodesPath(), futureState);
  const futureRaw = fs.readFileSync(nodes.getNodesPath(), "utf8");
  await assert.rejects(
    () => listStoredNodes(),
    (error) => error?.code === "NODE_SCHEMA_UNSUPPORTED" && error?.schemaVersion === nodes.NODE_SCHEMA_VERSION + 1,
    "Unknown future node schemas must fail safely instead of being downgraded.",
  );
  assert.strictEqual(fs.readFileSync(nodes.getNodesPath(), "utf8"), futureRaw, "A future schema rejection must leave the persisted file byte-for-byte unchanged.");

  console.log("Node legacy migration smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}).finally(() => {
  fs.rmSync(root, { recursive: true, force: true });
});
