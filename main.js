const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const { execFileSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { registerActionIpc } = require("./src/ipc/actionIpc");
const { registerAmpIpc } = require("./src/ipc/ampIpc");
const { registerBackupsIpc } = require("./src/ipc/backupsIpc");
const { registerDockerIpc } = require("./src/ipc/dockerIpc");
const { disposeFilesIpc, registerFilesIpc } = require("./src/ipc/filesIpc");
const { registerInstancesIpc } = require("./src/ipc/instancesIpc");
const { registerMarketplaceIpc } = require("./src/ipc/marketplaceIpc");
const { registerNodesIpc } = require("./src/ipc/nodesIpc");
const { registerPlayitIpc } = require("./src/ipc/playitIpc");
const { registerSecurityIpc } = require("./src/ipc/securityIpc");
const { registerSettingsIpc } = require("./src/ipc/settingsIpc");
const { disposeSshIpc, registerSshIpc } = require("./src/ipc/sshIpc");
const { registerSystemIpc } = require("./src/ipc/systemIpc");
const { logStartupStatus: logCurseForgeStartupStatus } = require("./src/services/providers/curseforgeProvider");

const APP_ICON_PATH = path.join(__dirname, "assets", "icon.ico");
const WINDOW_MAXIMIZED_CHANGED_CHANNEL = "window:maximized-changed";
const UPDATE_STATUS_CHANNEL = "updates:status";
const UPDATE_REPOSITORY = "bungopam-byte/AnxOS-Control-Center";
const UPDATE_RELEASES_URL = `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`;
const UPDATE_MANIFEST_URLS = [
  process.env.ANXHUB_UPDATE_MANIFEST_URL,
  "http://192.168.1.134:8766/update-manifest.json",
].filter(Boolean);
const DEFAULT_WINDOW_BOUNDS = {
  width: 1180,
  height: 820,
};
const updateState = {
  latest: null,
  downloadedPath: null,
  downloadInFlight: false,
};

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

function normalizeVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v/i, "")
    .split(/[+-]/)[0];
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersion(right).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

function sanitizeFileName(value) {
  return String(value || "AnxOS-Control-Center-update.exe").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}

function getRequestModule(url) {
  return String(url || "").startsWith("http://") ? http : https;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = getRequestModule(url).get(
      url,
      {
        headers: {
          "Accept": "application/vnd.github+json",
          "User-Agent": `AnxOS-Control-Center/${app.getVersion()}`,
        },
      },
      (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          response.resume();
          requestJson(response.headers.location).then(resolve, reject);
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(`Update metadata request failed with HTTP ${response.statusCode}: ${body.slice(0, 240)}`);
            error.statusCode = response.statusCode;
            reject(error);
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(new Error(`Update metadata response was not valid JSON: ${error.message}`));
          }
        });
      },
    );

    request.setTimeout(15000, () => {
      request.destroy(new Error("Update metadata request timed out."));
    });
    request.on("error", reject);
  });
}

function normalizeManifestAsset(asset) {
  const downloadUrl = asset?.browser_download_url || asset?.downloadUrl || asset?.url;

  if (!downloadUrl) {
    return null;
  }

  return {
    name: asset.name || path.basename(new URL(downloadUrl).pathname) || "AnxOS-Control-Center-update",
    size: Number(asset.size || 0),
    browser_download_url: downloadUrl,
  };
}

function normalizeManifestRelease(manifest, sourceUrl) {
  const rawAssets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const assets = rawAssets.map(normalizeManifestAsset).filter(Boolean);
  const latestVersion = normalizeVersion(manifest?.version || manifest?.tag_name || manifest?.name);

  return {
    tag_name: latestVersion ? `v${latestVersion}` : null,
    name: manifest?.name || (latestVersion ? `v${latestVersion}` : "AnxHub update"),
    html_url: manifest?.html_url || manifest?.releaseUrl || sourceUrl,
    published_at: manifest?.published_at || manifest?.publishedAt || null,
    assets,
  };
}

function pickUpdateAsset(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const viableAssets = assets.filter((asset) => {
    const name = String(asset?.name || "").toLowerCase();
    const downloadUrl = String(asset?.browser_download_url || "");
    const size = Number(asset?.size || 0);

    return downloadUrl && size > 5 * 1024 * 1024 && (name.endsWith(".exe") || name.endsWith(".zip") || name.endsWith(".appimage") || name.endsWith(".deb"));
  });

  const platformMatchers = process.platform === "win32"
    ? [/setup.*\.exe$/i, /installer.*\.exe$/i, /control-center-setup.*\.exe$/i, /portable.*\.exe$/i, /win.*\.exe$/i, /\.exe$/i]
    : process.platform === "linux"
      ? [/\.deb$/i, /\.appimage$/i]
      : [/\.dmg$/i, /\.zip$/i];

  for (const matcher of platformMatchers) {
    const match = viableAssets.find((asset) => matcher.test(asset.name || ""));

    if (match) {
      return match;
    }
  }

  return viableAssets[0] || null;
}

