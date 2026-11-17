#!/usr/bin/env node
/**
 * Rebuild emails/preview/*.html from the live templates + sample/real post data.
 * Open emails/preview/index.html in a browser (not published by Hugo).
 *
 *   node scripts/preview-emails.mjs
 *   node scripts/preview-emails.mjs --watch
 *   corn email           rebuild + serve welcome & post at :3939 (+ public/ :3940)
 *   corn email --watch   same, and rebuild when templates/posts change
 */
import { createServer } from "node:http";
import { watch } from "node:fs";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "emails", "preview");
const WATCH = process.argv.includes("--watch");
const PREVIEW_PORT = Number(process.env.EMAIL_PREVIEW_PORT || 3939);
const ASSET_PORT = Number(process.env.EMAIL_ASSET_PORT || 3940);
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}/`;

const WATCH_PATHS = [
  path.join(ROOT, "emails"),
  path.join(ROOT, "netlify", "lib", "email-templates.mjs"),
  path.join(ROOT, "netlify", "lib", "newsletter-posts.mjs"),
  path.join(ROOT, "content", "blog"),
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

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
    process.env.EMAIL_PREVIEW_ORIGIN || `http://127.0.0.1:${ASSET_PORT}`;
  const siteOrigin = DEFAULT_ORIGIN;

  const welcome = await renderWelcomeEmail({
    email: "you@example.com",
    origin: siteOrigin,
  });
  await writeFile(path.join(OUT, "welcome.html"), welcome.html, "utf8");

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
  <p class="muted">edit <code>emails/welcome.md</code> (copy) or <code>emails/*.html</code> (chrome)${WATCH ? " — watching; this page auto-refreshes" : ", then <code>corn email</code>"}.</p>
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

function safeJoin(rootDir, urlPath) {
  const decoded = decodeURIComponent(String(urlPath || "/").split("?")[0]);
  const rel = decoded.replace(/^\/+/, "") || "index.html";
  const abs = path.resolve(rootDir, rel);
  const rootResolved = path.resolve(rootDir);
  if (!abs.startsWith(rootResolved + path.sep) && abs !== rootResolved) {
    return null;
  }
  return abs;
}

function startStaticServer(rootDir, port, label) {
  const server = createServer(async (req, res) => {
    try {
      let filePath = safeJoin(rootDir, req.url || "/");
      if (!filePath) {
        res.writeHead(403).end("forbidden");
        return;
      }
      let st;
      try {
        st = await stat(filePath);
      } catch {
        res.writeHead(404).end("not found");
        return;
      }
      if (st.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }
      const body = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch (error) {
      res.writeHead(500).end(String(error && error.message ? error.message : error));
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        console.error(
          `[email] ${label} port ${port} in use. Free it or set EMAIL_PREVIEW_PORT / EMAIL_ASSET_PORT.`
        );
      } else {
        console.error(`[email] ${label} server failed:`, error);
      }
      reject(error);
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(
        `[email] ${label} → http://127.0.0.1:${port}/`
      );
      resolve(server);
    });
  });
}

async function startServers({ open = true } = {}) {
  await startStaticServer(OUT, PREVIEW_PORT, "previews (welcome + post)");
  const publicDir = path.join(ROOT, "public");
  try {
    await stat(publicDir);
    await startStaticServer(publicDir, ASSET_PORT, "post images (public/)");
  } catch {
    console.log(
      `[email] no public/ yet — post Fit images need a Hugo build, then restart corn email`
    );
  }
  if (open) openBrowser(PREVIEW_URL);
  console.log("[email] Ctrl+C to stop");
}

function openBrowser(url) {
  if (process.env.EMAIL_PREVIEW_NO_OPEN === "1") return;
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], {
        stdio: "ignore",
        detached: true,
      }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    } else {
      spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
    }
  } catch {
    // ignore
  }
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
}

async function main() {
  await rebuild();
  await startServers({ open: true });
  if (WATCH) startWatch();
}

main().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
