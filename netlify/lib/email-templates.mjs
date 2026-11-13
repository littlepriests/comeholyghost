import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function emailsDir() {
    return path.join(ROOT, "emails");
}

export async function loadEmailTemplate(name) {
    const file = path.join(emailsDir(), name.endsWith(".html") ? name : `${name}.html`);
    return readFile(file, "utf8");
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

export function heroBlock(src, alt) {
    if (!src) return "";
    const safeAlt = String(alt || "").replace(/"/g, "&quot;");
    return (
        `<img src="${src}" alt="${safeAlt}" width="520" ` +
        `style="display:block;width:100%;max-width:520px;height:auto;margin:0 0 16px;border:0;border-radius:0;">`
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
    const origin = String(opts.origin || "https://cornfieldjournal.com").replace(/\/$/, "");
    const assetBase = String(opts.assetBase || origin).replace(/\/$/, "");
    let text = String(markdown || "").replace(/\r\n/g, "\n");

    // {{< photo src="x" caption="y" >}} / photo-grid blocks
    text = text.replace(/\{\{<\s*photo\s+([^>]*?)\s*\/?>\}\}/g, function (_, attrs) {
        const src = /src\s*=\s*"([^"]+)"/.exec(attrs);
        const caption = /caption\s*=\s*"([^"]*)"/.exec(attrs);
        if (!src) return "";
        const url = absolutize(src[1], assetBase);
        const cap = caption ? caption[1] : "";
        return (
            `\n\n<img src="${url}" alt="${escapeHtml(cap)}" width="520" ` +
            `style="display:block;width:100%;max-width:520px;height:auto;margin:12px 0 6px;border:0;">` +
            (cap
                ? `<p style="margin:0 0 14px;font-size:12px;color:#9a93a8;">${escapeHtml(cap)}</p>`
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
            const imgs = files
                .map(function (file) {
                    const url = absolutize(file, assetBase);
                    return (
                        `<img src="${url}" alt="" width="520" ` +
                        `style="display:block;width:100%;max-width:520px;height:auto;margin:8px 0;border:0;">`
                    );
                })
                .join("");
            const cap = caption
                ? `<p style="margin:0 0 14px;font-size:12px;color:#9a93a8;">${escapeHtml(caption[1])}</p>`
                : "";
            return `\n\n${imgs}${cap}\n\n`;
        }
    );

    // Drop any remaining shortcodes.
    text = text.replace(/\{\{<[\s\S]*?>\}\}/g, "");

    // Images / links
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
        const url = absolutize(src, assetBase);
        return (
            `<img src="${url}" alt="${escapeHtml(alt)}" width="520" ` +
            `style="display:block;width:100%;max-width:520px;height:auto;margin:12px 0;border:0;">`
        );
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
                return trimmed.indexOf("<p ") === 0 || trimmed.indexOf("<img ") === 0
                    ? trimmed
                    : `<div style="margin:0 0 12px;">${trimmed.replace(/\n/g, "<br>\n")}</div>`;
            }
            return `<p style="margin:0 0 12px;">${escapeHtml(trimmed).replace(/\n/g, "<br>\n")}</p>`;
        })
        .filter(Boolean)
        .join("\n");
}

function absolutize(url, base) {
    const raw = String(url || "").trim();
    if (!raw) return base;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("mailto:")) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return `${base}${raw}`;
    return `${base}/${raw.replace(/^\.\//, "")}`;
}

export async function renderWelcomeEmail() {
    return loadEmailTemplate("welcome.html");
}

export async function renderPostEmail(post) {
    const tpl = await loadEmailTemplate("post.html");
    const origin = post.origin || "https://cornfieldjournal.com";
    const heroSrc = post.heroUrl || "";
    return fillTemplate(tpl, {
        TITLE: escapeHtml(post.title || "new post"),
        DATE: escapeHtml(post.dateLabel || ""),
        SUMMARY: escapeHtml(post.summary || ""),
        PERMALINK: post.permalink || origin,
        HERO_BLOCK: heroBlock(heroSrc, post.heroAlt || post.title || ""),
        BODY: post.bodyHtml || markdownToEmailHtml(post.markdown || "", {
            origin,
            assetBase: post.assetBase || origin
        })
    });
}
