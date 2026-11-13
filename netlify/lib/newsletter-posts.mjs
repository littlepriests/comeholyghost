import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BLOG_DIR = path.join(ROOT, "content", "blog");

function parseTomlFrontMatter(raw) {
    const match = String(raw || "").match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/);
    if (!match) {
        return { meta: {}, body: String(raw || "") };
    }
    const meta = {};
    String(match[1])
        .split(/\r?\n/)
        .forEach(function (line) {
            const m = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
            if (!m) return;
            let value = m[2].trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            meta[m[1]] = value;
        });
    return { meta, body: match[2] };
}

function formatDateLabel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || "");
    try {
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC"
        });
    } catch (error) {
        return d.toISOString().slice(0, 10);
    }
}

async function fileExists(file) {
    try {
        await access(file);
        return true;
    } catch (error) {
        return false;
    }
}

export async function listBlogPosts(origin) {
    const site = String(origin || "https://cornfieldjournal.com").replace(/\/$/, "");
    let dirs = [];
    try {
        dirs = await readdir(BLOG_DIR, { withFileTypes: true });
    } catch (error) {
        return [];
    }

    const posts = [];
    for (const ent of dirs) {
        if (!ent.isDirectory()) continue;
        const slug = ent.name;
        if (slug.startsWith("_") || slug.startsWith(".")) continue;
        const indexPath = path.join(BLOG_DIR, slug, "index.md");
        if (!(await fileExists(indexPath))) continue;
        const raw = await readFile(indexPath, "utf8");
        const parsed = parseTomlFrontMatter(raw);
        if (String(parsed.meta.draft || "").toLowerCase() === "true") continue;
        if (String(parsed.meta.newsletter || "").toLowerCase() === "false") continue;

        const dateRaw = parsed.meta.date || "";
        const date = new Date(dateRaw);
        if (dateRaw && Number.isNaN(date.getTime())) continue;
        // Future-dated: skip until publish day (UTC date compare).
        if (dateRaw) {
            const today = new Date();
            const pubDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            const nowDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
            if (pubDay > nowDay) continue;
        }

        const heroFile = parsed.meta.index_image || parsed.meta.image || "";
        const heroUrl = heroFile
            ? `${site}/blog/${slug}/${String(heroFile).replace(/^\.\//, "")}`
            : "";

        posts.push({
            slug,
            title: parsed.meta.title || slug,
            summary: parsed.meta.summary || parsed.meta.description || "",
            date: dateRaw,
            dateLabel: formatDateLabel(dateRaw),
            dateMs: dateRaw && !Number.isNaN(date.getTime()) ? date.getTime() : 0,
            permalink: `${site}/blog/${slug}/`,
            heroUrl,
            heroAlt: parsed.meta.index_caption || "",
            markdown: parsed.body,
            assetBase: `${site}/blog/${slug}`,
            origin: site,
            newsletter: parsed.meta.newsletter
        });
    }

    posts.sort(function (a, b) {
        return (b.dateMs || 0) - (a.dateMs || 0);
    });
    return posts;
}
