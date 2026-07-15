const crypto = require("crypto");

const PAIRING_CODE_PREFIX = "ANX";
const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function base64UrlEncodeJson(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function base64UrlDecodeJson(value) {
  try {
    return JSON.parse(Buffer.from(String(value || "").trim(), "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function randomPairingText(length = 10) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => PAIRING_ALPHABET[byte % PAIRING_ALPHABET.length]).join("");
}

function formatFriendlyCode(value) {
  let clean = String(value || "").replace(/[^A-Z2-9]/gi, "").toUpperCase();
  if (clean.startsWith(PAIRING_CODE_PREFIX)) clean = clean.slice(PAIRING_CODE_PREFIX.length);
  return `${PAIRING_CODE_PREFIX}-${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`.replace(/-$/g, "");
}

function createPairingSessionPayload(options = {}) {
  const codeSecret = randomPairingText(12);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + (Number.parseInt(options.ttlMs, 10) || PAIRING_CODE_TTL_MS));
  const payload = {
    type: "anxos-agent-temporary-pairing",
    version: 1,
    code: formatFriendlyCode(codeSecret),
    agentUrl: String(options.agentUrl || "").trim(),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  return {
    pairingCode: `${payload.code}.${base64UrlEncodeJson(payload)}`,
    displayCode: payload.code,
    code: payload.code,
    agentUrl: payload.agentUrl,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  };
}

function normalizePairingCode(value) {
  const raw = String(value || "").trim().replace(/\s+/g, "");
  if (!raw) return "";
  const [friendly, encoded] = raw.split(".", 2);
  const normalizedFriendly = formatFriendlyCode(friendly);
  return encoded ? `${normalizedFriendly}.${encoded}` : normalizedFriendly;
}

function parsePairingCode(value) {
  const normalized = normalizePairingCode(value);
  const [friendly, encoded] = normalized.split(".", 2);
  const payload = encoded ? base64UrlDecodeJson(encoded) : null;
  if (!payload || payload.type !== "anxos-agent-temporary-pairing" || payload.version !== 1) {
    const error = new Error("Invalid Agent pairing code.");
    error.code = "PAIRING_CODE_INVALID";
    throw error;
  }
  if (payload.code !== friendly) {
    const error = new Error("Pairing code checksum did not match.");
    error.code = "PAIRING_CODE_TAMPERED";
    throw error;
  }
  if (!payload.agentUrl || !/^https?:\/\/[^ ]+$/i.test(payload.agentUrl)) {
    const error = new Error("Pairing code does not include a valid Agent address.");
    error.code = "PAIRING_CODE_MISSING_AGENT_URL";
    throw error;
  }
  if (payload.expiresAt && Date.parse(payload.expiresAt) <= Date.now()) {
    const error = new Error("Pairing code expired. Generate a new code from Agent setup.");
    error.code = "PAIRING_CODE_EXPIRED";
    throw error;
  }
  return {
    pairingCode: normalized,
    displayCode: friendly,
    code: friendly,
    agentUrl: String(payload.agentUrl || "").trim(),
    issuedAt: payload.issuedAt || null,
    expiresAt: payload.expiresAt || null,
  };
}

module.exports = {
  PAIRING_CODE_TTL_MS,
  createPairingSessionPayload,
  normalizePairingCode,
  parsePairingCode,
};
