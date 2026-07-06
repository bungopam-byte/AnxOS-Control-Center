const childProcess = require("child_process");
const fs = require("fs/promises");
const fsSync = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

const { getConfig } = require("../../config");

const INSTANCE_STATES = Object.freeze({
  STOPPED: "Stopped",
  STARTING: "Starting",
  RUNNING: "Running",
  STOPPING: "Stopping",
  RESTARTING: "Restarting",
  FAILED: "Failed",
});

const INSTANCE_TYPES = new Set([
  "custom-command",
  "node-app",
  "python-app",
  "java-app",
  "minecraft-paper",
]);

const DEFAULT_RESTART_POLICY = "never";
const RESTART_POLICIES = new Set(["never", "on-failure", "always"]);
const DEFAULT_STARTUP_TIMEOUT_MS = 15000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;
const MAX_LOG_BYTES = 5 * 1024 * 1024;
const MAX_LOG_LINES = 1000;
const PORT_CONNECT_TIMEOUT_MS = 500;
const PROC_STAT_TICKS_PER_SECOND = 100;
const PAGE_SIZE_BYTES = 4096;
const DEFAULT_EXECUTABLE_ROOTS = [
  "/bin",
  "/usr/bin",
  "/usr/local/bin",
  "/sbin",
  "/usr/sbin",
  "/usr/local/sbin",
  "/srv/anxos/bin",
];

const runningProcesses = new Map();
const metricsSamples = new Map();

function createInstanceError(code, statusCode = 400) {
  return Object.assign(new Error(code), { code, statusCode });
}

function nowIso() {
  return new Date().toISOString();
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
    throw createInstanceError("INVALID_INSTANCE_ID");
  }

  return id;
}

function validateDisplayName(value, fallback) {
  const displayName = String(value || fallback || "").trim();

  if (!displayName || displayName.length > 120 || /[\0\r\n]/.test(displayName)) {
    throw createInstanceError("INVALID_DISPLAY_NAME");
  }

  return displayName;
}

function validateInstanceType(value) {
  const type = String(value || "").trim();

  if (!INSTANCE_TYPES.has(type)) {
    throw createInstanceError("INVALID_INSTANCE_TYPE");
  }

  return type;
}

function validateBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function validatePositiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) {
    throw createInstanceError("INVALID_NUMBER");
  }

  return parsed;
}

function normalizeStringArray(value, fieldName, maxItems = 64) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.length > maxItems) {
    throw createInstanceError(`INVALID_${fieldName}`);
  }

  return value.map((entry) => {
    const normalized = String(entry || "").trim();

    if (!normalized || normalized.includes("\0") || normalized.length > 512) {
      throw createInstanceError(`INVALID_${fieldName}`);
    }

    return normalized;
  });
}

function normalizeTags(value) {
  return normalizeStringArray(value, "TAGS", 32).map((tag) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/.test(tag)) {
      throw createInstanceError("INVALID_TAGS");
    }

    return tag;
  });
}

function normalizePorts(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.length > 32) {
    throw createInstanceError("INVALID_PORTS");
  }

  return value.map((port) => {
    const parsed = Number.parseInt(port, 10);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
      throw createInstanceError("INVALID_PORTS");
    }

    return parsed;
  });
}

function normalizeEnvironment(value) {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw createInstanceError("INVALID_ENVIRONMENT");
  }

  const entries = Object.entries(value);

  if (entries.length > 128) {
    throw createInstanceError("INVALID_ENVIRONMENT");
  }

  return entries.reduce((environment, [key, rawValue]) => {
    const normalizedKey = String(key || "").trim();

    if (!/^[A-Z_][A-Z0-9_]{0,127}$/i.test(normalizedKey)) {
      throw createInstanceError("INVALID_ENVIRONMENT");
    }

    if (/token|secret|password|credential|api[_-]?key/i.test(normalizedKey)) {
      throw createInstanceError("SECRET_ENVIRONMENT_NOT_ALLOWED");
    }

    const normalizedValue = String(rawValue ?? "");

    if (normalizedValue.includes("\0") || normalizedValue.length > 4096) {
      throw createInstanceError("INVALID_ENVIRONMENT");
    }

    environment[normalizedKey] = normalizedValue;
    return environment;
  }, {});
}

function validateRestartPolicy(value) {
  const restartPolicy = String(value || DEFAULT_RESTART_POLICY).trim();

  if (!RESTART_POLICIES.has(restartPolicy)) {
    throw createInstanceError("INVALID_RESTART_POLICY");
  }

  return restartPolicy;
}

