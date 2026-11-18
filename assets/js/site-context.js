/**
 * Preview / branch deploys skip Netlify Function calls (visitors, guestbook, subscribe, unsubscribe)
 * so they don't burn function compute. Set at build time in head.html.
 *
 * window.__site is the shared namespace for cross-script hooks and flags. It is
 * initialized here (the first script loaded) so every subsequent script can safely
 * write to window.__site.X without a null-guard.
 */
(function () {
    window.__site = window.__site || {};

    let ctx = typeof window.__SITE_CONTEXT__ === "string" ? window.__SITE_CONTEXT__ : "";
    if (typeof window.__SITE_SKIP_METERED_API__ !== "boolean") {
        window.__SITE_SKIP_METERED_API__ =
            ctx === "deploy-preview" || ctx === "branch-deploy";
    }
    window.siteSkipMeteredApi = function () {
        return !!window.__SITE_SKIP_METERED_API__;
    };
})();
