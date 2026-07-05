const { execFile } = require("child_process");
const fs = require("fs/promises");
const path = require("path");

const COMMAND_TIMEOUT_MS = 3500;

function exec(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        exitCode: error ? (typeof error.code === "number" ? error.code : null) : 0,
        stdout: stdout ? stdout.trim() : "",
        stderr: stderr ? stderr.trim() : "",
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
  if (process.platform === "win32") {
    for (const candidate of getWindowsDockerCandidates()) {
      if (await pathExists(candidate)) {
        return candidate;
      }
    }

    return "docker";
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
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return "docker";
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

function normalizeContainerName(value) {
  return typeof value === "string" ? value.replace(/^\/+/, "").trim() : "";
}

function normalizeContainer(container) {
  const status = container.Status || container.State || null;

  return {
    id: container.ID || container.Id || null,
    name: normalizeContainerName(container.Names || container.Names?.[0] || container.Name || null) || null,
    image: container.Image || null,
    command: container.Command || null,
    createdAt: container.CreatedAt || container.Created || null,
    status,
    state: container.State || inferState(status),
    ports: container.Ports || null,
    runningFor: status,
    stats: null,
  };
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
        return normalizeContainer(JSON.parse(line));
      } catch {
        return null;
      }
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
        name: normalizeContainerName(parts[6]) || null,
        runningFor: parts[4] || null,
        stats: null,
      };
    })
    .filter(Boolean);
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

function normalizeStats(stats) {
  const memory = parseMemoryUsage(stats.MemUsage);

  return {
    id: stats.ID || stats.Container || null,
    container: stats.Container || null,
    name: normalizeContainerName(stats.Name || null) || null,
    cpuPercent: stats.CPUPerc || null,
    memoryUsage: memory.usage,
    memoryLimit: memory.limit,
    memoryRaw: memory.raw,
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
        ID: parts[0] || null,
        Name: parts[1] || null,
        CPUPerc: parts[2] || null,
        MemUsage: parts[3] || null,
      });
    })
    .filter(Boolean);
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

function attachStats(containers, statsList) {
  const statsByName = new Map(
    statsList
      .filter((stats) => stats.name)
      .map((stats) => [stats.name.toLowerCase(), stats]),
  );

  return containers.map((container) => {
    const nameMatch = container.name ? statsByName.get(container.name.toLowerCase()) : null;
    const idMatch = nameMatch ? null : statsList.find((stats) => {
      return isMatchingContainerId(container.id, stats.id) || isMatchingContainerId(container.id, stats.container);
    });

    return {
      ...container,
      stats: nameMatch || idMatch || null,
    };
  });
}

async function listContainers(dockerPath) {
  const jsonResult = await exec(dockerPath, ["ps", "-a", "--format", "json"]);

  if (jsonResult.ok) {
    return parseJsonContainers(jsonResult.stdout);
  }

  const tableResult = await exec(dockerPath, ["ps", "-a"]);
  return tableResult.ok ? parseTableContainers(tableResult.stdout) : [];
}

async function listStats(dockerPath) {
  const result = await exec(dockerPath, ["stats", "--no-stream"]);
  return result.ok ? parseStatsTable(result.stdout) : [];
}

async function getDockerContainers() {
  const dockerPath = await resolveDockerExecutable();
  const versionResult = await exec(dockerPath, ["--version"]);

  if (!versionResult.ok) {
    return {
      available: false,
      containers: [],
    };
  }

  const containers = await listContainers(dockerPath);
  const stats = await listStats(dockerPath);

  return {
    available: true,
    containers: attachStats(containers, stats),
  };
}

module.exports = {
  getDockerContainers,
};
