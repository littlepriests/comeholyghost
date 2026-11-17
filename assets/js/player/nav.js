/** Same-site links swap #page-root and leave the player (and the audio element) in place. */
export function defineNav(s) {
    s.stylesheetPresent = function (absolute) {
        return Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
            try {
                return new URL(link.href, location.href).href === absolute;
            } catch (error) {
                return false;
            }
        });
    };

    s.ensureStyles = function (doc, baseHref) {
        let waits = [];
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
            let href = link.getAttribute("href");
            if (!href) return;
            let absolute = new URL(href, baseHref).href;
            if (s.stylesheetPresent(absolute)) return;
            waits.push(new Promise(function (resolve) {
                let copy = document.createElement("link");
                copy.rel = "stylesheet";
                copy.href = absolute;
                let integrity = link.getAttribute("integrity");
                if (integrity) {
                    copy.integrity = integrity;
                    copy.crossOrigin = link.getAttribute("crossorigin") || "anonymous";
                }
                copy.onload = resolve;
                copy.onerror = resolve;
                document.head.appendChild(copy);
            }));
        });
        return Promise.all(waits);
    };

    s.waitForFonts = function () {
        if (!document.fonts || !document.fonts.ready) return Promise.resolve();
        return Promise.race([
            document.fonts.ready.catch(function () {}),
            new Promise(function (resolve) {
                window.setTimeout(resolve, 180);
            })
        ]);
    };

    s.adopt = function (href, fromPop) {
        let current = document.getElementById("page-root");
        if (current) current.classList.add("is-page-pending");
        return fetch(href)
            .then(function (response) { return response.text(); })
            .then(function (text) {
                let doc = new DOMParser().parseFromString(text, "text/html");
                let incoming = doc.getElementById("page-root");
                current = document.getElementById("page-root");
                if (!incoming || !current) {
                    location.assign(href);
                    return;
                }
                return s.ensureStyles(doc, href)
                    .then(s.waitForFonts)
                    .then(function () {
                        current.replaceWith(document.importNode(incoming, true));
                        document.title = doc.title;
                        document.body.className = doc.body.className;
                        let nextRoot = document.getElementById("page-root");
                        if (nextRoot) {
                            nextRoot.classList.add("is-page-pending");
                            nextRoot.querySelectorAll("script[src]").forEach(function (old) {
                                let created = document.createElement("script");
                                created.src = new URL(old.getAttribute("src"), href).href;
                                created.onload = created.onerror = function () {
                                    created.remove();
                                };
                                document.body.appendChild(created);
                            });
                        }
                        // Bottom-right art is read-me .sword-figure only — never a
                        // fixed corner twin on home (SPA leftover cleanup).
                        if (document.body.classList.contains("home")) {
                            document.querySelectorAll(
                                '.site-backdrop[data-anchor="bottom-right"]'
                            ).forEach(function (node) {
                                node.remove();
                            });
                            // Banner decode gate if home.js has not run yet (or re-run).
                            requestAnimationFrame(function () {
                                if (typeof window.revealHomeBanner === "function") {
                                    window.revealHomeBanner();
                                }
                            });
                        }
                        // Homepage always opens on the minimalist chrome.
                        if (document.body.classList.contains("home")) s.chromeClosed = false;
                        s.applyPlayerChrome();
                        if (typeof window.refreshStarReadingVoids === "function") {
                            requestAnimationFrame(function () {
                                window.refreshStarReadingVoids();
                                requestAnimationFrame(function () {
                                    window.refreshStarReadingVoids();
                                    window.setTimeout(window.refreshStarReadingVoids, 200);
                                });
                            });
                        }
                        if (!fromPop) history.pushState({ player: true }, "", href);
                        if (location.hash) {
                            let target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
                            if (target) target.scrollIntoView();
                        } else {
                            window.scrollTo(0, 0);
                        }
                        requestAnimationFrame(function () {
                            let root = document.getElementById("page-root");
                            if (root) root.classList.remove("is-page-pending");
                        });
                    });
            })
            .catch(function () {
                let root = document.getElementById("page-root");
                if (root) root.classList.remove("is-page-pending");
                location.assign(href);
            });
    };
}
