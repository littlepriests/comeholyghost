#!/usr/bin/env node
/**
 * Site tests (tests/).
 *
 *   corn test               unit tests + browser behavior tests (what CI runs)
 *   corn test --unit        unit tests only (no browser, no Hugo)
 *   corn test --visual      screenshot comparisons against tests/e2e/__screenshots__/
 *   corn test --update      re-record those screenshots after an intentional look change
 *   corn test --all         everything above except --update
 *
 * First run installs tests/node_modules and Playwright's Chromium.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");
const FLAGS = new Set(["--unit", "--visual", "--update", "--all"]);

// npm/npx are .cmd shims on Windows, so they need a shell there; every arg here is a fixed literal.
function run(cmd, args) {
  const opts = { cwd: testsDir, stdio: "inherit" };
  const r =
    process.platform === "win32"
      ? spawnSync([cmd, ...args].join(" "), { ...opts, shell: true })
      : spawnSync(cmd, args, opts);
  return r.status ?? 1;
}

function ensureDeps() {
  if (fs.existsSync(path.join(testsDir, "node_modules", "@playwright", "test"))) return;
  console.log("Installing test deps (first run)…");
  if (run("npm", ["ci"]) !== 0) process.exit(1);
  if (run("npx", ["playwright", "install", "chromium"]) !== 0) process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: corn test [--unit | --visual | --update | --all]

  (none)     unit + browser behavior tests (what CI runs)
  --unit     unit tests only (no browser, no Hugo)
  --visual   screenshot comparisons (local only; fonts differ by OS)
  --update   re-record screenshots after an intentional look change, then commit them
  --all      unit + behavior + screenshots`);
    process.exit(0);
  }
  const unknown = args.filter((a) => !FLAGS.has(a));
  if (unknown.length) {
    console.error(`Unknown test flag(s): ${unknown.join(" ")}`);
    process.exit(2);
  }

  const all = args.includes("--all");
  const steps = [];
  if (args.includes("--update")) {
    steps.push(["playwright", "test", "--grep", "@visual", "--update-snapshots"]);
  } else {
    const only = args.filter((a) => a !== "--all");
    const want = (flag) => all || only.includes(flag) || (!only.length && flag !== "--visual");
    if (want("--unit")) steps.push(["node", "--test", "unit/**/*.test.mjs"]);
    if (want("--behavior")) steps.push(["playwright", "test", "--grep-invert", "@visual"]);
    if (want("--visual")) steps.push(["playwright", "test", "--grep", "@visual"]);
  }

  if (steps.some((s) => s[0] === "playwright")) ensureDeps();

  for (const [cmd, ...rest] of steps) {
    const status = cmd === "playwright" ? run("npx", [cmd, ...rest]) : run(cmd, rest);
    if (status !== 0) process.exit(status);
  }
}

main();
