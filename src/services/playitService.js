const { execFile } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const COMMAND_TIMEOUT_MS = 2200;
const PLAYIT_DOMAIN_PATTERN = /\b[a-z0-9][a-z0-9.-]*\.(?:playit\.(?:gg|cloud|fan)|ply\.gg)\b/gi;
const LOCAL_TARGET_PATTERN = /\b(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\d{1,3}(?:\.\d{1,3}){3}):\d{2,5}\b/i;
const SENSITIVE_KEY_PATTERN = /token|secret|password|credential|api[_-]?key/i;

function exec(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true, ...options }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        errorCode: error?.code || error?.name || null,
        stdout: stdout ? stdout.trim() : "",
        stderr: stderr ? stderr.trim() : "",
      });
    });
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getConfigCandidates() {
  return unique([
    process.env.PLAYIT_CONFIG_PATH,
    path.join(process.cwd(), "playit.toml"),
    path.join(os.homedir(), ".config", "playit_gg", "playit.toml"),
    path.join(os.homedir(), ".config", "playit", "playit.toml"),
    path.join(os.homedir(), ".playit", "playit.toml"),
  ]);
}

function getLogCandidates() {
  return unique([
    process.env.PLAYIT_LOG_PATH,
    path.join(os.homedir(), ".config", "playit_gg", "playit.log"),
    path.join(os.homedir(), ".config", "playit", "playit.log"),
    path.join(os.homedir(), ".playit", "playit.log"),
  ]);
}

function getEnvValue(keys) {
  for (const key of keys) {
    const value = process.env[key];

    if (value && !SENSITIVE_KEY_PATTERN.test(key)) {
      return value;
    }
  }

  return null;
}

function extractPlayitAddress(content) {
  const matches = content.match(PLAYIT_DOMAIN_PATTERN);
  return matches?.[0] || null;
}

function sanitizeCommandLine(value) {
  return String(value)
    .replace(/(--?(?:secret|token|password|credential|api[_-]?key)(?:=|\s+))\S+/gi, "$1[redacted]")
    .replace(/\b(?:secret|token|password|credential|api[_-]?key)\b\s*[:=]\s*\S+/gi, (match) => `${match.split(/[:=]/)[0]}=[redacted]`);
}

