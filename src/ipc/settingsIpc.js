const { ipcMain } = require("electron");
const {
  getDefaultAgentSettings,
  getEffectiveAgentSettings,
  readAgentSettings,
  saveAgentSettings,
  testConnection,
} = require("../services/agentClient");

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
    configPath: "config/agent.json",
  };
}

function registerSettingsIpc() {
  ipcMain.handle("settings:getAgentConfig", async () => getAgentSettingsPayload());
  ipcMain.handle("settings:saveAgentConfig", async (_, payload = {}) => {
    saveAgentSettings(payload);
    return getAgentSettingsPayload();
  });
  ipcMain.handle("settings:testAgentConnection", async (_, payload = null) => testConnection(payload));
}

module.exports = {
  registerSettingsIpc,
};
