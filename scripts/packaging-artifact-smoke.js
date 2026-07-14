#!/usr/bin/env node
const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const asar = require("@electron/asar");
const { buildReleaseInfo, readReleaseConfig } = require("../src/shared/releaseConfig");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const releaseConfig = readReleaseConfig();
const releaseInfo = buildReleaseInfo(releaseConfig);
const artifactVersion = releaseInfo.artifactVersion;

const platformTargets = {
  win: {
    artifacts: [
      `AnxOS-Control-Center-Setup-${artifactVersion}.exe`,
      `AnxOS-Control-Center-${artifactVersion}-portable.exe`,
    ],
    asarArchives: [path.join(distDir, "win-unpacked", "resources", "app.asar")],
    requiredPaths: [
      path.join(distDir, "win-unpacked", "AnxOS Control Center.exe"),
      path.join(distDir, "win-unpacked", "resources", "app.asar.unpacked"),
      path.join(distDir, "win-unpacked", "resources", "local-agent-runtime", "agent", "package.json"),
      path.join(distDir, "win-unpacked", "resources", "local-agent-runtime", "agent", "src", "server.js"),
      path.join(distDir, "win-unpacked", "resources", "local-agent-runtime", "config", "agent.example.json"),
      path.join(distDir, "win-unpacked", "resources", "local-agent-runtime", "config", "marketplace-templates.json"),
      path.join(distDir, "win-unpacked", "resources", "local-agent-runtime", "local-agent-runtime.json"),
    ],
  },
  linux: {
    artifacts: [
      `AnxOS-Control-Center-${artifactVersion}.AppImage`,
      `AnxOS-Control-Center-${artifactVersion}.deb`,
    ],
    asarArchives: [path.join(distDir, "linux-unpacked", "resources", "app.asar")],
    requiredPaths: [
      path.join(distDir, "linux-unpacked", "anxos-control-center"),
      path.join(distDir, "linux-unpacked", "resources", "app.asar.unpacked"),
      path.join(distDir, "linux-unpacked", "resources", "local-agent-runtime", "agent", "package.json"),
      path.join(distDir, "linux-unpacked", "resources", "local-agent-runtime", "agent", "src", "server.js"),
      path.join(distDir, "linux-unpacked", "resources", "local-agent-runtime", "config", "agent.example.json"),
      path.join(distDir, "linux-unpacked", "resources", "local-agent-runtime", "config", "marketplace-templates.json"),
      path.join(distDir, "linux-unpacked", "resources", "local-agent-runtime", "local-agent-runtime.json"),
    ],
  },
};

function parseTargets() {
  const platformArg = process.argv.find((arg) => arg.startsWith("--platform="));
  const raw = (platformArg ? platformArg.slice("--platform=".length) : process.env.ANXOS_PACKAGING_SMOKE_TARGETS || "win,linux")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const targets = raw.map((entry) => entry === "windows" ? "win" : entry);
  for (const target of targets) {
    assert(platformTargets[target], `Unknown packaging smoke platform target: ${target}`);
  }
  return [...new Set(targets)];
}

const selectedTargets = parseTargets();
const selectedTargetConfigs = selectedTargets.map((target) => platformTargets[target]);

const requiredEntries = [
  "/main.js",
  "/preload.js",
  "/app.js",
  "/index.html",
  "/release.json",
  "/release-build.json",
  "/assets/icon.ico",
  "/assets/icons/png/512x512.png",
  "/config/ssh-profiles.json",
  "/src/shared/redaction.js",
  "/src/shared/structuredLogger.js",
  "/src/shared/releaseConfig.js",
];

const forbiddenEntries = [
  "/agent/.env",
  "/agent/agent.log",
  "/agent/config/device-identity.json",
  "/config/agent.json",
  "/config/application-host.json",
  "/config/device-identity.json",
  "/config/marketplace.json",
  "/config/nodes.json",
  "/config/owner-accounts.json",
];

const forbiddenRuntimeNames = new Set([
  ".env",
  ".git",
  "agent.log",
  "device-identity.json",
  "application-host.json",
  "nodes.json",
  "owner-accounts.json",
]);

function walkFiles(directory) {
  const entries = [];
  if (!fs.existsSync(directory)) return entries;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    entries.push(entryPath);
    if (entry.isDirectory()) {
      entries.push(...walkFiles(entryPath));
    }
  }
  return entries;
}

for (const artifact of selectedTargetConfigs.flatMap((target) => target.artifacts)) {
  const artifactPath = path.join(distDir, artifact);
  assert(fs.existsSync(artifactPath), `Missing packaged artifact: ${artifact}`);
  assert(fs.statSync(artifactPath).size > 1024 * 1024, `Packaged artifact is unexpectedly small: ${artifact}`);
}

