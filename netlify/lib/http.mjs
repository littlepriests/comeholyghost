export const MAX_EMAIL = 200;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function json(status, body) {
    return Response.json(body, {
        status,
        headers: { "Cache-Control": "no-store" }
    });
}

export function preflight(allow) {
    return new Response(null, {
        status: 204,
        headers: { Allow: allow }
    });
}

export function cleanEmail(value) {
    return String(value || "")
        .replace(/[\u0000-\u001F]/g, "")
        .trim()
        .slice(0, MAX_EMAIL)
        .toLowerCase();
}

/**
 * The request body as a plain object: JSON, form fields, or a bare
 * urlencoded body (RFC 8058 one-click unsubscribe POSTs may send no content
 * type). An empty body, or JSON that isn't an object, is {}. Throws when the
 * body can't be read or parsed.
 */
export async function readPayload(request) {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        const data = await request.json();
        return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    }
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const form = await request.formData();
        return Object.fromEntries(form.entries());
    }
    const text = await request.text();
    return text.includes("=") ? Object.fromEntries(new URLSearchParams(text).entries()) : {};
}
