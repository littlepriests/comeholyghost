#!/usr/bin/env node
/**
 * Pre-commit check. Staged images under content/ use the same rules as
 * `corn compress`: a commit stops when a run would still change the file,
 * and continues when every staged image would be skipped.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPRESS_DEFAULTS,
  IMAGE_EXT,
  planImage,
} from "./compress-post-images.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BLOB = 80 * 1024 * 1024;

function git(args, encoding) {
  return spawnSync("git", args, {
    cwd: root,
    encoding,
    maxBuffer: MAX_BLOB,
    windowsHide: true,
  });
}

function stagedContentImages() {
  const diff = git(
    ["diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"],
    "buffer",
  );
  if (diff.error) throw diff.error;
  if (diff.status !== 0) {
    throw new Error(diff.stderr?.toString() || "git diff --cached failed");
  }
  const names = diff.stdout
    .toString("utf8")
    .split("\0")
    .map((name) => name.replace(/\\/g, "/"))
    .filter(Boolean);
  return names.filter((name) => {
    if (!name.startsWith("content/")) return false;
    return IMAGE_EXT.has(path.posix.extname(name).toLowerCase());
  });
}

function stagedBlob(rel) {
  const shown = git(["show", `:${rel}`], "buffer");
  if (shown.error) throw shown.error;
  if (shown.status !== 0) {
    throw new Error(shown.stderr?.toString() || `git show :${rel} failed`);
  }
  return shown.stdout;
}

async function main() {
  let files;
  try {
    files = stagedContentImages();
  } catch (err) {
    console.error(`corn compress check: ${err.message}`);
    process.exit(1);
  }

  if (files.length === 0) process.exit(0);

  const opts = {
    ...COMPRESS_DEFAULTS,
    force: false,
    onlyNew: false,
  };
  const needs = [];
  for (const file of files) {
    let input;
    try {
      input = stagedBlob(file);
    } catch (err) {
      needs.push(`${file} — ${err.message}`);
      continue;
    }
    if (input.length > MAX_BLOB) {
      needs.push(`${file} — larger than ${MAX_BLOB} bytes`);
      continue;
    }
    let plan;
    try {
      plan = await planImage(input, file, opts);
    } catch (err) {
      needs.push(`${file} — ${err.message}`);
      continue;
    }
    if (plan.status === "ready" || plan.status === "error") {
      needs.push(`${file} — ${plan.detail}`);
    }
  }

  if (needs.length === 0) process.exit(0);

  console.error("corn compress has not been run on staged images:\n");
  for (const line of needs) console.error(`  ${line}`);
  console.error("\nRun corn compress on the post folder, then stage the WebP.");
  process.exit(1);
}

main();
