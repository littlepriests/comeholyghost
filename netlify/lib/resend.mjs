import { createHmac, timingSafeEqual } from "node:crypto";
import { DEFAULT_ORIGIN, siteOrigin } from "./site.mjs";

const DEFAULT_NOTIFY_TO = "fellbeasts@proton.me";
const WEBHOOK_TOLERANCE_SEC = 300;

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
        siteOrigin: siteOrigin(),
        notifyTo: process.env.RESEND_NOTIFY_TO || DEFAULT_NOTIFY_TO,
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET || ""
    };
}

export function resendConfigured(cfg) {
    return !!(cfg && cfg.apiKey && cfg.from && cfg.segmentId);
}

/**
 * Verify a Resend (Svix) webhook signature against the raw body string.
 * Throws on failure; returns parsed JSON on success.
 */
export function verifyResendWebhook(rawBody, headers, webhookSecret) {
    const secret = String(webhookSecret || "").trim();
    if (!secret) throw new Error("missing webhook secret");
    const id = String(headers["svix-id"] || headers["webhook-id"] || "");
    const timestamp = String(
        headers["svix-timestamp"] || headers["webhook-timestamp"] || ""
    );
    const signatureHeader = String(
        headers["svix-signature"] || headers["webhook-signature"] || ""
    );
    if (!id || !timestamp || !signatureHeader) {
        throw new Error("missing svix headers");
    }
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) throw new Error("invalid timestamp");
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > WEBHOOK_TOLERANCE_SEC) {
        throw new Error("timestamp outside tolerance");
    }

    const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const key = Buffer.from(keyB64, "base64");
    const signed = `${id}.${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", key).update(signed).digest("base64");

    const parts = signatureHeader.split(/\s+/).filter(Boolean);
    let ok = false;
    for (const part of parts) {
        const [, sig] = part.split(",", 2);
        if (!sig) continue;
        const a = Buffer.from(expected);
        const b = Buffer.from(sig);
        if (a.length === b.length && timingSafeEqual(a, b)) {
            ok = true;
            break;
        }
    }
    if (!ok) throw new Error("no matching signature");
    return JSON.parse(rawBody);
}

/** Short owner ping when someone joins the list. */
export async function notifyOwnerSubscribe(cfg, subscriberEmail) {
    const to = (cfg && cfg.notifyTo) || DEFAULT_NOTIFY_TO;
    if (!cfg?.apiKey || !cfg?.from || !to) {
        return { ok: false, status: 0, body: { error: "notify not configured" } };
    }
    const email = String(subscriberEmail || "").trim().toLowerCase();
    const html = `<p>new FIELD subscriber:</p><p><strong>${escapeHtml(email)}</strong></p>`;
    return resendRequest(cfg.apiKey, "/emails", {
        from: cfg.from,
        to: [to],
        subject: `subscribe: ${email}`,
        html
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
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

/** Remove a contact entirely (drops them from the Resend Contacts list). */
export async function unsubscribeContact(cfg, email) {
    const encoded = encodeURIComponent(String(email || "").trim().toLowerCase());
    return resendRequest(cfg.apiKey, `/contacts/${encoded}`, null, "DELETE");
}

/** htmlOrOpts: HTML string, or { html, subject } from renderWelcomeEmail. */
export async function sendWelcomeEmail(cfg, email, htmlOrOpts) {
    const origin = (cfg.siteOrigin || DEFAULT_ORIGIN).replace(/\/$/, "");
    const unsubApi = `${origin}/api/unsubscribe?email=${encodeURIComponent(email)}`;
    const opts =
        htmlOrOpts && typeof htmlOrOpts === "object"
            ? htmlOrOpts
            : { html: htmlOrOpts, subject: "welcome to the FIELD" };
    return resendRequest(cfg.apiKey, "/emails", {
        from: cfg.from,
        to: [email],
        subject: String(opts.subject || "welcome to the FIELD").trim(),
        html: opts.html,
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
