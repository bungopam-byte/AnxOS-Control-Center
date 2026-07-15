#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert(index.includes("Developer Diagnostics"), "Agent Control Developer section must render a meaningful diagnostics panel.");
[
  "targetType",
  "targetId",
  "nodeId",
  "endpoint",
  "targetLabel",
  "credentialSource",
  "tokenConfigured",
  "protocol",
  "compatibility",
  "generation",
].forEach((field) => {
  assert(index.includes(`data-agent-developer-field="${field}"`), `Developer diagnostics must expose ${field}.`);
});
assert(index.includes('data-agent-developer-action="copy"'), "Developer diagnostics must support copying safe diagnostics.");
assert(index.includes('data-agent-developer-action="probe"'), "Developer diagnostics must support a connection probe.");
assert(app.includes("function buildSafeAgentDeveloperDiagnostics"), "Renderer must build sanitized Developer diagnostics.");
assert(app.includes("renderAgentDeveloperDiagnostics(payload);"), "Agent Control refresh must populate Developer diagnostics.");
assert(app.includes("navigator.clipboard.writeText(JSON.stringify(buildSafeAgentDeveloperDiagnostics"), "Copy action must use sanitized diagnostics.");
assert(app.includes("tokenFingerprint") && app.includes("fingerprint unavailable"), "Developer diagnostics must report fingerprints only.");
const builderStart = app.indexOf("function buildSafeAgentDeveloperDiagnostics");
const builderEnd = app.indexOf("function renderAgentDeveloperDiagnostics", builderStart);
const builder = app.slice(builderStart, builderEnd);
assert(!/Authorization|Bearer|agentToken/.test(builder), "Developer diagnostics builder must not include raw credential fields.");

console.log("Agent Developer diagnostics smoke checks passed.");
