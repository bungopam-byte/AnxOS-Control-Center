const os = require("os");
const { getDeviceIdentity } = require("../services/deviceIdentityService");
const { getDirectory, logger } = require("../services/diagnosticsLogger");

function handleDiagnostics() {
  const entries = [];
  try {
    const fs = require("fs");
    entries.push(...fs.readFileSync(logger.getPath("agent"), "utf8").split(/\r?\n/).filter(Boolean).slice(-100).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean));
  } catch {}
  logger.info("remote-diagnostics", "Sanitized remote diagnostic bundle requested", { entryCount: entries.length });
  return { statusCode: 200, body: { generatedAt: new Date().toISOString(), identity: getDeviceIdentity(), platform: { type: os.type(), release: os.release(), architecture: os.arch(), uptime: os.uptime() }, service: { running: true, pid: process.pid, logDirectoryAvailable: Boolean(getDirectory()) }, logs: entries } };
}
module.exports = { handleDiagnostics };
