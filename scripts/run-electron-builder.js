#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const {
  buildReleaseInfo,
  getReleaseConfigPath,
  normalizeReleaseConfig,
  readReleaseConfig,
} = require("../src/shared/releaseConfig");

const args = process.argv.slice(2);
const increment = !args.includes("--no-increment-build");
const builderArgs = args.filter((arg) => arg !== "--no-increment-build");
const release = readReleaseConfig();
const nextRelease = increment ? { ...release, build: release.build + 1 } : release;

if (increment) {
  fs.writeFileSync(getReleaseConfigPath(), `${JSON.stringify(normalizeReleaseConfig(nextRelease), null, 2)}\n`);
}

const info = buildReleaseInfo(nextRelease);
console.log(`Packaging AnxOS Control Center ${info.compactLabel}`);

const result = spawnSync(
  process.platform === "win32" ? "electron-builder.cmd" : "electron-builder",
  builderArgs,
  {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ANXOS_RELEASE_ARTIFACT_VERSION: info.artifactVersion,
    },
  },
);

process.exit(result.status || 0);
