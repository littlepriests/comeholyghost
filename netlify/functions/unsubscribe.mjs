import { EMAIL_RE, cleanEmail, json, preflight } from "../lib/http.mjs";
import { isPreviewDeploy } from "../lib/preview-guard.mjs";
import {
    errorMessage,
    resendConfig,
    unsubscribeContact
} from "../lib/resend.mjs";
import { DEFAULT_ORIGIN } from "../lib/site.mjs";

function emailFromRequest(request, payload) {
    const url = new URL(request.url);
    return cleanEmail(
        (payload && (payload.email || payload.Email)) || url.searchParams.get("email") || ""
    );
}

export default async (request) => {
    if (request.method === "OPTIONS") {
        return preflight("GET, POST, OPTIONS");
    }

    if (request.method === "GET") {
        // Human clicks should land on the Hugo page; API GET is for probes.
        const url = new URL(request.url);
        const email = cleanEmail(url.searchParams.get("email") || "");
        const origin = (process.env.URL || DEFAULT_ORIGIN).replace(/\/$/, "");
        const dest = email
            ? `${origin}/unsubscribe/?email=${encodeURIComponent(email)}`
            : `${origin}/unsubscribe/`;
        return Response.redirect(dest, 302);
    }

    if (request.method !== "POST") {
        return json(405, { error: "Method not allowed." });
    }

    let payload = {};
    const contentType = request.headers.get("content-type") || "";
    try {
        if (contentType.includes("application/json")) {
            payload = await request.json();
        } else if (
            contentType.includes("application/x-www-form-urlencoded") ||
            contentType.includes("multipart/form-data")
        ) {
            const form = await request.formData();
            payload = Object.fromEntries(form.entries());
        } else {
            // RFC 8058 one-click may POST with little/no body; email is in the query.
            const text = await request.text();
            if (text && text.includes("=")) {
                payload = Object.fromEntries(new URLSearchParams(text).entries());
            }
        }
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
        // 404 = already gone / never listed — treat as success for the user.
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
