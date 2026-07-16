const AGENT_STATUS = Object.freeze({
  CONNECTING: "Connecting",
  CONNECTED: "Connected",
  AUTHENTICATION_REQUIRED: "Authentication Required",
  OFFLINE: "Offline",
  DEGRADED: "Degraded",
});

const STATUS_TONE = Object.freeze({
  [AGENT_STATUS.CONNECTING]: "installing",
  [AGENT_STATUS.CONNECTED]: "online",
  [AGENT_STATUS.AUTHENTICATION_REQUIRED]: "error",
  [AGENT_STATUS.OFFLINE]: "offline",
  [AGENT_STATUS.DEGRADED]: "warning",
});

const STATUS_SECONDARY = Object.freeze({
  [AGENT_STATUS.CONNECTING]: "Checking the Agent connection.",
  [AGENT_STATUS.CONNECTED]: "An authenticated Agent endpoint responded successfully.",
  [AGENT_STATUS.AUTHENTICATION_REQUIRED]: "Connected to the Agent, but the saved credential was rejected.",
  [AGENT_STATUS.OFFLINE]: "The Agent could not be reached.",
  [AGENT_STATUS.DEGRADED]: "The Agent is reachable, but one or more authenticated checks need attention.",
});

function freezeSnapshot(value) {
  if (!value || typeof value !== "object") return value;
  Object.values(value).forEach((entry) => {
    if (entry && typeof entry === "object" && !Object.isFrozen(entry)) freezeSnapshot(entry);
  });
  return Object.freeze(value);
}

function normalizeAgentStatus(value, fallback = AGENT_STATUS.OFFLINE) {
  const text = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (["connecting", "checking", "starting", "pending", "installing"].includes(text)) return AGENT_STATUS.CONNECTING;
  if (["connected", "online", "running", "ready", "healthy"].includes(text)) return AGENT_STATUS.CONNECTED;
  if (["authentication required", "authentication failed", "auth failed", "unauthorized", "forbidden", "credential rejected", "token rejected"].includes(text)) return AGENT_STATUS.AUTHENTICATION_REQUIRED;
  if (["offline", "unreachable", "disconnected", "connection refused", "timeout", "dns failure", "network failure"].includes(text)) return AGENT_STATUS.OFFLINE;
  if (["degraded", "partial", "limited", "warning", "agent incompatible", "update required"].includes(text)) return AGENT_STATUS.DEGRADED;
  return Object.values(AGENT_STATUS).includes(value) ? value : fallback;
}

function classifyAgentError(error = {}) {
  const status = Number(error.status || error.statusCode || error.payload?.error?.status || 0);
  const code = String(error.code || error.payload?.error?.code || "").toUpperCase();
  const message = String(error.message || error.payload?.error?.message || "");
  const combined = `${code} ${message}`;
  if (status === 401 || status === 403 || /UNAUTHORIZED|AUTHENTICATION|FORBIDDEN|TOKEN|CREDENTIAL|AUTH\b/i.test(combined)) {
    return AGENT_STATUS.AUTHENTICATION_REQUIRED;
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNRESET|NETWORK|TIMEOUT|TIMED? OUT|DNS|REFUSED|UNREACHABLE|FETCH FAILED/i.test(combined)) {
    return AGENT_STATUS.OFFLINE;
  }
  if (status >= 500 || status === 404 || status === 405 || /NOT_SUPPORTED|ENDPOINT|PARTIAL|DEGRADED|INCOMPATIBLE|UNSUPPORTED/i.test(combined)) {
    return AGENT_STATUS.DEGRADED;
  }
  return AGENT_STATUS.OFFLINE;
}

function statusFromConnection(connection = {}) {
  const state = String(connection.status || connection.displayStatus || "");
  if (connection.status === "connecting") return AGENT_STATUS.CONNECTING;
  if (connection.authenticated === true && (connection.authenticatedEndpointOk === true || connection.connected === true)) return AGENT_STATUS.CONNECTED;
  if (connection.authenticated === false || normalizeAgentStatus(state, "") === AGENT_STATUS.AUTHENTICATION_REQUIRED) return AGENT_STATUS.AUTHENTICATION_REQUIRED;
  if (normalizeAgentStatus(state, "") === AGENT_STATUS.DEGRADED || connection.partialFailure) return AGENT_STATUS.DEGRADED;
  if (normalizeAgentStatus(state, "") === AGENT_STATUS.CONNECTING) return AGENT_STATUS.CONNECTING;
  return AGENT_STATUS.OFFLINE;
}

function createAgentStatusSnapshot(input = {}) {
  const target = input.target || {};
  const connection = input.connection || target.connection || {};
  const metadata = input.metadata || {};
  const state = normalizeAgentStatus(input.state, statusFromConnection(connection));
  const secondary = String(input.secondary || input.message || connection.message || STATUS_SECONDARY[state] || "").trim();
  return freezeSnapshot({
    state,
    primary: state,
    label: state,
    tone: STATUS_TONE[state] || "warning",
    secondary,
    targetId: input.targetId || target.id || target.nodeId || null,
    targetType: input.targetType || target.kind || target.targetType || null,
    name: input.name || target.displayName || target.name || null,
    lastSeen: input.lastSeen || connection.lastSeen || null,
    checkedAt: input.checkedAt || connection.checkedAt || null,
    metadata: freezeSnapshot({
      platform: metadata.platform || target.platform || target.agentIdentity?.platform || target.applicationHost?.platform || null,
      type: metadata.type || target.modeLabel || target.nodeTypeLabel || target.targetLabel || null,
      registered: metadata.registered ?? (target.kind === "agent" ? true : null),
    }),
  });
}

module.exports = {
  AGENT_STATUS,
  classifyAgentError,
  createAgentStatusSnapshot,
  normalizeAgentStatus,
};