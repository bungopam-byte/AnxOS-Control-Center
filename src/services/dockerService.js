const { execFile } = require("child_process");
const fs = require("fs/promises");
const path = require("path");

const COMMAND_TIMEOUT_MS = 3500;

function exec(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true, ...options }, (error, stdout, stderr) => {
      const result = {
        ok: !error,
        errorCode: error?.code || error?.name || null,
        exitCode: error ? (typeof error.code === "number" ? error.code : null) : 0,
        stdout: stdout ? stdout.trim() : "",
        stderr: stderr ? stderr.trim() : "",
        resolvedExecutablePath: command,
      };

      console.info(
        JSON.stringify({
          scope: "docker",
          command: [command, ...args].join(" "),
          resolvedExecutablePath: command,
          ok: result.ok,
          exitCode: result.exitCode,
          errorCode: result.errorCode,
          stdout: result.stdout,
          stderr: result.stderr,
          path: process.env.PATH || "",
        }),
      );

      resolve(result);
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
  const pathDirs = (process.env.PATH || "")
    .split(path.delimiter)
    .map((part) => part.trim())
    .filter(Boolean);

  return pathDirs.map((dir) => path.join(dir, executableName));
}

function getWindowsDockerCandidates() {
  return unique([
    ...getPathCandidates("docker.exe"),
    "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
  ]);
}

async function resolveWindowsDockerExecutable() {
  const candidates = getWindowsDockerCandidates();
  const checks = [];

  for (const candidate of candidates) {
    const found = await pathExists(candidate);
    checks.push({
      path: candidate,
      found,
      method: candidate.includes("Program Files") ? "Docker Desktop path" : "PATH docker.exe",
    });

    if (found) {
      return {
        executablePath: candidate,
        found: true,
        detectedBy: candidate.includes("Program Files") ? "Docker Desktop path" : "PATH docker.exe",
        checks,
      };
    }
  }

  return {
    executablePath: "docker",
    found: true,
    detectedBy: "fallback docker",
    checks,
  };
}

async function resolveDockerExecutable() {
  if (process.platform === "win32") {
    return resolveWindowsDockerExecutable();
  }

  const executableName = process.platform === "win32" ? "docker.exe" : "docker";
  const candidates = unique([
    process.env.DOCKER_BINARY,
    ...getPathCandidates(executableName),
    process.platform === "win32" ? null : "/usr/bin/docker",
    process.platform === "win32" ? null : "/usr/local/bin/docker",
    process.platform === "win32" ? null : "/bin/docker",
    process.platform === "win32" ? null : "/snap/bin/docker",
  ]);
  const checks = [];

  for (const candidate of candidates) {
    const found = await pathExists(candidate);
    checks.push({
      path: candidate,
      found,
      method: candidate === process.env.DOCKER_BINARY ? "DOCKER_BINARY" : "PATH/common path",
    });

    if (found) {
      return {
        executablePath: candidate,
        found: true,
        detectedBy: candidate === process.env.DOCKER_BINARY ? "DOCKER_BINARY" : "PATH/common path",
        checks,
      };
    }
  }

  return {
    executablePath: "docker",
    found: false,
    detectedBy: null,
    checks,
  };
}

function buildCommandDiagnostic(command, result) {
  return {
    command,
    ok: result.ok,
    errorCode: result.errorCode,
    exitCode: result.exitCode,
    resolvedExecutablePath: result.resolvedExecutablePath,
    hasOutput: Boolean(result.stdout || result.stderr),
    stdout: result.stdout,
    stderr: result.stderr,
    message: result.ok ? null : (result.stderr || result.stdout || null),
  };
}

function parseDockerVersion(output) {
  const match = output.match(/Docker version\s+([^,\s]+)/i);
  return match?.[1] || null;
}

function isDaemonRunning(result) {
  if (result.ok) {
    return true;
  }

  const output = `${result.stdout}\n${result.stderr}`;

  if (/permission denied|cannot connect|is the docker daemon running|connect: operation not permitted/i.test(output)) {
    return false;
  }

  return false;
}

function parseJsonContainers(output) {
  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return normalizeJsonContainer(JSON.parse(line));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function parseDockerStatsTable(output) {
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

      return normalizeDockerStats({
        ID: parts[0] || null,
        Name: parts[1] || null,
        CPUPerc: parts[2] || null,
        MemUsage: parts[3] || null,
      });
    })
    .filter(Boolean);
}

function parseTableContainers(output) {
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

      if (parts.length < 6) {
        return null;
      }

      return {
        id: parts[0] || null,
        image: parts[1] || null,
        command: parts[2] || null,
        createdAt: parts[3] || null,
        status: parts[4] || null,
        state: inferState(parts[4]),
        ports: parts[5] || null,
        name: parts[6] || null,
        runningFor: parts[4] || null,
      };
    })
    .filter(Boolean);
}

function inferState(status) {
  if (/^up\b/i.test(status || "")) {
    return "running";
  }

  if (/exited|created|dead|paused|restarting|removing/i.test(status || "")) {
    return "stopped";
  }

  return status || null;
}

function parseMemoryUsage(value) {
  if (!value || typeof value !== "string") {
    return {
      usage: null,
      limit: null,
      raw: null,
    };
  }

  const [usage, limit] = value.split(/\s*\/\s*/);

  return {
    usage: usage || null,
    limit: limit || null,
    raw: value,
  };
}

