const { execFile } = require("child_process");

const { getPlayitSnapshot } = require("../../../src/services/playitService");

const COMMAND_TIMEOUT_MS = 2200;

function exec(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        stdout: stdout ? stdout.trim() : "",
        stderr: stderr ? stderr.trim() : "",
      });
    });
  });
}

function parseVersion(output) {
  const match = String(output || "").match(/\b(?:version\s*)?v?(\d+(?:\.\d+){1,3}(?:[-+][\w.-]+)?)\b/i);
  return match?.[1] || null;
}

async function getPlayitVersion(binaryPath) {
  if (!binaryPath) {
    return {
      version: null,
      diagnostics: {
        command: "playit --version",
        ok: false,
        errorCode: "PLAYIT_BINARY_MISSING",
        hasOutput: false,
      },
    };
  }

  const result = await exec(binaryPath, ["--version"]);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

  return {
    version: result.ok ? parseVersion(output) : null,
    diagnostics: {
      command: "playit --version",
      ok: result.ok,
      errorCode: result.errorCode,
      hasOutput: Boolean(output),
    },
  };
}

async function getPlayitStatus() {
  const snapshot = await getPlayitSnapshot();
  const version = await getPlayitVersion(snapshot.diagnostics?.binaryPath);

  return {
    ...snapshot,
    version: version.version,
    diagnostics: {
      ...snapshot.diagnostics,
      version: version.diagnostics,
    },
  };
}

module.exports = {
  getPlayitSnapshot,
  getPlayitStatus,
};
