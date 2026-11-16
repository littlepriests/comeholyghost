#!/usr/bin/env node
/**
 * Site CLI: corn <command> …
 *
 * Writer (personal / writing machine):
 *   corn run | edit | md | compress | email
 *
 * Ship (deploy machine):
 *   writer cmds + corn update | branch | add | push | deploy
 *
 * Install (PowerShell, any cwd):  powershell -File scripts/install-corn.ps1
 * Or from the repo root:          .\corn help
 *                                 node scripts\corn.mjs help
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const COMMANDS = {
  run: "run-hugo.mjs",
  compress: "compress-post-images.mjs",
  edit: "edit-prose.mjs",
  md: "lint-markdown.mjs",
  email: "preview-emails.mjs",
  update: "update-deps.mjs",
};

const GIT_FLOW = new Set(["branch", "add", "push", "deploy"]);

/** Scripts that need scripts/node_modules (sharp, markdownlint, …). */
const NEEDS_SCRIPTS_DEPS = new Set(["compress", "md"]);

function usage() {
  console.log(`Usage: corn <command> [args]

Two machine profiles (same binary; pick the commands you need):

  Writer — personal / writing machine
    run, edit, md, compress, email

  Ship — deploy machine (this repo’s usual git/Netlify box)
    everything in Writer, plus update, branch, add, push, deploy

Install (PowerShell, once per machine)
  From the repo root:
    powershell -File scripts/install-corn.ps1
    . $PROFILE
    corn help
  Also once:  npm install --prefix scripts
  Without install:  .\\corn help   or   node scripts\\corn.mjs help

Writer
  run [hugo args…]   Dev server at http://localhost:1313/
  run --cache        Wipe Hugo image cache, then server (stale thumbs)
  compress [path…]   In-place WebP recompress (default: content/blog)
  edit [path…]       Vale + be-density prose check (default: content/)
  edit --fix …      Interactive Vale picker (alias of --review)
  edit --review …    Same as --fix: y/n (or 1–N) each fixable alert
  md [path…]         markdownlint + report lines over 80 cols
  md --fix …         Structure only: wrap prose to 80 + markdownlint --fix
                     (does NOT run Vale — use corn edit --fix for that)
  email              Rebuild newsletter HTML under emails/preview/
  email --watch      Rebuild when emails/ or templates change

Ship
  update             npm update in ./, scripts/, tools/be-density/
  update --latest    Bump package.json ranges to newest + reinstall
  update --dry-run   List outdated packages only
  branch             Start update-MMDDYY from preview (after folding main in)
  add                Sync preview←main, stage, prompt commit, push -u branch
  push               Push branch + open/reuse PR into preview (Deploy Preview)
  deploy             If preview checks are green, merge preview → main (live)
  deploy --pr-only   Open release PR only; you merge in GitHub
  deploy --dry-run   Print what deploy would do

Typical ship: corn branch → edit → corn add → corn push → merge PR on
GitHub into preview → poke the Deploy Preview → corn deploy when ready.

Examples:
  corn run
  corn edit --fix --blog/crossroad-beauty
  corn md --fix --blog/crossroad-beauty
  corn email --watch
  corn branch && corn add && corn push
  corn deploy --pr-only`);
}

function warnMissingScriptsDeps(cmd) {
  if (!NEEDS_SCRIPTS_DEPS.has(cmd)) return;
  const marker = path.join(here, "node_modules");
  if (fs.existsSync(marker)) return;
  console.error(
    `[corn] scripts/node_modules missing. From the repo root run:\n` +
      `  npm install --prefix scripts\n` +
      `(needed for corn ${cmd})\n`
  );
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    usage();
    process.exit(0);
  }

  if (GIT_FLOW.has(cmd)) {
    const r = spawnSync(
      process.execPath,
      [path.join(here, "git-flow.mjs"), cmd, ...rest],
      { stdio: "inherit", cwd: root }
    );
    process.exit(r.status ?? 1);
  }

  const script = COMMANDS[cmd];
  if (!script) {
    console.error(`Unknown command: ${cmd}\n`);
    usage();
    process.exit(2);
  }

  warnMissingScriptsDeps(cmd);

  const r = spawnSync(process.execPath, [path.join(here, script), ...rest], {
    stdio: "inherit",
    cwd: root,
  });
  process.exit(r.status ?? 1);
}

main();
