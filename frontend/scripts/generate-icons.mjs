import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

const colors = {
  transparent: [0, 0, 0, 0],
  amber: [245, 166, 35, 255],
  optimist: [57, 255, 106, 255],
  realist: [200, 214, 229, 255],
  pessimist: [255, 59, 59, 255],
};

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function blend(pixel, color, alpha) {
  const sourceAlpha = (color[3] / 255) * alpha;
  const targetAlpha = pixel[3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  if (outAlpha === 0) {
    return colors.transparent;
  }
  return [
    Math.round((color[0] * sourceAlpha + pixel[0] * targetAlpha * (1 - sourceAlpha)) / outAlpha),
    Math.round((color[1] * sourceAlpha + pixel[1] * targetAlpha * (1 - sourceAlpha)) / outAlpha),
    Math.round((color[2] * sourceAlpha + pixel[2] * targetAlpha * (1 - sourceAlpha)) / outAlpha),
    Math.round(outAlpha * 255),
  ];
}

function drawLine(pixels, size, a, b, width, color) {
  const radius = width / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = distanceToSegment(x + 0.5, y + 0.5, a[0], a[1], b[0], b[1]);
      const coverage = Math.max(0, Math.min(1, radius + 0.75 - distance));
      if (coverage > 0) {
        const offset = (y * size + x) * 4;
        const blended = blend([...pixels.slice(offset, offset + 4)], color, coverage);
        pixels.set(blended, offset);
      }
    }
  }
}

function drawCircle(pixels, size, center, radius, color) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x + 0.5 - center[0], y + 0.5 - center[1]);
      const coverage = Math.max(0, Math.min(1, radius + 0.75 - distance));
      if (coverage > 0) {
        const offset = (y * size + x) * 4;
        const blended = blend([...pixels.slice(offset, offset + 4)], color, coverage);
        pixels.set(blended, offset);
      }
    }
  }
}

function renderIcon(size) {
  const scale = size / 64;
  const pixels = Buffer.alloc(size * size * 4);
  const point = (x, y) => [x * scale, y * scale];
  const width = 6 * scale;

  drawLine(pixels, size, point(32, 52), point(32, 33), width, colors.amber);
  drawLine(pixels, size, point(32, 33), point(14, 16), width, colors.optimist);
  drawLine(pixels, size, point(32, 33), point(32, 10), width, colors.realist);
  drawLine(pixels, size, point(32, 33), point(50, 16), width, colors.pessimist);
  drawCircle(pixels, size, point(32, 33), 5.5 * scale, colors.amber);
  drawCircle(pixels, size, point(14, 16), 3.5 * scale, colors.optimist);
  drawCircle(pixels, size, point(32, 10), 3.5 * scale, colors.realist);
  drawCircle(pixels, size, point(50, 16), 3.5 * scale, colors.pessimist);

  return pixels;
}

function png(size) {
  const pixels = renderIcon(size);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function icoFromPng(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const directory = Buffer.alloc(16);
  directory[0] = size === 256 ? 0 : size;
  directory[1] = size === 256 ? 0 : size;
  directory[2] = 0;
  directory[3] = 0;
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(pngBuffer.length, 8);
  directory.writeUInt32LE(22, 12);
  return Buffer.concat([header, directory, pngBuffer]);
}

mkdirSync(publicDir, { recursive: true });
const faviconPng = png(32);
writeFileSync(resolve(publicDir, "favicon.ico"), icoFromPng(faviconPng, 32));
writeFileSync(resolve(publicDir, "apple-touch-icon.png"), png(180));
