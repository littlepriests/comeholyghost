/** Close transparent cracks inside black outlines; do not paint outside. */

const ORANGE = [248, 136, 56, 255];
const YELLOW = [255, 199, 55, 255];
const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function fillGaps(png) {
  const { width: w, height: h, data } = png;
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const i = (y * w + x) << 2;
    return [data[i], data[i + 1], data[i + 2], data[i + 3], i];
  };
  const set = (i, col) => {
    data[i] = col[0];
    data[i + 1] = col[1];
    data[i + 2] = col[2];
    data[i + 3] = col[3];
  };
  const isT = (c) => !c || c[3] < 8;
  const isOrange = (c) => c && c[3] > 200 && c[0] > 180 && c[1] > 60 && c[1] < 180 && c[2] < 100;
  const isYellow = (c) => c && c[3] > 200 && c[0] > 200 && c[1] > 150 && c[2] < 120;
  const isBlack = (c) => c && c[3] > 200 && c[0] < 40 && c[1] < 40 && c[2] < 40;

  // Close outline↔fill cracks. Prefer 4-connected (no outer halo from diagonals).
  for (let pass = 0; pass < 12; pass++) {
    const writes = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = at(x, y);
        if (!isT(c)) continue;
        let o4 = 0;
        let ye4 = 0;
        let b4 = 0;
        for (const [dx, dy] of N4) {
          const n = at(x + dx, y + dy);
          if (isOrange(n)) o4++;
          else if (isYellow(n)) ye4++;
          else if (isBlack(n)) b4++;
        }
        if (b4 && ye4) writes.push([c[4], YELLOW]);
        else if (b4 && o4) writes.push([c[4], ORANGE]);
      }
    }
    if (!writes.length) break;
    for (const [i, col] of writes) set(i, col);
  }

  // Interior pockets: transparent cells mostly surrounded by fill.
  for (let pass = 0; pass < 10; pass++) {
    const writes = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = at(x, y);
        if (!isT(c)) continue;
        let o = 0;
        let ye = 0;
        for (const [dx, dy] of N4) {
          const n = at(x + dx, y + dy);
          if (isYellow(n)) ye++;
          else if (isOrange(n)) o++;
        }
        if (ye >= 2) writes.push([c[4], YELLOW]);
        else if (o >= 3) writes.push([c[4], ORANGE]);
      }
    }
    if (!writes.length) break;
    for (const [i, col] of writes) set(i, col);
  }
}
