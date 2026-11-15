import { readFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { DEFAULT_ORIGIN } from "./site.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function emailsDir() {
    return path.join(ROOT, "emails");
}

export async function loadEmailTemplate(name) {
    const file = path.join(emailsDir(), name.endsWith(".html") ? name : `${name}.html`);
    return readFile(file, "utf8");
}

/** Simple --- front matter --- for emails/*.md (key: value lines only). */
export function parseFrontMatter(raw) {
    const text = String(raw || "").replace(/^\uFEFF/, "");
    if (!text.startsWith("---")) {
        return { meta: {}, body: text };
    }
    const end = text.indexOf("\n---", 3);
    if (end < 0) {
        return { meta: {}, body: text };
    }
    const yaml = text.slice(3, end).replace(/^\r?\n/, "");
    let body = text.slice(end + 4).replace(/^\r?\n/, "");
    const meta = {};
    yaml.split(/\r?\n/).forEach(function (line) {
        const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
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
    return { meta, body };
}

/** Replace {{KEY}} tokens. Leaves {{{RESEND_…}}} alone for Resend Broadcasts. */
export function fillTemplate(html, vars) {
    let out = String(html || "");
    Object.keys(vars || {}).forEach(function (key) {
        const value = vars[key] == null ? "" : String(vars[key]);
        out = out.split(`{{${key}}}`).join(value);
    });
    return out;
}

const EMAIL_IMG_ALT = "go to site for full image";
const EMAIL_INNER_BG = "#44355B";

export function heroBlock(src, alt) {
    if (!src) return "";
    const safeAlt = escapeHtml(alt || EMAIL_IMG_ALT);
    return (
        `<img src="${src}" alt="${safeAlt}" width="520" ` +
        `style="display:block;width:100%;max-width:520px;height:auto;margin:0 0 16px;border:0;background:${EMAIL_INNER_BG};">`
    );
}

/** Single article photo — medium, centered (mirrors .article-photo, no lightbox). */
function emailPhotoImg(url, alt) {
    const safeAlt = escapeHtml(alt || EMAIL_IMG_ALT);
    return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:12px 0 6px;">` +
        `<tr><td align="center">` +
        `<img src="${url}" alt="${safeAlt}" width="360" ` +
        `style="display:block;width:100%;max-width:360px;height:auto;margin:0 auto;border:0;background:${EMAIL_INNER_BG};">` +
        `</td></tr></table>`
    );
}

/**
 * 2-up photo-grid as nested tables (email-safe). Odd leftover tile centered.
 * No click-to-expand — alt steers readers to the site.
 */
function emailPhotoGrid(urls, caption) {
    const gap = 8;
    const rows = [];
    for (let i = 0; i < urls.length; i += 2) {
        const left = urls[i];
        const right = urls[i + 1];
        if (right) {
            rows.push(
                `<tr>` +
                    `<td width="50%" valign="top" style="padding:0 ${gap / 2}px ${gap}px 0;">` +
                    emailGridTile(left) +
                    `</td>` +
                    `<td width="50%" valign="top" style="padding:0 0 ${gap}px ${gap / 2}px;">` +
                    emailGridTile(right) +
                    `</td>` +
                    `</tr>`
            );
        } else {
            // Odd leftover — half width, centered (matches site grid).
            rows.push(
                `<tr>` +
                    `<td colspan="2" align="center" style="padding:0 0 ${gap}px;">` +
                    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="50%" style="width:50%;max-width:50%;">` +
                    `<tr><td>${emailGridTile(left)}</td></tr>` +
                    `</table>` +
                    `</td>` +
                    `</tr>`
            );
        }
    }
    const cap = caption
        ? `<p style="margin:4px 0 14px;font-size:12px;line-height:1.4;color:#9a93a8;text-align:center;font-family:'Fira Mono',Consolas,'Courier New',monospace;">${escapeHtml(caption)}</p>`
        : "";
    return (
        `\n\n<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:14px 0 4px;">` +
        rows.join("") +
        `</table>${cap}\n\n`
    );
}

function emailGridTile(url) {
    const safeAlt = escapeHtml(EMAIL_IMG_ALT);
    // Fixed-ish square cell; object-fit is spotty in mail clients, so clip via overflow + max height.
    return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
        `style="background:${EMAIL_INNER_BG};">` +
        `<tr><td align="center" style="padding:0;line-height:0;font-size:0;">` +
        `<img src="${url}" alt="${safeAlt}" width="250" ` +
        `style="display:block;width:100%;max-width:250px;height:auto;max-height:250px;margin:0 auto;border:0;object-fit:cover;">` +
        `</td></tr></table>`
    );
}

export function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Rough email-safe HTML from Hugo markdown + shortcodes.
 * Photos become <img>; grids flatten; relative urls get site origin.
 */
export function markdownToEmailHtml(markdown, options) {
    const opts = options || {};
    const origin = String(opts.origin || DEFAULT_ORIGIN).replace(/\/$/, "");
    const assetBase = String(opts.assetBase || origin).replace(/\/$/, "");
    let text = String(markdown || "").replace(/\r\n/g, "\n");

    // {{< photo src="x" caption="y" >}} / photo-grid blocks
    text = text.replace(/\{\{<\s*photo\s+([^>]*?)\s*\/?>\}\}/g, function (_, attrs) {
        const src = /src\s*=\s*"([^"]+)"/.exec(attrs);
        const caption = /caption\s*=\s*"([^"]*)"/.exec(attrs);
        if (!src) return "";
        const url = publishedImageUrl(src[1], assetBase, { email: true });
        const cap = caption ? caption[1] : "";
        return (
            `\n\n${emailPhotoImg(url, EMAIL_IMG_ALT)}` +
            (cap
                ? `<p style="margin:0 0 14px;font-size:12px;line-height:1.4;color:#9a93a8;text-align:center;">${escapeHtml(cap)}</p>`
                : "") +
            "\n\n"
        );
    });

    text = text.replace(
        /\{\{<\s*photo-grid\s+([^>]*?)\s*>\}\}([\s\S]*?)\{\{<\s*\/\s*photo-grid\s*>\}\}/g,
        function (_, attrs, body) {
            const caption = /caption\s*=\s*"([^"]*)"/.exec(attrs);
            const files = String(body || "")
                .split(/\n/)
                .map(function (line) {
                    return line.trim();
                })
                .filter(Boolean);
            const urls = files.map(function (file) {
                return publishedImageUrl(file, assetBase, { email: true });
            });
            return emailPhotoGrid(urls, caption ? caption[1] : "");
        }
    );

    // Drop any remaining shortcodes.
    text = text.replace(/\{\{<[\s\S]*?>\}\}/g, "");

    // Images / links
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, _alt, src) {
        const url = publishedImageUrl(src, assetBase, { email: true });
        return emailPhotoImg(url, EMAIL_IMG_ALT);
    });
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
        const url = absolutize(href, origin);
        return `<a href="${url}" style="color:#18ff6d;text-decoration:underline;">${escapeHtml(label)}</a>`;
    });

    // Headings / emphasis (after links so we don't nest badly on raw md)
    text = text.replace(/^### (.+)$/gm, function (_, t) {
        return `<p style="margin:18px 0 8px;font-size:15px;color:#f2efe8;">${escapeHtml(t)}</p>`;
    });
    text = text.replace(/^## (.+)$/gm, function (_, t) {
        return `<p style="margin:20px 0 8px;font-size:16px;color:#f2efe8;">${escapeHtml(t)}</p>`;
    });
    text = text.replace(/^# (.+)$/gm, function (_, t) {
        return `<p style="margin:20px 0 8px;font-size:18px;color:#f2efe8;">${escapeHtml(t)}</p>`;
    });
    text = text.replace(/\*\*([^*]+)\*\*/g, function (_, t) {
        return `<strong>${escapeHtml(t)}</strong>`;
    });
    text = text.replace(/\*([^*]+)\*/g, function (_, t) {
        return `<em>${escapeHtml(t)}</em>`;
    });

    const blocks = text.split(/\n{2,}/);
    return blocks
        .map(function (block) {
            const trimmed = block.trim();
            if (!trimmed) return "";
            if (/<[a-z/]/i.test(trimmed)) {
                // Already email HTML (photos, grids, headings) — don't wrap or inject <br> into tables.
                if (
                    trimmed.indexOf("<p ") === 0 ||
                    trimmed.indexOf("<img ") === 0 ||
                    trimmed.indexOf("<table ") === 0
                ) {
                    return trimmed;
                }
                // Soft-wrapped md (80-col) left newlines inside a block that also has links —
                // collapse those; keep real paragraph breaks via the outer split.
                return `<div style="margin:0 0 12px;">${collapseSoftWrapsHtml(trimmed)}</div>`;
            }
            return `<p style="margin:0 0 12px;">${collapseSoftWrapsPlain(trimmed)}</p>`;
        })
        .filter(Boolean)
        .join("\n");
}

