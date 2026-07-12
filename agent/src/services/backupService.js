const childProcess = require("child_process");
const crypto = require("crypto");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");

const { getConfig } = require("../config");
const instanceService = require("./instances/instanceService");

const BACKUP_FORMAT = "tar.gz";
const BACKUP_EXTENSION = ".tar.gz";
const DEFAULT_RETENTION_COUNT = 10;
const DEFAULT_RETENTION_DAYS = 30;
let schedulerStarted = false;

function createBackupError(code, statusCode = 400) {
  return Object.assign(new Error(code), { code, statusCode });
}

function nowIso() {
  return new Date().toISOString();
}

function getBackupRoot() {
  return path.resolve(process.env.AGENT_BACKUP_ROOT || path.join(path.dirname(getConfig().instanceRoot), "backups"));
}

function getInstanceRoot() {
  return path.resolve(getConfig().instanceRoot);
}

function isInsideRoot(filePath, root) {
  const relative = path.relative(root, filePath);
  return relative === "" || (relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function validateInstanceId(value) {
  const id = String(value || "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(id)) {
    throw createBackupError("INVALID_INSTANCE_ID");
  }
  return id;
}

function validateBackupId(value) {
  const id = String(value || "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,80}$/.test(id)) {
    throw createBackupError("INVALID_BACKUP_ID");
  }
  return id;
}

function sanitizeName(value, fallback) {
  return String(value || fallback || "Backup")
    .trim()
    .replace(/[^\w .-]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120) || "Backup";
}

function metadataPath(backupId) {
  return path.join(getBackupRoot(), `${backupId}.json`);
}

function archivePath(backupId) {
  return path.join(getBackupRoot(), `${backupId}${BACKUP_EXTENSION}`);
}

function schedulesPath() {
  return path.join(getBackupRoot(), "schedules.json");
}

async function ensureBackupRoot() {
  await fs.mkdir(getBackupRoot(), { recursive: true, mode: 0o700 });
}

function runFile(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      ...options,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", () => reject(createBackupError("BACKUP_TOOL_UNAVAILABLE", 500)));
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const error = createBackupError("BACKUP_TOOL_FAILED", 500);
      error.detail = stderr.slice(0, 1000);
      reject(error);
    });
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function getFileSize(filePath) {
  return (await fs.stat(filePath)).size;
}

async function getInstancePath(instanceId) {
  const root = getInstanceRoot();
  const resolved = path.resolve(root, validateInstanceId(instanceId));
  if (!isInsideRoot(resolved, root)) {
    throw createBackupError("PATH_NOT_ALLOWED", 403);
  }
  const real = await fs.realpath(resolved).catch(() => {
    throw createBackupError("INSTANCE_NOT_FOUND", 404);
  });
  const realRoot = await fs.realpath(root).catch(() => root);
  if (!isInsideRoot(real, realRoot)) {
    throw createBackupError("PATH_NOT_ALLOWED", 403);
  }
  return real;
}

async function getSourcePaths(instancePath, type) {
  if (type !== "world") {
    return ["."];
  }

  const candidates = ["data/world", "data/worlds", "data/Worlds"];
  const existing = [];
  for (const candidate of candidates) {
    const source = path.join(instancePath, candidate);
    if (await fs.stat(source).then((stats) => stats.isDirectory(), () => false)) {
      existing.push(candidate);
    }
  }

  if (existing.length === 0) {
    throw createBackupError("WORLD_PATH_NOT_FOUND", 404);
  }

  return existing;
}

async function listMetadataFiles() {
  await ensureBackupRoot();
  const entries = await fs.readdir(getBackupRoot(), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "schedules.json")
    .map((entry) => path.join(getBackupRoot(), entry.name));
}

async function readSchedules() {
  await ensureBackupRoot();
  try {
    const parsed = await readJson(schedulesPath());
    return Array.isArray(parsed.schedules) ? parsed.schedules : [];
  } catch {
    return [];
  }
}

async function writeSchedules(schedules) {
  await ensureBackupRoot();
  await writeJson(schedulesPath(), { schedules });
}

async function listSchedules() {
  return { schedules: await readSchedules() };
}

async function saveSchedule(payload = {}) {
  const instanceId = validateInstanceId(payload.instanceId);
  const intervalHours = Number.parseInt(payload.intervalHours, 10);
  if (!Number.isFinite(intervalHours) || intervalHours < 1 || intervalHours > 24 * 30) {
    throw createBackupError("INVALID_SCHEDULE_INTERVAL");
  }
  const schedule = {
    id: instanceId,
    instanceId,
    enabled: payload.enabled !== false,
    type: String(payload.type || "full") === "world" ? "world" : "full",
    intervalHours,
    keepLast: Number.parseInt(payload.keepLast, 10) || DEFAULT_RETENTION_COUNT,
    maxAgeDays: Number.parseInt(payload.maxAgeDays, 10) || DEFAULT_RETENTION_DAYS,
    nextRunAt: payload.nextRunAt || new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString(),
    updatedAt: nowIso(),
  };
  const schedules = (await readSchedules()).filter((entry) => entry.instanceId !== instanceId);
  schedules.push(schedule);
  await writeSchedules(schedules);
  return { schedule };
}

async function deleteSchedule(instanceId) {
  const id = validateInstanceId(instanceId);
  const schedules = (await readSchedules()).filter((entry) => entry.instanceId !== id);
  await writeSchedules(schedules);
  return { id, deleted: true };
}

async function readBackupMetadata(backupId) {
  const id = validateBackupId(backupId);
  const metadata = await readJson(metadataPath(id)).catch(() => {
    throw createBackupError("BACKUP_NOT_FOUND", 404);
  });
  const archive = archivePath(id);
  const size = await getFileSize(archive).catch(() => metadata.size || 0);
  return {
    ...metadata,
    path: archive,
    size,
  };
}

async function listBackups(options = {}) {
  const files = await listMetadataFiles();
  const backups = [];

  for (const file of files) {
    try {
      const metadata = await readJson(file);
      const archive = archivePath(metadata.id);
      backups.push({
        ...metadata,
        path: archive,
        size: await getFileSize(archive).catch(() => metadata.size || 0),
      });
    } catch {
      continue;
    }
  }

  const filtered = options.instanceId
    ? backups.filter((backup) => backup.instanceId === options.instanceId)
    : backups;
  filtered.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));

  return {
    root: getBackupRoot(),
    roots: [getBackupRoot()],
    backups: filtered,
    summary: {
      totalBackups: filtered.length,
      totalSize: filtered.reduce((total, backup) => total + (Number(backup.size) || 0), 0),
      lastBackupAt: filtered[0]?.createdAt || null,
    },
    diagnostics: {
      roots: [{
        path: getBackupRoot(),
        resolvedPath: getBackupRoot(),
        ok: true,
        errorCode: null,
      }],
    },
  };
}

