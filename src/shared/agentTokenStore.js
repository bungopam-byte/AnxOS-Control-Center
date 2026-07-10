const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const WEAK_AGENT_TOKENS = new Set(["test-token", "AnxOS-Token", "anxos-token", ""]);
const DEFAULT_AGENT_CONFIG = {
  backendMode: "local",
  agentUrl: "http://127.0.0.1:47131",
  agentToken: "",
};

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isWeakAgentToken(value) {
  return WEAK_AGENT_TOKENS.has(trimValue(value));
}

function generateAgentToken() {
  return `anx_${crypto.randomBytes(32).toString("base64url")}`;
}

function tokenFingerprint(value) {
  const token = trimValue(value);
  if (!token) return null;
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 12);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function atomicWriteJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => path.resolve(value))));
}

function getCandidateConfigPaths(options = {}) {
  const cwd = options.cwd || process.cwd();
  return unique([
    options.configPath,
    process.env.ANXHUB_AGENT_CONFIG_PATH,
    process.env.ANXHUB_CONFIG_DIR ? path.join(process.env.ANXHUB_CONFIG_DIR, "agent.json") : null,
    options.configDir ? path.join(options.configDir, "agent.json") : null,
    path.join(cwd, "config", "agent.json"),
    path.join(cwd, "..", "config", "agent.json"),
    path.join(cwd, "agent.json"),
  ]);
}

function resolveAgentConfigPath(options = {}) {
  const candidates = getCandidateConfigPaths(options);
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0] || path.join(process.cwd(), "config", "agent.json");
}

function readAgentConfigFile(configPath) {
  const parsed = readJson(configPath);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? { ...DEFAULT_AGENT_CONFIG, ...parsed }
    : { ...DEFAULT_AGENT_CONFIG };
}

function writeAgentConfigToken(configPath, token, updates = {}) {
  const current = readAgentConfigFile(configPath);
  const next = {
    ...current,
    ...updates,
    agentToken: token,
  };
  atomicWriteJson(configPath, next);
  return next;
}

function resolveSharedAgentToken(options = {}) {
  const configPath = resolveAgentConfigPath(options);
  const config = readAgentConfigFile(configPath);
  const storedToken = trimValue(config.agentToken);
  const environmentToken = trimValue(options.environmentToken ?? process.env.AGENT_TOKEN);
  const usableStoredToken = storedToken && !isWeakAgentToken(storedToken) ? storedToken : "";
  const usableEnvironmentToken = environmentToken && !isWeakAgentToken(environmentToken) ? environmentToken : "";
  const weakStoredTokenReplaced = Boolean(storedToken && isWeakAgentToken(storedToken));
  const weakEnvironmentTokenIgnored = Boolean(environmentToken && isWeakAgentToken(environmentToken));
  const shouldWrite = options.write !== false;

  let token = usableStoredToken;
  let source = usableStoredToken ? "shared-config" : "generated";

  if (!token && usableEnvironmentToken) {
    token = usableEnvironmentToken;
    source = "environment-bootstrap";
  }

  if (!token) {
    token = generateAgentToken();
    source = "generated";
  }

  if (shouldWrite && (!usableStoredToken || weakStoredTokenReplaced || storedToken !== token)) {
    writeAgentConfigToken(configPath, token, {
      backendMode: config.backendMode || DEFAULT_AGENT_CONFIG.backendMode,
      agentUrl: config.agentUrl || DEFAULT_AGENT_CONFIG.agentUrl,
    });
  }

  const envTokenPresent = Boolean(environmentToken);
  const envTokenMatches = envTokenPresent ? environmentToken === token : null;
  const envTokenConflict = Boolean(envTokenPresent && usableEnvironmentToken && usableStoredToken && environmentToken !== token);

  return {
    token,
    configPath,
    source,
    configured: Boolean(token),
    generated: source === "generated",
    environmentTokenPresent: envTokenPresent,
    environmentTokenMatches: envTokenMatches === null ? null : Boolean(envTokenMatches),
    environmentTokenConflict: envTokenConflict,
    environmentTokenIgnored: Boolean(envTokenConflict || weakEnvironmentTokenIgnored),
    weakStoredTokenReplaced,
    weakEnvironmentTokenIgnored,
    fingerprint: tokenFingerprint(token),
  };
}

function rotateSharedAgentToken(options = {}) {
  const configPath = resolveAgentConfigPath(options);
  const token = generateAgentToken();
  writeAgentConfigToken(configPath, token, options.updates || {});
  return {
    token,
    configPath,
    fingerprint: tokenFingerprint(token),
    restartRequired: true,
  };
}

module.exports = {
  DEFAULT_AGENT_CONFIG,
  generateAgentToken,
  getCandidateConfigPaths,
  isWeakAgentToken,
  resolveAgentConfigPath,
  resolveSharedAgentToken,
  rotateSharedAgentToken,
  tokenFingerprint,
};
