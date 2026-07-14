const fs = require("fs");
const os = require("os");
const path = require("path");
const asar = require("@electron/asar");

const EXECUTABLE_FILE_NAMES = new Set([
  "anxos-control-center",
  "chrome-sandbox",
  "chrome_crashpad_handler",
]);

function chmodSafe(filePath, mode) {
  try {
    fs.chmodSync(filePath, mode);
  } catch {}
}

function isExecutableFile(filePath, stats) {
  const name = path.basename(filePath);
  return EXECUTABLE_FILE_NAMES.has(name)
    || (stats.mode & 0o111) !== 0
    || /\.(?:AppImage|node|sh|so(?:\.\d+)*)$/i.test(name);
}

function normalizeTreePermissions(rootPath) {
  if (!rootPath || !fs.existsSync(rootPath)) {
    return;
  }
  const stats = fs.lstatSync(rootPath);
  if (stats.isSymbolicLink()) {
    return;
  }
  if (stats.isDirectory()) {
    chmodSafe(rootPath, 0o755);
    for (const entry of fs.readdirSync(rootPath)) {
      normalizeTreePermissions(path.join(rootPath, entry));
    }
    return;
  }
  if (stats.isFile()) {
    chmodSafe(rootPath, isExecutableFile(rootPath, stats) ? 0o755 : 0o644);
  }
}

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required package source is missing: ${source}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

async function ensureSharedSourcesInAsar(context = {}) {
  const appAsar = path.join(context.appOutDir || "", "resources", "app.asar");
  const sharedSource = path.join(context.packager?.projectDir || process.cwd(), "src", "shared");
  if (!fs.existsSync(appAsar)) {
    return;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-app-asar-"));
  try {
    asar.extractAll(appAsar, tempRoot);
    copyDirectory(sharedSource, path.join(tempRoot, "src", "shared"));
    fs.rmSync(appAsar, { force: true });
    await asar.createPackage(tempRoot, appAsar);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

exports.default = async function normalizePackagePermissions(context = {}) {
  await ensureSharedSourcesInAsar(context);
  if (context.electronPlatformName !== "linux") {
    return;
  }
  normalizeTreePermissions(context.appOutDir);
};
