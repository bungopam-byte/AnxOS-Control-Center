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
  actions: {
    executeAction: (actionId, params = {}) => ipcRenderer.invoke("action:execute", { actionId, params }),
  },
  files: {
    getListing: () => ipcRenderer.invoke("files:getListing"),
  },
  ssh: {
    listProfiles: () => ipcRenderer.invoke("ssh:listProfiles"),
    connect: (payload) => ipcRenderer.invoke("ssh:connect", payload),
    disconnect: (sessionId) => ipcRenderer.invoke("ssh:disconnect", { sessionId }),
    write: (sessionId, input) => ipcRenderer.invoke("ssh:write", { sessionId, input }),
    resize: (sessionId, size = {}) => ipcRenderer.invoke("ssh:resize", { sessionId, ...size }),
    onEvent: (callback) => {
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("ssh:event", handler);
      return () => ipcRenderer.removeListener("ssh:event", handler);
    },
  },
  settings: {
    getAgentConfig: () => ipcRenderer.invoke("settings:getAgentConfig"),
    saveAgentConfig: (settings) => ipcRenderer.invoke("settings:saveAgentConfig", settings),
    testAgentConnection: (settings) => ipcRenderer.invoke("settings:testAgentConnection", settings),
  },
};

contextBridge.exposeInMainWorld("anxhub", desktopApi);
contextBridge.exposeInMainWorld("anxos", desktopApi);
