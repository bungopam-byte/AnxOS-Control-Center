const { ipcMain } = require("electron");
const { getFileListing } = require("../services/serviceRouter");

function registerFilesIpc() {
  ipcMain.handle("files:getListing", async () => getFileListing());
}

module.exports = {
  registerFilesIpc,
};
