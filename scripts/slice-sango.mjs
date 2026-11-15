import fs from "fs";
import sharp from "sharp";
import { PNG } from "./node_modules/pngjs/lib/png.js";

const sheet = PNG.sync.read(fs.readFileSync("assets-src/sprites/sango-sheet.png"));
const { width, height, data } = sheet;

const px = (x, y) => {
  const i = (y * width + x) << 2;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

// Sheet uses solid teal as chroma (≈ #004040–#006060).
const isBg = ([r, g, b, a]) =>
  a < 8 || (r <= 24 && g >= 40 && g <= 110 && b >= 40 && b <= 110 && Math.abs(g - b) <= 24);

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
    return { ...r, frames: frames.filter((f) => f.w >= 10 && f.h >= 16) };
  })
  .filter((r) => r.frames.length >= 2);

console.log(
  "rows",
  candidates.map((r) => ({ y0: r.y0, h: r.h, n: r.frames.length, ws: r.frames.map((f) => f.w) }))
);

// Expected: idle(+projectile) / walk / hurt / attack. Skip credit crumb rows.
const spriteRows = candidates.filter((r) => r.h >= 24).slice(0, 4);
if (spriteRows.length < 4) {
  console.error("expected 4 sango rows, got", spriteRows.length);
  process.exit(1);
}

// Row order on the sheet: idle(+spinning Hiraikotsu), hurt/brace, walk, attack.
const idleRow = spriteRows[0].frames;
const plans = [
  { id: "sango-idle", frames: idleRow.slice(0, 3), fps: 4, alt: "Sango idle" },
  // Separate spinning boomerang cells (thrown projectile).
  { id: "sango-boomerang", frames: idleRow.slice(3), fps: 10, alt: "Hiraikotsu" },
  // Rows 1–2 (hurt, walk) are unused on the site. Attack stays row 3.
  { id: "sango-attack", frames: spriteRows[3].frames, fps: 8, alt: "Sango attack" },
];

const meta = [];
for (const plan of plans) {
  const frames = plan.frames;
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

  const file = `static/images/sprites/${plan.id}.png`;
  const packed = await sharp(PNG.sync.write(strip)).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  fs.writeFileSync(file, packed);
  meta.push({
    id: plan.id,
    src: `images/sprites/${plan.id}.png`,
    frameWidth: cellW,
    frameHeight: cellH,
    frames: frames.length,
    fps: plan.fps,
    alt: plan.alt,
  });
  console.log("wrote", file, cellW, "x", cellH, "*", frames.length);
}

fs.writeFileSync(
  "assets-src/sprites/meta/sango.json",
  JSON.stringify(
    {
      note: "Sango from InuYasha: Fūun Emaki (WonderSwan). TSR #13363. Fan-use test.",
      anims: meta,
    },
    null,
    2
  )
);
console.log("meta", meta.length, "anims");
