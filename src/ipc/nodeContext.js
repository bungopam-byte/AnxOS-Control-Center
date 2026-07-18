const diagnostics = require("../services/diagnosticsService");

function requireNodeContext(payload = {}, operation = "node-aware request") {
  if (typeof payload.nodeId === "string" && payload.nodeId.trim()) {
    return payload;
  }
  // Feature services must never silently fall back to a legacy/global Agent
  // config when no node was specified; this is the single shared point where
  // that implicit fallback is blocked, and it must leave an audit trail.
  diagnostics.log("warn", "nodes", "implicit-node-fallback-blocked", `Rejected ${operation} request with no selected node instead of silently using global Agent config.`, {
    operation,
  }, { file: "nodes" });
  const error = new Error(`A selected node is required for ${operation}.`);
  error.code = "NODE_REQUIRED";
  error.statusCode = 400;
  error.details = { operation };
  throw error;
}

module.exports = {
  requireNodeContext,
};
