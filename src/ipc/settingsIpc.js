const { ipcMain } = require("electron");
const {
  getDefaultAgentSettings,
  getAgentConfigPath,
  getEffectiveAgentSettings,
  getSharedAgentTokenStatus,
  readAgentSettings,
  saveAgentSettings,
  testConnection,
} = require("../services/agentClient");
const {
  getMarketplaceConfigPath,
  readMarketplaceConfig,
  saveMarketplaceConfig,
} = require("../services/providerConfigService");
const curseforgeProvider = require("../services/providers/curseforgeProvider");
const { audit, requirePermission } = require("../services/securityService");

function getAgentSettingsPayload() {
  const stored = readAgentSettings();
  const effective = getEffectiveAgentSettings();

  return {
    stored,
    effective: {
      backendMode: effective.backendMode,
      agentUrl: effective.agentUrl,
    },
    overrides: effective.overrides,
    defaults: getDefaultAgentSettings(),
    configPath: getAgentConfigPath(),
    tokenStatus: getSafeAgentTokenStatus(),
  };
}

function getSafeAgentTokenStatus() {
  const status = getSharedAgentTokenStatus();
  return {
    configured: status.configured,
    source: status.source,
    fingerprint: status.fingerprint,
    configPath: status.configPath,
    environmentTokenPresent: status.environmentTokenPresent,
    environmentTokenMatches: status.environmentTokenMatches,
    environmentTokenConflict: status.environmentTokenConflict,
    environmentTokenIgnored: status.environmentTokenIgnored,
    weakStoredTokenReplaced: status.weakStoredTokenReplaced,
    weakEnvironmentTokenIgnored: status.weakEnvironmentTokenIgnored,
    restartRequiredAfterRotation: true,
  };
}

function getMarketplaceSettingsPayload() {
  const stored = readMarketplaceConfig();
  const status = curseforgeProvider._test.getApiKeyStatus();

  return {
    stored,
    configPath: getMarketplaceConfigPath(),
    curseForge: {
      configured: status.loaded,
      source: status.source,
    },
  };
}

function registerSettingsIpc() {
  ipcMain.handle("settings:getAgentConfig", async () => getAgentSettingsPayload());
  ipcMain.handle("settings:saveAgentConfig", async (_, payload = {}) => {
    requirePermission("settings:write", "agent-config");
    saveAgentSettings(payload);
    audit({ action: "settings.agent.save", target: "agent-config" });
    return getAgentSettingsPayload();
  });
  ipcMain.handle("settings:testAgentConnection", async (_, payload = null) => testConnection(payload));
  ipcMain.handle("settings:getMarketplaceConfig", async () => getMarketplaceSettingsPayload());
  ipcMain.handle("settings:saveMarketplaceConfig", async (_, payload = {}) => {
    requirePermission("settings:write", "marketplace-config");
    const saved = saveMarketplaceConfig({ curseForgeApiKey: payload.curseForgeApiKey || "" });
    curseforgeProvider._test.setRuntimeApiKey(saved.curseForgeApiKey);
    audit({ action: "settings.marketplace.save", target: "marketplace-config" });
    return getMarketplaceSettingsPayload();
  });
}

module.exports = {
  registerSettingsIpc,
};
