const crypto = require("crypto");

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_SECONDS = 3;
const USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createUserCode(length = 8) {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += USER_CODE_ALPHABET[crypto.randomInt(0, USER_CODE_ALPHABET.length)];
  }
  return code;
}

function createDeviceCode() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashCode(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value || "")).digest("base64url");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDeviceInfo(payload = {}) {
  return {
    deviceName: String(payload.deviceName || "Unknown device").slice(0, 120),
    platform: String(payload.platform || "desktop").slice(0, 60),
    arch: String(payload.arch || "").slice(0, 40),
    app: String(payload.app || "AnxOS-Control-Center").slice(0, 80),
    appVersion: String(payload.appVersion || "").slice(0, 40),
    requestedAt: nowIso(),
  };
}

function createMemoryDeviceStore() {
  const records = new Map();
  return {
    async create(record) {
      records.set(record.deviceCodeHash, record);
      return record;
    },
    async getByDeviceCodeHash(deviceCodeHash) {
      return records.get(deviceCodeHash) || null;
    },
    async getByUserCodeHash(userCodeHash) {
      return Array.from(records.values()).find((record) => record.userCodeHash === userCodeHash) || null;
    },
    async update(deviceCodeHash, patch) {
      const current = records.get(deviceCodeHash);
      if (!current) return null;
      const next = { ...current, ...patch, updatedAt: nowIso() };
      records.set(deviceCodeHash, next);
      return next;
    },
    async delete(deviceCodeHash) {
      records.delete(deviceCodeHash);
    },
    async deleteExpired(now = Date.now()) {
      for (const [key, record] of records.entries()) {
        if (Date.parse(record.expiresAt || "") <= now) {
          records.delete(key);
        }
      }
    },
  };
}

function createDeviceAuthorizationHandlers(options = {}) {
  const secret = options.secret || process.env.ANXOS_DEVICE_CODE_SECRET;
  if (!secret) {
    throw new Error("ANXOS_DEVICE_CODE_SECRET is required for device authorization handlers.");
  }
  const store = options.store || createMemoryDeviceStore();
  const verificationBaseUrl = String(options.verificationBaseUrl || process.env.ANXOS_ACCOUNT_SITE_URL || "").replace(/\/+$/, "");
  const ttlMs = options.ttlMs || DEFAULT_TTL_MS;
  const pollInterval = options.pollInterval || DEFAULT_POLL_INTERVAL_SECONDS;
  const createTokens = options.createTokens;

  if (typeof createTokens !== "function") {
    throw new Error("createTokens(authenticatedUser, deviceRecord) is required.");
  }

  async function start(payload = {}) {
    await store.deleteExpired?.();
    const deviceCode = createDeviceCode();
    const userCode = createUserCode();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const record = {
      deviceCodeHash: hashCode(deviceCode, secret),
      userCodeHash: hashCode(userCode, secret),
      status: "pending",
      device: normalizeDeviceInfo(payload),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      expiresAt,
      approvedBy: null,
      tokenIssuedAt: null,
    };
    await store.create(record);
    return {
      deviceCode,
      userCode,
      verificationUrl: `${verificationBaseUrl}/device-login.html?code=${encodeURIComponent(userCode)}`,
      expiresIn: Math.floor(ttlMs / 1000),
      pollInterval,
    };
  }

  async function poll(payload = {}) {
    const deviceCodeHash = hashCode(payload.deviceCode, secret);
    const record = await store.getByDeviceCodeHash(deviceCodeHash);
    if (!record) {
      return { state: "expired" };
    }
    if (Date.parse(record.expiresAt || "") <= Date.now()) {
      await store.delete(deviceCodeHash);
      return { state: "expired" };
    }
    if (record.status === "denied") {
      await store.delete(deviceCodeHash);
      return { state: "denied" };
    }
    if (record.status !== "approved") {
      return { state: "pending", pollInterval };
    }
    if (record.tokenIssuedAt) {
      await store.delete(deviceCodeHash);
      return { state: "expired" };
    }
    const tokens = await createTokens(record.approvedBy, record);
    await store.update(deviceCodeHash, { tokenIssuedAt: nowIso(), status: "consumed" });
    await store.delete(deviceCodeHash);
    return {
      state: "approved",
      ...tokens,
    };
  }

  async function approve(payload = {}, authenticatedUser) {
    if (!authenticatedUser) {
      const error = new Error("Sign in before approving this device.");
      error.code = "AUTH_REQUIRED";
      throw error;
    }
    const userCodeHash = hashCode(payload.userCode, secret);
    const record = await store.getByUserCodeHash(userCodeHash);
    if (!record || Date.parse(record.expiresAt || "") <= Date.now()) {
      return { state: "expired" };
    }
    if (record.status !== "pending") {
      return { state: record.status };
    }
    await store.update(record.deviceCodeHash, { status: "approved", approvedBy: authenticatedUser });
    return { state: "approved", device: record.device };
  }

  async function deny(payload = {}, authenticatedUser) {
    if (!authenticatedUser) {
      const error = new Error("Sign in before denying this device.");
      error.code = "AUTH_REQUIRED";
      throw error;
    }
    const userCodeHash = hashCode(payload.userCode, secret);
    const record = await store.getByUserCodeHash(userCodeHash);
    if (!record) {
      return { state: "expired" };
    }
    await store.update(record.deviceCodeHash, { status: "denied", approvedBy: authenticatedUser });
    return { state: "denied" };
  }

  return {
    approve,
    deny,
    poll,
    start,
    store,
  };
}

module.exports = {
  createDeviceAuthorizationHandlers,
  createMemoryDeviceStore,
  hashCode,
};
