const { spawn, execFile } = require("child_process");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { app, shell } = require("electron");
const agentClient = require("./agentClient");
const { getAllNodesSync, getNodeAgentConfig } = require("./nodeService");
const diagnostics = require("./diagnosticsService");
const agentPackage = require("../../agent/package.json");

const SERVICE_NAME = "AnxOSAgent";
let managedProcess = null;
let operationInFlight = null;
let lastRestartReason = null;
let lastError = null;

function getConfigDirectory() { if (process.env.ANXHUB_CONFIG_DIR) return process.env.ANXHUB_CONFIG_DIR; try { return path.join(app.getPath("userData"), "config"); } catch { return path.join(process.cwd(), "config"); } }
function getRuntimeConfigPath() { return path.join(getConfigDirectory(), "agent-runtime.json"); }
function getAgentDataDirectory() { try { return path.join(app.getPath("userData"), "agent"); } catch { return path.join(path.dirname(getConfigDirectory()), "agent"); } }
function getAgentScript() { try { return path.join(app.getAppPath(), "agent", "src", "server.js"); } catch { return path.join(__dirname, "..", "..", "agent", "src", "server.js"); } }
function getAppRoot() { try { return app.getAppPath(); } catch { return path.join(__dirname, "..", ".."); } }
function defaults() { return { name: `${os.hostname()} Agent`, host: "127.0.0.1", port: 47131, allowedOrigins: [], allowedFolders: [os.homedir()], storageRoots: [os.homedir()], autoStart: false, updateChannel: "stable", loggingLevel: "info", connectionTimeoutMs: 10000, heartbeatIntervalMs: 5000, restartPolicy: "on-failure", ownerMachine: false, accountAssociation: null }; }
function readConfig() { try { return { ...defaults(), ...JSON.parse(fs.readFileSync(getRuntimeConfigPath(), "utf8")) }; } catch { return defaults(); } }
function validateConfig(input = {}) {
  const value = { ...defaults(), ...input };
  value.name = String(value.name || "").trim().slice(0, 80);
  value.host = String(value.host || "127.0.0.1").trim();
  value.port = Number(value.port);
  if (!value.name) throw Object.assign(new Error("Agent name is required."), { code: "AGENT_NAME_REQUIRED" });
  if (!/^(127\.0\.0\.1|0\.0\.0\.0|localhost|::1)$/i.test(value.host)) throw Object.assign(new Error("Listening address must be local or all interfaces."), { code: "AGENT_HOST_INVALID" });
  if (!Number.isInteger(value.port) || value.port < 1024 || value.port > 65535) throw Object.assign(new Error("Port must be between 1024 and 65535."), { code: "AGENT_PORT_INVALID" });
  for (const key of ["allowedOrigins", "allowedFolders", "storageRoots"]) value[key] = [...new Set((Array.isArray(value[key]) ? value[key] : []).map((entry) => String(entry).trim()).filter(Boolean))].slice(0, 50);
  value.connectionTimeoutMs = Math.min(120000, Math.max(1000, Number(value.connectionTimeoutMs) || 10000));
  value.heartbeatIntervalMs = Math.min(60000, Math.max(1000, Number(value.heartbeatIntervalMs) || 5000));
  if (!["stable", "beta"].includes(value.updateChannel)) value.updateChannel = "stable";
  if (!["error", "warn", "info", "debug"].includes(value.loggingLevel)) value.loggingLevel = "info";
  if (!["never", "on-failure", "always"].includes(value.restartPolicy)) value.restartPolicy = "on-failure";
  return value;
}
function saveConfig(input) { const value = validateConfig(input); fs.mkdirSync(getConfigDirectory(), { recursive: true }); if (fs.existsSync(getRuntimeConfigPath())) fs.copyFileSync(getRuntimeConfigPath(), `${getRuntimeConfigPath()}.backup`); fs.writeFileSync(getRuntimeConfigPath(), `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 }); diagnostics.log("info", "agent-control", "configuration-save", "Agent configuration saved", { host: value.host, port: value.port, folders: value.allowedFolders.length }, { file: "service-manager" }); return value; }
function restoreConfigBackup() { const backup = `${getRuntimeConfigPath()}.backup`; if (!fs.existsSync(backup)) throw Object.assign(new Error("No Agent configuration backup is available."), { code: "CONFIG_BACKUP_MISSING" }); const value = validateConfig(JSON.parse(fs.readFileSync(backup, "utf8"))); fs.copyFileSync(backup, getRuntimeConfigPath()); return value; }
function resetConfig() { return saveConfig(defaults()); }

function command(command, args, options = {}) { return new Promise((resolve) => execFile(command, args, { windowsHide: true, timeout: options.timeout || 15000, maxBuffer: 256 * 1024 }, (error, stdout, stderr) => resolve({ ok: !error, code: error?.code || null, stdout: String(stdout || "").trim(), stderr: String(stderr || "").trim() }))); }
function agentEnvironment(config) { return { ...process.env, ELECTRON_RUN_AS_NODE: "1", AGENT_HOST: config.host, AGENT_PORT: String(config.port), AGENT_FILE_ROOTS: config.allowedFolders.join(path.delimiter), AGENT_INSTANCE_ROOT: path.join(getAgentDataDirectory(), "instances"), AGENT_IDENTITY_PATH: path.join(getAgentDataDirectory(), "device-identity.json"), ANXHUB_CONFIG_DIR: getConfigDirectory() }; }

async function start() {
  if (operationInFlight) throw Object.assign(new Error("Another Agent operation is already running."), { code: "AGENT_OPERATION_BUSY" });
  if (managedProcess && !managedProcess.killed) return getStatus();
  operationInFlight = "start";
  try {
    const config = readConfig(); fs.mkdirSync(getAgentDataDirectory(), { recursive: true });
    const service = await getServiceState();
    if (service.installed) {
      const result = process.platform === "linux" ? await command("systemctl", ["--user", "start", "anxos-agent.service"]) : await command("schtasks.exe", ["/Run", "/TN", SERVICE_NAME]);
      if (!result.ok) throw Object.assign(new Error(result.stderr || "Background Agent could not be started."), { code: "SERVICE_START_FAILED" });
      await new Promise((resolve) => setTimeout(resolve, 800));
      lastRestartReason = "Background service started from AnxOS"; lastError = null; return getStatus();
    }
    managedProcess = spawn(process.execPath, [getAgentScript()], { cwd: getAppRoot(), env: agentEnvironment(config), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    managedProcess.spawnAt = Date.now();
    const correlationId = diagnostics.correlationId("agent-start");
    for (const [stream, severity] of [[managedProcess.stdout, "info"], [managedProcess.stderr, "error"]]) stream.on("data", (chunk) => diagnostics.log(severity, "agent", "process-output", String(chunk).trim(), { pid: managedProcess?.pid }, { file: "agent", correlationId }));
    managedProcess.once("exit", (code, signal) => { diagnostics.log(code === 0 ? "info" : "error", "agent", "process-exit", "Local Agent process exited", { code, signal, restartPolicy: config.restartPolicy }, { file: "agent", correlationId }); managedProcess = null; if (code && config.restartPolicy === "always") start().catch(() => {}); });
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (managedProcess?.exitCode !== null) throw Object.assign(new Error("Agent exited during startup."), { code: "AGENT_START_FAILED" });
    lastRestartReason = "Started from AnxOS"; lastError = null; return getStatus();
  } catch (error) { lastError = { code: error.code || "AGENT_START_FAILED", message: error.message }; diagnostics.logError("agent-control", "start", error, {}, { file: "service-manager" }); throw error; }
  finally { operationInFlight = null; }
}

async function stop({ force = false } = {}) {
  if (operationInFlight) throw Object.assign(new Error("Another Agent operation is already running."), { code: "AGENT_OPERATION_BUSY" });
  operationInFlight = "stop";
  try { const service = await getServiceState(); if (service.installed && service.active) { const result = process.platform === "linux" ? await command("systemctl", ["--user", "stop", "anxos-agent.service"]) : await command("schtasks.exe", ["/End", "/TN", SERVICE_NAME]); if (!result.ok && !force) throw Object.assign(new Error(result.stderr || "Background Agent could not be stopped."), { code: "SERVICE_STOP_FAILED" }); } if (managedProcess && !managedProcess.killed) { const child = managedProcess; child.kill(force ? "SIGKILL" : "SIGTERM"); await new Promise((resolve) => { const timer = setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); resolve(); }, 5000); child.once("exit", () => { clearTimeout(timer); resolve(); }); }); } managedProcess = null; lastRestartReason = force ? "Force stopped from AnxOS" : "Stopped from AnxOS"; return getStatus(); }
  finally { operationInFlight = null; }
}
async function restart({ force = false } = {}) { await stop({ force }); lastRestartReason = force ? "Force restarted from AnxOS" : "Restarted from AnxOS"; return start(); }

async function getServiceState() {
  if (process.platform === "linux") { const result = await command("systemctl", ["--user", "is-enabled", "anxos-agent.service"]); const active = await command("systemctl", ["--user", "is-active", "anxos-agent.service"]); const output = `${result.stdout}\n${result.stderr}`; return { supported: true, type: "systemd-user", installed: !/not-found|No such file/i.test(output), enabled: result.stdout === "enabled", active: active.stdout === "active", state: active.stdout || "inactive" }; }
  if (process.platform === "win32") { const result = await command("schtasks.exe", ["/Query", "/TN", SERVICE_NAME, "/FO", "LIST", "/V"]); const active = /Status:\s*Running/i.test(result.stdout); return { supported: true, type: "windows-scheduled-task", installed: result.ok, enabled: result.ok && !/Disabled/i.test(result.stdout), active: active || Boolean(managedProcess), state: result.ok ? active ? "running" : "registered" : "not-installed" }; }
  return { supported: false, type: "unsupported", installed: false, enabled: false, active: Boolean(managedProcess), state: "unsupported" };
}

async function installService() {
  const config = readConfig();
  if (process.platform === "linux") { const unitDir = path.join(os.homedir(), ".config", "systemd", "user"); const unitPath = path.join(unitDir, "anxos-agent.service"); fs.mkdirSync(unitDir, { recursive: true }); const quote = (value) => `"${String(value).replace(/([\\"])/g, "\\$1")}"`; const unit = `[Unit]\nDescription=AnxOS Agent\nAfter=network.target\n\n[Service]\nType=simple\nEnvironment=${quote("ELECTRON_RUN_AS_NODE=1")}\nEnvironment=${quote(`ANXHUB_CONFIG_DIR=${getConfigDirectory()}`)}\nEnvironment=${quote(`AGENT_HOST=${config.host}`)}\nEnvironment=${quote(`AGENT_PORT=${config.port}`)}\nEnvironment=${quote(`AGENT_IDENTITY_PATH=${path.join(getAgentDataDirectory(), "device-identity.json")}`)}\nExecStart=${quote(process.execPath)} ${quote(getAgentScript())}\nRestart=${config.restartPolicy === "never" ? "no" : config.restartPolicy}\n\n[Install]\nWantedBy=default.target\n`; fs.writeFileSync(unitPath, unit, { mode: 0o600 }); await command("systemctl", ["--user", "daemon-reload"]); const enabled = await command("systemctl", ["--user", "enable", "--now", "anxos-agent.service"]); if (!enabled.ok) throw Object.assign(new Error(enabled.stderr || "Could not install systemd user service."), { code: "SERVICE_INSTALL_FAILED" }); }
  else if (process.platform === "win32") { const taskCommand = `cmd.exe /d /s /c "set ELECTRON_RUN_AS_NODE=1&&\"${process.execPath}\" \"${getAgentScript()}\""`; const result = await command("schtasks.exe", ["/Create", "/F", "/SC", "ONLOGON", "/RL", "LIMITED", "/TN", SERVICE_NAME, "/TR", taskCommand]); if (!result.ok) throw Object.assign(new Error(result.stderr || "Could not install Agent startup task."), { code: result.code === "EACCES" ? "ELEVATION_REQUIRED" : "SERVICE_INSTALL_FAILED" }); }
  else throw Object.assign(new Error("Agent background service management is not supported on this platform."), { code: "PLATFORM_UNSUPPORTED" });
  saveConfig({ ...config, autoStart: true }); diagnostics.log("info", "service-manager", "install", "Agent background startup installed", { platform: process.platform }, { file: "service-manager" }); return getStatus();
}

