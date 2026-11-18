#!/usr/bin/env node
/**
 * Prose lint for this site: Vale (vale.ini + styles/wraith) + be-density.
 *
 * Only markdown under content/ is in scope.
 *
 *   corn edit                         prompt for content/blog/<name>
 *   corn edit --all                   all markdown under content/
 *   corn edit --read-me.md            content/read-me.md
 *   corn edit --guestbook.md
 *   corn edit --blog/crossroad-beauty content/blog/crossroad-beauty/
 *   corn edit content/blog/foo        same, positional under content/
 *   corn edit …                       Vale picker by default (same as --fix)
 *   corn edit --report …              report-only Vale (no interactive picker)
 *
 * Options:
 *   --all           Sweep every markdown file under content/ (skip blog prompt)
 *   --skip-sync     Do not run vale sync
 *   --vale-only     Skip be-density
 *   --density-only  Skip Vale
 *   --fix/--review  Explicit picker (default on; kept for clarity)
 *   --report        Report-only Vale (old non-interactive default)
 *   --help
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  isCaseOnlySpellingAlert,
  isSpellingCheck,
} from "./vale-typos.mjs";

/** Parallel `vale fix` workers (spelling suggestions are the slow part). */
const VALE_FIX_CONCURRENCY = 8;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");
const densityDir = path.join(root, "tools", "be-density");
const densityBin = path.join(densityDir, "be-density.mjs");

const FIXED_FLAGS = new Set([
  "--all",
  "--skip-sync",
  "--vale-only",
  "--density-only",
  "--review",
  "--fix",
  "--report",
  "--help",
  "-h",
]);

