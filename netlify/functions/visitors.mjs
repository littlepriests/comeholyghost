import { getStore } from "@netlify/blobs";
import { updateJSON } from "../lib/blob-update.mjs";
import { json, preflight } from "../lib/http.mjs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";

const STORE_NAME = "visitors";
const COUNT_KEY = "count";

/** Accepts a bare number or the older { count } shape. */
function toCount(value) {
    const raw = value && typeof value === "object" ? value.count : value;
    return typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
}

export default async (request) => {
    if (request.method === "OPTIONS") {
        return preflight("GET, POST, OPTIONS");
    }

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
        return json(200, { count: toCount(await store.get(COUNT_KEY, { type: "json" })) });
    }

    if (request.method !== "POST") {
        return json(405, { error: "Method not allowed." });
    }

    // One bump per POST. The browser's sessionStorage flag is the only
    // per-visitor limit; this is a toy counter, not bot-proof.
    try {
        const next = await updateJSON(store, COUNT_KEY, (value) => toCount(value) + 1);
        return json(200, { count: next });
    } catch (error) {
        return json(503, { error: "Counter is busy. Try again." });
    }
};

export const config = {
    path: "/api/visitors"
};
