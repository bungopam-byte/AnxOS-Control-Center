const { execFile } = require("child_process");
const fs = require("fs/promises");
const path = require("path");

const COMMAND_TIMEOUT_MS = 8000;
const LOG_TIMEOUT_MS = 12000;
const SNAPSHOT_OPTIONAL_TIMEOUT_MS = 2500;
const CONTAINER_TARGET_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
const IMAGE_TARGET_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:/@-]{0,255}$/;

class DockerServiceError extends Error {
  constructor(message, code = "DOCKER_COMMAND_FAILED", statusCode = 502, detail = null) {
    super(message);
    this.name = "DockerServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

function exec(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true, ...options }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        exitCode: error ? (typeof error.code === "number" ? error.code : null) : 0,
        stdout: stdout ? stdout.trim() : "",
        stderr: stderr ? stderr.trim() : "",
        resolvedExecutablePath: command,
      });
    });
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getPathCandidates(executableName) {
  return (process.env.PATH || "")
    .split(path.delimiter)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((dir) => path.join(dir, executableName));
}

function getWindowsDockerCandidates() {
  return unique([
    ...getPathCandidates("docker.exe"),
    "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
  ]);
}

async function resolveDockerExecutable() {
  const checks = [];

  if (process.platform === "win32") {
    for (const candidate of getWindowsDockerCandidates()) {
      const found = await pathExists(candidate);
      checks.push({ path: candidate, found });
      if (found) {
        return { executablePath: candidate, found: true, checks };
      }
    }
    return { executablePath: "docker", found: true, checks };
  }

  const candidates = unique([
    process.env.DOCKER_BINARY,
    ...getPathCandidates("docker"),
    "/usr/bin/docker",
    "/usr/local/bin/docker",
    "/bin/docker",
    "/snap/bin/docker",
  ]);

  for (const candidate of candidates) {
    const found = await pathExists(candidate);
    checks.push({ path: candidate, found });
    if (found) {
      return { executablePath: candidate, found: true, checks };
    }
  }

  return { executablePath: "docker", found: false, checks };
}

function parseDockerVersion(output) {
  const match = String(output || "").match(/Docker version\s+([^,\s]+)/i);
  return match?.[1] || null;
}

function classifyDockerFailure(result) {
  const output = `${result?.stdout || ""}\n${result?.stderr || ""}`;
  const errorCode = String(result?.errorCode || "");

  if (/ENOENT/i.test(errorCode) || /not recognized|command not found|no such file/i.test(output)) {
    return new DockerServiceError("Docker is not installed or is not available on PATH for this node.", "DOCKER_NOT_INSTALLED", 503, output.trim() || null);
  }

  if (/permission denied|got permission denied|access is denied|requires elevated privileges|connect: operation not permitted/i.test(output)) {
    const socketRelated = /docker\.sock|\/\/\.\/pipe\/docker|docker_engine|daemon socket|var\/run\/docker/i.test(output);
    return new DockerServiceError(
      socketRelated
        ? "Docker is running, but the Agent process cannot access the Docker socket."
        : "Docker is installed, but this user does not have permission to access it.",
      socketRelated ? "DOCKER_SOCKET_PERMISSION_DENIED" : "DOCKER_PERMISSION_DENIED",
      403,
      output.trim() || null,
    );
  }

  if (/cannot connect|is the docker daemon running|error during connect|docker daemon is not running|open \/\/\.\/pipe\/docker|Cannot connect to the Docker daemon/i.test(output)) {
    const socketUnavailable = /docker\.sock|\/\/\.\/pipe\/docker|docker_engine|var\/run\/docker/i.test(output);
    return new DockerServiceError(
      socketUnavailable
        ? "Docker is installed, but the Agent process cannot reach the Docker socket."
        : "Docker is installed, but the Docker daemon is not running or is unavailable on this node.",
      socketUnavailable ? "DOCKER_SOCKET_UNAVAILABLE" : "DOCKER_SERVICE_UNREACHABLE",
      503,
      output.trim() || null,
    );
  }

  return new DockerServiceError("Docker command failed.", "DOCKER_COMMAND_FAILED", 502, output.trim() || null);
}

function inferState(status) {
  if (/^up\b|running/i.test(status || "")) {
    return "running";
  }
  if (/created/i.test(status || "")) {
    return "created";
  }
  if (/exited|dead|paused|restarting|removing|stopped/i.test(status || "")) {
    return "stopped";
  }
  return status || null;
}

