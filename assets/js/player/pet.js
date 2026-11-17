/**
 * Back-to-top sequence. Desktop: Grundo kicks, hearts spill from the dock, a
 * page-wide heart fountain starts, then the page scrolls. Phones and reduced
 * motion skip straight to the fountain (or the scroll).
 */
export function definePet(s) {
    s.isMobileViewport = function () {
        return s.mobileQuery.matches;
    };

    s.showDockIdle = function () {
        s.dockPetKicking = false;
        window.clearTimeout(s.dockPetTimer);
        if (s.dockIdle) s.dockIdle.removeAttribute("hidden");
        if (s.dockKick) s.dockKick.setAttribute("hidden", "");
        if (s.dockKickStrip) s.dockKickStrip.classList.remove("is-kick-play");
    };

    s.dockKickTiming = function () {
        let fps = 8;
        let frames = 3;
        try {
            if (s.dockKickStrip) {
                fps = parseFloat(getComputedStyle(s.dockKickStrip).getPropertyValue("--sprite-fps")) || 8;
                frames = parseFloat(getComputedStyle(s.dockKickStrip).getPropertyValue("--sprite-frames")) || 3;
            }
        } catch (error) {}
        return { fps: fps, frames: frames };
    };

    s.playDockKickThenIdle = function (onIdle) {
        if (!s.dockIdle || !s.dockKick) return;
        window.clearTimeout(s.dockPetTimer);
        s.dockPetKicking = true;
        s.dockIdle.setAttribute("hidden", "");
        s.dockKick.removeAttribute("hidden");
        if (s.dockKickStrip) {
            s.dockKickStrip.classList.remove("is-kick-play");
            void s.dockKickStrip.offsetWidth; // reflow so the animation restarts
            s.dockKickStrip.classList.add("is-kick-play");
        }
        let timing = s.dockKickTiming();
        // One kick cycle plus a short hold on the last frame.
        let kickMs = Math.max(320, Math.round((timing.frames / timing.fps) * 1000) + 120);
        s.dockPetTimer = window.setTimeout(function () {
            s.showDockIdle();
            if (typeof onIdle === "function") onIdle(timing);
        }, kickMs);
    };

    s.syncDockPet = function () {
        if (!s.dockIdle && !s.dockKick) return;
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

    s.burstDockHearts = function () {
        if (!s.dockHearts) return;
        if (s.prefersReducedMotion()) return;
        window.clearTimeout(s.dockHeartsTimer);
        s.dockHearts.classList.remove("is-stomp");
        void s.dockHearts.offsetWidth; // reflow so the animation restarts
        s.dockHearts.classList.add("is-stomp");
        s.dockHeartsTimer = window.setTimeout(function () {
            s.dockHearts.classList.remove("is-stomp");
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

    s.stompDockPetThen = function (done) {
        let finish = typeof done === "function" ? done : function () {};
        // Grundo's dock is desktop-only (CSS shows it at >= 45rem); the ↑ only
        // exists while the chrome is open, so no closed-state check is needed.
        let canStomp = !s.isMobileViewport()
            && s.dockIdle
            && s.dockKick
            && !s.prefersReducedMotion();

        function afterPet() {
            s.burstPageHeartsThen(finish);
        }

        if (!canStomp) {
            afterPet();
            return;
        }
        window.clearTimeout(s.dockHeartsTimer);
        if (s.dockHearts) s.dockHearts.classList.remove("is-stomp");
        s.playDockKickThenIdle(function () {
            s.burstDockHearts();
            window.setTimeout(afterPet, 200);
        });
    };
}
