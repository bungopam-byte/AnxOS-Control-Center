const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { execFileSync } = require("child_process");
const path = require("path");
const { registerActionIpc } = require("./src/ipc/actionIpc");
const { registerAmpIpc } = require("./src/ipc/ampIpc");
const { registerDockerIpc } = require("./src/ipc/dockerIpc");
const { disposeFilesIpc, registerFilesIpc } = require("./src/ipc/filesIpc");
const { registerPlayitIpc } = require("./src/ipc/playitIpc");
const { registerSettingsIpc } = require("./src/ipc/settingsIpc");
const { disposeSshIpc, registerSshIpc } = require("./src/ipc/sshIpc");
const { registerSystemIpc } = require("./src/ipc/systemIpc");

const APP_ICON_PATH = path.join(__dirname, "assets", "icon.ico");
const WINDOW_MAXIMIZED_CHANGED_CHANNEL = "window:maximized-changed";

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
  return {
    version: app.getVersion(),
    gitCommit: getGitCommit(),
    electron: process.versions.electron || null,
    node: process.versions.node || null,
    chromium: process.versions.chrome || null,
  };
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
  const window = new BrowserWindow({
    width: 1180,
    height: 820,
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
    window.show();
    sendMaximizedState(window);
  });
  window.on("maximize", () => sendMaximizedState(window));
  window.on("unmaximize", () => sendMaximizedState(window));

  window.loadFile(path.join(__dirname, "index.html"));

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
}

app.whenReady().then(() => {
  ipcMain.handle("app:getRuntimeInfo", () => getRuntimeInfo());
  registerWindowIpc();
  registerActionIpc();
  registerSystemIpc();
  registerAmpIpc();
  registerPlayitIpc();
  registerDockerIpc();
  registerFilesIpc();
  registerSettingsIpc();
  registerSshIpc();
  createWindow();

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
  disposeFilesIpc();
  disposeSshIpc();
});
