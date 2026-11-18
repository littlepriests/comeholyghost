import { starCursor } from "./vendor/cursor-effects.esm.js";
import { mq } from "./lib/media.js";
import { PAGE, on } from "./lib/site.js";

/**
 * Gold star trail behind the pointer: homepage, desktop, fine pointer, motion
 * allowed. Loaded on every page (outside #page-root) and re-checked on each
 * SPA swap, so leaving home stops it and arriving home starts it. Pauses
 * over the read-me sword figure. Vendor pin: assets/js/vendor/cursor-effects.esm.js.
 */
if (!window.__site.cursorTrailReady) {
    window.__site.cursorTrailReady = true;
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqNarrow = mq("mobile");
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    let trail = null;
    let overSword = false;

    const allowed = () =>
        document.body.classList.contains("home") && !mqReduce.matches && !mqNarrow.matches && !mqCoarse.matches;

    function sync() {
        if (allowed() && !overSword) {
            if (!trail) {
                /* Golds. Sparkle draws about 4.5–7.7px before it grows (vendor baseDimension). */
                trail = starCursor({ colors: ["#d4b85c", "#e6d48a", "#c9a84a", "#f0e6b8"] });
            }
        } else if (trail) {
            if (typeof trail.destroy === "function") trail.destroy();
            trail = null;
        }
    }

    const isSword = (node) => !!(node && node.closest && node.closest(".sword-figure"));

    document.addEventListener("pointerover", (event) => {
        if (!isSword(event.target)) return;
        overSword = true;
        sync();
    }, true);

    document.addEventListener("pointerout", (event) => {
        if (!isSword(event.target) || isSword(event.relatedTarget)) return;
        overSword = false;
        sync();
    }, true);

    on(PAGE, () => {
        overSword = false;
        sync();
    });
    mqReduce.addEventListener("change", sync);
    mqNarrow.addEventListener("change", sync);
    mqCoarse.addEventListener("change", sync);
    sync();
}