/** Join 80-col soft wraps in already-HTML blocks; keep md hard breaks (two trailing spaces). */
function collapseSoftWrapsHtml(text) {
    return String(text || "")
        .replace(/  \n/g, "<br>\n")
        .replace(/\n+/g, " ")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

/** Plain prose: escape, then soft-wrap → space; hard break → <br>. */
function collapseSoftWrapsPlain(text) {
    return String(text || "")
        .split(/  \n/)
        .map(function (part) {
            return escapeHtml(
                part.replace(/\n+/g, " ").replace(/[ \t]{2,}/g, " ").trim()
            );
        })
        .filter(Boolean)
        .join("<br>\n");
}

/**
 * Masters are not published. After a Hugo build, pick a resized copy in
 * public/blog/<slug>/. For email, prefer a mid-size Fit (~800–1400 thumb),
 * not the huge lightbox file (largest on disk).
 */
export function publishedImageUrl(filename, assetBase, options) {
    const email = !!(options && options.email);
    const fallback = absolutize(filename, assetBase);
    const slug = String(assetBase || "").match(/\/blog\/([^/]+)\/?$/);
    if (!slug) return fallback;
    const dir = path.join(ROOT, "public", "blog", slug[1]);
    if (!existsSync(dir)) return fallback;
    const stem = path.basename(String(filename), path.extname(String(filename)));
    const candidates = [];
    for (const name of readdirSync(dir)) {
        if (!name.startsWith(`${stem}_hu_`) || !name.endsWith(".webp")) continue;
        candidates.push({
            name,
            size: statSync(path.join(dir, name)).size
        });
    }
    if (!candidates.length) return fallback;
    candidates.sort(function (a, b) {
        return a.size - b.size;
    });

    let pick = candidates[candidates.length - 1];
    if (email) {
        // Skip tiny thumbs; aim ~120–220 KB (typical 800px Fit). Fall back to median.
        const usable = candidates.filter(function (c) {
            return c.size >= 40000 && c.size <= 280000;
        });
        if (usable.length) {
            pick = usable[usable.length - 1];
        } else if (candidates.length >= 2) {
            pick = candidates[Math.floor(candidates.length / 2)];
        }
    }

    const origin = String(assetBase).replace(/\/blog\/[^/]+\/?$/, "");
    return `${origin}/blog/${slug[1]}/${pick.name}`;
}

function absolutize(url, base) {
    const raw = String(url || "").trim();
    if (!raw) return base;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("mailto:")) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return `${base}${raw}`;
    return `${base}/${raw.replace(/^\.\//, "")}`;
}

