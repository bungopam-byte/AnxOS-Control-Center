const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

const expectedPages = ["dashboard", "amp", "playit", "coolpals", "docker", "marketplace", "instances", "ssh", "files", "console", "backups", "security", "owner-workspace", "nodes", "settings"];
expectedPages.forEach((page) => assert(index.includes(`data-page="${page}"`), `Missing workspace root: ${page}`));

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
