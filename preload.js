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
  updates: {
    getState: () => ipcRenderer.invoke("updates:getState"),
    check: (options = {}) => ipcRenderer.invoke("updates:check", options),
    download: () => ipcRenderer.invoke("updates:download"),
    install: () => ipcRenderer.invoke("updates:install"),
    skip: (version) => ipcRenderer.invoke("updates:skip", { version }),
    openDownloaded: () => ipcRenderer.invoke("updates:open-downloaded"),
    openRelease: () => ipcRenderer.invoke("updates:open-release"),
    onStatus: (callback) => {
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("updates:status", handler);
      return () => ipcRenderer.removeListener("updates:status", handler);
    },
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
    getSnapshot: (payload = {}) => ipcRenderer.invoke("docker:getSnapshot", payload),
    listContainers: (payload = {}) => ipcRenderer.invoke("docker:listContainers", payload),
    inspectContainer: (container, payload = {}) => ipcRenderer.invoke("docker:inspectContainer", { ...payload, container }),
    create: (payload = {}) => ipcRenderer.invoke("docker:create", payload),
    start: (container, payload = {}) => ipcRenderer.invoke("docker:start", { ...payload, container }),
    startContainer: (container, payload = {}) => ipcRenderer.invoke("docker:start", { ...payload, container }),
    stop: (container, payload = {}) => ipcRenderer.invoke("docker:stop", { ...payload, container }),
    stopContainer: (container, payload = {}) => ipcRenderer.invoke("docker:stop", { ...payload, container }),
    restart: (container, payload = {}) => ipcRenderer.invoke("docker:restart", { ...payload, container }),
    restartContainer: (container, payload = {}) => ipcRenderer.invoke("docker:restart", { ...payload, container }),
    delete: (container, payload = {}) => ipcRenderer.invoke("docker:delete", { ...payload, container }),
    removeContainer: (container, payload = {}) => ipcRenderer.invoke("docker:removeContainer", { ...payload, container }),
    listImages: (payload = {}) => ipcRenderer.invoke("docker:listImages", payload),
    removeImage: (image, payload = {}) => ipcRenderer.invoke("docker:removeImage", { ...payload, image }),
    listNetworks: (payload = {}) => ipcRenderer.invoke("docker:listNetworks", payload),
    listVolumes: (payload = {}) => ipcRenderer.invoke("docker:listVolumes", payload),
    getLogs: (container, payload = {}) => ipcRenderer.invoke("docker:getLogs", { ...payload, container }),
    getStats: (container, payload = {}) => ipcRenderer.invoke("docker:getStats", { ...payload, container }),
  },
  marketplace: {
    listTemplates: () => ipcRenderer.invoke("marketplace:listTemplates"),
    getMinecraftVersions: (templateId) => ipcRenderer.invoke("marketplace:getMinecraftVersions", { templateId }),
    searchProviderPacks: (payload = {}) => ipcRenderer.invoke("marketplace:searchProviderPacks", payload),
    getProviderPackVersions: (payload = {}) => ipcRenderer.invoke("marketplace:getProviderPackVersions", payload),
    getProviderPackDetails: (payload = {}) => ipcRenderer.invoke("marketplace:getProviderPackDetails", payload),
    getImportSupport: () => ipcRenderer.invoke("marketplace:getImportSupport"),
    importCommunityTemplate: (payload = {}) => ipcRenderer.invoke("marketplace:importCommunityTemplate", payload),
    installTemplate: (payload) => ipcRenderer.invoke("marketplace:installTemplate", payload),
    installPack: (payload) => ipcRenderer.invoke("marketplace:installPack", payload),
    openManualDownloadPage: (sessionId) => ipcRenderer.invoke("marketplace:openManualDownloadPage", { sessionId }),
    importManualDownloadFile: (sessionId) => ipcRenderer.invoke("marketplace:importManualDownloadFile", { sessionId }),
    resumeManualInstall: (sessionId) => ipcRenderer.invoke("marketplace:resumeManualInstall", { sessionId }),
    onInstallProgress: (callback) => {
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("marketplace:install-progress", handler);
      return () => ipcRenderer.removeListener("marketplace:install-progress", handler);
    },
    getDownloads: () => ipcRenderer.invoke("marketplace:getDownloads"),
    cancelDownload: (downloadId) => ipcRenderer.invoke("marketplace:cancelDownload", { downloadId }),
    retryDownload: (downloadId) => ipcRenderer.invoke("marketplace:retryDownload", { downloadId }),
  },
  instances: {
    list: (payload = {}) => ipcRenderer.invoke("instances:list", payload),
    create: (payload) => ipcRenderer.invoke("instances:create", payload),
    update: (instanceId, config) => ipcRenderer.invoke("instances:update", { instanceId, config }),
    getStatus: (instanceId) => ipcRenderer.invoke("instances:getStatus", { instanceId }),
    getMetrics: (instanceId) => ipcRenderer.invoke("instances:getMetrics", { instanceId }),
    getLogs: (instanceId, options = {}) => ipcRenderer.invoke("instances:getLogs", { instanceId, ...options }),
    clearLogs: (instanceId, options = {}) => ipcRenderer.invoke("instances:clearLogs", { instanceId, ...options }),
    sendCommand: (instanceId, command) => ipcRenderer.invoke("instances:sendCommand", { instanceId, command }),
    start: (instanceId, payload = {}) => ipcRenderer.invoke("instances:start", { ...payload, instanceId }),
    stop: (instanceId, payload = {}) => ipcRenderer.invoke("instances:stop", { ...payload, instanceId }),
    restart: (instanceId, payload = {}) => ipcRenderer.invoke("instances:restart", { ...payload, instanceId }),
    forceKill: (instanceId) => ipcRenderer.invoke("instances:forceKill", { instanceId }),
    delete: (instanceId, payload = {}) => ipcRenderer.invoke("instances:delete", { ...payload, instanceId }),
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
  backups: {
    list: (payload = {}) => ipcRenderer.invoke("backups:list", payload),
    create: (payload = {}) => ipcRenderer.invoke("backups:create", payload),
    restore: (payload = {}) => ipcRenderer.invoke("backups:restore", payload),
    delete: (backupId) => ipcRenderer.invoke("backups:delete", { backupId }),
    download: (backupId) => ipcRenderer.invoke("backups:download", { backupId }),
    import: (payload = {}) => ipcRenderer.invoke("backups:import", payload),
    listSchedules: () => ipcRenderer.invoke("backups:listSchedules"),
    saveSchedule: (payload = {}) => ipcRenderer.invoke("backups:saveSchedule", payload),
    deleteSchedule: (instanceId) => ipcRenderer.invoke("backups:deleteSchedule", { instanceId }),
  },
  nodes: {
    list: () => ipcRenderer.invoke("nodes:list"),
    save: (payload = {}) => ipcRenderer.invoke("nodes:save", payload),
    delete: (nodeId) => ipcRenderer.invoke("nodes:delete", { nodeId }),
    select: (nodeId) => ipcRenderer.invoke("nodes:select", { nodeId }),
    test: (nodeId) => ipcRenderer.invoke("nodes:test", { nodeId }),
  },
  files: {
    listConnections: () => ipcRenderer.invoke("files:listConnections"),
    saveConnection: (payload = {}) => ipcRenderer.invoke("files:saveConnection", payload),
    deleteConnection: (storageId) => ipcRenderer.invoke("files:deleteConnection", { storageId }),
    setDefaultConnection: (storageId) => ipcRenderer.invoke("files:setDefaultConnection", { storageId }),
    testConnection: (payload = {}) => ipcRenderer.invoke("files:testConnection", payload),
    list: (payload) => ipcRenderer.invoke("files:list", payload),
    disconnect: (profileId, storageId = null) => ipcRenderer.invoke("files:disconnect", { profileId, storageId }),
    cancelTransfer: (transferId) => ipcRenderer.invoke("files:cancelTransfer", { transferId }),
    readText: (payload) => ipcRenderer.invoke("files:readText", payload),
    writeText: (payload) => ipcRenderer.invoke("files:writeText", payload),
    mkdir: (payload) => ipcRenderer.invoke("files:mkdir", payload),
    rename: (payload) => ipcRenderer.invoke("files:rename", payload),
    copy: (payload) => ipcRenderer.invoke("files:copy", payload),
    newFile: (payload) => ipcRenderer.invoke("files:newFile", payload),
    delete: (payload) => ipcRenderer.invoke("files:delete", payload),
    upload: (payload) => ipcRenderer.invoke("files:upload", payload),
    download: (payload) => ipcRenderer.invoke("files:download", payload),
    onTransfer: (callback) => {
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("files:transfer", handler);
      return () => ipcRenderer.removeListener("files:transfer", handler);
    },
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
    getMarketplaceConfig: () => ipcRenderer.invoke("settings:getMarketplaceConfig"),
    saveMarketplaceConfig: (settings) => ipcRenderer.invoke("settings:saveMarketplaceConfig", settings),
  },
  security: {
    getStatus: () => ipcRenderer.invoke("security:getStatus"),
    setupAdmin: (payload) => ipcRenderer.invoke("security:setupAdmin", payload),
    login: (payload) => ipcRenderer.invoke("security:login", payload),
    logout: () => ipcRenderer.invoke("security:logout"),
    logoutAllSessions: () => ipcRenderer.invoke("security:logoutAllSessions"),
    rotateAgentToken: () => ipcRenderer.invoke("security:rotateAgentToken"),
  },
};

contextBridge.exposeInMainWorld("anxWindow", windowApi);
contextBridge.exposeInMainWorld("anx", desktopApi);
contextBridge.exposeInMainWorld("anxhub", desktopApi);
contextBridge.exposeInMainWorld("anxos", desktopApi);
contextBridge.exposeInMainWorld("electronAPI", desktopApi);
