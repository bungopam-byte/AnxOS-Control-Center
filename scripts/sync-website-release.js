const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const packageJson = require(path.join(rootDir, "package.json"));
const websiteConfigPath = path.join(rootDir, "website", "config.js");
const repositoryUrl = "https://github.com/bungopam-byte/AnxOS-Control-Center";

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
    url: `${repositoryUrl}/releases/download/v${packageJson.version}/${encodeURIComponent(name)}`,
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

const windows = getAsset(`AnxOS-Control-Center-Setup-${packageJson.version}.exe`);
const linuxDeb = getAsset(`AnxOS-Control-Center-${packageJson.version}.deb`);
const linuxAppImage = getAsset(`AnxOS-Control-Center-${packageJson.version}.AppImage`);

const config = `window.ANXOS_DOWNLOAD_CONFIG = {
  brandName: "AnxOS",
  appName: "AnxOS-Control-Center",
  subtitle: "A desktop control center for Minecraft servers, modpacks, remote nodes, and automation.",
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
};
`;

fs.writeFileSync(websiteConfigPath, config);
console.log(`Updated website/config.js for v${packageJson.version}.`);