export async function renderWelcomeEmail(options) {
    const opts = options || {};
    const origin = String(opts.origin || DEFAULT_ORIGIN).replace(/\/$/, "");
    const email = String(opts.email || "").trim().toLowerCase();
    const unsubscribeUrl = email
        ? `${origin}/unsubscribe/?email=${encodeURIComponent(email)}`
        : `${origin}/unsubscribe/`;
    const mdPath = path.join(emailsDir(), "welcome.md");
    const raw = await readFile(mdPath, "utf8");
    const { meta, body } = parseFrontMatter(raw);
    const tpl = await loadEmailTemplate("welcome.html");
    return fillTemplate(tpl, {
        TITLE: escapeHtml(meta.title || "hi there"),
        PREHEADER: escapeHtml(
            meta.preheader || "read what i write."
        ),
        HEADLINE: escapeHtml(meta.headline || "thanks for joining"),
        FOOTER: escapeHtml(
            meta.footer || "cornfieldjournal.com"
        ),
        UNSUBSCRIBE_URL: unsubscribeUrl,
        BODY: markdownToEmailHtml(body, { origin })
    });
}

export async function renderPostEmail(post) {
    const tpl = await loadEmailTemplate("post.html");
    const origin = post.origin || DEFAULT_ORIGIN;
    return fillTemplate(tpl, {
        TITLE: escapeHtml(post.title || "new post"),
        DATE: escapeHtml(post.dateLabel || ""),
        SUMMARY: escapeHtml(post.summary || ""),
        PERMALINK: post.permalink || origin,
        HERO_BLOCK: heroBlock(
            post.heroUrl || "",
            EMAIL_IMG_ALT
        ),
        BODY: post.bodyHtml || markdownToEmailHtml(post.markdown || "", {
            origin,
            assetBase: post.assetBase || origin
        })
    });
}
