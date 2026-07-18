const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const diagnostics = require("./diagnosticsService");
const { openExternalUrl } = require("./externalUrlService");

const EXPECTED_BRANCH = "dev";
const EXPECTED_REMOTE = "origin";
const EXPECTED_REMOTE_REF = "origin/dev";
const DEPENDENCY_MANIFESTS = [
  "package.json",
  "package-lock.json",
  "agent/package.json",
  "agent/package-lock.json",
];

const ERROR_MESSAGES = {
  DEV_SOURCE_GIT_UNAVAILABLE: "Git is required for source Dev Update. Install Git, then try again.",
  DEV_SOURCE_REPOSITORY_NOT_FOUND: "Developer Source Update requires a valid Git checkout.",
  DEV_SOURCE_ORIGIN_MISSING: "Developer Source Update requires the trusted origin remote.",
  DEV_SOURCE_BRANCH_MISSING: "The origin/dev branch could not be found.",
  DEV_SOURCE_DIRTY_WORKTREE: "Your development checkout contains uncommitted changes. Dev Update will not overwrite them.",
  DEV_SOURCE_BRANCH_MISMATCH: "Dev Update requires the dev branch.",
  DEV_SOURCE_DIVERGED: "Automatic update is unavailable because this checkout has local commits that differ from origin/dev.",
  DEV_SOURCE_FETCH_FAILED: "Could not reach the development repository. Check your connection and try again.",
  DEV_SOURCE_UPDATE_FAILED: "Development source update failed.",
  DEV_SOURCE_DEPENDENCY_INSTALL_FAILED: "Dependency installation failed after the source update.",
  DEV_SOURCE_VALIDATION_FAILED: "Updated source validation failed.",
  DEV_SOURCE_RESTART_FAILED: "The source update completed, but the development app could not restart automatically.",
};

function defaultCommandRunner(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeout || 15000,
    windowsHide: true,
    env: options.env || process.env,
  }).trim();
}

function parseCount(value) {
  const number = Number.parseInt(String(value || "0"), 10);
  return Number.isFinite(number) ? number : 0;
}

function shortCommit(value) {
  return String(value || "").trim().slice(0, 12) || null;
}

function redactRemoteUrl(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  if (/^git@github\.com:/i.test(value)) {
    return `https://github.com/${value.replace(/^git@github\.com:/i, "").replace(/\.git$/i, "")}`;
  }
  return value
    .replace(/(https?:\/\/)([^/@\s]+)@/i, "$1[redacted]@")
    .replace(/\.git$/i, "");
}

function safeErrorMessage(error, fallback = "Developer update failed.") {
  const message = String(error?.stderr || error?.message || error || fallback);
  return message
    .replace(/(https?:\/\/)([^/@\s]+)@/ig, "$1[redacted]@")
    .replace(/\b(token|password|authorization|secret)=\S+/ig, "$1=[redacted]")
    .split(/\r?\n/)
    .slice(0, 4)
    .join("\n")
    .trim() || fallback;
}

function uniquePaths(paths) {
  return Array.from(new Set(paths.filter(Boolean).map((item) => String(item).replace(/\\/g, "/"))));
}

function parsePorcelain(output) {
  return String(output || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const raw = line.slice(3).replace(/^"|"$/g, "");
      const renamed = raw.includes(" -> ") ? raw.split(" -> ").pop() : raw;
      return {
        status: line.slice(0, 2),
        path: renamed,
      };
    });
}

function dependencyManifestsChanged(changedFiles) {
  const normalized = new Set(uniquePaths(changedFiles));
  return {
    app: ["package.json", "package-lock.json"].some((file) => normalized.has(file)),
    agent: ["agent/package.json", "agent/package-lock.json"].some((file) => normalized.has(file)),
  };
}

