const { ipcMain } = require("electron");
const control = require("../services/agentControlService");
const { audit, requireOwner } = require("../services/securityService");

function authorize(operation) {
  return requireOwner(`agent-control:${operation}`);
}

async function runAuthorized(operation, handler) {
  const actor = authorize(operation);
  return runAudited(operation, actor, handler);
}

async function runAudited(operation, actor, handler) {
  try {
    const result = await handler();
    audit({ action: `agent.control.${operation}`, actor, target: "local-agent", outcome: "ok" });
    return result;
  } catch (error) {
    audit({
      action: `agent.control.${operation}`,
      actor,
      target: "local-agent",
      outcome: "failed",
      reason: error?.code || error?.message || "AGENT_CONTROL_FAILED",
    });
    throw error;
  }
}

function registerAgentControlIpc() {
  ipcMain.handle("agentControl:list", () => control.listAgents());
  ipcMain.handle("agentControl:status", () => control.getStatus());
  ipcMain.handle("agentControl:diagnostics", () => runAuthorized("diagnostics", () => control.runDiagnostics()));
  ipcMain.handle("agentControl:remoteDiagnostics", (_, payload = {}) => {
    const actor = authorize("remote-diagnostics");
    return runAudited("remote-diagnostics", actor, () => control.captureRemoteDiagnostics(payload.nodeId));
  });
  ipcMain.handle("agentControl:getConfig", () => runAuthorized("config-read", () => control.readConfig()));
  ipcMain.handle("agentControl:saveConfig", (_, payload = {}) => runAuthorized("config-save", () => control.saveConfig(payload)));
  ipcMain.handle("agentControl:restoreConfig", () => runAuthorized("config-restore", () => control.restoreConfigBackup()));
  ipcMain.handle("agentControl:resetConfig", () => runAuthorized("config-reset", () => control.resetConfig()));
  for (const [channel, operation] of Object.entries({ start: () => control.start(), stop: () => control.stop(), restart: () => control.restart(), forceRestart: () => control.restart({ force: true }), installService: () => control.installService(), uninstallService: () => control.uninstallService(), enableAutoStart: () => control.setAutoStart(true), disableAutoStart: () => control.setAutoStart(false), openLogs: () => control.openLogs(), openDataFolder: () => control.openDataFolder() })) ipcMain.handle(`agentControl:${channel}`, () => runAuthorized(channel, operation));
}
module.exports = { registerAgentControlIpc };
