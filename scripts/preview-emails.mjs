#!/usr/bin/env node
/**
 * Rebuild emails/preview/*.html from the live templates + sample/real post data.
 * Open emails/preview/index.html in a browser (not published by Hugo).
 *
 *   node scripts/preview-emails.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listBlogPosts } from "../netlify/lib/newsletter-posts.mjs";
import {
    renderPostEmail,
    renderWelcomeEmail
} from "../netlify/lib/email-templates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "emails", "preview");

function shell(inner, title) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · email preview</title>
  <style>
    body { margin: 0; background: #0a0810; font-family: system-ui, sans-serif; }
    .bar { padding: 12px 16px; color: #cfc8da; font-size: 13px; }
    .bar a { color: #7ec8ff; }
    .frame { background: #05040a; }
  </style>
</head>
<body>
  <div class="bar"><a href="./index.html">← previews</a> · ${title} · not published by Hugo</div>
  <div class="frame">${inner}</div>
</body>
</html>`;
}

async function main() {
    await mkdir(OUT, { recursive: true });
    // Image URLs must match files in local public/ (Hugo Fit hashes). Point at a
    // local static server for assets — production CDN may not have this build’s names yet.
    const assetOrigin =
        process.env.EMAIL_PREVIEW_ORIGIN || "http://127.0.0.1:3940";
    const siteOrigin = "https://cornfieldjournal.com";

    const welcome = await renderWelcomeEmail({
        email: "you@example.com",
        origin: siteOrigin
    });
    // Strip outer html/body from template so we can embed, or use full doc in iframe srcdoc.
    // Easiest: write the template as-is (full document) for welcome/post; index links to them.
    await writeFile(path.join(OUT, "welcome.html"), welcome, "utf8");
    const posts = await listBlogPosts(assetOrigin);
    const sample =
        posts[0] ||
        {
            title: "sample post title",
            summary: "a short preview blurb for the letter.",
            dateLabel: "Nov 13, 2026",
            permalink: `${siteOrigin}/blog/sample/`,
            heroUrl: "",
            markdown:
                "hello from the preview.\n\n## section\n\nmore words, then a [link](https://cornfieldjournal.com/).",
            assetBase: `${assetOrigin}/blog/sample`,
            origin: siteOrigin
        };

    // Keep subscriber-facing links on the real site; only media hits assetOrigin.
    if (posts[0]) {
        sample.permalink = `${siteOrigin}/blog/${sample.slug}/`;
        sample.origin = siteOrigin;
    }

    let postHtml = await renderPostEmail(sample);
    // Preview: fake the Resend unsub token so the link is clickable-looking.
    postHtml = postHtml.split("{{{RESEND_UNSUBSCRIBE_URL}}}").join("#unsubscribe-preview");
    await writeFile(path.join(OUT, "post.html"), postHtml, "utf8");

    const index = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FIELD email previews</title>
  <style>
    body { margin: 0; background: #0a0810; color: #f2efe8; font-family: "Fira Mono", ui-monospace, monospace; padding: 2rem; }
    a { color: #18ff6d; }
    li { margin: 0.6rem 0; }
    .muted { color: #9a93a8; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>email previews</h1>
  <p class="muted">edit <code>emails/welcome.md</code> (copy) or <code>emails/*.html</code> (chrome), then <code>corn email</code>.</p>
  <ul>
    <li><a href="./welcome.html">welcome</a> — first-time subscriber</li>
    <li><a href="./post.html">new post</a> — ${sample.title ? sample.title.replace(/</g, "") : "sample"}</li>
  </ul>
</body>
</html>`;
    await writeFile(path.join(OUT, "index.html"), index, "utf8");
    console.log(`wrote ${OUT}`);
    console.log(
        `images → ${assetOrigin}/blog/…  (run: npx serve public -p 3940)\n` +
            `html   → open emails/preview/ or npx serve emails/preview -p 3939`
    );
}

main().catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
