const { BrowserWindow, clipboard, ipcMain } = require("electron");
const diagnostics = require("../services/diagnosticsService");
const { requirePermission } = require("../services/securityService");

function authorizeDiagnostics(operation) {
  return requirePermission("settings:write", `diagnostics:${operation}`);
}

function registerDiagnosticsIpc() {
  ipcMain.handle("diagnostics:log", (_, payload = {}) => diagnostics.log(payload.severity || "info", "renderer", payload.operation || "event", payload.message || "Renderer event", payload.context || {}, { file: payload.file || "renderer", correlationId: payload.correlationId }));
  ipcMain.handle("diagnostics:capture", (_, payload = {}) => { authorizeDiagnostics("capture"); return diagnostics.captureSnapshot(payload); });
  ipcMain.handle("diagnostics:read", (_, payload = {}) => { authorizeDiagnostics("read"); return diagnostics.readLogs(payload); });
  ipcMain.handle("diagnostics:openFolder", () => { authorizeDiagnostics("open-folder"); return diagnostics.openFolder(); });
  ipcMain.handle("diagnostics:copySummary", async () => { authorizeDiagnostics("copy-summary"); const summary = await diagnostics.copySummary(); clipboard.writeText(summary); return { copied: true }; });
  ipcMain.handle("diagnostics:export", (event) => { authorizeDiagnostics("export"); return diagnostics.exportBundle(BrowserWindow.fromWebContents(event.sender)); });
}

module.exports = { registerDiagnosticsIpc };
