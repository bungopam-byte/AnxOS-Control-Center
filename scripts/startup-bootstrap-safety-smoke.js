const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

function requireSource(needle, message) {
  assert(app.includes(needle), message || `app.js is missing ${needle}`);
}

requireSource(
  "function startAppBootstrap()",
  "Bootstrap should use a dedicated startup wrapper so initialization failures still reveal the shell.",
);
requireSource(
  "startStartupFallback();",
  "Bootstrap should still start the startup fallback path from the safe wrapper.",
);
requireSource(
  "catch (error) {",
  "Bootstrap wrapper should guard initialization failures with an error-safe fallback.",
);

console.log("Startup bootstrap safety smoke checks passed.");
