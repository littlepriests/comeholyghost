export function initHomeClouds(windowBound) {
    let page = document.querySelector(".home-page");
    let root = document.querySelector(".home-root");

    function placeClouds() {
        if (!root || !page) return;
        let angel = document.querySelector(".ascii-angel");
        let footer = document.querySelector(".home-footer");
        let cloudsWrap = document.querySelector(".home-clouds");
        if (!angel || !footer) return;

        let rootBox = root.getBoundingClientRect();
        let ar = angel.getBoundingClientRect();
        let fr = footer.getBoundingClientRect();
        let hairY = fr.top;

        function setCloud(name, viewportX, viewportY, centerX, centerY) {
            let el =
                name === "nest"
                    ? document.querySelector(".ascii-cloud-nest")
                    : document.querySelector('.ascii-cloud[data-cloud="' + name + '"]');
            if (!el) return;
            let x = viewportX - rootBox.left;
            let y = viewportY - rootBox.top;
            let w = el.offsetWidth;
            let h = el.offsetHeight;
            if (centerX) x -= w / 2;
            if (centerY) y -= h / 2;
            // Keep the whole cloud above the hairline.
            let maxTop = hairY - rootBox.top - h - 6;
            if (y > maxTop) y = maxTop;
            el.style.left = x.toFixed(1) + "px";
            el.style.top = y.toFixed(1) + "px";
        }

        let halo = document.querySelector(".ascii-angel__halo");
        let wingR = document.querySelector(".ascii-angel__wing--right");
        let heart = document.querySelector('.ascii-cloud[data-cloud="heart"]');
        let heartHeading = null;
        page.querySelectorAll("h1").forEach(function (h) {
            let t = (h.textContent || "").replace(/\s+/g, "");
            if (t === "♡" || t === "#♡") heartHeading = h;
        });

        // Top cloud: above the cat over the halo↔right-wing pocket — no overlap.
        if (heart && halo && wingR) {
            let hr = halo.getBoundingClientRect();
            let wr = wingR.getBoundingClientRect();
            let haloCx = (hr.left + hr.right) / 2;
            let wingCx = (wr.left + wr.right) / 2;
            // Between halo and right wing, then ~8% further right.
            let zoneX = haloCx + (wingCx - haloCx) * 0.72 + ar.width * 0.08;
            let catClear = hr.top - 16;
            let textClear = heartHeading
                ? heartHeading.getBoundingClientRect().bottom + 8
                : catClear - 80;
            let avail = catClear - textClear;
            heart.style.fontSize = "";
            if (avail > 12) {
                let fs = parseFloat(window.getComputedStyle(heart).fontSize) || 4.5;
                let guard = 0;
                while (heart.offsetHeight > avail - 2 && fs > 3.2 && guard < 8) {
                    fs *= 0.92;
                    heart.style.fontSize = fs.toFixed(2) + "px";
                    guard += 1;
                }
            }
            let heartH = heart.offsetHeight || 56;
            let top = Math.max(textClear, catClear - heartH);
            if (top + heartH > catClear) top = catClear - heartH;
            setCloud("heart", zoneX, top, true, false);
        }

        // Two smaller clouds in the negative space right of # ♡.
        // gap-a left of the top heart cloud; gap-b peeks to its right (bg, no overlap).
        if (heartHeading) {
            let hb = heartHeading.getBoundingClientRect();
            let heartEl = document.querySelector('.ascii-cloud[data-cloud="heart"]');
            let heartBox = heartEl ? heartEl.getBoundingClientRect() : null;
            let pageBox = page.getBoundingClientRect();
            let gapY = hb.top + hb.height * 0.2;
            if (heartBox && heartBox.width > 0) {
                let leftGap = document.querySelector('.ascii-cloud[data-cloud="gap-a"]');
                let rightGap = document.querySelector('.ascii-cloud[data-cloud="gap-b"]');
                if (leftGap) {
                    setCloud("gap-a", heartBox.left - 14, gapY - 6, false, false);
                    leftGap.style.left =
                        (heartBox.left - 14 - rootBox.left - leftGap.offsetWidth).toFixed(1) +
                        "px";
                }
                if (rightGap) {
                    setCloud("gap-b", heartBox.right + 10, gapY + 10, false, false);
                }
            } else {
                let gapLeft = Math.max(hb.left + 72, pageBox.left + 100);
                let gapRight = pageBox.right - 24;
                let gapMid = gapLeft + (gapRight - gapLeft) * 0.4;
                setCloud("gap-a", gapMid, gapY, true, false);
                setCloud("gap-b", gapMid + (gapRight - gapLeft) * 0.32, gapY + 14, true, false);
            }
        }

        // Nest cloud just under the cat (guestbook sits inside on hover).
        let nestY = Math.min(ar.bottom + 10, hairY - 24);
        setCloud("nest", (ar.left + ar.right) / 2, nestY, true, true);

        let nestEl = document.querySelector(".ascii-cloud-nest");
        let nestBox = nestEl ? nestEl.getBoundingClientRect() : null;

        // Lower flanks — beside the nest; right stays in the background (no overlap).
        let flankY = nestBox
            ? (nestBox.top + nestBox.bottom) / 2
            : ar.bottom - ar.height * 0.16;
        let gap = 12;
        if (nestBox) {
            let leftEl = document.querySelector('.ascii-cloud[data-cloud="below"]');
            let rightEl = document.querySelector('.ascii-cloud[data-cloud="mid"]');
            if (leftEl) {
                setCloud("below", nestBox.left - gap, flankY, false, true);
                leftEl.style.left =
                    (nestBox.left - gap - rootBox.left - leftEl.offsetWidth).toFixed(1) + "px";
            }
            if (rightEl) {
                setCloud("mid", nestBox.right + gap, flankY + 4, false, true);
            }
        } else {
            setCloud("below", ar.left - 10, flankY, true, true);
            setCloud("mid", ar.right + 10, flankY + 4, false, true);
        }

        // Keep the guestbook CTA over the nest cloud when clouds are visible.
        // On narrow screens .home-clouds is display:none — clear inline coords so CSS can place it.
        let cta = angel.querySelector(".ascii-angel__cta");
        if (cta && nestEl) {
            let wrapCs = cloudsWrap ? window.getComputedStyle(cloudsWrap) : null;
            let nestCs = window.getComputedStyle(nestEl);
            let nr = nestEl.getBoundingClientRect();
            let wrapHidden =
                wrapCs &&
                (wrapCs.display === "none" || wrapCs.visibility === "hidden");
            let nestVisible =
                !wrapHidden &&
                nestCs.display !== "none" &&
                nestCs.visibility !== "hidden" &&
                nr.width > 1;
            if (!nestVisible) {
                cta.style.removeProperty("left");
                cta.style.removeProperty("top");
                cta.style.removeProperty("bottom");
                cta.style.removeProperty("transform");
                cta.style.removeProperty("min-width");
            } else {
                let ab = angel.getBoundingClientRect();
                cta.style.left = ((nr.left + nr.right) / 2 - ab.left).toFixed(1) + "px";
                cta.style.bottom = "auto";
                cta.style.top = (nr.top - ab.top + nr.height * 0.35).toFixed(1) + "px";
                cta.style.transform = "translate(-50%, 0)";
                cta.style.minWidth = Math.max(16, nr.width * 0.85).toFixed(1) + "px";
            }
        }

        if (cloudsWrap) cloudsWrap.classList.add("is-placed");
    }

    // Guestbook copy falls into the nest cloud on angel hover, then fades out on leave.
    (function bindAngelGuest() {
        let fig = document.querySelector(".ascii-angel");
        let nest = document.querySelector(".ascii-cloud-nest");
        if (!fig || !nest || !root || fig.dataset.guestBound) return;
        fig.dataset.guestBound = "1";
        let fadeTimer = 0;
        function on() {
            if (fadeTimer) {
                window.clearTimeout(fadeTimer);
                fadeTimer = 0;
            }
            nest.classList.remove("is-guest-out");
            nest.classList.add("is-guest");
            root.classList.add("is-angel-hover");
        }
        function off() {
            nest.classList.remove("is-guest");
            nest.classList.add("is-guest-out");
            root.classList.remove("is-angel-hover");
            fadeTimer = window.setTimeout(function () {
                nest.classList.remove("is-guest-out");
                fadeTimer = 0;
            }, 480);
        }
        fig.addEventListener("mouseenter", on);
        fig.addEventListener("mouseleave", off);
        fig.addEventListener("focusin", on);
        fig.addEventListener("focusout", function () {
            if (!fig.contains(document.activeElement)) off();
        });
    })();

    // Hide twinkling stars whose viewport point sits behind a cloud / moon box.
    function clearStarsBehindClouds() {
        let masks = document.querySelectorAll(
            ".ascii-cloud[data-cloud='heart'], .ascii-cloud[data-cloud='nest'], .ascii-cloud-nest, .ascii-moon"
        );
        let stars = document.querySelectorAll(".home-stars__star, .home-stars__ascii-star");
        if (!masks.length || !stars.length) return;
        let pad = 8;
        let rects = [];
        for (let i = 0; i < masks.length; i++) {
            let cr = masks[i].getBoundingClientRect();
            if (cr.width < 1 || cr.height < 1) continue;
            if (cr.bottom < 0 || cr.top > window.innerHeight) continue;
            rects.push(cr);
        }
        for (let s = 0; s < stars.length; s++) {
            let star = stars[s];
            let sr = star.getBoundingClientRect();
            let cx = (sr.left + sr.right) / 2;
            let cy = (sr.top + sr.bottom) / 2;
            let hit = false;
            for (let r = 0; r < rects.length; r++) {
                let box = rects[r];
                if (
                    cx >= box.left - pad &&
                    cx <= box.right + pad &&
                    cy >= box.top - pad &&
                    cy <= box.bottom + pad
                ) {
                    hit = true;
                    break;
                }
            }
            if (hit) star.classList.add("is-cloud-void");
            else star.classList.remove("is-cloud-void");
        }
    }

    function placeDecor() {
        placeClouds();
        clearStarsBehindClouds();
    }
    window.placeHomeDecor = placeDecor;
    window.__homeClearStars = clearStarsBehindClouds;
    placeDecor();
    if (!windowBound) {
        window.addEventListener("resize", function () {
            window.placeHomeDecor();
        });
        window.addEventListener("load", function () {
            window.placeHomeDecor();
        });
        window.addEventListener("scroll", function () {
            window.__homeClearStars();
        }, { passive: true });
    }
}
