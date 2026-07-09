const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const options = {
    bump: "patch",
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
    } else if (arg === "--minor") {
      options.bump = "minor";
    } else if (arg === "--major") {
      options.bump = "major";
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function bumpVersion(version, bump) {
  const parts = String(version || "0.0.0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  while (parts.length < 3) parts.push(0);

  if (bump === "major") {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (bump === "minor") {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1;
  }

  return parts.slice(0, 3).join(".");
}

function updatePackageVersions(version) {
  const packagePath = path.join(rootDir, "package.json");
  const lockPath = path.join(rootDir, "package-lock.json");
  const packageJson = readJson(packagePath);
  const lockJson = readJson(lockPath);

  packageJson.version = version;
  lockJson.version = version;
  if (lockJson.packages?.[""]) {
    lockJson.packages[""].version = version;
  }

  writeJson(packagePath, packageJson);
  writeJson(lockPath, lockJson);
}

function getPackageVersion() {
  return readJson(path.join(rootDir, "package.json")).version;
}

function getReleaseAssets(version) {
  const distDir = path.join(rootDir, "dist");
  return [
    `AnxOS-Control-Center-Setup-${version}.exe`,
    `AnxOS-Control-Center-${version}-portable.exe`,
    `AnxOS-Control-Center-${version}.deb`,
    `AnxOS-Control-Center-${version}.AppImage`,
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
  const currentVersion = getPackageVersion();
  const nextVersion = bumpVersion(currentVersion, options.bump);
  const tagName = `v${nextVersion}`;
  const message = options.message || `chore: release ${tagName}`;

  console.log(`Preparing ${tagName} from ${currentVersion}.`);
  updatePackageVersions(nextVersion);

  run("npm", ["run", "marketplace:smoke"]);

  if (options.build) {
    run("npm", ["run", "dist:win:installer"]);
    run("npm", ["run", "dist:linux"]);
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
    const assets = getReleaseAssets(nextVersion);
    if (assets.length === 0) {
      console.warn("No release assets found for GitHub release upload.");
      return;
    }
    run("gh", ["release", "create", tagName, ...assets, "--title", tagName, "--notes", message, "--latest"]);
  }
}

main();
