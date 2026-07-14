const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "app.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(repoRoot, "preload.js"), "utf8");
const serviceRouterSource = fs.readFileSync(path.join(repoRoot, "src", "services", "serviceRouter.js"), "utf8");
const agentClientSource = fs.readFileSync(path.join(repoRoot, "src", "services", "agentClient.js"), "utf8");
const applicationHostSource = fs.readFileSync(path.join(repoRoot, "src", "services", "applicationHostService.js"), "utf8");
const nodeServiceSource = fs.readFileSync(path.join(repoRoot, "src", "services", "nodeService.js"), "utf8");
const indexSource = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");

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
  "function getNodeConnectionState",
  'key: "connected"',
  'key: "connecting"',
  'key: "degraded"',
  'key: "unauthorized"',
  'key: "unavailable"',
  'key: "offline"',
  "function getNodeConnectionSummary",
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
  "closeNodePicker();\n      await selectNode(node.id || \"application-host\");",
  "sidebarFooter.dataset.agentState = nodeState;",
  "sidebarFooter.dataset.tooltip = `${nodeName} | ${nodeSwitchInProgress ? \"Switching node\" : connectionState.message}`;",
  "badge.textContent = node.id === getSelectedNodeId() ? \"Current\" : connectionState.label;",
], "Node picker interaction");

includesAll(appSource, [
  "desktopApiState.api.system.getSnapshot(getNodeScopedPayload(requestContext))",
  "desktopApiState.api.amp.getSnapshot(getNodeScopedPayload(requestContext))",
  "desktopApiState.api.publicAccess.getSnapshot(payload)",
  "desktopApiState.api.playit.getSnapshot(payload)",
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
  "!shouldSkipNodeScopedPolling() && getActivePageName() === \"dashboard\"",
  "!shouldSkipNodeScopedPolling() && [\"dashboard\", \"amp\", \"minecraft\"].includes(getActivePageName())",
  "!shouldSkipNodeScopedPolling() && [\"dashboard\", \"playit\"].includes(getActivePageName())",
  "if (shouldSkipNodeScopedPolling()) return;",
], "Node-scoped polling");

includesAll(appSource, [
  "const previousNodesState = {",
  "const persistedState = await desktopApiState.api.nodes.select(nodesState.selectedNodeId);",
  "nodesState = previousNodesState;",
  "showToast(normalizeIpcErrorMessage(error, \"Node could not be selected.\"), \"warning\");",
  "nodeSwitchInProgress = false;\n    renderNodes();",
  "Selected node was unavailable. Switched to",
  "getFriendlyErrorMessage(result.message || \"Node unavailable.\")",
], "Node switch persistence and completion");

includesAll(appSource, [
  "function renderLocalAgentSystems",
  "getLocalApplicationHostNode",
  "Stable ID application-host",
  "Local Application Host",
  "Local Agent Service",
  "renderRemoteAgents(payload?.remote || [])",
], "Agent Control local and remote system identity");

includesAll(applicationHostSource, [
  "cpu: {",
  "memory: {",
  "storage: {",
  "desktopUptimeSeconds",
  "electronVersion",
  "appVersion",
  "developerMode",
  "runningState: \"running\"",
], "Application host first-class identity");

includesAll(indexSource, [
  'data-node-detail="cpu"',
  'data-node-detail="memory"',
  'data-node-detail="storage"',
  'data-node-detail="desktopUptime"',
  'data-node-detail="electronVersion"',
  'data-node-detail="appVersion"',
  'data-node-detail="developerMode"',
  'data-node-detail="runningState"',
  'data-node-detail="unsupportedFeatures"',
], "Node Details desktop identity fields");

includesAll(appSource, [
  "formatNodeCpu",
  "formatNodeMemory",
  "formatNodeStorage",
  "getNodeUnsupportedFeatureSummary",
  "Unsupported here: Docker workspace controls require an Agent node.",
  "Remote Agent APIs, Agent token management, and remote Docker controls require an Agent node.",
], "Renderer desktop Node Details identity");

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
  "publicAccess: {\n    getSnapshot: (payload = {})",
  "getMetrics: (instanceId, options = {})",
  "listSchedules: (payload = {})",
], "Preload bridge");

includesAll(serviceRouterSource, [
  "async function getPlayitSnapshot(options = {})",
  "async function getAmpSnapshot(options = {})",
  "return agentClient.listBackups(options, getOptionalNodeConfig(options));",
  "return agentClient.createBackup(payload, getOptionalNodeConfig(payload));",
], "Service router");

includesAll(nodeServiceSource, [
  "function buildNodeCapabilities",
  "serviceControls: localAgent",
  "remoteAgent: !localAgent",
  "Local Agent service controls only apply to This PC.",
  "capabilities: buildNodeCapabilities(node)",
  "capabilities: buildNodeCapabilities(node)",
], "Shared node capabilities");

includesAll(agentClientSource, [
  "async function getPlayitSnapshot(configOverride = null)",
  "async function getAmpSnapshot(configOverride = null)",
  "async function listBackups(options = {}, configOverride = null)",
  "async function downloadBackup(backupId, configOverride = null)",
], "Agent client");

console.log("Node switching smoke checks passed.");
