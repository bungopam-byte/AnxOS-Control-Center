const assert = require("assert");
const Module = require("module");

const handlers = new Map();
const secret = "account-refresh-token-secret";
const originalError = Object.assign(new Error(`refresh_token=${secret}`), {
  code: "ACCOUNT_SESSION_EXPIRED",
  status: 401,
  details: { retryable: true, suggestion: "Sign in again.", provider: "supabase", diagnostics: { refreshToken: secret } },
});
const accountService = new Proxy({
  redactSecret: (value) => String(value).replace(secret, "[redacted]"),
}, {
  get: (target, property) => property in target ? target[property] : async () => {
    if (property === "loginWithPassword") throw originalError;
    return {};
  },
});

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "electron") return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } };
  if (request === "../services/accountAuthService") return accountService;
  if (request === "../services/diagnosticsService") return { log: () => {}, logError: () => {} };
  return originalLoad.call(this, request, parent, isMain);
};

try {
  require("../src/ipc/accountAuthIpc").registerAccountAuthIpc();
} finally {
  Module._load = originalLoad;
}

async function main() {
  const handler = handlers.get("account:loginWithPassword");
  assert(handler, "Account login handler should be registered.");
  const result = await handler({}, { email: "owner@example.com", password: "hidden" });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error.code, "ACCOUNT_SESSION_EXPIRED");
  assert.strictEqual(result.error.retryable, true);
  assert.strictEqual(result.error.status.code, 401);
  assert.strictEqual(result.error.provider.id, "supabase");
  assert.strictEqual(result.error.suggestion, "Sign in again.");
  assert(!JSON.stringify(result).includes(secret), "Account IPC errors must not expose tokens.");
  console.log("Account IPC error contract smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
