const { contextBridge, ipcRenderer } = require("electron");

const desktopApi = {
  app: {
    getRuntimeInfo: () => ipcRenderer.invoke("app:getRuntimeInfo"),
  },
  system: {
    getSnapshot: () => ipcRenderer.invoke("system:getSnapshot"),
  },
  amp: {
    getSnapshot: () => ipcRenderer.invoke("amp:getSnapshot"),
  },
  playit: {
    getSnapshot: () => ipcRenderer.invoke("playit:getSnapshot"),
  },
  docker: {
    getSnapshot: () => ipcRenderer.invoke("docker:getSnapshot"),
  },
};

contextBridge.exposeInMainWorld("anxhub", desktopApi);
contextBridge.exposeInMainWorld("anxos", desktopApi);