function extractTunnelId(content) {
  const match = content.match(/\b(?:tunnel[_ -]?id|id)\b\s*[:=]\s*["']?([a-z0-9-]{6,})/i);
  return match?.[1] || null;
}

function extractProtocol(content) {
  const match = content.match(/\b(?:protocol|proto)\b\s*[:=]\s*["']?(tcp|udp|http|https)\b/i);
  return match?.[1]?.toUpperCase() || null;
}

function splitHostPort(value) {
  if (!value) {
    return { ip: null, port: null };
  }

  const match = String(value).match(/^(.+):(\d{2,5})$/);

  if (!match) {
    return { ip: null, port: null };
  }

  return {
    ip: match[1],
    port: match[2],
  };
}

function extractLocalTarget(content) {
  const directMatch = content.match(/\b(?:local[_-]?address|local[_-]?addr|local[_-]?target|target|proxy[_-]?addr)\b\s*[:=]\s*["']?([^"'\s#]+)/i);

  if (directMatch?.[1] && LOCAL_TARGET_PATTERN.test(directMatch[1])) {
    return directMatch[1];
  }

  const hostMatch = content.match(/\b(?:local[_-]?host|host|ip)\b\s*[:=]\s*["']?([^"'\s#]+)/i);
  const portMatch = content.match(/\b(?:local[_-]?port|port)\b\s*[:=]\s*["']?(\d{2,5})/i);

  if (hostMatch?.[1] && portMatch?.[1]) {
    return `${hostMatch[1]}:${portMatch[1]}`;
  }

  return content.match(LOCAL_TARGET_PATTERN)?.[0] || null;
}

async function readFirstAvailable(candidates) {
  const diagnostics = [];

  for (const filePath of candidates) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      diagnostics.push({ path: filePath, found: true });
      return { path: filePath, content, diagnostics };
    } catch (error) {
      diagnostics.push({ path: filePath, found: false, errorCode: error?.code || null });
    }
  }

  return { path: null, content: "", diagnostics };
}

async function findPlayitBinary() {
  const explicitBinary = process.env.PLAYIT_BINARY;

  if (explicitBinary) {
    try {
      await fs.access(explicitBinary);
      return {
        installed: true,
        path: explicitBinary,
        diagnostics: [{ method: "PLAYIT_BINARY", ok: true, errorCode: null }],
      };
    } catch (error) {
      return {
        installed: false,
        path: null,
        diagnostics: [{ method: "PLAYIT_BINARY", ok: false, errorCode: error?.code || null }],
      };
    }
  }

  const command = process.platform === "win32" ? "where.exe" : "which";
  const result = await exec(command, ["playit"]);

  return {
    installed: result.ok && Boolean(result.stdout),
    path: result.stdout.split(/\r?\n/)[0] || null,
    diagnostics: [{ method: command, ok: result.ok, errorCode: result.errorCode }],
  };
}

function supportsCommand(helpOutput, commandName) {
  return new RegExp(`\\b${commandName}\\b`, "i").test(helpOutput);
}

async function getCliCommands(binaryPath) {
  if (!binaryPath) {
    return {
      help: "",
      accountHelp: "",
      diagnostics: [],
    };
  }

  const [help, accountHelp] = await Promise.all([
    exec(binaryPath, ["--help"]),
    exec(binaryPath, ["account", "--help"]),
  ]);

  return {
    help: help.stdout || help.stderr,
    accountHelp: accountHelp.stdout || accountHelp.stderr,
    diagnostics: [
      { command: "playit --help", ok: help.ok, errorCode: help.errorCode, hasOutput: Boolean(help.stdout || help.stderr) },
      {
        command: "playit account --help",
        ok: accountHelp.ok,
        errorCode: accountHelp.errorCode,
        hasOutput: Boolean(accountHelp.stdout || accountHelp.stderr),
      },
    ],
  };
}

async function runCliInspection(binaryPath, commands) {
  if (!binaryPath) {
    return {
      output: "",
      commandResults: [],
    };
  }

  const attempts = [];

  if (supportsCommand(commands.help, "status")) {
    attempts.push(["playit status", ["status"]]);
  }

  if (supportsCommand(commands.help, "tunnels")) {
    attempts.push(["playit tunnels", ["tunnels"]]);
  }

  if (supportsCommand(commands.help, "account") && supportsCommand(commands.accountHelp, "status")) {
    attempts.push(["playit account status", ["account", "status"]]);
  }

  const results = [];
  const output = [];

  for (const [label, args] of attempts) {
    const result = await exec(binaryPath, args);
    const content = [result.stdout, result.stderr].filter(Boolean).join("\n");
    results.push({
      command: label,
      ok: result.ok,
      errorCode: result.errorCode,
      hasOutput: Boolean(content),
    });

    if (content) {
      output.push(content);
    }
  }

  return {
    output: output.join("\n"),
    commandResults: results,
  };
}

function parseRunning(cliOutput, processRunning) {
  if (/service is not running|not running|stopped|offline/i.test(cliOutput)) {
    return false;
  }

  if (/service is running|running|online/i.test(cliOutput)) {
    return true;
  }

  return processRunning;
}

function parseConnected(cliOutput, tunnelAddress) {
  if (/not connected|disconnected|offline/i.test(cliOutput)) {
    return false;
  }

  if (/(connected|forwarding|tunnel.+active|online)/i.test(cliOutput) && tunnelAddress) {
    return true;
  }

  return null;
}

async function isPlayitProcessRunning() {
  const result =
    process.platform === "win32"
      ? await exec("powershell.exe", [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          "Get-Process | Where-Object { $_.ProcessName -match '^playit' } | Select-Object -First 1 ProcessName,Id | ConvertTo-Json -Compress",
        ])
      : await exec("pgrep", ["-af", "playitd"]);

  return {
    running: result.ok && Boolean(result.stdout),
    diagnostics: {
      method: process.platform === "win32" ? "Get-Process" : "pgrep playitd",
      ok: result.ok,
      errorCode: result.errorCode,
      hasOutput: Boolean(result.stdout),
    },
  };
}

async function getPlayitProcessCommandLines() {
  const result =
    process.platform === "win32"
      ? await exec("powershell.exe", [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          "Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^playit' } | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress",
        ])
      : await exec("pgrep", ["-af", "playit"]);
  const rawOutput = result.stdout || "";
  const lines = rawOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /\bplayitd?\b/i.test(line));

  return {
    content: lines.join("\n"),
    diagnostics: {
      command:
        process.platform === "win32"
          ? "Get-CimInstance Win32_Process playit CommandLine"
          : "pgrep -af playit",
      ok: result.ok,
      errorCode: result.errorCode,
      hasOutput: lines.length > 0,
      commandLines: lines.map(sanitizeCommandLine),
    },
  };
}

async function getPlayitSnapshot() {
  const [binary, configResult, logResult] = await Promise.all([
    findPlayitBinary(),
    readFirstAvailable(getConfigCandidates()),
    readFirstAvailable(getLogCandidates()),
  ]);
  const [commands, processState, processCommandLines] = await Promise.all([
    getCliCommands(binary.path),
    isPlayitProcessRunning(),
    getPlayitProcessCommandLines(),
  ]);
  const cli = await runCliInspection(binary.path, commands);
  const combinedContent = [configResult.content, logResult.content].filter(Boolean).join("\n");
  const inspectionContent = [cli.output, processCommandLines.content, combinedContent].filter(Boolean).join("\n");
  const tunnelAddress =
    getEnvValue(["PLAYIT_ADDRESS", "PLAYIT_TUNNEL_ADDRESS", "PLAYIT_DOMAIN"]) || extractPlayitAddress(inspectionContent);
  const localTarget =
    getEnvValue(["PLAYIT_LOCAL_TARGET", "PLAYIT_TARGET", "PLAYIT_LOCAL_ADDRESS"]) || extractLocalTarget(inspectionContent);
  const localParts = splitHostPort(localTarget);
  const running = binary.installed ? parseRunning(cli.output, processState.running) : false;
  const connected = binary.installed && running ? parseConnected(cli.output, tunnelAddress) : false;

  return {
    installed: binary.installed,
    running,
    connected,
    tunnelAddress: tunnelAddress || null,
    tunnelDomain: tunnelAddress ? tunnelAddress.split(":")[0] : null,
    localTarget: localTarget || null,
    localIp: localParts.ip,
    localPort: localParts.port,
    protocol: getEnvValue(["PLAYIT_PROTOCOL"]) || extractProtocol(inspectionContent),
    tunnelId: getEnvValue(["PLAYIT_TUNNEL_ID"]) || extractTunnelId(inspectionContent),
    lastCheckedAt: new Date().toISOString(),
    lastSuccessfulRefreshAt: binary.installed && cli.commandResults.some((result) => result.ok) ? new Date().toISOString() : null,
    diagnostics: {
      binaryPath: binary.path,
      binaryChecks: binary.diagnostics,
      commandDiscovery: commands.diagnostics,
      commandResults: cli.commandResults,
      process: processState.diagnostics,
      processCommandLines: processCommandLines.diagnostics,
      configFiles: configResult.diagnostics,
      logFiles: logResult.diagnostics,
      configPathUsed: configResult.path,
      logPathUsed: logResult.path,
      addressSource: tunnelAddress ? "env_or_local_file" : null,
      localTargetSource: localTarget ? "env_or_local_file" : null,
    },
  };
}

module.exports = {
  getPlayitSnapshot,
};
