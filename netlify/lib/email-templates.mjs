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
<<<<<<< HEAD
=======
/* Photo well. Same hex as --inner-bg (#44355B). Hero is 520px wide; a single photo is 360px. */
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
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

<<<<<<< HEAD
=======
    // Escape the prose first, with shortcodes masked so their `<` survives for the
    // replacements below. Tags inserted after this (`<a>`, `<strong>`, photos) stay real
    // HTML, and a `<b>` written in a paragraph is text.
    const shortcodes = [];
    text = text.replace(/\{\{<[\s\S]*?>\}\}/g, function (match) {
        const token = `%%SC${shortcodes.length}%%`;
        shortcodes.push(match);
        return token;
    });
    text = escapeHtml(text);
    text = text.replace(/%%SC(\d+)%%/g, function (_, n) {
        return shortcodes[Number(n)];
    });

>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
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

<<<<<<< HEAD
=======
    // {{< figcaption src="x" caption="y" />}} and the paired form. Same image rules as photo.
    text = text.replace(
        /\{\{<\s*figcaption\s+([^>]*?)\s*\/?>\}\}(?:([\s\S]*?)\{\{<\s*\/\s*figcaption\s*>\}\})?/g,
        function (_, attrs, inner) {
            const src = /src\s*=\s*"([^"]+)"/.exec(attrs);
            const caption = /caption\s*=\s*"([^"]*)"/.exec(attrs);
            if (!src) return "";
            const url = publishedImageUrl(src[1], assetBase, { email: true });
            const cap = (caption && caption[1]) || String(inner || "").trim();
            return (
                `\n\n${emailPhotoImg(url, EMAIL_IMG_ALT)}` +
                (cap
                    ? `<p style="margin:0 0 14px;font-size:12px;line-height:1.4;color:#9a93a8;text-align:center;">${escapeHtml(cap)}</p>`
                    : "") +
                "\n\n"
            );
        }
    );

>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
    // Drop any remaining shortcodes.
    text = text.replace(/\{\{<[\s\S]*?>\}\}/g, "");

    // Images / links
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, _alt, src) {
        const url = publishedImageUrl(src, assetBase, { email: true });
        return emailPhotoImg(url, EMAIL_IMG_ALT);
    });
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
        const url = absolutize(href, origin);
<<<<<<< HEAD
        return `<a href="${url}" style="color:#18ff6d;text-decoration:underline;">${escapeHtml(label)}</a>`;
