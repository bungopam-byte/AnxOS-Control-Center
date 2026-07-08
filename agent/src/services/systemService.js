const childProcess = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const { getConfig } = require("../config");

let previousCpuSample = readCpuSample();
let previousNetworkSample = null;

function execFile(command, args, options = {}) {
  return new Promise((resolve) => {
    childProcess.execFile(command, args, {
      timeout: options.timeout || 2500,
      maxBuffer: options.maxBuffer || 256 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: stdout || "",
        stderr: stderr || "",
      });
    });
  });
}

function round(value, decimals = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function readOsVersion() {
  if (process.platform !== "linux") {
    return `${os.type()} ${os.release()}`;
  }

  try {
    const content = await fs.readFile("/etc/os-release", "utf8");
    const prettyName = content
      .split("\n")
      .find((line) => line.startsWith("PRETTY_NAME="));

    if (prettyName) {
      return prettyName.replace("PRETTY_NAME=", "").replace(/^"|"$/g, "");
    }
  } catch {
    return `${os.type()} ${os.release()}`;
  }

  return `${os.type()} ${os.release()}`;
}

function readCpuSample() {
  const cpus = os.cpus();
  return cpus.reduce((acc, cpu) => {
    const times = cpu.times;
    acc.idle += times.idle;
    acc.total += times.user + times.nice + times.sys + times.idle + times.irq;
    return acc;
  }, { idle: 0, total: 0 });
}

function getCpuUsagePercent() {
  const nextSample = readCpuSample();
  const idleDelta = nextSample.idle - previousCpuSample.idle;
  const totalDelta = nextSample.total - previousCpuSample.total;
  previousCpuSample = nextSample;

  if (totalDelta <= 0) {
    return null;
  }

  return round((1 - idleDelta / totalDelta) * 100);
}

function buildDiskUsage(total, free, mount) {
  if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0) {
    return null;
  }

  const used = Math.max(total - free, 0);
  return {
    mount: mount || null,
    total,
    used,
    free,
    percent: round((used / total) * 100),
  };
}

async function getDiskUsage(targetPath = getConfig().instanceRoot) {
  let resolvedPath = path.resolve(targetPath || getConfig().instanceRoot || process.cwd());

  while (resolvedPath && !(await fs.stat(resolvedPath).then(() => true).catch(() => false))) {
    const parentPath = path.dirname(resolvedPath);
    if (parentPath === resolvedPath) {
      break;
    }
    resolvedPath = parentPath;
  }

  if (typeof fs.statfs === "function") {
    try {
      const stats = await fs.statfs(resolvedPath);
      const blockSize = Number(stats.bsize || stats.frsize || 0);
      const total = Number(stats.blocks) * blockSize;
      const free = Number(stats.bavail ?? stats.bfree) * blockSize;
      return buildDiskUsage(total, free, resolvedPath);
    } catch (error) {
      console.warn("[AnxOS Agent][Stats] statfs disk read failed.", {
        path: resolvedPath,
        message: error?.message || String(error),
      });
    }
  }

  const result = await execFile("df", ["-kP", resolvedPath]);
  if (!result.ok) {
    console.warn("[AnxOS Agent][Stats] df disk read failed.", {
      path: resolvedPath,
      stderr: result.stderr.trim(),
    });
    return null;
  }

  const parts = result.stdout.split(/\r?\n/)[1]?.trim().split(/\s+/);
  if (!parts || parts.length < 6) {
    return null;
  }

  return buildDiskUsage(Number(parts[1]) * 1024, Number(parts[3]) * 1024, parts[5]);
}

async function getLinuxNetworkTotals() {
  try {
    const content = await fs.readFile("/proc/net/dev", "utf8");
    return content
      .split(/\r?\n/)
      .slice(2)
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce((acc, line) => {
        const [namePart, dataPart] = line.split(":");
        const name = String(namePart || "").trim();
        if (!dataPart || name === "lo") {
          return acc;
        }
        const values = dataPart.trim().split(/\s+/).map(Number);
        acc.download += values[0] || 0;
        acc.upload += values[8] || 0;
        return acc;
      }, { download: 0, upload: 0 });
  } catch (error) {
    console.warn("[AnxOS Agent][Stats] Network counters unavailable.", {
      message: error?.message || String(error),
    });
    return null;
  }
}

async function getNetworkUsage() {
  if (process.platform !== "linux") {
    return null;
  }

  const totals = await getLinuxNetworkTotals();
  const now = Date.now();

  if (!totals) {
    return null;
  }

  const current = { ...totals, at: now };

  if (!previousNetworkSample) {
    previousNetworkSample = current;
    return {
      uploadPerSecond: 0,
      downloadPerSecond: 0,
      totalUpload: totals.upload,
      totalDownload: totals.download,
    };
  }

  const seconds = Math.max((now - previousNetworkSample.at) / 1000, 0.001);
  const uploadPerSecond = Math.max((current.upload - previousNetworkSample.upload) / seconds, 0);
  const downloadPerSecond = Math.max((current.download - previousNetworkSample.download) / seconds, 0);
  previousNetworkSample = current;

  return {
    uploadPerSecond: round(uploadPerSecond, 0),
    downloadPerSecond: round(downloadPerSecond, 0),
    totalUpload: totals.upload,
    totalDownload: totals.download,
  };
}

async function getSystemSummary() {
  const [osVersion, disk, network] = await Promise.all([
    readOsVersion(),
    getDiskUsage(),
    getNetworkUsage(),
  ]);
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const cpus = os.cpus();

  return {
    hostname: os.hostname(),
    platform: process.platform,
    osVersion,
    uptimeSeconds: os.uptime(),
    cpu: {
      model: cpus[0]?.model || "Unknown CPU",
      cores: cpus.length,
      usagePercent: getCpuUsagePercent(),
      loadAverage: os.loadavg(),
      temperatureCelsius: null,
    },
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percent: round((usedMemory / totalMemory) * 100),
    },
    disk,
    network,
    currentTime: new Date().toISOString(),
    source: "agent",
    instanceRoot: getConfig().instanceRoot,
  };
}

module.exports = {
  getSystemSummary,
};
