const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
const path = require("path");
const { getConfig } = require("../config");

const DEFAULT_TEXT_READ_LIMIT_BYTES = 1024 * 1024;
const BINARY_SAMPLE_BYTES = 4096;
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });
const RESTART_REQUIRED_SKEW_MS = 1000;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function createFileError(code, statusCode = 400, message = null, details = {}) {
  return Object.assign(new Error(message || code), {
    code,
    statusCode,
    details: {
      code,
      field: details.field || null,
      value: details.value || null,
      expected: details.expected || null,
      suggestion: details.suggestion || null,
      ...details,
    },
  });
}

function getRuntimeConfigSources() {
  return [
    process.env.ANXOS_AGENT_RUNTIME_CONFIG
      ? { type: "environment-file", path: process.env.ANXOS_AGENT_RUNTIME_CONFIG }
      : null,
    process.env.ANXHUB_CONFIG_DIR
      ? { type: "config-directory", path: path.join(process.env.ANXHUB_CONFIG_DIR, "agent-runtime.json") }
      : null,
  ].filter(Boolean);
}

function getConfigurationRestartStatus() {
  const processStartedAt = Date.now() - (process.uptime() * 1000);
  const changedSources = [];

  for (const source of getRuntimeConfigSources()) {
    try {
      const stats = fs.statSync(source.path);
      if (stats.mtimeMs > processStartedAt + RESTART_REQUIRED_SKEW_MS) {
        changedSources.push({
          type: source.type,
          changedAt: stats.mtime.toISOString(),
        });
      }
    } catch {
      // Missing config files are reported by the root status, not restart status.
    }
  }

  return {
    restartRequired: changedSources.length > 0,
    changedSources,
  };
}

function getConfiguredRootEntries() {
  const config = getConfig();
  const homeDirectory = os.homedir() || process.cwd();
  let source = "default-home";
  let rawRoots = [homeDirectory];

  if (Object.prototype.hasOwnProperty.call(process.env, "AGENT_FILE_ROOTS")) {
    source = "environment";
    rawRoots = String(process.env.AGENT_FILE_ROOTS || "").split(path.delimiter);
  } else if (config.allowedFolders.length) {
    source = "runtime-config";
    rawRoots = config.allowedFolders;
  }

  return rawRoots.map((root, index) => ({
    rawValue: String(root ?? ""),
    index,
    source,
  }));
}

function expandConfiguredRoot(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (trimmed === "~") {
    return os.homedir() || "";
  }
  if (trimmed.startsWith(`~${path.sep}`)) {
    return path.join(os.homedir() || "", trimmed.slice(2));
  }
  return trimmed;
}

function createRootStatus(code, message, entry, extra = {}) {
  return {
    configuredValue: entry?.rawValue || "",
    source: entry?.source || "unknown",
    index: entry?.index ?? 0,
    status: code,
    code,
    message,
    exists: false,
    readable: false,
    isDirectory: false,
    normalizedPath: null,
    realPath: null,
    ...extra,
  };
}

async function validateConfiguredRoot(entry) {
  const expanded = expandConfiguredRoot(entry.rawValue);

  if (!String(entry.rawValue || "").trim()) {
    return createRootStatus(
      "FILESYSTEM_ROOT_EMPTY",
      "The Agent filesystem root is empty.",
      entry,
      {
        field: "filesystemRoot",
        suggestion: "Set AGENT_FILE_ROOTS or allowedFolders to an absolute directory and restart the Agent.",
      },
    );
  }

  if (expanded.includes("\0") || !path.isAbsolute(expanded)) {
    return createRootStatus(
      "FILESYSTEM_ROOT_INVALID",
      "The Agent filesystem root must be an absolute path.",
      entry,
      {
        field: "filesystemRoot",
        normalizedPath: expanded || null,
        suggestion: "Configure an absolute filesystem root such as /home/anx or /srv/files and restart the Agent.",
      },
    );
  }

  const normalizedPath = path.normalize(expanded);

  let realPath;
  try {
    realPath = await fsPromises.realpath(normalizedPath);
  } catch (error) {
    return createRootStatus(
      error?.code === "ENOENT" ? "FILESYSTEM_ROOT_MISSING" : "FILESYSTEM_ROOT_INVALID",
      error?.code === "ENOENT"
        ? "The configured Agent filesystem root does not exist."
        : "The configured Agent filesystem root could not be resolved.",
      entry,
      {
        field: "filesystemRoot",
        normalizedPath,
        errorCode: error?.code || null,
        suggestion: "Create the configured directory or update the Agent filesystem root, then restart the Agent.",
      },
    );
  }

  let stats;
  try {
    stats = await fsPromises.stat(realPath);
  } catch (error) {
    return createRootStatus(
      "FILESYSTEM_ROOT_INVALID",
      "The configured Agent filesystem root could not be inspected.",
      entry,
      {
        field: "filesystemRoot",
        exists: true,
        normalizedPath,
        realPath,
        errorCode: error?.code || null,
        suggestion: "Check the configured root permissions and restart the Agent after fixing configuration.",
      },
    );
  }

  if (!stats.isDirectory()) {
    return createRootStatus(
      "FILESYSTEM_ROOT_INVALID",
      "The configured Agent filesystem root is not a directory.",
      entry,
      {
        field: "filesystemRoot",
        exists: true,
        normalizedPath,
        realPath,
        suggestion: "Configure the Agent filesystem root to an existing directory.",
      },
    );
  }

  try {
    await fsPromises.access(realPath, fs.constants.R_OK | fs.constants.X_OK);
  } catch (error) {
    return createRootStatus(
      "FILESYSTEM_ROOT_UNREADABLE",
      "The configured Agent filesystem root is not readable by the Agent process.",
      entry,
      {
        field: "filesystemRoot",
        exists: true,
        isDirectory: true,
        normalizedPath,
        realPath,
        errorCode: error?.code || null,
        suggestion: "Grant the Agent process user read and execute access to the configured root, or choose a readable root.",
      },
    );
  }

  return createRootStatus(
    "valid",
    "The configured Agent filesystem root is valid.",
    entry,
    {
      exists: true,
      readable: true,
      isDirectory: true,
      normalizedPath,
      realPath,
    },
  );
}

