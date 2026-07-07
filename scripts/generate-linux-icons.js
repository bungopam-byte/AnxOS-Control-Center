const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUTPUT_DIR = path.join(__dirname, "..", "assets", "icons", "png");
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];
const SCALE = 4;

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
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND"),
  ]);
}

function isInsideRoundedRect(x, y, size, radius) {
  const innerX = x >= radius && x <= size - radius;
  const innerY = y >= radius && y <= size - radius;
  if (innerX || innerY) {
    return true;
  }

  const cx = x < radius ? radius : size - radius;
  const cy = y < radius ? radius : size - radius;
  return ((x - cx) ** 2) + ((y - cy) ** 2) <= radius ** 2;
}

function isInsidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function setPixel(pixels, size, x, y, color) {
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function renderLarge(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const background = [16, 20, 31, 255];
  const transparent = [0, 0, 0, 0];
  const white = [248, 250, 252, 255];
  const cyan = [56, 189, 248, 255];
  const radius = size * (28 / 128);
  const aShape = [
    [32, 96], [62, 30], [74, 30], [104, 96],
    [88, 96], [82, 82], [54, 82], [48, 96],
  ].map(([x, y]) => [x * size / 128, y * size / 128]);
  const aCutout = [
    [59, 68], [77, 68], [68, 46],
  ].map(([x, y]) => [x * size / 128, y * size / 128]);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (!isInsideRoundedRect(cx, cy, size, radius)) {
        setPixel(pixels, size, x, y, transparent);
        continue;
      }

      let color = background;
      const topBar = cy >= size * (24 / 128) && cy <= size * (36 / 128) && cx >= size * (24 / 128) && cx <= size * (104 / 128);
      const bottomBar = cy >= size * (92 / 128) && cy <= size * (104 / 128) && cx >= size * (24 / 128) && cx <= size * (104 / 128);

      if (isInsidePolygon(cx, cy, aShape)) {
        color = white;
      }
      if (isInsidePolygon(cx, cy, aCutout)) {
        color = background;
      }
      if (topBar || bottomBar) {
        color = cyan;
      }

      setPixel(pixels, size, x, y, color);
    }
  }

  return pixels;
}

function downsample(source, sourceSize, size) {
  const pixels = Buffer.alloc(size * size * 4);
  const ratio = sourceSize / size;
  const samples = ratio * ratio;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const rgba = [0, 0, 0, 0];
      for (let sy = 0; sy < ratio; sy += 1) {
        for (let sx = 0; sx < ratio; sx += 1) {
          const offset = (((y * ratio + sy) * sourceSize) + (x * ratio + sx)) * 4;
          rgba[0] += source[offset];
          rgba[1] += source[offset + 1];
          rgba[2] += source[offset + 2];
          rgba[3] += source[offset + 3];
        }
      }
      setPixel(pixels, size, x, y, rgba.map((value) => Math.round(value / samples)));
    }
  }

  return pixels;
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const size of SIZES) {
  const sourceSize = size * SCALE;
  const pixels = downsample(renderLarge(sourceSize), sourceSize, size);
  fs.writeFileSync(path.join(OUTPUT_DIR, `${size}x${size}.png`), createPng(size, size, pixels));
}

console.log(`Generated Linux icons in ${OUTPUT_DIR}`);
