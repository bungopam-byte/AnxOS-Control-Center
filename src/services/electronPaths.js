const fs = require("fs");
const os = require("os");
const path = require("path");

const APP_DATA_NAME = "AnxHub";

function firstWritableBase(candidates) {
  return candidates.map((candidate) => String(candidate || "").trim()).find(Boolean) || os.tmpdir();
}

function resolveElectronPaths(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const appDataPath = options.appDataPath || env.APPDATA;
  const localAppDataPath = options.localAppDataPath || env.LOCALAPPDATA;
  const tempPath = options.tempPath || env.TEMP || env.TMP || os.tmpdir();
  const roamingBase = firstWritableBase([appDataPath, localAppDataPath, tempPath]);
  const cacheBase = platform === "win32"
    ? firstWritableBase([localAppDataPath, appDataPath, tempPath])
    : firstWritableBase([options.cachePath, localAppDataPath, appDataPath, tempPath]);
  const userData = path.join(roamingBase, APP_DATA_NAME);
  const cache = path.join(cacheBase, APP_DATA_NAME, "ElectronCache");

  return {
    userData,
    cache,
    mediaCache: path.join(cacheBase, APP_DATA_NAME, "MediaCache"),
    sessionData: path.join(cacheBase, APP_DATA_NAME, "SessionData"),
    logs: path.join(userData, "logs"),
    crashDumps: path.join(userData, "Crashpad"),
  };
}

function ensureWritableDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const probe = path.join(directory, `.write-test-${process.pid}-${Date.now()}`);
  fs.writeFileSync(probe, "");
  fs.rmSync(probe, { force: true });
  return directory;
}

function configureElectronPaths(app, options = {}) {
  const resolved = resolveElectronPaths({
    ...options,
    appDataPath: options.appDataPath || app.getPath("appData"),
    tempPath: options.tempPath || app.getPath("temp"),
  });
  const fallbackBase = path.join(options.tempPath || app.getPath("temp"), APP_DATA_NAME);

  const writable = {};
  for (const [key, directory] of Object.entries(resolved)) {
    try {
      writable[key] = ensureWritableDirectory(directory);
    } catch {
      writable[key] = ensureWritableDirectory(path.join(fallbackBase, key));
    }
  }

  app.setPath("userData", writable.userData);
  app.setPath("cache", writable.cache);
  app.setPath("logs", writable.logs);
  app.setPath("crashDumps", writable.crashDumps);
  app.commandLine.appendSwitch("user-data-dir", writable.userData);
  app.commandLine.appendSwitch("disk-cache-dir", writable.cache);
  app.commandLine.appendSwitch("media-cache-dir", writable.mediaCache);
  try {
    app.setPath("sessionData", writable.sessionData);
  } catch {
    // Older Electron builds may not expose sessionData; cache still points at a per-user directory.
  }

  return writable;
}

module.exports = {
  APP_DATA_NAME,
  configureElectronPaths,
  ensureWritableDirectory,
  resolveElectronPaths,
};
