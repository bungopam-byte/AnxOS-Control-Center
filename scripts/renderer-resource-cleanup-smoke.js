const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const unloadStart = source.indexOf('window.addEventListener("beforeunload", () => {');
const unloadEnd = source.indexOf('window.addEventListener("error"', unloadStart);
assert(unloadStart >= 0 && unloadEnd > unloadStart, "Renderer should register unload cleanup.");
const unload = source.slice(unloadStart, unloadEnd);

for (const cleanup of [
  "stopAgentControlPolling()",
  "stopOwnerAnalyticsPolling()",
  "stopNodeRefreshPolling()",
  "stopDockerPagePolling()",
  "stopInstanceConsolePolling()",
  "stopMonitoringConsolePolling()",
  "disconnectAllSshListeners()",
  "disposeMonacoEditorResources()",
]) {
  assert(unload.includes(cleanup), `Renderer unload should invoke ${cleanup}.`);
}

console.log("Renderer resource cleanup smoke checks passed.");
