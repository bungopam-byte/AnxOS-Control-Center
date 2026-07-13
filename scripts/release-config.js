#!/usr/bin/env node
const fs = require("fs");
const {
  buildReleaseInfo,
  getReleaseConfigPath,
  normalizeBuild,
  normalizeChannel,
  normalizeReleaseConfig,
  normalizeReleaseVersion,
  readReleaseConfig,
} = require("../src/shared/releaseConfig");

function writeReleaseConfig(config) {
  const normalized = normalizeReleaseConfig(config);
  fs.writeFileSync(getReleaseConfigPath(), `${JSON.stringify(normalized, null, 2)}\n`);
  return buildReleaseInfo(normalized);
}

function print(info) {
  console.log(`${info.versionLabel}`);
  console.log(`${info.buildLabel}`);
  console.log(info.channel);
}

function main() {
  const [command, value] = process.argv.slice(2);
  const current = readReleaseConfig();

  if (command === "build:increment") {
    print(writeReleaseConfig({ ...current, build: current.build + 1 }));
    return;
  }

  if (command === "version:set") {
    print(writeReleaseConfig({ ...current, version: normalizeReleaseVersion(value) }));
    return;
  }

  if (command === "channel:set") {
    print(writeReleaseConfig({ ...current, channel: normalizeChannel(value) }));
    return;
  }

  if (command === "build:set") {
    print(writeReleaseConfig({ ...current, build: normalizeBuild(value) }));
    return;
  }

  if (command === "print" || !command) {
    print(buildReleaseInfo(current));
    return;
  }

  console.error("Usage: node scripts/release-config.js <print|build:increment|build:set N|version:set X.Y|channel:set channel>");
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { writeReleaseConfig };
