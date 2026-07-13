const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const {
  buildReleaseInfo,
  getReleaseConfigPath,
  normalizeChannel,
  normalizeReleaseConfig,
  normalizeReleaseVersion,
  readReleaseConfig,
} = require("../src/shared/releaseConfig");

const rootDir = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const options = {
    version: "",
    channel: "",
    message: "",
    push: true,
    tag: true,
    build: true,
    githubRelease: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--message" || arg === "-m") {
      options.message = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--version") {
      options.version = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--channel") {
      options.channel = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--no-push") {
      options.push = false;
    } else if (arg === "--no-tag") {
      options.tag = false;
    } else if (arg === "--no-build") {
      options.build = false;
    } else if (arg === "--github-release") {
      options.githubRelease = true;
    }
  }

  return options;
}

function run(command, args, options = {}) {
  console.log(`\n> ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeReleaseConfig(config) {
  const normalized = normalizeReleaseConfig(config);
  writeJson(getReleaseConfigPath(), normalized);
  return buildReleaseInfo(normalized);
}

function getReleaseAssets(release) {
  const distDir = path.join(rootDir, "dist");
  return [
    `AnxOS-Control-Center-Setup-${release.artifactVersion}.exe`,
    `AnxOS-Control-Center-${release.artifactVersion}-portable.exe`,
    `AnxOS-Control-Center-${release.artifactVersion}.deb`,
    `AnxOS-Control-Center-${release.artifactVersion}.AppImage`,
  ]
    .map((name) => path.join(distDir, name))
    .filter((filePath) => fs.existsSync(filePath));
}

function hasChanges() {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return Boolean(result.stdout.trim());
}

function restoreTrackedBuildOutputs() {
  const trackedBuildOutputs = [
    "dist/linux-unpacked/resources/app.asar",
  ];

  for (const filePath of trackedBuildOutputs) {
    const tracked = spawnSync("git", ["ls-files", "--error-unmatch", filePath], {
      cwd: rootDir,
      stdio: "ignore",
    });
    if (tracked.status === 0) {
      run("git", ["restore", filePath]);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const current = readReleaseConfig();
  const next = {
    ...current,
    version: options.version ? normalizeReleaseVersion(options.version) : current.version,
    channel: options.channel ? normalizeChannel(options.channel) : current.channel,
    build: current.build + 1,
  };
  const release = writeReleaseConfig(next);
  const tagName = release.tag;
  const message = options.message || `chore: release ${tagName}`;

  console.log(`Preparing ${release.compactLabel} from ${buildReleaseInfo(current).compactLabel}.`);

  run("npm", ["run", "marketplace:smoke"]);

  if (options.build) {
    run("npm", ["run", "dist:win:installer", "--", "--no-increment-build"]);
    run("npm", ["run", "dist:win:portable", "--", "--no-increment-build"]);
    run("npm", ["run", "dist:linux", "--", "--no-increment-build"]);
  }

  run("npm", ["run", "updates:manifest"]);
  restoreTrackedBuildOutputs();

  if (!hasChanges()) {
    console.log("No source changes to commit.");
    return;
  }

  run("git", ["add", "-A"]);
  run("git", ["commit", "-m", message]);

  if (options.tag) {
    run("git", ["tag", tagName]);
  }

  if (options.push) {
    const branch = spawnSync("git", ["branch", "--show-current"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }).stdout.trim();
    run("git", ["push", "origin", branch]);
    if (options.tag) {
      run("git", ["push", "origin", tagName]);
    }
  }

  if (options.githubRelease) {
    const assets = getReleaseAssets(release);
    if (assets.length === 0) {
      console.warn("No release assets found for GitHub release upload.");
      return;
    }
    run("gh", ["release", "create", tagName, ...assets, "--title", tagName, "--notes", message, "--latest"]);
  }
}

main();