function normalizeJsonContainer(container) {
  const status = container.Status || container.State || null;

  return {
    id: container.ID || container.Id || null,
    name: container.Names || container.Names?.[0] || container.Name || null,
    image: container.Image || null,
    command: container.Command || null,
    createdAt: container.CreatedAt || container.Created || null,
    status,
    state: container.State || inferState(status),
    ports: container.Ports || null,
    runningFor: status,
  };
}

function normalizeDockerStats(stats) {
  const memory = parseMemoryUsage(stats.MemUsage);

  return {
    id: stats.ID || stats.Container || null,
    container: stats.Container || null,
    name: stats.Name || null,
    cpuPercent: stats.CPUPerc || null,
    memoryUsage: memory.usage,
    memoryLimit: memory.limit,
    memoryRaw: memory.raw,
  };
}

function normalizeContainerName(value) {
  return typeof value === "string" ? value.replace(/^\/+/, "").trim() : "";
}

function addStatsKey(map, key, stats) {
  if (key) {
    map.set(key.toLowerCase(), stats);
  }
}

function buildStatsNameMap(statsList) {
  const map = new Map();

  statsList.forEach((stats) => {
    addStatsKey(map, normalizeContainerName(stats.name), stats);
  });

  return map;
}

function isMatchingContainerId(containerId, statsId) {
  if (!containerId || !statsId) {
    return false;
  }

  const normalizedContainerId = String(containerId).toLowerCase();
  const normalizedStatsId = String(statsId).toLowerCase();

  return normalizedContainerId === normalizedStatsId
    || normalizedContainerId.startsWith(normalizedStatsId)
    || normalizedStatsId.startsWith(normalizedContainerId);
}

function findContainerStats(container, statsList, statsNameMap) {
  const nameMatch = statsNameMap.get(normalizeContainerName(container.name).toLowerCase());

  if (nameMatch) {
    return nameMatch;
  }

  return statsList.find((stats) => {
    return isMatchingContainerId(container.id, stats.id) || isMatchingContainerId(container.id, stats.container);
  }) || null;
}

function attachContainerStats(containers, statsList) {
  const statsNameMap = buildStatsNameMap(statsList);

  return containers.map((container) => ({
    ...container,
    stats: findContainerStats(container, statsList, statsNameMap),
  }));
}

async function listContainers(dockerPath) {
  const jsonResult = await exec(dockerPath, ["ps", "-a", "--format", "json"]);
  const diagnostics = [buildCommandDiagnostic("docker ps -a --format json", jsonResult)];

  if (jsonResult.ok) {
    return {
      containers: parseJsonContainers(jsonResult.stdout),
      diagnostics,
    };
  }

  const tableResult = await exec(dockerPath, ["ps", "-a"]);
  diagnostics.push(buildCommandDiagnostic("docker ps -a", tableResult));

  return {
    containers: tableResult.ok ? parseTableContainers(tableResult.stdout) : [],
    diagnostics,
  };
}

async function listContainerStats(dockerPath) {
  const statsResult = await exec(dockerPath, ["stats", "--no-stream"]);

  return {
    stats: statsResult.ok ? parseDockerStatsTable(statsResult.stdout) : [],
    diagnostics: [buildCommandDiagnostic("docker stats --no-stream", statsResult)],
  };
}

async function getDockerSnapshot() {
  const executable = await resolveDockerExecutable();
  const versionResult = executable.found
    ? await exec(executable.executablePath, ["--version"])
    : { ok: false, errorCode: "DOCKER_MISSING", exitCode: null, stdout: "", stderr: "", resolvedExecutablePath: executable.executablePath };
  const installed = versionResult.ok && Boolean(versionResult.stdout);
  const infoResult = installed
    ? await exec(executable.executablePath, ["info"])
    : { ok: false, errorCode: "DOCKER_MISSING", exitCode: null, stdout: "", stderr: "", resolvedExecutablePath: executable.executablePath };
  const daemonRunning = installed ? isDaemonRunning(infoResult) : false;
  const containerResult = daemonRunning ? await listContainers(executable.executablePath) : { containers: [], diagnostics: [] };
  const statsResult = daemonRunning ? await listContainerStats(executable.executablePath) : { stats: [], diagnostics: [] };
  const containers = attachContainerStats(containerResult.containers, statsResult.stats);
  const runningContainers = containers.filter((container) => /^running$/i.test(container.state || "") || /^up\b/i.test(container.status || ""));

  return {
    installed,
    daemonRunning,
    version: parseDockerVersion(versionResult.stdout),
    containers,
    summary: {
      installed,
      daemonRunning,
      runningContainers: runningContainers.length,
      totalContainers: containers.length,
    },
    lastCheckedAt: new Date().toISOString(),
    diagnostics: {
      path: process.env.PATH || null,
      executable,
      installedDecision: {
        installed,
        branch: installed ? "docker --version succeeded" : "docker executable/version unavailable",
      },
      commands: [
        buildCommandDiagnostic("docker --version", versionResult),
        buildCommandDiagnostic("docker info", infoResult),
        ...containerResult.diagnostics,
        ...statsResult.diagnostics,
      ],
    },
  };
}

module.exports = {
  getDockerSnapshot,
};
