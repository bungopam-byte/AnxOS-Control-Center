const { BrowserWindow, clipboard, ipcMain } = require("electron");
const diagnostics = require("../services/diagnosticsService");
const { checkRateLimit, requirePermission } = require("../services/securityService");
const { createIpcError } = require("../shared/ipcError");

const DIAGNOSTIC_LEVELS = new Set(["debug", "info", "warn", "error"]);

function registerDiagnosticsHandler(channel, handler) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      throw createIpcError(error, {
        code: "DIAGNOSTICS_REQUEST_FAILED",
        fallbackMessage: "Diagnostics operation failed.",
        suggestion: "Retry the diagnostics action or review the local log directory permissions.",
      });
    }
  });
}

function authorizeDiagnostics(operation) {
  return requirePermission("settings:write", `diagnostics:${operation}`);
}

function logRendererDiagnostic(payload = {}) {
  requirePermission("system:read", "diagnostics:renderer-log");
  checkRateLimit("diagnostics-renderer-log", 300, 60 * 1000);
  const severity = DIAGNOSTIC_LEVELS.has(payload.severity) ? payload.severity : "info";
  return diagnostics.log(
    severity,
    "renderer",
    String(payload.operation || "event").slice(0, 120),
    String(payload.message || "Renderer event").slice(0, 4000),
    payload.context && typeof payload.context === "object" ? payload.context : {},
    {
      file: String(payload.file || "renderer").slice(0, 80),
      correlationId: payload.correlationId ? String(payload.correlationId).slice(0, 160) : undefined,
    },
  );
}

function registerDiagnosticsIpc() {
  registerDiagnosticsHandler("diagnostics:log", (_, payload = {}) => logRendererDiagnostic(payload));
  ipcMain.on("diagnostics:log", (_, payload = {}) => {
    try { logRendererDiagnostic(payload); } catch {}
  });
  registerDiagnosticsHandler("diagnostics:capture", (_, payload = {}) => { authorizeDiagnostics("capture"); return diagnostics.captureSnapshot(payload); });
  registerDiagnosticsHandler("diagnostics:read", (_, payload = {}) => { authorizeDiagnostics("read"); return diagnostics.readLogs(payload); });
  registerDiagnosticsHandler("diagnostics:openFolder", () => { authorizeDiagnostics("open-folder"); return diagnostics.openFolder(); });
  registerDiagnosticsHandler("diagnostics:copySummary", async () => { authorizeDiagnostics("copy-summary"); const summary = await diagnostics.copySummary(); clipboard.writeText(summary); return { copied: true }; });
  registerDiagnosticsHandler("diagnostics:export", (event) => { authorizeDiagnostics("export"); return diagnostics.exportBundle(BrowserWindow.fromWebContents(event.sender)); });
}

module.exports = { registerDiagnosticsIpc };
