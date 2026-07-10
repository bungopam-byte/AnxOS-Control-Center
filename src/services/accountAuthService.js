const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { app, shell } = require("electron");
const { SecureSessionStore, getDefaultConfigDirectory } = require("./secureSessionStore");

const WEBSITE_BASE_URL = "https://anxos-control-center.pages.dev";
const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_DEVICE_LOGIN_TTL_MS = 10 * 60 * 1000;
const MAX_POLL_MS = 10 * 60 * 1000;
const APPROVED_AUTH_HOSTS = new Set([
  "anxos-control-center.pages.dev",
  "localhost",
  "127.0.0.1",
]);
const APPROVED_SUPABASE_FUNCTION_HOST = /^[a-z0-9-]+\.functions\.supabase\.co$/i;

let currentSession = null;
let pendingDeviceLogin = null;
let pendingRequestInFlight = false;

const sessionStore = new SecureSessionStore({ fileName: "account.json" });

function getConfigDirectory() {
  return getDefaultConfigDirectory();
}

function ensureConfigDirectory() {
  fs.mkdirSync(getConfigDirectory(), { recursive: true });
}

function getAuditPath() {
  return path.join(getConfigDirectory(), "audit.log");
}

function normalizeBaseUrl(value, fallback = "") {
  return String(value || fallback).replace(/\/+$/, "");
}

function getWebsiteBaseUrl() {
  return normalizeBaseUrl(process.env.ANXOS_WEBSITE_BASE_URL || process.env.WEBSITE_BASE_URL || process.env.ANXOS_ACCOUNT_SITE_URL, WEBSITE_BASE_URL);
}

function buildWebsiteUrl(route = "account", params = {}) {
  const base = assertApprovedExternalUrl(getWebsiteBaseUrl(), "website base");
  const normalizedRoute = String(route || "account").replace(/^#?\/?/, "");
  const url = new URL(base);
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  url.hash = `${normalizedRoute}${search.toString() ? `?${search.toString()}` : ""}`;
  return url.toString();
}

function getAccountApiUrl() {
  return normalizeBaseUrl(
    process.env.ANXOS_ACCOUNT_API_URL ||
    process.env.ANXOS_SUPABASE_ACCOUNT_FUNCTION_URL,
    ""
  );
}

function assertApprovedExternalUrl(rawUrl, purpose = "account") {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    const error = new Error("Account URL is invalid.");
    error.code = "ACCOUNT_URL_INVALID";
    throw error;
  }

  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    const error = new Error("AnxOS account sign-in requires HTTPS outside local development.");
    error.code = "ACCOUNT_HTTPS_REQUIRED";
    throw error;
  }
  const isApprovedSupabaseFunction = APPROVED_SUPABASE_FUNCTION_HOST.test(parsed.hostname);
  if (!APPROVED_AUTH_HOSTS.has(parsed.hostname) && !isApprovedSupabaseFunction && !process.env.ANXOS_ACCOUNT_ALLOW_UNTRUSTED_HOSTS) {
    const error = new Error(`Refusing to open unapproved ${purpose} URL.`);
    error.code = "ACCOUNT_URL_NOT_APPROVED";
    throw error;
  }
  return parsed.toString();
}