=======
        return `<a href="${url}" style="color:#18ff6d;text-decoration:underline;">${label}</a>`;
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
    });

    // Headings / emphasis (after links so we don't nest badly on raw md)
    text = text.replace(/^### (.+)$/gm, function (_, t) {
<<<<<<< HEAD
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
=======
        return `<p style="margin:18px 0 8px;font-size:15px;color:#f2efe8;">${t}</p>`;
    });
    text = text.replace(/^## (.+)$/gm, function (_, t) {
        return `<p style="margin:20px 0 8px;font-size:16px;color:#f2efe8;">${t}</p>`;
    });
    text = text.replace(/^# (.+)$/gm, function (_, t) {
        return `<p style="margin:20px 0 8px;font-size:18px;color:#f2efe8;">${t}</p>`;
    });
    text = text.replace(/\*\*([^*]+)\*\*/g, function (_, t) {
        return `<strong>${t}</strong>`;
    });
    text = text.replace(/\*([^*]+)\*/g, function (_, t) {
        return `<em>${t}</em>`;
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
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

<<<<<<< HEAD
/** Plain prose: escape, then soft-wrap → space; hard break → <br>. */
=======
/** Plain prose is already escaped. Soft-wrap → space; hard break → <br>. */
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
function collapseSoftWrapsPlain(text) {
    return String(text || "")
        .split(/  \n/)
        .map(function (part) {
<<<<<<< HEAD
            return escapeHtml(
                part.replace(/\n+/g, " ").replace(/[ \t]{2,}/g, " ").trim()
            );
=======
            return part.replace(/\n+/g, " ").replace(/[ \t]{2,}/g, " ").trim();
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
        })
        .filter(Boolean)
        .join("<br>\n");
}

/**
<<<<<<< HEAD
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
=======
 * URL an email client can fetch.
 *
 * The file in the post folder is not published. After a Hugo build, use a
 * resized WebP in public/blog/<slug>/ (`name_hu_….webp`). AVIF copies are
 * skipped. For email, prefer a mid-size file (~40–280 KB), not the 1600px click.
 *
 * A path under assets/ (images/nongrid/…) is published the same way, next to
 * that folder (`/images/nongrid/name_hu_….webp`). A static/ file that was not
 * processed stays on the site origin.
 */
export function publishedImageUrl(filename, assetBase, options) {
    const email = !!(options && options.email);
    const raw = String(filename || "").trim();
    const asset = String(assetBase || "").replace(/\/$/, "");
    const slugMatch = asset.match(/\/blog\/([^/]+)\/?$/);
    const origin = (slugMatch ? asset.replace(/\/blog\/[^/]+\/?$/, "") : asset).replace(/\/$/, "");
    if (!raw) return origin || asset;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("mailto:") || raw.startsWith("//")) {
        return absolutize(raw, origin || asset);
    }

    const rel = raw.replace(/^\.\//, "");
    const slug = slugMatch ? slugMatch[1] : "";
    if (slug && !rel.startsWith("/") && isPageResource(slug, rel)) {
        const processed = pickProcessedImage(slug, rel, email);
        if (processed) return `${origin}/blog/${slug}/${processed}`;
        // The source file is not published. This path only works after Hugo writes public/.
        return `${asset}/${rel.replace(/^\/+/, "")}`;
    }
    const clean = rel.replace(/^\/+/, "");
    if (clean && existsSync(path.join(ROOT, "assets", clean))) {
        const dir = clean.split("/").slice(0, -1).join("/");
        const processed = pickProcessedIn(path.join(ROOT, "public", dir), clean, email);
        if (processed) return `${origin}/${dir}/${processed}`;
        return `${origin}/${clean}`;
    }
    return siteImageUrl(rel, origin || asset);
}

/** True when content/blog/<slug>/ holds this file. Mirrors Resources.GetMatch. */
function isPageResource(slug, rel) {
    const clean = String(rel || "").replace(/^\/+/, "");
    if (!clean || clean.split("/").includes("..")) return false;
    return existsSync(path.join(ROOT, "content", "blog", slug, clean));
}

function siteImageUrl(filename, origin) {
    const base = String(origin || "").replace(/\/$/, "");
    let rel = String(filename || "")
        .trim()
        .replace(/^\.\//, "")
        .replace(/^\/+/, "")
        .replace(/^static\//, "");
    if (!rel || rel.split("/").includes("..")) return base;
    return `${base}/${rel}`;
}

/** Basename of the resized WebP to embed, or "" when public/ has none yet. */
function pickProcessedImage(slug, filename, email) {
    return pickProcessedIn(path.join(ROOT, "public", "blog", slug), filename, email);
}

function pickProcessedIn(dir, filename, email) {
    if (!existsSync(dir)) return "";
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
    const stem = path.basename(String(filename), path.extname(String(filename)));
    const candidates = [];
    for (const name of readdirSync(dir)) {
        if (!name.startsWith(`${stem}_hu_`) || !name.endsWith(".webp")) continue;
        candidates.push({
            name,
            size: statSync(path.join(dir, name)).size
        });
    }
<<<<<<< HEAD
    if (!candidates.length) return fallback;
=======
    if (!candidates.length) return "";
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
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
<<<<<<< HEAD

    const origin = String(assetBase).replace(/\/blog\/[^/]+\/?$/, "");
    return `${origin}/blog/${slug[1]}/${pick.name}`;
=======
    return pick.name;
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
}

function absolutize(url, base) {
    const raw = String(url || "").trim();
    if (!raw) return base;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("mailto:")) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return `${base}${raw}`;
    return `${base}/${raw.replace(/^\.\//, "")}`;
}

<<<<<<< HEAD
=======
/**
 * Welcome letter from emails/welcome.md (all copy) + welcome.html (chrome only).
 * Returns { html, subject }. Blank / commented-out fields omit their blocks
 * (no empty shells). Unsubscribe link always remains in the footer block.
 */
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
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
<<<<<<< HEAD
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
=======
    const subject = String(meta.subject || meta.title || "welcome").trim();
    const preheader = String(meta.preheader || "").trim();
    const greeting = String(meta.greeting || "").trim();
    const headline = String(meta.headline || "").trim();
    const footer = String(meta.footer || "").trim();
    const unsubLabel = String(meta.unsubscribe || "unsubscribe").trim() || "unsubscribe";
    const bodyHtml = markdownToEmailHtml(body, { origin });
    const imageBlock = welcomeImageBlock(meta.image, meta.image_alt, origin);

    const html = fillTemplate(tpl, {
        TITLE: escapeHtml(meta.title || subject),
        PREHEADER_BLOCK: preheader
            ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>\n`
            : "",
        GREETING_BLOCK: greeting
            ? `<p style="margin:0;font-size:13px;line-height:1.4;color:#9a93a8;"><span style="color:#ffe566;font-family:Impact,Haettenschweiler,'Arial Black',sans-serif;font-size:24px;letter-spacing:0.05em;">${escapeHtml(greeting)}</span></p>` +
              `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:14px 0 18px;"><tr><td style="height:2px;line-height:2px;font-size:0;background:#18ff6d;">&nbsp;</td></tr></table>\n`
            : "",
        IMAGE_BLOCK: imageBlock,
        HEADLINE_BLOCK: headline
            ? `<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;font-weight:normal;color:#f2efe8;">${escapeHtml(headline)}</h1>\n`
            : "",
        BODY_BLOCK: bodyHtml
            ? `<div style="font-size:14px;line-height:1.6;color:#d8d2e0;">${bodyHtml}</div>\n`
            : "",
        FOOTER_BLOCK: welcomeFooterBlock(footer, unsubLabel, unsubscribeUrl)
    });
    return { html, subject };
}

function welcomeFooterBlock(footer, unsubLabel, unsubscribeUrl) {
    const line = footer
        ? `${escapeHtml(footer)}<br>\n                `
        : "";
    return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
        `<tr><td style="height:1px;line-height:1px;font-size:0;background:#3a3348;">&nbsp;</td></tr>` +
        `</table>` +
        `<p style="margin:14px 0 0;font-size:12px;line-height:1.55;color:#9a93a8;">` +
        `${line}<a href="${unsubscribeUrl}" style="color:#f2efe8;text-decoration:underline;">${escapeHtml(unsubLabel)}</a>` +
        `</p>`
    );
}

/** Optional welcome image from front matter (`image:` under static/ or absolute URL). */
function welcomeImageBlock(image, alt, origin) {
    const raw = String(image || "").trim();
    if (!raw) return "";
    let src = raw;
    if (!/^https?:\/\//i.test(raw) && !raw.startsWith("//")) {
        const rel = raw.replace(/^\/+/, "").replace(/^static\//, "");
        src = `${origin}/${rel}`;
    } else if (raw.startsWith("//")) {
        src = `https:${raw}`;
    }
    return heroBlock(src, alt || EMAIL_IMG_ALT);
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
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
