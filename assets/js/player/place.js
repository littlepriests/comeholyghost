import { requestLayout } from "../lib/site.js";

/**
 * The player's own state: closed behind the ♡ or open, and whether the ↑ is
 * showing. Where the bar and the ↑ sit (floating or parked on the footer
 * line) is player.css, measured by assets/js/layout.js.
 */
export function definePlace(s) {
    s.syncBackTop = function () {
        if (s.backTopBtn) s.backTopBtn.classList.toggle("is-away", s.chromeClosed || window.scrollY < s.BACK_TOP_MIN_SCROLL);
    };

    s.onScroll = s.syncBackTop;

    s.setChromeClosed = function (closed) {
        s.chromeClosed = !!closed;
        s.applyPlayerChrome();
    };

    s.applyPlayerChrome = function () {
        s.player.classList.toggle("site-player--closed", s.chromeClosed);
        if (s.reopenBtn) s.reopenBtn.hidden = !s.chromeClosed;
        s.syncBackTop();
        // The bar's width just changed; the footer keeps its slots clear of it.
        requestLayout();
    };
}
