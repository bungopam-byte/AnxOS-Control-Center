const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { registerAccountAuthIpc } = require("./src/ipc/accountAuthIpc");
const { registerActionIpc } = require("./src/ipc/actionIpc");
const { registerAmpIpc } = require("./src/ipc/ampIpc");
const { registerBackupsIpc } = require("./src/ipc/backupsIpc");
const { registerDockerIpc } = require("./src/ipc/dockerIpc");
const { disposeFilesIpc, registerFilesIpc } = require("./src/ipc/filesIpc");
const { registerInstancesIpc } = require("./src/ipc/instancesIpc");
const { registerMarketplaceIpc } = require("./src/ipc/marketplaceIpc");
const { registerNodesIpc } = require("./src/ipc/nodesIpc");
const { registerOwnerWorkspaceIpc } = require("./src/ipc/ownerWorkspaceIpc");
const { registerPlayitIpc } = require("./src/ipc/playitIpc");
const { registerSecurityIpc } = require("./src/ipc/securityIpc");
const { registerSettingsIpc } = require("./src/ipc/settingsIpc");
const { disposeSshIpc, registerSshIpc } = require("./src/ipc/sshIpc");
const { registerSystemIpc } = require("./src/ipc/systemIpc");
const { logStartupStatus: logCurseForgeStartupStatus } = require("./src/services/providers/curseforgeProvider");
const { UpdateManager } = require("./src/services/updateManager");

const APP_ICON_PATH = path.join(__dirname, "assets", "icon.ico");
const WINDOW_MAXIMIZED_CHANGED_CHANNEL = "window:maximized-changed";
const DEFAULT_WINDOW_BOUNDS = {
  width: 1180,
  height: 820,
};
const updateManager = new UpdateManager();

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const userDataPath = path.join(app.getPath("appData"), "AnxHub");
app.setPath("userData", userDataPath);
app.setPath("cache", path.join(userDataPath, "Cache"));

function getGitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function getRuntimeInfo() {
  const trustedDevelopmentMode = process.env.ANXOS_TRUSTED_DEVELOPMENT_MODE === "1" && app.isPackaged === false;
  return {
    version: app.getVersion(),
    gitCommit: getGitCommit(),
    electron: process.versions.electron || null,
    node: process.versions.node || null,
    chromium: process.versions.chrome || null,
    isPackaged: app.isPackaged === true,
    trustedDevelopmentMode,
    developmentMode: trustedDevelopmentMode,
  };
}

function registerUpdatesIpc() {
  updateManager.initialize();
  ipcMain.handle("updates:getState", () => updateManager.getState());
  ipcMain.handle("updates:check", (_, options = {}) => updateManager.check({ ...options, forceNotify: !options.silent }));
  ipcMain.handle("updates:download", () => updateManager.download());
  ipcMain.handle("updates:open-downloaded", () => updateManager.install());
  ipcMain.handle("updates:install", () => updateManager.install());
  ipcMain.handle("updates:open-release", () => updateManager.openRelease());
  ipcMain.handle("updates:skip", (_, payload = {}) => updateManager.skip(payload.version));
}

function getWindowStatePath() {
  return path.join(app.getPath("userData"), "config", "window-state.json");
}

function readWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(getWindowStatePath(), "utf8"));
    const width = Number.parseInt(state.width, 10);
    const height = Number.parseInt(state.height, 10);
    const x = Number.parseInt(state.x, 10);
    const y = Number.parseInt(state.y, 10);

    return {
      width: Number.isFinite(width) ? Math.max(width, 900) : DEFAULT_WINDOW_BOUNDS.width,
      height: Number.isFinite(height) ? Math.max(height, 640) : DEFAULT_WINDOW_BOUNDS.height,
      x: Number.isFinite(x) ? x : undefined,
      y: Number.isFinite(y) ? y : undefined,
      maximized: state.maximized === true,
    };
  } catch {
    return {
      ...DEFAULT_WINDOW_BOUNDS,
      maximized: false,
    };
  }
}

