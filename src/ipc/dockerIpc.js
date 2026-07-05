const { ipcMain } = require("electron");
const { getDockerSnapshot } = require("../services/serviceRouter");

function registerDockerIpc() {
  ipcMain.handle("docker:getSnapshot", async () => getDockerSnapshot());
}

module.exports = {
  registerDockerIpc,
};
