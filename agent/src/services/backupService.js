const fs = require("fs/promises");
const path = require("path");

const BACKUP_EXTENSIONS = [
  ".zip",
  ".tar",
  ".tar.gz",
  ".tgz",
  ".tar.bz2",
  ".tbz2",
  ".tar.xz",
  ".txz",
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getConfiguredRoots() {
  if (!process.env.AGENT_BACKUP_ROOTS) {
    return [];
  }

  return unique(
    process.env.AGENT_BACKUP_ROOTS
      .split(path.delimiter)
      .map((root) => root.trim())
      .filter(Boolean),
  );
}

function isInsideRoot(filePath, root) {
  const relative = path.relative(root, filePath);
  return relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function getBackupType(filePath, stats) {
  if (stats.isDirectory()) {
    return "folder";
  }

  const lowerName = path.basename(filePath).toLowerCase();

  if (lowerName.endsWith(".zip")) {
    return "zip";
  }

  if (BACKUP_EXTENSIONS.some((extension) => lowerName.endsWith(extension)) && !lowerName.endsWith(".zip")) {
    return "tar";
  }

  return null;
}

async function getDirectorySize(dirPath, root) {
  let total = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    let realPath;
    let stats;

    try {
      realPath = await fs.realpath(entryPath);

      if (!isInsideRoot(realPath, root)) {
        continue;
      }

      stats = await fs.stat(realPath);
    } catch {
      continue;
    }

    if (stats.isDirectory()) {
      total += await getDirectorySize(realPath, root);
    } else if (stats.isFile()) {
      total += stats.size;
    }
  }

  return total;
}

async function normalizeBackup(filePath, root) {
  const realPath = await fs.realpath(filePath);

  if (!isInsideRoot(realPath, root)) {
    return null;
  }

  const stats = await fs.stat(realPath);
  const type = getBackupType(realPath, stats);

  if (!type) {
    return null;
  }

  return {
    name: path.basename(realPath),
    path: realPath,
    size: stats.isDirectory() ? await getDirectorySize(realPath, root) : stats.size,
    modified: stats.mtime.toISOString(),
    type,
  };
}

async function resolveRoots() {
  const roots = [];
  const diagnostics = [];

  for (const configuredRoot of getConfiguredRoots()) {
    const resolvedRoot = path.resolve(configuredRoot);

    try {
      const realRoot = await fs.realpath(resolvedRoot);
      const stats = await fs.stat(realRoot);
      const ok = stats.isDirectory();

      diagnostics.push({
        path: configuredRoot,
        resolvedPath: realRoot,
        ok,
        errorCode: ok ? null : "ROOT_NOT_DIRECTORY",
      });

      if (ok) {
        roots.push(realRoot);
      }
    } catch (error) {
      diagnostics.push({
        path: configuredRoot,
        resolvedPath: resolvedRoot,
        ok: false,
        errorCode: error?.code || "ROOT_UNAVAILABLE",
      });
    }
  }

  return {
    roots: unique(roots),
    diagnostics,
  };
}

async function scanRoot(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const backups = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);

    try {
      const backup = await normalizeBackup(entryPath, root);

      if (backup) {
        backups.push(backup);
      }
    } catch {
      continue;
    }
  }

  return backups;
}

async function listBackups() {
  const { roots, diagnostics } = await resolveRoots();
  const backups = [];

  for (const root of roots) {
    backups.push(...await scanRoot(root));
  }

  backups.sort((left, right) => new Date(right.modified).getTime() - new Date(left.modified).getTime());

  return {
    roots,
    backups,
    summary: {
      totalBackups: backups.length,
      totalSize: backups.reduce((total, backup) => total + backup.size, 0),
    },
    diagnostics: {
      roots: diagnostics,
    },
  };
}

module.exports = {
  listBackups,
};
