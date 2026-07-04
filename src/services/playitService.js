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

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function getConfigCandidates() {
  return unique([
    process.env.PLAYIT_CONFIG_PATH,
    path.join(process.cwd(), "playit.toml"),
    process.platform === "win32" ? null : path.join("/etc", "playit", "playit.toml"),
    path.join(os.homedir(), ".config", "playit_gg", "playit.toml"),
    path.join(os.homedir(), ".config", "playit", "playit.toml"),
    path.join(os.homedir(), ".playit", "playit.toml"),
  ]);
}

function getWindowsInstallCandidates() {
  if (process.platform !== "win32") {
    return [];
  }

  return unique([
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs", "playit", "playit.exe") : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs", "playit", "playit", "playit.exe") : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "playit", "playit.exe") : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "playit", "playit", "playit.exe") : null,
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "playit", "playit.exe") : null,
    process.env["ProgramFiles(x86)"] ? path.join(process.env["ProgramFiles(x86)"], "playit", "playit", "playit.exe") : null,
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
  const match = content.match(/\btunnel[_ -]?id\b\s*[:=]\s*["']?([a-z0-9-]{6,})/i);
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

async function readSpecificFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return {
      content,
      diagnostics: {
        source: filePath,
        checked: true,
        ok: true,
        errorCode: null,
        hasOutput: Boolean(content),
      },
    };
  } catch (error) {
    return {
      content: "",
      diagnostics: {
        source: filePath,
        checked: true,
        ok: false,
        errorCode: error?.code || null,
        hasOutput: false,
        reason: error?.code === "EACCES" ? "unreadable" : "not_available",
      },
    };
  }
}

async function readPlayitJournal() {
  if (process.platform === "win32") {
    return {
      content: "",
      diagnostics: {
        source: "journalctl -u playit --no-pager -n 100",
        checked: false,
        ok: false,
        errorCode: null,
        hasOutput: false,
        reason: "not_linux",
      },
    };
  }

  const result = await exec("journalctl", ["-u", "playit", "--no-pager", "-n", "100"]);
  const content = [result.stdout, result.stderr].filter(Boolean).join("\n");

  return {
    content,
    diagnostics: {
      source: "journalctl -u playit --no-pager -n 100",
      checked: true,
      ok: result.ok,
      errorCode: result.errorCode,
      hasOutput: Boolean(content),
      reason: content.includes("-- No entries --") ? "no_visible_entries" : null,
    },
  };
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

  if (process.platform === "win32") {
    return findWindowsPlayitBinary();
  }

  const command = "which";
  const result = await exec(command, ["playit"]);

  return {
    installed: result.ok && Boolean(result.stdout),
    path: result.stdout.split(/\r?\n/)[0] || null,
    diagnostics: [{ method: command, ok: result.ok, errorCode: result.errorCode }],
  };
}

