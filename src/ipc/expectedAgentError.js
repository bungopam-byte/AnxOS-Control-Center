const EXPECTED_AGENT_ERROR_CODES = new Set([
  "UNAUTHORIZED",
  "AUTHENTICATION_FAILED",
  "AGENT_UNAVAILABLE",
  "ECONNREFUSED",
  "TIMEOUT",
  "NETWORK_ERROR",
  "NODE_DISABLED",
  "NODE_NOT_FOUND",
  "NODE_REQUIRED",
  "AGENT_INCOMPATIBLE",
  "PAIRING_EXPIRED",
]);

const expectedAgentLogState = new Map();
const EXPECTED_AGENT_LOG_INTERVAL_MS = 60 * 1000;
const DEFAULT_UNEXPECTED_ERROR_OPTIONS = Object.freeze({
  code: "AGENT_READ_FAILED",
  fallbackMessage: "Agent read failed.",
  suggestion: "Verify the selected Agent connection and retry.",
});

function getExpectedAgentErrorCode(error = {}) {
  return String(error.code || error.payload?.error?.code || error.details?.code || "").toUpperCase();
}

function isExpectedAgentError(error = {}) {
  const code = getExpectedAgentErrorCode(error);
  return error.status === 401
    || error.statusCode === 401
    || error.code === "ECONNREFUSED"
    || EXPECTED_AGENT_ERROR_CODES.has(code);
}

function sanitizeExpectedAgentError(error = {}) {
  const code = getExpectedAgentErrorCode(error) || "AGENT_REQUEST_FAILED";
  return {
    code,
    message: error.payload?.error?.message || error.message || "Agent request failed.",
    details: {
      status: error.status || error.statusCode || null,
      nodeId: error.nodeId || error.details?.nodeId || error.payload?.error?.details?.nodeId || null,
      targetLabel: error.targetLabel || error.details?.targetLabel || error.payload?.error?.details?.targetLabel || null,
      endpoint: error.endpoint || error.details?.endpoint || error.payload?.error?.details?.endpoint || null,
    },
  };
}

function noteExpectedAgentIpcError(channel, error = {}) {
  const sanitized = sanitizeExpectedAgentError(error);
  const key = `${channel}:${sanitized.code}:${sanitized.details.nodeId || "unknown"}:${sanitized.details.endpoint || "unknown"}`;
  const previous = expectedAgentLogState.get(key) || { count: 0, suppressed: 0, lastLogAt: 0 };
  const now = Date.now();
  previous.count += 1;
  if (!previous.lastLogAt || now - previous.lastLogAt >= EXPECTED_AGENT_LOG_INTERVAL_MS) {
    console.warn("[Agent IPC] Expected Agent request failed.", {
      channel,
      code: sanitized.code,
      status: sanitized.details.status,
      nodeId: sanitized.details.nodeId,
      targetLabel: sanitized.details.targetLabel,
      endpoint: sanitized.details.endpoint,
      suppressedCount: previous.suppressed,
    });
    previous.lastLogAt = now;
    previous.suppressed = 0;
  } else {
    previous.suppressed += 1;
  }
  expectedAgentLogState.set(key, previous);
}

function expectedAgentFailure(channel, error = {}) {
  noteExpectedAgentIpcError(channel, error);
  return {
    ok: false,
    error: sanitizeExpectedAgentError(error),
  };
}

function wrapExpectedAgentRead(channel, operation, unexpectedErrorOptions = DEFAULT_UNEXPECTED_ERROR_OPTIONS) {
  return Promise.resolve()
    .then(operation)
    .catch((error) => {
      if (isExpectedAgentError(error)) {
        return expectedAgentFailure(channel, error);
      }
      if (unexpectedErrorOptions) {
        throw createIpcError(error, unexpectedErrorOptions);
      }
      throw error;
    });
}

module.exports = {
  EXPECTED_AGENT_ERROR_CODES,
  expectedAgentFailure,
  getExpectedAgentErrorCode,
  isExpectedAgentError,
  noteExpectedAgentIpcError,
  sanitizeExpectedAgentError,
  wrapExpectedAgentRead,
};
const { createIpcError } = require("../shared/ipcError");
