// Regenerates icons/icon{16,48,128}.png from scratch (no dependencies —
// encodes PNGs by hand via zlib) so the icon art is reproducible from source
// instead of being an opaque binary asset. Run with: node tools/generate-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT_DIR = path.resolve(__dirname, "../icons");

const BG = [168, 73, 8, 255]; // #a84908
const FG = [255, 255, 255, 255];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function roundedMask(size, radius) {
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true;
      const corners = [
        [radius, radius],
        [size - radius - 1, radius],
        [radius, size - radius - 1],
        [size - radius - 1, size - radius - 1],
      ];
      if (x < radius && y < radius) {
        inside = Math.hypot(x - corners[0][0], y - corners[0][1]) <= radius;
      } else if (x > size - radius - 1 && y < radius) {
        inside = Math.hypot(x - corners[1][0], y - corners[1][1]) <= radius;
      } else if (x < radius && y > size - radius - 1) {
        inside = Math.hypot(x - corners[2][0], y - corners[2][1]) <= radius;
      } else if (x > size - radius - 1 && y > size - radius - 1) {
        inside = Math.hypot(x - corners[3][0], y - corners[3][1]) <= radius;
      }
      mask[y * size + x] = inside ? 1 : 0;
    }
  }
  return mask;
}

function fillRect(pixels, size, rx, ry, rw, rh, color, radius = 0) {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      let inside = true;
      if (radius > 0) {
        if ((x < rx + radius || x >= rx + rw - radius) && (y < ry + radius || y >= ry + rh - radius)) {
          const ccx = x < rx + radius ? rx + radius : rx + rw - radius - 1;
          const ccy = y < ry + radius ? ry + radius : ry + rh - radius - 1;
          inside = Math.hypot(x - ccx, y - ccy) <= radius;
        }
      }
      if (!inside) continue;
      const idx = (y * size + x) * 4;
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = color[3];
    }
  }
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cornerRadius = Math.round(size * 0.22);
  const mask = roundedMask(size, cornerRadius);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const on = mask[y * size + x] === 1;
      pixels[idx] = BG[0];
      pixels[idx + 1] = BG[1];
      pixels[idx + 2] = BG[2];
      pixels[idx + 3] = on ? 255 : 0;
    }
  }

  // An original flat "TV on a stand" glyph — a screen (with an inset bezel)
  // over a neck and a foot, all drawn from plain rectangles. Deliberately a
  // generic retro-monitor silhouette rather than any specific device or
  // logo, so it reads as "screens" without resembling a real brand's mark.
  const unit = size / 16;
  const px = (n) => Math.round(n * unit);
  const bezel = Math.max(1, px(1));

  // Screen bezel
  fillRect(pixels, size, px(2.2), px(2.3), px(11.6), px(7.6), FG, px(1.3));
  // Screen (cut back to the background color to read as a frame)
  fillRect(
    pixels,
    size,
    px(2.2) + bezel,
    px(2.3) + bezel,
    px(11.6) - bezel * 2,
    px(7.6) - bezel * 2,
    BG,
    Math.max(0, px(0.6))
  );
  // Neck
  fillRect(pixels, size, px(7.2), px(9.9), px(1.6), px(1.2), FG);
  // Foot
  fillRect(pixels, size, px(5.2), px(11.1), px(5.6), px(1), FG, Math.max(0, px(0.4)));

  const buf = Buffer.from(pixels);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter type none
    buf.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const size of [16, 48, 128]) {
  const png = generateIcon(size);
  fs.writeFileSync(path.join(OUT_DIR, `icon${size}.png`), png);
  console.log(`Wrote icon${size}.png (${png.length} bytes)`);
}
