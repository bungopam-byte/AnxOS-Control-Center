#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const asar = require("@electron/asar");
const { buildReleaseInfo, readReleaseConfig } = require("../src/shared/releaseConfig");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const releaseConfig = readReleaseConfig();
const releaseInfo = buildReleaseInfo(releaseConfig);
const artifactVersion = releaseInfo.artifactVersion;

const artifacts = [
  `AnxOS-Control-Center-Setup-${artifactVersion}.exe`,
  `AnxOS-Control-Center-${artifactVersion}-portable.exe`,
  `AnxOS-Control-Center-${artifactVersion}.AppImage`,
  `AnxOS-Control-Center-${artifactVersion}.deb`,
];

const asarArchives = [
  path.join(distDir, "win-unpacked", "resources", "app.asar"),
  path.join(distDir, "linux-unpacked", "resources", "app.asar"),
];

const requiredEntries = [
  "/main.js",
  "/preload.js",
  "/app.js",
  "/index.html",
  "/release.json",
  "/assets/icon.ico",
  "/assets/icons/png/512x512.png",
  "/config/agent.example.json",
  "/config/marketplace-templates.json",
  "/config/ssh-profiles.json",
  "/agent/package.json",
  "/agent/src/server.js",
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

for (const artifact of artifacts) {
  const artifactPath = path.join(distDir, artifact);
  assert(fs.existsSync(artifactPath), `Missing packaged artifact: ${artifact}`);
  assert(fs.statSync(artifactPath).size > 1024 * 1024, `Packaged artifact is unexpectedly small: ${artifact}`);
}

for (const archivePath of asarArchives) {
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
}

assert(fs.existsSync(path.join(distDir, "win-unpacked", "AnxOS Control Center.exe")), "Missing Windows unpacked executable");
assert(fs.existsSync(path.join(distDir, "linux-unpacked", "anxos-control-center")), "Missing Linux unpacked executable");
assert(fs.existsSync(path.join(distDir, "win-unpacked", "resources", "app.asar.unpacked")), "Missing Windows app.asar.unpacked");
assert(fs.existsSync(path.join(distDir, "linux-unpacked", "resources", "app.asar.unpacked")), "Missing Linux app.asar.unpacked");

console.log(`Packaging artifact smoke passed for ${artifactVersion}.`);
