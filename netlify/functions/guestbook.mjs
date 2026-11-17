import { getStore } from "@netlify/blobs";
import { updateJSON } from "../lib/blob-update.mjs";
import { json, preflight, readPayload } from "../lib/http.mjs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";

const STORE_NAME = "guestbook";
const ENTRIES_KEY = "entries";
const MAX_ENTRIES = 100;
const MAX_NAME = 80;
const MAX_MESSAGE = 500;

/** Trims, caps length, and drops control characters other than newline and tab. */
function cleanText(value, max) {
    return String(value || "")
        .replace(/\r\n/g, "\n")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim()
        .slice(0, max);
}

function asEntries(value) {
    return Array.isArray(value) ? value : [];
}

export default async (request) => {
    if (request.method === "OPTIONS") {
        return preflight("GET, POST, OPTIONS");
    }

    // Previews have no access to the production store; the page falls back to localStorage.
    if (isPreviewDeploy()) {
        if (request.method === "GET") {
            return json(200, { entries: [], preview: true });
        }
        if (request.method !== "POST") {
            return json(405, { error: "Method not allowed." });
        }
        return json(200, {
            entries: [],
            preview: true,
            error: "Preview deploy — signatures aren’t saved. Try production or local storage."
        });
    }

    const store = getStore({ name: STORE_NAME, consistency: "strong" });

    if (request.method === "GET") {
        return json(200, { entries: asEntries(await store.get(ENTRIES_KEY, { type: "json" })) });
    }

    if (request.method !== "POST") {
        return json(405, { error: "Method not allowed." });
    }

    let payload;
    try {
        payload = await readPayload(request);
    } catch (err) {
        return json(400, { error: "Could not read that submission." });
    }

    // Bots fill the hidden field; answer like a success without saving.
    if (cleanText(payload.website || payload.company, MAX_NAME)) {
        return json(200, { entries: asEntries(await store.get(ENTRIES_KEY, { type: "json" })) });
    }

    const name = cleanText(payload.name, MAX_NAME);
    const message = cleanText(payload.message, MAX_MESSAGE);
    if (!name && !message) {
        return json(400, { error: "Write a name, a comment, or both." });
    }

    const entry = { name, message, at: new Date().toISOString() };
    try {
        const entries = await updateJSON(store, ENTRIES_KEY, (value) =>
            [entry, ...asEntries(value)].slice(0, MAX_ENTRIES)
        );
        return json(201, { entries });
    } catch (error) {
        return json(503, { error: "The guestbook is busy. Try again in a moment." });
    }
};

export const config = {
    path: "/api/guestbook"
};