class DeveloperGitUpdater {
  constructor({ app, appRoot, commandRunner = defaultCommandRunner, opener = openExternalUrl } = {}) {
    this.app = app;
    this.appRoot = appRoot || process.cwd();
    this.commandRunner = commandRunner;
    this.opener = opener;
    this.state = {
      mode: this.app?.isPackaged === false ? "source-dev" : "packaged-dev",
      available: false,
      eligible: false,
      status: "unavailable",
      branch: null,
      expectedBranch: EXPECTED_BRANCH,
      localCommit: null,
      remoteCommit: null,
      ahead: 0,
      behind: 0,
      latestCommitMessage: null,
      lastCheckedAt: null,
      error: null,
      errorCode: null,
      restartRequired: false,
      dependencyInstallRequired: false,
      dependencyScopes: [],
      changedFiles: [],
      details: [],
    };
  }

  run(command, args, options = {}) {
    return this.commandRunner(command, args, {
      cwd: options.cwd || this.appRoot,
      timeout: options.timeout,
      env: options.env,
    });
  }

  git(args, options = {}) {
    return this.run("git", args, options);
  }

  optionalGit(args, options = {}) {
    try {
      return this.git(args, options);
    } catch {
      return null;
    }
  }

  npm(args, options = {}) {
    return this.run("npm", args, { timeout: options.timeout || 120000 });
  }

  log(level, operation, message, context = {}, code = null) {
    diagnostics.log(level, "developer-update", operation, message, {
      code,
      mode: this.state.mode,
      branch: context.branch || this.state.branch,
      currentCommit: shortCommit(context.currentCommit || this.state.localCommit),
      remoteCommit: shortCommit(context.remoteCommit || this.state.remoteCommit),
      ahead: Number(context.ahead ?? this.state.ahead ?? 0),
      behind: Number(context.behind ?? this.state.behind ?? 0),
      dirty: Boolean(context.dirty),
      changedFileCount: Number(context.changedFileCount || 0),
      dependencyInstallRequired: Boolean(context.dependencyInstallRequired),
      validationSuccess: context.validationSuccess,
      restartRequested: context.restartRequested,
    }, { file: "updater", errorCode: code || undefined });
  }

  getState() {
    return { ...this.state, changedFiles: [...(this.state.changedFiles || [])], details: [...(this.state.details || [])] };
  }

  setState(patch = {}) {
    this.state = {
      ...this.state,
      ...patch,
      mode: this.app?.isPackaged === false ? "source-dev" : "packaged-dev",
    };
    return this.getState();
  }

  block(code, patch = {}) {
    const state = this.setState({
      available: false,
      eligible: false,
      status: "blocked",
      errorCode: code,
      error: ERROR_MESSAGES[code] || "Developer Source Update is blocked.",
      lastCheckedAt: new Date().toISOString(),
      ...patch,
    });
    this.log("warn", "blocked", state.error, {
      dirty: code === "DEV_SOURCE_DIRTY_WORKTREE",
      changedFileCount: state.changedFiles?.length || 0,
    }, code);
    return state;
  }

  inspectLocal() {
    if (this.app?.isPackaged !== false) {
      return { eligible: false, reason: "packaged", mode: "packaged-dev" };
    }

    if (!fs.existsSync(path.join(this.appRoot, "package.json")) || !fs.existsSync(path.join(this.appRoot, ".git"))) {
      return { eligible: false, reason: "DEV_SOURCE_REPOSITORY_NOT_FOUND", mode: "source-dev" };
    }

    try {
      if (this.git(["rev-parse", "--is-inside-work-tree"]) !== "true") {
        return { eligible: false, reason: "DEV_SOURCE_REPOSITORY_NOT_FOUND", mode: "source-dev" };
      }
    } catch {
      return { eligible: false, reason: "DEV_SOURCE_GIT_UNAVAILABLE", mode: "source-dev" };
    }

    const branch = this.git(["branch", "--show-current"]);
    const localCommit = this.git(["rev-parse", "--short", "HEAD"]);
    const originUrl = this.optionalGit(["config", "--get", "remote.origin.url"]);
    if (!originUrl) {
      return { eligible: false, reason: "DEV_SOURCE_ORIGIN_MISSING", mode: "source-dev", branch, localCommit };
    }
    return {
      eligible: branch === EXPECTED_BRANCH,
      reason: branch === EXPECTED_BRANCH ? null : "DEV_SOURCE_BRANCH_MISMATCH",
      mode: "source-dev",
      branch,
      localCommit,
      originUrl: redactRemoteUrl(originUrl),
    };
  }

