const { ipcMain } = require("electron");
const {
  createPublicAccessService,
  createWindowsFirewallRule,
  deletePublicAccessService,
  getPublicAccessSnapshot,
  listPublicAccessServices,
} = require("../services/publicAccessProviderService");
const { audit, requirePermission } = require("../services/securityService");

const EXPECTED_PUBLIC_ACCESS_ERROR_CODES = new Set([
  "UNAUTHORIZED",
  "AUTHENTICATION_FAILED",
  "AGENT_UNAVAILABLE",
  "AGENT_INCOMPATIBLE",
  "NODE_DISABLED",
  "NODE_NOT_FOUND",
  "NODE_REQUIRED",
  "AGENT_TIMEOUT",
  "TIMEOUT",
  "NETWORK_ERROR",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
]);
const expectedPublicAccessLogState = new Map();
const EXPECTED_PUBLIC_ACCESS_LOG_INTERVAL_MS = 60 * 1000;

function getPublicAccessErrorCode(error = {}) {
  return String(error.code || error.payload?.error?.code || error.details?.code || "").toUpperCase();
}

function isExpectedPublicAccessError(error = {}) {
  const code = getPublicAccessErrorCode(error);
  return error.status === 401
    || error.statusCode === 401
    || EXPECTED_PUBLIC_ACCESS_ERROR_CODES.has(code);
}

function sanitizePublicAccessError(error = {}) {
  const code = getPublicAccessErrorCode(error) || "PUBLIC_ACCESS_REQUEST_FAILED";
  return {
    code,
    message: error.payload?.error?.message || error.message || "Public Access request failed.",
    details: {
      status: error.status || error.statusCode || null,
      nodeId: error.nodeId || error.details?.nodeId || null,
      targetLabel: error.targetLabel || error.details?.targetLabel || null,
    },
  };
}

function noteExpectedPublicAccessError(channel, error = {}) {
  const sanitized = sanitizePublicAccessError(error);
  const key = `${channel}:${sanitized.error?.code || sanitized.code}:${sanitized.details?.nodeId || "unknown"}`;
  const previous = expectedPublicAccessLogState.get(key) || { count: 0, suppressed: 0, lastLogAt: 0 };
  const now = Date.now();
  previous.count += 1;
  if (!previous.lastLogAt || now - previous.lastLogAt >= EXPECTED_PUBLIC_ACCESS_LOG_INTERVAL_MS) {
    console.warn("[Public Access IPC] Expected Agent request failed.", {
      channel,
      code: sanitized.code,
      status: sanitized.details.status,
      nodeId: sanitized.details.nodeId,
      targetLabel: sanitized.details.targetLabel,
      suppressedCount: previous.suppressed,
    });
    previous.lastLogAt = now;
    previous.suppressed = 0;
  } else {
    previous.suppressed += 1;
  }
  expectedPublicAccessLogState.set(key, previous);
}

function invokePublicAccessRead(channel, operation) {
  return Promise.resolve()
    .then(operation)
    .catch((error) => {
      if (isExpectedPublicAccessError(error)) {
        noteExpectedPublicAccessError(channel, error);
        return {
          ok: false,
          error: sanitizePublicAccessError(error),
        };
      }
      throw error;
    });
}

function wrapPublicAccessOperation(operation) {
  return Promise.resolve()
    .then(operation)
    .catch((error) => ({
      ok: false,
      error: {
        code: error?.code || error?.payload?.error?.code || "PUBLIC_ACCESS_REQUEST_FAILED",
        message: error?.payload?.error?.message || error?.message || "Public Access request failed.",
        details: error?.details || error?.payload?.error?.details || null,
      },
    }));
}

function registerPublicAccessIpc() {
  ipcMain.handle("publicAccess:getSnapshot", async (_, payload = {}) => invokePublicAccessRead("publicAccess:getSnapshot", () => getPublicAccessSnapshot(payload)));
  ipcMain.handle("publicAccess:listServices", async (_, payload = {}) => invokePublicAccessRead("publicAccess:listServices", () => listPublicAccessServices(payload)));
  ipcMain.handle("publicAccess:createService", async (_, payload = {}) => wrapPublicAccessOperation(() => {
    requirePermission("instance:write", "public-access");
    audit({ action: "publicAccess.createService", target: payload.providerId || "public-access" });
    return createPublicAccessService(payload);
  }));
  ipcMain.handle("publicAccess:deleteService", async (_, payload = {}) => wrapPublicAccessOperation(() => {
    requirePermission("instance:write", "public-access");
    audit({ action: "publicAccess.deleteService", target: payload.serviceId || payload.id || "public-access" });
    return deletePublicAccessService(payload);
  }));
  ipcMain.handle("publicAccess:createFirewallRule", async (_, payload = {}) => wrapPublicAccessOperation(() => {
    requirePermission("instance:write", "public-access-firewall");
    audit({ action: "publicAccess.createFirewallRule", target: `${payload.protocol || "tcp"}:${payload.localPort || payload.port || ""}` });
    return createWindowsFirewallRule(payload);
  }));
}

module.exports = {
  registerPublicAccessIpc,
  _test: {
    expectedPublicAccessLogState,
    invokePublicAccessRead,
    isExpectedPublicAccessError,
    sanitizePublicAccessError,
  },
};
