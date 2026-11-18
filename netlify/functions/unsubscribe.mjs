import { EMAIL_RE, cleanEmail, json, preflight, readPayload } from "../lib/http.mjs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";
import {
    errorMessage,
    resendConfig,
    unsubscribeContact
} from "../lib/resend.mjs";
import { DEFAULT_ORIGIN } from "../lib/site.mjs";
import { unsubscribeSecret, validUnsubscribeToken } from "../lib/unsubscribe-token.mjs";

function emailFromRequest(request, payload) {
    const url = new URL(request.url);
    return cleanEmail(
        (payload && (payload.email || payload.Email)) || url.searchParams.get("email") || ""
    );
}

function tokenFromRequest(request, payload) {
    const url = new URL(request.url);
    return String((payload && payload.token) || url.searchParams.get("token") || "");
}

export default async (request) => {
    if (request.method === "OPTIONS") {
        return preflight("GET, POST, OPTIONS");
    }

    if (request.method === "GET") {
        // A clicked link lands on the Hugo page so a mail scanner's GET can't unsubscribe anyone.
        const url = new URL(request.url);
        const email = cleanEmail(url.searchParams.get("email") || "");
        const token = url.searchParams.get("token") || "";
        const origin = (process.env.URL || DEFAULT_ORIGIN).replace(/\/$/, "");
        // Pass the token through unchanged. Re-signing here would mint a valid
        // link for whatever address the query named.
        let dest = `${origin}/unsubscribe/`;
        if (email) {
            dest += `?email=${encodeURIComponent(email)}`;
            if (token) dest += `&token=${encodeURIComponent(token)}`;
        }
        return Response.redirect(dest, 302);
    }

    if (request.method !== "POST") {
        return json(405, { error: "Method not allowed." });
    }

    // One-click POSTs carry the email and token in the query, so an unreadable body still works.
    let payload;
    try {
        payload = await readPayload(request);
    } catch (error) {
        payload = {};
    }

    if (String(payload.website || payload.company || "").trim()) {
        return json(200, { message: "you're off the list." });
    }

    const email = emailFromRequest(request, payload);
    if (!email || !EMAIL_RE.test(email)) {
        return json(400, { error: "that doesn’t look like an email address." });
    }

    const secret = unsubscribeSecret();
    if (!secret) {
        return json(503, {
            error: "unsubscribe isn’t wired yet (set RESEND_API_KEY on Netlify)."
        });
    }
    if (!validUnsubscribeToken(secret, email, tokenFromRequest(request, payload))) {
        return json(403, { error: "that unsubscribe link isn’t valid. use the one from your email." });
    }

    if (isPreviewDeploy()) {
        return json(200, {
            message: "preview deploy — not changed on the real list.",
            preview: true
        });
    }

    const cfg = resendConfig();
    if (!cfg.apiKey) {
        return json(503, {
            error: "unsubscribe isn’t wired yet (set RESEND_API_KEY on Netlify)."
        });
    }

    const result = await unsubscribeContact(cfg, email);
    if (!result.ok) {
        // 404: never listed or already removed; same outcome for the visitor.
        if (result.status === 404) {
            return json(200, { message: "you're off the list." });
        }
        return json(502, {
            error: errorMessage(result, "couldn’t unsubscribe right now.")
        });
    }

    return json(200, { message: "you're off the list." });
};

export const config = {
    path: "/api/unsubscribe",
    includedFiles: ["netlify/lib/**"]
};