  getLocal() {
    try {
      return this.inspectLocal();
    } catch (error) {
      const message = safeErrorMessage(error);
      if (/not a git repository/i.test(message)) return { eligible: false, reason: "DEV_SOURCE_REPOSITORY_NOT_FOUND", mode: "source-dev" };
      if (/No such remote|remote\.origin\.url/i.test(message)) return { eligible: false, reason: "DEV_SOURCE_ORIGIN_MISSING", mode: "source-dev" };
      return { eligible: false, reason: "DEV_SOURCE_GIT_UNAVAILABLE", mode: "source-dev", error: message };
    }
  }

  readDirtyFiles() {
    return parsePorcelain(this.git(["status", "--porcelain"])).map((entry) => entry.path);
  }

  readChangedFiles(oldRevision, newRevision) {
    if (!oldRevision || !newRevision || oldRevision === newRevision) return [];
    return uniquePaths(this.git(["diff", "--name-only", `${oldRevision}..${newRevision}`]).split(/\r?\n/));
  }

  inspectRemote() {
    const remoteCommit = this.git(["rev-parse", "--short", EXPECTED_REMOTE_REF]);
    const counts = this.git(["rev-list", "--left-right", "--count", `HEAD...${EXPECTED_REMOTE_REF}`]).split(/\s+/);
    const ahead = parseCount(counts[0]);
    const behind = parseCount(counts[1]);
    const latestCommitMessage = this.git(["log", "-1", "--pretty=%s", EXPECTED_REMOTE_REF]);
    return { remoteCommit, ahead, behind, latestCommitMessage };
  }

  check(options = {}) {
    const local = this.getLocal();
    if (local.mode === "packaged-dev") {
      return this.setState({
        mode: "packaged-dev",
        available: false,
        eligible: false,
        status: "unavailable",
        errorCode: "packaged",
        error: "Packaged builds use the packaged Developer Update path.",
        branch: null,
        localCommit: null,
        lastCheckedAt: new Date().toISOString(),
      });
    }

    if (!local.eligible) {
      return this.block(local.reason || "DEV_SOURCE_REPOSITORY_NOT_FOUND", {
        mode: "source-dev",
        branch: local.branch || null,
        localCommit: local.localCommit || null,
        error: ERROR_MESSAGES[local.reason] || local.error || "Developer Source Update is unavailable.",
      });
    }

    try {
      if (options.fetch !== false) {
        this.setState({ status: "fetching", details: ["Fetching origin/dev"] });
        this.git(["fetch", EXPECTED_REMOTE, EXPECTED_BRANCH, "--prune"], { timeout: 30000 });
      }
      this.git(["rev-parse", "--verify", EXPECTED_REMOTE_REF]);
    } catch (error) {
      const message = safeErrorMessage(error, ERROR_MESSAGES.DEV_SOURCE_FETCH_FAILED);
      const code = /origin\/dev|Needed a single revision|unknown revision/i.test(message)
        ? "DEV_SOURCE_BRANCH_MISSING"
        : "DEV_SOURCE_FETCH_FAILED";
      return this.block(code, {
        eligible: true,
        branch: local.branch,
        localCommit: local.localCommit,
        error: ERROR_MESSAGES[code],
        details: [message],
      });
    }

    const remote = this.inspectRemote();
    const diverged = remote.ahead > 0 && remote.behind > 0;
    const changedFiles = remote.behind > 0 ? this.readChangedFiles("HEAD", EXPECTED_REMOTE_REF) : [];
    const dependencyScopes = dependencyManifestsChanged(changedFiles);
    const state = {
      mode: "source-dev",
      available: true,
      eligible: true,
      status: diverged ? "blocked" : remote.behind > 0 ? "available" : "up-to-date",
      branch: local.branch,
      expectedBranch: EXPECTED_BRANCH,
      localCommit: local.localCommit,
      remoteCommit: remote.remoteCommit,
      ahead: remote.ahead,
      behind: remote.behind,
      latestCommitMessage: remote.latestCommitMessage,
      lastCheckedAt: new Date().toISOString(),
      errorCode: diverged ? "DEV_SOURCE_DIVERGED" : null,
      error: diverged ? ERROR_MESSAGES.DEV_SOURCE_DIVERGED : null,
      restartRequired: this.state.restartRequired && remote.behind === 0,
      changedFiles,
      dependencyInstallRequired: dependencyScopes.app || dependencyScopes.agent,
      dependencyScopes: [
        dependencyScopes.app ? "application" : null,
        dependencyScopes.agent ? "agent" : null,
      ].filter(Boolean),
      details: [],
    };
    this.setState(state);
    this.log(diverged ? "warn" : "info", "check", diverged ? "Development branch diverged." : "Development source update checked.", {
      branch: state.branch,
      currentCommit: state.localCommit,
      remoteCommit: state.remoteCommit,
      ahead: state.ahead,
      behind: state.behind,
      dependencyInstallRequired: state.dependencyInstallRequired,
    }, diverged ? "DEV_SOURCE_DIVERGED" : null);
    return this.getState();
  }