function validateExecutable(value) {
  const executable = String(value || "").trim();

  if (!executable || executable.includes("\0") || executable.length > 256) {
    throw createInstanceError("INVALID_EXECUTABLE");
  }

  if (/[;&|`$<>]/.test(executable)) {
    throw createInstanceError("INVALID_EXECUTABLE");
  }

  if (executable.includes("/") && !path.isAbsolute(executable)) {
    throw createInstanceError("INVALID_EXECUTABLE");
  }

  if (!executable.includes("/") && !/^[a-zA-Z0-9_.+-]+$/.test(executable)) {
    throw createInstanceError("INVALID_EXECUTABLE");
  }

  return executable;
}

function getExecutableRoots() {
  const configuredRoots = process.env.AGENT_INSTANCE_EXECUTABLE_ROOTS
    ? process.env.AGENT_INSTANCE_EXECUTABLE_ROOTS.split(path.delimiter)
    : DEFAULT_EXECUTABLE_ROOTS;

  return configuredRoots.map((root) => path.resolve(root.trim())).filter(Boolean);
}

function assertExecutableAllowed(executable) {
  if (!path.isAbsolute(executable)) {
    return;
  }

  const resolvedExecutable = path.resolve(executable);
  const allowedRoots = [...getExecutableRoots(), getInstanceRoot()];

  if (!allowedRoots.some((root) => isInsideRoot(resolvedExecutable, root))) {
    throw createInstanceError("EXECUTABLE_NOT_ALLOWED", 403);
  }
}

function validateRelativeAssetPath(value, fieldName) {
  const assetPath = String(value || "").trim();

  if (!assetPath || assetPath.includes("\0") || path.isAbsolute(assetPath)) {
    throw createInstanceError(`INVALID_${fieldName}`);
  }

  const normalized = path.normalize(assetPath);

  if (normalized === "." || normalized.startsWith("..") || normalized.split(path.sep).includes("..")) {
    throw createInstanceError(`INVALID_${fieldName}`);
  }

  return normalized;
}

function validateMemoryValue(value) {
  if (!value) {
    return "";
  }

  const memory = String(value).trim();

  if (!/^[1-9][0-9]{0,5}[kKmMgG]?$/.test(memory)) {
    throw createInstanceError("INVALID_MEMORY_LIMIT");
  }

  return memory;
}

function instancePath(instanceId) {
  return path.join(getInstanceRoot(), instanceId);
}

function configPath(instanceId) {
  return path.join(instancePath(instanceId), "config.json");
}

function logPath(instanceId, streamName) {
  return path.join(instancePath(instanceId), "logs", `${streamName}.log`);
}

async function ensureManagedPath(filePath) {
  const root = getInstanceRoot();
  const resolved = path.resolve(filePath);

  if (!isInsideRoot(resolved, root)) {
    throw createInstanceError("PATH_NOT_ALLOWED", 403);
  }

  return resolved;
}

async function ensureInstanceDirectories(instanceId) {
  const basePath = await ensureManagedPath(instancePath(instanceId));

  await fs.mkdir(path.join(basePath, "logs"), { recursive: true });
  await fs.mkdir(path.join(basePath, "data"), { recursive: true });
  await fs.mkdir(path.join(basePath, "runtime"), { recursive: true });

  return basePath;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempPath, filePath);
}

function resolveRelativeManagedPath(instanceId, value, fallback) {
  const relativePath = String(value || fallback || "").trim();

  if (!relativePath || relativePath.includes("\0") || path.isAbsolute(relativePath)) {
    throw createInstanceError("INVALID_PATH");
  }

  const resolved = path.resolve(instancePath(instanceId), relativePath);

  if (!isInsideRoot(resolved, instancePath(instanceId))) {
    throw createInstanceError("PATH_NOT_ALLOWED", 403);
  }

  return resolved;
}

function resolveInstanceDataPath(instanceId, value = ".") {
  const relativePath = String(value || ".").trim();

  if (relativePath.includes("\0") || path.isAbsolute(relativePath)) {
    throw createInstanceError("INVALID_PATH");
  }

  const dataRoot = path.join(instancePath(instanceId), "data");
  const resolved = path.resolve(dataRoot, relativePath);

  if (!isInsideRoot(resolved, dataRoot)) {
    throw createInstanceError("PATH_NOT_ALLOWED", 403);
  }

  return {
    path: resolved,
    root: dataRoot,
    relativePath: path.relative(dataRoot, resolved) || ".",
  };
}

async function assertNoInstanceDataEscape(resolved, options = {}) {
  const realRoot = await fs.realpath(resolved.root).catch(() => resolved.root);
  const existingTarget = await fs.realpath(resolved.path).catch(() => null);

  if (existingTarget && !isInsideRoot(existingTarget, realRoot)) {
    throw createInstanceError("PATH_NOT_ALLOWED", 403);
  }

  if (options.forWrite) {
    const parent = path.dirname(resolved.path);
    await fs.mkdir(parent, { recursive: true });
    const realParent = await fs.realpath(parent).catch(() => parent);
    if (!isInsideRoot(realParent, realRoot)) {
      throw createInstanceError("PATH_NOT_ALLOWED", 403);
    }
  }
}

function buildTypeCommand(type, payload) {
  const args = normalizeStringArray(payload.args, "ARGS", 128);

  if (type === "custom-command") {
    return {
      executable: validateExecutable(payload.executable || payload.command),
      args,
    };
  }

  if (type === "node-app") {
    const entrypoint = validateRelativeAssetPath(payload.entrypoint || "index.js", "ENTRYPOINT");
    return {
      executable: validateExecutable(payload.executable || "node"),
      args: [entrypoint, ...args],
    };
  }

  if (type === "python-app") {
    const entrypoint = validateRelativeAssetPath(payload.entrypoint || "app.py", "ENTRYPOINT");
    return {
      executable: validateExecutable(payload.executable || "python3"),
      args: [entrypoint, ...args],
    };
  }

  if (type === "java-app") {
    const jar = validateRelativeAssetPath(payload.jar || payload.entrypoint || "app.jar", "JAR");
    return {
      executable: validateExecutable(payload.executable || "java"),
      args: ["-jar", jar, ...args],
    };
  }

  if (type === "minecraft-paper") {
    const jar = validateRelativeAssetPath(payload.jar || payload.entrypoint || "paper.jar", "JAR");
    const memory = validateMemoryValue(payload.memory || payload.memoryLimit || "");
    const memoryArgs = memory ? [`-Xmx${memory}`] : [];
    return {
      executable: validateExecutable(payload.executable || "java"),
      args: [...memoryArgs, "-jar", jar, "nogui", ...args],
    };
  }

  throw createInstanceError("INVALID_INSTANCE_TYPE");
}

function assertSafeArguments(args) {
  for (const arg of args) {
    if (arg.includes("\0") || arg.length > 512) {
      throw createInstanceError("INVALID_ARGS");
    }
  }
}

function normalizeInstanceConfig(payload, existingConfig = null) {
  const createdAt = existingConfig?.createdAt || nowIso();
  const id = existingConfig?.id || validateInstanceId(payload.id);
  const type = validateInstanceType(payload.type || existingConfig?.type);
  const command = buildTypeCommand(type, payload);
  const primaryPort = Number.parseInt(payload.primaryPort, 10);

  assertExecutableAllowed(command.executable);
  assertSafeArguments(command.args);

  const config = {
    id,
    displayName: validateDisplayName(payload.displayName || payload.name, id),
    type,
    workingDirectory: path.relative(instancePath(id), resolveRelativeManagedPath(id, payload.workingDirectory, "data")) || ".",
    executable: command.executable,
    args: command.args,
    environment: normalizeEnvironment(payload.environment || payload.env),
    autoStart: validateBoolean(payload.autoStart, false),
    restartPolicy: validateRestartPolicy(payload.restartPolicy),
    startupTimeoutMs: validatePositiveInteger(payload.startupTimeoutMs, DEFAULT_STARTUP_TIMEOUT_MS, 10 * 60 * 1000),
    shutdownTimeoutMs: validatePositiveInteger(payload.shutdownTimeoutMs, DEFAULT_SHUTDOWN_TIMEOUT_MS, 10 * 60 * 1000),
    memoryLimit: payload.memoryLimit ? validateMemoryValue(payload.memoryLimit) : null,
    ports: normalizePorts(payload.ports),
    version: payload.version ? String(payload.version).slice(0, 80) : null,
    serverVersion: payload.serverVersion ? String(payload.serverVersion).slice(0, 80) : null,
    templateVersion: payload.templateVersion ? String(payload.templateVersion).slice(0, 80) : null,
    templateId: payload.templateId ? String(payload.templateId).slice(0, 80) : null,
    connectionHost: payload.connectionHost ? String(payload.connectionHost).slice(0, 255) : null,
    primaryPort: Number.isInteger(primaryPort) && primaryPort > 0 && primaryPort <= 65535 ? primaryPort : null,
    tags: normalizeTags(payload.tags),
    createdAt,
    updatedAt: nowIso(),
    lastStartedAt: existingConfig?.lastStartedAt || null,
    lastStoppedAt: existingConfig?.lastStoppedAt || null,
    state: existingConfig?.state || INSTANCE_STATES.STOPPED,
    pid: existingConfig?.pid || null,
    exitCode: existingConfig?.exitCode ?? null,
    signal: existingConfig?.signal || null,
    failureReason: existingConfig?.failureReason || null,
  };

  if (payload.state || payload.pid || payload.exitCode || payload.signal) {
    throw createInstanceError("RUNTIME_FIELDS_READ_ONLY");
  }

  return config;
}

function publicConfig(config) {
  return {
    ...config,
    instancePath: instancePath(config.id),
    environment: Object.keys(config.environment || {}).reduce((redacted, key) => {
      redacted[key] = "[configured]";
      return redacted;
    }, {}),
  };
}

async function loadInstanceConfig(instanceId) {
  const id = validateInstanceId(instanceId);

  try {
    return await readJson(configPath(id));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw createInstanceError("INSTANCE_NOT_FOUND", 404);
    }

    throw createInstanceError("INSTANCE_CONFIG_UNREADABLE", 500);
  }
}

async function saveInstanceConfig(config) {
  await ensureInstanceDirectories(config.id);
  await writeJson(configPath(config.id), config);
}

function isProcessAlive(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function reconcileConfigState(config) {
  const processEntry = runningProcesses.get(config.id);
  const pid = processEntry?.child?.pid || config.pid;

  if (pid && isProcessAlive(pid)) {
    const state = processEntry && config.state === INSTANCE_STATES.STARTING ? INSTANCE_STATES.STARTING : INSTANCE_STATES.RUNNING;
    return {
      ...config,
      state,
      pid,
    };
  }

  if (config.state === INSTANCE_STATES.RUNNING || config.state === INSTANCE_STATES.STARTING || config.state === INSTANCE_STATES.STOPPING || config.state === INSTANCE_STATES.RESTARTING) {
    const updated = {
      ...config,
      state: INSTANCE_STATES.STOPPED,
      pid: null,
      lastStoppedAt: config.lastStoppedAt || nowIso(),
    };

    await saveInstanceConfig(updated);
    return updated;
  }

  return config;
}

async function listInstanceIds() {
  const root = getInstanceRoot();

  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).filter((name) => {
      return /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(name);
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw createInstanceError("INSTANCE_ROOT_UNAVAILABLE", 500);
  }
}

async function listInstances() {
  const ids = await listInstanceIds();
  const instances = [];

  for (const id of ids) {
    try {
      instances.push(publicConfig(await reconcileConfigState(await loadInstanceConfig(id))));
    } catch {
      continue;
    }
  }

  return {
    root: getInstanceRoot(),
    instances: instances.sort((left, right) => left.displayName.localeCompare(right.displayName)),
  };
}

async function createInstance(payload) {
  const config = normalizeInstanceConfig(payload || {});

  if (await pathExists(configPath(config.id))) {
    throw createInstanceError("INSTANCE_ALREADY_EXISTS", 409);
  }

  await saveInstanceConfig(config);

  return publicConfig(config);
}

async function updateInstance(instanceId, payload = {}) {
  const current = await loadInstanceConfig(instanceId);

  if (payload.state || payload.pid || payload.exitCode || payload.signal) {
    throw createInstanceError("RUNTIME_FIELDS_READ_ONLY");
  }

  const next = {
    ...current,
    displayName: payload.displayName !== undefined || payload.name !== undefined
      ? validateDisplayName(payload.displayName || payload.name, current.id)
      : current.displayName,
    workingDirectory: payload.workingDirectory !== undefined
      ? path.relative(instancePath(current.id), resolveRelativeManagedPath(current.id, payload.workingDirectory, "data")) || "."
      : current.workingDirectory,
    executable: payload.executable !== undefined ? validateExecutable(payload.executable) : current.executable,
    args: payload.args !== undefined ? normalizeStringArray(payload.args, "ARGS", 128) : current.args,
    environment: payload.environment !== undefined || payload.env !== undefined
      ? normalizeEnvironment(payload.environment || payload.env)
      : current.environment,
    autoStart: payload.autoStart !== undefined ? validateBoolean(payload.autoStart, current.autoStart) : current.autoStart,
    restartPolicy: payload.restartPolicy !== undefined ? validateRestartPolicy(payload.restartPolicy) : current.restartPolicy,
    startupTimeoutMs: payload.startupTimeoutMs !== undefined
      ? validatePositiveInteger(payload.startupTimeoutMs, current.startupTimeoutMs, 10 * 60 * 1000)
      : current.startupTimeoutMs,
    shutdownTimeoutMs: payload.shutdownTimeoutMs !== undefined
      ? validatePositiveInteger(payload.shutdownTimeoutMs, current.shutdownTimeoutMs, 10 * 60 * 1000)
      : current.shutdownTimeoutMs,
    memoryLimit: payload.memoryLimit !== undefined
      ? (payload.memoryLimit ? validateMemoryValue(payload.memoryLimit) : null)
      : current.memoryLimit,
    ports: payload.ports !== undefined ? normalizePorts(payload.ports) : current.ports,
    version: payload.version !== undefined ? (payload.version ? String(payload.version).slice(0, 80) : null) : current.version,
    serverVersion: payload.serverVersion !== undefined ? (payload.serverVersion ? String(payload.serverVersion).slice(0, 80) : null) : current.serverVersion,
    templateVersion: payload.templateVersion !== undefined ? (payload.templateVersion ? String(payload.templateVersion).slice(0, 80) : null) : current.templateVersion,
    templateId: payload.templateId !== undefined ? (payload.templateId ? String(payload.templateId).slice(0, 80) : null) : current.templateId,
    connectionHost: payload.connectionHost !== undefined ? (payload.connectionHost ? String(payload.connectionHost).slice(0, 255) : null) : current.connectionHost,
    primaryPort: payload.primaryPort !== undefined
      ? (() => {
        const port = Number.parseInt(payload.primaryPort, 10);
        return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
      })()
      : current.primaryPort,
    tags: payload.tags !== undefined ? normalizeTags(payload.tags) : current.tags,
    updatedAt: nowIso(),
  };

  assertExecutableAllowed(next.executable);
  assertSafeArguments(next.args);
  await saveInstanceConfig(next);
  return publicConfig(next);
}

async function deleteInstance(instanceId) {
  const config = await reconcileConfigState(await loadInstanceConfig(instanceId));

  if (config.pid && isProcessAlive(config.pid)) {
    throw createInstanceError("INSTANCE_RUNNING", 409);
  }

  await fs.rm(instancePath(config.id), { recursive: true, force: true });
  runningProcesses.delete(config.id);
  metricsSamples.delete(config.id);

  return {
    id: config.id,
    deleted: true,
  };
}

async function updateRuntimeState(instanceId, patch) {
  const current = await loadInstanceConfig(instanceId);
  const updated = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };

  await saveInstanceConfig(updated);
  return updated;
}

async function rotateLogIfNeeded(filePath) {
  try {
    const stats = await fs.stat(filePath);

    if (stats.size < MAX_LOG_BYTES) {
      return;
    }

    await fs.rename(filePath, `${filePath}.1`).catch(() => {});
  } catch {
    // Missing logs are created on first write.
  }
}

function redactLogLine(line) {
  return String(line || "")
    .replace(/\b(?:token|secret|password|credential|api[_-]?key)\b\s*[:=]\s*\S+/gi, (match) => `${match.split(/[:=]/)[0]}=[redacted]`)
    .replace(/\bBearer\s+[a-zA-Z0-9._~+/-]+=*/g, "Bearer [redacted]");
}

async function appendLog(instanceId, streamName, chunk) {
  const filePath = logPath(instanceId, streamName);
  const lines = String(chunk || "").split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) {
    return;
  }

  await rotateLogIfNeeded(filePath);

  const payload = lines.map((line) => {
    return JSON.stringify({
      at: nowIso(),
      stream: streamName,
      message: redactLogLine(line),
    });
  }).join("\n");

  await fs.appendFile(filePath, `${payload}\n`, { mode: 0o600 });
}

function buildSpawnEnvironment(config) {
  return {
    PATH: process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOME: path.join(instancePath(config.id), "runtime"),
    ...config.environment,
  };
}

async function startInstance(instanceId) {
  let config = await reconcileConfigState(await loadInstanceConfig(instanceId));

  if (config.pid && isProcessAlive(config.pid)) {
    throw createInstanceError("INSTANCE_ALREADY_RUNNING", 409);
  }

  const workingDirectory = resolveRelativeManagedPath(config.id, config.workingDirectory, "data");
  assertExecutableAllowed(config.executable);
  await fs.mkdir(workingDirectory, { recursive: true });
  await appendLog(config.id, "stdout", `Starting ${config.displayName}`);

  config = await updateRuntimeState(config.id, {
    state: INSTANCE_STATES.STARTING,
    pid: null,
    exitCode: null,
    signal: null,
    failureReason: null,
    lastStartedAt: nowIso(),
  });

  let child;

  try {
    child = childProcess.spawn(config.executable, config.args, {
      cwd: workingDirectory,
      env: buildSpawnEnvironment(config),
      detached: false,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch {
    const failedConfig = await updateRuntimeState(config.id, {
      state: INSTANCE_STATES.FAILED,
      failureReason: "SPAWN_FAILED",
      lastStoppedAt: nowIso(),
    });

    return publicConfig(failedConfig);
  }

  runningProcesses.set(config.id, {
    child,
    startedAt: Date.now(),
    requestedStop: false,
    startupTimer: null,
  });

  if (!child.pid) {
    const failedConfig = await updateRuntimeState(config.id, {
      state: INSTANCE_STATES.FAILED,
      pid: null,
      failureReason: "SPAWN_FAILED",
      lastStoppedAt: nowIso(),
    });

    runningProcesses.delete(config.id);
    return publicConfig(failedConfig);
  }

  child.stdout.on("data", (chunk) => {
    appendLog(config.id, "stdout", chunk).catch(() => {});
    if (/Done \([^)]+\)!|For help, type|Timings Reset|Server marked as running/i.test(String(chunk))) {
      updateRuntimeState(config.id, {
        state: INSTANCE_STATES.RUNNING,
        pid: child.pid,
      }).catch(() => {});
    }
  });

  child.stderr.on("data", (chunk) => {
    appendLog(config.id, "stderr", chunk).catch(() => {});
  });

  child.on("error", () => {
    updateRuntimeState(config.id, {
      state: INSTANCE_STATES.FAILED,
      pid: null,
      failureReason: "PROCESS_ERROR",
      lastStoppedAt: nowIso(),
    }).catch(() => {});
  });

  child.on("exit", (exitCode, signal) => {
    const entry = runningProcesses.get(config.id);
    const requestedStop = entry?.requestedStop || false;

    if (entry?.startupTimer) {
      clearTimeout(entry.startupTimer);
    }

    runningProcesses.delete(config.id);
    metricsSamples.delete(config.id);

    const failed = !requestedStop && exitCode !== 0;
    updateRuntimeState(config.id, {
      state: failed ? INSTANCE_STATES.FAILED : INSTANCE_STATES.STOPPED,
      pid: null,
      exitCode,
      signal,
      failureReason: failed ? "PROCESS_EXITED" : null,
      lastStoppedAt: nowIso(),
    }).then((updatedConfig) => {
      appendLog(config.id, "stdout", `Stopped ${updatedConfig.displayName} exitCode=${exitCode ?? "null"} signal=${signal || "null"}`).catch(() => {});

      if (failed && (updatedConfig.restartPolicy === "always" || updatedConfig.restartPolicy === "on-failure")) {
        setTimeout(() => startInstance(config.id).catch(() => {}), 1000);
      } else if (!failed && updatedConfig.restartPolicy === "always" && !requestedStop) {
        setTimeout(() => startInstance(config.id).catch(() => {}), 1000);
      }
    }).catch(() => {});
  });

  const startupTimer = setTimeout(() => {
    const entry = runningProcesses.get(config.id);

    if (entry && child.exitCode === null && isProcessAlive(child.pid)) {
      updateRuntimeState(config.id, {
        state: INSTANCE_STATES.RUNNING,
        pid: child.pid,
      }).catch(() => {});
    }
  }, config.startupTimeoutMs);

  runningProcesses.set(config.id, {
    child,
    startedAt: Date.now(),
    requestedStop: false,
    startupTimer,
  });

  const updated = await updateRuntimeState(config.id, {
    state: INSTANCE_STATES.STARTING,
    pid: child.pid,
  });

  return publicConfig(updated);
}

async function writeInstanceInput(instanceId, input) {
  const config = await reconcileConfigState(await loadInstanceConfig(instanceId));
  const entry = runningProcesses.get(config.id);

  if (!entry?.child?.stdin || !entry.child.stdin.writable) {
    throw createInstanceError("INSTANCE_STDIN_UNAVAILABLE", 409);
  }

  const command = String(input || "");

  if (!command.trim() || command.includes("\0") || command.length > 4096) {
    throw createInstanceError("INVALID_COMMAND");
  }

  entry.child.stdin.write(command.endsWith("\n") ? command : `${command}\n`);
  await appendLog(config.id, "stdin", `> ${command.trim()}`);

  return {
    id: config.id,
    sent: true,
  };
}

async function forceKillInstance(instanceId) {
  const config = await reconcileConfigState(await loadInstanceConfig(instanceId));
  const entry = runningProcesses.get(config.id);
  const pid = entry?.child?.pid || config.pid;

  if (!pid || !isProcessAlive(pid)) {
    throw createInstanceError("INSTANCE_NOT_RUNNING", 409);
  }

  if (entry) {
    entry.requestedStop = true;
  }

  process.kill(pid, "SIGKILL");
  const updated = await updateRuntimeState(config.id, {
    state: INSTANCE_STATES.STOPPED,
    pid: null,
    signal: "SIGKILL",
    lastStoppedAt: nowIso(),
  });

  runningProcesses.delete(config.id);
  metricsSamples.delete(config.id);
  return publicConfig(updated);
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => resolve(false), timeoutMs);

    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function stopInstance(instanceId) {
  let config = await reconcileConfigState(await loadInstanceConfig(instanceId));
  const entry = runningProcesses.get(config.id);
  const pid = entry?.child?.pid || config.pid;

  if (!pid || !isProcessAlive(pid)) {
    config = await updateRuntimeState(config.id, {
      state: INSTANCE_STATES.STOPPED,
      pid: null,
      lastStoppedAt: config.lastStoppedAt || nowIso(),
    });
    return publicConfig(config);
  }

  await updateRuntimeState(config.id, {
    state: INSTANCE_STATES.STOPPING,
  });
  await appendLog(config.id, "stdout", `Stopping ${config.displayName}`);

  if (entry) {
    entry.requestedStop = true;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // The reconcile path below will correct stale PIDs.
  }

  const exited = entry ? await waitForExit(entry.child, config.shutdownTimeoutMs) : false;

  if (!exited && isProcessAlive(pid)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The process may have exited between checks.
    }
  }

  config = await updateRuntimeState(config.id, {
    state: INSTANCE_STATES.STOPPED,
    pid: null,
    lastStoppedAt: nowIso(),
  });

  runningProcesses.delete(config.id);
  metricsSamples.delete(config.id);

  return publicConfig(config);
}

async function restartInstance(instanceId) {
  const config = await loadInstanceConfig(instanceId);
  await updateRuntimeState(config.id, {
    state: INSTANCE_STATES.RESTARTING,
  });
  await stopInstance(config.id);
  return startInstance(config.id);
}

async function getStatus(instanceId) {
  return publicConfig(await reconcileConfigState(await loadInstanceConfig(instanceId)));
}

async function readRecentLines(filePath, lineLimit) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content.split(/\r?\n/).filter(Boolean).slice(-lineLimit).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {
          at: null,
          stream: path.basename(filePath, ".log"),
          message: redactLogLine(line),
        };
      }
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw createInstanceError("LOG_UNREADABLE", 500);
  }
}

async function readLogs(instanceId, options = {}) {
  const config = await loadInstanceConfig(instanceId);
  const limit = Math.min(validatePositiveInteger(options.limit, 200, MAX_LOG_LINES), MAX_LOG_LINES);
  const stream = String(options.stream || "all");
  const streams = stream === "all" ? ["stdin", "stdout", "stderr"] : [stream];

  if (!streams.every((entry) => entry === "stdin" || entry === "stdout" || entry === "stderr")) {
    throw createInstanceError("INVALID_LOG_STREAM");
  }

  const entries = (await Promise.all(streams.map((streamName) => {
    return readRecentLines(logPath(config.id, streamName), limit);
  }))).flat();

  return {
    id: config.id,
    entries: entries.sort((left, right) => String(left.at || "").localeCompare(String(right.at || ""))).slice(-limit),
  };
}

async function clearLogs(instanceId, options = {}) {
  const config = await loadInstanceConfig(instanceId);
  const stream = String(options.stream || "all");
  const streams = stream === "all" ? ["stdin", "stdout", "stderr"] : [stream];

  if (!streams.every((entry) => entry === "stdin" || entry === "stdout" || entry === "stderr")) {
    throw createInstanceError("INVALID_LOG_STREAM");
  }

  await Promise.all(streams.map((streamName) => fs.writeFile(logPath(config.id, streamName), "", { mode: 0o600 }).catch(() => {})));
  return {
    id: config.id,
    cleared: streams,
  };
}

async function listInstanceFiles(instanceId, requestedPath = ".") {
  const config = await loadInstanceConfig(instanceId);
  const resolved = resolveInstanceDataPath(config.id, requestedPath);
  await assertNoInstanceDataEscape(resolved);
  const stats = await fs.stat(resolved.path).catch((error) => {
    if (error?.code === "ENOENT") {
      throw createInstanceError("PATH_NOT_FOUND", 404);
    }

    throw createInstanceError("PATH_UNAVAILABLE", 400);
  });

  if (!stats.isDirectory()) {
    throw createInstanceError("PATH_NOT_DIRECTORY");
  }

  const entries = await fs.readdir(resolved.path, { withFileTypes: true });
  const normalizedEntries = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(resolved.path, entry.name);
    const entryStats = await fs.stat(entryPath).catch(() => null);

    return {
      name: entry.name,
      path: path.relative(resolved.root, entryPath) || ".",
      type: entry.isDirectory() ? "directory" : "file",
      isDirectory: entry.isDirectory(),
      size: entryStats?.size ?? null,
      modifiedAt: entryStats?.mtime?.toISOString?.() || null,
    };
  }));

  return {
    id: config.id,
    currentPath: resolved.relativePath,
    entries: normalizedEntries.sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) {
        return left.isDirectory ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    }),
  };
}

async function readInstanceFile(instanceId, requestedPath) {
  const config = await loadInstanceConfig(instanceId);
  const resolved = resolveInstanceDataPath(config.id, requestedPath);
  await assertNoInstanceDataEscape(resolved);
  const stats = await fs.stat(resolved.path).catch((error) => {
    if (error?.code === "ENOENT") {
      throw createInstanceError("PATH_NOT_FOUND", 404);
    }

    throw createInstanceError("PATH_UNAVAILABLE", 400);
  });

  if (!stats.isFile()) {
    throw createInstanceError("PATH_NOT_FILE");
  }

  if (stats.size > 1024 * 1024) {
    return {
      id: config.id,
      path: resolved.relativePath,
      supported: false,
      reason: "file_too_large",
      content: "",
    };
  }

  return {
    id: config.id,
    path: resolved.relativePath,
    supported: true,
    content: await fs.readFile(resolved.path, "utf8"),
  };
}

async function writeInstanceFile(instanceId, requestedPath, content, options = {}) {
  const config = await loadInstanceConfig(instanceId);
  const resolved = resolveInstanceDataPath(config.id, requestedPath);
  await assertNoInstanceDataEscape(resolved, { forWrite: true });
  const encoding = options && options.encoding === "base64" ? "base64" : "utf8";
  const payload = encoding === "base64"
    ? Buffer.from(String(content || ""), "base64")
    : String(content ?? "");
  await fs.mkdir(path.dirname(resolved.path), { recursive: true });
  await fs.writeFile(resolved.path, payload, encoding === "base64" ? undefined : "utf8");
  return {
    id: config.id,
    path: resolved.relativePath,
    saved: true,
  };
}

async function createInstanceFolder(instanceId, requestedPath) {
  const config = await loadInstanceConfig(instanceId);
  const resolved = resolveInstanceDataPath(config.id, requestedPath);
  await assertNoInstanceDataEscape(resolved, { forWrite: true });
  await fs.mkdir(resolved.path, { recursive: true });
  return {
    id: config.id,
    path: resolved.relativePath,
    created: true,
  };
}

async function renameInstanceFile(instanceId, fromPath, toPath) {
  const config = await loadInstanceConfig(instanceId);
  const from = resolveInstanceDataPath(config.id, fromPath);
  const to = resolveInstanceDataPath(config.id, toPath);
  await assertNoInstanceDataEscape(from);
  await assertNoInstanceDataEscape(to, { forWrite: true });
  await fs.mkdir(path.dirname(to.path), { recursive: true });
  await fs.rename(from.path, to.path);
  return {
    id: config.id,
    oldPath: from.relativePath,
    path: to.relativePath,
    renamed: true,
  };
}

async function deleteInstanceFile(instanceId, requestedPath) {
  const config = await loadInstanceConfig(instanceId);
  const resolved = resolveInstanceDataPath(config.id, requestedPath);
  await assertNoInstanceDataEscape(resolved);

  if (resolved.relativePath === ".") {
    throw createInstanceError("PATH_NOT_ALLOWED", 403);
  }

  await fs.rm(resolved.path, { recursive: true, force: true });
  return {
    id: config.id,
    path: resolved.relativePath,
    deleted: true,
  };
}

function parseProperties(content) {
  return String(content || "").split(/\r?\n/).reduce((properties, line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return properties;
    }

    const index = trimmed.indexOf("=");

    if (index > 0) {
      properties[trimmed.slice(0, index)] = trimmed.slice(index + 1);
    }

    return properties;
  }, {});
}

function serializeProperties(properties) {
  return Object.entries(properties || {})
    .filter(([key]) => /^[a-z0-9_.-]+$/i.test(key))
    .map(([key, value]) => `${key}=${String(value ?? "")}`)
    .join("\n");
}

async function readMinecraftProperties(instanceId) {
  try {
    const file = await readInstanceFile(instanceId, "server.properties");
    return {
      id: file.id,
      path: file.path,
      properties: parseProperties(file.content),
    };
  } catch (error) {
    if (error?.code === "PATH_NOT_FOUND") {
      return {
        id: validateInstanceId(instanceId),
        path: "server.properties",
        properties: {},
      };
    }

    throw error;
  }
}

async function writeMinecraftProperties(instanceId, properties) {
  const existing = await readMinecraftProperties(instanceId);
  const next = {
    ...existing.properties,
    ...(properties && typeof properties === "object" && !Array.isArray(properties) ? properties : {}),
  };

  await writeInstanceFile(instanceId, "server.properties", `${serializeProperties(next)}\n`);
  return {
    id: validateInstanceId(instanceId),
    path: "server.properties",
    properties: next,
    saved: true,
  };
}

function readProcStat(pid) {
  try {
    const stat = fsSync.readFileSync(`/proc/${pid}/stat`, "utf8");
    const parts = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return {
      utime: Number.parseInt(parts[11], 10) || 0,
      stime: Number.parseInt(parts[12], 10) || 0,
      rssPages: Number.parseInt(parts[21], 10) || 0,
    };
  } catch {
    return null;
  }
}

function readTotalCpuTicks() {
  try {
    const firstLine = fsSync.readFileSync("/proc/stat", "utf8").split(/\r?\n/)[0];
    return firstLine.split(/\s+/).slice(1).reduce((total, value) => total + (Number.parseInt(value, 10) || 0), 0);
  } catch {
    return null;
  }
}

async function getDirectorySizeBytes(rootPath) {
  let total = 0;

  async function walk(currentPath) {
    let entries;

    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      try {
        const stats = await fs.stat(entryPath);
        total += stats.size;

        if (entry.isDirectory()) {
          await walk(entryPath);
        }
      } catch {
        // Skip files that disappear while metrics are collected.
      }
    }
  }

  await walk(rootPath);
  return total;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const done = (open) => {
      socket.destroy();
      resolve({
        port,
        open,
      });
    };

    socket.setTimeout(PORT_CONNECT_TIMEOUT_MS);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function getMetrics(instanceId) {
  const config = await reconcileConfigState(await loadInstanceConfig(instanceId));
  const pid = config.pid && isProcessAlive(config.pid) ? config.pid : null;
  const procStat = pid ? readProcStat(pid) : null;
  const totalCpuTicks = pid ? readTotalCpuTicks() : null;
  const previousSample = metricsSamples.get(config.id);
  const processTicks = procStat ? procStat.utime + procStat.stime : null;
  let cpuPercent = null;

  if (previousSample && processTicks !== null && totalCpuTicks !== null) {
    const processDelta = processTicks - previousSample.processTicks;
    const totalDelta = totalCpuTicks - previousSample.totalCpuTicks;

    if (totalDelta > 0) {
      cpuPercent = Math.max(0, (processDelta / totalDelta) * os.cpus().length * 100);
    }
  }

  if (processTicks !== null && totalCpuTicks !== null) {
    metricsSamples.set(config.id, {
      processTicks,
      totalCpuTicks,
      sampledAt: Date.now(),
    });
  }

  const startedAt = config.lastStartedAt ? Date.parse(config.lastStartedAt) : null;

  return {
    id: config.id,
    state: config.state,
    pid,
    uptimeSeconds: pid && startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0,
    cpuPercent,
    cpuSeconds: processTicks === null ? null : processTicks / PROC_STAT_TICKS_PER_SECOND,
    memoryRssBytes: procStat ? procStat.rssPages * PAGE_SIZE_BYTES : null,
    diskBytes: await getDirectorySizeBytes(instancePath(config.id)),
    ports: await Promise.all((config.ports || []).map(checkPort)),
  };
}

module.exports = {
  INSTANCE_STATES,
  INSTANCE_TYPES: [...INSTANCE_TYPES],
  createInstance,
  deleteInstance,
  clearLogs,
  createInstanceFolder,
  deleteInstanceFile,
  forceKillInstance,
  getMetrics,
  getStatus,
  listInstanceFiles,
  listInstances,
  readInstanceFile,
  readLogs,
  readMinecraftProperties,
  renameInstanceFile,
  restartInstance,
  startInstance,
  stopInstance,
  updateInstance,
  writeInstanceFile,
  writeInstanceInput,
  writeMinecraftProperties,
};
