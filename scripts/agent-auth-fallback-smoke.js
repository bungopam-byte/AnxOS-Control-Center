#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
// Git checkouts on Windows may materialize tracked JavaScript with CRLF. The
// assertions inspect source structure, so normalize line endings without
// changing the production files or weakening the required guards.
const normalizeSource = (filePath) => fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
const agentClientSource = normalizeSource(path.join(root, "src", "services", "agentClient.js"));
const systemServiceSource = normalizeSource(path.join(root, "src", "services", "systemService.js"));

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
