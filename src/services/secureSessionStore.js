const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { app, safeStorage } = require("electron");

function getDefaultConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) {
    return process.env.ANXHUB_CONFIG_DIR;
  }
  try {
    return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config");
  } catch {
    return path.join(process.cwd(), "config");
  }
}

function getFallbackEncryptionKey(filePath, purpose = "anxos-secure-session") {
  let username = "local-user";
  try {
    username = os.userInfo().username || username;
  } catch {}
  return crypto.scryptSync(`${username}:${os.hostname()}:${filePath}`, purpose, 32);
}

function encryptPayload(value, filePath) {
  const payload = JSON.stringify(value);
  if (safeStorage?.isEncryptionAvailable?.()) {
    return {
      method: "safeStorage",
      data: safeStorage.encryptString(payload).toString("base64"),
    };
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getFallbackEncryptionKey(filePath), iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return {
    method: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptPayload(record, filePath) {
  if (!record || typeof record !== "object") {
    return null;
  }
  if (record.method === "safeStorage" && safeStorage?.isEncryptionAvailable?.()) {
    return JSON.parse(safeStorage.decryptString(Buffer.from(record.data || "", "base64")));
  }
  if (record.method === "aes-256-gcm") {
    const decipher = crypto.createDecipheriv("aes-256-gcm", getFallbackEncryptionKey(filePath), Buffer.from(record.iv || "", "base64"));
    decipher.setAuthTag(Buffer.from(record.tag || "", "base64"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(record.data || "", "base64")), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  }
  return null;
}

class SecureSessionStore {
  constructor(options = {}) {
    this.configDirectory = options.configDirectory || getDefaultConfigDirectory();
    this.fileName = options.fileName || "account.json";
  }

  get filePath() {
    return path.join(this.configDirectory, this.fileName);
  }

  read() {
    try {
      return decryptPayload(JSON.parse(fs.readFileSync(this.filePath, "utf8")), this.filePath);
    } catch {
      return null;
    }
  }

  write(session) {
    fs.mkdirSync(this.configDirectory, { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(encryptPayload(session, this.filePath))}\n`, { mode: 0o600 });
  }

  clear() {
    try {
      fs.rmSync(this.filePath, { force: true });
    } catch {}
  }
}

module.exports = {
  SecureSessionStore,
  getDefaultConfigDirectory,
};