async function findWindowsPlayitBinary() {
  const diagnostics = [];
  const whereResult = await exec("where.exe", ["playit"]);
  diagnostics.push({
    method: "where.exe playit",
    ok: whereResult.ok,
    errorCode: whereResult.errorCode,
    executablePath: whereResult.stdout.split(/\r?\n/)[0] || null,
  });

  if (whereResult.ok && whereResult.stdout) {
    return {
      installed: true,
      path: whereResult.stdout.split(/\r?\n/)[0],
      diagnostics,
      detectedBy: "where.exe playit",
      processId: null,
    };
  }

  for (const commandName of ["playit", "playit.exe"]) {
    const result = await exec("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Get-Command ${commandName} -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source`,
    ]);
    const executablePath = result.stdout.split(/\r?\n/)[0] || null;
    diagnostics.push({
      method: `Get-Command ${commandName}`,
      ok: result.ok && Boolean(executablePath),
      errorCode: result.errorCode,
      executablePath,
    });

    if (executablePath) {
      return {
        installed: true,
        path: executablePath,
        diagnostics,
        detectedBy: `Get-Command ${commandName}`,
        processId: null,
      };
    }
  }

  for (const candidatePath of getWindowsInstallCandidates()) {
    try {
      await fs.access(candidatePath);
      diagnostics.push({
        method: "common install path",
        ok: true,
        errorCode: null,
        executablePath: candidatePath,
      });

      return {
        installed: true,
        path: candidatePath,
        diagnostics,
        detectedBy: "common install path",
        processId: null,
      };
    } catch (error) {
      diagnostics.push({
        method: "common install path",
        ok: false,
        errorCode: error?.code || null,
        executablePath: candidatePath,
      });
    }
  }

  const processInfo = await getWindowsPlayitProcesses();
  diagnostics.push(processInfo.diagnostics);

  if (processInfo.processes.length > 0) {
    const process = processInfo.processes[0];

    return {
      installed: true,
      path: process.executablePath,
      diagnostics,
      detectedBy: "Get-CimInstance Win32_Process",
      processId: process.processId,
    };
  }

  return {
    installed: false,
    path: null,
    diagnostics,
    detectedBy: null,
    processId: null,
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
      outputs: [],
      commandResults: [],
    };
  }

  const attempts = [
    ["playit tunnels", ["tunnels"], supportsCommand(commands.help, "tunnels")],
    [
      "playit account status",
      ["account", "status"],
      supportsCommand(commands.help, "account") && supportsCommand(commands.accountHelp, "status"),
    ],
    ["playit status", ["status"], supportsCommand(commands.help, "status")],
  ];

  const results = [];
  const output = [];
  const outputs = [];

  for (const [label, args, supported] of attempts) {
    const result = await exec(binaryPath, args);
    const content = [result.stdout, result.stderr].filter(Boolean).join("\n");
    outputs.push({
      command: label,
      content,
      ok: result.ok,
      errorCode: result.errorCode,
      supported,
    });
    results.push({
      command: label,
      ok: result.ok,
      errorCode: result.errorCode,
      supported,
      hasOutput: Boolean(content),
    });

    if (content) {
      output.push(`${label}\n${content}`);
    }
  }

  return {
    output: output.join("\n"),
    outputs,
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

function getCliState(cliOutput) {
  if (!cliOutput) {
    return null;
  }

  if (/service is not running|not running|stopped|offline/i.test(cliOutput)) {
    return "inactive";
  }

  if (/service is running|running|online/i.test(cliOutput)) {
    return "active";
  }

  return "unknown";
}

function getSystemctlStatusState(output) {
  const match = String(output || "").match(/\bActive:\s*([^\n]+)/i);
  return match?.[1]?.trim() || null;
}

function isActiveSystemctlState(state) {
  return /^active\b/i.test(String(state || ""));
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

function getUnavailableReason(source) {
  if (source.diagnostics?.reason) {
    return source.diagnostics.reason;
  }

  if (source.diagnostics?.ok === false) {
    return source.diagnostics?.supported === false ? "unsupported" : "command_failed";
  }

  if (!source.content) {
    return "no_output";
  }

  return "metadata_not_found";
}

function getParsedFieldNames(parsed) {
  return Object.entries(parsed)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

function parseTunnelMetadataSource(content) {
  const tunnelAddress = extractPlayitAddress(content);
  const localTarget = extractLocalTarget(content);
  const localParts = splitHostPort(localTarget);

  return {
    tunnelAddress,
    localTarget,
    localIp: localParts.ip,
    localPort: localParts.port,
    protocol: extractProtocol(content),
    tunnelId: extractTunnelId(content),
  };
}

function mergeTunnelMetadata(sources) {
  const metadata = {
    tunnelAddress: null,
    localTarget: null,
    localIp: null,
    localPort: null,
    protocol: null,
    tunnelId: null,
  };
  const fieldSources = {};
  const diagnostics = [];

  for (const source of sources) {
    const parsed = parseTunnelMetadataSource(source.content || "");
    const parsedFields = getParsedFieldNames(parsed);

    for (const field of Object.keys(metadata)) {
      if (!metadata[field] && parsed[field]) {
        metadata[field] = parsed[field];
        fieldSources[field] = source.name;
      }
    }

    diagnostics.push({
      source: source.name,
      checked: source.diagnostics?.checked !== false,
      ok: source.diagnostics?.ok ?? true,
      errorCode: source.diagnostics?.errorCode || null,
      supported: source.diagnostics?.supported,
      hasOutput: Boolean(source.content),
      parsedFields,
      reason: parsedFields.length > 0 ? null : getUnavailableReason(source),
    });
  }

  if (metadata.localTarget && (!metadata.localIp || !metadata.localPort)) {
    const localParts = splitHostPort(metadata.localTarget);
    metadata.localIp = metadata.localIp || localParts.ip;
    metadata.localPort = metadata.localPort || localParts.port;
  }

  return {
    ...metadata,
    fieldSources,
    diagnostics,
  };
}

async function getLinuxPlayitProcessState(cliOutput) {
  const cliState = getCliState(cliOutput);
  const diagnostics = {
    method: null,
    detectionMethod: null,
    systemctlState: null,
    cliState,
    checks: [],
  };

  const isActiveResult = await exec("systemctl", ["is-active", "playit"]);
  const isActiveState = isActiveResult.stdout.split(/\r?\n/)[0] || null;
  diagnostics.systemctlState = isActiveState;
  diagnostics.checks.push({
    command: "systemctl is-active playit",
    ok: isActiveResult.ok,
    errorCode: isActiveResult.errorCode,
    state: isActiveState,
  });

  if (isActiveSystemctlState(isActiveState)) {
    diagnostics.method = "systemctl is-active playit";
    diagnostics.detectionMethod = "systemctl is-active playit";
    return {
      running: true,
      diagnostics,
    };
  }

  const statusResult = await exec("systemctl", ["status", "playit"]);
  const statusState = getSystemctlStatusState([statusResult.stdout, statusResult.stderr].filter(Boolean).join("\n"));
  diagnostics.systemctlState = statusState || diagnostics.systemctlState;
  diagnostics.checks.push({
    command: "systemctl status playit",
    ok: statusResult.ok,
    errorCode: statusResult.errorCode,
    state: statusState,
  });

  if (isActiveSystemctlState(statusState)) {
    diagnostics.method = "systemctl status playit";
    diagnostics.detectionMethod = "systemctl status playit";
    return {
      running: true,
      diagnostics,
    };
  }

  if (cliState === "active" || cliState === "inactive") {
    diagnostics.method = "playit status";
    diagnostics.detectionMethod = "playit status";
    return {
      running: cliState === "active",
      diagnostics,
    };
  }

  const pgrepResult = await exec("pgrep", ["-af", "playit"]);
  diagnostics.checks.push({
    command: "pgrep -af playit",
    ok: pgrepResult.ok,
    errorCode: pgrepResult.errorCode,
    hasOutput: Boolean(pgrepResult.stdout),
  });
  diagnostics.method = "pgrep -af playit";
  diagnostics.detectionMethod = "pgrep -af playit";

  return {
    running: pgrepResult.ok && Boolean(pgrepResult.stdout),
    diagnostics,
  };
}

async function isPlayitProcessRunning(cliOutput = "") {
  if (process.platform === "win32") {
    const processInfo = await getWindowsPlayitProcesses();

    return {
      running: processInfo.processes.length > 0,
      diagnostics: {
        ...processInfo.diagnostics,
        method: "Get-CimInstance Win32_Process",
        processIds: processInfo.processes.map((process) => process.processId).filter(Boolean),
        executablePaths: processInfo.processes.map((process) => process.executablePath).filter(Boolean),
      },
    };
  }

  return getLinuxPlayitProcessState(cliOutput);
}

async function getWindowsPlayitProcesses() {
  const result = await exec("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^playit' -or $_.CommandLine -match 'playit' -or $_.ExecutablePath -match 'playit' } | Select-Object ProcessId,Name,ExecutablePath,CommandLine | ConvertTo-Json -Compress",
  ]);
  const rows = parseJsonArray(result.stdout);
  const processes = rows
    .map((row) => ({
      processId: row.ProcessId || null,
      name: row.Name || null,
      executablePath: row.ExecutablePath || null,
      commandLine: row.CommandLine || "",
    }))
    .filter((row) => [row.name, row.executablePath, row.commandLine].filter(Boolean).join(" ").match(/\bplayit(?:\.exe|d)?\b/i));

  return {
    processes,
    diagnostics: {
      method: "Get-CimInstance Win32_Process playit",
      ok: result.ok,
      errorCode: result.errorCode,
      hasOutput: processes.length > 0,
    },
  };
}

async function getPlayitProcessCommandLines() {
  if (process.platform === "win32") {
    const processInfo = await getWindowsPlayitProcesses();

    return {
      content: processInfo.processes.map((process) => process.commandLine).filter(Boolean).join("\n"),
      diagnostics: {
        command: "Get-CimInstance Win32_Process playit CommandLine",
        ok: processInfo.diagnostics.ok,
        errorCode: processInfo.diagnostics.errorCode,
        hasOutput: processInfo.processes.length > 0,
        processIds: processInfo.processes.map((process) => process.processId).filter(Boolean),
        executablePaths: processInfo.processes.map((process) => process.executablePath).filter(Boolean),
        commandLines: processInfo.processes.map((process) => sanitizeCommandLine(process.commandLine)).filter(Boolean),
      },
    };
  }

  const result =
    await exec("pgrep", ["-af", "playit"]);
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
  const [commands, processCommandLines] = await Promise.all([
    getCliCommands(binary.path),
    getPlayitProcessCommandLines(),
  ]);
  const cli = await runCliInspection(binary.path, commands);
  const processState = await isPlayitProcessRunning(cli.output);
  const [systemConfig, journal] = await Promise.all([
    process.platform === "win32"
      ? Promise.resolve({
          content: "",
          diagnostics: {
            source: "/etc/playit/playit.toml",
            checked: false,
            ok: false,
            errorCode: null,
            hasOutput: false,
            reason: "not_linux",
          },
        })
      : readSpecificFile(path.join("/etc", "playit", "playit.toml")),
    readPlayitJournal(),
  ]);
  const combinedContent = [configResult.content, logResult.content].filter(Boolean).join("\n");
  const metadataSources = [
    ...cli.outputs.map((output) => ({
      name: output.command,
      content: output.content,
      diagnostics: {
        checked: true,
        ok: output.ok,
        errorCode: output.errorCode,
        supported: output.supported,
        reason: output.supported === false ? "unsupported" : null,
      },
    })),
    {
      name: "/etc/playit/playit.toml",
      content: systemConfig.content,
      diagnostics: systemConfig.diagnostics,
    },
    {
      name: "journalctl -u playit --no-pager -n 100",
      content: journal.content,
      diagnostics: journal.diagnostics,
    },
  ];
  const tunnelMetadata = mergeTunnelMetadata(metadataSources);
  const inspectionContent = [cli.output, processCommandLines.content, combinedContent].filter(Boolean).join("\n");
  const tunnelAddress =
    tunnelMetadata.tunnelAddress ||
    getEnvValue(["PLAYIT_ADDRESS", "PLAYIT_TUNNEL_ADDRESS", "PLAYIT_DOMAIN"]) ||
    extractPlayitAddress(inspectionContent);
  const localTarget =
    tunnelMetadata.localTarget ||
    getEnvValue(["PLAYIT_LOCAL_TARGET", "PLAYIT_TARGET", "PLAYIT_LOCAL_ADDRESS"]) ||
    extractLocalTarget(inspectionContent);
  const localParts = {
    ip: tunnelMetadata.localIp,
    port: tunnelMetadata.localPort,
    ...splitHostPort(localTarget),
  };
  const running = process.platform === "win32" ? (binary.installed ? parseRunning(cli.output, processState.running) : false) : processState.running;
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
    protocol: tunnelMetadata.protocol || getEnvValue(["PLAYIT_PROTOCOL"]) || extractProtocol(inspectionContent),
    tunnelId: tunnelMetadata.tunnelId || getEnvValue(["PLAYIT_TUNNEL_ID"]) || extractTunnelId(inspectionContent),
    lastCheckedAt: new Date().toISOString(),
    lastSuccessfulRefreshAt: binary.installed && cli.commandResults.some((result) => result.ok) ? new Date().toISOString() : null,
    diagnostics: {
      binaryPath: binary.path,
      binaryDetectedBy: binary.detectedBy || binary.diagnostics.find((item) => item.ok)?.method || null,
      binaryProcessId: binary.processId || null,
      binaryChecks: binary.diagnostics,
      commandDiscovery: commands.diagnostics,
      commandResults: cli.commandResults,
      detectionMethod: processState.diagnostics.detectionMethod || processState.diagnostics.method || null,
      systemctlState: processState.diagnostics.systemctlState || null,
      cliState: processState.diagnostics.cliState || null,
      process: processState.diagnostics,
      processCommandLines: processCommandLines.diagnostics,
      tunnelMetadataSources: tunnelMetadata.diagnostics,
      tunnelMetadataFieldSources: tunnelMetadata.fieldSources,
      configFiles: configResult.diagnostics,
      logFiles: logResult.diagnostics,
      configPathUsed: configResult.path,
      logPathUsed: logResult.path,
      addressSource: tunnelMetadata.fieldSources.tunnelAddress || (tunnelAddress ? "env_or_local_file" : null),
      localTargetSource: tunnelMetadata.fieldSources.localTarget || (localTarget ? "env_or_local_file" : null),
    },
  };
}

module.exports = {
  getPlayitSnapshot,
};