async function getRootValidationReport() {
  const rootStatuses = await Promise.all(getConfiguredRootEntries().map(validateConfiguredRoot));
  const validRoots = unique(rootStatuses
    .filter((rootStatus) => rootStatus.status === "valid" && rootStatus.realPath)
    .map((rootStatus) => rootStatus.realPath));
  const effectiveRoot = validRoots[0] || null;
  const primaryStatus = rootStatuses.find((rootStatus) => rootStatus.status === "valid") || rootStatuses[0] || null;
  const restartStatus = getConfigurationRestartStatus();

  return {
    validRoots,
    effectiveRoot,
    primaryStatus,
    rootStatuses,
    configSourceType: primaryStatus?.source || "unknown",
    restartRequired: restartStatus.restartRequired,
    changedSources: restartStatus.changedSources,
  };
}

async function getAllowedRoots() {
  return (await getRootValidationReport()).validRoots;
}

async function getFilesystemIdentity() {
  const homeDirectory = os.homedir() || process.cwd();
  const rootReport = await getRootValidationReport();
  const homeRealPath = await fsPromises.realpath(homeDirectory).catch(() => null);
  const homeInsideRoot = Boolean(homeRealPath && rootReport.validRoots.some((root) => isInsideRoot(homeRealPath, root)));
  const rootIsUsable = Boolean(rootReport.effectiveRoot && rootReport.primaryStatus?.status === "valid" && rootReport.primaryStatus.readable);
  const initialPath = homeInsideRoot ? homeRealPath : rootIsUsable ? rootReport.effectiveRoot : null;

  return {
    platform: process.platform,
    hostname: os.hostname(),
    homeDirectory,
    rootPath: rootReport.effectiveRoot || path.parse(homeDirectory).root || path.sep,
    filesystemRoot: rootReport.effectiveRoot,
    filesystemRootStatus: rootReport.primaryStatus || null,
    filesystemRoots: rootReport.rootStatuses,
    filesystemRootExists: Boolean(rootReport.primaryStatus?.exists),
    filesystemRootReadable: Boolean(rootReport.primaryStatus?.readable),
    homeInsideFilesystemRoot: homeInsideRoot,
    initialPath,
    pathSeparator: path.sep,
    roots: rootReport.validRoots,
    configSourceType: rootReport.configSourceType,
    restartRequired: rootReport.restartRequired,
  };
}

