const { BrowserWindow, clipboard, ipcMain } = require("electron");
const diagnostics = require("../services/diagnosticsService");

function registerDiagnosticsIpc() {
  ipcMain.handle("diagnostics:log", (_, payload = {}) => diagnostics.log(payload.severity || "info", "renderer", payload.operation || "event", payload.message || "Renderer event", payload.context || {}, { file: payload.file || "renderer", correlationId: payload.correlationId }));
  ipcMain.handle("diagnostics:capture", (_, payload = {}) => diagnostics.captureSnapshot(payload));
  ipcMain.handle("diagnostics:read", (_, payload = {}) => diagnostics.readLogs(payload));
  ipcMain.handle("diagnostics:openFolder", () => diagnostics.openFolder());
  ipcMain.handle("diagnostics:copySummary", async () => { const summary = await diagnostics.copySummary(); clipboard.writeText(summary); return { copied: true }; });
  ipcMain.handle("diagnostics:export", (event) => diagnostics.exportBundle(BrowserWindow.fromWebContents(event.sender)));
}

module.exports = { registerDiagnosticsIpc };
