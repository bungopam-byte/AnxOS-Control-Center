const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { DeveloperGitUpdater, _test } = require("../src/services/developerGitUpdater");

function run(command, args, cwd) {
  return childProcess.execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function commit(repo, message) {
  run("git", ["add", "-A"], repo);
  run("git", ["commit", "-m", message], repo);
}

function createRepoFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-dev-update-"));
  const remote = path.join(root, "remote.git");
  const seed = path.join(root, "seed");
  const local = path.join(root, "local");
  run("git", ["init", "--bare", remote], root);
  run("git", ["clone", remote, seed], root);
  run("git", ["config", "user.email", "dev@example.invalid"], seed);
  run("git", ["config", "user.name", "Dev Update Smoke"], seed);
  write(path.join(seed, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0" }, null, 2));
  write(path.join(seed, "package-lock.json"), JSON.stringify({ name: "fixture", lockfileVersion: 3, packages: {} }, null, 2));
  write(path.join(seed, "app.js"), "console.log('ok');\n");
  write(path.join(seed, "main.js"), "require('./app');\n");
  write(path.join(seed, "agent/package.json"), JSON.stringify({ name: "agent-fixture", version: "1.0.0" }, null, 2));
  write(path.join(seed, "agent/package-lock.json"), JSON.stringify({ name: "agent-fixture", lockfileVersion: 3, packages: {} }, null, 2));
  commit(seed, "initial");
  run("git", ["branch", "-M", "dev"], seed);
  run("git", ["push", "-u", "origin", "dev"], seed);
  run("git", ["clone", "--branch", "dev", remote, local], root);
  run("git", ["config", "user.email", "local@example.invalid"], local);
  run("git", ["config", "user.name", "Local Dev"], local);
  return { root, remote, seed, local };
}

function makeUpdater(appRoot, options = {}) {
  const commands = [];
  const app = options.app || {
    isPackaged: false,
    relaunch: () => { commands.push({ command: "relaunch", args: [] }); },
    exit: () => { commands.push({ command: "exit", args: [] }); },
  };
  const runner = (command, args, commandOptions = {}) => {
    commands.push({ command, args: [...args] });
    if (command === "npm") return "";
    return run(command, args, commandOptions.cwd || appRoot);
  };
  return { updater: new DeveloperGitUpdater({ app, appRoot, commandRunner: runner, opener: async () => ({ opened: true }) }), commands };
}

function advanceRemote(fixture, mutate, message = "remote update") {
  mutate(fixture.seed);
  commit(fixture.seed, message);
  run("git", ["push", "origin", "dev"], fixture.seed);
}

function assertNoDestructiveGit(commands) {
  const joined = commands.map((entry) => `${entry.command} ${entry.args.join(" ")}`).join("\n");
  assert(!/\bgit reset --hard\b/.test(joined), "Dev update must not reset hard.");
  assert(!/\bgit clean\b/.test(joined), "Dev update must not clean files.");
  assert(!/\bgit stash\b/.test(joined), "Dev update must not auto-stash.");
  assert(!/\bgit rebase\b/.test(joined), "Dev update must not rebase.");
}

async function main() {
  assert.strictEqual(_test.redactRemoteUrl("https://token@example.com/repo.git"), "https://[redacted]@example.com/repo", "Remote credentials should be redacted.");
  assert.deepStrictEqual(_test.dependencyManifestsChanged(["package-lock.json", "agent/src/server.js"]), { app: true, agent: false }, "Application dependency changes should be detected.");
  assert.deepStrictEqual(_test.dependencyManifestsChanged(["agent/package-lock.json"]), { app: false, agent: true }, "Agent dependency changes should be detected.");

  {
    const fixture = createRepoFixture();
    const { updater } = makeUpdater(fixture.local);
    const state = updater.check({ fetch: true });
    assert.strictEqual(state.mode, "source-dev", "Unpackaged app should use source-dev mode.");
    assert.strictEqual(state.status, "up-to-date", "Equal HEAD and origin/dev should be up to date.");
  }

  {
    const fixture = createRepoFixture();
    advanceRemote(fixture, (repo) => write(path.join(repo, "feature.txt"), "one\n"), "remote one");
    advanceRemote(fixture, (repo) => write(path.join(repo, "feature2.txt"), "two\n"), "remote two");
    advanceRemote(fixture, (repo) => write(path.join(repo, "feature3.txt"), "three\n"), "remote three");
    const { updater } = makeUpdater(fixture.local);
    const state = updater.check({ fetch: true });
    assert.strictEqual(state.status, "available", "Remote ahead should be available.");
    assert.strictEqual(state.behind, 3, "Behind count should report remote commits.");
    assert.strictEqual(state.latestCommitMessage, "remote three", "Latest remote commit title should be shown.");
  }

  {
    const fixture = createRepoFixture();
    advanceRemote(fixture, (repo) => write(path.join(repo, "feature.txt"), "one\n"), "remote update");
    const { updater, commands } = makeUpdater(fixture.local);
    const state = updater.update();
    assert.strictEqual(state.status, "restart-required", "Clean fast-forward should update and require restart.");
    assert.strictEqual(run("git", ["rev-parse", "--short", "HEAD"], fixture.local), run("git", ["rev-parse", "--short", "origin/dev"], fixture.local), "Local HEAD should match origin/dev after update.");
    assert(!commands.some((entry) => entry.command === "npm"), "Unchanged dependency manifests should skip npm.");
    assertNoDestructiveGit(commands);
  }

  {
    const fixture = createRepoFixture();
    advanceRemote(fixture, (repo) => write(path.join(repo, "feature.txt"), "one\n"), "remote update");
    write(path.join(fixture.local, "app.js"), "console.log('dirty');\n");
    const { updater, commands } = makeUpdater(fixture.local);
    const state = updater.update();
    assert.strictEqual(state.errorCode, "DEV_SOURCE_DIRTY_WORKTREE", "Dirty worktree should block update.");
    assert.strictEqual(fs.readFileSync(path.join(fixture.local, "app.js"), "utf8"), "console.log('dirty');\n", "Dirty file should remain unchanged.");
    assertNoDestructiveGit(commands);
  }

  {
    const fixture = createRepoFixture();
    advanceRemote(fixture, (repo) => write(path.join(repo, "feature.txt"), "one\n"), "remote update");
    fs.mkdirSync(path.join(fixture.local, "release-artifacts"));
    write(path.join(fixture.local, "release-artifacts/file.txt"), "keep\n");
    const { updater, commands } = makeUpdater(fixture.local);
    const state = updater.update();
    assert.strictEqual(state.errorCode, "DEV_SOURCE_DIRTY_WORKTREE", "Untracked files should block update by safe policy.");
    assert(fs.existsSync(path.join(fixture.local, "release-artifacts/file.txt")), "Untracked files must not be deleted.");
    assertNoDestructiveGit(commands);
  }

  {
    const fixture = createRepoFixture();
    advanceRemote(fixture, (repo) => write(path.join(repo, "remote.txt"), "remote\n"), "remote unique");
    write(path.join(fixture.local, "local.txt"), "local\n");
    commit(fixture.local, "local unique");
    const { updater, commands } = makeUpdater(fixture.local);
    const state = updater.update();
    assert.strictEqual(state.errorCode, "DEV_SOURCE_DIVERGED", "Diverged history should block update.");
    assertNoDestructiveGit(commands);
  }

  {
    const fixture = createRepoFixture();
    run("git", ["checkout", "-b", "feature/test"], fixture.local);
    const { updater } = makeUpdater(fixture.local);
    const state = updater.check({ fetch: false });
    assert.strictEqual(state.errorCode, "DEV_SOURCE_BRANCH_MISMATCH", "Wrong branch should be blocked.");
    assert.strictEqual(state.branch, "feature/test", "Current branch should be reported.");
  }

  {
    const fixture = createRepoFixture();
    advanceRemote(fixture, (repo) => write(path.join(repo, "package-lock.json"), JSON.stringify({ changed: true }, null, 2)), "app deps");
    const { updater, commands } = makeUpdater(fixture.local);
    const state = updater.update();
    assert.strictEqual(state.status, "restart-required", "Application dependency update should still complete.");
    assert(commands.some((entry) => entry.command === "npm" && entry.args.join(" ") === "ci"), "Application dependency changes should run npm ci.");
  }

  {
    const fixture = createRepoFixture();
    advanceRemote(fixture, (repo) => write(path.join(repo, "agent/package-lock.json"), JSON.stringify({ changed: true }, null, 2)), "agent deps");
    const { updater, commands } = makeUpdater(fixture.local);
    const state = updater.update();
    assert.strictEqual(state.status, "restart-required", "Agent dependency update should still complete.");
    assert(commands.some((entry) => entry.command === "npm" && entry.args.join(" ") === "--prefix agent ci"), "Agent dependency changes should run npm --prefix agent ci.");
  }

  {
    const fixture = createRepoFixture();
    advanceRemote(fixture, (repo) => write(path.join(repo, "app.js"), "function () {\n"), "invalid app");
    const { updater } = makeUpdater(fixture.local);
    const state = updater.update();
    assert.strictEqual(state.errorCode, "DEV_SOURCE_VALIDATION_FAILED", "Validation failure should be reported.");
  }

  {
    const fixture = createRepoFixture();
    const { updater, commands } = makeUpdater(fixture.local);
    const state = updater.restart();
    assert.strictEqual(state.restarted, true, "Restart should request relaunch in source mode.");
    assert(commands.some((entry) => entry.command === "relaunch"), "Relaunch should be invoked.");
    assert(commands.some((entry) => entry.command === "exit"), "Old process should exit after relaunch request.");
  }

  {
    const fixture = createRepoFixture();
    const { updater } = makeUpdater(fixture.local, { app: { isPackaged: true } });
    const state = updater.check({ fetch: false });
    assert.strictEqual(state.mode, "packaged-dev", "Packaged app should not use source updater.");
    assert.strictEqual(state.status, "unavailable", "Packaged mode should keep source update unavailable.");
  }
}

main()
  .then(() => console.log("Developer source update smoke checks passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
