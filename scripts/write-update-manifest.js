const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const packageJson = require(path.join(rootDir, "package.json"));
const baseUrl = (process.env.ANXHUB_UPDATE_BASE_URL || "http://192.168.1.134:8766").replace(/\/+$/, "");

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
  releaseUrl: `${baseUrl}/`,
  publishedAt: new Date().toISOString(),
  assets,
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "update-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote dist/update-manifest.json with ${assets.length} asset(s).`);
