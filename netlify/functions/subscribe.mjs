import {
    renderWelcomeEmail
} from "../lib/email-templates.mjs";
import { EMAIL_RE, cleanEmail, json, preflight, readPayload } from "../lib/http.mjs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";
import {
    addContact,
    errorMessage,
    notifyOwnerSubscribe,
    resendConfig,
    resendConfigured,
    sendWelcomeEmail
} from "../lib/resend.mjs";

export default async (request) => {
    if (request.method === "OPTIONS") {
        return preflight("POST, OPTIONS");
    }

    if (request.method !== "POST") {
        return json(405, { error: "Method not allowed." });
    }

    let payload;
    try {
        payload = await readPayload(request);
    } catch (error) {
        return json(400, { error: "Could not read that submission." });
    }

    if (String(payload.website || payload.company || "").trim()) {
        return json(200, { message: "you're on the list." });
    }

    const email = cleanEmail(payload.email);
    if (!email || !EMAIL_RE.test(email)) {
        return json(400, { error: "that doesn’t look like an email address." });
    }

    if (isPreviewDeploy()) {
        return json(200, {
            message: "preview deploy — not added to the real list. merge to main to test Resend.",
            preview: true
        });
    }

    const cfg = resendConfig();
    if (!resendConfigured(cfg)) {
        return json(503, {
            error: "subscribe isn’t wired yet (set RESEND_API_KEY, RESEND_FROM, RESEND_SEGMENT_ID on Netlify)."
        });
    }

    const contact = await addContact(cfg, email);
    if (!contact.ok) {
        return json(502, {
            error: errorMessage(contact, "couldn’t add you to the list.")
        });
    }

    if (contact.created) {
        // resend-webhook.mjs also pings on contact.created; this covers a lagging
        // or unconfigured webhook. A failed ping must not fail the subscriber.
        try {
            await notifyOwnerSubscribe(cfg, email);
        } catch (error) {}
        try {
            const welcome = await renderWelcomeEmail({
                email,
                origin: cfg.siteOrigin
            });
            const sent = await sendWelcomeEmail(cfg, email, welcome);
            if (!sent.ok) {
                return json(502, {
                    error: errorMessage(sent, "you’re listed, but the welcome note didn’t send.")
                });
            }
        } catch (error) {
            return json(502, {
                error: "you’re listed, but the welcome template couldn’t load."
            });
        }
        return json(201, {
            message: "you're on the list. check your inbox for a hello."
        });
    }

    return json(200, {
        message: "you're already on the list — no extra welcome this time."
    });
};

export const config = {
    path: "/api/subscribe",
    includedFiles: ["emails/welcome.md", "emails/welcome.html", "netlify/lib/**"]
};
