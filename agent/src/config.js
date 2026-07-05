const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 47131;
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
const DEFAULT_MAX_REQUEST_BYTES = 1024;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function readInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig() {
  return {
    host: process.env.AGENT_HOST || DEFAULT_HOST,
    port: readInteger(process.env.AGENT_PORT, DEFAULT_PORT),
    token: process.env.AGENT_TOKEN || "",
    requestTimeoutMs: readInteger(process.env.AGENT_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS),
    maxRequestBytes: readInteger(process.env.AGENT_MAX_REQUEST_BYTES, DEFAULT_MAX_REQUEST_BYTES),
    maxResponseBytes: readInteger(process.env.AGENT_MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES),
  };
}

module.exports = {
  getConfig,
};
