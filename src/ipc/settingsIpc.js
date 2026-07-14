const { ipcMain } = require("electron");
const {
  getDefaultAgentSettings,
  getAgentConfigPath,
  getEffectiveAgentSettings,
  getSharedAgentTokenStatus,
  pairAgentFromCode,
  readAgentSettings,
  saveAgentSettings,
  testConnection,
} = require("../services/agentClient");
const {
  getMarketplaceConfigPath,
  readMarketplaceConfig,
  saveMarketplaceConfig,
} = require("../services/providerConfigService");
const {
  readPreferences,
  resetPreferences,
  updatePreferences,
} = require("../services/settingsPreferenceService");
const {
  assertCanReadSettingsSecret,
  assertCanResetSettingsCategory,
  assertCanWriteSettingsPayload,
  getSettingsPermissions,
} = require("../services/settingsPermissionService");
const curseforgeProvider = require("../services/providers/curseforgeProvider");
const { audit } = require("../services/securityService");

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
  ipcMain.handle("settings:getPermissions", async () => getSettingsPermissions());
  ipcMain.handle("settings:getPreferences", async () => readPreferences());
  ipcMain.handle("settings:savePreferences", async (_, payload = {}) => {
    assertCanWriteSettingsPayload(payload.settings || payload, "preferences");
    const result = updatePreferences(payload.settings || payload);
    audit({ action: "settings.preferences.save", target: "preferences" });
    return result;
  });
  ipcMain.handle("settings:resetPreferences", async (_, payload = {}) => {
    assertCanResetSettingsCategory(payload.category || null);
    const result = resetPreferences(payload.category || null);
    audit({ action: "settings.preferences.reset", target: payload.category || "all" });
    return result;
  });
  ipcMain.handle("settings:getAgentConfig", async () => {
    assertCanReadSettingsSecret("canManageAgentConfiguration", "agent-config");
    return getAgentSettingsPayload();
  });
  ipcMain.handle("settings:saveAgentConfig", async (_, payload = {}) => {
    assertCanReadSettingsSecret("canManageAgentConfiguration", "agent-config");
    saveAgentSettings(payload);
    audit({ action: "settings.agent.save", target: "agent-config" });
    return getAgentSettingsPayload();
  });
  ipcMain.handle("settings:testAgentConnection", async (_, payload = null) => testConnection(payload));
  ipcMain.handle("settings:pairAgent", async (_, payload = {}) => {
    assertCanReadSettingsSecret("canManageAgentConfiguration", "agent-pairing");
    const result = pairAgentFromCode(payload.code || payload.pairingCode || "");
    audit({ action: "settings.agent.pair", target: "agent-config", reason: result.fingerprint || null });
    return {
      ...getAgentSettingsPayload(),
      paired: true,
      pairing: {
        agentUrl: result.agentUrl,
        fingerprint: result.fingerprint,
        restartRequired: result.restartRequired,
      },
    };
  });
  ipcMain.handle("settings:getMarketplaceConfig", async () => {
    assertCanReadSettingsSecret("canManageMarketplaceSettings", "marketplace-config");
    return getMarketplaceSettingsPayload();
  });
  ipcMain.handle("settings:saveMarketplaceConfig", async (_, payload = {}) => {
    assertCanReadSettingsSecret("canManageMarketplaceSettings", "marketplace-config");
    const saved = saveMarketplaceConfig({ curseForgeApiKey: payload.curseForgeApiKey || "" });
    curseforgeProvider._test.setRuntimeApiKey(saved.curseForgeApiKey);
    audit({ action: "settings.marketplace.save", target: "marketplace-config" });
    return getMarketplaceSettingsPayload();
  });
}

module.exports = {
  registerSettingsIpc,
};
