const { spawn, execFile } = require("child_process");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { app, shell } = require("electron");
const agentClient = require("./agentClient");
const { getAllNodesSync, getNodeAgentConfig, getSelectedNodeId } = require("./nodeService");
const diagnostics = require("./diagnosticsService");
const agentPackage = require("../../agent/package.json");
const { getReleaseInfo } = require("../shared/releaseConfig");
const { getBundledLocalAgentRuntime, getPublicLocalAgentRuntimeInfo } = require("./localAgentRuntimeService");
const { testConnection } = require("./agentClient");
const {
  pairLocalAgent,
  readLocalAgentPairingStatus,
  rotateLocalAgentCredentials,
} = require("./localAgentPairingService");

const SERVICE_NAME = "AnxOSAgent";
const LOCAL_AGENT_DISPLAY_NAME = "This PC";
const REMOTE_DIAGNOSTICS_CACHE_MS = 30000;
let managedProcess = null;
let operationInFlight = null;
let lastRestartReason = null;
let lastError = null;
const remoteDiagnosticsRequests = new Map();
const remoteDiagnosticsCache = new Map();

function getConfigDirectory() { if (process.env.ANXHUB_CONFIG_DIR) return process.env.ANXHUB_CONFIG_DIR; try { return path.join(app.getPath("userData"), "config"); } catch { return path.join(process.cwd(), "config"); } }
function getRuntimeConfigPath() { return path.join(getConfigDirectory(), "agent-runtime.json"); }
function getAgentDataDirectory() { try { return path.join(app.getPath("userData"), "agent"); } catch { return path.join(path.dirname(getConfigDirectory()), "agent"); } }
function getAgentLogsDirectory() { return path.join(getAgentDataDirectory(), "logs"); }
function getAgentInstancesDirectory() { return path.join(getAgentDataDirectory(), "instances"); }
function getAgentBackupsDirectory() { return path.join(getAgentDataDirectory(), "backups"); }
function getAgentTempDirectory() { return path.join(getAgentDataDirectory(), "tmp"); }
function getAgentScript() { return getBundledLocalAgentRuntime().agentScript; }
function getAppRoot() { return getBundledLocalAgentRuntime().workingDirectory; }
function defaults() { return { name: `${os.hostname()} Agent`, host: "127.0.0.1", port: 47131, allowedOrigins: [], allowedFolders: [os.homedir(), getAgentInstancesDirectory(), getAgentBackupsDirectory()], storageRoots: [getAgentInstancesDirectory(), getAgentBackupsDirectory()], autoStart: false, updateChannel: "stable", loggingLevel: "info", connectionTimeoutMs: 10000, heartbeatIntervalMs: 5000, restartPolicy: "on-failure", ownerMachine: true, accountAssociation: null }; }
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
function ensureManagedAgentDirectories() {
  const directories = [
    getConfigDirectory(),
    getAgentDataDirectory(),
    getAgentLogsDirectory(),
    getAgentInstancesDirectory(),
    getAgentBackupsDirectory(),
    getAgentTempDirectory(),
  ];
  directories.forEach((directory) => fs.mkdirSync(directory, { recursive: true }));
  return directories;
}

function agentEnvironment(config) {
  const runtime = getBundledLocalAgentRuntime();
  return { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", AGENT_HOST: config.host, AGENT_PORT: String(config.port), AGENT_FILE_ROOTS: config.allowedFolders.join(path.delimiter), AGENT_INSTANCE_ROOT: getAgentInstancesDirectory(), AGENT_BACKUP_ROOT: getAgentBackupsDirectory(), AGENT_LOG_DIR: getAgentLogsDirectory(), AGENT_TEMP_DIR: getAgentTempDirectory(), AGENT_IDENTITY_PATH: path.join(getAgentDataDirectory(), "device-identity.json"), ANXHUB_CONFIG_DIR: getConfigDirectory(), ANXOS_LOCAL_AGENT_RUNTIME_ROOT: runtime.runtimeRoot, ANXOS_LOCAL_AGENT_RUNTIME_MANIFEST: runtime.manifestPath };
}
function isWindowsAccessDenied(result = {}) { return /access is denied|administrator|elevat/i.test(`${result.stderr || ""}\n${result.stdout || ""}\n${result.code || ""}`); }
function createWindowsElevationError(action = "modify") { return Object.assign(new Error(`Windows requires administrator permission to ${action} the Agent service. Run AnxOS Control Center as Administrator, then retry the Agent service action.`), { code: "ELEVATION_REQUIRED", recoverySuggestion: "Close AnxOS Control Center, right-click it, choose Run as administrator, then retry the Agent service action." }); }

async function getWindowsElevationState() {
  if (process.platform !== "win32") return { supported: false, elevated: false, state: "not-applicable" };
  const result = await command("net.exe", ["session"], { timeout: 5000 });
  if (result.ok) return { supported: true, elevated: true, state: "elevated" };
  if (isWindowsAccessDenied(result) || result.code === 2) return { supported: true, elevated: false, state: "not-elevated" };
  return { supported: true, elevated: null, state: "unverifiable", errorCode: result.code, message: result.stderr || result.stdout || "Could not verify administrator state." };
}

function expectedWindowsServiceCommand(config = readConfig()) {
  void config;
  return `"${process.execPath}" "${getAgentScript()}"`;
}

function normalizeCommandForComparison(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/\\/g, "/").toLowerCase();
}

function getWindowsServiceBinaryPath(stdout = "") {
  const match = String(stdout || "").match(/BINARY_PATH_NAME\s*:\s*(.+)$/im);
  return match ? match[1].trim() : "";
}

function getWindowsServiceState(stdout = "") {
  const match = String(stdout || "").match(/STATE\s*:\s*\d+\s+([A-Z_]+)/im);
  return match ? match[1].trim().toLowerCase().replace(/_/g, "-") : "";
}

