const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { app } = require("electron");

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
  return {
    hostId: readOrCreateHostId(),
    hostname: os.hostname(),
    operatingSystem: `${os.type()} ${os.release()}`.trim(),
    platform: process.platform,
    architecture: process.arch,
    displayName: process.platform === "win32" ? "Windows Desktop" : `${os.hostname()} Desktop`,
  };
}

function getApplicationHostNode() {
  const host = getApplicationHost();
  return {
    id: APPLICATION_HOST_NODE_ID,
    kind: "application-host",
    displayName: host.displayName,
    description: "Computer running AnxOS Control Center.",
    applicationHost: host,
    local: true,
    default: true,
    executionTarget: { type: "application-host", hostId: host.hostId },
  };
}

module.exports = { APPLICATION_HOST_NODE_ID, getApplicationHost, getApplicationHostNode };
