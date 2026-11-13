import {
    renderWelcomeEmail
} from "../lib/email-templates.mjs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";
import {
    addContact,
    errorMessage,
    resendConfig,
    sendWelcomeEmail
} from "../lib/resend.mjs";

const MAX_EMAIL = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status, body) {
    return Response.json(body, {
        status,
        headers: { "Cache-Control": "no-store" }
    });
}

function cleanEmail(value) {
    return String(value || "")
        .replace(/[\u0000-\u001F]/g, "")
        .trim()
        .slice(0, MAX_EMAIL)
        .toLowerCase();
}

export default async (request) => {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: { Allow: "POST, OPTIONS" }
        });
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
    if (!cfg.apiKey || !cfg.from || !cfg.segmentId) {
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

    // Welcome only for brand-new contacts (409 = already on the list).
    if (contact.created) {
        try {
            const welcomeHtml = await renderWelcomeEmail({
                email,
                origin: cfg.siteOrigin
            });
            const sent = await sendWelcomeEmail(cfg, email, welcomeHtml);
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
    includedFiles: ["emails/**", "netlify/lib/**"]
};
