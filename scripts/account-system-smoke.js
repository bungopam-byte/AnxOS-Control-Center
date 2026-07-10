const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertWebsiteAccountUi() {
  const index = read("website/index.html");
  const activate = read("website/activate.html");
  const site = read("website/site.js");
  const accountConfig = read("website/account-config.js");

  assert(index.includes('data-auth-form="signin"'), "Website should include a real sign-in form.");
  assert(index.includes('data-auth-form="signup"'), "Website should include a real sign-up form.");
  assert(index.includes('data-auth-form="forgot"'), "Website should include forgot-password form.");
  assert(index.includes('data-auth-form="reset"'), "Website should include reset-password form.");
  assert(activate.includes('data-device-action="approve"'), "Dedicated activation page should include device approval action.");
  assert(activate.includes('data-device-login-form'), "Dedicated activation page should include device lookup form.");
  assert(index.includes('data-account-devices'), "Website should include account devices list.");
  assert(index.includes('data-account-sessions'), "Website should include account sessions list.");
  assert(index.includes('data-account-events'), "Website should include security history list.");
  assert(!index.includes("Account service unavailable"), "Placeholder unavailable panel should be removed.");
  assert(!index.includes("Sign up is not live yet"), "Placeholder signup panel should be removed.");
  assert(!index.includes("Approval requires backend setup"), "Placeholder device backend panel should be removed.");
  assert(site.includes("supabase.createClient"), "Website should initialize Supabase Auth.");
  assert(site.includes("signInWithPassword"), "Website should implement email/password sign-in.");
  assert(site.includes("auth.signUp"), "Website should implement sign-up.");
  assert(site.includes("resetPasswordForEmail"), "Website should implement forgot-password.");
  assert(site.includes("updateUser({ password"), "Website should implement password reset.");
  assert(site.includes("/api/auth/device/lookup"), "Website should look up device authorization requests.");
  assert(site.includes('/api/auth/device/${action}') && site.includes('approveOrDenyDevice("approve")'), "Website should approve device authorization requests.");
  assert(site.includes('/api/auth/device/${action}') && site.includes('approveOrDenyDevice("deny")'), "Website should deny device authorization requests.");
  assert(site.includes("redactSecret"), "Website should redact secrets from messages.");
  assert(accountConfig.includes("supabaseAnonKey") && !/service[_-]?role/i.test(accountConfig), "Public account config must not mention service-role secrets.");
}

function assertSupabaseBackend() {
  const migration = read("supabase/migrations/202607100001_anxos_accounts.sql");
  const fn = read("supabase/functions/anxos-account/index.ts");

  [
    "create table if not exists public.profiles",
    "create table if not exists public.device_authorization_requests",
    "create table if not exists public.registered_devices",
    "create table if not exists public.account_sessions",
    "create table if not exists public.security_events",
    "alter table public.profiles enable row level security",
    "alter table public.device_authorization_requests enable row level security",
    "profiles_update_own_safe_fields",
    "'user'",
    "cleanup_expired_device_authorizations",
  ].forEach((needle) => assert(migration.includes(needle), `Migration missing ${needle}`));

  [
    "/api/auth/device/start",
    "/api/auth/device/poll",
    "/api/auth/device/lookup",
    "/api/auth/device/approve",
    "/api/auth/device/deny",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/account/devices",
    "/api/account/sessions",
    "/api/account/security-events",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANXOS_DESKTOP_TOKEN_SECRET",
    "ANXOS_ALLOWED_ORIGINS",
    "slow_down",
    "consumed_at",
    "refresh_token_hash",
    "timingSafeEqual",
  ].forEach((needle) => assert(fn.includes(needle), `Edge Function missing ${needle}`));

  assert(!fn.includes("access-control-allow-origin\": \"*\""), "Production CORS must not be wildcard.");
  assert(fn.includes("sanitizeMessage") && fn.includes("[redacted]"), "Edge Function should redact secret-like values.");
}

function assertDesktopIntegration() {
  const service = read("src/services/accountAuthService.js");
  const ipc = read("src/ipc/accountAuthIpc.js");
  const preload = read("preload.js");

  assert(service.includes("ANXOS_SUPABASE_ACCOUNT_FUNCTION_URL"), "Desktop should support Supabase function URL env alias.");
  assert(service.includes("/api/auth/device/start") && service.includes("/api/auth/device/poll"), "Desktop should use device authorization endpoints.");
  assert(service.includes("/api/auth/refresh") && service.includes("/api/auth/logout"), "Desktop should refresh and revoke account sessions.");
  assert(service.includes("/api/account/devices/revoke"), "Desktop should support current-device revocation.");
  assert(service.includes("SecureSessionStore"), "Desktop should store account tokens through secure session storage.");
  assert(service.includes("redactSecret"), "Desktop should redact account secrets.");
  assert(!service.includes(["bungopam-byte", "github.io"].join(".")), "Desktop must not open the old GitHub Pages account URLs.");
  assert(ipc.includes("account:listDevices") && ipc.includes("account:revokeCurrentDevice"), "IPC should expose account device operations.");
  assert(preload.includes("listDevices") && preload.includes("revokeCurrentDevice"), "Preload should expose account device operations.");
}

function assertDocsAndEnv() {
  const env = read(".env.example");
  const docs = read("docs/anxos-account-production.md");
  const readme = read("website/README.md");

  assert(env.includes("ANXOS_ACCOUNT_API_URL"), ".env.example should document desktop account API URL.");
  assert(env.includes("SUPABASE_SERVICE_ROLE_KEY"), ".env.example should document server-only service role key.");
  assert(docs.includes("Supabase Auth") && docs.includes("Edge Function"), "Production docs should cover Supabase Auth and Edge Functions.");
  assert(docs.includes("Never put") && docs.includes("SUPABASE_SERVICE_ROLE_KEY"), "Production docs should warn about server-only secrets.");
  assert(docs.includes("Online AnxOS roles do not unlock the local Owner Workspace"), "Docs should preserve local owner separation.");
  assert(readme.includes("account-config.js") && readme.includes("public browser-safe values"), "Website README should document public account config.");
}

assertWebsiteAccountUi();
assertSupabaseBackend();
assertDesktopIntegration();
assertDocsAndEnv();

console.log("Account system smoke checks passed.");
