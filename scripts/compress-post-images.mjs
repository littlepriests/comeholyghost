#!/usr/bin/env node
/**
 * In-place recompress of article/banner images for a lean repo.
 *
 * Drop camera masters into a post folder (or pass a path), then:
 *   corn compress [path...]
 *   corn compress --new          only unmarked + recently added (git) files
 *   node scripts/compress-post-images.mjs [path...]
 *
 * Default path: content/blog
 * Writes lossy WebP stamped with EXIF Software=comeholyghost-corn so later
 * runs can skip them. Existing .webp are left alone unless --force / --new.
 *
 * Options:
 *   --max-edge N     Long-edge cap in px (default 2000)
 *   --quality N      WebP quality 1–100 (default 82)
 *   --max-bytes N    Skip unmarked webp already ≤ N bytes + within edge (default 512000)
 *   --new            Only recently added (not on git HEAD) unmarked files
 *   --force          Re-encode even corn-marked .webp
 *   --dry-run        Report only
 *   --help
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORN_MARK = "comeholyghost-corn";

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
  ".avif",
]);

function parseArgs(argv) {
  const opts = {
    maxEdge: 2000,
    quality: 82,
    maxBytes: 512000,
    force: false,
    onlyNew: false,
    dryRun: false,
    help: false,
    paths: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--max-edge") opts.maxEdge = Number(argv[++i]);
    else if (a === "--quality") opts.quality = Number(argv[++i]);
    else if (a === "--max-bytes") opts.maxBytes = Number(argv[++i]);
    else if (a === "--force") opts.force = true;
    else if (a === "--new") opts.onlyNew = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a.startsWith("-")) throw new Error(`Unknown flag: ${a}`);
    else opts.paths.push(a);
  }
  return opts;
}

function walkImages(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules") continue;
      walkImages(full, out);
    } else if (IMAGE_EXT.has(path.extname(ent.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function collectTargets(rawPaths) {
  const inputs =
    rawPaths.length > 0
      ? rawPaths.map((p) => path.resolve(process.cwd(), p))
      : [path.join(root, "content", "blog")];
  const files = [];
  for (const p of inputs) {
    if (!fs.existsSync(p)) throw new Error(`Path not found: ${p}`);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkImages(p, files);
    else if (IMAGE_EXT.has(path.extname(p).toLowerCase())) files.push(p);
    else throw new Error(`Not an image or folder: ${p}`);
  }
  return [...new Set(files)].sort();
}

function rewriteMarkdownRefs(dir, fromBase, toBase) {
  if (fromBase === toBase) return 0;
  let n = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.mdx?$/i.test(name)) continue;
    const mdPath = path.join(dir, name);
    const before = fs.readFileSync(mdPath, "utf8");
    const esc = fromBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(esc, "g");
    if (!re.test(before)) continue;
    const after = before.replace(re, toBase);
    fs.writeFileSync(mdPath, after);
    n += 1;
  }
  return n;
}

function hasCornMark(meta) {
  if (!meta) return false;
  for (const key of ["exif", "xmp", "iptc"]) {
    const buf = meta[key];
    if (!buf) continue;
    const text = Buffer.isBuffer(buf) ? buf.toString("latin1") : String(buf);
    if (text.includes(CORN_MARK)) return true;
  }
  return false;
}

/** Untracked, or not present on HEAD — “recently added” for --new. */
function isRecentlyAdded(file) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  try {
    const tracked = spawnSync(
      "git",
      ["cat-file", "-e", `HEAD:${rel}`],
      { cwd: root, encoding: "utf8" },
    );
    // status 0 → blob exists on HEAD (already in the repo)
    if (tracked.status === 0) return false;
    return true;
  } catch {
    // No git: treat files newer than 14 days as new.
    const ageMs = Date.now() - fs.statSync(file).mtimeMs;
    return ageMs < 14 * 24 * 60 * 60 * 1000;
  }
}

