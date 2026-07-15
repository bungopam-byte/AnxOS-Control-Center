#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const agentClientSource = fs.readFileSync(path.join(root, "src", "services", "agentClient.js"), "utf8");
const systemServiceSource = fs.readFileSync(path.join(root, "src", "services", "systemService.js"), "utf8");

[
  "function isCompatibilityFallbackAllowed",
  "status === 401",
  "AUTHENTICATION_FAILED",
  "NODE_DISABLED",
  "NODE_NOT_FOUND",
  "status === 404",
  "status === 405",
].forEach((needle) => {
  assert(agentClientSource.includes(needle), `Agent client fallback predicate missing ${needle}.`);
});

const getSystemStatsBody = agentClientSource.match(/async function getSystemStats[\s\S]*?\n}\n\nasync function isHealthy/)?.[0] || "";
assert(getSystemStatsBody.includes("if (!isCompatibilityFallbackAllowed(error))") && getSystemStatsBody.includes("throw error;"), "Configured Agent stats must not fallback after authentication failures.");
assert(systemServiceSource.includes("if (!agentClient.isCompatibilityFallbackAllowed(error))") && systemServiceSource.includes("throw error;"), "Node-scoped system stats must not fallback after authentication failures.");

console.log("Agent auth fallback smoke checks passed.");