function validateWindowsServiceRegistration(stdout = "", config = readConfig()) {
  const serviceCommand = getWindowsServiceBinaryPath(stdout);
  const normalizedService = normalizeCommandForComparison(serviceCommand);
  const expectedProcess = normalizeCommandForComparison(process.execPath);
  const expectedScript = normalizeCommandForComparison(getAgentScript());
  const valid = Boolean(
    serviceCommand &&
    normalizedService.includes(expectedProcess) &&
    normalizedService.includes(expectedScript)
  );
  return {
    valid,
    command: serviceCommand || null,
    expected: expectedWindowsServiceCommand(config),
    issues: [
      serviceCommand ? null : "Service binary path could not be read.",
      normalizedService.includes(expectedProcess) ? null : "Service does not point at the current AnxOS runtime.",
      normalizedService.includes(expectedScript) ? null : "Service does not point at the bundled Agent server.",
    ].filter(Boolean),
  };
}

function getRegistrationStatusFromServiceState(service = {}) {
  if (!service.supported) return "unsupported";
  if (service.verification?.state === "unverifiable") return "unverifiable";
  if (!service.installed) return "missing";
  if (service.valid === false) return "invalid";
  return "valid";
}

function ensureLocalAgentBackendSelected(config) {
  const effective = agentClient.getEffectiveAgentSettings();
  if (effective.overrides?.backendMode || effective.overrides?.agentUrl) {
    return { changed: false, reason: "environment-override" };
  }
  const localAgentUrl = getLocalAgentUrl(config);
  const currentUrl = normalizeAgentUrlForComparison(effective.agentUrl);
  const localUrl = normalizeAgentUrlForComparison(localAgentUrl);
  if (effective.backendMode === "agent" && currentUrl === localUrl) {
    return { changed: false, reason: "already-selected" };
  }
  if (effective.backendMode === "agent" && currentUrl && currentUrl !== localUrl) {
    return { changed: false, reason: "remote-agent-selected" };
  }
  const settings = agentClient.saveAgentSettings({
    backendMode: "agent",
    agentUrl: localAgentUrl,
  });
  diagnostics.log("info", "agent-control", "select-local-agent-backend", "Local Agent backend selected after starting the bundled Agent", {
    agentUrl: localAgentUrl,
    previousMode: effective.backendMode,
  }, { file: "service-manager" });
  return { changed: true, reason: "selected-local-agent", settings };
}

