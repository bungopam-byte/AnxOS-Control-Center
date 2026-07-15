const { createPairingSessionPayload, normalizePairingCode } = require("../../../src/shared/agentPairing");
const { generateAgentToken, tokenFingerprint, writeAgentConfigToken } = require("../../../src/shared/agentTokenStore");
const { getDeviceIdentity } = require("../services/deviceIdentityService");

let activeSession = null;
const failedAttempts = new Map();

function parseJsonBody(request) {
  try {
    return request.body ? JSON.parse(request.body) : {};
  } catch {
    const error = new Error("Pairing request body must be valid JSON.");
    error.code = "PAIRING_BAD_REQUEST";
    error.statusCode = 400;
    throw error;
  }
}

function getPublicAgentUrl(request, config = {}) {
  const hostHeader = request.headers.host || `${config.host || "127.0.0.1"}:${config.port || 47131}`;
  const hostname = String(config.host || "").trim();
  const scheme = request.socket?.encrypted ? "https" : "http";
  return `${scheme}://${hostname && hostname !== "0.0.0.0" ? `${hostname}:${config.port || 47131}` : hostHeader}`;
}

function isExpired(session = activeSession) {
  return !session || Date.parse(session.expiresAt || "") <= Date.now();
}

function safeSession(session = activeSession) {
  if (!session || isExpired(session)) {
    return {
      status: session ? "expired" : "not_paired",
      active: false,
      expiresAt: session?.expiresAt || null,
      identity: getDeviceIdentity(),
    };
  }
  return {
    status: "waiting",
    active: true,
    pairingCode: session.pairingCode,
    displayCode: session.displayCode,
    expiresAt: session.expiresAt,
    agentUrl: session.agentUrl,
    identity: getDeviceIdentity(),
  };
}

function assertAttemptAllowed(address) {
  const now = Date.now();
  const attempts = (failedAttempts.get(address) || []).filter((timestamp) => now - timestamp < 60 * 1000);
  if (attempts.length >= 8) {
    const error = new Error("Too many pairing attempts. Wait a moment and try again.");
    error.code = "PAIRING_RATE_LIMITED";
    error.statusCode = 429;
    throw error;
  }
  failedAttempts.set(address, attempts);
}

function recordFailedAttempt(address) {
  const attempts = failedAttempts.get(address) || [];
  attempts.push(Date.now());
  failedAttempts.set(address, attempts);
}

function createSession(request, config = {}) {
  activeSession = createPairingSessionPayload({
    agentUrl: getPublicAgentUrl(request, config),
  });
  return safeSession(activeSession);
}

function completePairing(request, config = {}) {
  const address = request.socket?.remoteAddress || "unknown";
  assertAttemptAllowed(address);
  const body = parseJsonBody(request);
  const suppliedCode = normalizePairingCode(body.pairingCode || body.code || "");
  if (!activeSession || isExpired(activeSession) || suppliedCode !== activeSession.pairingCode) {
    recordFailedAttempt(address);
    const error = new Error("This pairing session is no longer available.");
    error.code = "PAIRING_REJECTED";
    error.statusCode = 401;
    throw error;
  }
  const permanentToken = String(body.permanentToken || body.agentToken || "").trim();
  if (!permanentToken || permanentToken.length < 32) {
    recordFailedAttempt(address);
    const error = new Error("Pairing credential was invalid.");
    error.code = "PAIRING_CREDENTIAL_INVALID";
    error.statusCode = 400;
    throw error;
  }
  const configPath = config.tokenStatus?.configPath;
  writeAgentConfigToken(configPath, permanentToken, {
    backendMode: "agent",
    agentUrl: activeSession.agentUrl,
  });
  config.token = permanentToken;
  config.tokenStatus = {
    ...(config.tokenStatus || {}),
    configured: true,
    source: "pairing",
    fingerprint: tokenFingerprint(permanentToken),
  };
  const pairedSession = activeSession;
  activeSession = null;
  return {
    status: "paired",
    paired: true,
    singleUseInvalidated: true,
    restartRequired: false,
    agentUrl: pairedSession.agentUrl,
    identity: getDeviceIdentity(),
    tokenFingerprint: tokenFingerprint(permanentToken),
  };
}

async function handlePairing(request, url, config = {}) {
  if (request.method === "GET" && url.pathname === "/api/v1/pairing/status") {
    return { statusCode: 200, body: safeSession() };
  }
  if (request.method === "POST" && url.pathname === "/api/v1/pairing/start") {
    return { statusCode: 200, body: createSession(request, config) };
  }
  if (request.method === "POST" && url.pathname === "/api/v1/pairing/cancel") {
    activeSession = null;
    return { statusCode: 200, body: { status: "not_paired", active: false, canceled: true } };
  }
  if (request.method === "POST" && url.pathname === "/api/v1/pairing/complete") {
    return { statusCode: 200, body: completePairing(request, config) };
  }
  return null;
}

module.exports = {
  handlePairing,
  _test: {
    createSession,
    completePairing,
    safeSession,
    reset: () => { activeSession = null; failedAttempts.clear(); },
    generateAgentToken,
  },
};
