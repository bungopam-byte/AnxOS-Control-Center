const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-agent-token-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");

const {
  createAgentPairingPayload,
  parseAgentPairingPayload,
  resolveSharedAgentToken,
  rotateSharedAgentToken,
} = require("../src/shared/agentTokenStore");
const { isAuthorized } = require("../agent/src/auth");

function request(headers = {}) {
  return { headers };
}

function auth(headers, config = { token: "shared-token" }, pathname = "/api/v1/stats") {
  return isAuthorized(request(headers), config, pathname);
}

function main() {
  const health = auth({}, { token: "" }, "/api/v1/health");
  assert.strictEqual(health.ok, true, "Public health endpoint should work without authentication.");

  const missing = auth({}, { token: "" });
  assert.strictEqual(missing.ok, false, "Missing server token should fail protected routes.");
  assert.strictEqual(missing.statusCode, 503, "Missing server token should return setup error status.");
  assert.strictEqual(missing.code, "AGENT_TOKEN_MISSING", "Missing server token should return setup error code.");

  const matchedHeader = auth({ "x-agent-token": "shared-token" });
  assert.strictEqual(matchedHeader.ok, true, "Matching X-Agent-Token should authorize.");

  const matchedBearer = auth({ authorization: "Bearer shared-token" });
  assert.strictEqual(matchedBearer.ok, true, "Matching bearer token should authorize.");

  const wrong = auth({ "x-agent-token": "wrong-token" });
  assert.strictEqual(wrong.ok, false, "Wrong token should fail.");
  assert.strictEqual(wrong.statusCode, 401, "Wrong token should return 401.");
  assert.strictEqual(wrong.code, "UNAUTHORIZED", "Wrong token should return unauthorized code.");

  const first = resolveSharedAgentToken();
  assert(first.token && first.token.length > 30, "Shared token should be generated when missing.");
  assert(fs.existsSync(first.configPath), "Shared token should be persisted.");

  process.env.AGENT_TOKEN = "stale-shell-token";
  const conflict = resolveSharedAgentToken();
  assert.strictEqual(conflict.token, first.token, "Stale shell token must not silently override the shared token.");
  assert.strictEqual(conflict.environmentTokenConflict, true, "Stale shell token should be reported as a conflict.");
  assert.strictEqual(conflict.environmentTokenIgnored, true, "Stale shell token should be ignored.");

  const configPath = path.join(process.env.ANXHUB_CONFIG_DIR, "agent.json");
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify({ backendMode: "agent", agentUrl: "http://127.0.0.1:47131", agentToken: "test-token" }, null, 2)}\n`);
  delete process.env.AGENT_TOKEN;
  const replaced = resolveSharedAgentToken();
  assert.notStrictEqual(replaced.token, "test-token", "Weak default token should be replaced.");
  assert.strictEqual(replaced.weakStoredTokenReplaced, true, "Weak token replacement should be reported.");

  const rotated = rotateSharedAgentToken();
  assert(rotated.fingerprint && !rotated.fingerprint.includes(rotated.token), "Rotation should provide only a fingerprint for display.");
  assert.notStrictEqual(rotated.token, replaced.token, "Rotation should create a new token.");

  const pairing = createAgentPairingPayload({ agentUrl: "http://10.0.0.5:47131" });
  assert(pairing.code.startsWith("ANXOS-PAIR."), "Pairing export should produce an AnxOS pairing code.");
  assert(pairing.fingerprint && !pairing.code.includes(pairing.fingerprint), "Pairing code should not rely on fingerprint as the secret.");
  const imported = parseAgentPairingPayload(pairing.code);
  assert.strictEqual(imported.agentUrl, "http://10.0.0.5:47131", "Pairing import should preserve agent URL.");
  assert.strictEqual(imported.fingerprint, pairing.fingerprint, "Pairing import should verify fingerprint.");
  assert(imported.agentToken && imported.agentToken.length > 30, "Pairing import should recover the token for secure local storage.");

  const expired = createAgentPairingPayload({ ttlMs: -1000 });
  assert.throws(() => parseAgentPairingPayload(expired.code), /expired/i, "Expired pairing codes should be rejected.");

  const agentClient = require("../src/services/agentClient");
  agentClient.saveAgentSettings({
    backendMode: "agent",
    agentUrl: "http://10.0.0.5:47131",
    agentToken: imported.agentToken,
  });
  const formOverrideConfig = agentClient.getAgentConfig({
    backendMode: "agent",
    agentUrl: "http://10.0.0.5:47131",
  });
  assert.strictEqual(formOverrideConfig.token, imported.agentToken, "Blank Settings form token should preserve the saved paired token.");

  console.log("Agent token smoke checks passed.");
}

main();
