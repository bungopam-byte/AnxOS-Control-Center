#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert(app.includes("function renderLocalAgentSystems"), "Agent Identity renderer must exist.");
assert(app.includes("const activeTarget = resolveActiveManagementTarget();"), "Identity renderer must consume the canonical selected-target model.");
assert(app.includes('activeTarget.targetType === "registered-node"'), "Identity renderer must add the selected registered remote Agent.");
assert(app.includes('"Selected Remote Agent Identity"'), "Selected remote Agent identity must be visibly labeled.");
assert(app.includes("activeTarget.agentUrl || \"Endpoint unavailable\""), "Remote identity must show endpoint.");
assert(app.includes("activeTarget.credentialSource"), "Remote identity must show credential source, not raw token.");
assert(app.includes("activeTarget.lastSuccessfulResponse"), "Remote identity must show last successful response when available.");
const identitySectionStart = index.indexOf('data-agent-control-section="identity"');
const identitySectionEnd = index.indexOf('data-agent-control-section="token"', identitySectionStart);
const identitySection = index.slice(identitySectionStart, identitySectionEnd);
assert(identitySection.includes("Application Host, Local Agent, and the selected Remote Agent are shown as separate identities."), "Identity section copy must distinguish local and remote identities.");
assert(!/agentToken|Authorization|Bearer/.test(identitySection), "Identity section must not expose token or Authorization fields.");

console.log("Remote identity rendering smoke checks passed.");
