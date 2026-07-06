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
  marketplace: {
    listTemplates: () => ipcRenderer.invoke("marketplace:listTemplates"),
    installTemplate: (payload) => ipcRenderer.invoke("marketplace:installTemplate", payload),
    getDownloads: () => ipcRenderer.invoke("marketplace:getDownloads"),
    cancelDownload: (downloadId) => ipcRenderer.invoke("marketplace:cancelDownload", { downloadId }),
    retryDownload: (downloadId) => ipcRenderer.invoke("marketplace:retryDownload", { downloadId }),
  },
  instances: {
    list: () => ipcRenderer.invoke("instances:list"),
    create: (payload) => ipcRenderer.invoke("instances:create", payload),
    update: (instanceId, config) => ipcRenderer.invoke("instances:update", { instanceId, config }),
    getStatus: (instanceId) => ipcRenderer.invoke("instances:getStatus", { instanceId }),
    getMetrics: (instanceId) => ipcRenderer.invoke("instances:getMetrics", { instanceId }),
    getLogs: (instanceId, options = {}) => ipcRenderer.invoke("instances:getLogs", { instanceId, ...options }),
    clearLogs: (instanceId, options = {}) => ipcRenderer.invoke("instances:clearLogs", { instanceId, ...options }),
    sendCommand: (instanceId, command) => ipcRenderer.invoke("instances:sendCommand", { instanceId, command }),
    start: (instanceId) => ipcRenderer.invoke("instances:start", { instanceId }),
    stop: (instanceId) => ipcRenderer.invoke("instances:stop", { instanceId }),
    restart: (instanceId) => ipcRenderer.invoke("instances:restart", { instanceId }),
    forceKill: (instanceId) => ipcRenderer.invoke("instances:forceKill", { instanceId }),
    delete: (instanceId) => ipcRenderer.invoke("instances:delete", { instanceId }),
    listFiles: (instanceId, path = ".") => ipcRenderer.invoke("instances:listFiles", { instanceId, path }),
    readFile: (instanceId, path) => ipcRenderer.invoke("instances:readFile", { instanceId, path }),
    writeFile: (instanceId, path, content, options = {}) => ipcRenderer.invoke("instances:writeFile", { instanceId, path, content, ...options }),
    deleteFile: (instanceId, path) => ipcRenderer.invoke("instances:deleteFile", { instanceId, path }),
    createFolder: (instanceId, path) => ipcRenderer.invoke("instances:createFolder", { instanceId, path }),
    renameFile: (instanceId, oldPath, newPath) => ipcRenderer.invoke("instances:renameFile", { instanceId, oldPath, newPath }),
    getMinecraftProperties: (instanceId) => ipcRenderer.invoke("instances:getMinecraftProperties", { instanceId }),
    saveMinecraftProperties: (instanceId, properties) => ipcRenderer.invoke("instances:saveMinecraftProperties", { instanceId, properties }),
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
