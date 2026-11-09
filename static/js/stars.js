(function () {
    var starsHost = document.querySelector(".home-stars");
    if (!starsHost || starsHost.dataset.ready) return;
    starsHost.dataset.ready = "1";

    // Prior 180 → ~15% → 153 → another ~5% → 145.
    var total = 145;
    var positions = [];
    var minDist = 3.6;

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
    var asciiCount = 5;
    minDist = 28;
    var slots = [
        { x: 6, y: 8 },
        { x: 14, y: 26 },
        { x: 92, y: 22 },
        { x: 10, y: 55 },
        { x: 90, y: 62 },
        { x: 12, y: 88 }
    ];
    asciiCount = slots.length;
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

    // On article pages, hide blinking stars behind the reading column only.
    // Gradient stays; gutters keep their twinkles.
    function voidBehindArticleBodies() {
        var stars = document.querySelectorAll(".home-stars__star, .home-stars__ascii-star");
        if (!stars.length) return;

        if (document.body.classList.contains("home")) {
            for (var c = 0; c < stars.length; c++) {
                stars[c].classList.remove("is-reading-void");
            }
            return;
        }

        var masks = document.querySelectorAll(".content__body");
        if (!masks.length) masks = document.querySelectorAll(".page__body");
        var rects = [];
        var pad = 10;
        for (var i = 0; i < masks.length; i++) {
            var cr = masks[i].getBoundingClientRect();
            if (cr.width < 1 || cr.height < 1) continue;
            if (cr.bottom < 0 || cr.top > window.innerHeight) continue;
            rects.push(cr);
        }

        for (var s = 0; s < stars.length; s++) {
            var star = stars[s];
            if (!rects.length) {
                star.classList.remove("is-reading-void");
                continue;
            }
            var sr = star.getBoundingClientRect();
            var cx = (sr.left + sr.right) / 2;
            var cy = (sr.top + sr.bottom) / 2;
            var hit = false;
            for (var r = 0; r < rects.length; r++) {
                var box = rects[r];
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
            if (hit) star.classList.add("is-reading-void");
            else star.classList.remove("is-reading-void");
        }
    }

    window.refreshStarReadingVoids = voidBehindArticleBodies;
    voidBehindArticleBodies();
    window.addEventListener("resize", voidBehindArticleBodies);
    window.addEventListener("scroll", voidBehindArticleBodies, { passive: true });
    window.addEventListener("load", voidBehindArticleBodies);
})();
