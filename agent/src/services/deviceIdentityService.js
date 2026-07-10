const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const packageJson = require("../../package.json");

function getIdentityPath() {
  return process.env.AGENT_IDENTITY_PATH
    || path.join(process.env.ANXHUB_CONFIG_DIR || path.join(process.cwd(), "config"), "device-identity.json");
}

function readOrCreateDeviceId() {
  const identityPath = getIdentityPath();
  try {
    const parsed = JSON.parse(fs.readFileSync(identityPath, "utf8"));
    if (/^[a-zA-Z0-9_-]{8,128}$/.test(parsed.deviceId || "")) return parsed.deviceId;
  } catch {}
  const deviceId = `device-${crypto.randomUUID()}`;
  fs.mkdirSync(path.dirname(identityPath), { recursive: true });
  fs.writeFileSync(identityPath, `${JSON.stringify({ deviceId }, null, 2)}\n`, { mode: 0o600 });
  return deviceId;
}

function getDeviceIdentity() {
  return {
    deviceId: readOrCreateDeviceId(),
    hostname: os.hostname(),
    operatingSystem: `${os.type()} ${os.release()}`.trim(),
    platform: process.platform,
    architecture: process.arch,
    agentVersion: packageJson.version,
  };
}

module.exports = { getDeviceIdentity, getIdentityPath };
