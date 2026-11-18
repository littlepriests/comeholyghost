#!/usr/bin/env node
/**
 * Pre-commit check. A photo under content/ or assets/ stays when its long
 * edge is at most 2000px and the file is at most 1.5MB. The build publishes
 * the sizes.
 * corn compress can shrink a camera dump first; the hook does not require it.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { IMAGE_EXT } from "./compress-post-images.mjs";
import { SOURCE_LIMITS, sourceImageProblem } from "./lib/image-source-rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BLOB = 80 * 1024 * 1024;

function git(args, encoding) {
    return spawnSync("git", args, {
        cwd: root,
        encoding,
        maxBuffer: MAX_BLOB,
        windowsHide: true
    });
}

function stagedContentImages() {
    const diff = git(["diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"], "buffer");
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
        if (!name.startsWith("content/") && !name.startsWith("assets/")) return false;
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

async function problemFor(file, input) {
    if (input.length > MAX_BLOB) {
        return `larger than ${MAX_BLOB} bytes`;
    }
    const bySize = sourceImageProblem(0, 0, input.length);
    if (bySize) return bySize;
    let meta;
    try {
        meta = await sharp(input, { failOn: "none" }).metadata();
    } catch (err) {
        return err.message;
    }
    return sourceImageProblem(meta.width, meta.height, input.length);
}

async function main() {
    let files;
    try {
        files = stagedContentImages();
    } catch (err) {
        console.error(`image check: ${err.message}`);
        process.exit(1);
    }

    if (files.length === 0) process.exit(0);

    const needs = [];
    for (const file of files) {
        let input;
        try {
            input = stagedBlob(file);
        } catch (err) {
            needs.push(`${file} — ${err.message}`);
            continue;
        }
        const problem = await problemFor(file, input);
        if (problem) needs.push(`${file} — ${problem}`);
    }

    if (needs.length === 0) process.exit(0);

    console.error(
        `These images are too big to commit (long edge over ${SOURCE_LIMITS.maxEdge}px, or over ${SOURCE_LIMITS.maxBytes} bytes).\n` +
            "Export a copy at about 1600px on the long side. corn compress can do that resize.\n" +
            "The site build publishes the page sizes from the file you commit.\n"
    );
    for (const line of needs) console.error(`  ${line}`);
    process.exit(1);
}

const isDirect = process.argv[1]
    ?.replace(/\\/g, "/")
    .endsWith("/check-staged-images.mjs");
if (isDirect) main();
