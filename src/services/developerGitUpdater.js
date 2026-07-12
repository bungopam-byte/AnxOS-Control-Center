const { execFileSync } = require("child_process");
const { openExternalUrl } = require("./externalUrlService");

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeout || 15000,
  }).trim();
}

function parseCount(value) {
  const number = Number.parseInt(String(value || "0"), 10);
  return Number.isFinite(number) ? number : 0;
}

function normalizeRemoteUrl(url) {
  const value = String(url || "").trim();
  if (!value) return null;
  if (/^git@github\.com:/i.test(value)) {
    return `https://github.com/${value.replace(/^git@github\.com:/i, "").replace(/\.git$/i, "")}`;
  }
  return value.replace(/\.git$/i, "");
}

class DeveloperGitUpdater {
  constructor({ app, appRoot }) {
    this.app = app;
    this.appRoot = appRoot;
    this.state = {
      available: false,
      eligible: false,
      status: "unavailable",
      branch: null,
      localCommit: null,
      remoteCommit: null,
      ahead: 0,
      behind: 0,
      latestCommitMessage: null,
      lastCheckedAt: null,
      error: null,
      restartRequired: false,
    };
  }

  getState() {
    return { ...this.state };
  }

  inspectLocal() {
    if (this.app?.isPackaged !== false) {
      return { eligible: false, reason: "packaged" };
    }

    const isWorkTree = runGit(["rev-parse", "--is-inside-work-tree"], { cwd: this.appRoot }) === "true";
    const branch = runGit(["branch", "--show-current"], { cwd: this.appRoot });
    const localCommit = runGit(["rev-parse", "--short", "HEAD"], { cwd: this.appRoot });

    return {
      eligible: Boolean(isWorkTree && branch === "dev"),
      reason: !isWorkTree ? "not-git-worktree" : branch !== "dev" ? "not-dev-branch" : null,
      branch,
      localCommit,
    };
  }

  check(options = {}) {
    try {
      const local = this.inspectLocal();
      if (!local.eligible) {
        this.state = {
          ...this.state,
          available: false,
          eligible: false,
          status: "unavailable",
          branch: local.branch || null,
          localCommit: local.localCommit || null,
          error: local.reason || null,
        };
        return this.getState();
      }

      if (options.fetch !== false) {
        runGit(["fetch", "origin", "dev", "--prune"], { cwd: this.appRoot, timeout: 30000 });
      }

      const remoteCommit = runGit(["rev-parse", "--short", "origin/dev"], { cwd: this.appRoot });
      const counts = runGit(["rev-list", "--left-right", "--count", "HEAD...origin/dev"], { cwd: this.appRoot }).split(/\s+/);
      const ahead = parseCount(counts[0]);
      const behind = parseCount(counts[1]);
      const latestCommitMessage = runGit(["log", "-1", "--pretty=%s", "origin/dev"], { cwd: this.appRoot });

      this.state = {
        available: true,
        eligible: true,
        status: this.state.restartRequired ? "restart-required" : behind > 0 ? "available" : "up-to-date",
        branch: local.branch,
        localCommit: local.localCommit,
        remoteCommit,
        ahead,
        behind,
        latestCommitMessage,
        lastCheckedAt: new Date().toISOString(),
        error: null,
        restartRequired: this.state.restartRequired,
      };
      return this.getState();
    } catch (error) {
      this.state = {
        ...this.state,
        available: false,
        status: "error",
        lastCheckedAt: new Date().toISOString(),
        error: error?.message || "Developer update check failed.",
      };
      return this.getState();
    }
  }

  update() {
    const checked = this.check({ fetch: true });
    if (!checked.eligible) return checked;
    if (checked.behind <= 0) return checked;

    try {
      this.state = { ...this.state, status: "updating", error: null };
      runGit(["pull", "--ff-only", "origin", "dev"], { cwd: this.appRoot, timeout: 60000 });
      const localCommit = runGit(["rev-parse", "--short", "HEAD"], { cwd: this.appRoot });
      this.state = {
        ...this.state,
        status: "restart-required",
        localCommit,
        ahead: 0,
        behind: 0,
        restartRequired: true,
        lastCheckedAt: new Date().toISOString(),
        error: null,
      };
      return this.getState();
    } catch (error) {
      this.state = {
        ...this.state,
        status: "error",
        lastCheckedAt: new Date().toISOString(),
        error: error?.message || "Developer update failed.",
      };
      return this.getState();
    }
  }

  restart() {
    if (this.app?.isPackaged !== false) {
      return { ...this.getState(), restarted: false, error: "packaged" };
    }
    this.app.relaunch();
    this.app.exit(0);
    return { ...this.getState(), restarted: true };
  }

  async openChanges() {
    const state = this.check({ fetch: false });
    if (!state.eligible) return { opened: false };

    const origin = normalizeRemoteUrl(runGit(["config", "--get", "remote.origin.url"], { cwd: this.appRoot }));
    if (!origin || !state.localCommit || !state.remoteCommit) return { opened: false };

    const url = `${origin}/compare/${encodeURIComponent(state.localCommit)}...${encodeURIComponent(state.remoteCommit)}`;
    await openExternalUrl(url, { source: "developer-update-changes" });
    return { opened: true, url };
  }
}

module.exports = { DeveloperGitUpdater };