function isInsideRoot(filePath, root) {
  const relative = path.relative(root, filePath);
  return relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function throwRootConfigurationError(rootReport) {
  const status = rootReport.primaryStatus || {
    code: "FILESYSTEM_ROOT_INVALID",
    message: "The Agent filesystem root is not valid.",
  };
  throw createFileError(status.code || "FILESYSTEM_ROOT_INVALID", 403, status.message, {
    field: status.field || "filesystemRoot",
    value: status.configuredValue || null,
    normalizedPath: status.normalizedPath || null,
    realPath: status.realPath || null,
    configSourceType: status.source || rootReport.configSourceType || "unknown",
    rootExists: Boolean(status.exists),
    rootReadable: Boolean(status.readable),
    restartRequired: Boolean(rootReport.restartRequired),
    suggestion: status.suggestion || "Fix the Agent filesystem root configuration and restart the Agent.",
  });
}

async function resolveAllowedPath(requestedPath) {
  if (!requestedPath) {
    throw createFileError("PATH_REQUIRED", 400, "A filesystem path is required.", {
      field: "path",
      suggestion: "Choose a folder inside the configured Agent filesystem root.",
    });
  }

  if (requestedPath.includes("\0")) {
    throw createFileError("INVALID_PATH", 400, "The requested path is malformed.", {
      field: "path",
      value: requestedPath,
      expected: "A path without null bytes.",
    });
  }

  const resolvedPath = path.resolve(requestedPath);
  const rootReport = await getRootValidationReport();
  const allowedRoots = rootReport.validRoots;

  if (allowedRoots.length === 0) {
    throwRootConfigurationError(rootReport);
  }

  const rootMatch = allowedRoots.find((root) => isInsideRoot(resolvedPath, root));

  if (!rootMatch) {
    throw createFileError("PATH_NOT_ALLOWED", 403, "The requested path is outside the configured Agent filesystem root.", {
      field: "path",
      value: requestedPath,
      requestedPath: resolvedPath,
      filesystemRoot: rootReport.effectiveRoot,
      configSourceType: rootReport.configSourceType,
      suggestion: "Select a path inside the configured Agent filesystem root.",
    });
  }

  let realPath;

  try {
    realPath = await fsPromises.realpath(resolvedPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw createFileError("PATH_NOT_FOUND", 404, "The requested path does not exist.", {
        field: "path",
        value: requestedPath,
        requestedPath: resolvedPath,
        filesystemRoot: rootMatch,
        suggestion: "Refresh the folder or choose an existing path inside the configured root.",
      });
    }

    if (error?.code === "EACCES" || error?.code === "EPERM") {
      throw createFileError("PATH_UNREADABLE", 403, "The requested path is not readable by the Agent process.", {
        field: "path",
        value: requestedPath,
        requestedPath: resolvedPath,
        filesystemRoot: rootMatch,
        errorCode: error?.code || null,
        suggestion: "Grant the Agent process user permission to read that path or choose another folder.",
      });
    }

    throw createFileError("REALPATH_FAILED", 400, "The requested path could not be resolved safely.", {
      field: "path",
      value: requestedPath,
      requestedPath: resolvedPath,
      filesystemRoot: rootMatch,
      errorCode: error?.code || null,
      suggestion: "Check whether the path still exists and is accessible, then retry.",
    });
  }

  if (!isInsideRoot(realPath, rootMatch)) {
    throw createFileError("PATH_NOT_ALLOWED", 403, "The requested path resolves outside the configured Agent filesystem root.", {
      field: "path",
      value: requestedPath,
      requestedPath: resolvedPath,
      resolvedRealPath: realPath,
      filesystemRoot: rootMatch,
      suggestion: "Choose a path that does not leave the configured root through a symbolic link.",
    });
  }

  return {
    path: realPath,
    root: rootMatch,
  };
}

async function resolveAllowedTargetPath(requestedPath) {
  if (!requestedPath || requestedPath.includes("\0")) {
    throw createFileError("INVALID_PATH", 400, "The target path is malformed.", {
      field: "path",
      value: requestedPath || "",
      expected: "A non-empty path without null bytes.",
    });
  }
  const targetPath = path.resolve(requestedPath);
  const parent = await resolveAllowedPath(path.dirname(targetPath));
  if (!isInsideRoot(targetPath, parent.root)) {
    throw createFileError("PATH_NOT_ALLOWED", 403, "The target path is outside the configured Agent filesystem root.", {
      field: "path",
      value: requestedPath,
      filesystemRoot: parent.root,
    });
  }
  return { path: targetPath, root: parent.root };
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

async function mutateFile(action, payload = {}) {
  if (action === "write" || action === "newFile") {
    const target = await resolveAllowedTargetPath(payload.path);
    await fsPromises.writeFile(target.path, String(payload.content || ""), "utf8");
    return { path: target.path, saved: true };
  }
  if (action === "mkdir") {
    const target = await resolveAllowedTargetPath(payload.path);
    await fsPromises.mkdir(target.path, { recursive: false });
    return { path: target.path, created: true };
  }
  if (action === "rename" || action === "copy") {
    const source = await resolveAllowedPath(payload.sourcePath || payload.oldPath);
    const destination = await resolveAllowedTargetPath(payload.destinationPath || payload.newPath);
    if (action === "rename") await fsPromises.rename(source.path, destination.path);
    else await fsPromises.cp(source.path, destination.path, { recursive: true, errorOnExist: false });
    return action === "rename"
      ? { oldPath: source.path, newPath: destination.path, renamed: true }
      : { sourcePath: source.path, destinationPath: destination.path, copied: true };
  }
  if (action === "delete") {
    const target = await resolveAllowedPath(payload.path);
    if (target.path === target.root) {
      throw createFileError("ROOT_DELETE_FORBIDDEN", 403, "Configured filesystem roots cannot be deleted through the file browser.", {
        field: "path",
        value: payload.path,
        filesystemRoot: target.root,
      });
    }
    await fsPromises.rm(target.path, { recursive: true, force: false });
    return { path: target.path, deleted: true };
  }
  if (action === "upload") {
    const target = await resolveAllowedTargetPath(payload.path);
    await fsPromises.writeFile(target.path, Buffer.from(String(payload.content || ""), "base64"));
    return { path: target.path, uploaded: true };
  }
  throw createFileError("UNSUPPORTED_FILE_ACTION", 400);
}

module.exports = {
  createFileDownload,
  getFilesystemIdentity,
  getRootValidationReport,
  isInsideRoot,
  listFiles,
  mutateFile,
  readTextFile,
  resolveAllowedPath,
  statPath,
};
