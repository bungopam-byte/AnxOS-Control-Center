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

function requireStyle(needle, message) {
  assert(styles.includes(needle), message || `styles.css is missing ${needle}`);
}

[
  "data-global-search-open",
  "data-global-search",
  'role="dialog" aria-modal="true"',
  "data-global-search-input",
  "data-global-search-results",
  "data-global-search-status",
  "data-global-search-recents",
  "data-global-search-clear-recents",
].forEach((needle) => requireIndex(needle, `Global Search shell must expose ${needle}.`));

[
  "const globalSearchState",
  "GLOBAL_SEARCH_RECENTS_STORAGE_KEY",
  "GLOBAL_SEARCH_DEBOUNCE_MS",
  "GLOBAL_SEARCH_PROVIDER_LIMIT",
  "GLOBAL_SEARCH_TOTAL_LIMIT",
  "function getGlobalSearchProviders",
  "function openGlobalSearch",
  "function closeGlobalSearch",
  "function runGlobalSearch",
  "function renderGlobalSearchResults",
  "function appendHighlightedText",
  "function isSensitiveSearchQuery",
  "function rememberGlobalSearchQuery",
  "function handleGlobalSearchKeydown",
  "requestId",
  "Promise.allSettled",
].forEach((needle) => requireApp(needle, `Global Search renderer must implement ${needle}.`));

[
  'id: "workspaces"',
  'id: "nodes"',
  'id: "instances"',
  'id: "marketplace"',
  'id: "files"',
  'id: "settings"',
  'id: "operations"',
  'id: "maintenance"',
  'id: "security"',
  'id: "diagnostics"',
  'id: "owner-workspace"',
].forEach((needle) => requireApp(needle, `Global Search provider missing ${needle}.`));

assert(
  app.includes("isOwnerWorkspaceAuthorized()") && app.includes("providers.push") && app.includes('id: "owner-workspace"'),
  "Owner Workspace provider must be permission gated.",
);
assert(
  app.includes("Current directory only") && !app.includes("recursive Files search"),
  "Files provider must remain bounded to loaded/current file data.",
);
assert(
  app.includes("latestFilesListing?.entries") && app.includes("storageConnectionsState.connections"),
  "Files provider must search current entries and mounted storage connections only.",
);
assert(
  app.includes("operationStatusLabel(operation.status)") && app.includes("maintenanceStatusLabel(category.status)"),
  "Operations and Maintenance providers must reuse existing state labels.",
);
assert(
  app.includes("dashboard.sessions || []") &&
    app.includes("dashboard.trustedDevices || []") &&
    app.includes("dashboard.events || []") &&
    app.includes("openSecuritySection(entry.section"),
  "Security provider must search loaded sessions, trusted devices, events, and real Security sections.",
);
assert(
  app.includes("window.localStorage.setItem(GLOBAL_SEARCH_RECENTS_STORAGE_KEY") &&
    app.includes("window.localStorage.removeItem(key)") &&
    app.includes("GLOBAL_SEARCH_RECENTS_STORAGE_KEY,"),
  "Recent Global Search terms must persist and be included in Reset UI State.",
);
assert(
  /password|token|secret|api\[-_ \]\?key|bearer\\s\+|sk-/.test(app),
  "Sensitive query exclusion must cover credentials and tokens.",
);
assert(
  app.includes('event.key.toLowerCase() === "k"') &&
    app.includes("event.ctrlKey || event.metaKey") &&
    app.includes('event.key === "Escape"') &&
    app.includes('event.key === "ArrowDown"') &&
    app.includes('event.key === "ArrowUp"') &&
    app.includes('event.key === "Enter"'),
  "Global Search keyboard shortcut and navigation handling must be wired.",
);
assert(
  app.includes("document.createElement(\"mark\")") &&
    app.includes("append(document.createTextNode") &&
    !app.includes("globalSearchResults.innerHTML"),
  "Global Search results must be rendered with safe DOM construction.",
);

[
  ".global-search-backdrop",
  ".global-search-dialog",
  ".global-search-input",
  ".global-search-results",
  ".global-search-result.is-active",
  ".global-search-highlight",
  ".global-search-empty",
].forEach((needle) => requireStyle(needle, `Global Search CSS must include ${needle}.`));

console.log("Global Search smoke checks passed.");