function parseArgs(argv) {
  const opts = {
    all: false,
    skipSync: false,
    valeOnly: false,
    densityOnly: false,
    /** Interactive Vale picker — default on; --report for report-only. */
    review: true,
    help: false,
    /** @type {string[]} paths relative to content/ (posix) or absolute under content */
    targets: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") opts.all = true;
    else if (a === "--skip-sync") opts.skipSync = true;
    else if (a === "--vale-only") opts.valeOnly = true;
    else if (a === "--density-only") opts.densityOnly = true;
    else if (a === "--review" || a === "--fix") opts.review = true;
    else if (a === "--report") opts.review = false;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a.startsWith("--") && !FIXED_FLAGS.has(a)) {
      // corn edit --read-me.md  →  content/read-me.md
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

/** Normalize a typed blog name into a content/-relative target (blog/…). */
function normalizeBlogName(raw) {
  let name = String(raw || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (!name) return "";
  name = name.replace(/^(content\/)?blog\//, "");
  name = name.replace(/\/+$/, "");
  // Folder posts are usual; allow typing crossroad-beauty.md → crossroad-beauty
  if (/\.mdx?$/i.test(name) && !name.includes("/")) {
    name = name.replace(/\.mdx?$/i, "");
  }
  if (!name || name.includes("..")) {
    throw new Error("Need a blog slug under content/blog/ (no ..).");
  }
  return `blog/${name}`;
}

function promptBlogTarget() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("content/blog/<name>: ", (answer) => {
      rl.close();
      try {
        const target = normalizeBlogName(answer);
        if (!target) {
          reject(
            new Error(
              "Empty name — type a post slug (e.g. crossroad-beauty) or pass --all.",
            ),
          );
          return;
        }
        resolve(target);
      } catch (err) {
        reject(err);
      }
    });
  });
}

function whichVale() {
  const r = spawnSync(
    process.platform === "win32" ? "where.exe" : "which",
    ["vale"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) return null;
  const line = (r.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find(Boolean);
  return line || null;
}

function run(cmd, args, { shell = false } = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    shell,
  });
  return r.status ?? 1;
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

/** Resolve a user target to an absolute path that must stay under content/. */
function resolveUnderContent(raw) {
  const norm = String(raw).replace(/\\/g, "/");
  let abs;
  if (path.isAbsolute(raw)) {
    abs = path.resolve(raw);
  } else if (norm === "content" || norm.startsWith("content/")) {
    abs = path.resolve(root, norm);
  } else {
    // Flag form or bare slug: relative to content/
    abs = path.resolve(contentRoot, norm);
  }

  const contentResolved = path.resolve(contentRoot);
  const rel = path.relative(contentResolved, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `corn edit only covers content/: refused ${raw} (resolved outside content/)`,
    );
  }
  return abs;
}

function collectMarkdown(targets, { all = false } = {}) {
  if (!fs.existsSync(contentRoot)) {
    throw new Error(`Missing content/ at ${contentRoot}`);
  }

  if (all) {
    if (targets.length) {
      throw new Error("Pass --all alone, or pass a path — not both.");
    }
    return walkMarkdown(contentRoot).sort();
  }

  if (targets.length === 0) {
    throw new Error("No target — pass a path, --all, or answer the blog prompt.");
  }

  const files = [];
  for (const t of targets) {
    const p = resolveUnderContent(t);
    if (!fs.existsSync(p)) {
      throw new Error(`Path not found under content/: ${t}`);
    }
    const st = fs.statSync(p);
    if (st.isDirectory()) walkMarkdown(p, files);
    else if (/\.mdx?$/i.test(p)) files.push(p);
    else {
      throw new Error(`Not markdown or a folder under content/: ${t}`);
    }
  }
  return [...new Set(files)].sort();
}

function packsPresent() {
  const markers = [
    path.join(root, "styles", "write-good"),
    path.join(root, "styles", "Hugo"),
    path.join(root, "styles", "Voices"),
  ];
  return markers.every((p) => fs.existsSync(p));
}

function ensureDensityDeps() {
  const nm = path.join(densityDir, "node_modules", "wink-pos-tagger");
  if (fs.existsSync(nm)) return 0;
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  return run(npm, ["install", "--prefix", densityDir], { shell: true });
}

function toRepoRel(abs) {
  return (path.relative(root, abs) || abs).replace(/\\/g, "/");
}

/** Vale JSON keys may use OS separators; normalize to absolute paths. */
function resolveValeFileKey(key) {
  const abs = path.isAbsolute(key) ? path.resolve(key) : path.resolve(root, key);
  return abs;
}

function alertKey(fileAbs, alert) {
  const [a, b] = alert.Span || [0, 0];
  return `${toRepoRel(fileAbs)}:${alert.Line}:${a}:${b}:${alert.Check}:${alert.Match}`;
}

/**
 * Strip English possessive ('s / s') only — not a bare plural -s.
 * "amaral's" → "amaral"; "amarals" stays "amarals".
 */
function possessiveStem(match) {
  return String(match ?? "")
    .replace(/['\u2019]s$/i, "")
    .replace(/s['\u2019]$/i, "");
}

/**
 * Session ignore key for --review.
 * Spelling: stem + possessives share a key (ignore "amaral" → also "amaral's").
 * Other checks (grammar, style): exact Match only, so a plural/grammar hit still shows.
 */
function ignoreItemKey(alert) {
  const match = String(alert?.Match ?? "");
  if (isSpellingCheck(alert)) {
    return `spell:${possessiveStem(match).toLowerCase()}`;
  }
  return `exact:${match}`;
}

function ignoreLogLabel(alert) {
  const match = String(alert?.Match ?? "");
  if (isSpellingCheck(alert)) {
    const stem = possessiveStem(match);
    return `${JSON.stringify(stem)} (spelling + possessives)`;
  }
  return JSON.stringify(match);
}

/**
 * Vale vocabularies (vale.ini `Vocab = Site, Batch`). Both survive vale sync.
 * Batch is the current preview batch. corn deploy clears it after preview is on main.
 * Site is the permanent list.
 */
const BATCH_ACCEPT_NOTE =
  "# Words for the current preview batch. corn deploy clears this after preview is on main.";

const VOCAB_FILES = {
  batch: path.join(root, "styles", "config", "vocabularies", "Batch", "accept.txt"),
  site: path.join(root, "styles", "config", "vocabularies", "Site", "accept.txt"),
};

function readAcceptEntries(filePath) {
  /** @type {string[]} */
  const comments = [];
  /** @type {string[]} */
  const words = [];
  if (!fs.existsSync(filePath)) return { comments, words };
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) comments.push(line);
    else words.push(line);
  }
  return { comments, words };
}

/**
 * Persist a Match (sorted, de-duped, lowercase stem for spelling; exact match
 * otherwise). `which` is `batch` or `site`. Returns the word written.
 */
function acceptToVocab(alert, which) {
  const filePath = VOCAB_FILES[which];
  if (!filePath) throw new Error(`unknown vocab ${which}`);
  const match = String(alert?.Match ?? "").trim();
  if (!match) throw new Error("empty Match; nothing to accept");
  const word = isSpellingCheck(alert)
    ? possessiveStem(match).toLowerCase()
    : match.toLowerCase();
  if (!word) throw new Error("empty stem; nothing to accept");

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const { comments, words } = readAcceptEntries(filePath);
  const notes =
    which === "batch" && !comments.some((c) => c.includes("preview batch"))
      ? [BATCH_ACCEPT_NOTE, ...comments]
      : comments;
  const set = new Set(words.map((s) => s.toLowerCase()));
  if (!set.has(word.toLowerCase())) words.push(word);
  words.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  const body = [...notes, ...words];
  fs.writeFileSync(filePath, body.length ? `${body.join("\n")}\n` : "", "utf8");
  return word;
}

/** Cache key: spelling suggestions depend on Check + Match, not span. */
function suggestionCacheKey(alert) {
  return `${alert.Check}\0${alert.Match}\0${alert.Action?.Name ?? ""}`;
}

/** @type {Map<string, string[]>} */
const suggestionCache = new Map();

function spawnValeFix(alert) {
  return new Promise((resolve) => {
    const child = spawn("vale", ["fix", JSON.stringify(alert)], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", () => resolve([]));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve([]);
        return;
      }
      try {
        const parsed = JSON.parse(stdout || "{}");
        resolve(Array.isArray(parsed.suggestions) ? parsed.suggestions : []);
      } catch {
        resolve([]);
      }
    });
  });
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/**
 * Resolve suggestions once per unique Check+Match (parallel).
 * Spelling often needs `vale fix`; other rules usually already have Suggestions.
 */
async function valeSuggestions(alert) {
  if (Array.isArray(alert.Suggestions) && alert.Suggestions.length > 0) {
    return alert.Suggestions;
  }
  const key = suggestionCacheKey(alert);
  if (suggestionCache.has(key)) return suggestionCache.get(key);
  const sugs = await spawnValeFix(alert);
  suggestionCache.set(key, sugs);
  return sugs;
}

async function prefetchSuggestions(alerts) {
  /** @type {Map<string, object>} */
  const unique = new Map();
  for (const alert of alerts) {
    if (Array.isArray(alert.Suggestions) && alert.Suggestions.length > 0) {
      suggestionCache.set(suggestionCacheKey(alert), alert.Suggestions);
      continue;
    }
    const key = suggestionCacheKey(alert);
    if (suggestionCache.has(key) || unique.has(key)) continue;
    unique.set(key, alert);
  }
  const pending = [...unique.entries()];
  if (pending.length === 0) return;
  process.stdout.write(
    `  resolving ${pending.length} unique suggestion(s)…`,
  );
  await mapPool(pending, VALE_FIX_CONCURRENCY, async ([key, alert]) => {
    const sugs = await spawnValeFix(alert);
    suggestionCache.set(key, sugs);
  });
  process.stdout.write(" done\n");
}

/** Suggestions already fetched for this alert, including an empty list. */
function resolvedSuggestions(alert) {
  const key = suggestionCacheKey(alert);
  if (suggestionCache.has(key)) return suggestionCache.get(key);
  if (Array.isArray(alert.Suggestions) && alert.Suggestions.length > 0) {
    return alert.Suggestions;
  }
  return [];
}

function parseValeJson(relFiles) {
  const r = spawnSync(
    "vale",
    ["--output=JSON", "--no-exit", ...relFiles],
    { cwd: root, encoding: "utf8" },
  );
  if (r.error) throw r.error;
  try {
    return JSON.parse(r.stdout || "{}");
  } catch (err) {
    throw new Error(`vale JSON parse failed: ${err.message}`);
  }
}

function flattenValeAlerts(data) {
  /** @type {{ fileAbs: string, rel: string, alert: object }[]} */
  const out = [];
  for (const [key, alerts] of Object.entries(data)) {
    if (!Array.isArray(alerts)) continue;
    const fileAbs = resolveValeFileKey(key);
    const rel = toRepoRel(fileAbs);
    for (const alert of alerts) out.push({ fileAbs, rel, alert });
  }
  out.sort((x, y) => {
    const c = x.rel.localeCompare(y.rel);
    if (c) return c;
    if (x.alert.Line !== y.alert.Line) return x.alert.Line - y.alert.Line;
    return (x.alert.Span?.[0] ?? 0) - (y.alert.Span?.[0] ?? 0);
  });
  return out;
}

async function collectFixableAlerts(relFiles) {
  const data = parseValeJson(relFiles);
  const withAction = flattenValeAlerts(data).filter(
    ({ alert }) => alert?.Action?.Name,
  );
  await prefetchSuggestions(withAction.map((x) => x.alert));
  return withAction.filter(
    ({ alert }) => !isCaseOnlySpellingAlert(alert, resolvedSuggestions(alert)),
  );
}

/** Run Vale, drop case-only spelling, print the rest (corn edit default path). */
async function runValeFiltered(relFiles) {
  console.log(
    `\n> vale --output=JSON (filter case-only spelling) ${relFiles.join(" ")}`,
  );
  const data = parseValeJson(relFiles);
  const all = flattenValeAlerts(data);
  const spelling = all.filter(({ alert }) => isSpellingCheck(alert));
  await prefetchSuggestions(spelling.map((x) => x.alert));

  let caseOnly = 0;
  const kept = [];
  for (const item of all) {
    if (isCaseOnlySpellingAlert(item.alert, resolvedSuggestions(item.alert))) {
      caseOnly++;
      continue;
    }
    kept.push(item);
  }
  if (caseOnly > 0) {
    console.log(
      `(skipped ${caseOnly} spelling alert(s) that only differ by case — house lowercase)`,
    );
  }
  for (const { rel, alert } of kept) {
    const col = alert.Span?.[0] ?? 1;
    console.log(
      `${rel}:${alert.Line}:${col}: ${alert.Severity}: ${alert.Check}: ${alert.Message}`,
    );
  }
  if (kept.length === 0) {
    console.log("No Vale alerts (after case-only spelling filter).");
  }
  const hasError = kept.some((x) => x.alert.Severity === "error");
  return hasError ? 1 : 0;
}

/** Span is 1-based inclusive on the line. */
function applyReplacement(fileAbs, lineNo, span, replacement) {
  const raw = fs.readFileSync(fileAbs, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const i = lineNo - 1;
  if (i < 0 || i >= lines.length) {
    throw new Error(`Line ${lineNo} out of range in ${toRepoRel(fileAbs)}`);
  }
  const [start, end] = span;
  if (!start || !end || start < 1 || end < start) {
    throw new Error(`Bad Span ${JSON.stringify(span)}`);
  }
  const line = lines[i];
  lines[i] = line.slice(0, start - 1) + replacement + line.slice(end);
  fs.writeFileSync(fileAbs, lines.join(nl));
}

function contextSnippet(fileAbs, lineNo, span, width = 48) {
  const raw = fs.readFileSync(fileAbs, "utf8");
  const line = raw.split(/\r?\n/)[lineNo - 1] ?? "";
  const [start, end] = span;
  const a = Math.max(0, start - 1 - 20);
  const b = Math.min(line.length, end + 20);
  let snip = line.slice(a, b);
  if (a > 0) snip = "…" + snip;
  if (b < line.length) snip = snip + "…";
  if (snip.length > width) snip = snip.slice(0, width - 1) + "…";
  return snip;
}

function ask(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => resolve(String(ans || "").trim()));
  });
}

