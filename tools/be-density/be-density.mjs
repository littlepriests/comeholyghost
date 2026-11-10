#!/usr/bin/env node
/**
 * Real verb-share check (POS-tagged), not Vale-native.
 *
 * Counts tokens tagged VB* via wink-pos-tagger. A verb counts as a be-verb
 * when its lemma is "be" (am/is/are/was/were/be/been/being).
 *
 * Flags a file when be-verbs / all-verbs > threshold (default 0.5).
 *
 * Usage:
 *   node be-density.mjs [--threshold 0.5] [--min-verbs 20] [--json] <files...>
 *
 * Copy into a repo as tools/be-density/ (or similar). Not for styles/config/scripts/
 * (that path is Vale Tengo only).
 */

import fs from "node:fs";
import path from "node:path";
import posTagger from "wink-pos-tagger";

const tagger = posTagger();

const VERB_POS = new Set(["VB", "VBD", "VBG", "VBN", "VBP", "VBZ"]);

function parseArgs(argv) {
  const opts = { threshold: 0.5, minVerbs: 20, json: false, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--threshold") opts.threshold = Number(argv[++i]);
    else if (a === "--min-verbs") opts.minVerbs = Number(argv[++i]);
    else if (a === "--json") opts.json = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a.startsWith("-")) throw new Error(`Unknown flag: ${a}`);
    else opts.files.push(a);
  }
  return opts;
}

/** Strip markup so the tagger mostly sees prose. */
function toProse(src) {
  let s = src;
  s = s.replace(/^---[\s\S]*?---\r?\n/, "\n"); // YAML front matter
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`[^`]+`/g, " ");
  s = s.replace(/\{\{[%<][\s\S]*?[%/>]\}\}/g, " "); // Hugo shortcodes
  s = s.replace(/!\[[^\]]*]\([^)]+\)/g, " ");
  s = s.replace(/\[([^\]]+)]\([^)]+\)/g, "$1");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/^\s*>\s?/gm, "");
  s = s.replace(/^\s*[-*+]\s+/gm, "");
  s = s.replace(/^\s*\d+\.\s+/gm, "");
  s = s.replace(/[*_~]+/g, "");
  s = s.replace(/<\/?[^>]+>/g, " ");
  return s;
}

function sentences(prose) {
  return prose
    .split(/(?<=[.!?])\s+|\n+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function countVerbs(prose) {
  let verbs = 0;
  let be = 0;
  const beExamples = [];

  for (const sentence of sentences(prose)) {
    let tagged;
    try {
      tagged = tagger.tagSentence(sentence);
    } catch {
      continue;
    }
    for (const tok of tagged) {
      if (!VERB_POS.has(tok.pos)) continue;
      verbs += 1;
      if (tok.lemma === "be") {
        be += 1;
        if (beExamples.length < 8) beExamples.push(tok.value);
      }
    }
  }
  return { verbs, be, beExamples };
}

function analyzeFile(file, opts) {
  const raw = fs.readFileSync(file, "utf8");
  const { verbs, be, beExamples } = countVerbs(toProse(raw));
  const ratio = verbs === 0 ? 0 : be / verbs;
  const skipped = verbs < opts.minVerbs;
  const failed = !skipped && ratio > opts.threshold;
  return {
    file,
    verbs,
    be,
    ratio,
    threshold: opts.threshold,
    minVerbs: opts.minVerbs,
    skipped,
    failed,
    beExamples,
  };
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (opts.help || opts.files.length === 0) {
    console.log(`Usage: node be-density.mjs [--threshold 0.5] [--min-verbs 20] [--json] <files...>

POS-tags prose and flags a file when (be-verbs / verbs) > threshold.
Be-verbs are tokens with lemma "be" (am/is/are/was/were/be/been/being).
Files with fewer than --min-verbs verbs are skipped.`);
    process.exit(opts.help ? 0 : 2);
  }

  const results = opts.files.map((f) => analyzeFile(path.resolve(f), opts));

  if (opts.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      const pct = (r.ratio * 100).toFixed(1);
      const budget = (r.threshold * 100).toFixed(0);
      if (r.skipped) {
        console.log(
          `${r.file}: skip (${r.be}/${r.verbs} be/verb; need ≥ ${r.minVerbs} verbs)`,
        );
      } else if (r.failed) {
        const ex = r.beExamples.length ? ` e.g. ${r.beExamples.join(", ")}` : "";
        console.log(
          `${r.file}:1:1: warning: be-verbs are ${pct}% of verbs (${r.be}/${r.verbs}); budget is ${budget}%.${ex}`,
        );
      } else {
        console.log(
          `${r.file}: ok (${pct}% be-verbs; ${r.be}/${r.verbs})`,
        );
      }
    }
  }

  process.exit(results.some((r) => r.failed) ? 1 : 0);
}

main();
