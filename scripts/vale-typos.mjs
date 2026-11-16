#!/usr/bin/env node
/**
 * Fail only on real misspellings in lines added since a base commit.
 * House-style case ("illinois" vs "Illinois") is not a typo.
 * Style rules (write-good, Voices, wraith) are ignored.
 *
 *   node scripts/vale-typos.mjs --base <sha>
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  return spawnSync("git", args, { cwd: root, encoding: "utf8" });
}

function vale(args) {
  return spawnSync("vale", args, { cwd: root, encoding: "utf8" });
}

export function isSpellingCheck(alert) {
  const check = String(alert?.Check ?? "");
  return check === "Vale.Spelling" || /\.Spelling$/i.test(check);
}

/** True when every useful suggestion is the same letters in another case. */
export function isCaseOnlySpellingAlert(alert, suggestions) {
  if (!isSpellingCheck(alert)) return false;
  const match = String(alert.Match ?? "");
  if (!match) return false;
  const sugs = suggestions ?? alert.Suggestions ?? [];
  if (!sugs.length) return false;
  const lower = match.toLowerCase();
  // Vale also offers unrelated guesses ("illinois" → "pollinosis").
  // One case-only suggestion is enough to call it capitalization.
  return sugs.some((s) => {
    const t = String(s);
    return t.toLowerCase() === lower && t !== match;
  });
}

function suggestionsFor(alert) {
  if (Array.isArray(alert.Suggestions) && alert.Suggestions.length > 0) {
    return alert.Suggestions;
  }
  const r = vale(["fix", JSON.stringify(alert)]);
  if (r.status !== 0 || !r.stdout) return [];
  try {
    const parsed = JSON.parse(r.stdout);
    return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  } catch {
    return [];
  }
}

function addedLines(base) {
  const r = git(["diff", "-U0", "--no-color", base, "HEAD", "--", "content"]);
  if (r.status !== 0) {
    throw new Error((r.stderr || "git diff failed").trim());
  }
  /** @type {Map<string, Set<number>>} */
  const map = new Map();
  let file = null;
  for (const line of r.stdout.split(/\n/)) {
    if (line.startsWith("+++ b/")) {
      file = line.slice("+++ b/".length).replace(/\\/g, "/");
      if (!map.has(file)) map.set(file, new Set());
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk || !file) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const lines = map.get(file);
    for (let i = 0; i < count; i++) lines.add(start + i);
  }
  return map;
}

function repoRel(fileKey) {
  const norm = String(fileKey).replace(/\\/g, "/");
  const idx = norm.toLowerCase().lastIndexOf("/content/");
  if (idx >= 0) return norm.slice(idx + 1);
  if (norm.startsWith("content/")) return norm;
  return norm;
}

function parseBase(argv) {
  const i = argv.indexOf("--base");
  if (i < 0 || !argv[i + 1]) {
    throw new Error("Usage: node scripts/vale-typos.mjs --base <sha>");
  }
  const base = argv[i + 1];
  if (/^0+$/.test(base)) {
    const empty = spawnSync("git", ["hash-object", "-t", "tree", "--stdin"], {
      cwd: root,
      encoding: "utf8",
      input: "",
    });
    // hash-object --stdin with empty stdin is the empty tree
    if (empty.status !== 0 || !empty.stdout.trim()) {
      throw new Error("could not resolve an empty tree for a new branch");
    }
    return empty.stdout.trim();
  }
  const ok = git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  if (ok.status !== 0) throw new Error(`base commit not found: ${base}`);
  return ok.stdout.trim();
}

function main() {
  const base = parseBase(process.argv.slice(2));
  const lines = addedLines(base);
  const files = [...lines.keys()].filter((f) => lines.get(f).size > 0);
  if (files.length === 0) {
    console.log("No added content lines. No misspellings to check.");
    return 0;
  }

  const run = vale(["--output=JSON", "--no-exit", ...files]);
  if (run.error) throw run.error;
  if (run.status !== 0 && !run.stdout) {
    throw new Error((run.stderr || "vale failed").trim());
  }
  let data;
  try {
    data = JSON.parse(run.stdout || "{}");
  } catch (err) {
    throw new Error(`vale JSON parse failed: ${err.message}`);
  }

  const typos = [];
  for (const [key, alerts] of Object.entries(data)) {
    if (!Array.isArray(alerts)) continue;
    const rel = repoRel(key);
    const added = lines.get(rel);
    if (!added) continue;
    for (const alert of alerts) {
      if (!isSpellingCheck(alert)) continue;
      if (!added.has(alert.Line)) continue;
      const sugs = suggestionsFor(alert);
      if (isCaseOnlySpellingAlert(alert, sugs)) continue;
      typos.push({ rel, alert, sugs });
    }
  }

  if (typos.length === 0) {
    console.log("No misspellings in added lines.");
    return 0;
  }
  for (const { rel, alert, sugs } of typos) {
    const hint = sugs.length ? ` → ${sugs.slice(0, 3).join(", ")}` : "";
    console.error(
      `${rel}:${alert.Line}: ${alert.Check}: ${JSON.stringify(alert.Match)}${hint}`,
    );
  }
  console.error(`${typos.length} misspelling(s).`);
  return 1;
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  try {
    process.exit(main());
  } catch (err) {
    console.error(err.message || err);
    process.exit(2);
  }
}
