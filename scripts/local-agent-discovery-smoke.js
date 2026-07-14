const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const nodeService = fs.readFileSync(path.join(root, "src", "services", "nodeService.js"), "utf8");

[
  "const LOCAL_AGENT_HOSTS = [\"127.0.0.1\", \"localhost\"]",
  "const LOCAL_AGENT_DISPLAY_NAME = \"This PC\"",
  "function isLocalAgentUrl",
  "function getLocalAgentUrls",
  "function createLocalAgentConnectionStatus",
  "async function discoverLocalAgentNode",
  "async function withDiscoveredLocalAgent",
  "localAgent: true",
  "ownerMachine: true",
  "\"Authentication Required\"",
  "desktopApplication: \"running\"",
  "remoteAvailability: \"not-remote\"",
  "versionCompatibility",
  "node.localAgent === true || isLocalAgentUrl(node.agentUrl)",
  "mergeAgentNodes([",
  "agentToken: node.agentToken ? \"[configured]\" : \"\"",
  "modeLabel: node.localAgent ? \"Local Agent\" : \"Agent\"",
].forEach((needle) => {
  assert(nodeService.includes(needle), `Local Agent discovery source should include ${needle}.`);
});

assert(
  /LOCAL_AGENT_HOSTS\.map\(\(host\) => `http:\/\/\$\{host\}:\$\{port\}`\)/.test(nodeService),
  "Local Agent discovery should probe both configured localhost hostnames.",
);

assert(
  /return `local-agent-\$\{getLocalAgentPortFromUrl\(url\)\}`/.test(nodeService),
  "Localhost URLs should share a local placeholder identity before health returns a stable device ID.",
);

assert(
  nodeService.includes("const displayName = localAgent") && nodeService.includes("? LOCAL_AGENT_DISPLAY_NAME"),
  "Local Agent nodes should normalize their display name to This PC.",
);

assert(
  /status: lastError\?\.status === 401 \|\| lastError\?\.code === "UNAUTHORIZED" \? "authentication-required" : "offline"/.test(nodeService),
  "Local Agent discovery should distinguish authentication-required from offline.",
);

assert(
  /nodes: \[publicNode\(getApplicationHostNode\(\)\), \.\.\.state\.nodes\.map\(publicNode\)\]/.test(nodeService),
  "Application host should remain present alongside discovered Agent nodes.",
);

console.log("Local Agent discovery smoke checks passed.");
