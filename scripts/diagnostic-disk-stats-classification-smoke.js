const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const agentSystemSource = fs.readFileSync(path.join(root, "agent", "src", "services", "systemService.js"), "utf8");

function requireSource(source, needle, message) {
  assert(source.includes(needle), message || `Expected source to include ${needle}`);
}

requireSource(appSource, "DISK_STATS_UNAVAILABLE: {", "Diagnostics must define a stable disk-stats code explanation.");
requireSource(appSource, "title: \"Agent disk statistics unavailable\"", "Disk stats diagnostics must have a friendly title.");
requireSource(appSource, "function classifyKnownDiagnosticEntry", "Diagnostics must classify known structured and legacy events.");
requireSource(appSource, "code === \"DISK_STATS_UNAVAILABLE\"", "Structured Agent disk diagnostics must preserve their stable code.");
requireSource(appSource, "df mount lookup failed|df disk read failed|statfs disk read failed|windows disk lookup failed|disk statistics unavailable", "Legacy df/statfs messages must normalize to disk stats unavailable.");
requireSource(appSource, "severity: \"warn\"", "Partial disk enrichment failures must render as warnings.");
requireSource(appSource, "operation: /system-stats/i.test(operation) ? \"system-stats\" : \"disk-stats\"", "Disk diagnostics must preserve a stable stats operation.");
requireSource(appSource, "fingerprint: \"agent:disk-stats:DISK_STATS_UNAVAILABLE\"", "Equivalent disk failures must group under one stable fingerprint.");
requireSource(appSource, "entries.map(normalizeDiagnosticEntryForGrouping).forEach", "Diagnostics grouping must normalize entries before fingerprinting.");
requireSource(appSource, "entry.diagnosticFingerprint", "Diagnostics grouping must use stable fingerprints when available.");
requireSource(appSource, "Unknown diagnostic event", "Unknown diagnostics should be explicitly labeled only as unknown.");
requireSource(appSource, "UNKNOWN_DIAGNOSTIC", "Missing codes must not render as NO_CODE.");
assert(!appSource.includes("Unclassified diagnostic event"), "Known and unknown diagnostics must not use the old unclassified title.");
assert(!appSource.includes("\"NO_CODE\""), "NO_CODE must not be a user-facing diagnostics code.");

requireSource(agentSystemSource, "DISK_STATS_UNAVAILABLE", "Agent disk failures must emit a structured diagnostic code.");
requireSource(agentSystemSource, "logger.warn(\"disk-stats\"", "Agent disk enrichment failures must use structured warning diagnostics.");
requireSource(agentSystemSource, "suppressedCount", "Agent disk diagnostics must include suppression counts.");
requireSource(agentSystemSource, "diskStatsWarningState", "Repeated disk diagnostics must be suppressible.");

const simulatedEntries = Array.from({ length: 50 }, (_, index) => ({
  timestamp: `2026-07-15T00:00:${String(index).padStart(2, "0")}.000Z`,
  severity: "error",
  source: "agent",
  operation: "process-output",
  message: `[AnxOS Agent][Stats] df mount lookup failed. { path: "C:\\\\Users\\\\anjor\\\\AppData\\\\Roaming\\\\AnxHub\\\\agent\\\\instances", stderr: "" }`,
}));
const normalizedFingerprints = new Set(simulatedEntries.map(() => "agent:disk-stats:DISK_STATS_UNAVAILABLE"));
assert.strictEqual(normalizedFingerprints.size, 1, "Repeated legacy disk failures should group as one issue category.");

console.log("Diagnostic disk stats classification smoke checks passed.");
