const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");

const DEFAULT_TEXT_READ_LIMIT_BYTES = 1024 * 1024;
const BINARY_SAMPLE_BYTES = 4096;
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getConfiguredRoots() {
  const rawRoots = process.env.AGENT_FILE_ROOTS
    ? process.env.AGENT_FILE_ROOTS.split(path.delimiter)
    : [process.cwd()];

  return unique(rawRoots.map((root) => root.trim()).filter(Boolean));
}

async function getAllowedRoots() {
  const roots = [];

  for (const root of getConfiguredRoots()) {
    try {
      roots.push(await fsPromises.realpath(path.resolve(root)));
    } catch {
      continue;
    }
  }

  return unique(roots);
}

function isInsideRoot(filePath, root) {
  const relative = path.relative(root, filePath);
  return relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function createFileError(code, statusCode = 400) {
  return Object.assign(new Error(code), { code, statusCode });
}

async function resolveAllowedPath(requestedPath) {
  if (!requestedPath) {
    throw createFileError("PATH_REQUIRED");
  }

  if (requestedPath.includes("\0")) {
    throw createFileError("INVALID_PATH");
  }

  const resolvedPath = path.resolve(requestedPath);
  const allowedRoots = await getAllowedRoots();

  if (allowedRoots.length === 0) {
    throw createFileError("NO_ALLOWED_ROOTS", 403);
  }

  const rootMatch = allowedRoots.find((root) => isInsideRoot(resolvedPath, root));

  if (!rootMatch) {
    throw createFileError("PATH_NOT_ALLOWED", 403);
  }

  let realPath;

  try {
    realPath = await fsPromises.realpath(resolvedPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw createFileError("PATH_NOT_FOUND", 404);
    }

    throw createFileError("PATH_UNAVAILABLE", 400);
  }

  if (!isInsideRoot(realPath, rootMatch)) {
    throw createFileError("PATH_NOT_ALLOWED", 403);
  }

  return {
    path: realPath,
    root: rootMatch,
  };
}

function getFileType(stats) {
  if (stats.isDirectory()) {
    return "directory";
  }

  if (stats.isFile()) {
    return "file";
  }

  if (stats.isSymbolicLink()) {
    return "symlink";
  }

  return "other";
}

function normalizeMetadata(filePath, stats) {
  return {
    name: path.basename(filePath),
    type: getFileType(stats),
    size: stats.size,
    modified: stats.mtime.toISOString(),
  };
}

async function statResolvedPath(resolvedPath) {
  const stats = await fsPromises.stat(resolvedPath.path);

  return {
    path: resolvedPath.path,
    root: resolvedPath.root,
    ...normalizeMetadata(resolvedPath.path, stats),
  };
}

async function statPath(requestedPath) {
  return statResolvedPath(await resolveAllowedPath(requestedPath));
}

async function listFiles(requestedPath) {
  const resolvedPath = await resolveAllowedPath(requestedPath);
  const stats = await fsPromises.stat(resolvedPath.path);

  if (!stats.isDirectory()) {
    throw createFileError("PATH_NOT_DIRECTORY", 400);
  }

  const entries = await fsPromises.readdir(resolvedPath.path, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(resolvedPath.path, entry.name);

    try {
      const entryStats = await fsPromises.stat(entryPath);
      return {
        path: entryPath,
        ...normalizeMetadata(entryPath, entryStats),
      };
    } catch {
      return {
        name: entry.name,
        type: entry.isDirectory() ? "directory" : "other",
        size: null,
        modified: null,
      };
    }
  }));

  return {
    path: resolvedPath.path,
    root: resolvedPath.root,
    entries: files.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "directory" ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    }),
  };
}

function hasBinaryBytes(buffer) {
  return buffer.includes(0);
}

async function isTextFile(filePath) {
  const handle = await fsPromises.open(filePath, "r");

  try {
    const buffer = Buffer.alloc(BINARY_SAMPLE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, BINARY_SAMPLE_BYTES, 0);
    const sample = buffer.subarray(0, bytesRead);

    if (hasBinaryBytes(sample)) {
      return false;
    }

    TEXT_DECODER.decode(sample);
    return true;
  } catch {
    return false;
  } finally {
    await handle.close();
  }
}

async function readTextFile(requestedPath) {
  const resolvedPath = await resolveAllowedPath(requestedPath);
  const stats = await fsPromises.stat(resolvedPath.path);

  if (!stats.isFile()) {
    throw createFileError("PATH_NOT_FILE", 400);
  }

  if (stats.size > DEFAULT_TEXT_READ_LIMIT_BYTES) {
    return {
      path: resolvedPath.path,
      root: resolvedPath.root,
      ...normalizeMetadata(resolvedPath.path, stats),
      supported: false,
      reason: "file_too_large",
      content: null,
    };
  }

  if (!(await isTextFile(resolvedPath.path))) {
    return {
      path: resolvedPath.path,
      root: resolvedPath.root,
      ...normalizeMetadata(resolvedPath.path, stats),
      supported: false,
      reason: "binary_unsupported",
      content: null,
    };
  }

  return {
    path: resolvedPath.path,
    root: resolvedPath.root,
    ...normalizeMetadata(resolvedPath.path, stats),
    supported: true,
    content: await fsPromises.readFile(resolvedPath.path, "utf8"),
  };
}

async function createFileDownload(requestedPath) {
  const resolvedPath = await resolveAllowedPath(requestedPath);
  const stats = await fsPromises.stat(resolvedPath.path);

  if (!stats.isFile()) {
    throw createFileError("PATH_NOT_FILE", 400);
  }

  return {
    path: resolvedPath.path,
    root: resolvedPath.root,
    name: path.basename(resolvedPath.path),
    size: stats.size,
    modified: stats.mtime.toISOString(),
    stream: fs.createReadStream(resolvedPath.path),
  };
}

module.exports = {
  createFileDownload,
  listFiles,
  readTextFile,
  statPath,
};
