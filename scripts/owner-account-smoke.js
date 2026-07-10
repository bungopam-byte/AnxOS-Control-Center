const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-owner-account-"));
process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");
process.env.ANXOS_OWNER_EMAILS = "owner@example.com";
process.env.ANXOS_OWNER_ACCOUNT_IDS = "11111111-1111-4111-8111-111111111111";

const repoRoot = path.join(__dirname, "..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function reload(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function resetModules() {
  [
    "../src/services/accountAuthService",
    "../src/services/accountService",
    "../src/services/securityService",
    "../src/services/ownerWorkspaceService",
    "../src/services/ownerAccountConfig",
    "../src/services/secureSessionStore",
  ].forEach((modulePath) => {
    try {
      delete require.cache[require.resolve(modulePath)];
    } catch {}
  });
}

function writeAccountSession(account) {
  const { SecureSessionStore } = reload("../src/services/secureSessionStore");
  const store = new SecureSessionStore({ fileName: "account.json" });
  store.write({
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: Date.now() + 60 * 60 * 1000,
    provider: "Supabase",
    createdAt: new Date().toISOString(),
    account,
  });
}

function clearAccountSession() {
  const { SecureSessionStore } = reload("../src/services/secureSessionStore");
  new SecureSessionStore({ fileName: "account.json" }).clear();
}

function assertSecretRedaction() {
  const accountService = readRepoFile("src/services/accountAuthService.js");
  const ipc = readRepoFile("src/ipc/accountAuthIpc.js");
  assert(accountService.includes("redactSecret"), "Account service must include secret redaction.");
  assert(!/console\.(log|info|warn|error)\([^)]*password/i.test(accountService), "Account service must not log passwords.");
  assert(!/console\.(log|info|warn|error)\([^)]*accessToken/i.test(accountService), "Account service must not log access tokens.");
  assert(!/console\.(log|info|warn|error)\([^)]*refreshToken/i.test(accountService), "Account service must not log refresh tokens.");
  assert(!/console\.(log|info|warn|error)\([^)]*payload/i.test(ipc), "Account IPC must not log raw payloads.");
}

function assertFrontendCannotGrantOwner() {
  const appJs = readRepoFile("app.js");
  const indexHtml = readRepoFile("index.html");
  const workspaceService = readRepoFile("src/services/ownerWorkspaceService.js");
  const securityService = readRepoFile("src/services/securityService.js");
  assert(indexHtml.includes("data-owner-workspace-nav-pages"), "Owner sidebar should include workspace page links container.");
  assert(appJs.includes("securityState?.ownerWorkspaceAvailable"), "Renderer should use trusted security status for owner workspace visibility.");
  assert(appJs.includes("renderOwnerSidebarPages"), "Renderer should populate owner workspace pages in the sidebar.");
  assert(appJs.includes("refreshOwnerWorkspace().catch"), "Owner auth refresh should load workspace pages after sign-in.");
  assert(workspaceService.includes("requireOwner"), "Owner Workspace service must enforce owner authorization.");
  assert(securityService.includes("isOwnerAccount"), "Security service must resolve account owner authorization in the main process.");
}

async function main() {
  fs.mkdirSync(process.env.ANXHUB_CONFIG_DIR, { recursive: true });

  resetModules();
  writeAccountSession({
    id: "11111111-1111-4111-8111-111111111111",
    email: "owner@example.com",
    username: "Anx",
    displayName: "Anx",
  });
  let security = reload("../src/services/securityService");
  let workspace = reload("../src/services/ownerWorkspaceService");
  let status = security.getStatus();
  assert.strictEqual(status.authenticated, true, "Verified account session should authenticate.");
  assert.strictEqual(status.user.role, "Owner", "Allowlisted Supabase account should receive Owner role.");
  assert.strictEqual(status.user.account, true, "Owner account should remain marked as an online account.");
  assert.strictEqual(status.user.ownerAuthorized, true, "Owner account should carry trusted owner authorization.");
  assert.strictEqual(status.ownerWorkspaceAvailable, true, "Owner Workspace should unlock for verified owner account.");
  assert(workspace.getWorkspace().pages.some((page) => page.id === "overview"), "Owner account should read workspace.");

  resetModules();
  writeAccountSession({
    id: "22222222-2222-4222-8222-222222222222",
    email: "normal@example.com",
    username: "Normal",
    displayName: "Normal User",
  });
  security = reload("../src/services/securityService");
  workspace = reload("../src/services/ownerWorkspaceService");
  status = security.getStatus();
  assert.strictEqual(status.authenticated, true, "Normal account session should authenticate.");
  assert.strictEqual(status.user.role, "Account", "Normal Supabase account must not receive Owner role.");
  assert.strictEqual(status.ownerWorkspaceAvailable, false, "Normal account must not unlock Owner Workspace.");
  assert.throws(() => workspace.getWorkspace(), /Owner access is required/, "Normal account direct workspace reads should be denied.");

  resetModules();
  clearAccountSession();
  security = reload("../src/services/securityService");
  workspace = reload("../src/services/ownerWorkspaceService");
  status = security.getStatus();
  assert.strictEqual(status.authenticated, false, "Signed-out user should not authenticate.");
  assert.strictEqual(status.ownerWorkspaceAvailable, false, "Signed-out user must not unlock Owner Workspace.");
  assert.throws(() => workspace.getWorkspace(), /Owner access is required/, "Signed-out workspace reads should be denied.");

  assertFrontendCannotGrantOwner();
  assertSecretRedaction();

  console.log("Owner account smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
