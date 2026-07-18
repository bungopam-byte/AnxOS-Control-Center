const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const packageJson = require("../../package.json");
const DEVICE_IDENTITY_SCHEMA_VERSION = 1;

function getIdentityPath() {
  return process.env.AGENT_IDENTITY_PATH
    || path.join(process.env.ANXHUB_CONFIG_DIR || path.join(process.cwd(), "config"), "device-identity.json");
}

function readOrCreateDeviceId() {
  const identityPath = getIdentityPath();
  if (!fs.existsSync(identityPath)) {
    const deviceId = `device-${crypto.randomUUID()}`;
    writeIdentity(identityPath, deviceId);
    return deviceId;
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(identityPath, "utf8"));
  } catch (error) {
    const backupPath = `${identityPath}.corrupt-${Date.now()}`;
    try { fs.copyFileSync(identityPath, backupPath, fs.constants.COPYFILE_EXCL); } catch {}
    throw Object.assign(new Error("Agent device identity is unreadable. The original file was preserved; a new identity was not generated."), {
      code: "DEVICE_IDENTITY_CORRUPT",
      details: { causeCode: error?.code || "INVALID_JSON" },
    });
  }
  const schemaVersion = Number.isInteger(parsed?.schemaVersion) ? parsed.schemaVersion : 0;
  if (schemaVersion > DEVICE_IDENTITY_SCHEMA_VERSION) {
    throw Object.assign(new Error("Agent device identity was created by a newer runtime version."), {
      code: "DEVICE_IDENTITY_SCHEMA_UNSUPPORTED",
      details: { schemaVersion, supportedSchemaVersion: DEVICE_IDENTITY_SCHEMA_VERSION },
    });
  }
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(parsed?.deviceId || "")) {
    throw Object.assign(new Error("Agent device identity is invalid. Repair the preserved identity instead of registering a duplicate node."), {
      code: "DEVICE_IDENTITY_INVALID",
    });
  }
  if (schemaVersion < DEVICE_IDENTITY_SCHEMA_VERSION) {
    const backupPath = `${identityPath}.schema-v${schemaVersion}.backup`;
    if (!fs.existsSync(backupPath)) fs.copyFileSync(identityPath, backupPath, fs.constants.COPYFILE_EXCL);
    writeIdentity(identityPath, parsed.deviceId);
  }
  return parsed.deviceId;
}

function writeIdentity(identityPath, deviceId) {
  fs.mkdirSync(path.dirname(identityPath), { recursive: true });
  const tempPath = `${identityPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify({ schemaVersion: DEVICE_IDENTITY_SCHEMA_VERSION, deviceId }, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tempPath, identityPath);
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

module.exports = { DEVICE_IDENTITY_SCHEMA_VERSION, getDeviceIdentity, getIdentityPath };