async function pruneRetention(instanceId, options = {}) {
  const keepLast = Number.parseInt(options.keepLast ?? process.env.AGENT_BACKUP_KEEP_LAST ?? DEFAULT_RETENTION_COUNT, 10);
  const maxAgeDays = Number.parseInt(options.maxAgeDays ?? process.env.AGENT_BACKUP_MAX_AGE_DAYS ?? DEFAULT_RETENTION_DAYS, 10);
  const backups = (await listBackups({ instanceId })).backups;
  const cutoff = Date.now() - Math.max(maxAgeDays, 1) * 24 * 60 * 60 * 1000;

  for (const [index, backup] of backups.entries()) {
    const tooMany = Number.isFinite(keepLast) && keepLast > 0 && index >= keepLast;
    const tooOld = new Date(backup.createdAt).getTime() < cutoff;
    if (tooMany || tooOld) {
      await deleteBackup(backup.id).catch(() => {});
    }
  }
}

async function createBackup(payload = {}) {
  const instanceId = validateInstanceId(payload.instanceId);
  const type = String(payload.type || "full") === "world" ? "world" : "full";
  const instancePath = await getInstancePath(instanceId);
  const sourcePaths = await getSourcePaths(instancePath, type);
  await ensureBackupRoot();

  const backupId = `${instanceId}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const archive = archivePath(backupId);
  await runFile("tar", ["-czf", archive, ...sourcePaths], { cwd: instancePath });
  const metadata = {
    id: backupId,
    instanceId,
    name: sanitizeName(payload.name, `${instanceId} ${type} backup`),
    createdAt: nowIso(),
    createdBy: sanitizeName(payload.createdBy, "local-user"),
    type,
    size: await getFileSize(archive),
    compression: BACKUP_FORMAT,
    sourcePaths,
    archiveName: path.basename(archive),
    status: "complete",
  };
  await writeJson(metadataPath(backupId), metadata);
  await pruneRetention(instanceId, payload.retention || {});
  return { backup: metadata };
}

async function deleteBackup(backupId) {
  const id = validateBackupId(backupId);
  const metadata = await readBackupMetadata(id).catch((error) => {
    if (error?.code === "BACKUP_NOT_FOUND") {
      return null;
    }
    throw error;
  });
  if (!metadata) {
    return { id, deleted: false, alreadyDeleted: true };
  }
  await fs.rm(metadata.path, { force: true });
  await fs.rm(metadataPath(metadata.id), { force: true });
  return { id: metadata.id, deleted: true };
}

async function createSafetySnapshot(instanceId) {
  return createBackup({
    instanceId,
    name: `${instanceId} safety snapshot before restore`,
    type: "full",
    createdBy: "restore-safety",
    retention: { keepLast: 9999, maxAgeDays: 3650 },
  });
}

async function restoreBackup(payload = {}) {
  const backup = await readBackupMetadata(payload.backupId);
  const instanceId = validateInstanceId(payload.instanceId || backup.instanceId);
  if (instanceId !== backup.instanceId) {
    throw createBackupError("BACKUP_INSTANCE_MISMATCH");
  }
  const instancePath = await getInstancePath(instanceId);

  await instanceService.stopInstance(instanceId).catch(() => {});
  const safety = await createSafetySnapshot(instanceId);
  await fs.rm(instancePath, { recursive: true, force: true });
  await fs.mkdir(instancePath, { recursive: true, mode: 0o700 });
  await runFile("tar", ["-xzf", backup.path, "-C", instancePath]);

  if (!await fs.stat(path.join(instancePath, "config.json")).then((stats) => stats.isFile(), () => false)) {
    throw createBackupError("RESTORE_VERIFICATION_FAILED", 500);
  }

  const restored = {
    backupId: backup.id,
    instanceId,
    safetyBackupId: safety.backup.id,
    restoredAt: nowIso(),
  };

  if (payload.restart === true) {
    await instanceService.startInstance(instanceId).catch(() => {});
  }

  return { restore: restored };
}

async function importBackup(payload = {}) {
  const instanceId = validateInstanceId(payload.instanceId);
  const content = String(payload.content || "");
  if (!content) {
    throw createBackupError("BACKUP_CONTENT_REQUIRED");
  }
  await ensureBackupRoot();
  const backupId = `${instanceId}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const archive = archivePath(backupId);
  await fs.writeFile(archive, Buffer.from(content, payload.encoding === "base64" ? "base64" : "utf8"), { mode: 0o600 });
  const metadata = {
    id: backupId,
    instanceId,
    name: sanitizeName(payload.name, `${instanceId} imported backup`),
    createdAt: nowIso(),
    createdBy: sanitizeName(payload.createdBy, "import"),
    type: String(payload.type || "full") === "world" ? "world" : "full",
    size: await getFileSize(archive),
    compression: BACKUP_FORMAT,
    sourcePaths: ["."],
    archiveName: path.basename(archive),
    status: "imported",
  };
  await writeJson(metadataPath(backupId), metadata);
  return { backup: metadata };
}