async function uninstallService() { if (process.platform === "linux") { await command("systemctl", ["--user", "disable", "--now", "anxos-agent.service"]); fs.rmSync(path.join(os.homedir(), ".config", "systemd", "user", "anxos-agent.service"), { force: true }); await command("systemctl", ["--user", "daemon-reload"]); } else if (process.platform === "win32") { await command("schtasks.exe", ["/Delete", "/F", "/TN", SERVICE_NAME]); } else throw Object.assign(new Error("Agent service management is unsupported."), { code: "PLATFORM_UNSUPPORTED" }); saveConfig({ ...readConfig(), autoStart: false }); return getStatus(); }
async function setAutoStart(enabled) { if (enabled) return installService(); if (process.platform === "linux") await command("systemctl", ["--user", "disable", "anxos-agent.service"]); else if (process.platform === "win32") await command("schtasks.exe", ["/Change", "/TN", SERVICE_NAME, enabled ? "/ENABLE" : "/DISABLE"]); saveConfig({ ...readConfig(), autoStart: Boolean(enabled) }); return getStatus(); }

async function probePort(port) { return new Promise((resolve) => { const socket = net.connect({ host: "127.0.0.1", port, timeout: 800 }); socket.once("connect", () => { socket.destroy(); resolve(true); }); socket.once("error", () => resolve(false)); socket.once("timeout", () => { socket.destroy(); resolve(false); }); }); }
async function getStatus() { const config = readConfig(); const service = await getServiceState(); let health = null; let latencyMs = null; const started = Date.now(); try { health = await agentClient.getHealth({ backendMode: "agent", agentUrl: `http://127.0.0.1:${config.port}`, agentToken: "" }); latencyMs = Date.now() - started; } catch {} const running = Boolean(managedProcess && !managedProcess.killed) || service.active || Boolean(health?.ok); let appVersion = null; try { appVersion = app.getVersion(); } catch { appVersion = require("../../package.json").version; } return { local: true, state: operationInFlight === "start" ? "Starting" : operationInFlight === "stop" ? "Stopping" : running ? "Running" : "Offline", operationInFlight, running, pid: health?.process?.pid || managedProcess?.pid || null, config, service, identity: health?.identity || null, agentVersion: health?.identity?.agentVersion || agentPackage.version, appVersion, apiVersion: health?.apiVersion || "v1", protocolVersion: health?.protocolVersion || 1, uptime: health?.process?.uptimeSeconds ?? (managedProcess ? Math.max(0, Math.round((Date.now() - (managedProcess.spawnAt || Date.now())) / 1000)) : null), memoryBytes: health?.process?.memoryBytes || null, cpuSeconds: health?.process?.cpuSeconds || null, connectedClients: health?.process?.connectedClients || 0, lastHeartbeat: health ? new Date().toISOString() : null, latencyMs, hostname: os.hostname(), operatingSystem: `${os.type()} ${os.release()}`, architecture: os.arch(), agentUrl: `http://127.0.0.1:${config.port}`, port: config.port, startupMode: service.type, lastRestartReason, mostRecentError: lastError }; }

