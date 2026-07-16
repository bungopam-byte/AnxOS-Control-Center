const { ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const {
  createBackup,
  deleteBackup,
  deleteBackupSchedule,
  downloadBackup,
  importBackup,
  listBackupSchedules,
  listBackups,
  restoreBackup,
  saveBackupSchedule,
} = require("../services/serviceRouter");
const { audit, requirePermission } = require("../services/securityService");
const { wrapExpectedAgentRead } = require("./expectedAgentError");
const { requireNodeContext } = require("./nodeContext");
const { createIpcError } = require("../shared/ipcError");

async function invokeBackupOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    throw createIpcError(error, {
      code: "BACKUP_REQUEST_FAILED",
      fallbackMessage: "Backup request failed.",
      suggestion: "Review the backup diagnostics, correct the reported problem, then retry.",
    });
  }
}

async function saveBackupDownload(backupId, options = {}) {
  requirePermission("backups:write", backupId);
  const payload = await downloadBackup(backupId, options);
  const suggested = backupId.endsWith(".tar.gz") ? backupId : `${backupId}.tar.gz`;
  const selection = await dialog.showSaveDialog({
    title: "Download backup",
    defaultPath: suggested,
    filters: [{ name: "Backup archives", extensions: ["tar.gz", "tgz"] }],
  });

  if (selection.canceled || !selection.filePath) {
    return { canceled: true };
  }

  fs.writeFileSync(selection.filePath, payload.buffer);
  audit({ action: "backup.download", target: backupId });
  return {
    canceled: false,
    path: selection.filePath,
    size: payload.buffer.length,
  };
}

async function importBackupFromFile(payload = {}) {
  requirePermission("backups:write", payload.instanceId);
  const selection = await dialog.showOpenDialog({
    title: "Import backup",
    properties: ["openFile"],
    filters: [{ name: "Backup archives", extensions: ["tar.gz", "tgz"] }],
  });

  if (selection.canceled || !selection.filePaths?.[0]) {
    return { canceled: true };
  }

  const filePath = selection.filePaths[0];
  const content = fs.readFileSync(filePath).toString("base64");
  const result = await importBackup({
    ...payload,
    name: payload.name || path.basename(filePath),
    content,
    encoding: "base64",
  });
  audit({ action: "backup.import", target: result?.backup?.id || payload.instanceId });
  return result;
}

function registerBackupsIpc() {
  ipcMain.handle("backups:list", async (_, payload = {}) => wrapExpectedAgentRead("backups:list", () => { requirePermission("backups:read", payload.nodeId); return listBackups(requireNodeContext(payload, "backup listing")); }));
  ipcMain.handle("backups:create", async (_, payload = {}) => invokeBackupOperation(() => {
    requireNodeContext(payload, "backup creation");
    requirePermission("backups:write", payload.instanceId);
    audit({ action: "backup.create", target: payload.instanceId });
    return createBackup(payload);
  }));
  ipcMain.handle("backups:restore", async (_, payload = {}) => invokeBackupOperation(() => {
    requireNodeContext(payload, "backup restore");
    requirePermission("backups:restore", payload.backupId);
    audit({ action: "backup.restore", target: payload.backupId });
    return restoreBackup(payload);
  }));
  ipcMain.handle("backups:delete", async (_, payload = {}) => invokeBackupOperation(() => {
    requireNodeContext(payload, "backup deletion");
    requirePermission("backups:write", payload.backupId);
    audit({ action: "backup.delete", target: payload.backupId });
    return deleteBackup(payload.backupId, payload);
  }));
  ipcMain.handle("backups:download", async (_, payload = {}) => invokeBackupOperation(() => saveBackupDownload(payload.backupId, requireNodeContext(payload, "backup download"))));
  ipcMain.handle("backups:import", async (_, payload = {}) => invokeBackupOperation(() => importBackupFromFile(requireNodeContext(payload, "backup import"))));
  ipcMain.handle("backups:listSchedules", async (_, payload = {}) => wrapExpectedAgentRead("backups:listSchedules", () => { requirePermission("backups:read", payload.nodeId); return listBackupSchedules(requireNodeContext(payload, "backup schedules")); }));
  ipcMain.handle("backups:saveSchedule", async (_, payload = {}) => invokeBackupOperation(() => {
    requireNodeContext(payload, "backup schedule save");
    requirePermission("backups:write", payload.instanceId);
    audit({ action: "backup.schedule.save", target: payload.instanceId });
    return saveBackupSchedule(payload);
  }));
  ipcMain.handle("backups:deleteSchedule", async (_, payload = {}) => invokeBackupOperation(() => {
    requireNodeContext(payload, "backup schedule deletion");
    requirePermission("backups:write", payload.instanceId);
    audit({ action: "backup.schedule.delete", target: payload.instanceId });
    return deleteBackupSchedule(payload.instanceId, payload);
  }));
}

module.exports = {
  registerBackupsIpc,
};
