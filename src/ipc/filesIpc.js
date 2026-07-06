const { ipcMain } = require("electron");
const { FileService } = require("../services/fileService");
const { audit, checkRateLimit, requirePermission } = require("../services/securityService");

const fileService = new FileService();
let filesIpcRegistered = false;

function registerFilesIpc() {
  if (filesIpcRegistered) {
    return fileService;
  }

  filesIpcRegistered = true;

  ipcMain.handle("files:list", async (_, payload = {}) => fileService.list(payload));
  ipcMain.handle("files:disconnect", async (_, payload = {}) => fileService.disconnect(payload.profileId));
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
