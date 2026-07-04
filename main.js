const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { execFileSync } = require("child_process");
const path = require("path");
const { registerAmpIpc } = require("./src/ipc/ampIpc");
const { registerSystemIpc } = require("./src/ipc/systemIpc");

const APP_ICON_PATH = path.join(__dirname, "src", "assets", "anxhub-icon.svg");

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

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: "AnxHub",
    icon: APP_ICON_PATH,
    backgroundColor: "#080a0f",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

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
  registerSystemIpc();
  registerAmpIpc();
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
