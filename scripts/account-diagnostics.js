const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function mask(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 10) return "[configured]";
  return `${text.slice(0, 6)}...[redacted]...${text.slice(-4)}`;
}

function parseConfigFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (/\.json$/i.test(filePath)) {
    return JSON.parse(raw);
  }
  const sandbox = { window: {}, globalThis: {} };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(raw, sandbox, { filename: filePath, timeout: 1000 });
  return sandbox.window.ANXOS_ACCOUNT_CONFIG || sandbox.globalThis.ANXOS_ACCOUNT_CONFIG || {};
}

function configCandidates() {
  const configDir = process.env.ANXHUB_CONFIG_DIR
    || (process.platform === "win32"
      ? path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "AnxHub", "config")
      : path.join(os.homedir(), ".config", "AnxHub", "config"));
  return [
    process.env.ANXOS_ACCOUNT_CONFIG_PATH,
    path.join(configDir, "account-config.json"),
    path.join(configDir, "account-config.js"),
    path.join(__dirname, "..", "website", "account-config.js"),
  ].filter(Boolean);
}

function loadConfig() {
  const checked = [];
  for (const filePath of configCandidates()) {
    const absolute = path.resolve(filePath);
    if (!fs.existsSync(absolute)) {
      checked.push({ path: absolute, exists: false });
      continue;
    }
    try {
      const parsed = parseConfigFile(absolute);
      checked.push({ path: absolute, exists: true, selected: true });
      return { source: absolute, checked, parsed };
    } catch (error) {
      checked.push({ path: absolute, exists: true, error: error.message });
    }
  }
  return { source: "none", checked, parsed: {} };
}

async function testDeviceStart(accountApiUrl) {
  if (!accountApiUrl) return { skipped: true, reason: "accountApiUrl is not configured" };
  const response = await fetch(`${accountApiUrl}/api/auth/device/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      app: "AnxOS-Control-Center",
      appVersion: require("../package.json").version,
      deviceName: os.hostname(),
      platform: process.platform,
      arch: os.arch(),
      requestedAt: new Date().toISOString(),
    }),
  });
  const text = await response.text().catch(() => "");
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch {}
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type") || "",
    code: body.code || body.error || null,
    message: body.message || body.error_description || body.error || (text ? text.slice(0, 240) : ""),
    hasDeviceCode: Boolean(body.deviceCode || body.device_code),
    hasUserCode: Boolean(body.userCode || body.user_code),
    verificationUrl: body.verificationUrl || body.verification_uri || null,
  };
}

async function main() {
  const { source, checked, parsed } = loadConfig();
  const accountApiUrl = normalizeBaseUrl(process.env.ANXOS_ACCOUNT_API_URL || process.env.ANXOS_SUPABASE_ACCOUNT_FUNCTION_URL || parsed.accountApiUrl);
  const summary = {
    source,
    checked,
    accountApiUrl,
    siteUrl: normalizeBaseUrl(process.env.ANXOS_WEBSITE_BASE_URL || process.env.WEBSITE_BASE_URL || process.env.ANXOS_ACCOUNT_SITE_URL || parsed.siteUrl),
    supabaseUrl: normalizeBaseUrl(process.env.ANXOS_SUPABASE_URL || process.env.SUPABASE_URL || parsed.supabaseUrl),
    supabaseAnonKey: mask(process.env.ANXOS_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || parsed.supabaseAnonKey),
    deviceStart: await testDeviceStart(accountApiUrl).catch((error) => ({ ok: false, error: error.message })),
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
