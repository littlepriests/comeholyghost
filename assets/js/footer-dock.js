/**
 * The footer dock on every page (site-footer.html): three slots, the side
 * slots spaced evenly around the center and the whole row scaled as one unit
 * so it never wraps or spills. Same rules whatever fills the slots.
 *
 * SPA nav re-runs this file on every swap. Window listeners bind only on the
 * first run; later runs re-point window.__site.fitFooterDock at the new dock.
 */
const site = (window.__site = window.__site || {});
const windowBound = !!site.footerDockBound;
site.footerDockBound = true;

const dockFit = document.querySelector("[data-footer-dock-fit]");
const dock = dockFit && dockFit.querySelector("[data-footer-dock]");
const slot = (name) => dock.querySelector('[data-footer-slot="' + name + '"]');
let dockScale = 1;

/* Both side slots take the wider one's width, so their centers mirror around
   the center slot whatever fills them. */
function matchSides() {
    dock.style.removeProperty("--footer-side-w");
    let w = Math.max(slot("left").offsetWidth, slot("right").offsetWidth);
    if (w) dock.style.setProperty("--footer-side-w", w + "px");
}

/* Where the player sits on the footer line, whether or not it is parked yet:
   the bar's right edge on the left and the ↑'s left edge on the right. The
   parked bar mirrors the ↑ column, its middle button (stop) as far from the
   left edge as the ↑ is from the right, clamped 0.5rem from the edge
   (player.css, --player-col-x). Null until the player is on the page. */
function playerSpots() {
    let track = document.getElementById("site-player");
    let bar = document.querySelector("[data-player-bar]");
    let up = document.querySelector("[data-player-back-top]");
    if (!track || !bar || !up) return null;
    let tr = track.getBoundingClientRect();
    let ur = up.getBoundingClientRect();
    let br = bar.getBoundingClientRect();
    let stop = bar.querySelector("[data-player-stop]");
    let sr = stop && stop.getBoundingClientRect();
    let anchor = sr && sr.width ? sr.left + sr.width / 2 - br.left : br.width / 2;
    let colX = tr.right - (ur.left + ur.width / 2);
    let edge = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.5;
    return { barRight: tr.left + Math.max(edge, colX - anchor) + br.width, upLeft: ur.left };
}

/* Pads the center slot equally on both sides to push the side slots apart,
   limited by the column and by half the gap to the player's two spots. */
function spaceSlots() {
    let center = slot("center");
    let left = slot("left");
    let right = slot("right");
    let spots = playerSpots();
    if (!window.matchMedia("(min-width: 45rem)").matches || !spots) {
        center.style.removeProperty("padding-inline");
        return;
    }
    let applied = dock.style.getPropertyValue("--footer-dock-scale");
    dock.style.setProperty("--footer-dock-scale", "1");
    center.style.paddingInline = "0px";
    let lr = left.getBoundingClientRect();
    let rr = right.getBoundingClientRect();
    let cr = dockFit.getBoundingClientRect();
    let room = Math.min(lr.left - cr.left, cr.right - rr.right, (lr.left - spots.barRight) / 2, (spots.upLeft - rr.right) / 2);
    center.style.paddingInline = Math.max(0, Math.round(room / 2)) + "px";
    if (applied) dock.style.setProperty("--footer-dock-scale", applied);
    else dock.style.removeProperty("--footer-dock-scale");
}

function fitFooterDock() {
    matchSides();
    spaceSlots();
    // The dock is a width:100% grid, so measure the slots' content, not scrollWidth.
    let cells = ["left", "center", "right"].map(slot).filter((el) => el.offsetWidth > 0);
    let gap = parseFloat(getComputedStyle(dock).columnGap) || 0;
    let need = gap * Math.max(0, cells.length - 1);
    cells.forEach((el) => {
        need += el.offsetWidth;
    });
    // The row stays between the player's two spots, centered on the column.
    let avail = dockFit.clientWidth;
    let spots = playerSpots();
    if (spots) {
        let fr = dockFit.getBoundingClientRect();
        let mid = fr.left + fr.width / 2;
        avail = Math.min(avail, 2 * (Math.min(mid - spots.barRight, spots.upLeft - mid) - gap / 2));
    }
    let next = avail > 0 && need > avail ? Math.max(0.55, (avail / need) * 0.98) : 1;
    if (Math.abs(next - dockScale) <= 0.002) {
        dockFit.style.setProperty("--footer-dock-h", dock.offsetHeight + "px");
        return;
    }
    dockScale = next;
    let token = next.toFixed(4);
    dock.style.setProperty("--footer-dock-scale", token);
    dockFit.style.setProperty("--footer-dock-scale", token);
    dockFit.style.setProperty("--footer-dock-h", dock.offsetHeight + "px");
    // The player parks on the dock line and the homepage clouds avoid it; both re-measure on resize.
    window.dispatchEvent(new Event("resize"));
}

if (site.footerDockObserver) {
    site.footerDockObserver.disconnect();
    site.footerDockObserver = null;
}
site.fitFooterDock = dock ? fitFooterDock : null;
if (dock) {
    fitFooterDock();
    if (typeof ResizeObserver === "function") {
        site.footerDockObserver = new ResizeObserver(fitFooterDock);
        site.footerDockObserver.observe(dockFit);
    }
}
if (!windowBound) {
    const runFit = () => {
        if (typeof site.fitFooterDock === "function") site.fitFooterDock();
    };
    window.addEventListener("resize", runFit);
    window.addEventListener("load", runFit);
}
