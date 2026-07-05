const fs = require("fs/promises");
const os = require("os");

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

async function getSystemSummary() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const cpus = os.cpus();

  return {
    hostname: os.hostname(),
    platform: process.platform,
    osVersion: await readOsVersion(),
    uptimeSeconds: os.uptime(),
    cpu: {
      model: cpus[0]?.model || "Unknown CPU",
      cores: cpus.length,
    },
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percent: round((usedMemory / totalMemory) * 100),
    },
    currentTime: new Date().toISOString(),
  };
}

module.exports = {
  getSystemSummary,
};
