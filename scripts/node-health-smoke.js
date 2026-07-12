const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function requireIndex(needle, message) {
  assert(index.includes(needle), message || `index.html is missing ${needle}`);
}

function requireApp(needle, message) {
  assert(app.includes(needle), message || `app.js is missing ${needle}`);
}

[
  "data-node-health-overview",
  "data-node-health-status",
  "data-node-health-updated",
  "data-node-health-categories",
  "data-node-health-issues",
  "node-health-overview",
  "node-health-categories",
  "node-health-issues",
  "Node Health",
  "Health Issues",
  "Fix All is intentionally unavailable",
  'aria-label="Node health categories"',
  'aria-label="Detected node health issues"',
].forEach((needle) => requireIndex(needle, `Node health UI should expose ${needle}.`));

[
  "NODE_HEALTH_STALE_MS",
  "NODE_HEALTH_RESOURCE_THRESHOLDS",
  "cpuWarningPercent: 90",
  "memoryWarningPercent: 90",
  "diskWarningPercent: 85",
  "diskCriticalPercent: 95",
  "diskCriticalFreeBytes: 2 * 1024 * 1024 * 1024",
  "latencyWarningMs: 1000",
  "NODE_HEALTH_SEVERITY_RANK",
  "function buildNodeHealthModel",
  "function buildConnectivityHealth",
  "function buildAgentHealth",
  "function buildResourceHealth",
  "function buildStorageHealth",
  "function buildDependencyHealth",
  "function buildMarketplaceHealth",
  "function buildFilesHealth",
  "function buildOperationsHealth",
  "function buildDiagnosticsHealth",
  "function buildUpdatesHealth",
  "function buildMaintenanceHealth",
].forEach((needle) => requireApp(needle, `Node health model should include ${needle}.`));

[
  "latestSystemSnapshot",
  "latestSystemSnapshotAt",
  "latestInstancesSnapshotAt",
  "latestFilesListingAt",
  "latestDependencyResult",
  "latestDependencyResultAt",
  "renderDependencyStatus",
  "renderSnapshot",
  "renderInstancesSnapshot",
  "renderFileListing",
].forEach((needle) => requireApp(needle, `Node health should reuse existing state from ${needle}.`));

[
  "AGENT_PORT_IN_USE",
  "Authentication failed",
  "Agent unavailable",
  "Version unavailable",
  "Port conflict detected",
  "CPU and memory unavailable",
  "Disk metrics unavailable",
  "File service unavailable",
  "groupDiagnosticIssues(agentLogEntries)",
].forEach((needle) => requireApp(needle, `Node health should cover ${needle}.`));

[
  'id: "nodeHealth.open"',
  'id: "nodeHealth.refresh"',
  'id: "nodeHealth.unhealthy"',
  'id: "dependencies.recheck"',
  "Node Health: ${health.state}",
  "node health agent dependency resource storage diagnostics operations files maintenance updates marketplace",
].forEach((needle) => requireApp(needle, `Node health search/command integration should include ${needle}.`));

[
  "syncNodeHealthNotifications",
  "dedupKey: `node-health:${health.nodeId}:${health.state}`",
  "dedupKey: `node-health:${health.nodeId}:recovered`",
  "relatedWorkspace: \"nodes\"",
].forEach((needle) => requireApp(needle, `Node health notifications should include ${needle}.`));

[
  "runNodeHealthAction",
  "testSelectedNode()",
  "refreshAgentControl({ includeConfig: true })",
  "runDependencyAction(\"check\")",
  "showPage(\"operations\")",
  "showPage(\"agent-control\")",
  "showPage(\"files\")",
  "showPage(\"maintenance\")",
  "checkForUpdates({ silent: false })",
].forEach((needle) => requireApp(needle, `Node health remediation should reuse ${needle}.`));

[
  "getNodeHealthBreakdown",
  "splitNodeHealthEvidence",
  "createNodeHealthDetails",
  "node-health-summary-text",
  "node-health-long-value",
  "Copy details",
  "document.createElement(\"article\")",
  "nodeHealthCategories.replaceChildren()",
  "nodeHealthIssues.replaceChildren()",
  "createTextElement(\"strong\", category.label)",
  "action.setAttribute(\"aria-label\"",
  "event.target.closest(\"[data-node-health-action]\")",
].forEach((needle) => requireApp(needle, `Node health rendering should be safe and accessible with ${needle}.`));

[
  ".node-health-overview",
  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  ".node-health-summary-text",
  "-webkit-line-clamp: 2",
  ".node-health-long-value",
  "text-overflow: ellipsis",
  "width: min(760px, calc(100vw - 28px))",
  "@media (prefers-reduced-motion: reduce)",
].forEach((needle) => assert(styles.includes(needle), `Node health polish CSS should include ${needle}.`));

assert(!app.includes("nodeHealthCategories.innerHTML"), "Node health categories must not use raw HTML injection.");
assert(!app.includes("nodeHealthIssues.innerHTML"), "Node health issues must not use raw HTML injection.");
assert(!app.includes("security score") && !app.includes("health score"), "Node health should not add fake numeric scores.");
assert(!index.includes("data-node-health-fix-all"), "Unsupported Fix All bulk remediation should remain omitted.");
assert(app.includes("refreshNodeHealth({ notify: false })"), "Node health should support quiet refreshes to avoid notification floods.");

console.log("Node health smoke checks passed.");