function normalizeName(value) {
  if (Array.isArray(value)) {
    return normalizeName(value[0]);
  }
  return typeof value === "string" ? value.replace(/^\/+/, "").trim() : "";
}

function cleanPortProtocol(value) {
  const protocol = String(value || "tcp").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return protocol || "tcp";
}

function cleanPortNumber(value) {
  const port = Number.parseInt(String(value || "").trim(), 10);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? String(port) : null;
}

function normalizePortEntry(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    const publicPort = cleanPortNumber(value.PublicPort || value.publicPort);
    const privatePort = cleanPortNumber(value.PrivatePort || value.privatePort);
    const type = cleanPortProtocol(value.Type || value.type);
    const port = publicPort || privatePort;
    return port ? `${port}/${type}` : null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const arrowMatch = raw.match(/(?:^|:)(\d{1,5})->\d{1,5}\/([a-z0-9]+)/i);
  if (arrowMatch) {
    const port = cleanPortNumber(arrowMatch[1]);
    return port ? `${port}/${cleanPortProtocol(arrowMatch[2])}` : null;
  }

  const exposedMatch = raw.match(/(?:^|,|\s)(\d{1,5})\/([a-z0-9]+)/i);
  if (exposedMatch) {
    const port = cleanPortNumber(exposedMatch[1]);
    return port ? `${port}/${cleanPortProtocol(exposedMatch[2])}` : null;
  }

  return null;
}

function normalizePortBindings(value) {
  const entries = Array.isArray(value)
    ? value
    : String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  return unique(entries.map(normalizePortEntry)).filter(Boolean);
}

function parseJsonLines(output, normalizer) {
  if (!output) {
    return [];
  }
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return normalizer(JSON.parse(line));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalizeContainer(container) {
  const status = container.Status || container.State || null;
  const rawPorts = container.Ports || null;
  return {
    id: container.ID || container.Id || null,
    name: normalizeName(container.Names || container.Name) || null,
    image: container.Image || null,
    command: container.Command || null,
    createdAt: container.CreatedAt || container.Created || null,
    status,
    state: container.State || inferState(status),
    ports: normalizePortBindings(rawPorts),
    rawPorts,
    runningFor: container.RunningFor || status,
    stats: null,
  };
}

function normalizeImage(image) {
  return {
    id: image.ID || image.Id || null,
    repository: image.Repository || null,
    tag: image.Tag || null,
    digest: image.Digest || null,
    createdAt: image.CreatedAt || image.CreatedSince || null,
    size: image.Size || null,
  };
}

function normalizeNetwork(network) {
  return {
    id: network.ID || network.Id || null,
    name: network.Name || null,
    driver: network.Driver || null,
    scope: network.Scope || null,
    ipv6: network.IPv6 || null,
    internal: network.Internal || null,
  };
}

function normalizeVolume(volume) {
  return {
    name: volume.Name || null,
    driver: volume.Driver || null,
    mountpoint: volume.Mountpoint || null,
    scope: volume.Scope || null,
    size: volume.Size || null,
  };
}

function parseMemoryUsage(value) {
  if (!value || typeof value !== "string") {
    return { usage: null, limit: null, raw: null };
  }
  const [usage, limit] = value.split(/\s*\/\s*/);
  return { usage: usage || null, limit: limit || null, raw: value };
}

function parseNetworkIo(value) {
  if (!value || typeof value !== "string") {
    return { rx: null, tx: null, raw: null };
  }
  const [rx, tx] = value.split(/\s*\/\s*/);
  return { rx: rx || null, tx: tx || null, raw: value };
}

function normalizeStats(stats) {
  const memory = parseMemoryUsage(stats.MemUsage ?? stats.MemUsageRaw ?? stats.memoryRaw ?? stats.memoryUsageRaw);
  const network = parseNetworkIo(stats.NetIO ?? stats.NetIORaw ?? stats.networkRaw);
  return {
    id: stats.ID || stats.Container || null,
    container: stats.Container || null,
    name: normalizeName(stats.Name) || null,
    cpuPercent: stats.CPUPerc ?? stats.CPUPercRaw ?? stats.CPUPercent ?? stats.cpuPercent ?? null,
    memoryUsage: memory.usage,
    memoryLimit: memory.limit,
    memoryRaw: memory.raw,
    memoryPercent: stats.MemPerc ?? stats.MemPercRaw ?? stats.MemoryPercent ?? stats.memoryPercent ?? null,
    networkRx: network.rx,
    networkTx: network.tx,
    networkRaw: network.raw,
    blockIo: stats.BlockIO || null,
    pids: stats.PIDs || null,
  };
}

function parseStatsTable(output) {
  if (!output) {
    return [];
  }
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s{2,}/);
      if (parts.length < 4) {
        return null;
      }
      return normalizeStats({
        ID: parts[0],
        Name: parts[1],
        CPUPerc: parts[2],
        MemUsage: parts[3],
        MemPerc: parts[4] || null,
        NetIO: parts[5] || null,
      });
    })
    .filter(Boolean);
}

