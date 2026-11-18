/**
 * Back-to-top sequence. If Grundo (footer/grundo.html, the right footer slot on
 * inner pages) is on screen, he kicks and hearts spill from his feet; then a
 * page-wide heart fountain starts and the page scrolls. Otherwise (homepage,
 * phones, reading mid-page, reduced motion) it goes straight to the fountain
 * (or the scroll). Grundo is looked up on each use because SPA nav swaps the footer.
 */
export function definePet(s) {
    s.isMobileViewport = function () {
        return s.mobileQuery.matches;
    };

    s.grundo = function () {
        let el = document.querySelector("[data-footer-grundo]");
        if (!el) return null;
        let kick = el.querySelector("[data-grundo-kick]");
        return {
            el: el,
            idle: el.querySelector("[data-grundo-idle]"),
            kick: kick,
            kickStrip: kick && kick.querySelector(".sprite-anim"),
            hearts: el.querySelector("[data-grundo-hearts]"),
        };
    };

    s.showDockIdle = function () {
        s.dockPetKicking = false;
        window.clearTimeout(s.dockPetTimer);
        let g = s.grundo();
        if (!g) return;
        if (g.idle) g.idle.removeAttribute("hidden");
        if (g.kick) g.kick.setAttribute("hidden", "");
        if (g.kickStrip) g.kickStrip.classList.remove("is-kick-play");
    };

    s.dockKickTiming = function (g) {
        let fps = 8;
        let frames = 3;
        try {
            if (g.kickStrip) {
                fps = parseFloat(getComputedStyle(g.kickStrip).getPropertyValue("--sprite-fps")) || 8;
                frames = parseFloat(getComputedStyle(g.kickStrip).getPropertyValue("--sprite-frames")) || 3;
            }
        } catch (error) {}
        return { fps: fps, frames: frames };
    };

    s.playDockKickThenIdle = function (g, onIdle) {
        window.clearTimeout(s.dockPetTimer);
        s.dockPetKicking = true;
        g.idle.setAttribute("hidden", "");
        g.kick.removeAttribute("hidden");
        if (g.kickStrip) {
            g.kickStrip.classList.remove("is-kick-play");
            void g.kickStrip.offsetWidth; // reflow so the animation restarts
            g.kickStrip.classList.add("is-kick-play");
        }
        let timing = s.dockKickTiming(g);
        // One kick cycle plus a short hold on the last frame.
        let kickMs = Math.max(320, Math.round((timing.frames / timing.fps) * 1000) + 120);
        s.dockPetTimer = window.setTimeout(function () {
            s.showDockIdle();
            if (typeof onIdle === "function") onIdle(timing);
        }, kickMs);
    };

    s.syncDockPet = function () {
        // Don't clobber an in-progress kick (pauseMedia + audio "pause" both call show).
        if (!s.dockPetKicking) s.showDockIdle();
    };

    s.prefersReducedMotion = function () {
        try {
            return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        } catch (error) {
            return false;
        }
    };

    s.burstDockHearts = function (g) {
        if (!g.hearts || s.prefersReducedMotion()) return;
        window.clearTimeout(s.dockHeartsTimer);
        g.hearts.classList.remove("is-stomp");
        void g.hearts.offsetWidth; // reflow so the animation restarts
        g.hearts.classList.add("is-stomp");
        s.dockHeartsTimer = window.setTimeout(function () {
            g.hearts.classList.remove("is-stomp");
        }, 2800);
    };

    s.burstPageHeartsThen = function (done) {
        let finish = typeof done === "function" ? done : function () {};
        if (s.prefersReducedMotion()) {
            finish();
            return;
        }
        window.clearTimeout(s.pageHeartsTimer);
        if (s.pageHeartsLayer && s.pageHeartsLayer.parentNode) {
            s.pageHeartsLayer.parentNode.removeChild(s.pageHeartsLayer);
        }
        let layer = document.createElement("div");
        layer.className = "player-page-hearts";
        layer.setAttribute("aria-hidden", "true");
        let count = s.isMobileViewport() ? 40 : 64;
        for (let i = 0; i < count; i++) {
            let heart = document.createElement("span");
            heart.className = "player-page-hearts__heart"
                + (Math.random() > 0.5 ? " is-bright" : "");
            heart.textContent = "♡";
            heart.style.setProperty("--x", (Math.random() * 100).toFixed(2) + "%");
            heart.style.setProperty("--delay", (Math.random() * 0.55).toFixed(2) + "s");
            heart.style.setProperty("--dur", (1.7 + Math.random() * 1.3).toFixed(2) + "s");
            heart.style.setProperty(
                "--drift",
                ((Math.random() * 56) - 28).toFixed(1) + "px",
            );
            heart.style.setProperty(
                "--scale",
                (0.65 + Math.random() * 1.05).toFixed(2),
            );
            layer.appendChild(heart);
        }
        document.body.appendChild(layer);
        s.pageHeartsLayer = layer;
        // Scroll starts once the hearts are visibly rising, so the page reads as floating up.
        window.setTimeout(finish, s.isMobileViewport() ? 260 : 360);
        s.pageHeartsTimer = window.setTimeout(function () {
            if (layer.parentNode) layer.parentNode.removeChild(layer);
            if (s.pageHeartsLayer === layer) s.pageHeartsLayer = null;
        }, 3400);
    };

    /** Grundo kicks only when he is rendered (CSS hides him below 45rem) and in the window. */
    s.grundoOnScreen = function (g) {
        if (!g || !g.idle || !g.kick || !g.el.getClientRects().length) return false;
        let box = g.el.getBoundingClientRect();
        return box.bottom > 0 && box.top < window.innerHeight;
    };

    s.stompDockPetThen = function (done) {
        let finish = typeof done === "function" ? done : function () {};
        let g = s.grundo();

        function afterPet() {
            s.burstPageHeartsThen(finish);
        }

        if (!s.grundoOnScreen(g) || s.prefersReducedMotion()) {
            afterPet();
            return;
        }
        window.clearTimeout(s.dockHeartsTimer);
        if (g.hearts) g.hearts.classList.remove("is-stomp");
        s.playDockKickThenIdle(g, function () {
            s.burstDockHearts(g);
            window.setTimeout(afterPet, 200);
        });
    };
}
