const fs = require("fs");
const path = require("path");

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

function readMarketplaceConfig(options = {}) {
  const configPath = getMarketplaceConfigPath();

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const normalized = normalizeMarketplaceConfig(parsed);
    return options.includeSecrets
      ? normalized
      : { hasCurseForgeApiKey: Boolean(normalized.curseForgeApiKey) };
  } catch {
    return options.includeSecrets
      ? { ...DEFAULT_MARKETPLACE_CONFIG }
      : { hasCurseForgeApiKey: false };
  }
}

function saveMarketplaceConfig(config = {}) {
  const existing = readMarketplaceConfig({ includeSecrets: true });
  const next = normalizeMarketplaceConfig({
    ...existing,
    ...config,
  });
  const configPath = getMarketplaceConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

module.exports = {
  getMarketplaceConfigPath,
  readMarketplaceConfig,
  saveMarketplaceConfig,
};
