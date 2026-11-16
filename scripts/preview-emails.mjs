#!/usr/bin/env node
/**
 * Rebuild emails/preview/*.html from the live templates + sample/real post data.
 * Open emails/preview/index.html in a browser (not published by Hugo).
 *
 *   node scripts/preview-emails.mjs
 *   node scripts/preview-emails.mjs --watch
 *   corn email
 *   corn email --watch
 */
import { watch } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "emails", "preview");
const WATCH = process.argv.includes("--watch");

const WATCH_PATHS = [
  path.join(ROOT, "emails"),
  path.join(ROOT, "netlify", "lib", "email-templates.mjs"),
  path.join(ROOT, "netlify", "lib", "newsletter-posts.mjs"),
  path.join(ROOT, "content", "blog"),
];

async function loadModules() {
  // Bust ESM cache so --watch picks up template/lib edits.
  const bust = `?t=${Date.now()}`;
  const [{ listBlogPosts }, { renderPostEmail, renderWelcomeEmail }, { DEFAULT_ORIGIN }] =
    await Promise.all([
      import(
        pathToFileURL(path.join(ROOT, "netlify", "lib", "newsletter-posts.mjs")).href +
          bust
      ),
      import(
        pathToFileURL(path.join(ROOT, "netlify", "lib", "email-templates.mjs")).href +
          bust
      ),
      import(pathToFileURL(path.join(ROOT, "netlify", "lib", "site.mjs")).href + bust),
    ]);
  return { listBlogPosts, renderPostEmail, renderWelcomeEmail, DEFAULT_ORIGIN };
}

function refreshMeta(seconds) {
  if (!WATCH) return "";
  return `  <meta http-equiv="refresh" content="${seconds}">\n`;
}

async function rebuild() {
  const { listBlogPosts, renderPostEmail, renderWelcomeEmail, DEFAULT_ORIGIN } =
    await loadModules();

  await mkdir(OUT, { recursive: true });
  const assetOrigin =
    process.env.EMAIL_PREVIEW_ORIGIN || "http://127.0.0.1:3940";
  const siteOrigin = DEFAULT_ORIGIN;

  const welcome = await renderWelcomeEmail({
    email: "you@example.com",
    origin: siteOrigin,
  });
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
      origin: siteOrigin,
    };

  if (posts[0]) {
    sample.permalink = `${siteOrigin}/blog/${sample.slug}/`;
    sample.origin = siteOrigin;
  }

  let postHtml = await renderPostEmail(sample);
  postHtml = postHtml
    .split("{{{RESEND_UNSUBSCRIBE_URL}}}")
    .join("#unsubscribe-preview");
  await writeFile(path.join(OUT, "post.html"), postHtml, "utf8");

  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const index = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${refreshMeta(2)}  <title>FIELD email previews</title>
  <style>
    body { margin: 0; background: #0a0810; color: #f2efe8; font-family: "Fira Mono", ui-monospace, monospace; padding: 2rem; }
    a { color: #18ff6d; }
    li { margin: 0.6rem 0; }
    .muted { color: #9a93a8; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>email previews</h1>
  <p class="muted">edit <code>emails/welcome.md</code> (copy) or <code>emails/*.html</code> (chrome), then <code>corn email</code>${WATCH ? " — watching; this page auto-refreshes" : ""}.</p>
  <p class="muted">built ${stamp}</p>
  <ul>
    <li><a href="./welcome.html">welcome</a> — first-time subscriber</li>
    <li><a href="./post.html">new post</a> — ${sample.title ? sample.title.replace(/</g, "") : "sample"}</li>
  </ul>
</body>
</html>`;
  await writeFile(path.join(OUT, "index.html"), index, "utf8");
  console.log(`[email] wrote ${OUT} (${stamp})`);
}

function startWatch() {
  let timer = null;
  let building = false;
  let queued = false;

  const kick = () => {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    rebuild()
      .catch((err) => {
        console.error("[email] rebuild failed:", err);
      })
      .finally(() => {
        building = false;
        if (queued) {
          queued = false;
          kick();
        }
      });
  };

  const schedule = (reason) => {
    if (reason && /[\\/]preview[\\/]/.test(String(reason).replace(/\\/g, "/"))) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(kick, 200);
  };

  for (const target of WATCH_PATHS) {
    try {
      watch(target, { recursive: true }, (_event, filename) => {
        schedule(filename || target);
      });
      console.log(`[email] watching ${path.relative(ROOT, target) || target}`);
    } catch (error) {
      console.warn(
        `[email] could not watch ${path.relative(ROOT, target)}:`,
        error.message
      );
    }
  }

  console.log(
    "[email] open emails/preview/ (or npx serve emails/preview -p 3939); Ctrl+C to stop"
  );
}

async function main() {
  await rebuild();
  console.log(
    `images → ${process.env.EMAIL_PREVIEW_ORIGIN || "http://127.0.0.1:3940"}/blog/…  (run: npx serve public -p 3940)\n` +
      `html   → open emails/preview/ or npx serve emails/preview -p 3939`
  );
  if (WATCH) startWatch();
}

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
