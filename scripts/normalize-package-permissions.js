const fs = require("fs");
const path = require("path");

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

exports.default = async function normalizePackagePermissions(context = {}) {
  if (context.electronPlatformName !== "linux") {
    return;
  }
  normalizeTreePermissions(context.appOutDir);
};

