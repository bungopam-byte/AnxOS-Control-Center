const { BrowserWindow, ipcMain } = require("electron");
const { SshService } = require("../services/sshService");

const sshService = new SshService();
let sshIpcRegistered = false;

function broadcastSshEvent(channel, payload) {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  });
}

function registerSshIpc() {
  if (sshIpcRegistered) {
    return sshService;
  }

  sshIpcRegistered = true;

  sshService.on("session-updated", (session) => {
    broadcastSshEvent("ssh:status", {
      type: "session-updated",
      session,
    });
  });

  sshService.on("session-output", ({ sessionId, chunk }) => {
    broadcastSshEvent("ssh:data", {
      sessionId,
      chunk,
    });
  });

  sshService.on("session-error", ({ sessionId, message, code }) => {
    broadcastSshEvent("ssh:status", {
      type: "session-error",
      sessionId,
      message,
      code,
    });
  });

  sshService.on("session-closed", ({ sessionId, message }) => {
    broadcastSshEvent("ssh:status", {
      type: "session-closed",
      sessionId,
      message,
    });
  });

  ipcMain.handle("ssh:listProfiles", async () => sshService.listProfiles());
  ipcMain.handle("ssh:saveProfile", async (_, payload = {}) => sshService.saveProfile(payload));
  ipcMain.handle("ssh:connect", async (_, payload = {}) => sshService.connect(payload));
  ipcMain.handle("ssh:disconnect", async (_, payload = {}) => sshService.disconnect(payload.sessionId));
  ipcMain.handle("ssh:write", async (_, payload = {}) => sshService.write(payload.sessionId, payload.input));
  ipcMain.handle("ssh:resize", async (_, payload = {}) => sshService.resize(payload.sessionId, payload));
  return sshService;
}

function disposeSshIpc() {
  sshService.dispose();
  sshIpcRegistered = false;
}

module.exports = {
  disposeSshIpc,
  registerSshIpc,
};
