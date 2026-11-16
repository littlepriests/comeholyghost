import { defineNav } from "./player/nav.js";
import { definePet } from "./player/pet.js";
import { definePlace } from "./player/place.js";
import { definePlayback } from "./player/playback.js";

const player = document.getElementById("site-player");
const bar = player && player.querySelector("[data-player-bar]");
if (bar && !window.__sitePlayer) {
    window.__sitePlayer = true;
    const s = { player, bar };

    definePet(s);
    definePlayback(s);
    definePlace(s);
    defineNav(s);
    s.audio = document.createElement("audio");
    s.audio.preload = "metadata";
    s.player.appendChild(s.audio);
    s.tracks = [];
    s.playWhenReady = false;
    s.index = 0;
    s.playing = false;
    s.trackTitle = "";
    s.chromeClosed = false;
    s.mobileQuery = window.matchMedia("(max-width: 44.99rem)");
    s.playlistRemote = s.player.getAttribute("data-playlist") || "";
    s.playlistLocal = "/audio/playlist.json";
    s.toggle = s.player.querySelector("[data-player-toggle]");
    s.skip = s.player.querySelector("[data-player-skip]");
    s.stop = s.player.querySelector("[data-player-stop]");
    s.reopenBtn = s.player.querySelector("[data-player-reopen]");
    s.label = s.player.querySelector("[data-player-title]");
    s.labelText = s.player.querySelector("[data-player-title-text]");
    s.toggleIconPlay = s.toggle ? s.toggle.querySelector("[data-player-icon-play]") : null;
    s.toggleIconPlaying = s.toggle ? s.toggle.querySelector("[data-player-icon-playing]") : null;
    s.dockIdle = s.player.querySelector("[data-player-dock-idle]");
    s.dockKick = s.player.querySelector("[data-player-dock-kick]");
    s.dockKickStrip = s.dockKick ? s.dockKick.querySelector(".sprite-anim") : null;
    s.dockHearts = s.player.querySelector("[data-player-dock-hearts]");
    s.dockPetTimer = 0;
    s.dockHeartsTimer = 0;
    s.dockPetKicking = false;
    s.backTopBtn = s.player.querySelector("[data-player-back-top]");
    s.BACK_TOP_MIN_SCROLL = 160;
    s.pageHeartsTimer = 0;
    s.pageHeartsLayer = null;
    /**
     * Transient full-viewport ♡ fountain (no markup bloat).
     * Hearts rise so the scroll reads as floating the page up.
     * Works on mobile simple chrome too (Grundo is desktop-dock only).
     */
    /**
     * Back-to-top beat: (desktop dock) stomp → dock spill → page hearts → scroll.
     * Mobile / reduced motion: page hearts → scroll (Grundo isn't shown on phones).
     */
    // HTML <audio> owns playback + auto-next (survives SPA).
    s.toggle.addEventListener("click", function () {
        if (s.playing) s.pauseMedia();
        else s.playMedia();
    });
    s.skip.addEventListener("click", s.skipMedia);
    if (s.stop) {
        s.stop.addEventListener("click", function () {
            // Stop owns “hide player”: pause audio, swap dock for the green ♡.
            s.playWhenReady = false;
            s.stopMedia();
            s.setChromeClosed(true);
        });
    }
    // Page y of the footer line and the float gap, from the last placeOnFooter().
    s.parkLineY = 0;
    s.floatGap = 0;
    // Floating = the sticky track is held above the window bottom, i.e. the footer
    // line is still below it. CSS collapses the phone bar to play/pause meanwhile.
    if (s.backTopBtn) {
        s.backTopBtn.addEventListener("click", function () {
            let reduce = s.prefersReducedMotion();
            s.stompDockPetThen(function () {
                window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
            });
        });
    }
    if (s.reopenBtn) {
        s.reopenBtn.addEventListener("click", function () {
            // Restore dock only — never autoplay.
            s.playWhenReady = false;
            s.setChromeClosed(false);
            if (s.playing) s.pauseMedia();
            else s.show();
        });
    }
    s.audio.addEventListener("play", function () {
        if (s.playing) return;
        s.playing = true;
        s.show();
    });
    s.audio.addEventListener("pause", function () {
        // pauseMedia/stopMedia already updated UI; skip duplicate show().
        if (!s.playing) return;
        s.playing = false;
        s.show();
    });
    s.audio.addEventListener("ended", function () {
        s.load(s.index + 1, true);
    });
    // Playlist must not gate the dock.
    s.applyPlayerChrome();
    window.addEventListener("scroll", s.onScroll, { passive: true });
    // Phone toolbars change the window height without resizing <html>.
    window.addEventListener("resize", s.syncFloating);
    // Page height, footer size, and width changes all resize <html>.
    if (typeof ResizeObserver === "function") {
        new ResizeObserver(function () {
            s.placeOnFooter();
        }).observe(document.documentElement);
    } else {
        window.addEventListener("resize", s.placeOnFooter);
        window.addEventListener("load", s.placeOnFooter);
    }
    s.mobileQuery.addEventListener("change", s.applyPlayerChrome);
    s.loadPlaylist()
        .then(function (list) {
            s.tracks = Array.isArray(list) ? list : [];
            s.show();
            s.applyPlayerChrome();
            if (s.playWhenReady && s.tracks.length) s.playMedia();
        })
        .catch(function (error) {
            console.error(error);
            s.tracks = [];
            s.show();
            s.applyPlayerChrome();
        });
    /* Player and ↑ park on the footer's bottom line (homepage: the dock row).
       The track sits right after #page-root plus the shell's bottom margin (it collapses
       through #page-root onto the track), so the lift is that spot minus the line.
       On a phone, once parked, the counter or yeti, the bar, and the ↑ share one
       centered row; while floating, play sits at the top of the screen and the
       ↑ keeps the bottom corner (CSS). */
    // Bar width does not change while floating (hidden buttons keep their
    // slots), so this row can be measured in either state.
    document.addEventListener("click", function (event) {
        let link = event.target.closest("a");
        if (!link || !link.href) return;
        if (s.player.contains(link)) return;
        if (link.target && link.target !== "_self") return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        let url;
        try { url = new URL(link.href); } catch (error) { return; }
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
        event.preventDefault();
        s.adopt(url.href, false);
    });
    window.addEventListener("popstate", function () {
        s.adopt(location.href, true);
    });
    history.replaceState({ player: true }, "", location.href);
    s.show();
}
