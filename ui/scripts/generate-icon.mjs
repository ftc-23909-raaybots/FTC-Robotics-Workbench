import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const iconDirectory = path.resolve(directory, "..", "assets");
const dimensions = [16, 24, 32, 48, 64, 128, 256];
const layers = [];

function makePixels(size) {
  const pixels = Buffer.alloc(size * size * 4);

  function rectangle(left, top, right, bottom, color) {
    const x0 = Math.round(left);
    const y0 = Math.round(top);
    const x1 = Math.round(right);
    const y1 = Math.round(bottom);
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const offset = (y * size + x) * 4;
        pixels[offset] = color[2];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[0];
        pixels[offset + 3] = 255;
      }
    }
  }

  const scale = size / 256;
  const background = [21, 31, 39];
  const signal = [105, 211, 189];
  rectangle(0, 0, size, size, background);
  rectangle(
    Math.round(27 * scale),
    Math.round(27 * scale),
    Math.round(229 * scale),
    Math.round(229 * scale),
    [42, 61, 69],
  );
  rectangle(54 * scale, 157 * scale, 83 * scale, 202 * scale, signal);
  rectangle(96 * scale, 113 * scale, 125 * scale, 202 * scale, signal);
  rectangle(138 * scale, 77 * scale, 167 * scale, 202 * scale, signal);
  rectangle(180 * scale, 128 * scale, 207 * scale, 202 * scale, signal);
  rectangle(51 * scale, 211 * scale, 210 * scale, 220 * scale, [231, 183, 98]);
  return pixels;
}

function makeBitmap(size) {
  const pixels = makePixels(size);
  const pixelBytes = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const sourceStart = y * size * 4;
    const targetStart = (size - y - 1) * size * 4;
    pixels.copy(pixelBytes, targetStart, sourceStart, sourceStart + size * 4);
  }

  const maskRowBytes = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskRowBytes * size);
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(pixelBytes.length + mask.length, 20);
  return Buffer.concat([header, pixelBytes, mask]);
}

await mkdir(iconDirectory, { recursive: true });
let offset = 6 + dimensions.length * 16;
for (const size of dimensions) {
  const bitmap = makeBitmap(size);
  layers.push({ size, offset, bitmap });
  offset += bitmap.length;
}

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(layers.length, 4);

const entries = layers.map(({ size, offset: imageOffset, bitmap }) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(bitmap.length, 8);
  entry.writeUInt32LE(imageOffset, 12);
  return entry;
});

await writeFile(path.join(iconDirectory, "app-icon.ico"), Buffer.concat([
  header,
  ...entries,
  ...layers.map(({ bitmap }) => bitmap),
]));
console.log(`Generated ${path.join(iconDirectory, "app-icon.ico")}`);
