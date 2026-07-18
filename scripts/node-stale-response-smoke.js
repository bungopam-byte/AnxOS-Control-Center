const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");

[
  "const nodeRequestSerials = new Map();",
  "const serial = (nodeRequestSerials.get(requestLabel) || 0) + 1;",
  "nodeRequestSerials.set(requestLabel, serial);",
  "serial,",
  "nodeRequestSerials.get(context.label) === context.serial",
  "context.version === selectedNodeContextVersion",
  "context.nodeId === getSelectedNodeId()",
].forEach((needle) => assert(appSource.includes(needle), `Node request context should include stale-response guard: ${needle}`));

[
  "if (!shouldSkipNodeScopedPolling() && getActivePageName() === \"dashboard\") refreshDashboard();",
  "if (!shouldSkipNodeScopedPolling() && [\"dashboard\", \"amp\", \"minecraft\"].includes(getActivePageName())) refreshAmpDashboard();",
  "if (!shouldSkipNodeScopedPolling() && [\"dashboard\", \"playit\"].includes(getActivePageName())) refreshPlayitStatus();",
  "if (!shouldSkipNodeScopedPolling() && getActivePageName() === \"marketplace\")",
].forEach((needle) => assert(appSource.includes(needle), `Node-scoped polling should pause during switching/hidden document: ${needle}`));

[
  "if (!isNodeRequestCurrent(requestContext))",
  "if (!isNodeActionStillCurrent(requestContext)) return;",
  "resetNodeScopedRendererState(`Switching to",
  "selectedNodeContextVersion += 1;",
  "dockerRequestSerial += 1;",
  "dependencyRequestSerial += 1;",
  "filesNavigationGeneration",
].forEach((needle) => assert(appSource.includes(needle), `Existing stale-response protection should remain present: ${needle}`));

assert(!appSource.includes("nodeRequestSerials.clear()"), "Request generations should not be cleared while stale callbacks may still complete.");

console.log("Node stale-response smoke checks passed.");
