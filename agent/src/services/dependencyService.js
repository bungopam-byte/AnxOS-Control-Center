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
let packageManagerBusy = false;
let commandRunner = runCommand;
let readFileText = (filePath) => fs.readFileSync(filePath, "utf8");
let accessExecutable = (filePath) => fs.accessSync(filePath, fs.constants.X_OK);

function trimOutput(value) {
  const text = String(value || "");
  if (text.length <= OUTPUT_LIMIT) return text;
  return `${text.slice(0, OUTPUT_LIMIT)}\n[output truncated, ${text.length - OUTPUT_LIMIT} chars omitted]`;
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
  const supported = process.platform === "linux" && definition.supportedDistributions.includes(distribution.id);
  const commandResults = [];
  for (const command of definition.commands) {
    const resolvedPath = findCommand(command);
    commandResults.push({ command, path: resolvedPath, installed: Boolean(resolvedPath) });
  }
  const installed = commandResults.every((result) => result.installed);
  let version = null;
  let versionRaw = null;
  let state = installed ? "installed" : "missing";
  let errorCode = installed ? null : "DEPENDENCY_MISSING";

  if (!supported && !installed) {
    state = "unsupported";
    errorCode = "UNSUPPORTED_DISTRIBUTION";
  }

  if (installed) {
    const versionResult = await detectVersion(definition, commandResults[0].path);
    version = versionResult.version;
    versionRaw = versionResult.raw;
    if (definition.minVersion && version && compareVersions(version, definition.minVersion) < 0) {
      state = "update-required";
      errorCode = "DEPENDENCY_VERSION_TOO_OLD";
    }
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
  const missing = dependencies.filter((dependency) => !dependency.installed || dependency.state === "update-required");
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

async function installDependency(dependencyId) {
  const id = assertKnownDependencyId(dependencyId);
  if (activeDependencyInstalls.has(id)) {
    return activeDependencyInstalls.get(id);
  }
  const promise = doInstallDependency(id).finally(() => activeDependencyInstalls.delete(id));
  activeDependencyInstalls.set(id, promise);
  return promise;
}

async function doInstallDependency(dependencyId) {
  if (packageManagerBusy) {
    throw createDependencyError("PACKAGE_MANAGER_BUSY", "Another dependency installation is already running.", { dependencyId }, 409);
  }
  packageManagerBusy = true;
  const log = [];
  try {
    const before = await checkDependency(dependencyId);
    if (before.installed && before.state !== "update-required") {
      return { id: dependencyId, state: "installed", changed: false, log, before, after: before };
    }
    if (!before.supported) {
      throw createDependencyError("UNSUPPORTED_DISTRIBUTION", `${before.displayName} cannot be installed automatically on this operating system.`, {
        dependencyId,
        distribution: before.distribution,
      }, 400);
    }
    const packages = before.packages || [];
    if (packages.length === 0) {
      throw createDependencyError("PACKAGE_NOT_FOUND", `${before.displayName} has no supported package mapping for this distribution.`, {
        dependencyId,
        packageManager: before.packageManager,
      }, 400);
    }
    const packageManagerCommand = getPackageManagerCommand(before.packageManager);
    if (!packageManagerCommand) {
      throw createDependencyError("PACKAGE_MANAGER_MISSING", `Required package manager ${before.packageManager} was not found.`, {
        dependencyId,
        packageManager: before.packageManager,
      }, 400);
    }
    const elevation = await canElevate();
    if (!elevation.available) {
      throw createDependencyError("ADMIN_REQUIRED", `${before.displayName} requires administrator privileges to install.`, {
        dependencyId,
        reason: elevation.reason,
      }, 403);
    }
    const sudoPath = elevation.method === "sudo-noninteractive" ? findCommand("sudo") : null;
    const commands = buildInstallCommands(before.packageManager, packages);
    logger.write("info", "dependency-install-started", `Installing ${dependencyId}.`, { dependencyId, packages, packageManager: before.packageManager }, { file: "agent" });
    for (const commandSpec of commands) {
      const executable = commandSpec.command === before.packageManager ? packageManagerCommand : findCommand(commandSpec.command);
      const command = sudoPath ? sudoPath : executable;
      const args = sudoPath ? ["-n", executable, ...commandSpec.args] : commandSpec.args;
      const result = await commandRunner(command, args, { timeoutMs: INSTALL_TIMEOUT_MS });
      log.push({ phase: commandSpec.phase, command: commandSpec.command, args: commandSpec.args, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr });
      if (!result.ok) {
        throw createDependencyError(classifyInstallFailure(result), `${before.displayName} installation failed during ${commandSpec.phase}.`, {
          dependencyId,
          phase: commandSpec.phase,
          exitCode: result.exitCode,
          stderr: result.stderr,
          stdout: result.stdout,
        }, 500);
      }
    }
    if (dependencyId === "docker") {
      await tryEnableService("docker", sudoPath, log);
    }
    const after = await checkDependency(dependencyId);
    if (!after.installed || after.state === "update-required") {
      throw createDependencyError("DEPENDENCY_VERIFY_FAILED", `${after.displayName} was installed but could not be verified.`, {
        dependencyId,
        state: after.state,
        commands: after.commands,
      }, 500);
    }
    logger.write("info", "dependency-install-completed", `Installed ${dependencyId}.`, { dependencyId, packages }, { file: "agent" });
    return { id: dependencyId, state: "installed", changed: true, log, before, after };
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
    log.push({ phase: "starting-service", command: "systemctl", args, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr });
    if (result.ok) return;
  }
}

function classifyInstallFailure(result) {
  const output = `${result.stderr || ""}\n${result.stdout || ""}`.toLowerCase();
  if (/could not get lock|unable to acquire.*lock|is another process using it/.test(output)) return "PACKAGE_MANAGER_LOCKED";
  if (/unable to locate package|no match for argument|not found/.test(output)) return "PACKAGE_NOT_FOUND";
  if (/temporary failure|failed to fetch|could not resolve|network is unreachable/.test(output)) return "NETWORK_UNAVAILABLE";
  if (/repository|gpg|signature|metadata/.test(output)) return "REPOSITORY_FAILURE";
  if (/permission denied|operation not permitted|sudo/.test(output)) return "INSUFFICIENT_PRIVILEGES";
  return "DEPENDENCY_INSTALL_FAILED";
}

async function installDependencies(payload = {}) {
  const dependencyIds = resolveDependencyRequestIds(payload);
  const results = [];
  for (const dependencyId of dependencyIds) {
    results.push(await installDependency(dependencyId));
  }
  const check = await checkDependencies({ dependencyIds });
  return {
    ok: check.ok,
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
}

module.exports = {
  __setTestHooks,
  checkDependencies,
  detectDistribution,
  getDependencyCatalog,
  installDependencies,
  parseOsRelease,
};
