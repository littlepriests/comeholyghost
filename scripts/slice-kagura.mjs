import fs from "fs";
import sharp from "sharp";
import { PNG } from "./node_modules/pngjs/lib/png.js";

const sheet = PNG.sync.read(fs.readFileSync("assets-src/sprites/kagura-sheet.png"));
const { width, height, data } = sheet;

const px = (x, y) => {
  const i = (y * width + x) << 2;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

// Sheet uses pure black as chroma
const isBg = ([r, g, b, a]) => a < 8 || (r <= 8 && g <= 8 && b <= 8);

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

// Keep sprite rows (skip tiny label noise); expect 3 action rows at the bottom of sheet.
// If the sheet includes a big portrait above, take the last 3 content rows with multiple frames.
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
  .filter((r) => r.frames.length >= 2);

console.log(
  "all rows",
  candidates.map((r) => ({ y0: r.y0, h: r.h, n: r.frames.length, ws: r.frames.map((f) => f.w) }))
);

// Prefer the last 3 multi-frame rows (walk / downed / attack)
const rows = candidates.slice(-3);
const names = ["kagura-walk", "kagura-down", "kagura-attack"];
const meta = [];

for (let ri = 0; ri < rows.length; ri++) {
  const row = rows[ri];
  // Walk row ends with a front idle pose — keep the 6-frame loop only.
  const frames = ri === 0 ? row.frames.slice(0, 6) : row.frames;
  const cellW = Math.max(...frames.map((f) => f.w));
  const cellH = Math.max(...frames.map((f) => f.h));
  const strip = new PNG({ width: cellW * frames.length, height: cellH });
  strip.data.fill(0);

  for (let fi = 0; fi < frames.length; fi++) {
    const f = frames[fi];
    const ox = fi * cellW + Math.floor((cellW - f.w) / 2);
    // feet-align: pad top
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

  const name = names[ri] || `kagura-row-${ri + 1}`;
  const file = `static/images/sprites/${name}.png`;
  const packed = await sharp(PNG.sync.write(strip)).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  fs.writeFileSync(file, packed);
  const entry = {
    id: name,
    src: `images/sprites/${name}.png`,
    frameWidth: cellW,
    frameHeight: cellH,
    frames: frames.length,
    fps: ri === 0 ? 4 : 5,
    alt: `Kagura ${name.replace("kagura-", "")}`,
  };
  meta.push(entry);
  console.log("wrote", file, cellW, "x", cellH, "*", frames.length);
}

fs.writeFileSync("static/images/sprites/kagura.json", JSON.stringify(meta, null, 2));
console.log("meta", meta.length, "anims");
