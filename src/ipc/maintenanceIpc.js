const { ipcMain } = require("electron");
const maintenance = require("../services/maintenanceService");
const { audit, requirePermission } = require("../services/securityService");

function normalizeCategoryIds(payload = {}) {
  if (!Array.isArray(payload.categoryIds)) return [];
  return payload.categoryIds.map((id) => String(id || "").trim()).filter(Boolean);
}

function registerMaintenanceIpc() {
  ipcMain.handle("maintenance:scan", async () => {
    requirePermission("settings:write", "maintenance");
    return maintenance.scan();
  });
  ipcMain.handle("maintenance:clear", async (_, payload = {}) => {
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
