import { DEFAULT_ORIGIN, siteOrigin } from "./site.mjs";

export async function resendRequest(apiKey, route, payload, method) {
    const response = await fetch(`https://api.resend.com${route}`, {
        method: method || "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: payload == null ? undefined : JSON.stringify(payload)
    });
    let body = null;
    try {
        body = await response.json();
    } catch (error) {
        body = null;
    }
    return { ok: response.ok, status: response.status, body };
}

export function resendConfig() {
    return {
        apiKey: process.env.RESEND_API_KEY || "",
        from: process.env.RESEND_FROM || "",
        segmentId: process.env.RESEND_SEGMENT_ID || "",
        siteOrigin: siteOrigin()
    };
}

export function resendConfigured(cfg) {
    return !!(cfg && cfg.apiKey && cfg.from && cfg.segmentId);
}

/** Add contact to segment. Returns { ok, created, status, body }. */
export async function addContact(cfg, email) {
    const result = await resendRequest(cfg.apiKey, "/contacts", {
        email,
        unsubscribed: false,
        segments: [{ id: cfg.segmentId }]
    });
    if (result.ok) {
        return { ok: true, created: true, status: result.status, body: result.body };
    }
    // Already exists
    if (result.status === 409) {
        return { ok: true, created: false, status: 409, body: result.body };
    }
    return { ok: false, created: false, status: result.status, body: result.body };
}

/** Mark a contact unsubscribed (stops Broadcasts). */
export async function unsubscribeContact(cfg, email) {
    const encoded = encodeURIComponent(String(email || "").trim().toLowerCase());
    return resendRequest(cfg.apiKey, `/contacts/${encoded}`, { unsubscribed: true }, "PATCH");
}

export async function sendWelcomeEmail(cfg, email, html) {
    const origin = (cfg.siteOrigin || DEFAULT_ORIGIN).replace(/\/$/, "");
    const unsubApi = `${origin}/api/unsubscribe?email=${encodeURIComponent(email)}`;
    return resendRequest(cfg.apiKey, "/emails", {
        from: cfg.from,
        to: [email],
        subject: "welcome to the FIELD",
        html,
        headers: {
            "List-Unsubscribe": `<${unsubApi}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
        }
    });
}

export async function sendPostBroadcast(cfg, options) {
    const opts = options || {};
    return resendRequest(cfg.apiKey, "/broadcasts", {
        segment_id: cfg.segmentId,
        from: cfg.from,
        subject: opts.subject,
        html: opts.html,
        name: opts.name || opts.subject,
        send: opts.send !== false
    });
}

export function errorMessage(result, fallback) {
    const body = result && result.body;
    if (!body) return fallback;
    if (typeof body.message === "string") return body.message;
    if (typeof body.error === "string") return body.error;
    return fallback;
}
