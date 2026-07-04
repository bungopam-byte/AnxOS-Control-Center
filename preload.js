const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("anxhub", {
  system: {
    getSnapshot: () => ipcRenderer.invoke("system:getSnapshot"),
  },
});
