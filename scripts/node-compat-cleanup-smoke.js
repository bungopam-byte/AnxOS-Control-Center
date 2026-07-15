const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "anx-node-compat-"));
process.env.ANXHUB_CONFIG_DIR = tempDir;

const serviceRouter = require("../src/services/serviceRouter");
const { getNodesPath } = require("../src/services/nodeService");
const { setNodeToken } = require("../src/services/nodeCredentialStore");

fs.mkdirSync(tempDir, { recursive: true });

function writeNodes(selectedNodeId) {
  fs.writeFileSync(getNodesPath(), `${JSON.stringify({
    schemaVersion: 2,
    selectedNodeId,
    nodes: [
      {
        id: "node-a",
        kind: "agent",
        displayName: "Node A",
        baseUrl: "http://127.0.0.1:47131",
        agentUrl: "http://127.0.0.1:47131",
        enabled: true,
        agentIdentity: { deviceId: "node-a-device" },
      },
    ],
  }, null, 2)}\n`);
  setNodeToken("node-a", "node-token");
}

(async () => {
  writeNodes("node-a");
  await assert.rejects(
    () => serviceRouter.listInstances(),
    (error) => error?.code === "NODE_REQUIRED" && /explicit nodeId/i.test(error.message),
    "agent-backed service calls must reject missing nodeId instead of falling back to the selected Agent",
  );

  writeNodes("application-host");
  const localList = await serviceRouter.listInstances();
  assert(Array.isArray(localList.instances), "application-host fallback should preserve local single-node behavior");

  const serviceSource = fs.readFileSync(path.join(root, "src/services/serviceRouter.js"), "utf8");
  assert(serviceSource.includes("implicit-node-fallback-blocked"), "Deprecated implicit node fallback should emit safe diagnostics.");
  assert(serviceSource.includes("Agent-backed requests require an explicit nodeId."), "Missing node IDs should fail clearly.");

  console.log("Node compatibility cleanup smoke checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
