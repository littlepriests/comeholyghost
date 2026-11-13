/**
 * Preview / branch deploys skip Netlify Function calls (visitors, guestbook, subscribe)
 * so they don't burn function compute. Set at build time in head.html.
 */
(function () {
    var ctx = typeof window.__SITE_CONTEXT__ === "string" ? window.__SITE_CONTEXT__ : "";
    if (typeof window.__SITE_SKIP_METERED_API__ !== "boolean") {
        window.__SITE_SKIP_METERED_API__ =
            ctx === "deploy-preview" || ctx === "branch-deploy";
    }
    window.siteSkipMeteredApi = function () {
        return !!window.__SITE_SKIP_METERED_API__;
    };
})();
