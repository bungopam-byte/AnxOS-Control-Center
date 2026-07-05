const { execFile } = require("child_process");

const COMMAND_TIMEOUT_MS = 3500;
const DEFAULT_LOG_LINES = 100;
const DEFAULT_LOG_LIMIT_BYTES = 64 * 1024;

const COMMAND_ALLOWLIST = [
  {
    commandId: "docker-ps",
    displayName: "docker ps",
    description: "List running Docker containers.",
    command: "docker",
    args: ["ps"],
  },
  {
    commandId: "docker-info",
    displayName: "docker info",
    description: "Show Docker daemon information.",
    command: "docker",
    args: ["info"],
  },
  {
    commandId: "systemctl-status-playit",
    displayName: "systemctl status playit",
    description: "Show Playit systemd service status.",
    command: "systemctl",
    args: ["status", "playit"],
  },
  {
    commandId: "systemctl-status-ampinstmgr",
    displayName: "systemctl status ampinstmgr",
    description: "Show AMP instance manager systemd service status.",
    command: "systemctl",
    args: ["status", "ampinstmgr"],
  },
  {
    commandId: "uptime",
    displayName: "uptime",
    description: "Show system uptime and load averages.",
    command: "uptime",
    args: [],
  },
  {
    commandId: "df-h",
    displayName: "df -h",
    description: "Show human-readable disk usage.",
    command: "df",
    args: ["-h"],
  },
  {
    commandId: "free-h",
    displayName: "free -h",
    description: "Show human-readable memory usage.",
    command: "free",
    args: ["-h"],
  },
];

const LOG_SOURCES = new Map([
  [
    "playit",
    {
      source: "playit",
      displayName: "Playit service logs",
      command: "journalctl",
      args: ["-u", "playit", "--no-pager", "-n", String(DEFAULT_LOG_LINES)],
    },
  ],
  [
    "ampinstmgr",
    {
      source: "ampinstmgr",
      displayName: "AMP instance manager logs",
      command: "journalctl",
      args: ["-u", "ampinstmgr", "--no-pager", "-n", String(DEFAULT_LOG_LINES)],
    },
  ],
  [
    "docker",
    {
      source: "docker",
      displayName: "Docker service logs",
      command: "journalctl",
      args: ["-u", "docker", "--no-pager", "-n", String(DEFAULT_LOG_LINES)],
    },
  ],
]);

function createConsoleError(code, statusCode = 400) {
  return Object.assign(new Error(code), { code, statusCode });
}

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

function redactSensitiveValues(value) {
  return String(value || "")
    .replace(/(\bAuthorization:\s*Bearer\s+)\S+/gi, "$1[redacted]")
    .replace(/(\bBearer\s+)\S+/gi, "$1[redacted]")
    .replace(/(--?(?:secret|token|password|credential|api[_-]?key)(?:=|\s+))\S+/gi, "$1[redacted]")
    .replace(/\b(?:secret|token|password|credential|api[_-]?key)\b\s*[:=]\s*\S+/gi, (match) => `${match.split(/[:=]/)[0]}=[redacted]`)
    .replace(/(AMP_PASSWORD=).+/gi, "$1[redacted]");
}

function limitOutput(value, maxBytes = DEFAULT_LOG_LIMIT_BYTES) {
  const output = redactSensitiveValues(value);
  const buffer = Buffer.from(output);

  if (buffer.length <= maxBytes) {
    return {
      output,
      truncated: false,
    };
  }

  return {
    output: buffer.subarray(buffer.length - maxBytes).toString("utf8"),
    truncated: true,
  };
}

async function getConsoleCommands() {
  return {
    commands: COMMAND_ALLOWLIST.map((command) => ({
      commandId: command.commandId,
      displayName: command.displayName,
      description: command.description,
    })),
  };
}

async function getRecentLogs(source) {
  const normalizedSource = String(source || "").trim().toLowerCase();
  const logSource = LOG_SOURCES.get(normalizedSource);

  if (!logSource) {
    throw createConsoleError("CONSOLE_SOURCE_NOT_ALLOWED", 400);
  }

  if (process.platform === "win32") {
    return {
      source: logSource.source,
      displayName: logSource.displayName,
      supported: false,
      output: "",
      truncated: false,
      maxBytes: DEFAULT_LOG_LIMIT_BYTES,
      diagnostics: {
        ok: false,
        errorCode: "UNSUPPORTED_PLATFORM",
      },
    };
  }

  const result = await exec(logSource.command, logSource.args);
  const content = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const limited = limitOutput(content);

  return {
    source: logSource.source,
    displayName: logSource.displayName,
    supported: true,
    output: limited.output,
    truncated: limited.truncated,
    maxBytes: DEFAULT_LOG_LIMIT_BYTES,
    diagnostics: {
      ok: result.ok,
      errorCode: result.errorCode,
    },
  };
}

module.exports = {
  getConsoleCommands,
  getRecentLogs,
};