function saveWindowState(window) {
  if (!window || window.isDestroyed()) {
    return;
  }

  try {
    const bounds = window.isMaximized() ? window.getNormalBounds() : window.getBounds();
    const state = {
      ...bounds,
      maximized: window.isMaximized(),
    };
    fs.mkdirSync(path.dirname(getWindowStatePath()), { recursive: true });
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2));
  } catch {
    // Window state is a convenience preference; failure should not block startup or shutdown.
  }
}

function getSenderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender) || null;
}

function sendMaximizedState(window) {
  if (!window || window.isDestroyed()) {
    return;
  }

  window.webContents.send(WINDOW_MAXIMIZED_CHANGED_CHANNEL, window.isMaximized());
}

function registerWindowIpc() {
  ipcMain.on("window:minimize", (event) => {
    getSenderWindow(event)?.minimize();
  });

  ipcMain.on("window:maximize", (event) => {
    const window = getSenderWindow(event);

    if (window && !window.isMaximized()) {
      window.maximize();
    }
  });

  ipcMain.on("window:restore", (event) => {
    const window = getSenderWindow(event);

    if (!window) {
      return;
    }

    if (window.isMinimized()) {
      window.restore();
      return;
    }

    if (window.isMaximized()) {
      window.unmaximize();
    }
  });

  ipcMain.on("window:close", (event) => {
    getSenderWindow(event)?.close();
  });

  ipcMain.handle("window:isMaximized", (event) => {
    return Boolean(getSenderWindow(event)?.isMaximized());
  });
}

function createWindow() {
  const windowState = readWindowState();
  let saveWindowStateTimer = null;
  const scheduleWindowStateSave = () => {
    clearTimeout(saveWindowStateTimer);
    saveWindowStateTimer = setTimeout(() => saveWindowState(window), 250);
  };
  const window = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 900,
    minHeight: 640,
    title: "AnxOS Control Center",
    icon: APP_ICON_PATH,
    backgroundColor: "#07020f",
    autoHideMenuBar: true,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    thickFrame: true,
    roundedCorners: true,
    backgroundMaterial: process.platform === "win32" ? "mica" : "auto",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => {
    if (windowState.maximized) {
      window.maximize();
    }
    window.show();
    sendMaximizedState(window);
  });
  window.on("maximize", () => {
    saveWindowState(window);
    sendMaximizedState(window);
  });
  window.on("unmaximize", () => {
    saveWindowState(window);
    sendMaximizedState(window);
  });
  window.on("resize", scheduleWindowStateSave);
  window.on("move", scheduleWindowStateSave);
  window.on("close", () => {
    clearTimeout(saveWindowStateTimer);
    saveWindowState(window);
  });

  window.loadFile(path.join(__dirname, "index.html"));

  if (process.env.ANXOS_OPEN_DEVTOOLS === "1" && app.isPackaged === false) {
    window.webContents.once("did-finish-load", () => {
      window.webContents.openDevTools({ mode: "detach" });
    });
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  window.webContents.on("context-menu", (_, params) => {
    const template = params.isEditable
      ? [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { type: "separator" },
          { role: "selectAll" },
        ]
      : [
          { role: "copy", enabled: Boolean(params.selectionText) },
          { type: "separator" },
          { role: "selectAll" },
        ];
    Menu.buildFromTemplate(template).popup({ window });
  });
}

app.whenReady().then(() => {
  logCurseForgeStartupStatus();
  ipcMain.handle("app:getRuntimeInfo", () => getRuntimeInfo());
  registerWindowIpc();
  registerUpdatesIpc();
  registerAccountAuthIpc();
  registerActionIpc();
  registerSystemIpc();
  registerAmpIpc();
  registerBackupsIpc();
  registerPlayitIpc();
  registerDockerIpc();
  registerInstancesIpc();
  registerMarketplaceIpc();
  registerNodesIpc();
  registerOwnerWorkspaceIpc();
  registerFilesIpc();
  registerSettingsIpc();
  registerSecurityIpc();
  registerSshIpc();
  createWindow();
  updateManager.start();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  updateManager.stop();
  disposeFilesIpc();
  disposeSshIpc();
});
