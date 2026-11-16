import { json, preflight } from "../lib/http.mjs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";
import {
    notifyOwnerSubscribe,
    resendConfig,
    verifyResendWebhook
} from "../lib/resend.mjs";

/**
 * Resend → Netlify webhook.
 * Configure in Resend dashboard: POST https://cornfieldjournal.com/api/resend-webhook
 * Event: contact.created. Signing secret → RESEND_WEBHOOK_SECRET on Netlify.
 */
export default async (request) => {
    if (request.method === "OPTIONS") {
        return preflight("POST, OPTIONS");
    }
    if (request.method !== "POST") {
        return json(405, { error: "Method not allowed." });
    }

    if (isPreviewDeploy()) {
        return json(200, { ok: true, preview: true });
    }

    const cfg = resendConfig();
    if (!cfg.webhookSecret) {
        return json(503, {
            error: "set RESEND_WEBHOOK_SECRET on Netlify (from the Resend webhook page)."
        });
    }

    const rawBody = await request.text();
    let event;
    try {
        event = verifyResendWebhook(
            rawBody,
            {
                "svix-id": request.headers.get("svix-id"),
                "svix-timestamp": request.headers.get("svix-timestamp"),
                "svix-signature": request.headers.get("svix-signature")
            },
            cfg.webhookSecret
        );
    } catch (error) {
        return json(400, { error: "invalid webhook signature." });
    }

    const type = String(event?.type || "");
    if (type !== "contact.created") {
        return json(200, { ok: true, ignored: type || "unknown" });
    }

    const email = String(event?.data?.email || "").trim().toLowerCase();
    if (!email) {
        return json(200, { ok: true, ignored: "no email" });
    }

    if (!cfg.apiKey || !cfg.from) {
        return json(503, {
            error: "RESEND_API_KEY / RESEND_FROM required to notify."
        });
    }

    const sent = await notifyOwnerSubscribe(cfg, email);
    if (!sent.ok) {
        return json(502, { error: "couldn’t send owner notify." });
    }
    return json(200, { ok: true, notified: true });
};

export const config = {
    path: "/api/resend-webhook",
    includedFiles: ["netlify/lib/**"]
};
