const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { app, safeStorage, shell } = require("electron");

const DEFAULT_ACCOUNT_SITE_URL = "https://bungopam-byte.github.io/AnxOS-Control-Center";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let currentSession = null;
let pendingDeviceLogin = null;

function getConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) {
    return process.env.ANXHUB_CONFIG_DIR;
  }
  try {
    return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config");
  } catch {
    return path.join(process.cwd(), "config");
  }
}

function ensureConfigDirectory() {
  fs.mkdirSync(getConfigDirectory(), { recursive: true });
}

function getAccountPath() {
  return path.join(getConfigDirectory(), "account.json");
}

function getAuditPath() {
  return path.join(getConfigDirectory(), "audit.log");
}

function getAccountSiteUrl() {
  return String(process.env.ANXOS_ACCOUNT_SITE_URL || DEFAULT_ACCOUNT_SITE_URL).replace(/\/+$/, "");
}

function getAccountApiUrl() {
  return String(process.env.ANXOS_ACCOUNT_API_URL || "").replace(/\/+$/, "");
}

function getFallbackEncryptionKey() {
  let username = "local-user";
  try {
    username = os.userInfo().username || username;
  } catch {}
  return crypto.scryptSync(`${username}:${os.hostname()}:${getAccountPath()}`, "anxos-account-session", 32);
}

