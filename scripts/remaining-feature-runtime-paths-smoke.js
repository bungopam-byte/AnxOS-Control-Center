#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const dockerIpc = read("src/ipc/dockerIpc.js");
const instancesIpc = read("src/ipc/instancesIpc.js");
const backupsIpc = read("src/ipc/backupsIpc.js");
const ampIpc = read("src/ipc/ampIpc.js");
const systemIpc = read("src/ipc/systemIpc.js");
const publicAccessIpc = read("src/ipc/publicAccessIpc.js");
const serviceRouter = read("src/services/serviceRouter.js");
const systemService = read("src/services/systemService.js");
const publicAccessService = read("src/services/publicAccessProviderService.js");

[
  [dockerIpc, "docker:getSnapshot", "requireDockerNodeContext(payload, \"snapshot\")"],
  [instancesIpc, "instances:list", "wrapExpectedAgentRead(\"instances:list\""],
  [backupsIpc, "backups:list", "listBackups(requireNodeContext(payload, \"backup listing\"))"],
  [ampIpc, "amp:getSnapshot", "getAmpSnapshot(requireNodeContext(payload, \"AMP snapshot\"))"],
  [systemIpc, "system:getSnapshot", "getSystemSnapshot(requireNodeContext(payload, \"system metrics\"))"],
  [publicAccessIpc, "publicAccess:getSnapshot", "getPublicAccessSnapshot(requireNodeContext(payload, \"Public Access snapshot\"))"],
].forEach(([source, channel, contextNeedle]) => {
  assert(source.includes("wrapExpectedAgentRead") || source.includes("invokePublicAccessRead"), `${channel} must use structured expected-error handling.`);
  assert(source.includes(contextNeedle), `${channel} must require explicit active-node context.`);
});

assert(serviceRouter.includes("if (shouldPreserveAgentError(error)) {\n        throw error;\n      }"), "Docker capability probing must preserve authentication and node errors.");
assert(serviceRouter.includes("async function getAgentAmpSnapshot(options = {})") && serviceRouter.includes("if (shouldPreserveAgentError(error)) throw error;"), "AMP must preserve authentication and node errors.");
assert(serviceRouter.includes("const selectedNodeId = getSelectedNodeId() || APPLICATION_HOST_NODE_ID;") && serviceRouter.includes("implicit-node-fallback-selected"), "Feature services must route implicit agent requests through the selected node.");

assert(systemService.includes("isExpectedAgentSystemError") && systemService.includes("Expected selected node stats failure"), "System expected Agent failures must be logged without full stacks.");
assert(systemService.includes("if (!agentClient.isCompatibilityFallbackAllowed(error))") && systemService.includes("throw error;"), "System stats must not use compatibility fallback after authentication failures.");

assert(publicAccessService.includes("getAgentConfigForPublicAccess(nodeId)") && publicAccessService.includes("getExecutionTarget(nodeId)"), "Public Access remote requests must resolve the selected node context.");
assert(publicAccessIpc.includes("expectedPublicAccessLogState") && publicAccessIpc.includes("suppressedCount"), "Public Access expected failures must keep duplicate suppression.");

console.log("Remaining feature runtime path smoke checks passed.");