for (const archivePath of selectedTargetConfigs.flatMap((target) => target.asarArchives)) {
  assert(fs.existsSync(archivePath), `Missing app.asar: ${path.relative(rootDir, archivePath)}`);
  const entries = new Set(asar.listPackage(archivePath));

  for (const entry of requiredEntries) {
    assert(entries.has(entry), `${path.relative(rootDir, archivePath)} is missing ${entry}`);
  }

  for (const entry of forbiddenEntries) {
    assert(!entries.has(entry), `${path.relative(rootDir, archivePath)} must not include runtime file ${entry}`);
  }

  const release = JSON.parse(asar.extractFile(archivePath, "release.json").toString("utf8"));
  assert.strictEqual(release.version, releaseConfig.version, `${path.relative(rootDir, archivePath)} has unexpected release version`);
  assert.strictEqual(release.build, releaseConfig.build, `${path.relative(rootDir, archivePath)} has unexpected build number`);
  assert.strictEqual(release.channel, releaseConfig.channel, `${path.relative(rootDir, archivePath)} has unexpected release channel`);

  const buildMetadata = JSON.parse(asar.extractFile(archivePath, "release-build.json").toString("utf8"));
  assert.strictEqual(buildMetadata.version, releaseConfig.version, `${path.relative(rootDir, archivePath)} has unexpected release metadata version`);
  assert.strictEqual(buildMetadata.build, releaseConfig.build, `${path.relative(rootDir, archivePath)} has unexpected release metadata build`);
  assert.strictEqual(buildMetadata.channel, releaseConfig.channel, `${path.relative(rootDir, archivePath)} has unexpected release metadata channel`);
  assert(buildMetadata.buildDate, `${path.relative(rootDir, archivePath)} release metadata must include a build date`);
  assert(buildMetadata.gitCommit, `${path.relative(rootDir, archivePath)} release metadata must include a git commit`);
  assert.strictEqual(buildMetadata.releaseRepository?.repo, "AnxOS-Control-Center-Releases", `${path.relative(rootDir, archivePath)} release metadata must use the public release repository`);
}

for (const requiredPath of selectedTargetConfigs.flatMap((target) => target.requiredPaths)) {
  assert(fs.existsSync(requiredPath), `Missing packaged path: ${path.relative(rootDir, requiredPath)}`);
}

for (const target of selectedTargets) {
  const resourcesDir = target === "win"
    ? path.join(distDir, "win-unpacked", "resources")
    : path.join(distDir, "linux-unpacked", "resources");
  const runtimeRoot = path.join(resourcesDir, "local-agent-runtime");
  if (!fs.existsSync(runtimeRoot)) continue;
  for (const entryPath of walkFiles(runtimeRoot)) {
    const name = path.basename(entryPath);
    assert(!forbiddenRuntimeNames.has(name), `Local Agent runtime must not include ${path.relative(rootDir, entryPath)}`);
    assert(!entryPath.endsWith(".map"), `Local Agent runtime must not include source maps: ${path.relative(rootDir, entryPath)}`);
  }
}

const linuxResources = path.join(distDir, "linux-unpacked", "resources");
if (fs.existsSync(linuxResources)) {
  assert((fs.statSync(linuxResources).mode & 0o755) === 0o755, "Linux resources directory must be readable and traversable after packaging.");
  assert((fs.statSync(path.join(linuxResources, "app.asar")).mode & 0o644) === 0o644, "Linux app.asar must be readable after installation.");
  assert((fs.statSync(path.join(linuxResources, "app.asar.unpacked")).mode & 0o755) === 0o755, "Linux app.asar.unpacked must be readable and traversable after packaging.");
}

const debPath = path.join(distDir, `AnxOS-Control-Center-${artifactVersion}.deb`);
const dpkgDeb = selectedTargets.includes("linux") && fs.existsSync(debPath)
  ? spawnSync("dpkg-deb", ["--contents", debPath], { encoding: "utf8" })
  : { status: null };
if (dpkgDeb.status === 0) {
  const contents = dpkgDeb.stdout;
  assert(/-rw-r--r--\s+0\/0\s+\d+.*\/usr\/share\/applications\/anxos-control-center\.desktop/.test(contents), "Linux desktop entry must install with world-readable permissions.");
  assert(/-rw-r--r--\s+0\/0\s+\d+.*\/opt\/AnxOS Control Center\/resources\/app\.asar/.test(contents), "Linux app.asar must install with world-readable permissions.");
  assert(/drwxr-xr-x\s+0\/0\s+0.*\/opt\/AnxOS Control Center\/resources\/app\.asar\.unpacked\//.test(contents), "Linux unpacked resources must install with traversable directory permissions.");
}

console.log(`Packaging artifact smoke passed for ${artifactVersion} (${selectedTargets.join(", ")}).`);
