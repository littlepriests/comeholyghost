import { getStore } from "@netlify/blobs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";

const STORE_NAME = "guestbook";
const ENTRIES_KEY = "entries";
const MAX_ENTRIES = 100;
const MAX_NAME = 80;
const MAX_MESSAGE = 500;

function json(status, body) {
    return Response.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store"
        }
    });
}

function cleanText(value, max) {
    return String(value || "")
        .replace(/\r\n/g, "\n")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .trim()
        .slice(0, max);
}

async function loadEntries(store) {
    const entries = await store.get(ENTRIES_KEY, { type: "json" });
    return Array.isArray(entries) ? entries : [];
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

    // Deploy preview / branch: no shared Blobs — keep production signatures clean.
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
        const entries = await loadEntries(store);
        return json(200, { entries });
    }

    if (request.method !== "POST") {
        return json(405, { error: "Method not allowed." });
    }

    let payload;
    const contentType = request.headers.get("content-type") || "";
    try {
        if (contentType.includes("application/json")) {
            payload = await request.json();
        } else {
            const form = await request.formData();
            payload = Object.fromEntries(form.entries());
        }
    } catch (err) {
        return json(400, { error: "Could not read that submission." });
    }

    // Honeypot: real visitors leave this empty.
    if (cleanText(payload.website || payload.company, MAX_NAME)) {
        return json(200, { entries: await loadEntries(store) });
    }

    const name = cleanText(payload.name, MAX_NAME);
    const message = cleanText(payload.message, MAX_MESSAGE);
    if (!name && !message) {
        return json(400, { error: "Write a name, a comment, or both." });
    }

    const now = new Date();
    const entry = {
        name,
        message,
        at: now.toISOString()
    };

    const entries = await loadEntries(store);
    entries.unshift(entry);
    await store.setJSON(ENTRIES_KEY, entries.slice(0, MAX_ENTRIES));

    return json(201, { entries: entries.slice(0, MAX_ENTRIES) });
};

export const config = {
    path: "/api/guestbook"
};
