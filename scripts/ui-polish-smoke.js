const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const preload = fs.readFileSync(path.join(root, "preload.js"), "utf8");

const expectedPages = ["dashboard", "amp", "playit", "coolpals", "docker", "marketplace", "instances", "ssh", "files", "console", "backups", "operations", "maintenance", "security", "owner-workspace", "agent-control", "nodes", "settings"];
expectedPages.forEach((page) => assert(index.includes(`data-page="${page}"`), `Missing workspace root: ${page}`));

function pageMarkup(page) {
  const start = index.indexOf(`data-page="${page}"`);
  assert(start >= 0, `Missing page markup: ${page}`);
  const next = index.indexOf('<section class="page"', start + 1);
  return index.slice(start, next === -1 ? index.length : next);
}

const ids = [...index.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.strictEqual(new Set(ids).size, ids.length, "Desktop HTML must not contain duplicate IDs.");

const buttons = [...index.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
buttons.forEach(([, attributes, content]) => {
  const visibleText = content.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, "x").trim();
  assert(visibleText || /aria-label=/.test(attributes), `Button is missing an accessible name: ${attributes}`);
});

[
  "function activateModal",
  "getModalFocusables",
  'appShell.inert = true',
  "appShell.inert = modalBackgroundWasInert",
  'event.key !== "Tab"',
  'event.key === "Escape"',
  "event.target === updateModal",
  "previousFocus?.isConnected",
].forEach((needle) => assert(app.includes(needle), `Modal lifecycle is missing: ${needle}`));

assert(index.includes('role="dialog" aria-modal="true"') && index.includes('tabindex="-1"'), "Static dialogs must be modal and programmatically focusable.");
assert(index.includes('aria-live="polite" aria-atomic="true"'), "Toast feedback must be announced atomically.");
assert(index.includes("settings-workspace") && index.includes("data-settings-category-target=\"general\"") && index.includes("data-settings-search"), "Settings workspace must expose category navigation and search.");
assert(index.includes("data-settings-category=\"updates\"") && index.includes("data-settings-category=\"integrations\""), "Settings workspace must separate Updates and Integrations categories.");
assert(app.includes("setActiveSettingsCategory") && app.includes("renderSettingsSearch") && app.includes("settingsSearchInput"), "Renderer must wire Settings category switching and search.");
assert(preload.includes("settings:getPreferences") && preload.includes("settings:savePreferences") && preload.includes("settings:resetPreferences"), "Preload must expose centralized settings preference IPC.");
assert(main.includes("registerSettingsIpc"), "Main process must register settings IPC.");
assert(index.includes("nodes-summary-grid") && index.includes('data-node-summary="online"'), "Nodes workspace must expose a compact dashboard summary.");
assert(index.includes("[data-node-list]") || index.includes("data-node-list"), "Nodes workspace must expose the node card list.");
assert(index.includes("data-node-modal") && index.includes('data-node-action="open-add"'), "Nodes registration form must live in an Add Node modal.");
assert(index.includes("data-node-details-modal") && index.includes("node-details-drawer"), "Nodes workspace must include a details drawer.");
assert(app.includes('setAttribute("aria-busy"'), "Async workspace loading must expose aria-busy.");
assert(app.includes("isNodeSwitching() || document.hidden"), "Background polling must pause while the document is hidden.");
assert(app.includes("renderNodeSummary") && app.includes("startNodeRefreshPolling"), "Nodes workspace must render summary stats and page-scoped live refresh.");
assert(app.includes("setNodeModalVisible") && app.includes("openNodeDetails") && app.includes("handleNodeCardAction"), "Nodes modal, details, and quick actions must be wired.");
assert(index.indexOf("data-development-badge") < index.indexOf("data-titlebar-connection"), "Developer Mode badge must sit beside and before the Connected badge.");
assert(index.includes("data-dev-update-modal") && index.includes('data-dev-update-field="branch"') && index.includes('data-dev-update-action="update"'), "Developer update modal must expose Git status and actions.");
assert(styles.includes('data-dev-state="available"') && styles.includes("devBadgePulse"), "Developer update badge must include a subtle available-update state.");
assert(app.includes("setupDeveloperUpdates") && app.includes("openDeveloperUpdateModal") && app.includes("renderDevelopmentBadge"), "Developer update badge must be wired in the renderer.");
assert(preload.includes("developerUpdates") && preload.includes("developerUpdates:check") && preload.includes("developerUpdates:restart"), "Preload must expose developer update IPC.");
assert(main.includes("DeveloperGitUpdater") && main.includes("registerDeveloperUpdatesIpc") && main.includes("developerUpdates:restart"), "Main process must own developer update detection and restart.");
assert(index.includes('data-agent-control-action="start"') && index.includes('data-agent-control-action="installService"'), "Agent Control must expose real lifecycle and service actions.");
assert(pageMarkup("agent-control").includes("Agent Connection") && pageMarkup("agent-control").includes('data-agent-setting="backendMode"'), "Agent configuration controls must render in Agent Control.");
assert(pageMarkup("agent-control").indexOf("Diagnostics") < pageMarkup("agent-control").indexOf("Agent Connection"), "Agent Connection should sit below Diagnostics in Agent Control.");
assert(!pageMarkup("settings").includes("data-agent-setting"), "Settings must not render the Agent configuration form.");
assert(index.includes("data-agent-log-viewer") && index.includes("data-agent-diagnostics"), "Agent Control must include logs and diagnostics.");
assert(app.includes("runAgentControlAction") && app.includes("refreshAgentControl"), "Agent Control actions must be wired in the renderer.");
assert(app.includes("startAgentControlPolling") && app.includes("agentControlRefreshInFlight"), "Agent Control polling must prevent duplicate overlapping refreshes.");
assert(app.includes("formatAgentCpu") && app.includes("formatAgentMemory") && app.includes("formatAgentProcess"), "Agent Control must format normalized runtime metrics.");
assert(app.includes("agentControlLastRuntimeSnapshot"), "Agent Control must preserve brief stale metrics during transient failures.");
assert(!app.includes('"Service managed"'), "Agent Control must not render Service managed as the primary process value.");
assert(styles.includes(".agent-overview-actions .primary-button:disabled"), "Disabled lifecycle buttons must not keep the active primary styling.");
assert(styles.includes(".node-card__actions") && styles.includes(".node-details-drawer") && styles.includes("@keyframes nodeDrawerIn"), "Nodes polish CSS must include compact cards, drawer, and subtle animation.");
assert(pageMarkup("operations").includes("data-operation-list") && pageMarkup("operations").includes('data-operation-filter="running"'), "Operations Center must expose filterable operation history.");
assert(pageMarkup("operations").includes('data-operation-action="clear-completed"') && pageMarkup("operations").includes("data-operation-detail"), "Operations Center must expose history cleanup and details.");
assert(app.includes("function startOperation") && app.includes("function updateOperation") && app.includes("function renderOperationsCenter"), "Renderer must own centralized operation tracking.");
assert(app.includes("updateMarketplaceOperationFromEvent") && app.includes("activeMarketplaceOperationId"), "Marketplace installs must feed the Operations Center from real progress events.");
assert(app.includes("operationId = startOperation") && app.includes("fileTransfers.set(id"), "File transfers and subsystem actions must create Operations Center entries.");
assert(styles.includes(".operations-shell") && styles.includes("@keyframes operationIndeterminate"), "Operations Center CSS must include page layout and indeterminate progress styling.");
assert(pageMarkup("maintenance").includes("data-maintenance-list") && pageMarkup("maintenance").includes('data-maintenance-action="scan"'), "Maintenance Center must expose real scan controls and category history.");
assert(pageMarkup("maintenance").includes('data-maintenance-action="clear-selected"') && pageMarkup("maintenance").includes('data-maintenance-action="reset-ui"'), "Maintenance Center must expose supported cleanup and UI reset actions.");
assert(app.includes("function scanMaintenanceStorage") && app.includes("function clearMaintenanceCategories") && app.includes("function resetRendererUiState"), "Renderer must wire Maintenance scan, cleanup, and safe UI state reset.");
assert(preload.includes("maintenance:scan") && preload.includes("maintenance:clear"), "Preload must expose narrow Maintenance IPC.");
assert(main.includes("registerMaintenanceIpc"), "Main process must register Maintenance IPC.");
assert(styles.includes(".maintenance-shell") && styles.includes(".maintenance-detail-list"), "Maintenance Center CSS must include page and detail styling.");
assert(index.includes("data-global-search-open") && index.includes("data-global-search-results") && index.includes("data-global-search-recents"), "Global Search must expose a visible trigger, results, and recent searches.");
assert(app.includes("function getGlobalSearchProviders") && app.includes("function runGlobalSearch") && app.includes("GLOBAL_SEARCH_RECENTS_STORAGE_KEY"), "Renderer must wire provider-based Global Search and recent search storage.");
assert(styles.includes(".global-search-dialog") && styles.includes(".global-search-result.is-active"), "Global Search CSS must include dialog and active result styling.");

[
  "@media (max-width: 640px), (max-height: 560px)",
  "max-height: calc(100dvh - var(--titlebar-height) - 12px)",
  "overscroll-behavior: contain",
  "@media (max-width: 760px)",
  "@media (prefers-reduced-motion: reduce)",
  "button:focus-visible",
  "scrollbar-gutter: stable",
].forEach((needle) => assert(styles.includes(needle), `Shared responsive/accessibility CSS is missing: ${needle}`));

console.log("UI polish smoke checks passed.");
