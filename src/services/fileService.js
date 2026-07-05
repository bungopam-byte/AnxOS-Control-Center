const fs = require("fs");
const path = require("path");
const { BrowserWindow, dialog } = require("electron");
const { Client } = require("ssh2");
const { SshService, SshServiceError } = require("./sshService");

const posixPath = path.posix;
const PROTECTED_REMOTE_PATHS = ["/", "/etc", "/usr", "/bin"];
const DEFAULT_TEXT_READ_LIMIT_BYTES = 1024 * 1024;
const BINARY_SAMPLE_BYTES = 4096;
const READ_CHUNK_BYTES = 64 * 1024;
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

class FileServiceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "FileServiceError";
    this.code = details.code || null;
    this.status = details.status || null;
  }
}

function trimValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createProfileLookup() {
  return new SshService();
}

function getWindowForDialogs() {
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

async function showOpenDialog(options) {
  const window = getWindowForDialogs();
  return window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options);
}

async function showSaveDialog(options) {
  const window = getWindowForDialogs();
  return window ? dialog.showSaveDialog(window, options) : dialog.showSaveDialog(options);
}

function getDefaultRemotePath(profile) {
  const profileId = trimValue(profile?.id);
  const username = trimValue(profile?.username);
  const displayName = trimValue(profile?.displayName).toLowerCase();

  if (profileId === "debian-anx" || (displayName === "debian" && username === "anx")) {
    return "/home/anx";
  }

  if (username) {
    return posixPath.join("/home", username);
  }

  return "/";
}

function normalizeRemotePath(inputPath, fallbackPath = "/") {
  const fallback = trimValue(fallbackPath) || "/";
  const rawValue = trimValue(inputPath);

  if (!rawValue) {
    return posixPath.normalize(fallback) || "/";
  }

  if (rawValue.startsWith("/")) {
    return posixPath.normalize(rawValue) || "/";
  }

  return posixPath.normalize(posixPath.join(fallback, rawValue)) || "/";
}