async function compressOne(file, opts) {
  const ext = path.extname(file).toLowerCase();
  const dir = path.dirname(file);
  const stem = path.basename(file, ext);
  const outPath = path.join(dir, `${stem}.webp`);
  const before = fs.statSync(file).size;

  // Read into memory first so Windows can overwrite the same path; sharp keeps
  // a lock on file-path inputs until GC, which makes writeFileSync fail (EBUSY/UNKNOWN).
  let input;
  try {
    input = fs.readFileSync(file);
  } catch (err) {
    return { file, status: "error", detail: err.message };
  }

  let meta;
  try {
    meta = await sharp(input, { failOn: "none" }).metadata();
  } catch (err) {
    return { file, status: "error", detail: err.message };
  }

  const w = meta.width || 0;
  const h = meta.height || 0;
  const longEdge = Math.max(w, h);
  const withinEdge = longEdge > 0 && longEdge <= opts.maxEdge;
  const alreadyWebp = ext === ".webp";
  const marked = hasCornMark(meta);

  // Corn-marked = already through this tool. Skip unless --force (avoids generational loss).
  if (marked && !opts.force) {
    return {
      file,
      status: "skip",
      detail: `corn-marked (${fmtBytes(before)}, ${w}×${h})`,
    };
  }

  if (opts.onlyNew && !isRecentlyAdded(file)) {
    return {
      file,
      status: "skip",
      detail: `not new to git (${fmtBytes(before)}, ${w}×${h})`,
    };
  }

  // Unmarked WebP that are already within size + edge look “done enough” — leave them.
  // Oversized / over-edge unmarked WebP still get a first compress pass (then marked).
  if (alreadyWebp && !opts.force && before <= opts.maxBytes && withinEdge) {
    return {
      file,
      status: "skip",
      detail: `already lean (${fmtBytes(before)}, ${w}×${h})`,
    };
  }

  if (opts.dryRun) {
    return {
      file,
      status: "dry-run",
      detail: `would write ${path.basename(outPath)} from ${w}×${h} ${fmtBytes(before)}`,
    };
  }

  let pipeline = sharp(input, { failOn: "none" }).rotate();
  if (longEdge > opts.maxEdge) {
    pipeline = pipeline.resize({
      width: w >= h ? opts.maxEdge : undefined,
      height: h > w ? opts.maxEdge : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const buf = await pipeline
    .webp({ quality: opts.quality, effort: 4 })
    .withMetadata({
      exif: {
        IFD0: {
          Software: CORN_MARK,
          ImageDescription: CORN_MARK,
        },
      },
    })
    .toBuffer();

  if (alreadyWebp && buf.length >= before && withinEdge) {
    return {
      file,
      status: "skip",
      detail: `output not smaller (${fmtBytes(before)} → ${fmtBytes(buf.length)})`,
    };
  }

  const tmpPath = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, buf);
  fs.renameSync(tmpPath, outPath);

  let md = 0;
  if (path.resolve(outPath) !== path.resolve(file)) {
    md = rewriteMarkdownRefs(dir, path.basename(file), path.basename(outPath));
    fs.unlinkSync(file);
  }

  return {
    file,
    status: "ok",
    detail: `${w}×${h} ${fmtBytes(before)} → ${fmtBytes(buf.length)} · marked${md ? ` · updated ${md} md` : ""}`,
    outPath,
  };
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (opts.help) {
    console.log(`Usage: corn compress [path...] [options]

Convert JPG/PNG/… → WebP (default path: content/blog). Stamps EXIF
Software=${CORN_MARK}. Later runs skip corn-marked files unless --force.

Unmarked WebP still compress when over --max-bytes or --max-edge (first pass).
Lean unmarked WebP and corn-marked files are skipped.

  --new           only files not on git HEAD (recently added)
  --force         re-encode even corn-marked .webp
  --max-edge N    long-edge cap px (default 2000)
  --quality N     WebP quality (default 82)
  --max-bytes N   skip unmarked webp under this size if within edge (default 512000)
  --dry-run`);
    process.exit(0);
  }

  let files;
  try {
    files = collectTargets(opts.paths);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (files.length === 0) {
    console.log("No images found.");
    process.exit(0);
  }

  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const file of files) {
    const rel = path.relative(root, file) || file;
    try {
      const r = await compressOne(file, opts);
      const tag = r.status === "ok" ? "ok" : r.status;
      console.log(`${rel}: ${tag} — ${r.detail}`);
      if (r.status === "ok" || r.status === "dry-run") ok += 1;
      else if (r.status === "skip") skip += 1;
      else fail += 1;
    } catch (err) {
      console.error(`${rel}: error — ${err.message}`);
      fail += 1;
    }
  }

  console.log(
    `\n${files.length} file(s): ${ok} changed/planned, ${skip} skipped, ${fail} failed`,
  );
  process.exit(fail ? 1 : 0);
}

main();
