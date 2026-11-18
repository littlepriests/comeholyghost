import { mq } from "../lib/media.js";

/** Twinkling dots and the sparse ASCII stars in the gutters. */
export function paintStarfield(starsHost) {
    let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let narrow = mq("mobile").matches;
    let total = reduceMotion ? 40 : narrow ? 55 : 110;
    let positions = [];
    let minDist = narrow ? 4.2 : 3.8;

    function farEnough(x, y) {
        for (let i = 0; i < positions.length; i++) {
            let dx = positions[i].x - x;
            let dy = positions[i].y - y;
            if (dx * dx + dy * dy < minDist * minDist) return false;
        }
        return true;
    }

    function place(x, y) {
        positions.push({ x: x, y: y });
    }

    // Positions are viewport percentages; the reading column is roughly 22–78% wide.
    function awayFromText(x, y) {
        let inMiddleBand = x > 22 && x < 78;
        let inReadingHeight = y > 8 && y < 78;
        return !(inMiddleBand && inReadingHeight);
    }

    // A tight box around the homepage moon; home/clouds.js hides any star that still lands on it.
    function awayFromMoon(x, y) {
        return !(x < 14 && y > 10 && y < 22);
    }

    for (let i = 0; i < total; i++) {
        let x = 0;
        let y = 0;
        let tries = 0;
        do {
            x = Math.random() * 100;
            y = Math.random() * 100;
            tries += 1;
        } while (tries < 16 && (!farEnough(x, y) || !awayFromMoon(x, y)));
        if (!awayFromMoon(x, y)) continue;
        place(x, y);

        let star = document.createElement("span");
        let bright = Math.random() > 0.62;
        star.className = "home-stars__star" + (bright ? " is-bright" : "");
        star.style.left = x.toFixed(2) + "%";
        star.style.top = y.toFixed(2) + "%";
        star.style.setProperty("--star-size", (bright ? 2 + Math.random() * 2.6 : 1.1 + Math.random() * 1.9).toFixed(2) + "px");
        star.style.setProperty("--star-delay", (-Math.random() * 10).toFixed(2) + "s");
        star.style.setProperty("--star-duration", (bright ? 3.5 + Math.random() * 4 : 5 + Math.random() * 6).toFixed(2) + "s");
        star.style.setProperty("--star-opacity", (bright ? 0.75 + Math.random() * 0.25 : 0.4 + Math.random() * 0.45).toFixed(2));
        starsHost.appendChild(star);
    }

    // Phones have no side gutter for the ASCII stars.
    if (narrow) return;

    // Joan Stark's star motif; credit in docs/resources.md.
    let asciiStar = "  \\/\n-= * =-\n  /\\";
    minDist = 28;
    let slots = reduceMotion
        ? [{ x: 6, y: 8 }, { x: 92, y: 22 }]
        : [
            { x: 6, y: 8 },
            { x: 14, y: 26 },
            { x: 92, y: 22 },
            { x: 10, y: 55 },
            { x: 90, y: 62 },
            { x: 12, y: 88 }
        ];
    for (let g = 0; g < slots.length; g++) {
        let gx = slots[g].x + (Math.random() * 6 - 3);
        let gy = slots[g].y + (Math.random() * 8 - 4);
        let gTries = 0;
        while (gTries < 20 && (!farEnough(gx, gy) || !awayFromText(gx, gy))) {
            gx = g < 3 ? 4 + Math.random() * 14 : 82 + Math.random() * 14;
            gy = 12 + Math.random() * 76;
            gTries += 1;
        }
        if (!awayFromText(gx, gy) || !awayFromMoon(gx, gy)) continue;
        place(gx, gy);

        let glyph = document.createElement("pre");
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
