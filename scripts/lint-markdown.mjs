#!/usr/bin/env node
/**
 * Markdown structure + 80-col wrap for content/ only.
 *
 *   corn md                         lint all markdown under content/
 *   corn md --blog/crossroad-beauty
 *   corn md --fix …                 wrap prose to 80 + markdownlint --fix
 *   corn md --wrap-only …           wrap only (no markdownlint)
 *   corn md --lint-only …           markdownlint only
 *
 * Vale stays in `corn edit`. This command is structure/formatting.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const contentRoot = path.join(root, "content");
const WRAP_WIDTH = 80;
const require = createRequire(import.meta.url);

const FIXED_FLAGS = new Set([
  "--fix",
  "--wrap-only",
  "--lint-only",
  "--dry-run",
  "--help",
  "-h",
]);

function parseArgs(argv) {
  const opts = {
    fix: false,
    wrapOnly: false,
    lintOnly: false,
    dryRun: false,
    help: false,
    targets: [],
  };
  for (const a of argv) {
    if (a === "--fix") opts.fix = true;
    else if (a === "--wrap-only") opts.wrapOnly = true;
    else if (a === "--lint-only") opts.lintOnly = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a.startsWith("--") && !FIXED_FLAGS.has(a)) {
      const rel = a.slice(2).replace(/\\/g, "/").replace(/^\/+/, "");
      if (!rel) throw new Error(`Empty content path in flag: ${a}`);
      opts.targets.push(rel);
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      opts.targets.push(a);
    }
  }
  return opts;
}

function walkMarkdown(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "public") continue;
      walkMarkdown(full, out);
    } else if (/\.mdx?$/i.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolveUnderContent(raw) {
  const norm = String(raw).replace(/\\/g, "/");
  let abs;
  if (path.isAbsolute(raw)) abs = path.resolve(raw);
  else if (norm === "content" || norm.startsWith("content/")) {
    abs = path.resolve(root, norm);
  } else {
    abs = path.resolve(contentRoot, norm);
  }
  const rel = path.relative(path.resolve(contentRoot), abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `corn md only covers content/: refused ${raw} (resolved outside content/)`,
    );
  }
  return abs;
}

function collectMarkdown(targets) {
  if (!fs.existsSync(contentRoot)) {
    throw new Error(`Missing content/ at ${contentRoot}`);
  }
  if (targets.length === 0) return walkMarkdown(contentRoot).sort();
  const files = [];
  for (const t of targets) {
    const p = resolveUnderContent(t);
    if (!fs.existsSync(p)) throw new Error(`Path not found under content/: ${t}`);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkMarkdown(p, files);
    else if (/\.mdx?$/i.test(p)) files.push(p);
    else throw new Error(`Not markdown or a folder under content/: ${t}`);
  }
  return [...new Set(files)].sort();
}

function markdownlintBin() {
  // exports "." → markdownlint-cli2.mjs; bin sits beside it
  const main = require.resolve("markdownlint-cli2");
  return path.join(path.dirname(main), "markdownlint-cli2-bin.mjs");
}

function ensureMarkdownlint() {
  try {
    markdownlintBin();
    return null;
  } catch {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    console.log("\n> npm install markdownlint-cli2 (scripts/)");
    const r = spawnSync(
      npm,
      ["install", "markdownlint-cli2", "--save", "--prefix", __dirname],
      { cwd: root, stdio: "inherit", shell: true },
    );
    return r.status ?? 1;
  }
}

function runMarkdownlint(files, { fix }) {
  const dep = ensureMarkdownlint();
  if (dep !== null && dep !== 0) return dep;

  const cli = markdownlintBin();
  // --no-globs: only the paths we pass (config globs would expand to all content/)
  const args = [
    "--no-globs",
    ...files.map((f) => path.relative(root, f).replace(/\\/g, "/")),
  ];
  if (fix) args.push("--fix");
  console.log(
    `\n> markdownlint-cli2${fix ? " --fix" : ""} (${files.length} file(s))`,
  );
  const r = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: "inherit",
  });
  return r.status ?? 1;
}

/** Lines we never soft-wrap (Hugo / structure / ASCII). */
function isNoWrapLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^(\+\+\+|---)\s*$/.test(t)) return true;
  if (/^#{1,6}\s/.test(t)) return true;
  if (/^```/.test(t)) return true;
  if (/^~~~/.test(t)) return true;
  if (/^\|/.test(t)) return true;
  if (/^>\s?/.test(line)) return true; // blockquotes: leave as-authored for now
  if (/^\s*([-*+]|\d+\.)\s/.test(line)) return true; // lists
  if (/^\s*{{[<%]/.test(line)) return true; // Hugo shortcode open/close/self
  if (/^\s*{{<[/%]/.test(line)) return true;
  // Raw HTML (homepage ascii-angel figure, etc.) — never reflow
  if (/^</.test(t) || /<\/?[a-zA-Z][^>]*>/.test(t)) return true;
  // Braille / block ASCII art lines (U+2800–U+28FF)
  if (/^[\u2800-\u28FF\s]+$/.test(t)) return true;
  // Bare resource filenames inside photo-grid bodies
  if (/^[\w./@+-]+\.(webp|png|jpe?g|gif|avif|svg)$/i.test(t)) return true;
  return false;
}

function opensPre(line) {
  return /<pre[\s>]/i.test(line);
}

function closesPre(line) {
  return /<\/pre>/i.test(line);
}

function isFrontMatterFence(line) {
  return /^(\+\+\+|---)\s*$/.test(line.trim());
}

/**
 * Wrap a single prose string to width; prefer breaks at spaces.
 * Links and bare URLs stay one token (may exceed width alone).
 */
function wrapText(text, width) {
  const tokens = tokenizeForWrap(text);
  const out = [];
  let line = "";
  for (const tok of tokens) {
    if (!line) {
      line = tok;
      continue;
    }
    const next = `${line} ${tok}`;
    if (next.length <= width) {
      line = next;
      continue;
    }
    out.push(line);
    line = tok;
  }
  if (line) out.push(line);
  return out;
}

/** Split into atoms that should stay together (links, URLs, words). */
function tokenizeForWrap(text) {
  const s = text.replace(/\s+/g, " ").trim();
  if (!s) return [];
  const re =
    /(\[[^\]]*\]\([^)]+\)|\[[^\]]*\]\[[^\]]*\]|https?:\/\/\S+|[^\s]+)/g;
  const parts = s.match(re);
  return parts || [];
}

function wrapFile(absPath, { dryRun }) {
  const raw = fs.readFileSync(absPath, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const out = [];

  let i = 0;
  let inFence = false;
  let inPre = false;
  let inFrontMatter = false;
  let frontMatterStarted = false;

  while (i < lines.length) {
    const line = lines[i];

    if (isFrontMatterFence(line)) {
      if (!frontMatterStarted) {
        frontMatterStarted = true;
        inFrontMatter = true;
      } else if (inFrontMatter) {
        inFrontMatter = false;
      }
      out.push(line);
      i++;
      continue;
    }

    if (inFrontMatter) {
      out.push(line);
      i++;
      continue;
    }

    if (/^```/.test(line.trim()) || /^~~~/.test(line.trim())) {
      inFence = !inFence;
      out.push(line);
      i++;
      continue;
    }

    // Preserve <pre>…</pre> byte-for-byte (homepage ASCII art).
    if (inPre || opensPre(line)) {
      inPre = true;
      out.push(line);
      if (closesPre(line)) inPre = false;
      i++;
      continue;
    }

    if (inFence || isNoWrapLine(line)) {
      out.push(line);
      i++;
      continue;
    }

    // Gather a prose paragraph (consecutive wrappable lines).
    const para = [];
    while (i < lines.length) {
      const L = lines[i];
      if (
        !L.trim() ||
        isNoWrapLine(L) ||
        isFrontMatterFence(L) ||
        opensPre(L) ||
        /^```/.test(L.trim()) ||
        /^~~~/.test(L.trim())
      ) {
        break;
      }
      para.push(L.trimEnd());
      i++;
    }

    const joined = para.join(" ").replace(/ +/g, " ").trim();
    const wrapped = wrapText(joined, WRAP_WIDTH);
    out.push(...wrapped);
  }

  // Preserve whether the original ended with a trailing newline
  let next = out.join(nl);
  if (raw.endsWith("\n") || raw.endsWith("\r\n")) {
    if (!next.endsWith(nl)) next += nl;
  }

  const rel = path.relative(root, absPath).replace(/\\/g, "/");
  if (next === raw) {
    return { rel, changed: false };
  }
  if (!dryRun) fs.writeFileSync(absPath, next);
  return { rel, changed: true };
}

function reportLongLines(files) {
  let n = 0;
  for (const abs of files) {
    const rel = path.relative(root, abs).replace(/\\/g, "/");
    const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
    let inFence = false;
    let inPre = false;
    let inFrontMatter = false;
    let fmStarted = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isFrontMatterFence(line)) {
        if (!fmStarted) {
          fmStarted = true;
          inFrontMatter = true;
        } else if (inFrontMatter) inFrontMatter = false;
        continue;
      }
      if (inFrontMatter) continue;
      if (/^```/.test(line.trim()) || /^~~~/.test(line.trim())) {
        inFence = !inFence;
        continue;
      }
      if (inPre || opensPre(line)) {
        inPre = true;
        if (closesPre(line)) inPre = false;
        continue;
      }
      if (inFence || isNoWrapLine(line)) continue;
      if (line.length > WRAP_WIDTH) {
        n++;
        console.log(
          `${rel}:${i + 1}: line length ${line.length} > ${WRAP_WIDTH}`,
        );
      }
    }
  }
  return n;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (opts.help) {
    console.log(`Usage: corn md [--name.md | path…] [options]

Markdown structure lint + ${WRAP_WIDTH}-col prose wrap under content/ only.
(Prose/style stays with corn edit / Vale.)

  corn md                         lint all content/**/*.md
  corn md --blog/your-post
  corn md --fix --blog/your-post  wrap to ${WRAP_WIDTH} + markdownlint --fix
  corn md --wrap-only …
  corn md --lint-only …
  corn md --dry-run --fix …      show wrap changes without writing

  --fix         wrap prose + apply markdownlint fixes
  --wrap-only    wrap only
  --lint-only    markdownlint only
  --dry-run      with --fix/--wrap-only: don't write wraps`);
    process.exit(0);
  }

  if (opts.wrapOnly && opts.lintOnly) {
    console.error("Pick one of --wrap-only or --lint-only.");
    process.exit(2);
  }

  let files;
  try {
    files = collectMarkdown(opts.targets);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (files.length === 0) {
    console.log("No markdown files found under content/.");
    process.exit(0);
  }

  console.log(`Markdown ${files.length} file(s) under content/`);
  let code = 0;
  // default: lint + report long lines (no write)
  // --fix: wrap + lint --fix
  // --wrap-only: wrap only
  // --lint-only: lint only
  const wantWrap = opts.wrapOnly || opts.fix;
  const wantLint = !opts.wrapOnly;

  if (wantWrap) {
    console.log(
      `\n> wrap prose to ${WRAP_WIDTH}${opts.dryRun ? " (dry-run)" : ""}`,
    );
    let changed = 0;
    for (const f of files) {
      const r = wrapFile(f, { dryRun: opts.dryRun });
      if (r.changed) {
        changed++;
        console.log(`  ${opts.dryRun ? "would wrap" : "wrapped"} ${r.rel}`);
      }
    }
    if (changed === 0) console.log("  (no wrap changes)");
  }

  if (wantLint) {
    const lintCode = runMarkdownlint(files, { fix: opts.fix && !opts.wrapOnly });
    if (lintCode !== 0) code = lintCode;
  }

  // Default lint also reports over-width prose; --lint-only is markdownlint only.
  if (!wantWrap && !opts.lintOnly) {
    const long = reportLongLines(files);
    if (long > 0) {
      console.log(
        `\n${long} prose line(s) over ${WRAP_WIDTH}. Run corn md --fix to wrap.`,
      );
      if (code === 0) code = 1;
    }
  }

  process.exit(code);
}

main();
