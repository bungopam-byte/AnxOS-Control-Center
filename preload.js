const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("anxhub", {
  system: {
    getSnapshot: () => ipcRenderer.invoke("system:getSnapshot"),
  },
  amp: {
    getSnapshot: () => ipcRenderer.invoke("amp:getSnapshot"),
  },
});
