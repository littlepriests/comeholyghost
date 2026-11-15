#!/usr/bin/env node
/**
 * Update npm dependencies for this personal site (public registry only).
 *
 *   corn update           npm update in each package root (within semver ranges)
 *   corn update --latest  bump package.json to newest and reinstall (majors ok)
 *   corn update --dry-run show outdated only
 *
 * Package roots: repo /, scripts/, tools/be-density/
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const PACKAGE_DIRS = [
  { dir: root, label: "." },
  { dir: path.join(root, "scripts"), label: "scripts" },
  { dir: path.join(root, "tools", "be-density"), label: "tools/be-density" },
];

const args = new Set(process.argv.slice(2));
const latest = args.has("--latest");
const dryRun = args.has("--dry-run") || args.has("-n");

function run(cmd, argv, cwd) {
  const r = spawnSync(cmd, argv, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      npm_config_registry: "https://registry.npmjs.org/",
    },
  });
  return r.status ?? 1;
}

function assertPublicLock(dir) {
  const lock = path.join(dir, "package-lock.json");
  if (!fs.existsSync(lock)) return;
  const text = fs.readFileSync(lock, "utf8");
  if (/resolved":\s*"https?:\/\/(?!registry\.npmjs\.org)/.test(text)) {
    throw new Error(
      `private registry URL in ${path.relative(root, lock)} — aborting (use registry.npmjs.org only)`
    );
  }
}

function main() {
  let failed = 0;

  for (const { dir, label } of PACKAGE_DIRS) {
    const pkg = path.join(dir, "package.json");
    if (!fs.existsSync(pkg)) {
      console.log(`[skip] ${label} (no package.json)`);
      continue;
    }

    console.log(`\n=== ${label} ===`);
    assertPublicLock(dir);

    if (dryRun) {
      const code = run("npm", ["outdated", "--long"], dir);
      // npm outdated exits 1 when something is outdated — not a hard failure
      if (code > 1) failed = code;
      continue;
    }

    if (latest) {
      const ncu = run(
        "npx",
        ["--yes", "npm-check-updates@latest", "-u", "--packageFile", "package.json"],
        dir
      );
      if (ncu !== 0) {
        failed = ncu;
        continue;
      }
      const install = run("npm", ["install"], dir);
      if (install !== 0) failed = install;
    } else {
      const code = run("npm", ["update"], dir);
      if (code !== 0) failed = code;
    }

    assertPublicLock(dir);
  }

  console.log(
    dryRun
      ? "\n[corn update] dry-run done (npm outdated)."
      : latest
        ? "\n[corn update] package.json bumped to latest + reinstalled."
        : "\n[corn update] npm update within semver ranges done."
  );
  if (!dryRun) {
    console.log("Tip: corn update --latest for major bumps; corn update --dry-run to list only.");
  }
  process.exit(failed > 1 ? failed : 0);
}

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}
