const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function count(source, needle) {
  return source.split(needle).length - 1;
}

[
  "status",
  "health",
  "installation",
  "lifecycle",
  "startup",
  "updates",
  "connection",
  "pairing",
  "remote",
  "credentials",
  "identity",
  "token",
  "diagnostics",
  "paths",
  "developer",
].forEach((section) => {
  assert(index.includes(`data-agent-control-section-target="${section}"`), `Missing Agent Control nav target: ${section}`);
});

[
  "status",
  "health",
  "installation",
  "lifecycle",
  "startup",
  "connection",
  "pairing",
  "remote",
  "identity",
  "diagnostics",
  "developer",
].forEach((section) => {
  assert(index.includes(`data-agent-control-section="${section}"`), `Missing Agent Control content section: ${section}`);
});

[
  "installLocalAgent",
  "forceRestart",
  "start",
  "stop",
  "restart",
  "installService",
  "uninstallService",
  "enableAutoStart",
  "disableAutoStart",
  "checkUpdates",
  "updateAgent",
  "rotateToken",
  "copyUrl",
  "copyId",
  "openLogs",
  "openDataFolder",
  "startPairingSession",
  "copyPairingCode",
  "runDiagnostics",
].forEach((action) => {
  assert.strictEqual(count(index, `data-agent-control-action="${action}"`), 1, `Agent Control action should exist once: ${action}`);
});

assert(index.includes("settings-workspace agent-control-workspace"), "Agent Control must use the Settings-style workspace shell.");
assert(index.includes("settings-nav\" aria-label=\"Agent Control sections\""), "Agent Control must use a Settings-style internal sidebar.");
assert(app.includes("const AGENT_CONTROL_SECTION_ALIASES"), "Agent Control section aliases must avoid duplicate controls.");
assert(app.includes("setActiveAgentControlSection"), "Agent Control must switch sections without rebuilding controls.");
assert(app.includes("window.sessionStorage.setItem(\"anxos-agent-control-section\""), "Agent Control should preserve the current section while on the page.");
assert(app.includes("panel.hidden = panel.dataset.agentControlSection !== normalized"), "Hidden Agent Control sections should be presentation-only toggles.");
assert(!app.includes("setInterval(setActiveAgentControlSection"), "Section switching must not create polling loops.");
assert(styles.includes(".agent-control-workspace .settings-nav"), "Agent Control nav should share Settings sidebar styling.");
assert(styles.includes("[data-agent-control-section][hidden]"), "Hidden Agent Control sections should not occupy layout space.");
assert(index.includes("data-settings-category-target=\"general\""), "Settings navigation must remain present.");

console.log("Agent Control section navigation smoke checks passed.");