function filterReviewQueue(queue, skipped, ignoredItems) {
  return queue.filter((item) => {
    if (skipped.has(alertKey(item.fileAbs, item.alert))) return false;
    if (ignoredItems.has(ignoreItemKey(item.alert))) return false;
    return true;
  });
}

/**
 * Walk fixable Vale alerts top-to-bottom. y/n (or 1–N) each.
 * Re-lints only the edited file after an apply (not the whole set every time).
 * `i` ignores this Match for the rest of this review run (all repeats).
 */
async function reviewFixable(relFiles) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      "corn edit's Vale picker needs an interactive terminal (TTY). Pass --report for report-only.",
    );
    return 2;
  }

  const skipped = new Set();
  /** @type {Set<string>} Match strings ignored for this review instance */
  const ignoredItems = new Set();
  let applied = 0;
  let skippedN = 0;
  let ignoredN = 0;
  let acceptedN = 0;
  let quit = false;

  function takeAccept(alert, which) {
    try {
      const word = acceptToVocab(alert, which);
      ignoredItems.add(ignoreItemKey(alert));
      acceptedN++;
      const rel =
        which === "site"
          ? "styles/config/vocabularies/Site/accept.txt"
          : "styles/config/vocabularies/Batch/accept.txt";
      console.log(`  accepted ${JSON.stringify(word)} → ${rel}`);
      return true;
    } catch (err) {
      console.error(`  accept failed: ${err.message}`);
      return false;
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`
Review fixable Vale alerts (Action set; case-only spelling already filtered).
  y / Enter   apply the only suggestion (or #1)
  1–N         pick a suggestion
  n / s       skip this one only
  i           ignore this match for the rest of this run (all repeats;
              spelling also covers possessives: amaral → amaral's)
  a           accept into the batch list for this preview batch
              (styles/config/vocabularies/Batch/accept.txt)
              and ignore for the rest of this run
  p           accept into the permanent Site list
              (styles/config/vocabularies/Site/accept.txt)
              and ignore for the rest of this run
  q           quit review
`);

  try {
    console.log("Loading alerts…");
    let queue = await collectFixableAlerts(relFiles);

    while (!quit) {
      const pending = filterReviewQueue(queue, skipped, ignoredItems);
      if (pending.length === 0) {
        console.log(
          queue.length === 0
            ? "\nNo fixable Vale alerts."
            : "\nNo more fixable alerts to review.",
        );
        break;
      }

      const item = pending[0];
      const { fileAbs, rel, alert } = item;
      const key = alertKey(fileAbs, alert);
      const suggestions = await valeSuggestions(alert);
      if (isCaseOnlySpellingAlert(alert, suggestions)) {
        skipped.add(key);
        continue;
      }
      const snip = contextSnippet(fileAbs, alert.Line, alert.Span);

      console.log(`\n[${pending.length} left] ${rel}:${alert.Line}`);
      console.log(`  ${alert.Severity}  ${alert.Check}`);
      console.log(`  ${alert.Message}`);
      console.log(`  match: ${JSON.stringify(alert.Match)}`);
      console.log(`  … ${snip}`);

      if (suggestions.length === 0) {
        console.log("  (no auto-fix suggestion from vale fix)");
        const ans = (
          await ask(rl, "  [Enter=skip, i=ignore, a=batch, p=permanent, q=quit] ")
        ).toLowerCase();
        if (ans === "q") {
          quit = true;
          break;
        }
        if (ans === "i") {
          ignoredItems.add(ignoreItemKey(alert));
          ignoredN++;
          console.log(`  ignoring ${ignoreLogLabel(alert)} for this run`);
          continue;
        }
        if (ans === "a" || ans === "p") {
          if (!takeAccept(alert, ans === "p" ? "site" : "batch")) {
            skipped.add(key);
            skippedN++;
          }
          continue;
        }
        skipped.add(key);
        skippedN++;
        continue;
      }

      if (suggestions.length === 1) {
        console.log(`  → ${JSON.stringify(suggestions[0])}`);
      } else {
        suggestions.forEach((s, i) => {
          console.log(`  ${i + 1}) ${JSON.stringify(s)}`);
        });
      }

      const hint =
        suggestions.length === 1
          ? "y/Enter=apply, n=skip, i=ignore, a=batch, p=permanent, q=quit"
          : `1-${suggestions.length}=pick, n=skip, i=ignore, a=batch, p=permanent, q=quit`;
      const ans = (await ask(rl, `  [${hint}] `)).toLowerCase();

      if (ans === "q") {
        quit = true;
        break;
      }
      if (ans === "i") {
        ignoredItems.add(ignoreItemKey(alert));
        ignoredN++;
        console.log(`  ignoring ${ignoreLogLabel(alert)} for this run`);
        continue;
      }
      if (ans === "a" || ans === "p") {
        if (!takeAccept(alert, ans === "p" ? "site" : "batch")) {
          skipped.add(key);
          skippedN++;
        }
        continue;
      }
      if (ans === "n" || ans === "s") {
        skipped.add(key);
        skippedN++;
        continue;
      }

      let pick = null;
      if (ans === "" || ans === "y") {
        pick = suggestions[0];
      } else if (/^\d+$/.test(ans)) {
        const idx = Number(ans) - 1;
        if (idx < 0 || idx >= suggestions.length) {
          console.log("  invalid number; try again.");
          continue;
        }
        pick = suggestions[idx];
      } else {
        console.log("  unrecognized; try again.");
        continue;
      }

      try {
        applyReplacement(fileAbs, alert.Line, alert.Span, pick);
        applied++;
        console.log(`  applied → ${JSON.stringify(pick)}`);
        // Only re-lint this file so later spans stay correct.
        const fileRel = path.relative(root, fileAbs) || fileAbs;
        const refreshed = await collectFixableAlerts([fileRel]);
        queue = [
          ...queue.filter((x) => x.fileAbs !== fileAbs),
          ...refreshed,
        ].sort((x, y) => {
          const c = x.rel.localeCompare(y.rel);
          if (c) return c;
          if (x.alert.Line !== y.alert.Line) return x.alert.Line - y.alert.Line;
          return (x.alert.Span?.[0] ?? 0) - (y.alert.Span?.[0] ?? 0);
        });
      } catch (err) {
        console.error(`  apply failed: ${err.message}`);
        skipped.add(key);
        skippedN++;
      }
    }
  } finally {
    rl.close();
  }

  console.log(
    `\nReview done: ${applied} applied, ${skippedN} skipped, ${ignoredN} ignore-item(s), ${acceptedN} accepted.`,
  );
  return 0;
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
    console.log(`Usage: corn edit [--name.md | path…] [options]

Lint markdown under content/ only (Vale + be-density).
Default: interactive Vale picker (same as former --fix).

  corn edit                         prompt for content/blog/<name> + picker
  corn edit --all                   all markdown under content/ + picker
  corn edit --report --blog/post    report-only Vale (no picker)
  corn edit --read-me.md            content/read-me.md
  corn edit --blog/your-post        content/blog/your-post/
  corn edit content/blog/your-post  same (positional must stay under content/)

  --all            sweep all content markdown
  --skip-sync      skip vale sync
  --vale-only      Vale only
  --density-only   be-density only (implies no picker)
  --fix/--review  explicit picker (default; optional)
  --report         report-only Vale (not corn md --fix)

Spelling alerts that only differ by case (illinois vs Illinois) are dropped;
real typos stay.`);
    process.exit(0);
  }

  if (opts.densityOnly) {
    opts.review = false;
  }

  if (opts.all && opts.targets.length) {
    console.error("Pass --all alone, or pass a path — not both.");
    process.exit(2);
  }

  if (!opts.all && opts.targets.length === 0) {
    try {
      opts.targets.push(await promptBlogTarget());
    } catch (err) {
      console.error(err.message);
      process.exit(2);
    }
  }

  let files;
  try {
    files = collectMarkdown(opts.targets, { all: opts.all });
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (files.length === 0) {
    console.log("No markdown files found under content/.");
    process.exit(0);
  }

  const relFiles = files.map((f) => path.relative(root, f) || f);
  console.log(
    `${opts.review ? "Reviewing" : "Editing"} ${relFiles.length} file(s) under content/`,
  );
  let code = 0;

  if (!opts.densityOnly) {
    const vale = whichVale();
    if (!vale) {
      console.error(
        "vale not found on PATH. Install with winget/scoop/choco, then re-run corn edit.",
      );
      process.exit(2);
    }

    if (!opts.skipSync && !packsPresent()) {
      const syncCode = run("vale", ["sync"]);
      if (syncCode !== 0) {
        console.error(
          "vale sync failed; fix network/config or pass --skip-sync.",
        );
        process.exit(syncCode);
      }
    }

    if (opts.review) {
      const reviewCode = await reviewFixable(relFiles);
      if (reviewCode !== 0) process.exit(reviewCode);
    } else {
      const valeCode = await runValeFiltered(relFiles);
      if (valeCode !== 0) code = valeCode;
    }
  }

  if (!opts.valeOnly) {
    if (!fs.existsSync(densityBin)) {
      console.error(`Missing ${path.relative(root, densityBin)}`);
      process.exit(2);
    }
    const depCode = ensureDensityDeps();
    if (depCode !== 0) process.exit(depCode);

    const densCode = run(process.execPath, [densityBin, ...relFiles]);
    if (densCode !== 0) code = densCode;
  }

  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
