const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "app.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(repoRoot, "preload.js"), "utf8");
const serviceRouterSource = fs.readFileSync(path.join(repoRoot, "src", "services", "serviceRouter.js"), "utf8");
const agentClientSource = fs.readFileSync(path.join(repoRoot, "src", "services", "agentClient.js"), "utf8");

function includesAll(source, snippets, label) {
  for (const snippet of snippets) {
    assert(
      source.includes(snippet),
      `${label} is missing expected node-switch guard: ${snippet}`,
    );
  }
}

includesAll(appSource, [
  "let selectedNodeContextVersion = 0;",
  "function getNodeRequestContext",
  "function isNodeRequestCurrent",
  "function getNodeScopedPayload",
  "function resetNodeScopedRendererState",
  "async function reloadActiveNodeData",
  "selectedNodeContextVersion += 1;",
  "resetNodeScopedRendererState(`Switching to",
], "Renderer");

includesAll(appSource, [
  "desktopApiState.api.system.getSnapshot(getNodeScopedPayload(requestContext))",
  "desktopApiState.api.amp.getSnapshot(getNodeScopedPayload(requestContext))",
  "desktopApiState.api.playit.getSnapshot(getNodeScopedPayload(requestContext))",
  "desktopApiState.api.docker.getSnapshot(getNodeScopedPayload(requestContext))",
  "desktopApiState.api.instances.list(getNodeScopedPayload(requestContext))",
  "desktopApiState.api.backups.list(getNodeScopedPayload(requestContext))",
  "desktopApiState.api.security.getDashboard(getNodeScopedPayload(requestContext))",
], "Node-scoped refresh");

includesAll(appSource, [
  "if (!isNodeRequestCurrent(requestContext))",
  "requestInstanceId !== selectedInstanceId",
  "getActiveConsoleInstance()?.id !== requestInstanceId",
], "Stale response protection");

includesAll(preloadSource, [
  "system: {\n    getSnapshot: (payload = {})",
  "amp: {\n    getSnapshot: (payload = {})",
  "playit: {\n    getSnapshot: (payload = {})",
  "getMetrics: (instanceId, options = {})",
  "listSchedules: (payload = {})",
], "Preload bridge");

includesAll(serviceRouterSource, [
  "async function getPlayitSnapshot(options = {})",
  "async function getAmpSnapshot(options = {})",
  "return agentClient.listBackups(options, getOptionalNodeConfig(options));",
  "return agentClient.createBackup(payload, getOptionalNodeConfig(payload));",
], "Service router");

includesAll(agentClientSource, [
  "async function getPlayitSnapshot(configOverride = null)",
  "async function getAmpSnapshot(configOverride = null)",
  "async function listBackups(options = {}, configOverride = null)",
  "async function downloadBackup(backupId, configOverride = null)",
], "Agent client");

console.log("Node switching smoke checks passed.");
