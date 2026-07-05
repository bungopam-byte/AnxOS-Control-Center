const { ipcMain } = require("electron");
const { getDockerSnapshot } = require("../services/dockerService");

function registerDockerIpc() {
  ipcMain.handle("docker:getSnapshot", async () => getDockerSnapshot());
}

module.exports = {
  registerDockerIpc,
};
