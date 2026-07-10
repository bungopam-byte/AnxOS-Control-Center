const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const packageJson = require(path.join(rootDir, "package.json"));
const repositoryUrl = "https://github.com/bungopam-byte/AnxOS-Control-Center";
const defaultBaseUrl = `${repositoryUrl}/releases/download/v${packageJson.version}`;
const baseUrl = (process.env.ANXOS_UPDATE_BASE_URL || process.env.ANXHUB_UPDATE_BASE_URL || defaultBaseUrl).replace(/\/+$/, "");

const assetNames = [
  `AnxOS-Control-Center-Setup-${packageJson.version}.exe`,
  `AnxOS-Control-Center-${packageJson.version}.deb`,
  `AnxOS-Control-Center-${packageJson.version}.AppImage`,
  `AnxOS-Control-Center-${packageJson.version}-portable.exe`,
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
  version: packageJson.version,
  name: `v${packageJson.version}`,
  releaseUrl: `${repositoryUrl}/releases/tag/v${packageJson.version}`,
  publishedAt: new Date().toISOString(),
  assets,
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "update-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote dist/update-manifest.json with ${assets.length} asset(s).`);