async function getBackupDownload(backupId) {
  const backup = await readBackupMetadata(backupId);
  return {
    backup,
    stream: fsSync.createReadStream(backup.path),
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${backup.archiveName || path.basename(backup.path)}"`,
    },
  };
}

async function runDueSchedules() {
  const schedules = await readSchedules();
  const now = Date.now();
  let changed = false;

  for (const schedule of schedules) {
    if (!schedule.enabled || new Date(schedule.nextRunAt || 0).getTime() > now) {
      continue;
    }

    try {
      await createBackup({
        instanceId: schedule.instanceId,
        type: schedule.type,
        name: `${schedule.instanceId} scheduled ${schedule.type} backup`,
        createdBy: "schedule",
        retention: {
          keepLast: schedule.keepLast,
          maxAgeDays: schedule.maxAgeDays,
        },
      });
      schedule.lastRunAt = nowIso();
      schedule.lastError = null;
    } catch (error) {
      schedule.lastError = error?.code || "SCHEDULE_FAILED";
    }

    schedule.nextRunAt = new Date(Date.now() + schedule.intervalHours * 60 * 60 * 1000).toISOString();
    schedule.updatedAt = nowIso();
    changed = true;
  }

  if (changed) {
    await writeSchedules(schedules);
  }
}

function startBackupScheduler() {
  if (schedulerStarted) {
    return;
  }
  schedulerStarted = true;
  setInterval(() => {
    runDueSchedules().catch(() => {});
  }, 60 * 1000).unref?.();
  runDueSchedules().catch(() => {});
}

module.exports = {
  createBackup,
  deleteBackup,
  deleteSchedule,
  getBackupDownload,
  importBackup,
  listBackups,
  listSchedules,
  restoreBackup,
  saveSchedule,
  startBackupScheduler,
};
