const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const packageJson = require(path.join(rootDir, "package.json"));
const { OFFICIAL_SITE_ORIGIN } = require(path.join(rootDir, "src", "shared", "officialSite"));
const websiteConfigPath = path.join(rootDir, "website", "config.js");
const releaseNotesPath = path.join(rootDir, "website", "release-notes.json");
const repositoryUrl = "https://github.com/bungopam-byte/AnxOS-Control-Center";
const defaultDownloadBaseUrl = `${repositoryUrl}/releases/download/v${packageJson.version}`;
const downloadBaseUrl = (process.env.ANXOS_DOWNLOAD_BASE_URL || process.env.ANXOS_UPDATE_BASE_URL || process.env.ANXHUB_UPDATE_BASE_URL || defaultDownloadBaseUrl).replace(/\/+$/, "");

function formatBytes(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getAsset(name) {
  const filePath = path.join(distDir, name);
  return {
    fileName: name,
    size: fs.existsSync(filePath) ? formatBytes(fs.statSync(filePath).size) : "",
    url: `${downloadBaseUrl}/${encodeURIComponent(name)}`,
  };
}

function formatReleaseDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Edmonton",
  });
}

function readReleaseNotes() {
  if (!fs.existsSync(releaseNotesPath)) {
    return [];
  }

  try {
    const notes = JSON.parse(fs.readFileSync(releaseNotesPath, "utf8"));
    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    console.warn(`Could not read website/release-notes.json: ${error.message}`);
    return [];
  }
}

function getReleaseNotes() {
  const releaseDate = formatReleaseDate();
  const today = new Date().toISOString().slice(0, 10);
  const currentTag = `v${packageJson.version}`;
  const notes = readReleaseNotes().map((entry) => ({
    ...entry,
    url: entry.url || `${repositoryUrl}/releases/tag/${entry.tag || `v${entry.version}`}`,
  }));

  if (!notes.some((entry) => entry.version === packageJson.version || entry.tag === currentTag)) {
    notes.unshift({
      version: packageJson.version,
      tag: currentTag,
      date: releaseDate,
      datetime: today,
      title: `AnxOS ${currentTag}`,
      summary: "Latest AnxOS-Control-Center release.",
      changes: [
        "Updated application build, website metadata, and downloadable release assets.",
      ],
      url: `${repositoryUrl}/releases/tag/${currentTag}`,
    });
  }

  return notes;
}

const windows = getAsset(`AnxOS-Control-Center-Setup-${packageJson.version}.exe`);
const linuxDeb = getAsset(`AnxOS-Control-Center-${packageJson.version}.deb`);
const linuxAppImage = getAsset(`AnxOS-Control-Center-${packageJson.version}.AppImage`);
const releaseNotes = getReleaseNotes();

const config = `window.ANXOS_DOWNLOAD_CONFIG = {
  brandName: "AnxOS",
  appName: "AnxOS-Control-Center",
  subtitle: "A desktop control center for Minecraft servers, modpacks, remote nodes, and automation.",
  siteUrl: "${OFFICIAL_SITE_ORIGIN}",
  logoPath: "assets/anxos-logo.jpg",
  latestVersion: "${packageJson.version}",
  releaseDate: "${formatReleaseDate()}",
  releaseTag: "v${packageJson.version}",
  repositoryUrl: "${repositoryUrl}",
  releaseUrl: "${repositoryUrl}/releases/tag/v${packageJson.version}",
  downloads: {
    windows: {
      label: "Download for Windows",
      fileName: "${windows.fileName}",
      size: "${windows.size}",
      url: "${windows.url}",
    },
    linuxDeb: {
      label: "Linux .deb",
      fileName: "${linuxDeb.fileName}",
      size: "${linuxDeb.size}",
      url: "${linuxDeb.url}",
    },
    linuxAppImage: {
      label: "Linux AppImage",
      fileName: "${linuxAppImage.fileName}",
      size: "${linuxAppImage.size}",
      url: "${linuxAppImage.url}",
    },
  },
  releaseNotes: ${JSON.stringify(releaseNotes, null, 4).replace(/^/gm, "  ").trimStart()},
};
`;

fs.writeFileSync(websiteConfigPath, config);
console.log(`Updated website/config.js for v${packageJson.version}.`);
