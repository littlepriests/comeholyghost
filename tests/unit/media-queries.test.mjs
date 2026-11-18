import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Breakpoints are written once, in assets/css/media.css. Everything else uses a name. */

const root = fileURLToPath(new URL("../..", import.meta.url));
const DEFINITIONS = path.join(root, "assets", "css", "media.css");
const WIDTH_QUERY = /\((?:min|max)-width:\s*[\d.]+(?:rem|em|px)\)/;

function files(dir, exts) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === "vendor" ? [] : files(full, exts);
        return exts.includes(path.extname(entry.name)) ? [full] : [];
    });
}

test("no stylesheet, script, or template writes a width breakpoint outside media.css", () => {
    const found = [];
    const sources = [
        ...files(path.join(root, "assets", "css"), [".css"]),
        ...files(path.join(root, "assets", "js"), [".js"]),
        ...files(path.join(root, "layouts"), [".html"]),
    ].filter((file) => file !== DEFINITIONS);
    for (const file of sources) {
        fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line, i) => {
            if (WIDTH_QUERY.test(line)) found.push(`${path.relative(root, file)}:${i + 1}: ${line.trim()}`);
        });
    }
    assert.deepEqual(found, [], "use @media (--name) in CSS, mq(\"name\") in JS, or media-queries.html in templates");
});

test("every @media (--name) a stylesheet uses is defined in media.css", () => {
    const defined = new Set([...fs.readFileSync(DEFINITIONS, "utf8").matchAll(/@custom-media\s+(--[\w-]+)/g)].map((m) => m[1]));
    const missing = [];
    for (const file of files(path.join(root, "assets", "css"), [".css"])) {
        for (const m of fs.readFileSync(file, "utf8").matchAll(/@media[^{;]*?\((--[\w-]+)\)/g)) {
            if (!defined.has(m[1])) missing.push(`${path.relative(root, file)}: ${m[1]}`);
        }
    }
    assert.deepEqual(missing, []);
});