function isMatchingId(left, right) {
  if (!left || !right) {
    return false;
  }
  const a = String(left).toLowerCase();
  const b = String(right).toLowerCase();
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function attachStats(containers, statsList) {
  return containers.map((container) => {
    const byName = statsList.find((stats) => stats.name && container.name && stats.name.toLowerCase() === container.name.toLowerCase());
    const byId = byName || statsList.find((stats) => isMatchingId(container.id, stats.id) || isMatchingId(container.id, stats.container));
    return { ...container, stats: byName || byId || null };
  });
}

function validateContainerTarget(value) {
  const target = String(value || "").trim();
  if (!CONTAINER_TARGET_PATTERN.test(target)) {
    throw new DockerServiceError("Invalid container target.", "INVALID_CONTAINER_TARGET", 400);
  }
  return target;
}

function validateImageTarget(value) {
  const target = String(value || "").trim();
  if (!IMAGE_TARGET_PATTERN.test(target) || /[;&|`$<>\\\0]/.test(target)) {
    throw new DockerServiceError("Invalid Docker image target.", "INVALID_IMAGE_TARGET", 400);
  }
  return target;
}

function validateImage(value) {
  const image = String(value || "").trim();
  if (!image || image.includes("\0") || /[;&|`$<>\\]/.test(image) || image.length > 256) {
    throw new DockerServiceError("Invalid Docker image.", "INVALID_DOCKER_IMAGE", 400);
  }
  return image;
}

function normalizeStringArray(value, maxItems = 64) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new DockerServiceError("Invalid Docker arguments.", "INVALID_DOCKER_ARGS", 400);
  }
  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function normalizePorts(value) {
  return normalizeStringArray(value, 32).filter((entry) => /^\d{1,5}:\d{1,5}(\/(?:tcp|udp))?$/i.test(entry));
}

function normalizeRestartPolicy(value) {
  const policy = String(value || "unless-stopped").trim();
  return ["no", "always", "unless-stopped", "on-failure"].includes(policy) ? policy : "unless-stopped";
}

async function getDockerExecutableOrThrow() {
  const executable = await resolveDockerExecutable();
  if (!executable.found && process.platform !== "win32") {
    throw new DockerServiceError("Docker is not installed or is not available on PATH for this node.", "DOCKER_NOT_INSTALLED", 503);
  }
  return executable.executablePath;
}

async function runDockerCommandWithExecutable(dockerPath, args, options = {}) {
  const result = await exec(dockerPath, args, options);
  if (!result.ok) {
    throw classifyDockerFailure(result);
  }
  return result;
}

async function runDockerCommand(args, options = {}) {
  const dockerPath = await getDockerExecutableOrThrow();
  return runDockerCommandWithExecutable(dockerPath, args, options);
}

async function probeDocker() {
  const executable = await resolveDockerExecutable();
  const versionResult = executable.found
    ? await exec(executable.executablePath, ["--version"])
    : { ok: false, errorCode: "DOCKER_MISSING", stdout: "", stderr: "", resolvedExecutablePath: executable.executablePath };
  const installed = versionResult.ok && Boolean(versionResult.stdout);
  const infoResult = installed
    ? await exec(executable.executablePath, ["info"])
    : { ok: false, errorCode: "DOCKER_MISSING", stdout: "", stderr: "", resolvedExecutablePath: executable.executablePath };
  const daemonRunning = installed && infoResult.ok;
  const unavailableError = installed && !daemonRunning ? classifyDockerFailure(infoResult) : null;

  return {
    executable,
    installed,
    daemonRunning,
    dockerVersion: parseDockerVersion(versionResult.stdout),
    version: parseDockerVersion(versionResult.stdout),
    message: !installed
      ? "Docker is not installed or is not available on PATH for this node."
      : daemonRunning
        ? "Docker is available."
        : unavailableError.message,
    errorCode: !installed ? "DOCKER_NOT_INSTALLED" : daemonRunning ? null : unavailableError.code,
  };
}

