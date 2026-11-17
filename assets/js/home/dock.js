export function initHomeDock(windowBound) {
    // Same-site nav re-runs this file on every return home. Window listeners
    // bind once and call whichever run is current, so they never stack.

    // Scale the footer dock (pets + ticker) as one unit to the
    // available width so the row never wraps or spills horizontally.
    let dockFit = document.querySelector("[data-home-dock-fit]");
    let dock = document.querySelector("[data-home-dock]");
    let dockScale = 1;

    /* Equal padding on the counter pushes Sango and Kagura apart.
       Stop at the text column, or halfway from Kagura to the player. */
    function spaceDockPets() {
        let ticker = dock.querySelector(".ticker");
        let sango = dock.querySelector(".home-dock__pet--left");
        let kagura = dock.querySelector(".home-dock__pet--right");
        let column = document.querySelector(".home-main");
        let player = document.querySelector("[data-player-bar]");
        if (!ticker || !sango || !kagura || !column || !player) return;
        if (!window.matchMedia("(min-width: 45rem)").matches) {
            ticker.style.removeProperty("padding-left");
            ticker.style.removeProperty("padding-right");
            return;
        }
        let applied = dock.style.getPropertyValue("--home-dock-scale");
        dock.style.setProperty("--home-dock-scale", "1");
        ticker.style.paddingLeft = "0px";
        ticker.style.paddingRight = "0px";
        let sr = sango.getBoundingClientRect();
        let kr = kagura.getBoundingClientRect();
        let cr = column.getBoundingClientRect();
        let pr = player.getBoundingClientRect();
        let sangoRoom = sr.left - cr.left;
        let kaguraColumn = cr.right - kr.right;
        let kaguraHalf = (pr.left - kr.right) / 2;
        let room = Math.min(sangoRoom, kaguraColumn, kaguraHalf);
        /* Halfway back from the full spread toward the counter. */
        let pad = Math.max(0, Math.round(room / 2));
        ticker.style.paddingLeft = pad + "px";
        ticker.style.paddingRight = pad + "px";
        if (applied) dock.style.setProperty("--home-dock-scale", applied);
        else dock.style.removeProperty("--home-dock-scale");
    }

    function fitHomeDock() {
        if (!dockFit || !dock || !document.body.classList.contains("home")) return;
        spaceDockPets();
        // Dock is width:100% grid — measure the columns' content, not scrollWidth.
        let avail = dockFit.clientWidth;
        let cells = [
            dock.querySelector(".home-dock__pet--left"),
            dock.querySelector(".ticker"),
            dock.querySelector(".home-dock__pet--right")
        ].filter(function (el) {
            return el && el.offsetWidth > 0;
        });
        let gap = parseFloat(getComputedStyle(dock).columnGap) || 0;
        let need = gap * Math.max(0, cells.length - 1);
        cells.forEach(function (el) {
            if (el) need += el.offsetWidth;
        });
        let next = 1;
        if (avail > 0 && need > avail) {
            next = Math.max(0.55, (avail / need) * 0.98);
        }
        if (Math.abs(next - dockScale) <= 0.002) {
            dockFit.style.setProperty("--home-dock-h", dock.offsetHeight + "px");
            return;
        }
        dockScale = next;
        let token = next.toFixed(4);
        dock.style.setProperty("--home-dock-scale", token);
        dockFit.style.setProperty("--home-dock-scale", token);
        dockFit.style.setProperty("--home-dock-h", dock.offsetHeight + "px");
        window.dispatchEvent(new Event("resize"));
    }

    function runFit() {
        if (typeof window.__homeFitDock === "function") window.__homeFitDock();
    }

    if (window.__homeDockObserver) {
        window.__homeDockObserver.disconnect();
        window.__homeDockObserver = null;
    }
    window.__homeFitDock = dockFit && dock ? fitHomeDock : null;
    if (dockFit && dock) {
        fitHomeDock();
        if (typeof ResizeObserver === "function") {
            window.__homeDockObserver = new ResizeObserver(fitHomeDock);
            window.__homeDockObserver.observe(dockFit);
        }
    }
    if (!windowBound) {
        window.addEventListener("resize", runFit);
        window.addEventListener("load", runFit);
    }
}
