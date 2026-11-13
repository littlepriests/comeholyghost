#!/usr/bin/env node
/**
 * Site CLI: corn <command> …
 *
 *   corn run [hugo args…]   hugo server -D --disableFastRender --navigateToChanged
 *   corn run --cache        wipe resources/_gen, then server with --ignoreCache
 *   corn compress [path…]   in-place WebP recompress (lean repo masters)
 *   corn edit [path…]       Vale + be-density prose check
 *   corn md [path…]         markdownlint + 80-col wrap
 *   corn email              rebuild emails/preview (newsletter templates)
 *   corn update [--latest]  npm update site package roots (public registry)
 *   corn branch             update-MMDDYY from preview
 *   corn add                sync preview←main, stage, commit, push -u
 *   corn push               push + PR into preview
 *   corn deploy             preview → main when checks green
 *   corn help
 *
 * Install a shell alias (PowerShell):  powershell -File scripts/install-corn.ps1
 * Or from the repo root:               .\corn compress
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const COMMANDS = {
  run: "run-hugo.mjs",
  compress: "compress-post-images.mjs",
  edit: "edit-prose.mjs",
  md: "lint-markdown.mjs",
  email: "preview-emails.mjs",
  update: "update-deps.mjs",
};

const GIT_FLOW = new Set(["branch", "add", "push", "deploy"]);

function usage() {
  console.log(`Usage: corn <command> [args]

Local site
  run [hugo args…]   Dev server at http://localhost:1313/
  run --cache        Wipe Hugo image cache, then server (stale thumbs)

Content / assets
  compress [path…]   In-place WebP recompress (default: content/blog)
  edit [path…]       Vale + be-density prose check (default: content/)
  md [path…]         markdownlint + wrap prose to 80 cols
  email              Rebuild newsletter HTML under emails/preview/

Deps
  update             npm update in ./, scripts/, tools/be-density/
  update --latest    Bump package.json ranges to newest + reinstall
  update --dry-run   List outdated packages only

Git (remote: personal → littlepriests/comeholyghost)
  Netlify Deploy Previews / preview branch = free to build; visit URLs to
  test. Production (main) costs deploy credits — only via corn deploy.

  branch             Start update-MMDDYY from preview (after folding main in)
  add                Sync preview←main, stage, prompt commit, push -u branch
  push               Push branch + open/reuse PR into preview (Deploy Preview)
  deploy             If preview checks are green, merge preview → main (live)
  deploy --pr-only   Open release PR only; you merge in GitHub
  deploy --dry-run   Print what deploy would do

  help               Show this help

Typical ship: corn branch → edit → corn add → corn push → merge PR on
GitHub into preview → poke the Deploy Preview → corn deploy when ready.

Examples:
  corn run
  corn run --cache
  corn compress content/blog/crossroad-beauty
  corn edit --blog/crossroad-beauty
  corn md --fix --blog/crossroad-beauty
  corn email
  corn update --dry-run
  corn branch && corn add && corn push
  corn deploy --pr-only`);
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
      { stdio: "inherit" }
    );
    process.exit(r.status ?? 1);
  }

  const script = COMMANDS[cmd];
  if (!script) {
    console.error(`Unknown command: ${cmd}\n`);
    usage();
    process.exit(2);
  }

  const r = spawnSync(process.execPath, [path.join(here, script), ...rest], {
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

main();
