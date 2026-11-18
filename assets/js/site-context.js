/**
 * Preview / branch deploys skip Netlify Function calls (visitors, guestbook, subscribe, unsubscribe)
 * so they don't burn function compute. Set at build time in head.html.
 *
 * window.__site holds run-once flags and the current page's AbortController
 * (lib/site.js pageSignal). It is created here, in the first script loaded, so
 * every later script can use it without a null-guard. Scripts talk to each
 * other through the events in lib/site.js, not through functions stored here.
 */
(function () {
    window.__site = window.__site || {};
    if (!window.__site.page) window.__site.page = new AbortController();

    let ctx = typeof window.__SITE_CONTEXT__ === "string" ? window.__SITE_CONTEXT__ : "";
    if (typeof window.__SITE_SKIP_METERED_API__ !== "boolean") {
        window.__SITE_SKIP_METERED_API__ =
            ctx === "deploy-preview" || ctx === "branch-deploy";
    }
    window.siteSkipMeteredApi = function () {
        return !!window.__SITE_SKIP_METERED_API__;
    };
})();
