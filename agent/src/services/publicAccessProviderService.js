const { execFile } = require("child_process");
const { getPlayitSnapshot } = require("./playitService");
const { summarizePublicAccessReadiness } = require("../../../src/services/readinessService");
const {
  buildPublicAccessSnapshot,
} = require("../../../src/shared/publicAccessProviderDetection");

const COMMAND_TIMEOUT_MS = 2200;

function runCommand(command, args = []) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
      });
    });
  });
}

async function getPublicAccessSnapshot() {
  const platform = process.platform;
  const snapshot = await buildPublicAccessSnapshot({
    runCommand,
    getPlayitSnapshot,
    nodeId: null,
    platform,
  });
  return {
    ...snapshot,
    readiness: summarizePublicAccessReadiness(snapshot),
  };
}

module.exports = {
  getPublicAccessSnapshot,
  _test: {
    runCommand,
  },
};
