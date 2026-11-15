(function () {
    var starsHost = document.querySelector(".home-stars");
    if (!starsHost || starsHost.dataset.ready) return;
    starsHost.dataset.ready = "1";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var narrow = window.matchMedia("(max-width: 44.99rem)").matches;
    // Desktop ~110; phone ~55; reduced-motion: fewer static dots, no CSS anim relied on.
    var total = reduceMotion ? 40 : narrow ? 55 : 110;
    var positions = [];
    var minDist = narrow ? 4.2 : 3.8;

    function farEnough(x, y) {
        for (var i = 0; i < positions.length; i++) {
            var dx = positions[i].x - x;
            var dy = positions[i].y - y;
            if (dx * dx + dy * dy < minDist * minDist) return false;
        }
        return true;
    }

    function place(x, y) {
        positions.push({ x: x, y: y });
    }

    // Keep ASCII stars out of the middle reading column (roughly 20–80% on desktop).
    function awayFromText(x, y) {
        var inMiddleBand = x > 22 && x < 78;
        var inReadingHeight = y > 8 && y < 78;
        return !(inMiddleBand && inReadingHeight);
    }

    // Only a tight core around the moon art — leave the rest of the upper-left sky twinkling.
    // home.js also voids stars that land directly on .ascii-moon.
    function awayFromMoon(x, y) {
        return !(x < 14 && y > 10 && y < 22);
    }

    for (var i = 0; i < total; i++) {
        var x = 0;
        var y = 0;
        var tries = 0;
        do {
            x = Math.random() * 100;
            y = Math.random() * 100;
            tries += 1;
        } while (tries < 16 && (!farEnough(x, y) || !awayFromMoon(x, y)));
        if (!awayFromMoon(x, y)) continue;
        place(x, y);

        var star = document.createElement("span");
        var bright = Math.random() > 0.62;
        star.className = "home-stars__star" + (bright ? " is-bright" : "");
        star.style.left = x.toFixed(2) + "%";
        star.style.top = y.toFixed(2) + "%";
        star.style.setProperty("--star-size", (bright ? 2 + Math.random() * 2.6 : 1.1 + Math.random() * 1.9).toFixed(2) + "px");
        star.style.setProperty("--star-delay", (-Math.random() * 10).toFixed(2) + "s");
        star.style.setProperty("--star-duration", (bright ? 3.5 + Math.random() * 4 : 5 + Math.random() * 6).toFixed(2) + "s");
        star.style.setProperty("--star-opacity", (bright ? 0.75 + Math.random() * 0.25 : 0.4 + Math.random() * 0.45).toFixed(2));
        starsHost.appendChild(star);
    }

    // Sparse Joan-style star motif only (no ,O, / 000 blobs). Credit in docs/resources.md.
    var asciiStar = "  \\/\n-= * =-\n  /\\";
    minDist = 28;
    /* ASCII stars sit in the desktop gutters. A phone has no gutter. */
    if (!narrow) {
    var slots = reduceMotion
        ? [{ x: 6, y: 8 }, { x: 92, y: 22 }]
        : [
            { x: 6, y: 8 },
            { x: 14, y: 26 },
            { x: 92, y: 22 },
            { x: 10, y: 55 },
            { x: 90, y: 62 },
            { x: 12, y: 88 }
        ];
    var asciiCount = slots.length;
    for (var g = 0; g < asciiCount; g++) {
        var gx = slots[g].x + (Math.random() * 6 - 3);
        var gy = slots[g].y + (Math.random() * 8 - 4);
        var gTries = 0;
        while (gTries < 20 && (!farEnough(gx, gy) || !awayFromText(gx, gy))) {
            gx = g < 3 ? 4 + Math.random() * 14 : 82 + Math.random() * 14;
            gy = 12 + Math.random() * 76;
            gTries += 1;
        }
        if (!awayFromText(gx, gy) || !awayFromMoon(gx, gy)) continue;
        place(gx, gy);

        var glyph = document.createElement("pre");
        glyph.className = "home-stars__ascii-star";
        glyph.setAttribute("aria-hidden", "true");
        glyph.textContent = asciiStar;
        glyph.style.left = gx.toFixed(2) + "%";
        glyph.style.top = gy.toFixed(2) + "%";
        glyph.style.setProperty("--glyph-delay", (-Math.random() * 8).toFixed(2) + "s");
        glyph.style.setProperty("--glyph-duration", (7 + Math.random() * 6).toFixed(2) + "s");
        glyph.style.setProperty("--glyph-opacity", (0.22 + Math.random() * 0.28).toFixed(2));
        glyph.style.setProperty("--glyph-scale", (0.75 + Math.random() * 0.45).toFixed(2));
        starsHost.appendChild(glyph);
    }
    }

    // On inner pages, hide twinkles behind the reading column (title + body).
    // Header, footer, side gutters, and the aside keep stars.
    function clearReadingMask() {
        starsHost.classList.remove("is-reading-masked");
        starsHost.style.removeProperty("--read-void-x");
        starsHost.style.removeProperty("--read-void-y");
        starsHost.style.removeProperty("--read-void-w");
        starsHost.style.removeProperty("--read-void-h");
    }

    function clearSwordPocketStars() {
        var old = starsHost.querySelectorAll(".home-stars__star--pocket");
        for (var i = 0; i < old.length; i++) old[i].remove();
    }

    // Same sitewide dots, parked in the read-me column above the h1 so the
    // pocket around .sword-figure isn't an empty mid-band (random sky underserves it).
    // Nodes are reused; only left/top update on scroll so twinkles don't restart.
    function syncSwordPocketStars() {
        var fig = document.querySelector(".sword-figure");
        if (!fig || document.body.classList.contains("home")) {
            clearSwordPocketStars();
            return;
        }

        var column = document.querySelector(".page__body") || fig.parentElement;
        var header = document.querySelector(".content__header");
        if (!column) {
            clearSwordPocketStars();
            return;
        }

        var col = column.getBoundingClientRect();
        var fr = fig.getBoundingClientRect();
        var headerTop = header ? header.getBoundingClientRect().top : fr.bottom + 8;
        var vw = Math.max(window.innerWidth || 1, 1);
        var vh = Math.max(window.innerHeight || 1, 1);

        // Full main-column band from a little above the figure down to the h1.
        var left = Math.max(0, col.left);
        var right = Math.min(vw, col.right);
        var top = Math.max(0, Math.min(fr.top, col.top) - 12);
        var bottom = Math.max(top + 8, Math.min(vh, headerTop));
        if (right - left < 24 || bottom - top < 24) {
            clearSwordPocketStars();
            return;
        }

        // Opaque art core — keep dots on flanks / above rather than under paint.
        var corePadX = Math.max(12, fr.width * 0.18);
        var corePadY = Math.max(8, fr.height * 0.08);
        var coreLeft = fr.left + corePadX;
        var coreRight = fr.right - corePadX;
        var coreTop = fr.top + corePadY;
        var coreBottom = Math.min(fr.bottom - corePadY, bottom);
        var leftFlank = Math.max(8, fr.left - left);
        var rightFlank = Math.max(8, right - fr.right);
        var count = reduceMotion ? 10 : narrow ? 16 : 24;
        var nodes = starsHost.querySelectorAll(".home-stars__star--pocket");

        if (nodes.length !== count) {
            clearSwordPocketStars();
            for (var n = 0; n < count; n++) {
                var star = document.createElement("span");
                var bright = Math.random() > 0.55;
                // 0 = left flank, 1 = right flank, 2 = full width (mostly above).
                var lane = n % 5 === 0 ? 2 : n % 2;
                star.className =
                    "home-stars__star home-stars__star--pocket" +
                    (bright ? " is-bright" : "");
                star.dataset.lane = String(lane);
                star.dataset.tx = Math.random().toFixed(4);
                star.dataset.ty = Math.random().toFixed(4);
                star.style.setProperty(
                    "--star-size",
                    (bright ? 2 + Math.random() * 2.4 : 1.2 + Math.random() * 1.8).toFixed(2) +
                        "px"
                );
                star.style.setProperty("--star-delay", (-Math.random() * 10).toFixed(2) + "s");
                star.style.setProperty(
                    "--star-duration",
                    (bright ? 3.2 + Math.random() * 3.8 : 4.5 + Math.random() * 5.5).toFixed(2) +
                        "s"
                );
                star.style.setProperty(
                    "--star-opacity",
                    (bright ? 0.8 + Math.random() * 0.2 : 0.45 + Math.random() * 0.4).toFixed(2)
                );
                starsHost.appendChild(star);
            }
            nodes = starsHost.querySelectorAll(".home-stars__star--pocket");
        }

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var laneN = Number(node.dataset.lane) || 0;
            var tx = Number(node.dataset.tx);
            var ty = Number(node.dataset.ty);
            if (!(tx >= 0 && tx <= 1)) tx = 0.5;
            if (!(ty >= 0 && ty <= 1)) ty = 0.5;

            var px;
            var py = top + ty * (bottom - top);
            if (laneN === 0) {
                px = left + tx * leftFlank;
            } else if (laneN === 1) {
                px = fr.right + tx * rightFlank;
            } else {
                px = left + tx * (right - left);
                // Above-band bias for the full-width lane.
                py = top + ty * Math.max(12, Math.min(fr.top, bottom) - top);
            }

            if (px > coreLeft && px < coreRight && py > coreTop && py < coreBottom) {
                px = tx < 0.5 ? left + tx * leftFlank : fr.right + tx * rightFlank;
            }

            node.style.left = ((px / vw) * 100).toFixed(2) + "%";
            node.style.top = ((py / vh) * 100).toFixed(2) + "%";
        }
    }

    // The host is fixed and the page scrolls under it, so the hole is redrawn
    // from the reading column's current rect. The mask clips each star's glow too.
    function voidBehindArticleBodies() {
        syncSwordPocketStars();

        if (document.body.classList.contains("home")) {
            clearReadingMask();
            return;
        }

        var narrowNow = window.matchMedia("(max-width: 44.99rem)").matches;
        // Prefer the full main column so the h1 isn't left twinkling through.
        // Read-me sword figure: keep sitewide stars in the column above the h1
        // (negative space around the figure); void from the title down.
        var swordPage = !!document.querySelector(".sword-figure");
        var masks;
        if (swordPage) {
            masks = document.querySelectorAll(
                ".content__header, .content__body, .content__footer"
            );
        } else {
            masks = document.querySelectorAll(".page__body");
            if (!masks.length) {
                masks = document.querySelectorAll(
                    ".content__header, .content__body, .content__footer"
                );
            }
        }
        // Pad so a star beside the hole can't sit right against the letters.
        // On sword pages, do not pad upward into the figure pocket above the h1.
        // On a phone the pad stays small so the side gutter can still twinkle.
        var padX = narrowNow ? 12 : 64;
        var padY = narrowNow ? 12 : 48;
        var padYTop = swordPage ? 0 : padY;
        var union = null;
        for (var i = 0; i < masks.length; i++) {
            var cr = masks[i].getBoundingClientRect();
            if (cr.width < 1 || cr.height < 1) continue;
            if (cr.bottom < -padY || cr.top > window.innerHeight + padY) continue;
            var box = {
                left: cr.left - padX,
                right: cr.right + padX,
                top: cr.top - padYTop,
                bottom: cr.bottom + padY
            };
            if (!union) {
                union = {
                    left: box.left,
                    right: box.right,
                    top: box.top,
                    bottom: box.bottom
                };
            } else {
                union.left = Math.min(union.left, box.left);
                union.right = Math.max(union.right, box.right);
                union.top = Math.min(union.top, box.top);
                union.bottom = Math.max(union.bottom, box.bottom);
            }
        }

        // Host-level mask punches one hole for the whole reading strip (glow-safe).
        if (union) {
            starsHost.style.setProperty("--read-void-x", Math.round(union.left) + "px");
            starsHost.style.setProperty("--read-void-y", Math.round(union.top) + "px");
            starsHost.style.setProperty(
                "--read-void-w",
                Math.round(Math.max(0, union.right - union.left)) + "px"
            );
            starsHost.style.setProperty(
                "--read-void-h",
                Math.round(Math.max(0, union.bottom - union.top)) + "px"
            );
            starsHost.classList.add("is-reading-masked");
        } else {
            clearReadingMask();
        }
    }

    var voidFrame = 0;
    function scheduleVoids() {
        if (voidFrame) return;
        voidFrame = window.requestAnimationFrame(function () {
            voidFrame = 0;
            voidBehindArticleBodies();
        });
    }

    window.refreshStarReadingVoids = voidBehindArticleBodies;
    voidBehindArticleBodies();
    window.addEventListener("resize", scheduleVoids);
    window.addEventListener("scroll", scheduleVoids, { passive: true });
    window.addEventListener("load", voidBehindArticleBodies);
    // Images / fonts can shift the reading column after first paint (SPA + cold).
    window.setTimeout(voidBehindArticleBodies, 120);
    window.setTimeout(voidBehindArticleBodies, 480);
})();