  installDependencies(scopes) {
    if (scopes.includes("application")) {
      this.setState({ status: "installing-app-dependencies", details: ["Installing application dependencies"] });
      this.npm(["ci"], { timeout: 180000 });
    }
    if (scopes.includes("agent")) {
      this.setState({ status: "installing-agent-dependencies", details: ["Installing Agent dependencies"] });
      this.npm(["--prefix", "agent", "ci"], { timeout: 180000 });
    }
  }

  validateUpdatedCheckout() {
    JSON.parse(fs.readFileSync(path.join(this.appRoot, "package.json"), "utf8"));
    if (!fs.existsSync(path.join(this.appRoot, "main.js")) || !fs.existsSync(path.join(this.appRoot, "app.js"))) {
      throw new Error("Required Electron entry files are missing.");
    }
    const local = this.git(["rev-parse", "--short", "HEAD"]);
    const remote = this.git(["rev-parse", "--short", EXPECTED_REMOTE_REF]);
    if (local !== remote) {
      throw new Error("Updated checkout does not match origin/dev.");
    }
    this.run("node", ["--check", "app.js"], { timeout: 30000 });
    return { localCommit: local, remoteCommit: remote };
  }

  update() {
    const checked = this.check({ fetch: true });
    if (!checked.eligible || checked.status === "blocked") return checked;
    if (checked.behind <= 0) return checked;

    const dirtyFiles = this.readDirtyFiles();
    if (dirtyFiles.length) {
      return this.block("DEV_SOURCE_DIRTY_WORKTREE", {
        eligible: true,
        available: true,
        status: "blocked",
        branch: checked.branch,
        localCommit: checked.localCommit,
        remoteCommit: checked.remoteCommit,
        ahead: checked.ahead,
        behind: checked.behind,
        changedFiles: dirtyFiles.slice(0, 50),
      });
    }

    if (checked.ahead > 0) {
      return this.block("DEV_SOURCE_DIVERGED", {
        eligible: true,
        available: true,
        branch: checked.branch,
        localCommit: checked.localCommit,
        remoteCommit: checked.remoteCommit,
        ahead: checked.ahead,
        behind: checked.behind,
      });
    }

    const before = this.git(["rev-parse", "HEAD"]);
    const dependencyScopes = checked.dependencyScopes || [];
    try {
      this.setState({ status: "updating-source", error: null, errorCode: null, details: ["Updating source"] });
      this.git(["merge", "--ff-only", EXPECTED_REMOTE_REF], { timeout: 60000 });
    } catch (error) {
      return this.block("DEV_SOURCE_UPDATE_FAILED", {
        eligible: true,
        available: true,
        error: ERROR_MESSAGES.DEV_SOURCE_UPDATE_FAILED,
        details: [safeErrorMessage(error)],
      });
    }

    try {
      this.installDependencies(dependencyScopes);
    } catch (error) {
      return this.block("DEV_SOURCE_DEPENDENCY_INSTALL_FAILED", {
        eligible: true,
        available: true,
        error: ERROR_MESSAGES.DEV_SOURCE_DEPENDENCY_INSTALL_FAILED,
        details: [safeErrorMessage(error)],
        dependencyInstallRequired: true,
        dependencyScopes,
      });
    }

    let validation;
    try {
      this.setState({ status: "validating-update", details: ["Validating updated source"] });
      validation = this.validateUpdatedCheckout();
    } catch (error) {
      return this.block("DEV_SOURCE_VALIDATION_FAILED", {
        eligible: true,
        available: true,
        error: ERROR_MESSAGES.DEV_SOURCE_VALIDATION_FAILED,
        details: [safeErrorMessage(error)],
      });
    }

    const after = this.git(["rev-parse", "HEAD"]);
    const changedFiles = this.readChangedFiles(before, after);
    const next = this.setState({
      status: "restart-required",
      available: true,
      eligible: true,
      localCommit: shortCommit(validation.localCommit),
      remoteCommit: shortCommit(validation.remoteCommit),
      ahead: 0,
      behind: 0,
      restartRequired: true,
      changedFiles,
      dependencyInstallRequired: dependencyScopes.length > 0,
      dependencyScopes,
      details: dependencyScopes.length ? ["Dependencies updated from committed lockfiles."] : ["Dependencies unchanged."],
      lastCheckedAt: new Date().toISOString(),
      error: null,
      errorCode: null,
    });
    this.log("info", "update", "Development source updated.", {
      currentCommit: next.localCommit,
      remoteCommit: next.remoteCommit,
      dependencyInstallRequired: next.dependencyInstallRequired,
      validationSuccess: true,
    });
    return next;
  }

