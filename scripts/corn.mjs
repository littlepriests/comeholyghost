#!/usr/bin/env node
/**
 * Site CLI: corn <command> …
 *
 *   corn run [hugo args…]   hugo server -D --disableFastRender --navigateToChanged
 *   corn run --cache        wipe resources/_gen, then server with --ignoreCache
 *   corn compress [path…]   in-place WebP recompress (lean repo masters)
 *   corn edit [path…]       Vale + be-density prose check
 *   corn md [path…]         markdownlint + 80-col wrap
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
};

function usage() {
  console.log(`Usage: corn <command> [args]

Commands:
  run [hugo args…]   Local Hugo server (http://localhost:1313/)
  run --cache        Clear resources/_gen + --ignoreCache, then server
  compress [path…]   Recompress images in place (default: content/blog)
  edit [path…]       Vale + be-density on markdown (default: content/)
  md [path…]         markdownlint + wrap prose to 80 cols (content/)
  help               Show this help

Examples:
  corn run
  corn run --cache
  corn compress content/blog/crossroad-beauty
  corn compress --dry-run
  corn edit --read-me.md
  corn edit --blog/crossroad-beauty
  corn edit --vale-only
  corn edit --review --blog/crossroad-beauty
  corn md --blog/crossroad-beauty
  corn md --fix --blog/crossroad-beauty`);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    usage();
    process.exit(0);
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