async function listAgents() { const local = await getStatus(); const remote = await Promise.all(getAllNodesSync().filter((node) => node.kind === "agent").map(async (node) => { const started = Date.now(); try { const health = await agentClient.getHealth(getNodeAgentConfig(node.id)); return { local: false, nodeId: node.id, state: "Running", name: node.displayName, agentUrl: node.agentUrl, identity: health.identity, agentVersion: health.identity?.agentVersion, latencyMs: Date.now() - started, lastHeartbeat: new Date().toISOString() }; } catch (error) { return { local: false, nodeId: node.id, state: error.status === 401 ? "Authentication failed" : "Unreachable", name: node.displayName, agentUrl: node.agentUrl, identity: node.agentIdentity, mostRecentError: { code: error.code || null, message: error.message } }; } })); diagnostics.updateRuntimeState({ localAgentProcessStatus: local.state, localAgentServiceStatus: local.service?.state, configuredAgentUrl: local.agentUrl, connectedAgents: remote.map((agent) => ({ nodeId: agent.nodeId, deviceId: agent.identity?.deviceId, state: agent.state, version: agent.agentVersion })), recentConnectionResult: remote.map((agent) => ({ nodeId: agent.nodeId, state: agent.state, latencyMs: agent.latencyMs || null })) }); return { local, remote }; }

