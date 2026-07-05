const { contextBridge, ipcRenderer } = require("electron");

const windowApi = {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  restore: () => ipcRenderer.send("window:restore"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onMaximizedChanged: (callback) => {
    const handler = (_, isMaximized) => callback(Boolean(isMaximized));
    ipcRenderer.on("window:maximized-changed", handler);
    return () => ipcRenderer.removeListener("window:maximized-changed", handler);
  },
};

const desktopApi = {
  app: {
    getRuntimeInfo: () => ipcRenderer.invoke("app:getRuntimeInfo"),
  },
  window: windowApi,
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
    list: (payload) => ipcRenderer.invoke("files:list", payload),
    disconnect: (profileId) => ipcRenderer.invoke("files:disconnect", { profileId }),
    readText: (payload) => ipcRenderer.invoke("files:readText", payload),
    writeText: (payload) => ipcRenderer.invoke("files:writeText", payload),
    mkdir: (payload) => ipcRenderer.invoke("files:mkdir", payload),
    rename: (payload) => ipcRenderer.invoke("files:rename", payload),
    delete: (payload) => ipcRenderer.invoke("files:delete", payload),
    upload: (payload) => ipcRenderer.invoke("files:upload", payload),
    download: (payload) => ipcRenderer.invoke("files:download", payload),
  },
  ssh: {
    listProfiles: () => ipcRenderer.invoke("ssh:listProfiles"),
    saveProfile: (payload) => ipcRenderer.invoke("ssh:saveProfile", payload),
    connect: (payload) => ipcRenderer.invoke("ssh:connect", payload),
    disconnect: (sessionId) => ipcRenderer.invoke("ssh:disconnect", { sessionId }),
    write: (sessionId, input) => ipcRenderer.invoke("ssh:write", { sessionId, input }),
    resize: (sessionId, size = {}) => ipcRenderer.invoke("ssh:resize", { sessionId, ...size }),
    onData: (callback) => {
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("ssh:data", handler);
      return () => ipcRenderer.removeListener("ssh:data", handler);
    },
    onStatus: (callback) => {
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("ssh:status", handler);
      return () => ipcRenderer.removeListener("ssh:status", handler);
    },
  },
  settings: {
    getAgentConfig: () => ipcRenderer.invoke("settings:getAgentConfig"),
    saveAgentConfig: (settings) => ipcRenderer.invoke("settings:saveAgentConfig", settings),
    testAgentConnection: (settings) => ipcRenderer.invoke("settings:testAgentConnection", settings),
  },
};

contextBridge.exposeInMainWorld("anxWindow", windowApi);
contextBridge.exposeInMainWorld("anxhub", desktopApi);
contextBridge.exposeInMainWorld("anxos", desktopApi);
contextBridge.exposeInMainWorld("electronAPI", desktopApi);
