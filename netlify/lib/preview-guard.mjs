/**
 * Deploy Previews / branch deploys: avoid Blobs + Resend side effects.
 * Netlify still bills function *invocations* as compute if the client calls them —
 * pair this with window.__SITE_SKIP_METERED_API__ so the browser usually never hits us.
 */
export function isPreviewDeploy() {
    const ctx = String(process.env.CONTEXT || "");
    return ctx === "deploy-preview" || ctx === "branch-deploy";
}
