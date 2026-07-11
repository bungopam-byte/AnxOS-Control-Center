const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const preload = fs.readFileSync(path.join(root, "preload.js"), "utf8");

const expectedPages = ["dashboard", "amp", "playit", "coolpals", "docker", "marketplace", "instances", "ssh", "files", "console", "backups", "security", "owner-workspace", "agent-control", "nodes", "settings"];
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
assert(app.includes('setAttribute("aria-busy"'), "Async workspace loading must expose aria-busy.");
assert(app.includes("isNodeSwitching() || document.hidden"), "Background polling must pause while the document is hidden.");
assert(index.indexOf("data-development-badge") < index.indexOf("data-titlebar-connection"), "Developer Mode badge must sit beside and before the Connected badge.");
assert(index.includes("data-dev-update-modal") && index.includes('data-dev-update-field="branch"') && index.includes('data-dev-update-action="update"'), "Developer update modal must expose Git status and actions.");
assert(styles.includes('data-dev-state="available"') && styles.includes("devBadgePulse"), "Developer update badge must include a subtle available-update state.");
assert(app.includes("setupDeveloperUpdates") && app.includes("openDeveloperUpdateModal") && app.includes("renderDevelopmentBadge"), "Developer update badge must be wired in the renderer.");
assert(preload.includes("developerUpdates") && preload.includes("developerUpdates:check"), "Preload must expose developer update IPC.");
assert(main.includes("DeveloperGitUpdater") && main.includes("registerDeveloperUpdatesIpc"), "Main process must own developer update detection.");
assert(index.includes('data-agent-control-action="start"') && index.includes('data-agent-control-action="installService"'), "Agent Control must expose real lifecycle and service actions.");
assert(pageMarkup("agent-control").includes("Agent Connection") && pageMarkup("agent-control").includes('data-agent-setting="backendMode"'), "Agent configuration controls must render in Agent Control.");
assert(pageMarkup("agent-control").indexOf("Diagnostics") < pageMarkup("agent-control").indexOf("Agent Connection"), "Agent Connection should sit below Diagnostics in Agent Control.");
assert(!pageMarkup("settings").includes("data-agent-setting"), "Settings must not render the Agent configuration form.");
assert(index.includes("data-agent-log-viewer") && index.includes("data-agent-diagnostics"), "Agent Control must include logs and diagnostics.");
assert(app.includes("runAgentControlAction") && app.includes("refreshAgentControl"), "Agent Control actions must be wired in the renderer.");
assert(app.includes("startAgentControlPolling") && app.includes("agentControlRefreshInFlight"), "Agent Control polling must prevent duplicate overlapping refreshes.");

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
