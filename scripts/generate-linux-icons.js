const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");
const REFERENCE_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(REPO_ROOT, "assets", "branding", "neon-core-reference.jpg");
const APP_ICON_DIR = path.join(REPO_ROOT, "assets", "icons", "png");
const WEBSITE_ASSET_DIR = path.join(REPO_ROOT, "website", "assets");
const SRC_ASSET_DIR = path.join(REPO_ROOT, "src", "assets");
const APP_ICON_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const FAVICON_SIZES = [16, 32, 48, 192, 512];

const APP_CROP = { x: 66, y: 86, size: 638 };
const CIRCLE_CROP = { x: 747, y: 913, size: 320 };

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createPng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND"),
  ]);
}

function runFfmpeg(args, label) {
  const result = spawnSync("ffmpeg", args, { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString("utf8") : "";
    throw new Error(`ffmpeg failed while generating ${label}: ${stderr}`);
  }
  return result.stdout;
}

function cropRaw(crop, size) {
  return runFfmpeg([
    "-v", "error",
    "-i", REFERENCE_PATH,
    "-vf", `crop=${crop.size}:${crop.size}:${crop.x}:${crop.y},scale=${size}:${size}:flags=lanczos`,
    "-f", "rawvideo",
    "-pix_fmt", "rgba",
    "pipe:1",
  ], `${size}x${size} crop`);
}

function alphaForRoundedRect(x, y, size, radius, feather) {
  const px = x + 0.5;
  const py = y + 0.5;
  const cx = Math.max(radius, Math.min(size - radius, px));
  const cy = Math.max(radius, Math.min(size - radius, py));
  const distance = Math.hypot(px - cx, py - cy) - radius;
  if (distance <= -feather) return 255;
  if (distance >= feather) return 0;
  return Math.round((1 - ((distance + feather) / (feather * 2))) * 255);
}

function alphaForCircle(x, y, size, feather) {
  const center = size / 2;
  const radius = (size / 2) - feather;
  const distance = Math.hypot((x + 0.5) - center, (y + 0.5) - center) - radius;
  if (distance <= -feather) return 255;
  if (distance >= feather) return 0;
  return Math.round((1 - (distance / feather)) * 255);
}

function applyMask(pixels, size, mask) {
  const output = Buffer.from(pixels);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      output[offset + 3] = Math.round((output[offset + 3] * mask(x, y)) / 255);
    }
  }
  return output;
}

function makeAppPng(size) {
  const raw = cropRaw(APP_CROP, size);
  const radius = size * 0.155;
  const feather = Math.max(1, size * 0.006);
  const masked = applyMask(raw, size, (x, y) => alphaForRoundedRect(x, y, size, radius, feather));
  return createPng(size, size, masked);
}

function makeCirclePng(size) {
  const raw = cropRaw(CIRCLE_CROP, size);
  const feather = Math.max(1, size * 0.008);
  const masked = applyMask(raw, size, (x, y) => alphaForCircle(x, y, size, feather));
  return createPng(size, size, masked);
}

function pngToIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + (entries.length * 16);
  const directories = [];
  for (const entry of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = entry.size >= 256 ? 0 : entry.size;
    dir[1] = entry.size >= 256 ? 0 : entry.size;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(entry.png.length, 8);
    dir.writeUInt32LE(offset, 12);
    directories.push(dir);
    offset += entry.png.length;
  }

  return Buffer.concat([header, ...directories, ...entries.map((entry) => entry.png)]);
}

function createOpenGraphImage(appIconPath, outputPath) {
  runFfmpeg([
    "-v", "error",
    "-f", "lavfi",
    "-i", "color=c=0x02030b:s=1200x630",
    "-i", appIconPath,
    "-filter_complex",
    [
      "[1:v]scale=390:390:flags=lanczos[icon]",
      "[0:v][icon]overlay=405:55",
      "drawtext=text='ANXOS':fontcolor=white:fontsize=82:x=(w-text_w)/2:y=468",
      "drawtext=text='CONTROL CENTER':fontcolor=0xb66cff:fontsize=30:x=(w-text_w)/2:y=552",
    ].join(","),
    "-frames:v", "1",
    "-y",
    outputPath,
  ], "Open Graph image");
}

function writeSvgFromPng(pngPath, svgPath) {
  const data = fs.readFileSync(pngPath).toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="AnxOS"><image width="512" height="512" href="data:image/png;base64,${data}"/></svg>\n`;
  fs.writeFileSync(svgPath, svg);
}

if (!fs.existsSync(REFERENCE_PATH)) {
  throw new Error(`Branding reference image not found: ${REFERENCE_PATH}`);
}

fs.mkdirSync(APP_ICON_DIR, { recursive: true });
fs.mkdirSync(WEBSITE_ASSET_DIR, { recursive: true });
fs.mkdirSync(SRC_ASSET_DIR, { recursive: true });

const appPngs = new Map();
for (const size of APP_ICON_SIZES) {
  const png = makeAppPng(size);
  appPngs.set(size, png);
  fs.writeFileSync(path.join(APP_ICON_DIR, `${size}x${size}.png`), png);
}

fs.writeFileSync(path.join(REPO_ROOT, "assets", "icon.ico"), pngToIco(
  [16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: appPngs.get(size) })),
));
fs.writeFileSync(path.join(SRC_ASSET_DIR, "anxos-logo.png"), appPngs.get(512));
fs.writeFileSync(path.join(WEBSITE_ASSET_DIR, "anxos-logo.png"), appPngs.get(512));

const faviconPngs = new Map();
for (const size of FAVICON_SIZES) {
  faviconPngs.set(size, makeCirclePng(size));
}

fs.writeFileSync(path.join(WEBSITE_ASSET_DIR, "favicon-16.png"), faviconPngs.get(16));
fs.writeFileSync(path.join(WEBSITE_ASSET_DIR, "favicon-32.png"), faviconPngs.get(32));
fs.writeFileSync(path.join(WEBSITE_ASSET_DIR, "icon-192.png"), faviconPngs.get(192));
fs.writeFileSync(path.join(WEBSITE_ASSET_DIR, "icon-512.png"), faviconPngs.get(512));
fs.writeFileSync(path.join(WEBSITE_ASSET_DIR, "apple-touch-icon.png"), appPngs.get(256));
fs.writeFileSync(path.join(REPO_ROOT, "website", "favicon.ico"), pngToIco(
  [16, 32, 48].map((size) => ({ size, png: faviconPngs.get(size) })),
));
writeSvgFromPng(path.join(WEBSITE_ASSET_DIR, "icon-512.png"), path.join(WEBSITE_ASSET_DIR, "favicon.svg"));
createOpenGraphImage(path.join(APP_ICON_DIR, "512x512.png"), path.join(WEBSITE_ASSET_DIR, "social-preview.png"));

console.log(`Generated Neon Core assets from ${REFERENCE_PATH}`);