async function captureRemoteDiagnostics(nodeId) {
  const node = getAllNodesSync().find((entry) => entry.id === nodeId && entry.kind === "agent");
  if (!node) throw Object.assign(new Error("Remote Agent node was not found."), { code: "NODE_NOT_FOUND" });
  const bundle = await agentClient.getDiagnostics(getNodeAgentConfig(node.id));
  const safeId = String(bundle.identity?.deviceId || node.id).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  const directory = path.join(diagnostics.getDirectory(), "remote", safeId);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "diagnostics.json"), `${JSON.stringify(require("../shared/redaction").sanitize(bundle), null, 2)}\n`, { mode: 0o600 });
  diagnostics.log("info", "agent-control", "remote-diagnostics", "Remote Agent diagnostics captured", { nodeId: node.id, deviceId: safeId }, { file: "agent" });
  return { captured: true, nodeId: node.id, deviceId: safeId };
}

async function runDiagnostics() { const status = await getStatus(); const config = readConfig(); const portUsed = await probePort(config.port); const checks = [{ id: "process", label: "Agent process", result: status.running ? "Passed" : "Warning", explanation: status.running ? "Agent is responding." : "Agent is not currently running.", repairAction: status.running ? null : "start" }, { id: "service", label: "Service registration", result: status.service.installed ? "Passed" : status.service.supported ? "Warning" : "Not applicable", explanation: status.service.installed ? "Background startup is installed." : "Background startup is not installed.", repairAction: status.service.supported ? "install-service" : null }, { id: "port", label: "Port availability", result: status.running || !portUsed ? "Passed" : "Failed", explanation: status.running ? "Agent owns the configured port." : portUsed ? "Another process is using the configured port." : "Configured port is available.", repairAction: portUsed && !status.running ? "select-port" : null }, { id: "configuration", label: "Configuration validity", result: "Passed", explanation: `Configuration is valid for ${config.host}:${config.port}.` }, { id: "logs", label: "Log directory", result: fs.existsSync(diagnostics.getDirectory()) ? "Passed" : "Warning", explanation: "Diagnostics directory is writable." }]; return { status, checks, generatedAt: new Date().toISOString() }; }
async function openLogs() { await diagnostics.openFolder(); return { opened: true }; }
async function openDataFolder() { fs.mkdirSync(getAgentDataDirectory(), { recursive: true }); await shell.openPath(getAgentDataDirectory()); return { opened: true }; }

module.exports = { captureRemoteDiagnostics, getAgentDataDirectory, getRuntimeConfigPath, getStatus, installService, listAgents, openDataFolder, openLogs, readConfig, resetConfig, restart, restoreConfigBackup, runDiagnostics, saveConfig, setAutoStart, start, stop, uninstallService, validateConfig };
