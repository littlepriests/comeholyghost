import { getStore } from "@netlify/blobs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";

const STORE_NAME = "visitors";
const COUNT_KEY = "count";

function json(status, body) {
    return Response.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store"
        }
    });
}

async function readCount(store) {
    const value = await store.get(COUNT_KEY, { type: "json" });
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
    }
    if (value && typeof value.count === "number" && Number.isFinite(value.count)) {
        return Math.max(0, Math.floor(value.count));
    }
    return 0;
}

export default async (request) => {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                Allow: "GET, POST, OPTIONS"
            }
        });
    }

    // Deploy preview / branch: no Blobs reads/writes (production counter stays clean).
    if (isPreviewDeploy()) {
        if (request.method === "GET") {
            return json(200, { count: 0, preview: true });
        }
        if (request.method === "POST") {
            return json(200, { count: 1, preview: true });
        }
        return json(405, { error: "Method not allowed." });
    }

    const store = getStore({ name: STORE_NAME, consistency: "strong" });

    if (request.method === "GET") {
        return json(200, { count: await readCount(store) });
    }

    if (request.method !== "POST") {
        return json(405, { error: "Method not allowed." });
    }

    // Fun GeoCities counter: one atomic-ish bump per POST. Browser sessionStorage
    // keeps a single tab from spamming; this is not hardened anti-bot.
    const current = await readCount(store);
    const next = current + 1;
    await store.setJSON(COUNT_KEY, next);
    return json(200, { count: next });
};

export const config = {
    path: "/api/visitors"
};
