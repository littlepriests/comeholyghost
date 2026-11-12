#!/usr/bin/env node
/**
 * Local Hugo preview server.
 *
 *   corn run [extra hugo args…]
 *   corn run --cache            wipe resources/_gen, then server with --ignoreCache
 *   node scripts/run-hugo.mjs
 *
 * Default: hugo server -D --disableFastRender --navigateToChanged
 * Extra args are appended (e.g. corn run --bind 0.0.0.0).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULTS = ["server", "-D", "--disableFastRender", "--navigateToChanged"];

function rmDir(dir) {
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

function clearHugoCaches() {
  const targets = [
    path.join(root, "resources", "_gen"),
    path.join(root, ".hugo_build.lock"),
  ];
  let any = false;
  for (const t of targets) {
    try {
      if (!fs.existsSync(t)) continue;
      const st = fs.statSync(t);
      if (st.isDirectory()) {
        if (rmDir(t)) {
          console.log(`cleared ${path.relative(root, t)}/`);
          any = true;
        }
      } else {
        fs.unlinkSync(t);
        console.log(`cleared ${path.relative(root, t)}`);
        any = true;
      }
    } catch (error) {
      console.warn(`could not clear ${path.relative(root, t)}: ${error.message}`);
    }
  }
  if (!any) console.log("no local Hugo cache to clear (resources/_gen already empty)");
}

function main() {
  const raw = process.argv.slice(2);
  if (raw.includes("--help") || raw.includes("-h")) {
    console.log(`Usage: corn run [options] [extra hugo args…]

Starts: hugo server -D --disableFastRender --navigateToChanged
Open http://localhost:1313/

Options (handled by corn, not passed through unless noted):
  --cache   Delete resources/_gen (+ .hugo_build.lock) and add --ignoreCache

Extra hugo args pass through (e.g. corn run --bind 0.0.0.0).
  corn run --cache --bind 0.0.0.0`);
    process.exit(0);
  }

  const clearCache = raw.includes("--cache");
  const extra = raw.filter((a) => a !== "--cache");
  if (clearCache) {
    clearHugoCaches();
    if (!extra.includes("--ignoreCache")) extra.unshift("--ignoreCache");
  }

  const args = [...DEFAULTS, ...extra];
  console.log(`> hugo ${args.join(" ")}`);
  const r = spawnSync("hugo", args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.error && r.error.code === "ENOENT") {
    console.error("hugo not found on PATH. Install Hugo, then re-run corn run.");
    process.exit(2);
  }
  process.exit(r.status ?? 1);
}

main();
