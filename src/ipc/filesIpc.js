const { BrowserWindow, ipcMain } = require("electron");
const { FileService } = require("../services/fileService");
const {
  deleteConnection,
  listConnections,
  saveConnection,
  setDefaultConnection,
  testConnection,
} = require("../services/storageConnectionService");
const { audit, checkRateLimit, requirePermission } = require("../services/securityService");

const fileService = new FileService();
let filesIpcRegistered = false;
let filesTransferEventsRegistered = false;

function registerFilesIpc() {
  if (filesIpcRegistered) {
    return fileService;
  }

  filesIpcRegistered = true;

  if (!filesTransferEventsRegistered) {
    filesTransferEventsRegistered = true;
    fileService.on("transfer", (payload) => {
      BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) {
          window.webContents.send("files:transfer", payload);
        }
      });
    });
  }

  ipcMain.handle("files:list", async (_, payload = {}) => fileService.list(payload));
  ipcMain.handle("files:identity", async (_, payload = {}) => fileService.identity(payload));
  ipcMain.handle("files:listConnections", async () => listConnections());
  ipcMain.handle("files:saveConnection", async (_, payload = {}) => {
    requirePermission("settings:write", "storage-connections");
    audit({ action: "files.storage.save", target: payload.id || payload.name || payload.host });
    return saveConnection(payload);
  });
  ipcMain.handle("files:deleteConnection", async (_, payload = {}) => {
    requirePermission("settings:write", payload.storageId || payload.id);
    audit({ action: "files.storage.delete", target: payload.storageId || payload.id });
    return deleteConnection(payload.storageId || payload.id);
  });
  ipcMain.handle("files:setDefaultConnection", async (_, payload = {}) => {
    requirePermission("settings:write", payload.storageId || payload.id);
    audit({ action: "files.storage.default", target: payload.storageId || payload.id });
    return setDefaultConnection(payload.storageId || payload.id);
  });
  ipcMain.handle("files:testConnection", async (_, payload = {}) => testConnection(payload));
  ipcMain.handle("files:disconnect", async (_, payload = {}) => fileService.disconnect(payload.profileId, payload.storageId));
  ipcMain.handle("files:cancelTransfer", async (_, payload = {}) => {
    requirePermission("files:write", payload.transferId || payload.id);
    audit({ action: "files.transfer.cancel", target: payload.transferId || payload.id });
    return fileService.cancelTransfer(payload.transferId || payload.id);
  });
  ipcMain.handle("files:readText", async (_, payload = {}) => fileService.readText(payload));
  ipcMain.handle("files:writeText", async (_, payload = {}) => {
    requirePermission("files:write", payload.path);
    checkRateLimit("files-write", 120, 60 * 1000);
    audit({ action: "files.write", target: payload.path });
    return fileService.writeText(payload);
  });
  ipcMain.handle("files:mkdir", async (_, payload = {}) => {
    requirePermission("files:write", payload.path);
    audit({ action: "files.mkdir", target: payload.path });
    return fileService.mkdir(payload);
  });
  ipcMain.handle("files:rename", async (_, payload = {}) => {
    requirePermission("files:write", `${payload.oldPath} -> ${payload.newPath}`);
    audit({ action: "files.rename", target: payload.oldPath });
    return fileService.rename(payload);
  });
  ipcMain.handle("files:copy", async (_, payload = {}) => {
    requirePermission("files:write", `${payload.sourcePath || payload.path} -> ${payload.destinationPath || payload.newPath}`);
    audit({ action: "files.copy", target: payload.sourcePath || payload.path });
    return fileService.copy(payload);
  });
  ipcMain.handle("files:newFile", async (_, payload = {}) => {
    requirePermission("files:write", payload.path || payload.filePath);
    audit({ action: "files.newFile", target: payload.path || payload.filePath });
    return fileService.newFile(payload);
  });
  ipcMain.handle("files:delete", async (_, payload = {}) => {
    requirePermission("files:write", payload.path);
    audit({ action: "files.delete", target: payload.path });
    return fileService.delete(payload);
  });
  ipcMain.handle("files:upload", async (_, payload = {}) => {
    requirePermission("files:write", payload.directoryPath);
    checkRateLimit("files-upload", 30, 60 * 1000);
    audit({ action: "files.upload", target: payload.directoryPath });
    return fileService.upload(payload);
  });
  ipcMain.handle("files:download", async (_, payload = {}) => fileService.download(payload));
  return fileService;
}

function disposeFilesIpc() {
  fileService.dispose();
  filesIpcRegistered = false;
}

module.exports = {
  disposeFilesIpc,
  registerFilesIpc,
};
