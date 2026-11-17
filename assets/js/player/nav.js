/**
 * Same-site navigation that swaps #page-root and leaves the player (and its
 * <audio>) in place. Any failure falls back to a full page load.
 */
export function defineNav(s) {
    let navToken = 0;

    function stylesheetPresent(absolute) {
        return Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), (link) => {
            try {
                return new URL(link.href, location.href).href === absolute;
            } catch (error) {
                return false;
            }
        });
    }

    /** Adds the incoming page's stylesheets and resolves once they apply, so the swap doesn't flash unstyled. */
    function ensureStyles(doc, baseHref) {
        const waits = [];
        doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;
            const absolute = new URL(href, baseHref).href;
            if (stylesheetPresent(absolute)) return;
            waits.push(new Promise((resolve) => {
                const copy = document.createElement("link");
                copy.rel = "stylesheet";
                copy.href = absolute;
                const integrity = link.getAttribute("integrity");
                if (integrity) {
                    copy.integrity = integrity;
                    copy.crossOrigin = link.getAttribute("crossorigin") || "anonymous";
                }
                copy.onload = copy.onerror = resolve;
                document.head.appendChild(copy);
            }));
        });
        return Promise.all(waits);
    }

    /** Short cap: a page-only font shouldn't hold the swap, just avoid most reflow. */
    function waitForFonts() {
        if (!document.fonts || !document.fonts.ready) return Promise.resolve();
        return Promise.race([
            document.fonts.ready.catch(() => {}),
            new Promise((resolve) => window.setTimeout(resolve, 180)),
        ]);
    }

    /** importNode leaves <script> inert, so each src is re-added to run it. */
    function runScripts(root, baseHref) {
        root.querySelectorAll("script[src]").forEach((old) => {
            const created = document.createElement("script");
            created.src = new URL(old.getAttribute("src"), baseHref).href;
            const integrity = old.getAttribute("integrity");
            if (integrity) created.integrity = integrity;
            created.onload = created.onerror = () => created.remove();
            document.body.appendChild(created);
        });
    }

    /** Put keyboard and screen-reader focus on the new content instead of the removed node. */
    function focusMain(root) {
        const target = root.querySelector("main") || root;
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
    }

    function afterSwap(root, fromPop) {
        const home = document.body.classList.contains("home");
        if (home) {
            requestAnimationFrame(() => {
                if (typeof window.revealHomeBanner === "function") window.revealHomeBanner();
            });
            s.chromeClosed = false;
        }
        s.applyPlayerChrome();
        if (typeof window.refreshStarReadingVoids === "function") {
            // Re-measure across the next frames and once more after late image/font layout.
            requestAnimationFrame(() => {
                window.refreshStarReadingVoids();
                requestAnimationFrame(() => {
                    window.refreshStarReadingVoids();
                    window.setTimeout(window.refreshStarReadingVoids, 200);
                });
            });
        }
        const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView();
        else window.scrollTo(0, 0);
        focusMain(root);
        requestAnimationFrame(() => root.classList.remove("is-page-pending"));
    }

    s.adopt = function (href, fromPop) {
        const token = ++navToken;
        const pending = document.getElementById("page-root");
        if (pending) pending.classList.add("is-page-pending");
        return fetch(href)
            .then((response) => {
                const type = response.headers.get("content-type") || "";
                if (!response.ok || !type.includes("text/html")) throw new Error("nav " + response.status);
                return response.text();
            })
            .then((text) => {
                if (token !== navToken) return;
                const doc = new DOMParser().parseFromString(text, "text/html");
                const incoming = doc.getElementById("page-root");
                if (!incoming || !document.getElementById("page-root")) throw new Error("nav: no #page-root");
                return ensureStyles(doc, href)
                    .then(waitForFonts)
                    .then(() => {
                        if (token !== navToken) return;
                        const current = document.getElementById("page-root");
                        const next = document.importNode(incoming, true);
                        next.classList.add("is-page-pending");
                        current.replaceWith(next);
                        document.title = doc.title;
                        document.body.className = doc.body.className;
                        if (!fromPop) history.pushState({ player: true }, "", href);
                        runScripts(next, href);
                        afterSwap(next, fromPop);
                    });
            })
            .catch(() => {
                if (token !== navToken) return;
                location.assign(href);
            });
    };

    s.onLinkClick = function (event) {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest("a");
        if (!link || !link.href || s.player.contains(link)) return;
        if (link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
        let url;
        try {
            url = new URL(link.href);
        } catch (error) {
            return;
        }
        if (url.origin !== location.origin) return;
        // Same page (including #hash jumps) is left to the browser.
        if (url.pathname === location.pathname && url.search === location.search) return;
        // Feeds, images, audio, and other files aren't pages to swap in.
        if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname)) return;
        event.preventDefault();
        s.adopt(url.href, false);
    };
}
