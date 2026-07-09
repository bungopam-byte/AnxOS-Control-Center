const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const bcrypt = require("bcryptjs");
const { app, safeStorage } = require("electron");
const {
  getAgentConfigPath,
  readAgentSettings,
  saveAgentSettings,
} = require("./agentClient");

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PERSISTENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 10;
const BCRYPT_ROUNDS = 12;
const ROLE_PERMISSIONS = {
  Owner: ["*"],
  Admin: [
    "instance:write",
    "instance:lifecycle",
    "instance:delete",
    "files:write",
    "marketplace:install",
    "backups:write",
    "backups:restore",
    "settings:write",
  ],
  User: ["instance:lifecycle"],
};

let currentSession = null;
const rateBuckets = new Map();

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

function getSecurityPath() {
  return path.join(getConfigDirectory(), "security.json");
}

function getPersistentSessionPath() {
  return path.join(getConfigDirectory(), "session.dat");
}

function getAuditPath() {
  return path.join(getConfigDirectory(), "audit.log");
}

function ensureConfigDirectory() {
  fs.mkdirSync(getConfigDirectory(), { recursive: true });
}

function readSecurityState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(getSecurityPath(), "utf8"));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      persistentSessions: Array.isArray(parsed.persistentSessions) ? parsed.persistentSessions : [],
      settings: {
        sessionTtlMs: Number.parseInt(parsed.settings?.sessionTtlMs, 10) || SESSION_TTL_MS,
        persistentSessionTtlMs: Number.parseInt(parsed.settings?.persistentSessionTtlMs, 10) || PERSISTENT_SESSION_TTL_MS,
      },
    };
  } catch {
    return {
      users: [],
      persistentSessions: [],
      settings: {
        sessionTtlMs: SESSION_TTL_MS,
        persistentSessionTtlMs: PERSISTENT_SESSION_TTL_MS,
      },
    };
  }
}

