const fs = require("fs");
const path = require("path");

const DEFAULT_RELEASE = {
  version: "1.7",
  build: 142,
  channel: "Private Alpha",
};

const CHANNELS = {
  development: "Development",
  "private-alpha": "Private Alpha",
  privatealpha: "Private Alpha",
  "public-alpha": "Public Alpha",
  publicalpha: "Public Alpha",
  alpha: "Public Alpha",
  beta: "Beta",
  "release-candidate": "Release Candidate",
  rc: "Release Candidate",
  stable: "Stable",
};

function getReleaseConfigPath() {
  return path.join(__dirname, "..", "..", "release.json");
}

function normalizeChannel(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_RELEASE.channel;
  const key = raw.toLowerCase().replace(/[\s_]+/g, "-");
  return CHANNELS[key] || raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeReleaseVersion(value) {
  const version = String(value || "").trim().replace(/^v/i, "");
  if (!/^\d+\.\d+$/.test(version)) {
    throw new Error(`Release version must use major.minor format, received "${value}".`);
  }
  return version;
}

function normalizeBuild(value) {
  const build = Number.parseInt(value, 10);
  if (!Number.isInteger(build) || build < 0) {
    throw new Error(`Release build must be a non-negative integer, received "${value}".`);
  }
  return build;
}

function normalizeReleaseConfig(input = {}) {
  const release = { ...DEFAULT_RELEASE, ...(input && typeof input === "object" ? input : {}) };
  return {
    version: normalizeReleaseVersion(release.version),
    build: normalizeBuild(release.build),
    channel: normalizeChannel(release.channel),
  };
}

function readReleaseConfig() {
  try {
    return normalizeReleaseConfig(JSON.parse(fs.readFileSync(getReleaseConfigPath(), "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return { ...DEFAULT_RELEASE };
    throw error;
  }
}

function buildReleaseInfo(config = readReleaseConfig()) {
  const release = normalizeReleaseConfig(config);
  return {
    ...release,
    versionLabel: `Version ${release.version}`,
    buildLabel: `Build ${release.build}`,
    displayName: `Version ${release.version}\nBuild ${release.build}\n${release.channel}`,
    compactLabel: `Version ${release.version} Build ${release.build} ${release.channel}`,
    artifactVersion: `${release.version}-build${release.build}`,
    tag: `v${release.version}-build${release.build}`,
  };
}

function getReleaseInfo() {
  return buildReleaseInfo(readReleaseConfig());
}

module.exports = {
  CHANNELS,
  buildReleaseInfo,
  getReleaseConfigPath,
  getReleaseInfo,
  normalizeBuild,
  normalizeChannel,
  normalizeReleaseConfig,
  normalizeReleaseVersion,
  readReleaseConfig,
};
