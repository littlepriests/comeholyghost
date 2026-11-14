import fs from "fs";
import sharp from "sharp";
import { PNG } from "./node_modules/pngjs/lib/png.js";

const sheet = PNG.sync.read(fs.readFileSync("assets-src/sprites/misdreavus-sheet.png"));
const { width, height, data } = sheet;

const px = (x, y) => {
  const i = (y * width + x) << 2;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

const isBg = ([r, g, b]) => {
  const green = Math.abs(r - 64) <= 28 && Math.abs(g - 128) <= 35 && b <= 45;
  const blue = Math.abs(r - 23) <= 22 && Math.abs(g - 132) <= 28 && Math.abs(b - 213) <= 28;
  const green2 = g > 105 && g > r * 1.7 && g > b * 1.7;
  return green || blue || green2;
};

const content = new Uint8Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    content[y * width + x] = isBg(px(x, y)) ? 0 : 1;
  }
}

function rowHas(y) {
  for (let x = 0; x < width; x++) if (content[y * width + x]) return true;
  return false;
}
function colHasIn(y0, y1, x) {
  for (let y = y0; y <= y1; y++) if (content[y * width + x]) return true;
  return false;
}

const rowBands = [];
for (let y = 0, s = null; y <= height; y++) {
  const hit = y < height && rowHas(y);
  if (hit && s === null) s = y;
  if (!hit && s !== null) {
    rowBands.push({ y0: s, y1: y - 1, h: y - s });
    s = null;
  }
}

const spriteRows = rowBands
  .map((r) => {
    const frames = [];
    for (let x = 0, s = null; x <= width; x++) {
      const hit = x < width && colHasIn(r.y0, r.y1, x);
      if (hit && s === null) s = x;
      if (!hit && s !== null) {
        frames.push({ x0: s, x1: x - 1, w: x - s, y0: r.y0, y1: r.y1, h: r.h });
        s = null;
      }
    }
    return {
      ...r,
      frames: frames.filter((f) => f.w >= 38 && f.w <= 55),
    };
  })
  .filter((r) => r.frames.length >= 4);

// Front hover only: first front row (bob up/down). Skip later rows
// (turn / back) and the shiny frame on the last front row.
const hoverRow = spriteRows[0];
if (!hoverRow || hoverRow.frames.length < 4) {
  console.error("no hover row");
  process.exit(1);
}
const frames = hoverRow.frames;

console.log("hover row", { y0: hoverRow.y0, h: hoverRow.h, n: frames.length });

const cellW = 52;
const cellH = 108;
const strip = new PNG({ width: cellW * frames.length, height: cellH });
strip.data.fill(0);

for (let fi = 0; fi < frames.length; fi++) {
  const f = frames[fi];
  const ox = fi * cellW + Math.floor((cellW - f.w) / 2);
  const oy = Math.floor((cellH - f.h) / 2);
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const [r, g, b, a] = px(f.x0 + x, f.y0 + y);
      if (isBg([r, g, b])) continue;
      const di = ((oy + y) * strip.width + (ox + x)) << 2;
      strip.data[di] = r;
      strip.data[di + 1] = g;
      strip.data[di + 2] = b;
      strip.data[di + 3] = a;
    }
  }
}

// pngjs writes a loose RGBA file (~18KB). Recompress; pixels stay the same (~3.5KB).
const packed = await sharp(PNG.sync.write(strip)).png({ compressionLevel: 9, effort: 10 }).toBuffer();
fs.writeFileSync("static/images/sprites/misdreavus.png", packed);
fs.writeFileSync(
  "assets-src/sprites/meta/misdreavus.json",
  JSON.stringify(
    {
      src: "images/sprites/misdreavus.png",
      frameWidth: cellW,
      frameHeight: cellH,
      frames: frames.length,
      fps: 8,
      alt: "Misdreavus",
      note: "Front hover loop only (no shiny / back). TSR #35479. Fan-use test.",
    },
    null,
    2
  )
);
console.log("wrote strip", cellW, "x", cellH, "*", frames.length);