function redactSecret(value) {
  return String(value || "")
    .replace(/(access[_-]?token|refresh[_-]?token|device[_-]?code|authorization|secret|password)["'=:\s]+[^"',\s}]+/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[redacted]");
}

function publicAccount(session) {
  if (!session) {
    return null;
  }
  return {
    id: session.account?.id || session.user?.id || null,
    username: session.account?.username || session.user?.username || session.account?.email || session.user?.email || "AnxOS Account",
    email: session.account?.email || session.user?.email || null,
    displayName: session.account?.displayName || session.user?.displayName || session.account?.username || session.user?.username || "AnxOS Account",
    provider: session.provider || session.account?.provider || "AnxOS",
    connectedAt: session.createdAt || null,
    device: session.device ? {
      id: session.device.id || session.device.deviceId || null,
      name: session.device.device_name || session.device.deviceName || null,
      platform: session.device.platform || null,
      appVersion: session.device.app_version || session.device.appVersion || null,
    } : null,
  };
}

function audit(event) {
  try {
    ensureConfigDirectory();
    fs.appendFileSync(getAuditPath(), `${JSON.stringify({
      at: new Date().toISOString(),
      actor: publicAccount(getCurrentSession({ allowExpired: true })),
      action: event.action,
      outcome: event.outcome || "ok",
      target: event.target || null,
      reason: event.reason || null,
    })}\n`, { mode: 0o600 });
  } catch {}
}

function normalizeSession(payload = {}) {
  const accessToken = payload.accessToken || payload.access_token || payload.token || null;
  const refreshToken = payload.refreshToken || payload.refresh_token || null;
  if (!accessToken) {
    const error = new Error("Account login response did not include an access token.");
    error.code = "ACCOUNT_TOKEN_MISSING";
    throw error;
  }
  const expiresAt = payload.expiresAt
    ? Date.parse(payload.expiresAt)
    : Date.now() + ((Number.parseInt(payload.expiresIn || payload.expires_in, 10) || DEFAULT_SESSION_TTL_MS / 1000) * 1000);
  if (!Number.isFinite(expiresAt)) {
    const error = new Error("Account login response included an invalid expiration time.");
    error.code = "ACCOUNT_TOKEN_EXPIRATION_INVALID";
    throw error;
  }
  return {
    accessToken,
    refreshToken,
    expiresAt,
    account: payload.account || payload.user || null,
    device: payload.device || null,
    provider: payload.provider || "AnxOS",
    createdAt: payload.connectedAt || payload.createdAt || new Date().toISOString(),
  };
}

function writeSession(session) {
  currentSession = session;
  sessionStore.write(session);
}

function clearSession() {
  currentSession = null;
  sessionStore.clear();
}

function getCurrentSession(options = {}) {
  if (!currentSession) {
    currentSession = sessionStore.read();
  }
  if (!currentSession?.accessToken) {
    return null;
  }
  if (!options.allowExpired && (!Number.isFinite(currentSession.expiresAt) || currentSession.expiresAt <= Date.now())) {
    return null;
  }
  return currentSession;
}

async function postJson(url, payload, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);
  try {
    const response = await fetch(assertApprovedExternalUrl(url, "account API"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: JSON.stringify(payload || {}),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(redactSecret(data.message || data.error_description || data.error || `Account request failed with HTTP ${response.status}.`));
      error.code = data.code || data.error || `HTTP_${response.status}`;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Account service timed out. Try again.");
      timeoutError.code = "ACCOUNT_TIMEOUT";
      throw timeoutError;
    }
    if (/fetch failed|network|ENOTFOUND|ECONNREFUSED/i.test(error?.message || "")) {
      const networkError = new Error("Account service is unavailable. Check your internet connection.");
      networkError.code = "ACCOUNT_NETWORK_UNAVAILABLE";
      throw networkError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);
  try {
    const response = await fetch(assertApprovedExternalUrl(url, "account API"), {
      method: "GET",
      headers: {
        ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(redactSecret(data.message || data.error_description || data.error || `Account request failed with HTTP ${response.status}.`));
      error.code = data.code || data.error || `HTTP_${response.status}`;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Account service timed out. Try again.");
      timeoutError.code = "ACCOUNT_TIMEOUT";
      throw timeoutError;
    }
    if (/fetch failed|network|ENOTFOUND|ECONNREFUSED/i.test(error?.message || "")) {
      const networkError = new Error("Account service is unavailable. Check your internet connection.");
      networkError.code = "ACCOUNT_NETWORK_UNAVAILABLE";
      throw networkError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getDeviceInfo() {
  let version = null;
  try {
    version = app?.getVersion?.() || null;
  } catch {}
  return {
    app: "AnxOS-Control-Center",
    appVersion: version,
    deviceName: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    requestedAt: new Date().toISOString(),
  };
}

function createLocalPendingDeviceLogin() {
  const userCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const deviceCode = crypto.randomBytes(32).toString("base64url");
  return {
    deviceCode,
    userCode,
    verificationUrl: buildWebsiteUrl("activate", { code: userCode }),
    expiresAt: new Date(Date.now() + DEFAULT_DEVICE_LOGIN_TTL_MS).toISOString(),
    intervalMs: 3000,
    createdAt: Date.now(),
    localOnly: true,
    device: getDeviceInfo(),
  };
}

function normalizeDeviceStartResponse(response = {}) {
  const expiresIn = Number.parseInt(response.expiresIn || response.expires_in, 10);
  const pollInterval = Number.parseInt(response.pollInterval || response.interval || response.poll_interval, 10);
  const login = {
    deviceCode: response.deviceCode || response.device_code,
    userCode: response.userCode || response.user_code,
    verificationUrl: response.verificationUrl || response.verification_uri || response.verificationUri,
    expiresAt: response.expiresAt || new Date(Date.now() + ((Number.isFinite(expiresIn) ? expiresIn : 600) * 1000)).toISOString(),
    intervalMs: Math.max(1500, (Number.isFinite(pollInterval) ? pollInterval : 3) * 1000),
    createdAt: Date.now(),
    localOnly: false,
    device: getDeviceInfo(),
  };
  if (!login.deviceCode || !login.userCode || !login.verificationUrl) {
    const error = new Error("Account service returned an incomplete device authorization response.");
    error.code = "ACCOUNT_DEVICE_RESPONSE_INVALID";
    throw error;
  }
  assertApprovedExternalUrl(login.verificationUrl, "verification");
  return login;
}

function publicPending(login = pendingDeviceLogin) {
  if (!login) {
    return null;
  }
  return {
    userCode: login.userCode,
    verificationUrl: login.verificationUrl,
    expiresAt: login.expiresAt,
    intervalMs: login.intervalMs,
    device: login.device,
  };
}

function getStatus() {
  const session = getCurrentSession();
  const storedSession = session || getCurrentSession({ allowExpired: true });
  const expired = Boolean(storedSession && !session);
  return {
    configured: Boolean(getAccountApiUrl()),
    authenticated: Boolean(session),
    account: publicAccount(storedSession),
    expiresAt: storedSession ? new Date(storedSession.expiresAt).toISOString() : null,
    sessionStatus: session ? "active" : expired ? "expired" : "local",
    accountPath: sessionStore.filePath,
    siteUrl: getWebsiteBaseUrl(),
    currentDevice: getDeviceInfo(),
    pending: publicPending(),
  };
}

async function startDeviceLogin() {
  if (pendingRequestInFlight) {
    return { ...getStatus(), state: "pending", message: "A sign-in request is already starting." };
  }
  if (pendingDeviceLogin && Date.parse(pendingDeviceLogin.expiresAt) > Date.now()) {
    return { ...getStatus(), state: "pending", message: "A sign-in request is already waiting." };
  }

  pendingRequestInFlight = true;
  try {
    const apiUrl = getAccountApiUrl();
    pendingDeviceLogin = apiUrl
      ? normalizeDeviceStartResponse(await postJson(`${apiUrl}/api/auth/device/start`, getDeviceInfo()))
      : createLocalPendingDeviceLogin();
    const verificationUrl = assertApprovedExternalUrl(pendingDeviceLogin.verificationUrl, "verification");
    await shell.openExternal(verificationUrl);
    audit({
      action: "account.deviceLogin.start",
      outcome: "ok",
      target: pendingDeviceLogin.localOnly ? "local-placeholder" : "device-login",
      reason: pendingDeviceLogin.localOnly ? "ACCOUNT_API_NOT_CONFIGURED" : null,
    });
    return {
      ...getStatus(),
      state: "pending",
      message: pendingDeviceLogin.localOnly
        ? "Opened the AnxOS account page. Configure ANXOS_ACCOUNT_API_URL to enable live website sign-in."
        : "Opened the AnxOS account page. Finish sign-in in your browser.",
    };
  } catch (error) {
    pendingDeviceLogin = null;
    throw error;
  } finally {
    pendingRequestInFlight = false;
  }
}

function cancelDeviceLogin() {
  pendingDeviceLogin = null;
  audit({ action: "account.deviceLogin.cancel", outcome: "ok" });
  return { ...getStatus(), state: "cancelled", message: "AnxOS account sign-in was cancelled." };
}

async function checkDeviceLogin() {
  if (!pendingDeviceLogin) {
    return { ...getStatus(), state: "idle", message: "No account sign-in is waiting." };
  }
  if (Date.now() - pendingDeviceLogin.createdAt > MAX_POLL_MS || Date.parse(pendingDeviceLogin.expiresAt) <= Date.now()) {
    pendingDeviceLogin = null;
    return { ...getStatus(), state: "expired", message: "Account sign-in expired. Start again." };
  }
  if (pendingDeviceLogin.localOnly) {
    return { ...getStatus(), state: "pending", message: "Waiting for the AnxOS account backend to be configured." };
  }

  const response = await postJson(`${getAccountApiUrl()}/api/auth/device/poll`, { deviceCode: pendingDeviceLogin.deviceCode });
  const state = response.state || response.status || (response.pending ? "pending" : null);
  if (state === "pending" || state === "authorization_pending") {
    return { ...getStatus(), state: "pending", message: "Waiting for browser sign-in approval." };
  }
  if (state === "slow_down") {
    pendingDeviceLogin.intervalMs = Math.min(15000, pendingDeviceLogin.intervalMs + 2000);
    return { ...getStatus(), state: "pending", message: "Still waiting for browser approval." };
  }
  if (state === "denied" || state === "access_denied") {
    pendingDeviceLogin = null;
    return { ...getStatus(), state: "denied", message: "AnxOS account sign-in was denied." };
  }
  if (state === "expired") {
    pendingDeviceLogin = null;
    return { ...getStatus(), state: "expired", message: "Account sign-in expired. Start again." };
  }
  if (state !== "approved" && !response.accessToken && !response.access_token) {
    return { ...getStatus(), state: "pending", message: "Waiting for browser sign-in approval." };
  }

  const session = normalizeSession(response);
  writeSession(session);
  pendingDeviceLogin = null;
  audit({ action: "account.login", outcome: "ok", target: "device-login" });
  return { ...getStatus(), state: "authenticated", message: "Signed in with AnxOS." };
}

async function refreshSession() {
  const session = getCurrentSession({ allowExpired: true });
  if (!session?.refreshToken) {
    clearSession();
    return { ...getStatus(), state: "signed-out", message: "No refresh token is available." };
  }
  if (!getAccountApiUrl()) {
    return { ...getStatus(), state: "refresh-unavailable", message: "Account service is not configured." };
  }
  const response = await postJson(`${getAccountApiUrl()}/api/auth/refresh`, { refreshToken: session.refreshToken });
  const nextSession = normalizeSession(response);
  writeSession({
    ...nextSession,
    account: nextSession.account || session.account,
    device: nextSession.device || session.device,
    createdAt: session.createdAt || nextSession.createdAt,
  });
  audit({ action: "account.refresh", outcome: "ok" });
  return { ...getStatus(), state: "refreshed", message: "Account session refreshed." };
}

async function openAccountPage() {
  const targetUrl = pendingDeviceLogin?.verificationUrl || buildWebsiteUrl(getCurrentSession() ? "account" : "signin");
  const url = assertApprovedExternalUrl(targetUrl, "account");
  await shell.openExternal(url);
  return { ok: true, url };
}

async function logout() {
  const session = getCurrentSession({ allowExpired: true });
  if (session?.accessToken && getAccountApiUrl()) {
    await postJson(`${getAccountApiUrl()}/api/auth/logout`, {}, { accessToken: session.accessToken }).catch((error) => {
      console.warn("[Account] Logout revoke failed.", { code: error?.code || null, message: redactSecret(error?.message || String(error)) });
    });
  }
  const account = publicAccount(session);
  clearSession();
  pendingDeviceLogin = null;
  audit({ action: "account.logout", outcome: "ok", target: account?.username || null });
  return getStatus();
}

async function listAccountDevices() {
  const session = getCurrentSession();
  if (!session?.accessToken || !getAccountApiUrl()) {
    return { devices: [] };
  }
  return getJson(`${getAccountApiUrl()}/api/account/devices`, { accessToken: session.accessToken });
}

async function revokeCurrentDevice() {
  const session = getCurrentSession({ allowExpired: true });
  const deviceId = session?.device?.id || session?.device?.deviceId || null;
  if (session?.accessToken && getAccountApiUrl() && deviceId) {
    await postJson(`${getAccountApiUrl()}/api/account/devices/revoke`, { deviceId }, { accessToken: session.accessToken }).catch((error) => {
      console.warn("[Account] Device revoke failed.", { code: error?.code || null, message: redactSecret(error?.message || String(error)) });
    });
  } else if (session?.accessToken && getAccountApiUrl()) {
    await postJson(`${getAccountApiUrl()}/api/auth/logout`, {}, { accessToken: session.accessToken }).catch(() => {});
  }
  clearSession();
  pendingDeviceLogin = null;
  audit({ action: "account.device.revokeCurrent", outcome: "ok" });
  return getStatus();
}

module.exports = {
  cancelDeviceLogin,
  checkDeviceLogin,
  getCurrentSession,
  getStatus,
  buildWebsiteUrl,
  listAccountDevices,
  logout,
  openAccountPage,
  refreshSession,
  revokeCurrentDevice,
  redactSecret,
  startDeviceLogin,
};