function buildBreadcrumbs(currentPath) {
  const normalizedPath = normalizeRemotePath(currentPath);

  if (normalizedPath === "/") {
    return [];
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  let runningPath = "";

  return segments.map((segment) => {
    runningPath = `${runningPath}/${segment}`;
    return {
      name: segment,
      path: runningPath || "/",
    };
  });
}

function getEntryTypeFromAttrs(attrs = {}) {
  if (typeof attrs.isDirectory === "function" && attrs.isDirectory()) {
    return "directory";
  }

  if (typeof attrs.isFile === "function" && attrs.isFile()) {
    return "file";
  }

  const mode = Number(attrs.mode);

  if (Number.isFinite(mode)) {
    if ((mode & fs.constants.S_IFMT) === fs.constants.S_IFDIR) {
      return "directory";
    }

    if ((mode & fs.constants.S_IFMT) === fs.constants.S_IFREG) {
      return "file";
    }
  }

  return "other";
}

function createEntry(remoteDirectoryPath, entry) {
  const name = entry?.filename || "";
  const type = getEntryTypeFromAttrs(entry?.attrs);
  const entryPath = normalizeRemotePath(posixPath.join(remoteDirectoryPath, name));
  const extension = type === "file" && name.includes(".") ? name.split(".").pop() : "";
  const modifiedAt = Number.isFinite(entry?.attrs?.mtime)
    ? new Date(entry.attrs.mtime * 1000).toISOString()
    : null;

  return {
    name,
    path: entryPath,
    type,
    isDirectory: type === "directory",
    extension,
    size: Number.isFinite(entry?.attrs?.size) ? entry.attrs.size : null,
    modifiedAt,
  };
}

function createSummary(entries) {
  const directoryCount = entries.filter((entry) => entry.isDirectory).length;
  const fileCount = entries.filter((entry) => !entry.isDirectory).length;

  return {
    directoryCount,
    fileCount,
    totalCount: entries.length,
  };
}

function isProtectedRemotePath(remotePath) {
  const normalizedPath = normalizeRemotePath(remotePath);

  if (normalizedPath === "/") {
    return true;
  }

  return PROTECTED_REMOTE_PATHS.some((candidate) => candidate !== "/" && (normalizedPath === candidate || normalizedPath.startsWith(`${candidate}/`)));
}

function assertDangerousActionAllowed(remotePath, confirmed) {
  if (!isProtectedRemotePath(remotePath)) {
    return;
  }

  if (!confirmed) {
    throw new FileServiceError(
      `Protected path "${normalizeRemotePath(remotePath)}" requires explicit confirmation before deletion.`,
      {
        code: "FILES_CONFIRM_PROTECTED_PATH",
        status: 400,
      },
    );
  }
}

function mapFileOperationError(error, fallbackMessage) {
  if (error instanceof FileServiceError || error instanceof SshServiceError) {
    return error;
  }

  const message = trimValue(error?.message);
  const code = error?.code;

  if (code === "ENOENT" || code === 2 || /no such file|not found/i.test(message)) {
    return new FileServiceError("Remote path not found.", {
      code: "FILES_PATH_NOT_FOUND",
      status: 404,
    });
  }

  if (code === "EACCES" || code === "EPERM" || /permission denied|access denied/i.test(message)) {
    return new FileServiceError("Permission denied for that remote path.", {
      code: "FILES_PERMISSION_DENIED",
      status: 403,
    });
  }

  if (/failure/i.test(message) && fallbackMessage) {
    return new FileServiceError(fallbackMessage, {
      code: "FILES_OPERATION_FAILED",
      status: 400,
    });
  }

  return new FileServiceError(fallbackMessage || "Remote file operation failed.", {
    code: code || "FILES_OPERATION_FAILED",
    status: 400,
  });
}

function detectTextSupport(buffer) {
  if (buffer.includes(0)) {
    return false;
  }

  try {
    TEXT_DECODER.decode(buffer.subarray(0, Math.min(buffer.length, BINARY_SAMPLE_BYTES)));
    return true;
  } catch {
    return false;
  }
}

function sortEntries(entries) {
  return entries.slice().sort((left, right) => {
    if (left.isDirectory !== right.isDirectory) {
      return left.isDirectory ? -1 : 1;
    }

    return String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
  });
}

class FileService {
  constructor() {
    this.profileLookup = createProfileLookup();
    this.sessions = new Map();
  }

  getProfile(profileId) {
    if (!trimValue(profileId)) {
      throw new FileServiceError("SSH profile is required for remote file access.", {
        code: "FILES_PROFILE_REQUIRED",
        status: 400,
      });
    }

    return this.profileLookup.getProfile(profileId);
  }

  async ensureSession(options = {}) {
    const profile = this.getProfile(options.profileId);
    const existingSession = this.sessions.get(profile.id);

    if (existingSession?.connected && existingSession.sftp) {
      return existingSession;
    }

    if (existingSession) {
      this.destroySession(profile.id);
    }

    const connectConfig = this.profileLookup.buildConnectConfig(profile, options);
    const session = await new Promise((resolve, reject) => {
      const client = new Client();
      let settled = false;

      const rejectOnce = (error) => {
        if (settled) {
          return;
        }

        settled = true;

        try {
          client.end();
          client.destroy();
        } catch {}

        reject(mapFileOperationError(error, "Remote file connection failed."));
      };

      client.on("ready", () => {
        client.sftp((error, sftp) => {
          if (error) {
            rejectOnce(error);
            return;
          }

          if (settled) {
            try {
              client.end();
              client.destroy();
            } catch {}
            return;
          }

          settled = true;
          resolve({
            profile,
            client,
            sftp,
            connected: true,
            homePath: getDefaultRemotePath(profile),
            currentPath: getDefaultRemotePath(profile),
            connectedAt: new Date().toISOString(),
          });
        });
      });

      client.on("error", rejectOnce);
      client.on("close", () => {
        const activeSession = this.sessions.get(profile.id);

        if (activeSession?.client === client) {
          this.destroySession(profile.id);
        }
      });

      client.connect(connectConfig);
    });

    this.sessions.set(profile.id, session);
    return session;
  }

  destroySession(profileId) {
    const session = this.sessions.get(profileId);

    if (!session) {
      return;
    }

    session.connected = false;

    try {
      session.client?.end?.();
      session.client?.destroy?.();
    } catch {}

    this.sessions.delete(profileId);
  }

  disconnect(profileId) {
    this.destroySession(profileId);
    return {
      profileId,
      connected: false,
    };
  }

  async sftpCall(session, methodName, ...args) {
    return new Promise((resolve, reject) => {
      session.sftp[methodName](...args, (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      });
    });
  }

  async readRemoteBuffer(session, remotePath, size) {
    const handle = await this.sftpCall(session, "open", remotePath, "r");
    let position = 0;
    const chunks = [];

    try {
      while (position < size) {
        const nextLength = Math.min(READ_CHUNK_BYTES, size - position);
        const buffer = Buffer.alloc(nextLength);
        const bytesRead = await new Promise((resolve, reject) => {
          session.sftp.read(handle, buffer, 0, nextLength, position, (error, count) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(count);
          });
        });

        if (!bytesRead) {
          break;
        }

        chunks.push(buffer.subarray(0, bytesRead));
        position += bytesRead;
      }
    } finally {
      try {
        await this.sftpCall(session, "close", handle);
      } catch {}
    }

    return Buffer.concat(chunks);
  }

  async writeRemoteBuffer(session, remotePath, buffer) {
    const handle = await this.sftpCall(session, "open", remotePath, "w");
    let position = 0;

    try {
      while (position < buffer.length) {
        const nextChunk = buffer.subarray(position, position + READ_CHUNK_BYTES);
        await new Promise((resolve, reject) => {
          session.sftp.write(handle, nextChunk, 0, nextChunk.length, position, (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
        position += nextChunk.length;
      }
    } finally {
      try {
        await this.sftpCall(session, "close", handle);
      } catch {}
    }
  }

  async statRemotePath(session, remotePath) {
    return this.sftpCall(session, "stat", remotePath);
  }

  async lstatRemotePath(session, remotePath) {
    return this.sftpCall(session, "lstat", remotePath);
  }

  async list(options = {}) {
    const session = await this.ensureSession(options);
    const targetPath = normalizeRemotePath(options.path, session.currentPath || session.homePath);

    try {
      const attrs = await this.statRemotePath(session, targetPath);

      if (getEntryTypeFromAttrs(attrs) !== "directory") {
        throw new FileServiceError("Remote path is not a directory.", {
          code: "FILES_PATH_NOT_DIRECTORY",
          status: 400,
        });
      }

      const entries = sortEntries((await this.sftpCall(session, "readdir", targetPath)).map((entry) => createEntry(targetPath, entry)));
      session.currentPath = targetPath;

      return {
        configured: true,
        connected: true,
        status: "connected",
        message: `Connected to ${profileLabel(session.profile)}.`,
        profileId: session.profile.id,
        currentPath: targetPath,
        homePath: session.homePath,
        roots: [
          {
            name: session.profile.displayName || session.profile.host,
            path: session.homePath,
          },
        ],
        breadcrumbs: buildBreadcrumbs(targetPath),
        entries,
        summary: createSummary(entries),
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw mapFileOperationError(error, "Remote directory listing failed.");
    }
  }

  async readText(options = {}) {
    const session = await this.ensureSession(options);
    const remotePath = normalizeRemotePath(options.path, session.currentPath || session.homePath);

    try {
      const attrs = await this.statRemotePath(session, remotePath);

      if (getEntryTypeFromAttrs(attrs) !== "file") {
        throw new FileServiceError("Remote path is not a file.", {
          code: "FILES_PATH_NOT_FILE",
          status: 400,
        });
      }

      if (attrs.size > DEFAULT_TEXT_READ_LIMIT_BYTES) {
        return {
          path: remotePath,
          name: posixPath.basename(remotePath),
          size: attrs.size,
          modifiedAt: Number.isFinite(attrs.mtime) ? new Date(attrs.mtime * 1000).toISOString() : null,
          supported: false,
          reason: "file_too_large",
          content: null,
        };
      }

      const buffer = await this.readRemoteBuffer(session, remotePath, attrs.size);

      if (!detectTextSupport(buffer)) {
        return {
          path: remotePath,
          name: posixPath.basename(remotePath),
          size: attrs.size,
          modifiedAt: Number.isFinite(attrs.mtime) ? new Date(attrs.mtime * 1000).toISOString() : null,
          supported: false,
          reason: "binary_unsupported",
          content: null,
        };
      }

      return {
        path: remotePath,
        name: posixPath.basename(remotePath),
        size: attrs.size,
        modifiedAt: Number.isFinite(attrs.mtime) ? new Date(attrs.mtime * 1000).toISOString() : null,
        supported: true,
        content: buffer.toString("utf8"),
      };
    } catch (error) {
      throw mapFileOperationError(error, "Remote file read failed.");
    }
  }

  async writeText(options = {}) {
    const session = await this.ensureSession(options);
    const remotePath = normalizeRemotePath(options.path, session.currentPath || session.homePath);
    const content = typeof options.content === "string" ? options.content : "";

    try {
      await this.writeRemoteBuffer(session, remotePath, Buffer.from(content, "utf8"));
      return {
        path: remotePath,
        saved: true,
      };
    } catch (error) {
      throw mapFileOperationError(error, "Remote file save failed.");
    }
  }

  async mkdir(options = {}) {
    const session = await this.ensureSession(options);
    const remotePath = normalizeRemotePath(options.path, session.currentPath || session.homePath);

    try {
      await this.sftpCall(session, "mkdir", remotePath);
      return {
        path: remotePath,
        created: true,
      };
    } catch (error) {
      throw mapFileOperationError(error, "Remote folder creation failed.");
    }
  }

  async rename(options = {}) {
    const session = await this.ensureSession(options);
    const oldPath = normalizeRemotePath(options.oldPath, session.currentPath || session.homePath);
    const newPath = normalizeRemotePath(options.newPath, posixPath.dirname(oldPath));

    try {
      await this.sftpCall(session, "rename", oldPath, newPath);
      return {
        oldPath,
        newPath,
        renamed: true,
      };
    } catch (error) {
      throw mapFileOperationError(error, "Remote rename failed.");
    }
  }

  async deletePathRecursive(session, remotePath) {
    const attrs = await this.lstatRemotePath(session, remotePath);
    const type = getEntryTypeFromAttrs(attrs);

    if (type === "directory") {
      const children = await this.sftpCall(session, "readdir", remotePath);

      for (const child of children) {
        const childPath = normalizeRemotePath(posixPath.join(remotePath, child.filename));
        await this.deletePathRecursive(session, childPath);
      }

      await this.sftpCall(session, "rmdir", remotePath);
      return;
    }

    await this.sftpCall(session, "unlink", remotePath);
  }

  async delete(options = {}) {
    const session = await this.ensureSession(options);
    const remotePath = normalizeRemotePath(options.path, session.currentPath || session.homePath);
    assertDangerousActionAllowed(remotePath, Boolean(options.confirmDangerous));

    try {
      await this.deletePathRecursive(session, remotePath);
      return {
        path: remotePath,
        deleted: true,
      };
    } catch (error) {
      throw mapFileOperationError(error, "Remote delete failed.");
    }
  }

  async upload(options = {}) {
    const session = await this.ensureSession(options);
    const targetDirectory = normalizeRemotePath(options.directoryPath, session.currentPath || session.homePath);

    try {
      const selection = await showOpenDialog({
        title: "Upload file to remote server",
        properties: ["openFile"],
      });

      if (selection.canceled || !selection.filePaths[0]) {
        return {
          canceled: true,
        };
      }

      const localPath = selection.filePaths[0];
      const remotePath = normalizeRemotePath(posixPath.join(targetDirectory, path.basename(localPath)));

      await new Promise((resolve, reject) => {
        session.sftp.fastPut(localPath, remotePath, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      return {
        canceled: false,
        localPath,
        remotePath,
        uploaded: true,
      };
    } catch (error) {
      throw mapFileOperationError(error, "Remote upload failed.");
    }
  }

  async download(options = {}) {
    const session = await this.ensureSession(options);
    const remotePath = normalizeRemotePath(options.path, session.currentPath || session.homePath);

    try {
      const attrs = await this.statRemotePath(session, remotePath);

      if (getEntryTypeFromAttrs(attrs) !== "file") {
        throw new FileServiceError("Only files can be downloaded from this view.", {
          code: "FILES_DOWNLOAD_FILE_ONLY",
          status: 400,
        });
      }

      const selection = await showSaveDialog({
        title: "Download remote file",
        defaultPath: path.join(process.env.USERPROFILE || process.cwd(), posixPath.basename(remotePath)),
      });

      if (selection.canceled || !selection.filePath) {
        return {
          canceled: true,
        };
      }

      await new Promise((resolve, reject) => {
        session.sftp.fastGet(remotePath, selection.filePath, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      return {
        canceled: false,
        remotePath,
        localPath: selection.filePath,
        downloaded: true,
      };
    } catch (error) {
      throw mapFileOperationError(error, "Remote download failed.");
    }
  }

  dispose() {
    for (const profileId of this.sessions.keys()) {
      this.destroySession(profileId);
    }

    this.profileLookup.dispose();
  }
}

function profileLabel(profile) {
  return profile?.displayName || `${profile?.username || "user"}@${profile?.host || "server"}`;
}

module.exports = {
  FileService,
  FileServiceError,
  isProtectedRemotePath,
};
