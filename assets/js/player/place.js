/**
 * The track rides the page the way the ↑ does: --player-float above the window
 * bottom ("floating") until the footer line scrolls into view, then it rests on
 * that line ("parked"). The footer line is the bottom of the footer dock, on
 * every page and at every width. The bar sits at the top of the window while
 * floating and moves to the footer's left gutter when parked; this file only
 * decides which, and player.css does the placing and the transition.
 */
export function definePlace(s) {
    s.syncBackTop = function () {
        if (s.backTopBtn) s.backTopBtn.classList.toggle("is-away", s.chromeClosed || window.scrollY < s.BACK_TOP_MIN_SCROLL);
    };

    s.syncParked = function () {
        let parked = window.scrollY + window.innerHeight - s.floatGap >= s.parkLineY - 1;
        s.player.classList.toggle("site-player--parked", parked);
        // The first placement is not animated; only later moves are.
        if (!s.placed) {
            s.placed = true;
            requestAnimationFrame(() => requestAnimationFrame(() => s.player.classList.add("site-player--live")));
        }
    };

    s.onScroll = function () {
        s.syncBackTop();
        s.syncParked();
    };

    s.setChromeClosed = function (closed) {
        s.chromeClosed = !!closed;
        s.applyPlayerChrome();
    };

    s.applyPlayerChrome = function () {
        s.player.classList.toggle("site-player--closed", s.chromeClosed);
        if (s.reopenBtn) s.reopenBtn.hidden = !s.chromeClosed;
        s.syncBackTop();
        s.placeOnFooter();
        // The footer keeps its slots clear of the bar, whose width just changed.
        if (window.__site && typeof window.__site.fitFooterDock === "function") window.__site.fitFooterDock();
    };

    s.placeOnFooter = function () {
        let footer = document.querySelector("[data-site-footer]");
        let root = document.getElementById("page-root");
        let shell = footer && footer.closest(".site-shell");
        let dock = footer && footer.querySelector("[data-footer-dock]");
        let lift = 0;
        if (dock && root && shell) {
            let line = dock.getBoundingClientRect().bottom;
            // The sticky track starts after #page-root; the shell's bottom margin
            // collapses through #page-root onto it, so add it back.
            let spot = root.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(shell).marginBottom) || 0);
            lift = spot - line;
            s.parkLineY = line + window.scrollY;
        }
        lift = Math.max(0, Math.round(lift));
        s.player.style.setProperty("--player-lift", lift + "px");
        // player.css sets bottom to --player-float minus --player-lift.
        s.floatGap = (parseFloat(getComputedStyle(s.player).bottom) || 0) + lift;
        s.syncParked();
    };
}