async function start() {
  if (operationInFlight) throw Object.assign(new Error("Another Agent operation is already running."), { code: "AGENT_OPERATION_BUSY" });
  if (managedProcess && !managedProcess.killed) return getStatus();
  operationInFlight = "start";
  try {
    const config = readConfig(); fs.mkdirSync(getAgentDataDirectory(), { recursive: true });
    const service = await getServiceState();
    const agentUrl = getLocalAgentUrl(config);
    const existingHealth = await agentClient.getHealth(getLocalAgentHealthConfig(config)).catch(() => null);
    if (existingHealth?.ok) {
      ensureLocalAgentBackendSelected(config);
      lastRestartReason = "Connected to an already running local Agent";
      lastError = null;
      diagnostics.log("info", "agent-control", "start-existing-agent", "Local Agent was already listening on the configured port", {
        agentUrl,
        pid: existingHealth?.process?.pid || null,
      }, { file: "service-manager" });
      return getStatus();
    }
    const portUsed = await probePort(config.port);
    if (portUsed && !service.active) {
      throw Object.assign(new Error(`Port ${config.port} is already in use by another process. Choose a different Agent port or stop the conflicting service.`), {
        code: "AGENT_PORT_IN_USE",
      });
    }
    if (service.installed && service.valid !== false) {
      const result = process.platform === "linux" ? await command("systemctl", ["--user", "start", "anxos-agent.service"]) : await command("sc.exe", ["start", SERVICE_NAME]);
      if (!result.ok) throw Object.assign(new Error(result.stderr || "Background Agent could not be started."), { code: "SERVICE_START_FAILED" });
      await new Promise((resolve) => setTimeout(resolve, 800));
      ensureLocalAgentBackendSelected(config);
      lastRestartReason = "Background service started from AnxOS"; lastError = null; return getStatus();
    }
    const runtime = getBundledLocalAgentRuntime();
    if (!runtime.exists) {
      throw Object.assign(new Error("Bundled Local Agent runtime is missing or incomplete. Repair AnxOS Control Center, then try again."), { code: "LOCAL_AGENT_RUNTIME_MISSING" });
    }
    managedProcess = spawn(process.execPath, [getAgentScript()], { cwd: getAppRoot(), env: agentEnvironment(config), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    managedProcess.spawnAt = Date.now();
    const correlationId = diagnostics.correlationId("agent-start");
    for (const [stream, severity] of [[managedProcess.stdout, "info"], [managedProcess.stderr, "error"]]) stream.on("data", (chunk) => diagnostics.log(severity, "agent", "process-output", String(chunk).trim(), { pid: managedProcess?.pid }, { file: "agent", correlationId }));
    managedProcess.once("exit", (code, signal) => { diagnostics.log(code === 0 ? "info" : "error", "agent", "process-exit", "Local Agent process exited", { code, signal, restartPolicy: config.restartPolicy }, { file: "agent", correlationId }); managedProcess = null; if (code && config.restartPolicy === "always") start().catch(() => {}); });
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (managedProcess?.exitCode !== null) throw Object.assign(new Error("Agent exited during startup."), { code: "AGENT_START_FAILED" });
    await waitForLocalAgentHealth(config, config.connectionTimeoutMs || 3500);
    ensureLocalAgentBackendSelected(config);
    lastRestartReason = "Started from AnxOS"; lastError = null; return getStatus();
  } catch (error) { lastError = { code: error.code || "AGENT_START_FAILED", message: error.message }; diagnostics.logError("agent-control", "start", error, {}, { file: "service-manager" }); throw error; }
  finally { operationInFlight = null; }
}

async function stop({ force = false } = {}) {
  if (operationInFlight) throw Object.assign(new Error("Another Agent operation is already running."), { code: "AGENT_OPERATION_BUSY" });
  operationInFlight = "stop";
  try { const config = readConfig(); const service = await getServiceState(); if (service.installed && service.active) { const result = process.platform === "linux" ? await command("systemctl", ["--user", "stop", "anxos-agent.service"]) : await command("sc.exe", ["stop", SERVICE_NAME]); if (!result.ok && !force && !/not been started|not running/i.test(`${result.stdout}\n${result.stderr}`)) throw Object.assign(new Error(result.stderr || "Background Agent could not be stopped."), { code: "SERVICE_STOP_FAILED" }); } if (managedProcess && !managedProcess.killed) { const child = managedProcess; child.kill(force ? "SIGKILL" : "SIGTERM"); await new Promise((resolve) => { const timer = setTimeout(() => { if (child.exitCode === null) child.kill("SIGKILL"); resolve(); }, 5000); child.once("exit", () => { clearTimeout(timer); resolve(); }); }); } managedProcess = null; await waitForLocalAgentStopped(config).catch(() => false); lastRestartReason = force ? "Force stopped from AnxOS" : "Stopped from AnxOS"; return getStatus(); }
  finally { operationInFlight = null; }
}
async function restart({ force = false } = {}) { await stop({ force }); lastRestartReason = force ? "Force restarted from AnxOS" : "Restarted from AnxOS"; return start(); }

async function getServiceState() {
  if (process.platform === "linux") {
    const result = await command("systemctl", ["--user", "is-enabled", "anxos-agent.service"]);
    const active = await command("systemctl", ["--user", "is-active", "anxos-agent.service"]);
    const output = `${result.stdout}\n${result.stderr}`;
    const installed = !/not-found|No such file/i.test(output);
    const unitPath = path.join(os.homedir(), ".config", "systemd", "user", "anxos-agent.service");
    let valid = installed;
    const issues = [];
    if (installed) {
      try {
        const unit = fs.readFileSync(unitPath, "utf8");
        const normalizedUnit = normalizeCommandForComparison(unit);
        if (!normalizedUnit.includes(normalizeCommandForComparison(getAgentScript()))) issues.push("Unit does not point at the current bundled Agent server.");
        if (!normalizedUnit.includes(normalizeCommandForComparison(`ANXHUB_CONFIG_DIR=${getConfigDirectory()}`))) issues.push("Unit does not use the current Agent config directory.");
        valid = issues.length === 0;
      } catch (error) {
        valid = false;
        issues.push(error?.code === "ENOENT" ? "Unit file is missing." : "Unit file could not be verified.");
      }
    }
    const service = { supported: true, type: "systemd-user", installed, valid, enabled: result.stdout === "enabled", active: active.stdout === "active" && valid, state: installed && !valid ? "invalid" : active.stdout || "inactive", registrationStatus: installed ? valid ? "valid" : "invalid" : "missing", verification: { state: installed ? valid ? "valid" : "invalid" : "missing", issues }, privilege: { supported: false, elevated: false, state: "not-applicable" } };
    return service;
  }
  if (process.platform === "win32") {
    const result = await command("sc.exe", ["query", SERVICE_NAME]);
    const qc = await command("sc.exe", ["qc", SERVICE_NAME]);
    const combined = `${result.stdout}\n${result.stderr}\n${qc.stdout}\n${qc.stderr}`;
    const serviceState = getWindowsServiceState(result.stdout);
    const active = serviceState === "running" || serviceState === "start-pending";
    const privilege = await getWindowsElevationState();
    if (!result.ok || /does not exist|1060/i.test(combined)) {
      const unverifiable = isWindowsAccessDenied(result);
      return {
        supported: true,
        type: "windows-service",
        installed: false,
        valid: false,
        enabled: false,
        active: Boolean(managedProcess),
        state: unverifiable ? "unverifiable" : "not-installed",
        registrationStatus: unverifiable ? "unverifiable" : "missing",
        verification: {
          state: unverifiable ? "unverifiable" : "missing",
          issues: unverifiable ? ["Windows denied service verification."] : [],
          errorCode: result.code,
          message: result.stderr || result.stdout || null,
        },
        privilege,
        requiresElevation: privilege.elevated !== true,
      };
    }
    const verification = validateWindowsServiceRegistration(qc.stdout, readConfig());
    const enabled = !/START_TYPE\s*:\s*\d+\s+DISABLED/i.test(qc.stdout);
    const service = {
      supported: true,
      type: "windows-service",
      installed: true,
      valid: verification.valid,
      enabled,
      active: active || Boolean(managedProcess),
      state: active ? "running" : verification.valid ? serviceState || "stopped" : "invalid",
      registrationStatus: verification.valid ? "valid" : "invalid",
      verification: { state: verification.valid ? "valid" : "invalid", serviceState, ...verification },
      privilege,
      requiresElevation: privilege.elevated !== true,
    };
    return service;
  }
  return { supported: false, type: "unsupported", installed: false, enabled: false, active: Boolean(managedProcess), state: "unsupported" };
}

async function installService() {
  const config = readConfig();
  if (process.platform === "linux") { const unitDir = path.join(os.homedir(), ".config", "systemd", "user"); const unitPath = path.join(unitDir, "anxos-agent.service"); fs.mkdirSync(unitDir, { recursive: true }); const quote = (value) => `"${String(value).replace(/([\\"])/g, "\\$1")}"`; const unit = `[Unit]\nDescription=AnxOS Agent\nAfter=network.target\n\n[Service]\nType=simple\nEnvironment=${quote("ELECTRON_RUN_AS_NODE=1")}\nEnvironment=${quote(`ANXHUB_CONFIG_DIR=${getConfigDirectory()}`)}\nEnvironment=${quote(`AGENT_HOST=${config.host}`)}\nEnvironment=${quote(`AGENT_PORT=${config.port}`)}\nEnvironment=${quote(`AGENT_IDENTITY_PATH=${path.join(getAgentDataDirectory(), "device-identity.json")}`)}\nExecStart=${quote(process.execPath)} ${quote(getAgentScript())}\nRestart=${config.restartPolicy === "never" ? "no" : config.restartPolicy}\n\n[Install]\nWantedBy=default.target\n`; fs.writeFileSync(unitPath, unit, { mode: 0o600 }); await command("systemctl", ["--user", "daemon-reload"]); const enabled = await command("systemctl", ["--user", "enable", "--now", "anxos-agent.service"]); if (!enabled.ok) throw Object.assign(new Error(enabled.stderr || "Could not install systemd user service."), { code: "SERVICE_INSTALL_FAILED" }); }
  else if (process.platform === "win32") {
    const current = await getServiceState();
    if (current.installed && current.valid) {
      saveConfig({ ...config, autoStart: true });
      return getStatus();
    }
    if (current.privilege?.elevated !== true) throw createWindowsElevationError(current.installed ? "repair" : "install");
    if (current.installed) {
      await command("sc.exe", ["delete", SERVICE_NAME], { timeout: 30000 });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    const serviceCommand = expectedWindowsServiceCommand(config);
    const result = await command("sc.exe", ["create", SERVICE_NAME, "binPath=", serviceCommand, "start=", "auto", "DisplayName=", "AnxOS Local Agent"], { timeout: 30000 });
    if (!result.ok) throw (result.code === "EACCES" || isWindowsAccessDenied(result)) ? createWindowsElevationError(current.installed ? "repair" : "install") : Object.assign(new Error(result.stderr || "Could not install Agent Windows service."), { code: "SERVICE_INSTALL_FAILED" });
    await command("sc.exe", ["description", SERVICE_NAME, "Runs the AnxOS Local Agent for managing local servers, files, backups, dependencies, and services."], { timeout: 15000 });
    await command("sc.exe", ["failure", SERVICE_NAME, "reset=", "86400", "actions=", "restart/60000/restart/60000/none/0"], { timeout: 15000 });
    await command("reg.exe", ["add", `HKLM\\SYSTEM\\CurrentControlSet\\Services\\${SERVICE_NAME}`, "/v", "Environment", "/t", "REG_MULTI_SZ", "/d", `ELECTRON_RUN_AS_NODE=1\\0NODE_ENV=production\\0ANXHUB_CONFIG_DIR=${getConfigDirectory()}\\0AGENT_HOST=${config.host}\\0AGENT_PORT=${config.port}\\0AGENT_FILE_ROOTS=${config.allowedFolders.join(path.delimiter)}\\0AGENT_INSTANCE_ROOT=${getAgentInstancesDirectory()}\\0AGENT_BACKUP_ROOT=${getAgentBackupsDirectory()}\\0AGENT_LOG_DIR=${getAgentLogsDirectory()}\\0AGENT_TEMP_DIR=${getAgentTempDirectory()}\\0AGENT_IDENTITY_PATH=${path.join(getAgentDataDirectory(), "device-identity.json")}`, "/f"], { timeout: 15000 });
    const verified = await getServiceState();
    if (!verified.installed || !verified.valid) throw Object.assign(new Error("Agent Windows service was created but did not pass validation."), { code: "SERVICE_VERIFICATION_FAILED", details: verified.verification });
  }
  else throw Object.assign(new Error("Agent background service management is not supported on this platform."), { code: "PLATFORM_UNSUPPORTED" });
  saveConfig({ ...config, autoStart: true }); diagnostics.log("info", "service-manager", "install", "Agent background startup installed", { platform: process.platform }, { file: "service-manager" }); return getStatus();
}

async function uninstallService() { if (process.platform === "linux") { await command("systemctl", ["--user", "disable", "--now", "anxos-agent.service"]); fs.rmSync(path.join(os.homedir(), ".config", "systemd", "user", "anxos-agent.service"), { force: true }); await command("systemctl", ["--user", "daemon-reload"]); } else if (process.platform === "win32") { const service = await getServiceState(); if (service.installed && service.privilege?.elevated !== true) throw createWindowsElevationError("remove"); if (service.installed && service.active) await command("sc.exe", ["stop", SERVICE_NAME], { timeout: 30000 }); const result = await command("sc.exe", ["delete", SERVICE_NAME], { timeout: 30000 }); if (!result.ok && !/does not exist|1060/i.test(`${result.stdout}\n${result.stderr}`)) throw isWindowsAccessDenied(result) ? createWindowsElevationError("remove") : Object.assign(new Error(result.stderr || "Could not remove Agent Windows service."), { code: "SERVICE_UNINSTALL_FAILED" }); } else throw Object.assign(new Error("Agent service management is unsupported."), { code: "PLATFORM_UNSUPPORTED" }); saveConfig({ ...readConfig(), autoStart: false }); return getStatus(); }
async function setAutoStart(enabled) { if (enabled) return installService(); if (process.platform === "linux") await command("systemctl", ["--user", "disable", "anxos-agent.service"]); else if (process.platform === "win32") { const service = await getServiceState(); if (service.installed && service.privilege?.elevated !== true) throw createWindowsElevationError(enabled ? "enable" : "disable"); const result = await command("sc.exe", ["config", SERVICE_NAME, "start=", enabled ? "auto" : "disabled"], { timeout: 15000 }); if (!result.ok) throw isWindowsAccessDenied(result) ? createWindowsElevationError(enabled ? "enable" : "disable") : Object.assign(new Error(result.stderr || "Could not update Agent Windows service startup."), { code: "SERVICE_UPDATE_FAILED" }); } saveConfig({ ...readConfig(), autoStart: Boolean(enabled) }); return getStatus(); }

function installerStep(id, label, state = "pending", message = "") {
  return { id, label, state, message, at: new Date().toISOString() };
}

async function installLocalAgent(options = {}) {
  if (operationInFlight) throw Object.assign(new Error("Another Agent operation is already running."), { code: "AGENT_OPERATION_BUSY" });
  operationInFlight = "install";
  const steps = [
    installerStep("runtime", "Validate bundled runtime"),
    installerStep("directories", "Create managed folders"),
    installerStep("configuration", "Create secure configuration"),
    installerStep("credentials", "Generate local credentials"),
    installerStep("service", "Configure background startup"),
    installerStep("start", "Start Local Agent"),
    installerStep("verify", "Verify connection"),
  ];
  const mark = (id, state, message) => {
    const step = steps.find((entry) => entry.id === id);
    if (step) {
      step.state = state;
      step.message = message || step.message;
      step.at = new Date().toISOString();
    }
  };
  try {
    const runtime = getBundledLocalAgentRuntime();
    if (!runtime.exists) {
      mark("runtime", "failed", "The bundled Local Agent runtime is missing. Repair AnxOS Control Center, then retry.");
      throw Object.assign(new Error("Bundled Local Agent runtime is missing or incomplete."), { code: "LOCAL_AGENT_RUNTIME_MISSING", steps });
    }
    mark("runtime", "complete", "Bundled runtime is available.");

    ensureManagedAgentDirectories();
    mark("directories", "complete", "Managed folders are ready.");

    const current = readConfig();
    const config = saveConfig({
      ...current,
      name: LOCAL_AGENT_DISPLAY_NAME,
      host: "127.0.0.1",
      allowedFolders: current.allowedFolders?.length ? current.allowedFolders : defaults().allowedFolders,
      storageRoots: current.storageRoots?.length ? current.storageRoots : defaults().storageRoots,
      ownerMachine: true,
      autoStart: options.autoStart !== false,
    });
    mark("configuration", "complete", "Local Agent configuration is ready.");

    const localAgentUrl = getLocalAgentUrl(config);
    const pairing = pairLocalAgent({ agentUrl: localAgentUrl, rotate: true, reason: "local-agent-install" });
    mark("credentials", "complete", `Secure local credentials were generated. Fingerprint ${pairing.fingerprint || "available"}.`);

    let serviceWarning = null;
    if (options.installService !== false) {
      try {
        await installService();
        mark("service", "complete", "Background startup is configured.");
      } catch (error) {
        serviceWarning = {
          code: error.code || "SERVICE_INSTALL_SKIPPED",
          message: error.recoverySuggestion || error.message || "Background startup could not be configured.",
        };
        mark("service", error.code === "ELEVATION_REQUIRED" ? "blocked" : "warning", serviceWarning.message);
      }
    } else {
      mark("service", "skipped", "Background startup was skipped.");
    }

    const statusBeforeStart = await getStatus();
    if (!statusBeforeStart.running) {
      operationInFlight = null;
      await start();
      operationInFlight = "install";
    }
    mark("start", "complete", "Local Agent started.");

    const connection = await testConnection({ backendMode: "agent", agentUrl: localAgentUrl });
    if (!connection.connected) {
      mark("verify", "failed", connection.message || "Local Agent did not pass the connection check.");
      throw Object.assign(new Error(connection.message || "Local Agent did not pass the connection check."), { code: "LOCAL_AGENT_VERIFY_FAILED", steps });
    }
    mark("verify", "complete", "Desktop reconnected to the Local Agent.");
    lastRestartReason = "Installed Local Agent from AnxOS";
    lastError = null;
    return {
      ok: true,
      installed: true,
      started: true,
      serviceWarning,
      steps,
      status: await getStatus(),
    };
  } catch (error) {
    lastError = { code: error.code || "LOCAL_AGENT_INSTALL_FAILED", message: error.message };
    diagnostics.logError("agent-control", "install-local-agent", error, { steps }, { file: "service-manager" });
    error.steps = error.steps || steps;
    throw error;
  } finally {
    operationInFlight = null;
  }
}

async function pairLocalAgentSecurely(options = {}) {
  const config = readConfig();
  const localAgentUrl = getLocalAgentUrl(config);
  const result = options.rotate === true
    ? rotateLocalAgentCredentials({ agentUrl: localAgentUrl, reason: options.reason || "local-agent-rotation" })
    : pairLocalAgent({ agentUrl: localAgentUrl, reason: options.reason || "local-agent-pairing" });
  diagnostics.log("info", "agent-control", "local-pairing", "Local Agent pairing state updated", {
    fingerprint: result.fingerprint || null,
    rotated: result.rotated,
    credentialState: result.credentialState,
  }, { file: "service-manager" });
  return {
    ...result,
    status: await getStatus(),
  };
}

async function probePort(port) { return new Promise((resolve) => { const socket = net.connect({ host: "127.0.0.1", port, timeout: 800 }); socket.once("connect", () => { socket.destroy(); resolve(true); }); socket.once("error", () => resolve(false)); socket.once("timeout", () => { socket.destroy(); resolve(false); }); }); }

async function waitForLocalAgentHealth(config, timeoutMs = 3500) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const health = await agentClient.getHealth(getLocalAgentHealthConfig(config));
      if (health?.ok) return health;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (lastError) throw lastError;
  throw Object.assign(new Error("Local Agent did not become healthy before the startup timeout."), { code: "AGENT_START_TIMEOUT" });
}

async function waitForLocalAgentStopped(config, timeoutMs = 3500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const health = await agentClient.getHealth(getLocalAgentHealthConfig(config)).catch(() => null);
    if (!health?.ok) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function getLocalAgentUrl(config) {
  return `http://127.0.0.1:${config.port}`;
}

function getLocalAgentHealthConfig(config) {
  return {
    backendMode: "agent",
    agentUrl: getLocalAgentUrl(config),
    agentToken: "",
    targetLabel: "local-agent",
    suppressConnectionRefusedLog: true,
    logThrottleMs: 60000,
  };
}

function getRemoteHealthConfig(node, selectedNodeId) {
  return {
    ...getNodeAgentConfig(node.id),
    targetLabel: node.id === selectedNodeId ? "selected-agent" : "remote-agent",
    logThrottleMs: node.id === selectedNodeId ? 15000 : 30000,
  };
}

function getUrlHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function normalizeAgentUrlForComparison(url) {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port || (protocol === "https:" ? "443" : protocol === "http:" ? "80" : "");
    return `${protocol}//${hostname}:${port}`;
  } catch {
    return null;
  }
}

function getConfiguredAgentHealthConfig(effective) {
  return {
    backendMode: "agent",
    agentUrl: effective.agentUrl,
    agentToken: effective.agentToken,
    targetLabel: "configured-agent",
    logThrottleMs: 15000,
  };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeServiceState(value, running) {
  const text = String(value || "").toLowerCase();
  if (/restart/.test(text)) return "restarting";
  if (/repair/.test(text)) return "repairing";
  if (/start/.test(text)) return "starting";
  if (/stop/.test(text)) return "stopping";
  if (running) return "running";
  if (/stop|offline|inactive|registered|not-installed/.test(text)) return "stopped";
  if (/(^|\b)(run|running|active)(\b|$)/.test(text)) return "running";
  return "unknown";
}

function normalizeMemory(stats) {
  const memory = stats?.memory && typeof stats.memory === "object" ? stats.memory : {};
  const usedBytes = finiteNumber(memory.used ?? memory.usedBytes);
  const totalBytes = finiteNumber(memory.total ?? memory.totalBytes);
  const usagePercent = finiteNumber(memory.percent ?? memory.usagePercent);
  return {
    usedBytes,
    totalBytes,
    usagePercent: usagePercent ?? (usedBytes !== null && totalBytes > 0 ? (usedBytes / totalBytes) * 100 : null),
  };
}

function normalizeCpu(stats) {
  const cpu = stats?.cpu && typeof stats.cpu === "object" ? stats.cpu : {};
  return {
    usagePercent: finiteNumber(cpu.usagePercent),
    model: cpu.model || null,
    cores: finiteNumber(cpu.cores),
  };
}

function normalizeAgentRuntimeStatus({ base = {}, health = null, stats = null, service = null, latencyMs = null, connected = false, reachable = false, capabilities = {} }) {
  const running = connected && reachable;
  const serviceState = normalizeServiceState(base.operationInFlight || service?.state || base.state, running);
  const memory = normalizeMemory(stats);
  const cpu = normalizeCpu(stats);
  const metricsSupported = Boolean(stats && (cpu.usagePercent !== null || memory.usedBytes !== null || memory.totalBytes !== null));
  const identity = health?.identity || base.identity || {};
  return {
    connected,
    reachable,
    serviceState,
    serviceManaged: Boolean(service?.installed || base.serviceManaged || running),
    hostname: identity.hostname || stats?.hostname || base.hostname || null,
    url: base.agentUrl || null,
    version: identity.agentVersion || base.agentVersion || null,
    uptimeSeconds: finiteNumber(health?.process?.uptimeSeconds ?? base.uptime ?? (reachable ? stats?.uptimeSeconds : null)),
    latencyMs: finiteNumber(latencyMs),
    pid: finiteNumber(health?.process?.pid ?? base.pid),
    cpu,
    memory,
    capabilities: {
      metrics: metricsSupported,
      lifecycle: capabilities.lifecycle === true,
      repair: capabilities.repair === true,
      reconnect: capabilities.reconnect !== false,
    },
    partialFailure: stats ? null : base.partialFailure || null,
  };
}

function logRuntimePayloadShape(target, payload) {
  if (app?.isPackaged !== false) return;
  diagnostics.log("info", "agent-control", "runtime-payload-shape", "Agent runtime payload shape inspected", {
    target,
    topLevelKeys: payload && typeof payload === "object" ? Object.keys(payload).sort() : [],
    identityKeys: payload?.identity && typeof payload.identity === "object" ? Object.keys(payload.identity).sort() : [],
    processKeys: payload?.process && typeof payload.process === "object" ? Object.keys(payload.process).sort() : [],
    cpuKeys: payload?.cpu && typeof payload.cpu === "object" ? Object.keys(payload.cpu).sort() : [],
    memoryKeys: payload?.memory && typeof payload.memory === "object" ? Object.keys(payload.memory).sort() : [],
  }, { file: "agent" });
}

async function getConfiguredAgentStatus() {
  const effective = agentClient.getEffectiveAgentSettings();
  const configured = {
    local: false,
    configured: true,
    backendMode: effective.backendMode,
    targetType: "configured-agent",
    healthTargetLabel: "configured-agent",
    state: effective.backendMode === "agent" ? "Offline" : "Local mode",
    running: false,
    agentUrl: effective.backendMode === "agent" ? effective.agentUrl : null,
    lifecycleSupported: false,
    service: { supported: false, type: "remote-agent", installed: false, enabled: false, active: false, state: "remote" },
    hostname: getUrlHostname(effective.agentUrl),
    identity: null,
    agentVersion: null,
    appVersion: null,
    apiVersion: null,
    protocolVersion: null,
    uptime: null,
    memoryBytes: null,
    cpuSeconds: null,
    runtime: normalizeAgentRuntimeStatus({ base: {}, connected: false, reachable: false, capabilities: { reconnect: true } }),
    connectedClients: 0,
    lastHeartbeat: null,
    latencyMs: null,
    mostRecentError: null,
  };

  if (effective.backendMode !== "agent" || !effective.agentUrl) {
    return configured;
  }

  const started = Date.now();
  try {
    const health = await agentClient.getHealth(getConfiguredAgentHealthConfig(effective));
    logRuntimePayloadShape("configured-agent-health", health);
    let stats = null;
    let partialFailure = null;
    try {
      stats = await agentClient.getSystemStats(getConfiguredAgentHealthConfig(effective));
      logRuntimePayloadShape("configured-agent-stats", stats);
    } catch (statsError) {
      partialFailure = { code: statsError.code || null, message: statsError.message || "Agent metrics endpoint unavailable." };
      diagnostics.log("warn", "agent-control", "runtime-metrics-partial", "Agent metrics endpoint did not return full runtime status", {
        target: "configured-agent",
        code: partialFailure.code,
        message: partialFailure.message,
      }, { file: "agent", errorCode: partialFailure.code });
    }
    const releaseInfo = getReleaseInfo();
    const appVersion = releaseInfo.compactLabel;
    const runtime = normalizeAgentRuntimeStatus({
      base: { agentUrl: effective.agentUrl, agentVersion: health?.identity?.agentVersion || health?.agentVersion, partialFailure },
      health,
      stats,
      service: { state: "running", installed: true },
      latencyMs: Date.now() - started,
      connected: true,
      reachable: true,
      capabilities: { metrics: Boolean(stats), lifecycle: false, repair: false, reconnect: true },
    });
    return {
      ...configured,
      state: "Running",
      running: true,
      identity: health?.identity || null,
      name: health?.identity?.hostname || getUrlHostname(effective.agentUrl) || "Configured Agent",
      hostname: health?.identity?.hostname || getUrlHostname(effective.agentUrl),
      operatingSystem: health?.identity?.operatingSystem || null,
      architecture: health?.identity?.architecture || null,
      agentVersion: health?.identity?.agentVersion || health?.agentVersion || null,
      appVersion,
      apiVersion: health?.apiVersion || "v1",
      protocolVersion: health?.protocolVersion || 1,
      uptime: health?.process?.uptimeSeconds ?? null,
      memoryBytes: runtime.memory.usedBytes,
      cpuSeconds: health?.process?.cpuSeconds ?? null,
      cpuUsagePercent: runtime.cpu.usagePercent,
      memoryTotalBytes: runtime.memory.totalBytes,
      memoryUsagePercent: runtime.memory.usagePercent,
      runtime,
      connectedClients: health?.process?.connectedClients || 0,
      lastHeartbeat: new Date().toISOString(),
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ...configured,
      state: error.status === 401 || error.code === "UNAUTHORIZED" ? "Authentication failed" : "Unreachable",
      runtime: normalizeAgentRuntimeStatus({
        base: { agentUrl: effective.agentUrl, hostname: getUrlHostname(effective.agentUrl) },
        connected: false,
        reachable: false,
        capabilities: { reconnect: true },
      }),
      mostRecentError: { code: error.code || null, message: error.message || "Configured Agent is unreachable." },
    };
  }
}

async function getStatus() {
  const config = readConfig();
  const service = await getServiceState();
  const agentUrl = getLocalAgentUrl(config);
  let health = null;
  let latencyMs = null;
  const started = Date.now();

  try {
    health = await agentClient.getHealth(getLocalAgentHealthConfig(config));
    latencyMs = Date.now() - started;
  } catch {
    // Missing localhost is expected when the user is controlling a remote Agent.
  }

  const running = Boolean(managedProcess && !managedProcess.killed) || service.active || Boolean(health?.ok);
  const releaseInfo = getReleaseInfo();
  const appVersion = releaseInfo.compactLabel;
  const localMemoryTotal = os.totalmem();
  const localMemoryUsed = localMemoryTotal - os.freemem();
  const localStats = {
    hostname: os.hostname(),
    uptimeSeconds: os.uptime(),
    cpu: {
      model: os.cpus()[0]?.model || null,
      cores: os.cpus().length,
      usagePercent: null,
    },
    memory: {
      used: localMemoryUsed,
      total: localMemoryTotal,
      percent: localMemoryTotal > 0 ? (localMemoryUsed / localMemoryTotal) * 100 : null,
    },
  };
  const runtime = normalizeAgentRuntimeStatus({
    base: { agentUrl, hostname: os.hostname(), agentVersion: health?.identity?.agentVersion || agentPackage.version, uptime: managedProcess ? Math.max(0, Math.round((Date.now() - (managedProcess.spawnAt || Date.now())) / 1000)) : null },
    health,
    stats: localStats,
    service,
    latencyMs,
    connected: running,
    reachable: Boolean(health?.ok),
    capabilities: { metrics: true, lifecycle: true, repair: true, reconnect: true },
  });
  return {
    local: true,
    targetType: "local-agent",
    healthTargetLabel: "local-agent",
    state: operationInFlight === "start" ? "Starting" : operationInFlight === "stop" ? "Stopping" : running ? "Running" : "Offline",
    operationInFlight,
    running,
    pid: health?.process?.pid || managedProcess?.pid || null,
    config,
    service,
    identity: health?.identity || null,
    agentVersion: health?.identity?.agentVersion || agentPackage.version,
    appVersion,
    apiVersion: health?.apiVersion || "v1",
    protocolVersion: health?.protocolVersion || 1,
    uptime: health?.process?.uptimeSeconds ?? (managedProcess ? Math.max(0, Math.round((Date.now() - (managedProcess.spawnAt || Date.now())) / 1000)) : null),
    memoryBytes: health?.process?.memoryBytes || null,
    cpuSeconds: health?.process?.cpuSeconds || null,
    cpuUsagePercent: runtime.cpu.usagePercent,
    memoryTotalBytes: runtime.memory.totalBytes,
    memoryUsagePercent: runtime.memory.usagePercent,
    runtime,
    pairing: readLocalAgentPairingStatus(),
    connectedClients: health?.process?.connectedClients || 0,
    lastHeartbeat: health ? new Date().toISOString() : null,
    latencyMs,
    hostname: os.hostname(),
    operatingSystem: `${os.type()} ${os.release()}`,
    architecture: os.arch(),
    agentUrl,
    port: config.port,
    startupMode: service.type,
    runtimeBundle: getPublicLocalAgentRuntimeInfo(),
    lastRestartReason,
    mostRecentError: lastError,
  };
}

async function listAgents() {
  const local = await getStatus();
  const configured = await getConfiguredAgentStatus();
  const selectedNodeId = getSelectedNodeId();
  const effective = agentClient.getEffectiveAgentSettings();
  const configuredUrlKey = effective.backendMode === "agent" ? normalizeAgentUrlForComparison(effective.agentUrl) : null;
  const remote = await Promise.all(getAllNodesSync().filter((node) => node.kind === "agent").map(async (node) => {
    const started = Date.now();
    const healthConfig = getRemoteHealthConfig(node, selectedNodeId);
    if (configuredUrlKey && normalizeAgentUrlForComparison(node.agentUrl) === configuredUrlKey) {
      return {
        local: false,
        targetType: healthConfig.targetLabel,
        healthTargetLabel: healthConfig.targetLabel,
        nodeId: node.id,
        state: configured.state,
        name: node.displayName,
        agentUrl: node.agentUrl,
        identity: configured.identity || node.agentIdentity,
        agentVersion: configured.agentVersion || node.agentIdentity?.agentVersion,
        latencyMs: configured.latencyMs || null,
        lastHeartbeat: configured.lastHeartbeat || null,
        mostRecentError: configured.mostRecentError || null,
        reusedConfiguredAgentProbe: true,
      };
    }
    try {
      const health = await agentClient.getHealth(healthConfig);
      return {
        local: false,
        targetType: healthConfig.targetLabel,
        healthTargetLabel: healthConfig.targetLabel,
        nodeId: node.id,
        state: "Running",
        name: node.displayName,
        agentUrl: node.agentUrl,
        identity: health.identity,
        agentVersion: health.identity?.agentVersion,
        latencyMs: Date.now() - started,
        lastHeartbeat: new Date().toISOString(),
      };
    } catch (error) {
      return {
        local: false,
        targetType: healthConfig.targetLabel,
        healthTargetLabel: healthConfig.targetLabel,
        nodeId: node.id,
        state: error.status === 401 ? "Authentication failed" : "Unreachable",
        name: node.displayName,
        agentUrl: node.agentUrl,
        identity: node.agentIdentity,
        mostRecentError: { code: error.code || null, message: error.message },
      };
    }
  }));
  diagnostics.updateRuntimeState({
    localAgentProcessStatus: local.state,
    localAgentServiceStatus: local.service?.state,
    configuredAgentUrl: effective.backendMode === "agent" ? effective.agentUrl : null,
    selectedAgentId: selectedNodeId,
    connectedAgents: [
      ...(configured.running ? [{ nodeId: null, deviceId: configured.identity?.deviceId, state: configured.state, version: configured.agentVersion, target: "configured-agent" }] : []),
      ...remote.map((agent) => ({ nodeId: agent.nodeId, deviceId: agent.identity?.deviceId, state: agent.state, version: agent.agentVersion })),
    ],
    recentConnectionResult: [
      { target: "local-agent", url: local.agentUrl, state: local.state, latencyMs: local.latencyMs || null },
      { target: "configured-agent", url: configured.agentUrl, state: configured.state, latencyMs: configured.latencyMs || null },
      ...remote.map((agent) => ({ target: agent.healthTargetLabel, nodeId: agent.nodeId, url: agent.agentUrl, state: agent.state, latencyMs: agent.latencyMs || null })),
    ],
  });
  return { local, configured, remote };
}

async function captureRemoteDiagnostics(nodeId) {
  const node = getAllNodesSync().find((entry) => entry.id === nodeId && entry.kind === "agent");
  if (!node) throw Object.assign(new Error("Remote Agent node was not found."), { code: "NODE_NOT_FOUND" });
  const cached = remoteDiagnosticsCache.get(node.id);
  if (cached && Date.now() - cached.capturedAt < REMOTE_DIAGNOSTICS_CACHE_MS) {
    return { ...cached.result, cached: true };
  }
  if (remoteDiagnosticsRequests.has(node.id)) {
    return remoteDiagnosticsRequests.get(node.id);
  }
  const request = (async () => {
    const bundle = await agentClient.getDiagnostics(getNodeAgentConfig(node.id));
    const safeId = String(bundle.identity?.deviceId || node.id).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
    const directory = path.join(diagnostics.getDirectory(), "remote", safeId);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "diagnostics.json"), `${JSON.stringify(require("../shared/redaction").sanitize(bundle), null, 2)}\n`, { mode: 0o600 });
    const result = { captured: true, nodeId: node.id, deviceId: safeId };
    remoteDiagnosticsCache.set(node.id, { capturedAt: Date.now(), result });
    diagnostics.log("info", "agent-control", "remote-diagnostics", "Remote Agent diagnostics captured", { nodeId: node.id, deviceId: safeId }, { file: "agent" });
    return result;
  })();
  remoteDiagnosticsRequests.set(node.id, request);
  try {
    return await request;
  } finally {
    remoteDiagnosticsRequests.delete(node.id);
  }
}

async function runDiagnostics() {
  const status = await getStatus();
  const config = readConfig();
  const effective = agentClient.getEffectiveAgentSettings();
  const localAgentOptional = effective.backendMode === "agent";
  const portUsed = await probePort(config.port);
  const registrationStatus = getRegistrationStatusFromServiceState(status.service);
  const serviceRequiresElevation = Boolean(status.service?.requiresElevation && ["missing", "invalid", "unverifiable"].includes(registrationStatus));
  const serviceResult = registrationStatus === "valid"
    ? "Passed"
    : registrationStatus === "unsupported"
      ? "Not applicable"
      : serviceRequiresElevation
        ? "Blocked"
        : "Warning";
  const checks = [
    {
      id: "process",
      label: "Agent process",
      result: status.running ? "Passed" : localAgentOptional ? "Not applicable" : "Warning",
      explanation: status.running
        ? "Local Agent is responding."
        : localAgentOptional
          ? "Local Agent is stopped, but a remote Agent backend is selected."
          : "Local Agent is not currently running.",
      repairAction: status.running || localAgentOptional ? null : "start",
    },
    {
      id: "service",
      label: "Service registration",
      result: serviceResult,
      explanation: registrationStatus === "valid"
        ? "Background startup registration exists and matches the current Agent command."
        : registrationStatus === "invalid"
          ? "Background startup registration exists but does not match the current Agent command."
          : registrationStatus === "unverifiable"
            ? "Windows would not allow AnxOS to verify the startup registration."
            : registrationStatus === "missing"
              ? "Background startup is not installed."
              : "Background startup is not supported on this platform.",
      repairAction: status.service?.supported && registrationStatus !== "valid" ? "install-service" : null,
      code: serviceRequiresElevation ? "ELEVATION_REQUIRED" : undefined,
      recoverySuggestion: serviceRequiresElevation ? "Run AnxOS Control Center as Administrator, then install the Agent service again." : undefined,
      registrationStatus,
      requiresElevation: serviceRequiresElevation,
      elevated: status.service?.privilege?.elevated ?? null,
    },
    {
      id: "port",
      label: "Port availability",
      result: status.running || !portUsed ? "Passed" : "Failed",
      explanation: status.running ? "Agent owns the configured port." : portUsed ? "Another process is using the configured port." : "Configured port is available.",
      repairAction: portUsed && !status.running ? "select-port" : null,
    },
    {
      id: "local-pairing",
      label: "Local pairing",
      result: status.pairing?.configured && status.pairing?.localOnly ? "Passed" : "Warning",
      explanation: status.pairing?.configured && status.pairing?.localOnly
        ? `Desktop credentials are paired locally. Fingerprint ${status.pairing.fingerprint || "available"}.`
        : "Local Agent credentials need to be paired or repaired on this computer.",
      repairAction: status.pairing?.configured && status.pairing?.localOnly ? null : "repair-pairing",
    },
    { id: "configuration", label: "Configuration validity", result: "Passed", explanation: `Configuration is valid for ${config.host}:${config.port}.` },
    { id: "logs", label: "Log directory", result: fs.existsSync(diagnostics.getDirectory()) ? "Passed" : "Warning", explanation: "Diagnostics directory is writable." },
  ];
  return { status, checks, generatedAt: new Date().toISOString() };
}
async function openLogs() { await diagnostics.openFolder(); return { opened: true }; }
async function openDataFolder() { fs.mkdirSync(getAgentDataDirectory(), { recursive: true }); await shell.openPath(getAgentDataDirectory()); return { opened: true }; }

module.exports = {
  _test: {
    expectedWindowsServiceCommand,
    getRegistrationStatusFromServiceState,
    validateWindowsServiceRegistration,
  },
  captureRemoteDiagnostics,
  getAgentDataDirectory,
  getRuntimeConfigPath,
  getStatus,
  installService,
  installLocalAgent,
  listAgents,
  openDataFolder,
  openLogs,
  pairLocalAgentSecurely,
  readConfig,
  resetConfig,
  restart,
  restoreConfigBackup,
  runDiagnostics,
  saveConfig,
  setAutoStart,
  start,
  stop,
  uninstallService,
  validateConfig,
};
