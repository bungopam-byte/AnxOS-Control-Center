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
  "recommendations",
  "account",
  "protection",
  "sessions",
  "permissions",
  "remote",
  "owner",
  "devices",
  "activations",
  "token",
  "rotation",
  "revocations",
  "audit",
  "diagnostics",
  "developer",
].forEach((section) => {
  assert(index.includes(`data-security-section-target="${section}"`), `Missing Security nav target: ${section}`);
});

[
  "status",
  "recommendations",
  "account",
  "protection",
  "sessions",
  "permissions",
  "remote",
  "owner",
  "devices",
  "token",
  "audit",
  "developer",
].forEach((section) => {
  assert(index.includes(`data-security-section="${section}"`), `Missing Security content section: ${section}`);
});

[
  "logout",
  "logout-all-sessions",
  "rotate-agent-token",
  "revoke-other-sessions",
  "save-remote-access",
  "copy-remote-details",
  "disable-remote-access",
  "generate-agent-token",
  "revoke-agent-token",
  "save-session-settings",
  "refresh-events",
  "copy-events",
  "open-audit-folder",
  "clear-event-display",
].forEach((action) => {
  assert(count(index, `data-security-action="${action}"`) >= 1, `Missing Security action: ${action}`);
});

assert(index.includes("settings-workspace security-workspace"), "Security must use the Settings-style workspace shell.");
assert(index.includes("settings-nav\" aria-label=\"Security sections\""), "Security must use a Settings-style internal sidebar.");
assert(app.includes("const SECURITY_SECTION_ALIASES"), "Security section aliases must map non-duplicated controls.");
assert(app.includes("setActiveSecuritySection"), "Security must switch sections without rebuilding controls.");
assert(app.includes("window.sessionStorage.setItem(\"anxos-security-section\""), "Security should preserve the current section while on the page.");
assert(app.includes("panel.hidden = panel.dataset.securitySection !== normalized"), "Hidden Security sections should be presentation-only toggles.");
assert(app.includes("const sectionButton = event.target.closest(\"[data-security-section-target]\")"), "Security sidebar clicks must be handled before action delegation.");
assert(!app.includes("setInterval(setActiveSecuritySection"), "Security section switching must not create polling loops.");
assert(styles.includes(".security-workspace .settings-nav"), "Security nav should share Settings sidebar styling.");
assert(styles.includes("[data-security-section][hidden]"), "Hidden Security sections should not occupy layout space.");
assert(index.includes("data-settings-category-target=\"security\""), "Settings owner Security category must remain present.");
assert(!index.includes("data-security-section-target=\"password\""), "Security must not add unsupported placeholder controls.");

console.log("Security section navigation smoke checks passed.");
