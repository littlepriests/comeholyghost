import fs from "node:fs";

/**
 * Build a solid-Braille twin of cloud.txt for the pink fill layer.
 * Same character widths as the outline → fill aligns to the ASCII exactly.
 * ⣿ = all 8 Braille dots (U+28FF).
 */
const FULL = "\u28FF";

const raw = fs.readFileSync("static/ascii/cloud.txt", "utf8").replace(/\r/g, "");
const lines = raw.split("\n");

const fill = lines
  .map((line) =>
    [...line]
      .map((c) => (c === " " || c === "\t" ? " " : FULL))
      .join("")
  )
  .join("\n");

fs.writeFileSync("static/ascii/cloud-fill.txt", fill);
console.log({
  rows: lines.length,
  out: "static/ascii/cloud-fill.txt",
  chars: [...fill].filter((c) => c === FULL).length,
});
