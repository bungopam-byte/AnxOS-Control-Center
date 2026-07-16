const { ipcMain } = require("electron");
const maintenance = require("../services/maintenanceService");
const { audit, requirePermission } = require("../services/securityService");
const { createIpcError } = require("../shared/ipcError");

function registerMaintenanceHandler(channel, handler) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      throw createIpcError(error, {
        code: "MAINTENANCE_REQUEST_FAILED",
        fallbackMessage: "Maintenance operation failed.",
        suggestion: "Close active workflows using the selected data, then retry the maintenance scan or cleanup.",
      });
    }
  });
}

function normalizeCategoryIds(payload = {}) {
  if (!Array.isArray(payload.categoryIds)) return [];
  return payload.categoryIds.map((id) => String(id || "").trim()).filter(Boolean);
}

function registerMaintenanceIpc() {
  registerMaintenanceHandler("maintenance:scan", async () => {
    requirePermission("settings:write", "maintenance");
    return maintenance.scan();
  });
  registerMaintenanceHandler("maintenance:clear", async (_, payload = {}) => {
    requirePermission("settings:write", "maintenance");
    const categoryIds = normalizeCategoryIds(payload);
    const result = await maintenance.clear(categoryIds);
    audit({
      action: "maintenance.clear",
      target: categoryIds.join(","),
      outcome: result.partial ? "partial" : "ok",
      reason: `${result.reclaimedBytes || 0} bytes reclaimed`,
    });
    return result;
  });
}

module.exports = {
  registerMaintenanceIpc,
};
