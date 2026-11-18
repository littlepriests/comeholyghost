/**
 * True on deploy previews and branch deploys, where functions must not touch
 * Blobs or Resend. Invocations are still billed, so the browser also skips
 * the call (window.__SITE_SKIP_METERED_API__, set in head.html).
 */
export function isPreviewDeploy() {
    const ctx = String(process.env.CONTEXT || "");
    return ctx === "deploy-preview" || ctx === "branch-deploy";
}
