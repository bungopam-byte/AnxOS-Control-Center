const fs = require("fs");
const path = require("path");
const { decryptPayload, encryptPayload } = require("./secureSessionStore");

const MARKETPLACE_CONFIG_SCHEMA_VERSION = 2;

const DEFAULT_MARKETPLACE_CONFIG = {
  curseForgeApiKey: "",
};

function getElectronApp() {
  try {
    const electron = require("electron");
    return electron && typeof electron === "object" ? electron.app || null : null;
  } catch {
    return null;
  }
}

function getConfigDirectory() {
  if (typeof process.env.ANXHUB_CONFIG_DIR === "string" && process.env.ANXHUB_CONFIG_DIR.trim()) {
    return process.env.ANXHUB_CONFIG_DIR.trim();
  }

  const app = getElectronApp();

  if (app) {
    try {
      return path.join(app.getPath("userData"), "config");
    } catch {}
  }

  return path.join(process.cwd(), "config");
}

function getMarketplaceConfigPath() {
  return path.join(getConfigDirectory(), "marketplace.json");
}

function normalizeMarketplaceConfig(config = {}) {
  return {
    curseForgeApiKey: typeof config.curseForgeApiKey === "string" ? config.curseForgeApiKey.trim() : "",
  };
}

function createMarketplaceConfigError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

function writeEncryptedConfig(filePath, config) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify({
    schemaVersion: MARKETPLACE_CONFIG_SCHEMA_VERSION,
    encrypted: encryptPayload(normalizeMarketplaceConfig(config), filePath),
  }, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

function readMarketplaceConfig(options = {}) {
  const configPath = getMarketplaceConfigPath();
  if (!fs.existsSync(configPath)) {
    return options.includeSecrets ? { ...DEFAULT_MARKETPLACE_CONFIG } : { hasCurseForgeApiKey: false };
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    const backupPath = `${configPath}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(configPath, backupPath, fs.constants.COPYFILE_EXCL); } catch {}
    throw createMarketplaceConfigError(
      "MARKETPLACE_CONFIG_CORRUPT",
      "Marketplace provider configuration is unreadable. The original file was preserved for recovery.",
      { causeCode: error?.code || "INVALID_JSON" },
    );
  }
  const schemaVersion = Number.isInteger(parsed?.schemaVersion) ? parsed.schemaVersion : 0;
  if (schemaVersion > MARKETPLACE_CONFIG_SCHEMA_VERSION) {
    throw createMarketplaceConfigError(
      "MARKETPLACE_CONFIG_SCHEMA_UNSUPPORTED",
      "Marketplace provider configuration was created by a newer application version.",
      { schemaVersion, supportedSchemaVersion: MARKETPLACE_CONFIG_SCHEMA_VERSION },
    );
  }
  let normalized;
  if (schemaVersion === MARKETPLACE_CONFIG_SCHEMA_VERSION) {
    try {
      normalized = normalizeMarketplaceConfig(decryptPayload(parsed.encrypted, configPath));
    } catch (error) {
      throw createMarketplaceConfigError(
        "MARKETPLACE_CONFIG_DECRYPT_FAILED",
        "Marketplace provider configuration could not be decrypted on this device.",
        { causeCode: error?.code || "DECRYPT_FAILED" },
      );
    }
  } else {
    normalized = normalizeMarketplaceConfig(parsed);
    const backupPath = `${configPath}.schema-v${schemaVersion}.backup`;
    if (!fs.existsSync(backupPath)) writeEncryptedConfig(backupPath, normalized);
    writeEncryptedConfig(configPath, normalized);
  }
  return options.includeSecrets
    ? normalized
    : { hasCurseForgeApiKey: Boolean(normalized.curseForgeApiKey) };
}

function saveMarketplaceConfig(config = {}) {
  const existing = readMarketplaceConfig({ includeSecrets: true });
  const next = normalizeMarketplaceConfig({
    ...existing,
    ...config,
  });
  const configPath = getMarketplaceConfigPath();
  writeEncryptedConfig(configPath, next);
  return next;
}

module.exports = {
  MARKETPLACE_CONFIG_SCHEMA_VERSION,
  getMarketplaceConfigPath,
  readMarketplaceConfig,
  saveMarketplaceConfig,
};