function writeSecurityState(state) {
  ensureConfigDirectory();
  fs.writeFileSync(getSecurityPath(), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

function removePersistentSessionFile() {
  try {
    fs.rmSync(getPersistentSessionPath(), { force: true });
  } catch {}
}

function getFallbackEncryptionKey() {
  let username = "local-user";
  try {
    username = os.userInfo().username || username;
  } catch {}

  return crypto.scryptSync(
    `${username}:${os.hostname()}:${getSecurityPath()}`,
    "anxhub-local-session",
    32
  );
}

function encryptLocalSession(value) {
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  if (safeStorage?.isEncryptionAvailable?.()) {
    return {
      method: "safeStorage",
      data: safeStorage.encryptString(payload.toString("utf8")).toString("base64"),
    };
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getFallbackEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return {
    method: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptLocalSession(record) {
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

function writePersistentSessionFile(payload) {
  ensureConfigDirectory();
  fs.writeFileSync(getPersistentSessionPath(), `${JSON.stringify(encryptLocalSession(payload))}\n`, { mode: 0o600 });
}

function readPersistentSessionFile() {
  try {
    return decryptLocalSession(JSON.parse(fs.readFileSync(getPersistentSessionPath(), "utf8")));
  } catch {
    removePersistentSessionFile();
    return null;
  }
}

function getPasswordHashDigest(user) {
  return crypto.createHash("sha256").update(String(user?.passwordHash || "")).digest("base64url");
}

function pruneExpiredPersistentSessions(state, now = Date.now()) {
  const originalCount = state.persistentSessions.length;
  state.persistentSessions = state.persistentSessions.filter((session) => Date.parse(session.expiresAt || "") > now);
  return state.persistentSessions.length !== originalCount;
}

function removePersistentSessionRecord(sessionId) {
  if (!sessionId) {
    return;
  }
  const state = readSecurityState();
  const nextSessions = state.persistentSessions.filter((entry) => entry.id !== sessionId);
  if (nextSessions.length !== state.persistentSessions.length) {
    state.persistentSessions = nextSessions;
    writeSecurityState(state);
  }
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null,
  };
}

function getCurrentUser() {
  restorePersistentSession();
  if (!currentSession || currentSession.expiresAt <= Date.now()) {
    if (currentSession?.persistent) {
      removePersistentSessionFile();
    }
    currentSession = null;
    return null;
  }

  const user = readSecurityState().users.find((entry) => entry.id === currentSession.userId);
  if (!user) {
    if (currentSession.persistent) {
      removePersistentSessionFile();
    }
    currentSession = null;
    return null;
  }

  if (currentSession.persistent && currentSession.passwordHashDigest !== getPasswordHashDigest(user)) {
    removePersistentSessionRecord(currentSession.persistentSessionId);
    removePersistentSessionFile();
    currentSession = null;
    return null;
  }

  return publicUser(user);
}

async function createPersistentSession(state, user) {
  const rawToken = crypto.randomBytes(48).toString("base64url");
  const session = {
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: await bcrypt.hash(rawToken, BCRYPT_ROUNDS),
    passwordHashDigest: getPasswordHashDigest(user),
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (state.settings.persistentSessionTtlMs || PERSISTENT_SESSION_TTL_MS)).toISOString(),
  };
  state.persistentSessions.push(session);
  writePersistentSessionFile({
    sessionId: session.id,
    token: rawToken,
    expiresAt: session.expiresAt,
  });
  return session;
}

function createRuntimeSession(user, expiresAt, persistent = false, persistentSessionId = null) {
  currentSession = {
    token: crypto.randomBytes(32).toString("base64url"),
    userId: user.id,
    expiresAt,
    persistent,
    persistentSessionId,
    passwordHashDigest: getPasswordHashDigest(user),
  };
}

function restorePersistentSession() {
  if (currentSession) {
    return null;
  }

  const localSession = readPersistentSessionFile();
  if (!localSession?.sessionId || !localSession?.token) {
    return null;
  }

  const state = readSecurityState();
  const now = Date.now();
  let changed = pruneExpiredPersistentSessions(state, now);
  const session = state.persistentSessions.find((entry) => entry.id === localSession.sessionId);
  const user = session ? state.users.find((entry) => entry.id === session.userId) : null;

  if (!session || !user || Date.parse(session.expiresAt || "") <= now || session.passwordHashDigest !== getPasswordHashDigest(user)) {
    removePersistentSessionFile();
    if (session) {
      state.persistentSessions = state.persistentSessions.filter((entry) => entry.id !== session.id);
      changed = true;
    }
    if (changed) {
      writeSecurityState(state);
    }
    return null;
  }

  let ok = false;
  try {
    ok = bcrypt.compareSync(String(localSession.token), session.tokenHash);
  } catch {
    ok = false;
  }

  if (!ok) {
    removePersistentSessionFile();
    state.persistentSessions = state.persistentSessions.filter((entry) => entry.id !== session.id);
    writeSecurityState(state);
    return null;
  }

  session.lastUsedAt = new Date().toISOString();
  writeSecurityState(state);
  createRuntimeSession(user, Date.parse(session.expiresAt), true, session.id);
  audit({ action: "security.session.restore", outcome: "ok", actor: publicUser(user) });
  return publicUser(user);
}

function audit(event) {
  ensureConfigDirectory();
  const actor = event.actor || getCurrentUser();
  const record = {
    at: new Date().toISOString(),
    actor: actor ? { id: actor.id, username: actor.username, role: actor.role } : null,
    action: event.action,
    outcome: event.outcome || "ok",
    target: event.target || null,
    reason: event.reason || null,
  };

  fs.appendFileSync(getAuditPath(), `${JSON.stringify(record)}\n`, { mode: 0o600 });
}

function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || [];
  const active = bucket.filter((timestamp) => now - timestamp < windowMs);
  active.push(now);
  rateBuckets.set(key, active);

  if (active.length > limit) {
    const error = new Error("Too many requests. Try again shortly.");
    error.code = "RATE_LIMITED";
    throw error;
  }
}

function getRateLimitState(key, windowMs) {
  const now = Date.now();
  const active = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  rateBuckets.set(key, active);
  return {
    key,
    count: active.length,
    windowMs,
  };
}

function recordRateLimitAttempt(key, limit, windowMs, details = {}) {
  const now = Date.now();
  const active = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  active.push(now);
  rateBuckets.set(key, active);
  console.warn("[Security] Rate-limit attempt recorded.", {
    key,
    count: active.length,
    limit,
    windowMs,
    reason: details.reason || null,
  });
  if (active.length > limit) {
    const error = new Error("Too many requests. Try again shortly.");
    error.code = "RATE_LIMITED";
    console.warn("[Security] Rate limit triggered.", {
      key,
      count: active.length,
      limit,
      windowMs,
      reason: details.reason || null,
    });
    throw error;
  }
}

function resetRateLimit(key, reason = "reset") {
  if (rateBuckets.delete(key)) {
    console.info("[Security] Rate-limit bucket reset.", { key, reason });
  }
}

function normalizeUsername(value) {
  const username = String(value || "").trim();
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
    const error = new Error("Use a username with 3-40 letters, numbers, dots, dashes, or underscores.");
    error.code = "INVALID_USERNAME";
    throw error;
  }
  return username;
}

function normalizeRole(value, fallback = "User") {
  const role = String(value || fallback).trim();
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) {
    const error = new Error("Invalid role.");
    error.code = "INVALID_ROLE";
    throw error;
  }
  return role;
}

function validatePassword(value) {
  const password = String(value || "");
  if (password.length < PASSWORD_MIN_LENGTH) {
    const error = new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    error.code = "WEAK_PASSWORD";
    throw error;
  }
  return password;
}

function getStatus() {
  const user = getCurrentUser();
  const state = readSecurityState();
  if (pruneExpiredPersistentSessions(state)) {
    writeSecurityState(state);
  }
  const hasAdminUser = state.users.some((entry) => entry.role === "Owner" || entry.role === "Admin");
  const localMode = !hasAdminUser;
  return {
    setupRequired: !hasAdminUser,
    localMode,
    remoteControlEnabled: hasAdminUser,
    authenticated: Boolean(user),
    user,
    roles: Object.keys(ROLE_PERMISSIONS),
    permissions: user ? ROLE_PERMISSIONS[user.role] || [] : localMode ? ["local:*"] : [],
    agentTokenConfigured: Boolean(readAgentSettings().agentToken),
    persistentSession: Boolean(currentSession?.persistent),
    persistentSessionCount: state.persistentSessions.length,
    securityPath: getSecurityPath(),
    auditPath: getAuditPath(),
  };
}

async function setupAdmin(payload = {}) {
  checkRateLimit("setup-admin", 5, 10 * 60 * 1000);
  const state = readSecurityState();
  if (state.users.some((entry) => entry.role === "Owner" || entry.role === "Admin")) {
    const error = new Error("Security setup is already complete.");
    error.code = "SETUP_COMPLETE";
    throw error;
  }

  const username = normalizeUsername(payload.username || "owner");
  const passwordHash = await bcrypt.hash(validatePassword(payload.password), BCRYPT_ROUNDS);
  const user = {
    id: crypto.randomUUID(),
    username,
    role: "Owner",
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  state.users.push(user);
  writeSecurityState(state);
  audit({ action: "security.setup", outcome: "ok", actor: publicUser(user) });
  return login({ username, password: payload.password, staySignedIn: payload.staySignedIn });
}

async function login(payload = {}) {
  const username = normalizeUsername(payload.username);
  const rateLimitKey = `login:${username.toLowerCase()}`;
  const rateLimitWindowMs = 5 * 60 * 1000;
  const rateLimitLimit = 6;
  const rateLimitState = getRateLimitState(rateLimitKey, rateLimitWindowMs);
  console.info("[Security] Login attempt started.", {
    username,
    failedAttemptCount: rateLimitState.count,
    limit: rateLimitLimit,
    staySignedIn: payload.staySignedIn === true,
  });
  if (rateLimitState.count >= rateLimitLimit) {
    console.warn("[Security] Login blocked by rate limit before credential check.", {
      username,
      failedAttemptCount: rateLimitState.count,
      limit: rateLimitLimit,
    });
    const error = new Error("Too many requests. Try again shortly.");
    error.code = "RATE_LIMITED";
    throw error;
  }
  const state = readSecurityState();
  const user = state.users.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
  const ok = user ? await bcrypt.compare(String(payload.password || ""), user.passwordHash) : false;

  if (!ok) {
    audit({ action: "security.login", outcome: "failed", target: username, reason: "INVALID_CREDENTIALS" });
    recordRateLimitAttempt(rateLimitKey, rateLimitLimit, rateLimitWindowMs, { reason: "INVALID_CREDENTIALS" });
    const error = new Error("Invalid username or password.");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  resetRateLimit(rateLimitKey, "successful-login");

  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();
  pruneExpiredPersistentSessions(state);
  let persistentSession = null;
  if (payload.staySignedIn === true) {
    persistentSession = await createPersistentSession(state, user);
  } else {
    removePersistentSessionFile();
  }
  writeSecurityState(state);
  const expiresAt = persistentSession
    ? Date.parse(persistentSession.expiresAt)
    : Date.now() + (state.settings.sessionTtlMs || SESSION_TTL_MS);
  createRuntimeSession(user, expiresAt, Boolean(persistentSession), persistentSession?.id || null);
  audit({ action: "security.login", outcome: "ok", actor: publicUser(user) });

  return {
    token: currentSession.token,
    expiresAt: new Date(currentSession.expiresAt).toISOString(),
    persistent: Boolean(persistentSession),
    user: publicUser(user),
  };
}

function logout() {
  const actor = getCurrentUser();
  const persistentSessionId = currentSession?.persistentSessionId || null;
  if (persistentSessionId) {
    const state = readSecurityState();
    state.persistentSessions = state.persistentSessions.filter((entry) => entry.id !== persistentSessionId);
    writeSecurityState(state);
    removePersistentSessionFile();
  }
  currentSession = null;
  audit({ action: "security.logout", outcome: "ok", actor });
  return { ok: true };
}

function logoutAllSessions() {
  const actor = requirePermission("settings:write", "security-sessions");
  const state = readSecurityState();
  state.persistentSessions = [];
  writeSecurityState(state);
  removePersistentSessionFile();
  currentSession = null;
  audit({ action: "security.sessions.logoutAll", outcome: "ok", actor });
  return { ok: true };
}

function userHasPermission(user, permission) {
  if (!permission) {
    return true;
  }

  if (!user) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}

function requirePermission(permission, target = null) {
  const status = getStatus();
  if (status.setupRequired) {
    return {
      id: "local-device",
      username: "This Device",
      role: "Local",
      localMode: true,
      permissions: ["local:*"],
    };
  }

  if (!status.user) {
    const error = new Error("Sign in to continue.");
    error.code = "LOGIN_REQUIRED";
    throw error;
  }

  if (!userHasPermission(status.user, permission)) {
    audit({ action: "security.permission", outcome: "denied", target, reason: permission });
    const error = new Error("Your role does not allow this action.");
    error.code = "PERMISSION_DENIED";
    throw error;
  }

  return status.user;
}

function allowReadCompatibility() {
  const status = getStatus();
  return status.setupRequired || status.authenticated;
}

function rotateAgentToken() {
  const actor = requirePermission("settings:write", "agent-token");
  checkRateLimit("agent-token-rotate", 10, 10 * 60 * 1000);
  const token = `anx_${crypto.randomBytes(32).toString("base64url")}`;
  const current = readAgentSettings();
  saveAgentSettings({ ...current, agentToken: token });
  audit({ action: "agent.token.rotate", outcome: "ok", actor, target: getAgentConfigPath() });
  return {
    token,
    copied: false,
    message: "Copy this token now. It will not be displayed again.",
  };
}

module.exports = {
  audit,
  checkRateLimit,
  getStatus,
  login,
  logout,
  logoutAllSessions,
  requirePermission,
  rotateAgentToken,
  setupAdmin,
  allowReadCompatibility,
};
