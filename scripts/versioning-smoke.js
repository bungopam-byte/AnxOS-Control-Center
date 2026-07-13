const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJson = require("../package.json");
const {
  buildReleaseInfo,
  normalizeBuild,
  normalizeChannel,
  normalizeReleaseVersion,
  readReleaseConfig,
} = require("../src/shared/releaseConfig");
const {
  compareReleaseBuilds,
  extractReleaseBuild,
  parseWebsiteConfigRelease,
} = require("../src/services/updateManager");

const release = buildReleaseInfo(readReleaseConfig());
const packageSource = fs.readFileSync(path.join(root, "package.json"), "utf8");
const diagnosticsSource = fs.readFileSync(path.join(root, "src", "services", "diagnosticsService.js"), "utf8");
const mainSource = fs.readFileSync(path.join(root, "main.js"), "utf8");
const websiteConfig = fs.readFileSync(path.join(root, "website", "config.js"), "utf8");
const websiteNotes = JSON.parse(fs.readFileSync(path.join(root, "website", "release-notes.json"), "utf8"));

assert(/^\d+\.\d+\.\d+$/.test(packageJson.version), "package.json must keep an internal SemVer-compatible version.");
assert.strictEqual(normalizeReleaseVersion(release.version), release.version, "Public release version must use major.minor format.");
assert.strictEqual(normalizeBuild(release.build), release.build, "Build must parse as a non-negative integer.");
assert.strictEqual(normalizeChannel("beta"), "Beta", "Channel aliases must normalize for release commands.");
assert(!/^\d+\.\d+\.\d+$/.test(release.version), "Public release version must not be three-number SemVer.");

assert(compareReleaseBuilds({ version: "1.7", build: 143 }, { version: "1.7", build: 142 }) > 0, "Updater must detect newer builds in the same public version.");
assert(compareReleaseBuilds({ version: "1.8", build: 150 }, { version: "1.7", build: 999 }) > 0, "Updater must detect newer public versions.");
assert.strictEqual(extractReleaseBuild("v1.7-build143"), 143, "Updater must parse build numbers from release tags.");

const parsedWebsiteRelease = parseWebsiteConfigRelease(websiteConfig, "https://anxoscontrolcenter.org/config.js");
assert.strictEqual(parsedWebsiteRelease.version, release.version, "Website config must expose the centralized public version.");
assert.strictEqual(parsedWebsiteRelease.build, release.build, "Website config must expose the centralized build number.");
assert.strictEqual(parsedWebsiteRelease.channel, release.channel, "Website config must expose the centralized channel.");

assert(packageSource.includes("ANXOS_RELEASE_ARTIFACT_VERSION"), "Installer artifact naming must use the public release artifact label.");
assert(packageSource.includes("scripts/run-electron-builder.js"), "Packaged build scripts must go through the build increment wrapper.");
assert(diagnosticsSource.includes("getReleaseInfo") && diagnosticsSource.includes("packageVersion"), "Diagnostics must include public release info and keep internal package version secondary.");
assert(mainSource.includes("releaseLabel") && mainSource.includes("packageVersion"), "Runtime info must expose public release fields and internal package version.");
assert(websiteConfig.includes(`latestVersion: "${release.version}"`) && websiteConfig.includes(`build: "${release.build}"`) && websiteConfig.includes(`channel: "${release.channel}"`), "Website download metadata must display the public release model.");
assert(!websiteConfig.includes("packageVersion"), "Website public metadata must not expose the internal package SemVer.");
assert(websiteNotes.some((entry) => entry.version === release.version && Number(entry.build) === release.build && entry.channel === release.channel), "Website release notes must include the current public version/build/channel.");

console.log("Versioning smoke checks passed.");
