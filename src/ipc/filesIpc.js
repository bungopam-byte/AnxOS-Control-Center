const { ipcMain } = require("electron");
const { FileService } = require("../services/fileService");

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
  ipcMain.handle("files:writeText", async (_, payload = {}) => fileService.writeText(payload));
  ipcMain.handle("files:mkdir", async (_, payload = {}) => fileService.mkdir(payload));
  ipcMain.handle("files:rename", async (_, payload = {}) => fileService.rename(payload));
  ipcMain.handle("files:delete", async (_, payload = {}) => fileService.delete(payload));
  ipcMain.handle("files:upload", async (_, payload = {}) => fileService.upload(payload));
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
