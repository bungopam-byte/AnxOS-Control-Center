#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scripts", "agent-token-status.js"), "utf8");

[
  "runningAgentNetworkReachable",
  "runningAgentAuthenticated",
  "runningAgentFingerprint",
  "runningAgentTokenMatches",
  "apiVersion",
  "protocolVersion",
  "statusCode === 401",
  "statusCode === 403",
  "networkErrorCode",
].forEach((needle) => {
  assert(source.includes(needle), `Agent token status utility should report ${needle}.`);
});

assert(!source.includes("runningAgentReachable:"), "Agent token status must not collapse network and authentication states into runningAgentReachable.");
assert(!/console\.log\([^)]*status\.token/i.test(source), "Agent token status must not print raw token values.");

console.log("Agent token status smoke checks passed.");
