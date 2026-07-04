const { execFile } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

let previousCpuSample = readCpuSample();
let previousNetworkSample = null;

function exec(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 2500, windowsHide: true, ...options }, (error, stdout) => {
      if (error) {
        resolve("");
        return;
      }

      resolve(stdout.trim());
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

function readCpuSample() {
  const cpus = os.cpus();
  const totals = cpus.reduce(
    (acc, cpu) => {
      const times = cpu.times;
      acc.idle += times.idle;
      acc.total += times.user + times.nice + times.sys + times.idle + times.irq;
      return acc;
    },
    { idle: 0, total: 0 },
  );

  return totals;
}

function getCpuUsage() {
  const nextSample = readCpuSample();
  const idleDelta = nextSample.idle - previousCpuSample.idle;
  const totalDelta = nextSample.total - previousCpuSample.total;
  previousCpuSample = nextSample;

  if (totalDelta <= 0) {
    return null;
  }

  return round((1 - idleDelta / totalDelta) * 100);
}

async function getOsVersion() {
  if (process.platform === "linux") {
    try {
      const osRelease = await fs.readFile("/etc/os-release", "utf8");
      const prettyName = osRelease
        .split("\n")
        .find((line) => line.startsWith("PRETTY_NAME="));

      if (prettyName) {
        return prettyName.replace("PRETTY_NAME=", "").replace(/^"|"$/g, "");
      }
    } catch {
      return `${os.type()} ${os.release()}`;
    }
  }

  return `${os.type()} ${os.release()}`;
}

async function getDiskUsage() {
  if (process.platform === "win32") {
    const driveRoot = path.parse(process.cwd()).root.replace("\\", "");
    const output = await exec("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${driveRoot}'" | Select-Object Size,FreeSpace | ConvertTo-Json -Compress`,
    ]);

    try {
      const disk = JSON.parse(output);
      const total = Number(disk.Size);
      const free = Number(disk.FreeSpace);
      return buildDiskUsage(total, free, driveRoot);
    } catch {
      return null;
    }
  }

  const output = await exec("df", ["-k", "/"]);
  const lines = output.split("\n");
  const parts = lines[1]?.trim().split(/\s+/);

  if (!parts || parts.length < 5) {
    return null;
  }

  const total = Number(parts[1]) * 1024;
  const used = Number(parts[2]) * 1024;
  const free = total - used;
  return buildDiskUsage(total, free, parts[5] || "/");
}

function buildDiskUsage(total, free, mount) {
  if (!total || !Number.isFinite(total) || !Number.isFinite(free)) {
    return null;
  }

  const used = total - free;
  return {
    mount,
    total,
    used,
    free,
    percent: round((used / total) * 100),
  };
}

async function getLinuxNetworkTotals() {
  try {
    const content = await fs.readFile("/proc/net/dev", "utf8");
    return content
      .split("\n")
      .slice(2)
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce(
        (acc, line) => {
          const [namePart, dataPart] = line.split(":");
          const name = namePart.trim();
          if (name === "lo" || !dataPart) {
            return acc;
          }

          const values = dataPart.trim().split(/\s+/).map(Number);
          acc.download += values[0] || 0;
          acc.upload += values[8] || 0;
          return acc;
        },
        { upload: 0, download: 0 },
      );
  } catch {
    return null;
  }
}

async function getWindowsNetworkTotals() {
  const output = await exec("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "Get-NetAdapterStatistics | Select-Object ReceivedBytes,SentBytes | ConvertTo-Json -Compress",
  ]);

  try {
    const rows = JSON.parse(output);
    const adapters = Array.isArray(rows) ? rows : [rows];
    return adapters.reduce(
      (acc, adapter) => {
        acc.download += Number(adapter.ReceivedBytes) || 0;
        acc.upload += Number(adapter.SentBytes) || 0;
        return acc;
      },
      { upload: 0, download: 0 },
    );
  } catch {
    return null;
  }
}

async function getNetworkUsage() {
  const totals = process.platform === "win32" ? await getWindowsNetworkTotals() : await getLinuxNetworkTotals();
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

async function getCpuTemperature() {
  if (process.platform !== "linux") {
    return null;
  }

  try {
    const zones = await fs.readdir("/sys/class/thermal");
    for (const zone of zones.filter((name) => name.startsWith("thermal_zone"))) {
      const tempPath = `/sys/class/thermal/${zone}/temp`;
      const raw = await fs.readFile(tempPath, "utf8");
      const value = Number(raw.trim());
      if (Number.isFinite(value) && value > 0) {
        return round(value > 1000 ? value / 1000 : value);
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getSystemSnapshot() {
  const [osVersion, disk, network, cpuTemperature] = await Promise.all([
    getOsVersion(),
    getDiskUsage(),
    getNetworkUsage(),
    getCpuTemperature(),
  ]);

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    currentTime: new Date().toISOString(),
    hostname: os.hostname(),
    osVersion,
    platform: process.platform,
    cpu: {
      model: os.cpus()[0]?.model || "Unknown CPU",
      cores: os.cpus().length,
      usagePercent: getCpuUsage(),
      temperatureCelsius: cpuTemperature,
    },
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percent: round((usedMemory / totalMemory) * 100),
    },
    disk,
    network,
    uptimeSeconds: os.uptime(),
  };
}

module.exports = {
  getSystemSnapshot,
};
