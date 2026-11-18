/** Hides stars behind the reading column and fills the read-me sword-figure pocket. */
export function bindStarVoids(starsHost) {
    let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let narrow = window.matchMedia("(max-width: 44.99rem)").matches; // matches CSS mobile breakpoint

    function clearReadingMask() {
        starsHost.classList.remove("is-reading-masked");
        starsHost.style.removeProperty("--read-void-x");
        starsHost.style.removeProperty("--read-void-y");
        starsHost.style.removeProperty("--read-void-w");
        starsHost.style.removeProperty("--read-void-h");
    }

    function clearSwordPocketStars() {
        let old = starsHost.querySelectorAll(".home-stars__star--pocket");
        for (let i = 0; i < old.length; i++) old[i].remove();
    }

    // The random sky rarely lands in the read-me pocket around .sword-figure,
    // so extra dots are placed there. Nodes are reused and only left/top change
    // on scroll, so their twinkle animations don't restart.
    function syncSwordPocketStars() {
        let fig = document.querySelector(".sword-figure");
        if (!fig || document.body.classList.contains("home")) {
            clearSwordPocketStars();
            return;
        }

        let column = document.querySelector(".page__body") || fig.parentElement;
        let header = document.querySelector(".content__header");
        if (!column) {
            clearSwordPocketStars();
            return;
        }

        let col = column.getBoundingClientRect();
        let fr = fig.getBoundingClientRect();
        let headerTop = header ? header.getBoundingClientRect().top : fr.bottom + 8;
        let vw = Math.max(window.innerWidth || 1, 1);
        let vh = Math.max(window.innerHeight || 1, 1);

        // Band: the column's width, from just above the figure down to the h1.
        let left = Math.max(0, col.left);
        let right = Math.min(vw, col.right);
        let top = Math.max(0, Math.min(fr.top, col.top) - 12);
        let bottom = Math.max(top + 8, Math.min(vh, headerTop));
        if (right - left < 24 || bottom - top < 24) {
            clearSwordPocketStars();
            return;
        }

        // Dots under the figure's opaque middle would be invisible; move them to the flanks.
        let corePadX = Math.max(12, fr.width * 0.18);
        let corePadY = Math.max(8, fr.height * 0.08);
        let coreLeft = fr.left + corePadX;
        let coreRight = fr.right - corePadX;
        let coreTop = fr.top + corePadY;
        let coreBottom = Math.min(fr.bottom - corePadY, bottom);
        let leftFlank = Math.max(8, fr.left - left);
        let rightFlank = Math.max(8, right - fr.right);
        let count = reduceMotion ? 10 : narrow ? 16 : 24;
        let nodes = starsHost.querySelectorAll(".home-stars__star--pocket");

        if (nodes.length !== count) {
            clearSwordPocketStars();
            for (let n = 0; n < count; n++) {
                let star = document.createElement("span");
                let bright = Math.random() > 0.55;
                // 0 = left flank, 1 = right flank, 2 = full width (mostly above).
                let lane = n % 5 === 0 ? 2 : n % 2;
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

        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            let laneN = Number(node.dataset.lane) || 0;
            let tx = Number(node.dataset.tx);
            let ty = Number(node.dataset.ty);
            if (!(tx >= 0 && tx <= 1)) tx = 0.5;
            if (!(ty >= 0 && ty <= 1)) ty = 0.5;

            let px;
            let py = top + ty * (bottom - top);
            if (laneN === 0) {
                px = left + tx * leftFlank;
            } else if (laneN === 1) {
                px = fr.right + tx * rightFlank;
            } else {
                px = left + tx * (right - left);
                // Full-width lane stays above the figure.
                py = top + ty * Math.max(12, Math.min(fr.top, bottom) - top);
            }

            if (px > coreLeft && px < coreRight && py > coreTop && py < coreBottom) {
                px = tx < 0.5 ? left + tx * leftFlank : fr.right + tx * rightFlank;
            }

            node.style.left = ((px / vw) * 100).toFixed(2) + "%";
            node.style.top = ((py / vh) * 100).toFixed(2) + "%";
        }
    }

    // Inner pages: a CSS mask on the fixed star host punches one hole behind the
    // reading column (masking the host also clips each star's glow). The page
    // scrolls under the host, so the hole is recomputed from current rects.
    function voidBehindArticleBodies() {
        syncSwordPocketStars();

        if (document.body.classList.contains("home")) {
            clearReadingMask();
            return;
        }

        let narrowNow = window.matchMedia("(max-width: 44.99rem)").matches;
        // Read-me masks from the h1 down so the pocket above stays starry;
        // everything else masks the whole column.
        let swordPage = !!document.querySelector(".sword-figure");
        let masks;
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
        // Padding keeps glows off the letters; small on phones so the gutter still twinkles.
        let padX = narrowNow ? 12 : 64;
        let padY = narrowNow ? 12 : 48;
        let padYTop = swordPage ? 0 : padY;
        let union = null;
        for (let i = 0; i < masks.length; i++) {
            let cr = masks[i].getBoundingClientRect();
            if (cr.width < 1 || cr.height < 1) continue;
            if (cr.bottom < -padY || cr.top > window.innerHeight + padY) continue;
            let box = {
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

    let voidFrame = 0;
    function scheduleVoids() {
        if (voidFrame) return;
        voidFrame = window.requestAnimationFrame(function () {
            voidFrame = 0;
            voidBehindArticleBodies();
        });
    }

    if (window.__site) window.__site.refreshStarReadingVoids = voidBehindArticleBodies;
    voidBehindArticleBodies();
    window.addEventListener("resize", scheduleVoids);
    window.addEventListener("scroll", scheduleVoids, { passive: true });
    window.addEventListener("load", voidBehindArticleBodies);
    // Late images and fonts move the column after first paint.
    window.setTimeout(voidBehindArticleBodies, 120);
    window.setTimeout(voidBehindArticleBodies, 480);
}
