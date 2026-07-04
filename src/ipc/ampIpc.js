const { ipcMain } = require("electron");
const { getAmpSnapshot } = require("../services/ampService");

function registerAmpIpc() {
  ipcMain.handle("amp:getSnapshot", async () => {
    const snapshot = await getAmpSnapshot();

    console.log("[AnxHub][AMP IPC snapshot]", {
      snapshotStatus: snapshot?.status || "missing",
      instanceCount: Array.isArray(snapshot?.instances) ? snapshot.instances.length : 0,
      lastSuccessfulPollAt: snapshot?.poll?.lastSuccessfulPollAt || snapshot?.diagnostics?.lastSuccessfulPollAt || null,
    });

    return snapshot;
  });
}

module.exports = {
  registerAmpIpc,
};
