/** Float the bar while reading, then park it on the footer line. */
export function definePlace(s) {
    s.syncBackTop = function () {
        if (s.backTopBtn) s.backTopBtn.hidden = s.chromeClosed || window.scrollY < s.BACK_TOP_MIN_SCROLL;
    };

    s.syncFloating = function () {
        let floating = window.scrollY + window.innerHeight - s.floatGap < s.parkLineY - 1;
        s.player.classList.toggle("site-player--floating", floating);
    };

    s.onScroll = function () {
        s.syncBackTop();
        s.syncFloating();
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
    };

    s.placeOnFooter = function () {
        let footer = document.querySelector("[data-site-footer]");
        let root = document.getElementById("page-root");
        let shell = footer && footer.closest(".site-shell");
        let lift = 0;
        if (footer && root && shell) {
            let dock = footer.querySelector("[data-home-dock]");
            let line = dock
                ? dock.getBoundingClientRect().bottom
                : footer.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(footer).paddingBottom) || 0);
            let spot = root.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(shell).marginBottom) || 0);
            lift = spot - line;
            s.parkLineY = line + window.scrollY;
        }
        lift = Math.max(0, Math.round(lift));
        s.player.style.setProperty("--player-lift", lift + "px");
        // Computed bottom is --player-float minus the lift.
        s.floatGap = (parseFloat(getComputedStyle(s.player).bottom) || 0) + lift;
        s.syncFloating();
        s.placeFooterRow(footer);
    };

    s.cssPx = function (value) {
        if (!value) return 0;
        value = String(value).trim();
        if (value.slice(-3) === "rem") {
            return parseFloat(value) * parseFloat(getComputedStyle(document.documentElement).fontSize);
        }
        return parseFloat(value) || 0;
    };

    s.placeFooterRow = function (footer) {
        let shifter = footer && footer.querySelector("[data-home-dock], .page-footer__skifree");
        let title = s.player.querySelector(".player-title");
        if (!s.isMobileViewport() || !footer || !shifter) {
            s.player.classList.remove("site-player--row");
            s.player.style.removeProperty("--player-left");
            s.player.style.removeProperty("--back-top-left");
            if (shifter) shifter.style.marginLeft = "";
            if (title) title.style.width = "";
            return;
        }
        if (title) title.style.width = "";
        shifter.style.marginLeft = "0px";
        let visual = shifter.querySelector("[data-visitor-count]") || shifter.querySelector(".sprite-anim") || shifter;
        let vis = visual.getBoundingClientRect();
        let foot = footer.getBoundingClientRect();
        let leadW = Math.max(vis.width, s.cssPx(getComputedStyle(footer).getPropertyValue("--footer-lead-w")));
        let playerW = s.bar.getBoundingClientRect().width;
        let upW = s.cssPx(getComputedStyle(s.player).getPropertyValue("--player-back-top-size")) || 26;
        let prefer = s.cssPx(getComputedStyle(footer).getPropertyValue("--footer-row-gap")) || 20;
        let minGap = 8;
        let slack = foot.width - leadW - playerW - upW;
        if (title && slack < minGap * 2) {
            let titleW = title.getBoundingClientRect().width;
            title.style.width = Math.max(24, Math.floor(titleW - (minGap * 2 - slack))) + "px";
            playerW = s.bar.getBoundingClientRect().width;
            slack = foot.width - leadW - playerW - upW;
        }
        let gap = Math.max(0, Math.min(prefer, slack / 2));
        let group = leadW + playerW + upW + gap * 2;
        let start = foot.left + (foot.width - group) / 2;
        let nudge = visual.closest(".page-footer__skifree")
            ? s.cssPx(getComputedStyle(footer).getPropertyValue("--footer-yeti-nudge"))
            : 0;
        shifter.style.marginLeft = Math.round(start + (leadW - vis.width) / 2 - nudge - vis.left) + "px";
        let playerLeft = Math.round(start + leadW + gap);
        s.player.style.setProperty("--player-left", playerLeft + "px");
        s.player.style.setProperty("--back-top-left", Math.round(playerLeft + playerW + gap) + "px");
        s.player.classList.add("site-player--row");
    };
}
