export const DEFAULT_ORIGIN = "https://cornfieldjournal.com";

/** Netlify's site URL (or the custom domain when unset), without a trailing slash. */
export function siteOrigin() {
    return (process.env.URL || process.env.DEPLOY_PRIME_URL || DEFAULT_ORIGIN).replace(/\/$/, "");
}
