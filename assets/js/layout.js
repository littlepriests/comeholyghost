import { mq } from "./lib/media.js";
import { LAYOUT, PAGE, RELAYOUT, emit, on } from "./lib/site.js";

/**
 * Every measured position on the site, in one pass.
 *
 * CSS owns every formula: where the floating and parked player go, the ↑
 * column, the dock grid (player.css, footer-dock.css). This file only
 * measures what CSS can't know and writes it back as custom properties:
 *
 *   1. Footer dock: side slots the same width, the center padded so they
 *      spread out, and the row scaled as one unit so it never wraps and stays
 *      between the parked bar and the ↑ (--footer-side-w, --footer-dock-scale,
 *      --footer-dock-h).
 *   2. Player: how far the page end sits below the dock line (--player-lift),
 *      and on scroll, whether the window has reached it (.site-player--parked).
 *
 * Then it emits site:layout, and page decor (homepage clouds, star masks)
 * re-places itself from the settled layout. Anything that changes a size
 * calls requestLayout() (lib/site.js) instead of faking a resize.
 *
 * Loaded once, outside #page-root; the footer is looked up on every pass
 * because SPA nav swaps it.
 */

const desktop = mq("desktop");
const MIN_SCALE = 0.55;
let parkLineY = 0;
let floatGap = 0;
let placed = false;
let running = false;
let again = false;
let dockObserver = null;

function parts() {
    const player = document.getElementById("site-player");
    const footer = document.querySelector("[data-site-footer]");
    const fit = footer && footer.querySelector("[data-footer-dock-fit]");
    const dock = fit && fit.querySelector("[data-footer-dock]");
    return { player, footer, fit, dock, root: document.getElementById("page-root") };
}

/* Where the player sits on the footer line, parked or not: the parked bar's
   right edge on the left, the ↑'s left edge on the right. The bar's parked
   left comes from .player-park-probe, which player.css places with the same
   --player-park-left as the parked bar. */
function playerSpots(player) {
    if (!player) return null;
    const bar = player.querySelector("[data-player-bar]");
    const probe = player.querySelector("[data-player-park-probe]");
    const up = player.querySelector("[data-player-back-top]");
    if (!bar || !probe || !up) return null;
    return {
        barRight: probe.getBoundingClientRect().left + bar.getBoundingClientRect().width,
        upLeft: up.getBoundingClientRect().left,
    };
}

function fitDock({ fit, dock, player }) {
    if (!dock) return;
    const slot = (name) => dock.querySelector('[data-footer-slot="' + name + '"]');
    const left = slot("left");
    const center = slot("center");
    const right = slot("right");
    const spots = playerSpots(player);

    // Both side slots take the wider one's width, so their centers mirror around the center slot.
    dock.style.removeProperty("--footer-side-w");
    const sideW = Math.max(left.offsetWidth, right.offsetWidth);
    if (sideW) dock.style.setProperty("--footer-side-w", sideW + "px");

    // Pad the center equally to push the side slots apart, limited by the
    // column and by half the gap to each player spot. Measured unscaled.
    if (desktop.matches && spots) {
        const applied = dock.style.getPropertyValue("--footer-dock-scale");
        dock.style.setProperty("--footer-dock-scale", "1");
        center.style.paddingInline = "0px";
        const lr = left.getBoundingClientRect();
        const rr = right.getBoundingClientRect();
        const cr = fit.getBoundingClientRect();
        const room = Math.min(lr.left - cr.left, cr.right - rr.right, (lr.left - spots.barRight) / 2, (spots.upLeft - rr.right) / 2);
        center.style.paddingInline = Math.max(0, Math.round(room / 2)) + "px";
        if (applied) dock.style.setProperty("--footer-dock-scale", applied);
        else dock.style.removeProperty("--footer-dock-scale");
    } else {
        center.style.removeProperty("padding-inline");
    }

    // The dock is a width:100% grid, so measure the slots' content, not scrollWidth.
    const cells = [left, center, right].filter((el) => el.offsetWidth > 0);
    const gap = parseFloat(getComputedStyle(dock).columnGap) || 0;
    let need = gap * Math.max(0, cells.length - 1);
    cells.forEach((el) => {
        need += el.offsetWidth;
    });
    // The row stays between the player's two spots, centered on the column.
    let avail = fit.clientWidth;
    if (spots) {
        const fr = fit.getBoundingClientRect();
        const mid = fr.left + fr.width / 2;
        avail = Math.min(avail, 2 * (Math.min(mid - spots.barRight, spots.upLeft - mid) - gap / 2));
    }
    const next = avail > 0 && need > avail ? Math.max(MIN_SCALE, (avail / need) * 0.98) : 1;
    const current = parseFloat(dock.style.getPropertyValue("--footer-dock-scale")) || 1;
    if (Math.abs(next - current) > 0.002) {
        const token = next.toFixed(4);
        dock.style.setProperty("--footer-dock-scale", token);
        fit.style.setProperty("--footer-dock-scale", token);
    }
    fit.style.setProperty("--footer-dock-h", dock.offsetHeight + "px");
}

/* The track floats --player-float above the window bottom until the footer
   line arrives, then rides the page resting on it. The line is the dock's
   bottom on every page; --player-lift is how far the track has to rise from
   the end of #page-root to meet it. */
function placePlayer({ player, footer, dock, root }) {
    if (!player) return;
    const shell = footer && footer.closest(".site-shell");
    let lift = 0;
    if (dock && root && shell) {
        const line = dock.getBoundingClientRect().bottom;
        // The sticky track starts after #page-root; the shell's bottom margin
        // collapses through #page-root onto it, so add it back.
        const spot = root.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(shell).marginBottom) || 0);
        lift = spot - line;
        parkLineY = line + window.scrollY;
    }
    lift = Math.max(0, Math.round(lift));
    player.style.setProperty("--player-lift", lift + "px");
    // player.css sets bottom to --player-float minus --player-lift.
    floatGap = (parseFloat(getComputedStyle(player).bottom) || 0) + lift;
    syncParked();
}

function syncParked() {
    const player = document.getElementById("site-player");
    if (!player) return;
    const parked = window.scrollY + window.innerHeight - floatGap >= parkLineY - 1;
    player.classList.toggle("site-player--parked", parked);
    // The first placement is not animated; only later moves are.
    if (!placed) {
        placed = true;
        requestAnimationFrame(() => requestAnimationFrame(() => player.classList.add("site-player--live")));
    }
}

/* Synchronous, so a size change and its re-measure land in the same frame.
   A request that arrives mid-pass (from a site:layout listener) runs next frame. */
function run() {
    if (running) {
        again = true;
        return;
    }
    running = true;
    again = false;
    try {
        const p = parts();
        fitDock(p);
        placePlayer(p);
        emit(LAYOUT);
    } finally {
        running = false;
    }
    if (again) requestAnimationFrame(run);
}

function observeDock() {
    if (typeof ResizeObserver !== "function") return;
    if (dockObserver) dockObserver.disconnect();
    const fit = document.querySelector("[data-footer-dock-fit]");
    dockObserver = fit ? new ResizeObserver(run) : null;
    if (dockObserver) dockObserver.observe(fit);
}

if (!window.__site.layoutReady) {
    window.__site.layoutReady = true;
    on(RELAYOUT, run);
    on(PAGE, () => {
        observeDock();
        run();
    });
    window.addEventListener("resize", run);
    window.addEventListener("load", run);
    window.addEventListener("scroll", syncParked, { passive: true });
    if (typeof ResizeObserver === "function") new ResizeObserver(run).observe(document.documentElement);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run, () => {});
    observeDock();
    run();
}
