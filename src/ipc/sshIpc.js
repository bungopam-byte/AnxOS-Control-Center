const { BrowserWindow, ipcMain } = require("electron");
const { SshService } = require("../services/sshService");

const sshService = new SshService();

function broadcastSshEvent(type, payload) {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("ssh:event", {
      type,
      ...payload,
    });
  });
}

function registerSshIpc() {
  sshService.on("session-updated", (session) => {
    broadcastSshEvent("session-updated", { session });
  });

  sshService.on("session-output", ({ sessionId, chunk }) => {
    broadcastSshEvent("session-output", { sessionId, chunk });
  });

  sshService.on("session-error", ({ sessionId, message, code }) => {
    broadcastSshEvent("session-error", { sessionId, message, code });
  });

  sshService.on("session-closed", ({ sessionId, message }) => {
    broadcastSshEvent("session-closed", { sessionId, message });
  });

  ipcMain.handle("ssh:listProfiles", async () => sshService.listProfiles());
  ipcMain.handle("ssh:connect", async (_, payload = {}) => sshService.connect(payload));
  ipcMain.handle("ssh:disconnect", async (_, payload = {}) => sshService.disconnect(payload.sessionId));
  ipcMain.handle("ssh:write", async (_, payload = {}) => sshService.write(payload.sessionId, payload.input));
  ipcMain.handle("ssh:resize", async (_, payload = {}) => sshService.resize(payload.sessionId, payload));
}

module.exports = {
  registerSshIpc,
};
