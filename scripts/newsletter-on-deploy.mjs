#!/usr/bin/env node
/**
 * First-publish newsletter sender (Resend Broadcast).
 *
 * Netlify build appends this script. It no-ops unless NEWSLETTER_AUTO_SEND=1
 * (or you pass --send) and Resend env vars are set.
 *
 * Ledger:
 *   - On Netlify: Blobs store `newsletter` / key `sent`
 *   - Locally: `.newsletter-sent.json` (gitignored)
 * First empty ledger seeds every existing post — nothing historical is sent.
 *
 *   node scripts/newsletter-on-deploy.mjs
 *   node scripts/newsletter-on-deploy.mjs --send --slug my-post
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listBlogPosts } from "../netlify/lib/newsletter-posts.mjs";
import { renderPostEmail } from "../netlify/lib/email-templates.mjs";
import {
    errorMessage,
    resendConfig,
    resendConfigured,
    sendPostBroadcast
} from "../netlify/lib/resend.mjs";
import { DEFAULT_ORIGIN } from "../netlify/lib/site.mjs";
import { openStore } from "../netlify/lib/stores.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_LEDGER = path.join(ROOT, ".newsletter-sent.json");

const args = new Set(process.argv.slice(2));
const forceSlug = (() => {
    const i = process.argv.indexOf("--slug");
    return i >= 0 ? process.argv[i + 1] : "";
})();
const wantSend = args.has("--send") || process.env.NEWSLETTER_AUTO_SEND === "1";

function onNetlify() {
    return process.env.NETLIFY === "true" || !!process.env.NETLIFY_BLOBS_CONTEXT;
}

async function getBlobStore() {
    if (!onNetlify()) return null;
    try {
        return await openStore("newsletter");
    } catch (error) {
        console.warn("[newsletter] blobs unavailable:", error && error.message);
        return null;
    }
}

async function loadLedger(store) {
    if (store) {
        const data = await store.get("sent", { type: "json" });
        const slugs = data && Array.isArray(data.slugs) ? data.slugs : [];
        return new Set(slugs.map(String));
    }
    try {
        const raw = await readFile(LOCAL_LEDGER, "utf8");
        const data = JSON.parse(raw);
        const slugs = Array.isArray(data.slugs) ? data.slugs : [];
        return new Set(slugs.map(String));
    } catch (error) {
        return new Set();
    }
}

async function saveLedger(store, set) {
    const payload = {
        updatedAt: new Date().toISOString(),
        slugs: Array.from(set).sort()
    };
    if (store) {
        await store.setJSON("sent", payload);
        return;
    }
    await writeFile(LOCAL_LEDGER, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
    const cfg = resendConfig();
    const origin = cfg.siteOrigin || DEFAULT_ORIGIN;
    const posts = await listBlogPosts(origin);
    const store = await getBlobStore();
    const ledger = await loadLedger(store);

    if (ledger.size === 0 && posts.length) {
        posts.forEach(function (post) {
            ledger.add(post.slug);
        });
        await saveLedger(store, ledger);
        console.log(
            `[newsletter] seeded ledger with ${posts.length} existing post(s); nothing sent.`
        );
        return;
    }

    let candidates = posts.filter(function (post) {
        return !ledger.has(post.slug);
    });
    if (forceSlug) {
        candidates = posts.filter(function (post) {
            return post.slug === forceSlug;
        });
        if (!candidates.length) {
            console.error(`[newsletter] unknown slug: ${forceSlug}`);
            process.exitCode = 1;
            return;
        }
    }

    if (!candidates.length) {
        console.log("[newsletter] no net-new posts.");
        return;
    }

    if (!wantSend) {
        console.log("[newsletter] dry-run (set NEWSLETTER_AUTO_SEND=1 or pass --send):");
        for (const post of candidates) {
            console.log(`  - ${post.slug} · ${post.title}`);
        }
        return;
    }

    if (!resendConfigured(cfg)) {
        console.error(
            "[newsletter] missing RESEND_API_KEY / RESEND_FROM / RESEND_SEGMENT_ID — skip send."
        );
        return;
    }

    for (const post of candidates) {
        const html = await renderPostEmail(post);
        const subject = post.title || "new from the FIELD";
        console.log(`[newsletter] broadcasting: ${post.slug}`);
        const result = await sendPostBroadcast(cfg, {
            subject,
            html,
            name: `blog:${post.slug}`,
            send: true
        });
        if (!result.ok) {
            console.error(`[newsletter] failed ${post.slug}:`, errorMessage(result, result.status));
            process.exitCode = 1;
            return;
        }
        ledger.add(post.slug);
        await saveLedger(store, ledger);
        console.log(`[newsletter] sent ${post.slug}`);
    }
}

main().catch(function (error) {
    console.error("[newsletter]", error);
    process.exitCode = 1;
});