async function ensureDockerAvailable() {
  const status = await probeDocker();
  if (!status.installed) {
    throw new DockerServiceError(status.message, "DOCKER_NOT_INSTALLED", 503);
  }
  if (!status.daemonRunning) {
    throw new DockerServiceError(status.message, status.errorCode || "DOCKER_DAEMON_UNAVAILABLE", status.errorCode === "DOCKER_PERMISSION_DENIED" ? 403 : 503);
  }
  return status;
}

async function listContainersRaw(options = {}) {
  const dockerPath = options.dockerPath || await getDockerExecutableOrThrow();
  const result = await runDockerCommandWithExecutable(dockerPath, ["ps", "-a", "--format", "json"], {
    timeout: options.timeoutMs || COMMAND_TIMEOUT_MS,
  });
  return parseJsonLines(result.stdout, normalizeContainer);
}

async function listStatsRaw(target = null, options = {}) {
  const dockerPath = options.dockerPath || await getDockerExecutableOrThrow();
  const args = ["stats", "--no-stream", "--format", "json"];
  if (target) {
    args.push(validateContainerTarget(target));
  }
  const result = await runDockerCommandWithExecutable(dockerPath, args, {
    timeout: options.timeoutMs || COMMAND_TIMEOUT_MS,
  });
  const parsed = parseJsonLines(result.stdout, normalizeStats);
  return parsed.length > 0 ? parsed : parseStatsTable(result.stdout);
}

async function listImagesRaw(options = {}) {
  const dockerPath = options.dockerPath || await getDockerExecutableOrThrow();
  const result = await runDockerCommandWithExecutable(dockerPath, ["images", "--digests", "--format", "json"], {
    timeout: options.timeoutMs || COMMAND_TIMEOUT_MS,
  });
  return parseJsonLines(result.stdout, normalizeImage);
}

async function listNetworksRaw(options = {}) {
  const dockerPath = options.dockerPath || await getDockerExecutableOrThrow();
  const result = await runDockerCommandWithExecutable(dockerPath, ["network", "ls", "--format", "json"], {
    timeout: options.timeoutMs || COMMAND_TIMEOUT_MS,
  });
  return parseJsonLines(result.stdout, normalizeNetwork);
}

async function listVolumesRaw(options = {}) {
  const dockerPath = options.dockerPath || await getDockerExecutableOrThrow();
  const result = await runDockerCommandWithExecutable(dockerPath, ["volume", "ls", "--format", "json"], {
    timeout: options.timeoutMs || COMMAND_TIMEOUT_MS,
  });
  return parseJsonLines(result.stdout, normalizeVolume);
}

function summarizeContainers(containers) {
  const runningContainers = containers.filter((container) => /^running$/i.test(container.state || "") || /^up\b/i.test(container.status || ""));
  return {
    runningContainers: runningContainers.length,
    stoppedContainers: Math.max(containers.length - runningContainers.length, 0),
    totalContainers: containers.length,
  };
}

async function getDockerSnapshot() {
  const status = await probeDocker();
  if (!status.installed || !status.daemonRunning) {
    return {
      ...status,
      images: 0,
      imageCount: 0,
      volumeCount: 0,
      containers: [],
      summary: {
        installed: status.installed,
        daemonRunning: status.daemonRunning,
        runningContainers: 0,
        stoppedContainers: 0,
        totalContainers: 0,
        images: 0,
        volumes: 0,
      },
      lastCheckedAt: new Date().toISOString(),
    };
  }

  const dockerPath = status.executable?.executablePath || await getDockerExecutableOrThrow();
  const optionalSnapshotOptions = { dockerPath, timeoutMs: SNAPSHOT_OPTIONAL_TIMEOUT_MS };
  const [containers, stats, images, volumes] = await Promise.all([
    listContainersRaw({ dockerPath }),
    listStatsRaw(null, optionalSnapshotOptions).catch(() => []),
    listImagesRaw(optionalSnapshotOptions).catch(() => []),
    listVolumesRaw(optionalSnapshotOptions).catch(() => []),
  ]);
  const containersWithStats = attachStats(containers, stats);
  const containerSummary = summarizeContainers(containersWithStats);

  return {
    ...status,
    images: images.length,
    imageCount: images.length,
    volumeCount: volumes.length,
    containers: containersWithStats,
    summary: {
      installed: status.installed,
      daemonRunning: status.daemonRunning,
      ...containerSummary,
      images: images.length,
      volumes: volumes.length,
    },
    lastCheckedAt: new Date().toISOString(),
  };
}

