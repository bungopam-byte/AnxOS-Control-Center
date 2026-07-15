const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { app } = require("electron");
const { getReleaseInfo } = require("../shared/releaseConfig");

const APPLICATION_HOST_NODE_ID = "application-host";

function getConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) return process.env.ANXHUB_CONFIG_DIR;
  try { return app ? path.join(app.getPath("userData"), "config") : path.join(process.cwd(), "config"); }
  catch { return path.join(process.cwd(), "config"); }
}

function getApplicationHostPath() {
  return path.join(getConfigDirectory(), "application-host.json");
}

function readOrCreateHostId() {
  const filePath = getApplicationHostPath();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (/^[a-zA-Z0-9_-]{8,128}$/.test(parsed.hostId || "")) return parsed.hostId;
  } catch {}
  const hostId = `host-${crypto.randomUUID()}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ hostId }, null, 2)}\n`, { mode: 0o600 });
  return hostId;
}

function getApplicationHost() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const release = getReleaseInfo();
  const trustedDevelopmentMode = process.env.ANXOS_TRUSTED_DEVELOPMENT_MODE === "1" && app?.isPackaged === false;
  return {
    hostId: readOrCreateHostId(),
    hostname: os.hostname(),
    operatingSystem: `${os.type()} ${os.release()}`.trim(),
    platform: process.platform,
    architecture: process.arch,
    displayName: process.platform === "win32" ? "Windows Desktop" : `${os.hostname()} Desktop`,
    cpu: {
      model: cpus[0]?.model || "Unknown CPU",
      cores: cpus.length,
    },
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: Math.max(totalMemory - freeMemory, 0),
    },
    storage: {
      status: "metrics-required",
      message: "Open Dashboard or select this desktop node to load current storage metrics.",
    },
    desktopUptimeSeconds: Math.round(process.uptime()),
    systemUptimeSeconds: Math.round(os.uptime()),
    electronVersion: process.versions.electron || null,
    nodeVersion: process.versions.node || null,
    appVersion: release.compactLabel,
    releaseVersion: release.version,
    buildNumber: release.build,
    channel: release.channel,
    developerMode: trustedDevelopmentMode,
    packaged: app?.isPackaged === true,
    runningState: "running",
  };
}

function getApplicationHostNode() {
  const host = getApplicationHost();
  return {
    id: APPLICATION_HOST_NODE_ID,
    kind: "application-host",
    displayName: host.displayName,
    description: "Computer running AnxOS Control Center.",
    modeLabel: "Local Application",
    nodeTypeLabel: "Application Host",
    builtIn: true,
    removable: false,
    removeUnavailableReason: "The built-in Application Host cannot be removed.",
    applicationHost: host,
    local: true,
    default: true,
    executionTarget: { type: "application-host", hostId: host.hostId },
  };
}

module.exports = { APPLICATION_HOST_NODE_ID, getApplicationHost, getApplicationHostNode };
