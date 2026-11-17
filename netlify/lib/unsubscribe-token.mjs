import { createHmac, timingSafeEqual } from "node:crypto";
import { cleanEmail } from "./http.mjs";

/**
 * Key for unsubscribe links. UNSUBSCRIBE_SECRET, when set, keeps links valid
 * across an API-key rotation; otherwise the link is signed with RESEND_API_KEY,
 * which is already required to delete a contact.
 */
export function unsubscribeSecret() {
    return String(process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || "");
}

/** base64url HMAC of the cleaned address. Same input always gives the same token. */
export function signUnsubscribe(secret, email) {
    return createHmac("sha256", String(secret)).update(cleanEmail(email)).digest("base64url");
}

export function unsubscribeQuery(secret, email) {
    const clean = cleanEmail(email);
    return `email=${encodeURIComponent(clean)}&token=${encodeURIComponent(signUnsubscribe(secret, clean))}`;
}

export function validUnsubscribeToken(secret, email, token) {
    const given = String(token || "");
    if (!secret || !cleanEmail(email) || !given) return false;
    const expected = Buffer.from(signUnsubscribe(secret, email));
    const actual = Buffer.from(given);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
}