function encryptRecord(value) {
  const payload = JSON.stringify(value);
  if (safeStorage?.isEncryptionAvailable?.()) {
    return {
      method: "safeStorage",
      data: safeStorage.encryptString(payload).toString("base64"),
    };
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getFallbackEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return {
    method: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }
  if (record.method === "safeStorage" && safeStorage?.isEncryptionAvailable?.()) {
    return JSON.parse(safeStorage.decryptString(Buffer.from(record.data || "", "base64")));
  }
  if (record.method === "aes-256-gcm") {
    const decipher = crypto.createDecipheriv("aes-256-gcm", getFallbackEncryptionKey(), Buffer.from(record.iv || "", "base64"));
    decipher.setAuthTag(Buffer.from(record.tag || "", "base64"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(record.data || "", "base64")), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  }
  return null;
}

function readStoredSession() {
  try {
    return decryptRecord(JSON.parse(fs.readFileSync(getAccountPath(), "utf8")));
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  ensureConfigDirectory();
  fs.writeFileSync(getAccountPath(), `${JSON.stringify(encryptRecord(session))}\n`, { mode: 0o600 });
}

function removeStoredSession() {
  try {
    fs.rmSync(getAccountPath(), { force: true });
  } catch {}
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
  };
}

function normalizeSession(payload = {}) {
  const accessToken = payload.accessToken || payload.access_token || payload.token || null;
  if (!accessToken) {
    const error = new Error("Account login response did not include an access token.");
    error.code = "ACCOUNT_TOKEN_MISSING";
    throw error;
  }
  const expiresAt = payload.expiresAt
    ? Date.parse(payload.expiresAt)
    : Date.now() + ((Number.parseInt(payload.expiresIn || payload.expires_in, 10) || SESSION_TTL_MS / 1000) * 1000);
  return {
    accessToken,
    refreshToken: payload.refreshToken || payload.refresh_token || null,
    expiresAt,
    account: payload.account || payload.user || null,
    createdAt: new Date().toISOString(),
  };
}

function getCurrentSession() {
  if (!currentSession) {
    currentSession = readStoredSession();
  }
  if (!currentSession?.accessToken || !Number.isFinite(currentSession.expiresAt) || currentSession.expiresAt <= Date.now()) {
    currentSession = null;
    removeStoredSession();
    return null;
  }
  return currentSession;
}

function audit(event) {
  try {
    ensureConfigDirectory();
    fs.appendFileSync(getAuditPath(), `${JSON.stringify({
      at: new Date().toISOString(),
      actor: publicAccount(getCurrentSession()),
      action: event.action,
      outcome: event.outcome || "ok",
      target: event.target || null,
      reason: event.reason || null,
    })}\n`, { mode: 0o600 });
  } catch {}
}

function getStatus() {
  const session = getCurrentSession();
  return {
    configured: Boolean(getAccountApiUrl()),
    authenticated: Boolean(session),
    account: publicAccount(session),
    expiresAt: session ? new Date(session.expiresAt).toISOString() : null,
    accountPath: getAccountPath(),
    siteUrl: getAccountSiteUrl(),
    pending: pendingDeviceLogin ? {
      userCode: pendingDeviceLogin.userCode,
      verificationUrl: pendingDeviceLogin.verificationUrl,
      expiresAt: pendingDeviceLogin.expiresAt,
      intervalMs: pendingDeviceLogin.intervalMs,
    } : null,
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error_description || data.error || `Account request failed with HTTP ${response.status}.`);
    error.code = data.code || data.error || `HTTP_${response.status}`;
    throw error;
  }
  return data;
}

function createLocalPendingDeviceLogin() {
  const userCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const deviceCode = crypto.randomBytes(24).toString("base64url");
  const verificationUrl = `${getAccountSiteUrl()}/device-login.html?code=${encodeURIComponent(userCode)}`;
  return {
    deviceCode,
    userCode,
    verificationUrl,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    intervalMs: 3000,
    localOnly: true,
  };
}

async function startDeviceLogin() {
  const apiUrl = getAccountApiUrl();
  let login;
  if (apiUrl) {
    const response = await postJson(`${apiUrl}/device/start`, {
      app: "AnxOS-Control-Center",
      deviceName: os.hostname(),
    });
    login = {
      deviceCode: response.deviceCode || response.device_code,
      userCode: response.userCode || response.user_code,
      verificationUrl: response.verificationUrl || response.verification_uri || response.verificationUri || `${getAccountSiteUrl()}/device-login.html`,
      expiresAt: response.expiresAt || new Date(Date.now() + ((Number.parseInt(response.expiresIn || response.expires_in, 10) || 600) * 1000)).toISOString(),
      intervalMs: (Number.parseInt(response.interval, 10) || 3) * 1000,
      localOnly: false,
    };
  } else {
    login = createLocalPendingDeviceLogin();
  }

  pendingDeviceLogin = login;
  await shell.openExternal(login.verificationUrl);
  audit({ action: "account.deviceLogin.start", outcome: "ok", target: login.userCode, reason: login.localOnly ? "ACCOUNT_API_NOT_CONFIGURED" : null });
  return {
    ...getStatus(),
    pending: {
      userCode: login.userCode,
      verificationUrl: login.verificationUrl,
      expiresAt: login.expiresAt,
      intervalMs: login.intervalMs,
    },
    message: login.localOnly
      ? "Opened the AnxOS account page. Configure ANXOS_ACCOUNT_API_URL to enable live website sign-in."
      : "Opened the AnxOS account page. Finish sign-in in your browser.",
  };
}

async function checkDeviceLogin() {
  if (!pendingDeviceLogin) {
    return { ...getStatus(), state: "idle", message: "No account sign-in is waiting." };
  }
  if (Date.parse(pendingDeviceLogin.expiresAt) <= Date.now()) {
    pendingDeviceLogin = null;
    return { ...getStatus(), state: "expired", message: "Account sign-in expired. Start again." };
  }
  if (pendingDeviceLogin.localOnly) {
    return { ...getStatus(), state: "pending", message: "Waiting for the AnxOS account backend to be configured." };
  }

  try {
    const response = await postJson(`${getAccountApiUrl()}/device/token`, { deviceCode: pendingDeviceLogin.deviceCode });
    if (response.pending || response.status === "pending") {
      return { ...getStatus(), state: "pending", message: "Waiting for browser sign-in approval." };
    }
    const session = normalizeSession(response);
    currentSession = session;
    writeStoredSession(session);
    const userCode = pendingDeviceLogin.userCode;
    pendingDeviceLogin = null;
    audit({ action: "account.login", outcome: "ok", target: userCode });
    return { ...getStatus(), state: "authenticated", message: "Signed in with AnxOS." };
  } catch (error) {
    if (["authorization_pending", "slow_down", "ACCOUNT_PENDING"].includes(error.code)) {
      return { ...getStatus(), state: "pending", message: "Waiting for browser sign-in approval." };
    }
    throw error;
  }
}

async function openAccountPage() {
  const session = getCurrentSession();
  const url = session ? `${getAccountSiteUrl()}/account.html` : `${getAccountSiteUrl()}/account.html?action=signin`;
  await shell.openExternal(url);
  return { ok: true, url };
}

function logout() {
  const account = publicAccount(getCurrentSession());
  currentSession = null;
  pendingDeviceLogin = null;
  removeStoredSession();
  audit({ action: "account.logout", outcome: "ok", target: account?.username || null });
  return getStatus();
}

module.exports = {
  checkDeviceLogin,
  getCurrentSession,
  getStatus,
  logout,
  openAccountPage,
  startDeviceLogin,
};
