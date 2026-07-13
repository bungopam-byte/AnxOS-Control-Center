const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const { getReleaseInfo } = require(path.join(rootDir, "src", "shared", "releaseConfig"));
const repositoryUrl = "https://github.com/bungopam-byte/AnxOS-Control-Center-Releases";
const release = getReleaseInfo();
const defaultBaseUrl = `${repositoryUrl}/releases/download/${release.tag}`;
const baseUrl = (process.env.ANXOS_UPDATE_BASE_URL || process.env.ANXHUB_UPDATE_BASE_URL || defaultBaseUrl).replace(/\/+$/, "");

const assetNames = [
  `AnxOS-Control-Center-Setup-${release.artifactVersion}.exe`,
  `AnxOS-Control-Center-${release.artifactVersion}.deb`,
  `AnxOS-Control-Center-${release.artifactVersion}.AppImage`,
  `AnxOS-Control-Center-${release.artifactVersion}-portable.exe`,
];

const assets = assetNames
  .map((name) => {
    const filePath = path.join(distDir, name);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    return {
      name,
      size: fs.statSync(filePath).size,
      downloadUrl: `${baseUrl}/${encodeURIComponent(name)}`,
    };
  })
  .filter(Boolean);

const manifest = {
  version: release.version,
  build: release.build,
  channel: release.channel,
  releaseLabel: release.compactLabel,
  name: release.tag,
  releaseUrl: `${repositoryUrl}/releases/tag/${release.tag}`,
  publishedAt: new Date().toISOString(),
  assets,
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "update-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote dist/update-manifest.json with ${assets.length} asset(s).`);