  restart() {
    if (this.app?.isPackaged !== false) {
      return { ...this.getState(), restarted: false, error: "packaged" };
    }
    try {
      this.setState({ status: "restarting", details: ["Restarting development application"] });
      this.app.relaunch({ args: process.argv.slice(1), execPath: process.execPath });
      this.log("info", "restart", "Development source restart requested.", { restartRequested: true });
      this.app.exit(0);
      return { ...this.getState(), restarted: true };
    } catch (error) {
      const state = this.setState({
        status: "restart-required",
        restartRequired: true,
        errorCode: "DEV_SOURCE_RESTART_FAILED",
        error: ERROR_MESSAGES.DEV_SOURCE_RESTART_FAILED,
        details: [safeErrorMessage(error)],
      });
      this.log("warn", "restart-failed", state.error, { restartRequested: true }, "DEV_SOURCE_RESTART_FAILED");
      return { ...state, restarted: false };
    }
  }

  async openChanges() {
    const state = this.check({ fetch: false });
    if (!state.eligible || !state.localCommit || !state.remoteCommit) return { opened: false };

    const origin = redactRemoteUrl(this.git(["config", "--get", "remote.origin.url"]));
    if (!origin) return { opened: false };

    const url = `${origin}/compare/${encodeURIComponent(state.localCommit)}...${encodeURIComponent(state.remoteCommit)}`;
    await this.opener(url, { source: "developer-update-changes" });
    return { opened: true, url };
  }
}

module.exports = {
  DeveloperGitUpdater,
  _test: {
    DEPENDENCY_MANIFESTS,
    ERROR_MESSAGES,
    dependencyManifestsChanged,
    parsePorcelain,
    redactRemoteUrl,
    safeErrorMessage,
  },
};
