import fs from "fs";
import sharp from "sharp";
import { PNG } from "./node_modules/pngjs/lib/png.js";
import { fillGaps } from "./fill-grundo-gaps.mjs";

const sheet = PNG.sync.read(fs.readFileSync("assets-src/sprites/grundo-sheet.png"));
const { width, height, data } = sheet;

const px = (x, y) => {
  const i = (y * width + x) << 2;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

// Magenta key + white cell padding from LonelyMarowak’s TSR sheet.
const isBg = ([r, g, b, a]) => {
  if (a < 8) return true;
  if (r >= 245 && g >= 245 && b >= 245) return true;
  if (r > 240 && b > 240 && g < 20) return true;
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
    return { ...r, frames: frames.filter((f) => f.w >= 20 && f.h >= 20) };
  })
  .filter((r) => r.frames.length >= 4);

function orangeCount(r) {
  let n = 0;
  for (let y = r.y0; y <= r.y1; y++) {
    for (let x = 0; x < width; x++) {
      const [rr, gg, bb, a] = px(x, y);
      if (isBg([rr, gg, bb, a])) continue;
      if (rr > 200 && gg > 80 && gg < 180 && bb < 80) n++;
    }
  }
  return n;
}

const orange = candidates.sort((a, b) => orangeCount(b) - orangeCount(a))[0];
if (!orange || orangeCount(orange) < 100) {
  console.error("orange Grundo row not found");
  process.exit(1);
}

async function writeStrip(id, frames, fps, alt) {
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
  fillGaps(strip);
  const file = `static/images/sprites/${id}.png`;
  const packed = await sharp(PNG.sync.write(strip)).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  fs.writeFileSync(file, packed);
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

// Orange row L→R: ready, kick, front A, front B, back, shout (+ hearts ignored).
// Side-view idle + leg-up only (same character scale). Kick = idle → leg-up → idle.
const idle = orange.frames[0];
const legUp = orange.frames[1];
const meta = [
  await writeStrip("grundo-idle", [idle], 1, "Orange Grundo idle"),
  await writeStrip("grundo-kick", [idle, legUp, idle], 8, "Orange Grundo kick"),
];

fs.writeFileSync(
  "assets-src/sprites/meta/grundo.json",
  JSON.stringify(
    {
      note: "Orange Grundo (Pokémon G/S style). TSR #186604. Credit LonelyMarowak. Fan-use.",
      anims: meta,
    },
    null,
    2
  )
);
console.log("meta", meta);
