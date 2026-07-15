const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

function requireSource(needle, message) {
  assert(app.includes(needle), message || `app.js is missing ${needle}`);
}

[
  "function syncAgentConnectionDisplayWithSelectedNode",
  'label: "Application Host"',
  'label: "Agent Connected"',
  'label: "Authentication Rejected"',
  'label: "Agent Unavailable"',
  'syncAgentConnectionDisplayWithSelectedNode();',
  "options.label || (testing ? \"Testing...\" : connected ? \"Connected\" : \"Disconnected\")",
].forEach((needle) => requireSource(needle, `Top-bar connection state should use explicit selected-node labels: ${needle}`));

[
  "const connectedAgent = remoteNodes.find((node) => getNodeConnectionState(node).key === \"connected\");",
  "setNodeSummary(\"connected\", connectedAgent ? connectedAgent.displayName || connectedAgent.name || \"Agent\" : \"None\");",
].forEach((needle) => requireSource(needle, `Connected Agent summary must be based on authenticated remote nodes only: ${needle}`));

[
  "const ownsActiveRendererContext = selectedNode.id === getSelectedNodeId();",
  "!ownsActiveRendererContext && [\"resources\", \"storage\", \"dependencies\", \"marketplace-instances\", \"files\", \"operations\", \"diagnostics\"].includes(category.id)",
  "evidence belongs to the active node and is not applied to",
].forEach((needle) => requireSource(needle, `Per-node health must not reuse active-node evidence across node cards/details: ${needle}`));

[
  "createNodeBadge(`Connection: ${getNodeStatusLabel(node)}`, state)",
  "createNodeBadge(`Overall: ${normalizeNodeHealthState(health.state)}`, nodeHealthTone(health.state))",
].forEach((needle) => requireSource(needle, `Node cards should scope potentially different status badges: ${needle}`));

[
  "Reachable, but the saved credential was rejected.",
  "Authentication Required",
  "Agent Unavailable",
].forEach((needle) => requireSource(needle, `Node status copy should keep auth/offline states distinct: ${needle}`));

console.log("Node state consistency smoke checks passed.");
