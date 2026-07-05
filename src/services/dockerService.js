const { execFile } = require("child_process");

const COMMAND_TIMEOUT_MS = 3500;

function exec(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true, ...options }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        stdout: stdout ? stdout.trim() : "",
        stderr: stderr ? stderr.trim() : "",
      });
    });
  });
}

function buildCommandDiagnostic(command, result) {
  return {
    command,
    ok: result.ok,
    errorCode: result.errorCode,
    hasOutput: Boolean(result.stdout || result.stderr),
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

async function listContainers() {
  const jsonResult = await exec("docker", ["ps", "-a", "--format", "json"]);
  const diagnostics = [buildCommandDiagnostic("docker ps -a --format json", jsonResult)];

  if (jsonResult.ok) {
    return {
      containers: parseJsonContainers(jsonResult.stdout),
      diagnostics,
    };
  }

  const tableResult = await exec("docker", ["ps", "-a"]);
  diagnostics.push(buildCommandDiagnostic("docker ps -a", tableResult));

  return {
    containers: tableResult.ok ? parseTableContainers(tableResult.stdout) : [],
    diagnostics,
  };
}

async function getDockerSnapshot() {
  const versionResult = await exec("docker", ["--version"]);
  const installed = versionResult.ok && Boolean(versionResult.stdout);
  const infoResult = installed ? await exec("docker", ["info"]) : { ok: false, errorCode: "DOCKER_MISSING", stdout: "", stderr: "" };
  const daemonRunning = installed ? isDaemonRunning(infoResult) : false;
  const containerResult = daemonRunning ? await listContainers() : { containers: [], diagnostics: [] };
  const containers = containerResult.containers;
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
      commands: [
        buildCommandDiagnostic("docker --version", versionResult),
        buildCommandDiagnostic("docker info", infoResult),
        ...containerResult.diagnostics,
      ],
    },
  };
}

module.exports = {
  getDockerSnapshot,
};