async function checkForUpdates(options = {}) {
  const checkedSources = [];

  try {
    checkedSources.push(UPDATE_RELEASES_URL);
    const release = await requestJson(UPDATE_RELEASES_URL);
    return resolveUpdateResult(release, UPDATE_RELEASES_URL);
  } catch (error) {
    if (error?.statusCode !== 404) {
      console.error("[Updates] GitHub release check failed.", {
        message: error?.message || String(error),
        stack: error?.stack || null,
        url: UPDATE_RELEASES_URL,
        silent: Boolean(options.silent),
      });
    } else {
      console.warn("[Updates] No public GitHub release is available yet.", {
        url: UPDATE_RELEASES_URL,
        silent: Boolean(options.silent),
      });
    }
  }

  for (const manifestUrl of UPDATE_MANIFEST_URLS) {
    try {
      checkedSources.push(manifestUrl);
      const manifest = await requestJson(manifestUrl);
      return resolveUpdateResult(normalizeManifestRelease(manifest, manifestUrl), manifestUrl);
    } catch (error) {
      console.warn("[Updates] Update manifest check failed.", {
        message: error?.message || String(error),
        stack: error?.stack || null,
        url: manifestUrl,
        silent: Boolean(options.silent),
      });
    }
  }

  return {
    hasUpdate: false,
    releaseUnavailable: true,
    message: "No update release is published yet.",
    checkedSources,
  };
}

function resolveUpdateResult(release, sourceUrl) {
  const latestVersion = normalizeVersion(release?.tag_name || release?.name);
  const currentVersion = normalizeVersion(app.getVersion());
  const asset = pickUpdateAsset(release);
  const hasUpdate = Boolean(latestVersion && compareVersions(latestVersion, currentVersion) > 0 && asset);

  const result = {
    hasUpdate,
    currentVersion,
    latestVersion: latestVersion || null,
    releaseName: release?.name || release?.tag_name || null,
    releaseUrl: release?.html_url || sourceUrl || `https://github.com/${UPDATE_REPOSITORY}/releases`,
    publishedAt: release?.published_at || null,
    sourceUrl,
    asset: asset
      ? {
          name: asset.name,
          size: asset.size,
          downloadUrl: asset.browser_download_url,
        }
      : null,
  };

  updateState.latest = result;

  if (hasUpdate) {
    sendUpdateStatus({ type: "available", update: result });
  }

  return result;
}

function sendUpdateStatus(payload) {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(UPDATE_STATUS_CHANNEL, payload);
    }
  });
}

function downloadFile(url, destinationPath, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects while downloading update."));
      return;
    }

    const request = getRequestModule(url).get(
      url,
      {
        headers: {
          "User-Agent": `AnxOS-Control-Center/${app.getVersion()}`,
        },
      },
      (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
          response.resume();
          downloadFile(response.headers.location, destinationPath, onProgress, redirectCount + 1).then(resolve, reject);
          return;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          response.resume();
          reject(new Error(`Update download failed with HTTP ${response.statusCode}.`));
          return;
        }

        const totalBytes = Number.parseInt(response.headers["content-length"], 10) || 0;
        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destinationPath, { mode: 0o600 });

        response.on("data", (chunk) => {
          receivedBytes += chunk.length;
          onProgress?.({
            receivedBytes,
            totalBytes,
            percent: totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : null,
          });
        });

        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close(() => resolve(destinationPath));
        });
        fileStream.on("error", (error) => {
          fs.rm(destinationPath, { force: true }, () => reject(error));
        });
      },
    );

    request.setTimeout(120000, () => {
      request.destroy(new Error("Update download timed out."));
    });
    request.on("error", reject);
  });
}

async function downloadLatestUpdate() {
  if (updateState.downloadInFlight) {
    return { downloading: true };
  }

  const update = updateState.latest?.hasUpdate ? updateState.latest : await checkForUpdates({ silent: false });

  if (!update?.hasUpdate || !update.asset?.downloadUrl) {
    return { downloaded: false, message: "No update is available." };
  }

  updateState.downloadInFlight = true;
  updateState.downloadedPath = null;
  const destinationPath = path.join(app.getPath("downloads"), sanitizeFileName(update.asset.name));
  sendUpdateStatus({ type: "download-started", update, path: destinationPath });

  try {
    const downloadedPath = await downloadFile(update.asset.downloadUrl, destinationPath, (progress) => {
      sendUpdateStatus({ type: "download-progress", progress });
    });
    updateState.downloadedPath = downloadedPath;
    sendUpdateStatus({ type: "downloaded", update, path: downloadedPath });
    return { downloaded: true, path: downloadedPath, update };
  } catch (error) {
    console.error("[Updates] Download failed.", {
      message: error?.message || String(error),
      stack: error?.stack || null,
      asset: update.asset?.name || null,
      url: update.asset?.downloadUrl || null,
    });
    sendUpdateStatus({ type: "download-error", message: "Update download failed." });
    return { downloaded: false, error: error?.message || "Update download failed." };
  } finally {
    updateState.downloadInFlight = false;
  }
}

function registerUpdatesIpc() {
  ipcMain.handle("updates:check", (_, options = {}) => checkForUpdates(options));
  ipcMain.handle("updates:download", () => downloadLatestUpdate());
  ipcMain.handle("updates:open-downloaded", async () => {
    if (!updateState.downloadedPath) {
      return { opened: false, message: "No downloaded update is ready." };
    }

    await shell.openPath(updateState.downloadedPath);
    return { opened: true };
  });
  ipcMain.handle("updates:open-release", async () => {
    const releaseUrl = updateState.latest?.releaseUrl || `https://github.com/${UPDATE_REPOSITORY}/releases/latest`;
    await shell.openExternal(releaseUrl);
    return { opened: true };
  });
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
  registerActionIpc();
  registerSystemIpc();
  registerAmpIpc();
  registerBackupsIpc();
  registerPlayitIpc();
  registerDockerIpc();
  registerInstancesIpc();
  registerMarketplaceIpc();
  registerNodesIpc();
  registerFilesIpc();
  registerSettingsIpc();
  registerSecurityIpc();
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
