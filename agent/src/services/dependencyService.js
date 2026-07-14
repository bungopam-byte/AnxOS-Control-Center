const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const {
  DEPENDENCY_REGISTRY,
  assertKnownDependencyId,
  compareVersions,
  dependencyIdsForGroups,
  listDependencyDefinitions,
  listDependencyGroups,
  normalizeDependencyIds,
} = require("../../../src/shared/marketplaceDependencies");
const { logger } = require("./diagnosticsLogger");

const DEFAULT_TIMEOUT_MS = 120000;
const INSTALL_TIMEOUT_MS = 15 * 60 * 1000;
const OUTPUT_LIMIT = 12000;
const activeDependencyInstalls = new Map();
const dependencyJobs = new Map();
let packageManagerBusy = false;
let commandRunner = runCommand;
let readFileText = (filePath) => fs.readFileSync(filePath, "utf8");
let accessExecutable = (filePath) => fs.accessSync(filePath, fs.constants.X_OK);

function nowIso() {
  return new Date().toISOString();
}

function createJobId(dependencyId) {
  return `dep-${String(dependencyId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimOutput(value) {
  const text = String(value || "");
  if (text.length <= OUTPUT_LIMIT) return text;
  return `${text.slice(0, OUTPUT_LIMIT)}\n[output truncated, ${text.length - OUTPUT_LIMIT} chars omitted]`;
}

function sanitizeOutput(value) {
  return trimOutput(value)
    .replace(/(\b(?:token|secret|password|credential|certificate|cert|api[_-]?key|authkey)\b\s*[:=]\s*)\S+/gi, "$1[redacted]")
    .replace(/(\bBearer\s+)\S+/gi, "$1[redacted]")
    .replace(/(--?(?:secret|token|password|credential|certificate|cert|api[_-]?key|authkey)(?:=|\s+))\S+/gi, "$1[redacted]");
}

function dependencyJob(dependency, patch = {}) {
  const dependencyId = dependency?.id || dependency;
  const job = {
    id: patch.id || createJobId(dependencyId),
    dependencyId,
    dependencyName: dependency?.displayName || dependencyId,
    nodeId: patch.nodeId || null,
    platform: process.platform,
    state: patch.state || "queued",
    stage: patch.stage || "Preparing installation",
    progressMode: patch.progressMode || "indeterminate",
    progressPercent: patch.progressPercent ?? null,
    message: patch.message || "Queued dependency installation.",
    startedAt: patch.startedAt || nowIso(),
    completedAt: patch.completedAt || null,
    exitCode: patch.exitCode ?? null,
    restartRequired: patch.restartRequired === true,
    authenticationRequired: patch.authenticationRequired === true,
    executionBackend: patch.executionBackend || "agent",
    installationMethod: patch.installationMethod || null,
    externalTerminal: patch.externalTerminal === true,
    cancellationSupported: patch.cancellationSupported === true,
    cancellationReason: patch.cancellationReason || "Installation cannot be safely interrupted during package configuration.",
    error: patch.error || null,
    events: [],
    output: [],
  };
  dependencyJobs.set(job.id, job);
  return job;
}

function addJobEvent(job, state, stage, message, extra = {}) {
  const event = {
    jobId: job.id,
    nodeId: job.nodeId,
    dependencyId: job.dependencyId,
    state,
    stage,
    message,
    at: nowIso(),
    ...extra,
  };
  job.state = state || job.state;
  job.stage = stage || job.stage;
  job.message = message || job.message;
  if (extra.progressPercent !== undefined) job.progressPercent = extra.progressPercent;
  if (extra.progressMode) job.progressMode = extra.progressMode;
  job.events.push(event);
  dependencyJobs.set(job.id, job);
  return event;
}

function addJobOutput(job, phase, result = {}) {
  const entry = {
    at: nowIso(),
    jobId: job.id,
    nodeId: job.nodeId,
    dependencyId: job.dependencyId,
    phase,
    command: result.command || null,
    args: Array.isArray(result.args) ? result.args : [],
    exitCode: result.exitCode ?? null,
    signal: result.signal || null,
    stdout: sanitizeOutput(result.stdout || ""),
    stderr: sanitizeOutput(result.stderr || ""),
    errorMessage: sanitizeOutput(result.errorMessage || ""),
  };
  job.output.push(entry);
  job.output = job.output.slice(-20);
  dependencyJobs.set(job.id, job);
  return entry;
}

function completeJob(job, patch = {}) {
  job.state = patch.state || job.state;
  job.stage = patch.stage || job.stage;
  job.message = patch.message || job.message;
  job.completedAt = patch.completedAt || nowIso();
  job.exitCode = patch.exitCode ?? job.exitCode;
  job.restartRequired = patch.restartRequired === true || job.restartRequired;
  job.authenticationRequired = patch.authenticationRequired === true || job.authenticationRequired;
  job.error = patch.error || job.error;
  if (patch.progressPercent !== undefined) job.progressPercent = patch.progressPercent;
  if (patch.progressMode) job.progressMode = patch.progressMode;
  dependencyJobs.set(job.id, job);
  return job;
}

function createDependencyError(code, message, details = {}, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = execFile(command, args, {
      cwd: options.cwd || os.tmpdir(),
      env: { ...process.env, ...(options.env || {}) },
      timeout: options.timeoutMs || DEFAULT_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        command,
        args,
        exitCode: typeof error?.code === "number" ? error.code : 0,
        signal: error?.signal || null,
        timedOut: Boolean(error?.killed && error?.signal === "SIGTERM"),
        stdout: trimOutput(stdout),
        stderr: trimOutput(stderr),
        durationMs: Date.now() - startedAt,
        errorMessage: error?.message || null,
      });
    });
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        child.kill("SIGTERM");
      }, { once: true });
    }
  });
}

function parseOsRelease(text) {
  const values = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^"/, "").replace(/"$/, "");
  }
  const id = String(values.ID || "").toLowerCase();
  const idLike = String(values.ID_LIKE || "").toLowerCase().split(/\s+/).filter(Boolean);
  const family = id === "ubuntu" || id === "debian" || idLike.includes("debian")
    ? "debian"
    : id === "fedora" || id === "rocky" || id === "almalinux" || idLike.includes("fedora") || idLike.includes("rhel")
      ? "rhel"
      : id || "unknown";
  return {
    id,
    idLike,
    family,
    name: values.PRETTY_NAME || values.NAME || id || "Unknown Linux",
    versionId: values.VERSION_ID || null,
    packageManager: family === "debian" ? "apt" : family === "rhel" ? "dnf" : null,
  };
}

function detectDistribution() {
  if (process.platform !== "linux") {
    return {
      id: process.platform,
      idLike: [],
      family: process.platform,
      name: `${process.platform} ${os.release()}`,
      versionId: null,
      packageManager: null,
    };
  }
  try {
    return parseOsRelease(readFileText("/etc/os-release"));
  } catch {
    return {
      id: "unknown",
      idLike: [],
      family: "unknown",
      name: "Unknown Linux",
      versionId: null,
      packageManager: null,
    };
  }
}

function findCommand(command) {
  if (!/^[a-zA-Z0-9._+-]+$/.test(command)) {
    throw createDependencyError("DEPENDENCY_COMMAND_INVALID", "Dependency command is not allowlisted.", { command }, 400);
  }
  const paths = String(process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const directory of paths) {
    const candidate = path.join(directory, command);
    try {
      accessExecutable(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

async function detectVersion(definition, commandPath) {
  if (!definition.versionCommand) {
    return { version: null, raw: null };
  }
  const versionCommand = definition.versionCommand;
  const command = versionCommand.command === definition.commands[0] ? commandPath : versionCommand.command;
  const result = await commandRunner(command, versionCommand.args || [], { timeoutMs: versionCommand.timeoutMs || DEFAULT_TIMEOUT_MS });
  const raw = versionCommand.stream === "stderr" ? result.stderr || result.stdout : result.stdout || result.stderr;
  const match = definition.versionPattern ? String(raw || "").match(definition.versionPattern) : null;
  return {
    version: match?.[1] || null,
    raw: trimOutput(raw),
    exitCode: result.exitCode,
  };
}

async function runVerificationCommands(definition, commandResults) {
  const commandPathByName = new Map(commandResults.map((result) => [result.command, result.path]));
  const checks = [];
  const verificationCommands = Array.isArray(definition.verificationCommands) && definition.verificationCommands.length > 0
    ? definition.verificationCommands
    : definition.versionCommand
      ? [{ ...definition.versionCommand, description: "Version command executes successfully." }]
      : definition.commands.map((command) => ({ command, args: ["--help"], allowFailure: true, description: `${command} is available on PATH.` }));

  for (const check of verificationCommands) {
    const commandPath = commandPathByName.get(check.command) || findCommand(check.command);
    if (!commandPath) {
      checks.push({
        command: check.command,
        args: check.args || [],
        ok: false,
        allowFailure: Boolean(check.allowFailure),
        exitCode: null,
        description: check.description || null,
        errorCode: "COMMAND_NOT_FOUND",
      });
      continue;
    }
    const result = await commandRunner(commandPath, check.args || [], { timeoutMs: check.timeoutMs || DEFAULT_TIMEOUT_MS });
    checks.push({
      command: check.command,
      args: check.args || [],
      ok: result.ok,
      allowFailure: Boolean(check.allowFailure),
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      description: check.description || null,
      stdout: result.stdout,
      stderr: result.stderr,
      errorMessage: result.errorMessage,
    });
  }

  return checks;
}

async function checkAvailableUpdate(definition, distribution, installedVersion) {
  if (!installedVersion || !distribution.packageManager) {
    return { updateAvailable: null, latestVersion: null, source: null, reason: "No installed version or package manager metadata is available." };
  }
  const packages = definition.packages?.[distribution.packageManager] || [];
  const packageName = packages[0];
  if (!packageName) {
    return { updateAvailable: null, latestVersion: null, source: null, reason: "No package mapping exists for update checks." };
  }

  if (distribution.packageManager === "apt") {
    const aptCache = findCommand("apt-cache");
    if (!aptCache) {
      return { updateAvailable: null, latestVersion: null, source: "apt", reason: "apt-cache is not available." };
    }
    const result = await commandRunner(aptCache, ["policy", packageName], { timeoutMs: 15000 });
    const candidate = String(result.stdout || "").match(/Candidate:\s*([^\s]+)/)?.[1] || null;
    const updateAvailable = Boolean(candidate && candidate !== "(none)" && compareVersions(candidate, installedVersion) > 0);
    return {
      updateAvailable,
      latestVersion: candidate && candidate !== "(none)" ? candidate : null,
      source: "apt-cache policy",
      reason: result.ok ? null : result.stderr || result.errorMessage || "apt-cache policy failed.",
    };
  }

  if (distribution.packageManager === "dnf") {
    const dnf = findCommand("dnf");
    if (!dnf) {
      return { updateAvailable: null, latestVersion: null, source: "dnf", reason: "dnf is not available." };
    }
    const result = await commandRunner(dnf, ["check-update", packageName], { timeoutMs: 30000 });
    const line = String(result.stdout || "").split(/\r?\n/).find((entry) => entry.trim().startsWith(`${packageName}.`) || entry.trim().startsWith(`${packageName} `));
    const latestVersion = line ? line.trim().split(/\s+/)[1] || null : null;
    return {
      updateAvailable: Boolean(latestVersion),
      latestVersion,
      source: "dnf check-update",
      reason: result.exitCode === 0 || result.exitCode === 100 ? null : result.stderr || result.errorMessage || "dnf check-update failed.",
    };
  }

  return { updateAvailable: null, latestVersion: null, source: null, reason: "Unsupported package manager for update checks." };
}

async function canElevate() {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    return { available: true, method: "root" };
  }
  const sudoPath = findCommand("sudo");
  if (!sudoPath) {
    return { available: false, method: null, reason: "sudo is not installed" };
  }
  const result = await commandRunner(sudoPath, ["-n", "true"], { timeoutMs: 15000 });
  return {
    available: result.ok,
    method: result.ok ? "sudo-noninteractive" : null,
    reason: result.ok ? null : "passwordless sudo is not available",
  };
}

function getPackageManagerCommand(packageManager) {
  if (packageManager === "apt") {
    return findCommand("apt-get");
  }
  if (packageManager === "dnf") {
    return findCommand("dnf");
  }
  return null;
}

async function checkDependency(dependencyId) {
  const id = assertKnownDependencyId(dependencyId);
  const definition = DEPENDENCY_REGISTRY[id];
  const distribution = detectDistribution();
  const supportedByDistribution = process.platform === "linux" && definition.supportedDistributions.includes(distribution.id);
  const commandResults = [];
  for (const command of definition.commands) {
    const resolvedPath = findCommand(command);
    commandResults.push({ command, path: resolvedPath, installed: Boolean(resolvedPath) });
  }
  const installed = commandResults.every((result) => result.installed);
  const supported = installed || supportedByDistribution;
  let version = null;
  let versionRaw = null;
  let verification = [];
  let update = { updateAvailable: null, latestVersion: null, source: null, reason: "Dependency is not installed." };
  let state = installed ? "installed" : "missing";
  let errorCode = installed ? null : "DEPENDENCY_MISSING";

  if (!supportedByDistribution && !installed) {
    state = "unsupported";
    errorCode = "UNSUPPORTED_DISTRIBUTION";
  }

  if (installed) {
    const versionResult = await detectVersion(definition, commandResults[0].path);
    version = versionResult.version;
    versionRaw = versionResult.raw;
    verification = await runVerificationCommands(definition, commandResults);
    const failedVerification = verification.find((check) => !check.ok && !check.allowFailure);
    if (failedVerification) {
      state = "verification-failed";
      errorCode = "DEPENDENCY_EXECUTION_FAILED";
    }
    if (definition.minVersion && version && compareVersions(version, definition.minVersion) < 0) {
      state = "update-required";
      errorCode = "DEPENDENCY_VERSION_TOO_OLD";
    }
    update = await checkAvailableUpdate(definition, distribution, version);
  }

  return {
    id,
    displayName: definition.displayName,
    state,
    installed,
    supported,
    version,
    minVersion: definition.minVersion || null,
    versionRaw,
    verification,
    executable: installed && verification.every((check) => check.ok || check.allowFailure),
    updateAvailable: update.updateAvailable,
    latestVersion: update.latestVersion,
    updateSource: update.source,
    updateReason: update.reason,
    commands: commandResults,
    packageManager: distribution.packageManager,
    packages: definition.packages?.[distribution.packageManager] || [],
    requiresElevation: Boolean(definition.requiresElevation),
    serviceRestartRequired: Boolean(definition.serviceRestartRequired),
    restartRequired: false,
    reason: definition.reason || null,
    notes: definition.notes || null,
    errorCode,
    distribution,
  };
}

async function checkDependencies(payload = {}) {
  const dependencyIds = resolveDependencyRequestIds(payload);
  const dependencies = [];
  for (const dependencyId of dependencyIds) {
    dependencies.push(await checkDependency(dependencyId));
  }
  const missing = dependencies.filter((dependency) => !dependency.installed || dependency.state !== "installed");
  return {
    ok: missing.length === 0,
    distribution: detectDistribution(),
    dependencies,
    missingDependencyIds: missing.map((dependency) => dependency.id),
    checkedAt: new Date().toISOString(),
  };
}

function resolveDependencyRequestIds(payload = {}) {
  const ids = [
    ...normalizeDependencyIds(payload.dependencyIds || []),
    ...dependencyIdsForGroups(payload.groupIds || []),
  ];
  if (ids.length === 0) {
    return Object.keys(DEPENDENCY_REGISTRY);
  }
  return normalizeDependencyIds(ids);
}

function buildInstallCommands(packageManager, packages) {
  if (packageManager === "apt") {
    return [
      { phase: "refreshing-package-metadata", command: "apt-get", args: ["update"] },
      { phase: "installing-package", command: "apt-get", args: ["install", "-y", ...packages] },
    ];
  }
  if (packageManager === "dnf") {
    return [
      { phase: "installing-package", command: "dnf", args: ["install", "-y", ...packages] },
    ];
  }
  throw createDependencyError("PACKAGE_MANAGER_UNSUPPORTED", "This operating system is not supported for automatic dependency installation.", { packageManager }, 400);
}

function formatCommand(command, args = []) {
  return [command, ...args].map((part) => String(part || "")).join(" ");
}

async function planDependencyPreparation(payload = {}) {
  const dependencyIds = resolveDependencyRequestIds(payload);
  const check = await checkDependencies({ dependencyIds });
  const elevation = await canElevate();
  const actions = [];

  for (const dependency of check.dependencies) {
    if (dependency.installed && dependency.state !== "update-required") {
      actions.push({
        id: dependency.id,
        displayName: dependency.displayName,
        state: "already-installed",
        action: "none",
        installable: false,
        reason: "Already installed and verified.",
        packages: [],
        commands: [],
        dependency,
      });
      continue;
    }

    const packages = dependency.packages || [];
    const packageManager = dependency.packageManager || null;
    const packageManagerCommand = packageManager ? getPackageManagerCommand(packageManager) : null;
    const installable = Boolean(dependency.supported && packageManager && packageManagerCommand && packages.length > 0 && elevation.available);
    let reason = null;
    if (!dependency.supported) {
      reason = `${dependency.displayName} is not supported for automatic installation on ${dependency.distribution?.name || "this host"}.`;
    } else if (!packageManager) {
      reason = "No supported package manager was detected.";
    } else if (!packageManagerCommand) {
      reason = `Required package manager ${packageManager} was not found.`;
    } else if (!packages.length) {
      reason = "No trusted package mapping exists for this dependency on this host.";
    } else if (!elevation.available) {
      reason = `Administrator privileges are required (${elevation.reason || "elevation unavailable"}).`;
    }

    const commandSpecs = installable ? buildInstallCommands(packageManager, packages) : [];
    const commands = commandSpecs.map((commandSpec) => ({
      phase: commandSpec.phase,
      command: commandSpec.command,
      args: commandSpec.args,
      display: elevation.method === "sudo-noninteractive"
        ? formatCommand("sudo", ["-n", commandSpec.command, ...commandSpec.args])
        : formatCommand(commandSpec.command, commandSpec.args),
    }));

    actions.push({
      id: dependency.id,
      displayName: dependency.displayName,
      state: dependency.state,
      action: installable ? "install" : "manual",
      installable,
      reason: reason || `Install ${dependency.displayName} with ${packageManager}.`,
      packages,
      packageManager,
      requiresElevation: dependency.requiresElevation,
      elevation,
      commands,
      verification: {
        commands: dependency.commands,
        minVersion: dependency.minVersion || null,
      },
      dependency,
    });
  }

  const installableActions = actions.filter((action) => action.installable);
  const manualActions = actions.filter((action) => action.action === "manual");
  return {
    ok: check.ok,
    dependencyIds,
    distribution: check.distribution,
    actions,
    installableActions,
    manualActions,
    missingDependencyIds: check.missingDependencyIds,
    requiresUserInitiation: installableActions.length > 0,
    elevation,
    plannedAt: new Date().toISOString(),
  };
}

async function installDependency(dependencyId, context = {}) {
  const id = assertKnownDependencyId(dependencyId);
  if (activeDependencyInstalls.has(id)) {
    return activeDependencyInstalls.get(id);
  }
  const promise = doInstallDependency(id, context).finally(() => activeDependencyInstalls.delete(id));
  activeDependencyInstalls.set(id, promise);
  return promise;
}

async function doInstallDependency(dependencyId, context = {}) {
  let job = dependencyJob(dependencyId, {
    nodeId: context.nodeId || null,
    platform: context.platform || process.platform,
    executionBackend: "agent",
    installationMethod: "package-manager",
    externalTerminal: false,
    state: packageManagerBusy ? "queued" : "preparing",
    stage: packageManagerBusy ? "Waiting for another installation to finish" : "Preparing installation",
    message: packageManagerBusy
      ? "Waiting for another installation to finish on this node."
      : "Preparing dependency installation.",
  });
  if (packageManagerBusy) {
    const errorDetails = { dependencyId, job };
    completeJob(job, {
      state: "failed",
      stage: "Waiting for another installation to finish",
      message: "Another dependency installation is already running on this node.",
      error: { code: "PACKAGE_MANAGER_LOCKED", message: "Another dependency installation is already running on this node." },
    });
    throw createDependencyError("PACKAGE_MANAGER_LOCKED", "Another dependency installation is already running on this node.", errorDetails, 409);
  }
  packageManagerBusy = true;
  const log = [];
  try {
    addJobEvent(job, "preparing", "Preparing installation", "Checking current dependency state.");
    const before = await checkDependency(dependencyId);
    job.dependencyName = before.displayName;
    if (before.installed && before.state !== "update-required") {
      completeJob(job, {
        state: "completed",
        stage: "Installation complete",
        message: `${before.displayName} is already installed and verified.`,
        progressMode: "determinate",
        progressPercent: 100,
      });
      return { id: dependencyId, state: "installed", changed: false, log, before, after: before, job };
    }
    if (!before.supported) {
      completeJob(job, {
        state: "failed",
        stage: "Preparing installation",
        message: `${before.displayName} cannot be installed automatically on this operating system.`,
        error: { code: "UNSUPPORTED_PLATFORM", message: `${before.displayName} cannot be installed automatically on this operating system.` },
      });
      throw createDependencyError("UNSUPPORTED_DISTRIBUTION", `${before.displayName} cannot be installed automatically on this operating system.`, {
        dependencyId,
        distribution: before.distribution,
        job,
      }, 400);
    }
    const packages = before.packages || [];
    if (packages.length === 0) {
      completeJob(job, {
        state: "failed",
        stage: "Preparing installation",
        message: `${before.displayName} has no supported package mapping for this distribution.`,
        error: { code: "PACKAGE_NOT_FOUND", message: `${before.displayName} has no supported package mapping for this distribution.` },
      });
      throw createDependencyError("PACKAGE_NOT_FOUND", `${before.displayName} has no supported package mapping for this distribution.`, {
        dependencyId,
        packageManager: before.packageManager,
        job,
      }, 400);
    }
    const packageManagerCommand = getPackageManagerCommand(before.packageManager);
    if (!packageManagerCommand) {
      completeJob(job, {
        state: "failed",
        stage: "Preparing installation",
        message: `Required package manager ${before.packageManager} was not found.`,
        error: { code: "UNSUPPORTED_PLATFORM", message: `Required package manager ${before.packageManager} was not found.` },
      });
      throw createDependencyError("PACKAGE_MANAGER_MISSING", `Required package manager ${before.packageManager} was not found.`, {
        dependencyId,
        packageManager: before.packageManager,
        job,
      }, 400);
    }
    const elevation = await canElevate();
    if (!elevation.available) {
      completeJob(job, {
        state: "waiting-for-authorization",
        stage: "Waiting for authorization",
        message: `${before.displayName} requires administrator privileges to install.`,
        authenticationRequired: true,
        error: { code: "AUTHORIZATION_REQUIRED", message: elevation.reason || "Administrator authorization is required." },
      });
      throw createDependencyError("AUTHORIZATION_REQUIRED", `${before.displayName} requires administrator privileges to install.`, {
        dependencyId,
        reason: elevation.reason,
        job,
      }, 403);
    }
    const sudoPath = elevation.method === "sudo-noninteractive" ? findCommand("sudo") : null;
    const commands = buildInstallCommands(before.packageManager, packages);
    logger.write("info", "dependency-install-started", `Installing ${dependencyId}.`, { dependencyId, packages, packageManager: before.packageManager }, { file: "agent" });
    for (const commandSpec of commands) {
      const friendlyStage = commandSpec.phase === "refreshing-package-metadata"
        ? "Updating package information"
        : "Installing files";
      addJobEvent(job, commandSpec.phase === "refreshing-package-metadata" ? "installing" : "installing", friendlyStage, `${friendlyStage} for ${before.displayName}.`);
      const executable = commandSpec.command === before.packageManager ? packageManagerCommand : findCommand(commandSpec.command);
      const command = sudoPath ? sudoPath : executable;
      const args = sudoPath ? ["-n", executable, ...commandSpec.args] : commandSpec.args;
      const result = await commandRunner(command, args, { timeoutMs: INSTALL_TIMEOUT_MS });
      const logEntry = { phase: commandSpec.phase, command: commandSpec.command, args: commandSpec.args, exitCode: result.exitCode, stdout: sanitizeOutput(result.stdout), stderr: sanitizeOutput(result.stderr) };
      log.push(logEntry);
      addJobOutput(job, commandSpec.phase, { ...result, command: commandSpec.command, args: commandSpec.args });
      if (!result.ok) {
        const code = classifyInstallFailure(result);
        completeJob(job, {
          state: "failed",
          stage: friendlyStage,
          message: `${before.displayName} installation failed during ${friendlyStage.toLowerCase()}.`,
          exitCode: result.exitCode,
          error: { code, message: `${before.displayName} installation failed during ${friendlyStage.toLowerCase()}.` },
        });
        throw createDependencyError(classifyInstallFailure(result), `${before.displayName} installation failed during ${commandSpec.phase}.`, {
          dependencyId,
          phase: commandSpec.phase,
          exitCode: result.exitCode,
          stderr: sanitizeOutput(result.stderr),
          stdout: sanitizeOutput(result.stdout),
          job,
        }, 500);
      }
    }
    if (before.service) {
      addJobEvent(job, "configuring", "Configuring service", `Configuring service for ${before.displayName}.`);
      await tryEnableService(before.service, sudoPath, log);
    }
    addJobEvent(job, "verifying", "Verifying installation", `Verifying ${before.displayName}.`);
    const after = await checkDependency(dependencyId);
    if (!after.installed || after.state === "update-required") {
      completeJob(job, {
        state: "degraded",
        stage: "Verifying installation",
        message: `${after.displayName} was installed but could not be verified.`,
        error: { code: "VERIFICATION_FAILED", message: `${after.displayName} was installed but could not be verified.` },
      });
      return { id: dependencyId, state: "degraded", changed: true, log, before, after, job };
    }
    completeJob(job, {
      state: "completed",
      stage: "Installation complete",
      message: `${after.displayName} installed and verified.`,
      progressMode: "determinate",
      progressPercent: 100,
      restartRequired: after.restartRequired === true || before.serviceRestartRequired === true,
    });
    logger.write("info", "dependency-install-completed", `Installed ${dependencyId}.`, { dependencyId, packages }, { file: "agent" });
    return { id: dependencyId, state: "installed", changed: true, log, before, after, job };
  } finally {
    packageManagerBusy = false;
  }
}

async function tryEnableService(service, sudoPath, log) {
  const systemctl = findCommand("systemctl");
  if (!systemctl) return;
  const command = sudoPath || systemctl;
  const baseArgs = sudoPath ? ["-n", systemctl] : [];
  for (const args of [["enable", "--now", service], ["start", service]]) {
    const result = await commandRunner(command, [...baseArgs, ...args], { timeoutMs: 60000 });
    log.push({ phase: "starting-service", command: "systemctl", args, exitCode: result.exitCode, stdout: sanitizeOutput(result.stdout), stderr: sanitizeOutput(result.stderr) });
    if (result.ok) return;
  }
}

function classifyInstallFailure(result) {
  const output = `${result.stderr || ""}\n${result.stdout || ""}`.toLowerCase();
  if (/could not get lock|unable to acquire.*lock|is another process using it/.test(output)) return "PACKAGE_MANAGER_LOCKED";
  if (/unable to locate package|no match for argument|not found/.test(output)) return "PACKAGE_NOT_FOUND";
  if (/temporary failure|failed to fetch|could not resolve|network is unreachable/.test(output)) return "NETWORK_ERROR";
  if (/signature|gpg|public key|not signed/.test(output)) return "SIGNATURE_FAILURE";
  if (/repository|metadata|release file/.test(output)) return "REPOSITORY_UNAVAILABLE";
  if (/permission denied|operation not permitted|sudo/.test(output)) return "INSUFFICIENT_PRIVILEGES";
  return "INSTALL_COMMAND_FAILED";
}

async function installDependencies(payload = {}) {
  const dependencyIds = resolveDependencyRequestIds(payload);
  const context = {
    nodeId: payload.nodeId || null,
    platform: process.platform,
  };
  const results = [];
  for (const dependencyId of dependencyIds) {
    results.push(await installDependency(dependencyId, context));
  }
  const check = await checkDependencies({ dependencyIds });
  const jobs = results.map((result) => result.job).filter(Boolean);
  const degraded = results.filter((result) => result.state === "degraded" || result.job?.state === "degraded");
  return {
    ok: check.ok && degraded.length === 0,
    degraded: degraded.length > 0,
    jobs,
    job: jobs[0] || null,
    results,
    dependencies: check.dependencies,
    missingDependencyIds: check.missingDependencyIds,
    completedAt: new Date().toISOString(),
  };
}

function getDependencyCatalog() {
  return {
    dependencies: listDependencyDefinitions(),
    groups: listDependencyGroups(),
    distribution: detectDistribution(),
  };
}

function __setTestHooks(hooks = {}) {
  commandRunner = hooks.commandRunner || runCommand;
  readFileText = hooks.readFileText || ((filePath) => fs.readFileSync(filePath, "utf8"));
  accessExecutable = hooks.accessExecutable || ((filePath) => fs.accessSync(filePath, fs.constants.X_OK));
  packageManagerBusy = false;
  activeDependencyInstalls.clear();
  dependencyJobs.clear();
}

module.exports = {
  __setTestHooks,
  checkDependencies,
  detectDistribution,
  getDependencyCatalog,
  installDependencies,
  planDependencyPreparation,
  parseOsRelease,
};
