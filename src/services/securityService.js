const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { app } = require("electron");
const {
  getAgentConfigPath,
  readAgentSettings,
  saveAgentSettings,
} = require("./agentClient");

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
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
      settings: {
        sessionTtlMs: Number.parseInt(parsed.settings?.sessionTtlMs, 10) || SESSION_TTL_MS,
      },
    };
  } catch {
    return {
      users: [],
      settings: {
        sessionTtlMs: SESSION_TTL_MS,
      },
    };
  }
}

function writeSecurityState(state) {
  ensureConfigDirectory();
  fs.writeFileSync(getSecurityPath(), `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
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
  if (!currentSession || currentSession.expiresAt <= Date.now()) {
    currentSession = null;
    return null;
  }

  const user = readSecurityState().users.find((entry) => entry.id === currentSession.userId);
  if (!user) {
    currentSession = null;
    return null;
  }

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
  const state = readSecurityState();
  const user = getCurrentUser();
  const hasAdminUser = state.users.some((entry) => entry.role === "Owner" || entry.role === "Admin");
  return {
    setupRequired: !hasAdminUser,
    authenticated: Boolean(user),
    user,
    roles: Object.keys(ROLE_PERMISSIONS),
    permissions: user ? ROLE_PERMISSIONS[user.role] || [] : [],
    agentTokenConfigured: Boolean(readAgentSettings().agentToken),
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
  return login({ username, password: payload.password });
}

async function login(payload = {}) {
  const username = normalizeUsername(payload.username);
  checkRateLimit(`login:${username.toLowerCase()}`, 6, 5 * 60 * 1000);
  const state = readSecurityState();
  const user = state.users.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
  const ok = user ? await bcrypt.compare(String(payload.password || ""), user.passwordHash) : false;

  if (!ok) {
    audit({ action: "security.login", outcome: "failed", target: username, reason: "INVALID_CREDENTIALS" });
    const error = new Error("Invalid username or password.");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  user.lastLoginAt = new Date().toISOString();
  user.updatedAt = new Date().toISOString();
  writeSecurityState(state);
  currentSession = {
    token: crypto.randomBytes(32).toString("base64url"),
    userId: user.id,
    expiresAt: Date.now() + (state.settings.sessionTtlMs || SESSION_TTL_MS),
  };
  audit({ action: "security.login", outcome: "ok", actor: publicUser(user) });

  return {
    token: currentSession.token,
    expiresAt: new Date(currentSession.expiresAt).toISOString(),
    user: publicUser(user),
  };
}

function logout() {
  const actor = getCurrentUser();
  currentSession = null;
  audit({ action: "security.logout", outcome: "ok", actor });
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
    const error = new Error("Create the first admin user before using AnxHub.");
    error.code = "SECURITY_SETUP_REQUIRED";
    throw error;
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
  requirePermission,
  rotateAgentToken,
  setupAdmin,
  allowReadCompatibility,
};
