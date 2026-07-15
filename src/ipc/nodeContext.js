function requireNodeContext(payload = {}, operation = "node-aware request") {
  if (typeof payload.nodeId === "string" && payload.nodeId.trim()) {
    return payload;
  }
  const error = new Error(`A selected node is required for ${operation}.`);
  error.code = "NODE_REQUIRED";
  error.statusCode = 400;
  error.details = { operation };
  throw error;
}

module.exports = {
  requireNodeContext,
};
