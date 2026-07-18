const fs = require("fs");
const path = require("path");
const {
  resolveSharedAgentToken,
} = require("../../src/shared/agentTokenStore");
const { readAgentRuntimeConfig } = require("../../src/shared/agentRuntimeConfigStore");

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 47131;
const DEFAULT_REQUEST_TIMEOUT_MS = 120000;
const DEFAULT_MAX_REQUEST_BYTES = 256 * 1024 * 1024;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_INSTANCE_ROOT = "/srv/anxos/instances";
const DEFAULT_API_RATE_LIMIT_PER_MINUTE = 20000;
const DEFAULT_FILE_WRITE_RATE_LIMIT_PER_MINUTE = 12000;
const DEFAULT_CONSOLE_RATE_LIMIT_PER_MINUTE = 120;

let environmentLoaded = false;

function readRuntimeConfig() {
  const candidates = [process.env.ANXOS_AGENT_RUNTIME_CONFIG, process.env.ANXHUB_CONFIG_DIR ? path.join(process.env.ANXHUB_CONFIG_DIR, "agent-runtime.json") : null].filter(Boolean);
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) return readAgentRuntimeConfig(filePath);
  }
  return {};
}

function readInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanEnvValue(value) {
  const text = String(value || "").trim();
  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function loadEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }
      const separator = trimmed.indexOf("=");
      if (separator <= 0) {
        return;
      }
      const key = trimmed.slice(0, separator).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) {
        return;
      }
      process.env[key] = cleanEnvValue(trimmed.slice(separator + 1));
    });
  } catch {
    // The agent can run fully from process environment variables.
  }
}

function getUserConfigEnvPath() {
  const base = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, "anxos-control-center")
    : path.join(process.env.HOME || "", ".config", "anxos-control-center");
  return path.join(base, "agent.env");
}

function loadEnvironment() {
  if (environmentLoaded) {
    return;
  }
  environmentLoaded = true;
  [
    process.env.ANXHUB_AGENT_ENV_PATH,
    process.env.ANXOS_AGENT_ENV_PATH,
    getUserConfigEnvPath(),
    path.join(process.cwd(), ".env"),
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, "..", "..", ".env"),
  ].filter(Boolean).forEach(loadEnvFile);
}

function getConfig() {
  loadEnvironment();
  const runtime = readRuntimeConfig();
  const tokenStatus = resolveSharedAgentToken({
    cwd: process.cwd(),
    environmentToken: process.env.AGENT_TOKEN,
  });
  return {
    host: process.env.AGENT_HOST || runtime.host || DEFAULT_HOST,
    port: readInteger(process.env.AGENT_PORT || runtime.port, DEFAULT_PORT),
    token: tokenStatus.token || "",
    tokenStatus,
    requestTimeoutMs: readInteger(process.env.AGENT_REQUEST_TIMEOUT_MS || runtime.connectionTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS),
    maxRequestBytes: readInteger(process.env.AGENT_MAX_REQUEST_BYTES, DEFAULT_MAX_REQUEST_BYTES),
    maxResponseBytes: readInteger(process.env.AGENT_MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES),
    instanceRoot: process.env.AGENT_INSTANCE_ROOT || DEFAULT_INSTANCE_ROOT,
    allowedFolders: Array.isArray(runtime.allowedFolders) ? runtime.allowedFolders.map(String).filter(Boolean) : [],
    apiRateLimitPerMinute: readInteger(process.env.AGENT_API_RATE_LIMIT_PER_MINUTE, DEFAULT_API_RATE_LIMIT_PER_MINUTE),
    fileWriteRateLimitPerMinute: readInteger(process.env.AGENT_FILE_WRITE_RATE_LIMIT_PER_MINUTE, DEFAULT_FILE_WRITE_RATE_LIMIT_PER_MINUTE),
    consoleRateLimitPerMinute: readInteger(process.env.AGENT_CONSOLE_RATE_LIMIT_PER_MINUTE, DEFAULT_CONSOLE_RATE_LIMIT_PER_MINUTE),
  };
}

module.exports = {
  getConfig,
  loadEnvironment,
};
