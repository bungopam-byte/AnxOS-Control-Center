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

function compact(source) {
  return source.replace(/\s+/g, " ");
}

includesAll(appSource, [
  "let selectedNodeContextVersion = 0;",
  "let nodePickerOpen = false;",
  "function getNodeRequestContext",
  "function isNodeRequestCurrent",
  "function getNodeScopedPayload",
  "function isNodeSwitching",
  "function shouldSkipNodeScopedPolling",
  "function createNodeActionContext",
  "function isNodeActionStillCurrent",
  "function resetNodeScopedRendererState",
  "async function reloadActiveNodeData",
  "function openNodePicker",
  "function closeNodePicker",
  "function renderNodePicker",
  "function positionNodePicker",
  "selectedNodeContextVersion += 1;",
  "resetNodeScopedRendererState(`Switching to",
], "Renderer");

includesAll(appSource, [
  "nodePickerTrigger?.addEventListener(\"click\"",
  "event.stopPropagation();",
  "document.addEventListener(\"click\"",
  "nodePicker?.addEventListener(\"keydown\"",
  "await activateNodePickerOption(nodePickerActiveIndex);",
  "sidebarFooter.dataset.agentState = nodeState;",
], "Node picker interaction");

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

includesAll(compact(appSource), [
  "if (isNodeRequestCurrent(requestContext)) { markStartupReady(\"system\"); systemRequestInFlight = false;",
  "if (isNodeRequestCurrent(requestContext)) { dockerRequestInFlight = false;",
  "if (isNodeRequestCurrent(requestContext)) { instancesRequestInFlight = false;",
  "if (isNodeRequestCurrent(requestContext)) { backupRequestInFlight = false;",
], "Current-context request finalizers");

includesAll(appSource, [
  "if (!shouldSkipNodeScopedPolling()) refreshDashboard();",
  "if (!shouldSkipNodeScopedPolling()) refreshAmpDashboard();",
  "if (!shouldSkipNodeScopedPolling()) refreshPlayitStatus();",
  "if (shouldSkipNodeScopedPolling()) return;",
], "Node-scoped polling");

includesAll(appSource, [
  "const requestContext = createNodeActionContext(\"backup-create\");",
  "const requestContext = createNodeActionContext(`docker-${actionName}`);",
  "const requestContext = createNodeActionContext(\"instance-create\");",
  "const requestContext = createNodeActionContext(`instance-${actionName}`);",
  "const requestContext = createNodeActionContext(\"console-command\");",
  "if (!isNodeActionStillCurrent(requestContext)) return;",
], "Node action targeting");

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
