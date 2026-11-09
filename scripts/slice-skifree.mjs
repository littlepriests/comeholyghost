import fs from "fs";
import { PNG } from "./node_modules/pngjs/lib/png.js";

const sheet = PNG.sync.read(fs.readFileSync("static/images/sprites/skifree-sheet.png"));
const { width, height, data } = sheet;

const px = (x, y) => {
  const i = (y * width + x) << 2;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

// White page bg + lime (#A8E61D) divider lines from The Spriters Resource.
const isBg = ([r, g, b, a]) => {
  if (a < 8) return true;
  if (r >= 245 && g >= 245 && b >= 245) return true;
  if (Math.abs(r - 168) < 40 && Math.abs(g - 230) < 40 && Math.abs(b - 29) < 40) return true;
  if (g > 180 && r > 100 && r < 200 && b < 80) return true;
  return false;
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

const candidates = rowBands
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
    return { ...r, frames: frames.filter((f) => f.w >= 8 && f.h >= 12) };
  })
  .filter((r) => r.frames.length >= 1);

console.log(
  "rows",
  candidates.map((r, i) => ({
    i,
    y0: r.y0,
    h: r.h,
    n: r.frames.length,
    ws: r.frames.map((f) => f.w),
  }))
);

function writeStrip(id, frames, fps, alt) {
  if (!frames.length) throw new Error("no frames for " + id);
  const cellW = Math.max(...frames.map((f) => f.w));
  const cellH = Math.max(...frames.map((f) => f.h));
  const strip = new PNG({ width: cellW * frames.length, height: cellH });
  strip.data.fill(0);
  for (let fi = 0; fi < frames.length; fi++) {
    const f = frames[fi];
    const ox = fi * cellW + Math.floor((cellW - f.w) / 2);
    const oy = cellH - f.h;
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const [r, g, b, a] = px(f.x0 + x, f.y0 + y);
        if (isBg([r, g, b, a])) continue;
        const di = ((oy + y) * strip.width + (ox + x)) << 2;
        strip.data[di] = r;
        strip.data[di + 1] = g;
        strip.data[di + 2] = b;
        strip.data[di + 3] = 255;
      }
    }
  }
  const file = `static/images/sprites/${id}.png`;
  fs.writeFileSync(file, PNG.sync.write(strip));
  console.log("wrote", file, cellW, "x", cellH, "*", frames.length);
  return {
    id,
    src: `images/sprites/${id}.png`,
    frameWidth: cellW,
    frameHeight: cellH,
    frames: frames.length,
    fps,
    alt,
  };
}

// Original-game block only (above the thick custom divider ~y 402).
const original = candidates.filter((r) => r.y1 < 400 && r.h >= 16);

const meta = [];

// Row 0: skier facing / turn poses (narrower cells) then jumps (wider).
const skiRow = original.find((r) => r.h >= 28 && r.h <= 36 && r.frames.length >= 8);
if (skiRow) {
  meta.push(writeStrip("skifree-ski", skiRow.frames.slice(0, 4), 6, "SkiFree skier"));
}

// Tall yeti row (stand / roar / walk / grab+eat).
const yetiRow = original
  .filter((r) => r.h >= 40 && r.frames.length >= 3)
  .sort((a, b) => b.frames.length - a.frames.length)[0];
if (yetiRow) {
  meta.push(writeStrip("skifree-yeti", yetiRow.frames.slice(0, 6), 5, "SkiFree yeti"));
}

// Wipeout: tumble + star poses from the end of the skier row, else a short mid row.
if (skiRow && skiRow.frames.length >= 8) {
  meta.push(writeStrip("skifree-crash", skiRow.frames.slice(5, 8), 4, "SkiFree wipeout"));
} else {
  const crashRow = original.find(
    (r) =>
      r !== skiRow &&
      r !== yetiRow &&
      r.h >= 18 &&
      r.h <= 36 &&
      r.frames.length >= 2 &&
      r.frames.length <= 6
  );
  if (crashRow) {
    meta.push(writeStrip("skifree-crash", crashRow.frames.slice(0, 4), 4, "SkiFree wipeout"));
  }
}

if (!meta.length) {
  console.error("no skifree anims extracted");
  process.exit(1);
}

fs.writeFileSync(
  "static/images/sprites/skifree.json",
  JSON.stringify(
    {
      note: "SkiFree characters. TSR #26926. Fan-use test. Original block only (above custom divider).",
      anims: meta,
    },
    null,
    2
  )
);
console.log("meta", meta.length, "anims");