async function getDockerSummary() {
  const snapshot = await getDockerSnapshot();
  return {
    installed: snapshot.installed,
    daemonRunning: snapshot.daemonRunning,
    runningContainers: snapshot.summary.runningContainers,
    stoppedContainers: snapshot.summary.stoppedContainers,
    totalContainers: snapshot.summary.totalContainers,
    images: snapshot.summary.images,
    volumes: snapshot.summary.volumes,
    dockerVersion: snapshot.dockerVersion,
    message: snapshot.message,
  };
}

async function getDockerContainers() {
  const snapshot = await getDockerSnapshot();
  return {
    installed: snapshot.installed,
    daemonRunning: snapshot.daemonRunning,
    dockerVersion: snapshot.dockerVersion,
    message: snapshot.message,
    containers: snapshot.containers,
  };
}

async function inspectContainer(container) {
  const target = validateContainerTarget(container);
  const result = await runDockerCommand(["inspect", target]);
  return { container: target, inspect: JSON.parse(result.stdout || "[]") };
}

async function createContainer(payload = {}) {
  const name = validateContainerTarget(payload.name || `anxhub-${Date.now()}`);
  const image = validateImage(payload.image);
  const args = ["create", "--name", name, "--restart", normalizeRestartPolicy(payload.restartPolicy)];
  normalizePorts(payload.ports).forEach((port) => args.push("-p", port));
  if (payload.memory) {
    args.push("--memory", String(payload.memory));
  }
  if (payload.cpus) {
    args.push("--cpus", String(payload.cpus));
  }
  args.push(image, ...normalizeStringArray(payload.command, 64));
  const result = await runDockerCommand(args);
  if (payload.start === true) {
    await runDockerCommand(["start", name]);
  }
  return { container: { id: result.stdout || name, name, image, started: payload.start === true } };
}

async function startContainer(container) {
  const target = validateContainerTarget(container);
  await runDockerCommand(["start", target]);
  return { container: target, action: "start" };
}

async function stopContainer(container) {
  const target = validateContainerTarget(container);
  await runDockerCommand(["stop", target]);
  return { container: target, action: "stop" };
}

async function restartContainer(container) {
  const target = validateContainerTarget(container);
  await runDockerCommand(["restart", target]);
  return { container: target, action: "restart" };
}

async function deleteContainer(container) {
  const target = validateContainerTarget(container);
  await runDockerCommand(["rm", "-f", target]);
  return { container: target, deleted: true };
}

async function removeImage(image) {
  const target = validateImageTarget(image);
  await runDockerCommand(["rmi", target]);
  return { image: target, deleted: true };
}

async function getContainerLogs(container, options = {}) {
  const target = validateContainerTarget(container);
  const tail = Number.parseInt(options.tail, 10);
  const result = await runDockerCommand(
    ["logs", "--tail", String(Number.isFinite(tail) ? Math.min(Math.max(tail, 1), 2000) : 300), target],
    { timeout: LOG_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 2 },
  );
  return { container: target, logs: result.stdout };
}

async function getContainerStats(container) {
  const target = validateContainerTarget(container);
  const stats = await listStatsRaw(target);
  const inspect = await inspectContainer(target).catch(() => null);
  const state = Array.isArray(inspect?.inspect) ? inspect.inspect[0]?.State : null;
  return {
    container: target,
    stats: stats[0] || null,
    status: state?.Status || null,
    uptime: state?.StartedAt || null,
  };
}

async function listImages() {
  return { images: await listImagesRaw() };
}

async function listNetworks() {
  return { networks: await listNetworksRaw() };
}

async function listVolumes() {
  return { volumes: await listVolumesRaw() };
}

module.exports = {
  DockerServiceError,
  attachStats,
  createContainer,
  deleteContainer,
  getContainerLogs,
  getContainerStats,
  getDockerContainers,
  getDockerSnapshot,
  getDockerSummary,
  inspectContainer,
  listImages,
  listNetworks,
  listVolumes,
  normalizeContainer,
  normalizePortBindings,
  normalizeStats,
  parseJsonLines,
  removeImage,
  resolveDockerExecutable,
  restartContainer,
  startContainer,
  stopContainer,
};
