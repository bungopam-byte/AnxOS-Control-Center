const { ipcMain } = require("electron");
const control = require("../services/agentControlService");
const { audit, requireOwner } = require("../services/securityService");

function authorize(operation) { const actor = requireOwner(`agent-control:${operation}`); audit({ action: `agent.control.${operation}`, actor, target: "local-agent" }); return actor; }
function registerAgentControlIpc() {
  ipcMain.handle("agentControl:list", () => control.listAgents());
  ipcMain.handle("agentControl:status", () => control.getStatus());
  ipcMain.handle("agentControl:diagnostics", () => { authorize("diagnostics"); return control.runDiagnostics(); });
  ipcMain.handle("agentControl:remoteDiagnostics", (_, payload = {}) => { authorize("remote-diagnostics"); return control.captureRemoteDiagnostics(payload.nodeId); });
  ipcMain.handle("agentControl:getConfig", () => { authorize("config-read"); return control.readConfig(); });
  ipcMain.handle("agentControl:saveConfig", (_, payload = {}) => { authorize("config-save"); return control.saveConfig(payload); });
  ipcMain.handle("agentControl:restoreConfig", () => { authorize("config-restore"); return control.restoreConfigBackup(); });
  ipcMain.handle("agentControl:resetConfig", () => { authorize("config-reset"); return control.resetConfig(); });
  for (const [channel, operation] of Object.entries({ start: () => control.start(), stop: () => control.stop(), restart: () => control.restart(), forceRestart: () => control.restart({ force: true }), installService: () => control.installService(), uninstallService: () => control.uninstallService(), enableAutoStart: () => control.setAutoStart(true), disableAutoStart: () => control.setAutoStart(false), openLogs: () => control.openLogs(), openDataFolder: () => control.openDataFolder() })) ipcMain.handle(`agentControl:${channel}`, () => { authorize(channel); return operation(); });
}
module.exports = { registerAgentControlIpc };
