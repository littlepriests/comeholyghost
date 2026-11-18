import { defineNav } from "./player/nav.js";
import { definePet } from "./player/pet.js";
import { definePlace } from "./player/place.js";
import { definePlayback } from "./player/playback.js";

const player = document.getElementById("site-player");
const bar = player && player.querySelector("[data-player-bar]");
// The player lives outside #page-root, so SPA swaps never re-run this file;
// the flag only guards against a second copy of the script on one page.
if (bar && !window.__site.playerReady) {
    window.__site.playerReady = true;
    const q = (selector) => player.querySelector(selector);
    const s = {
        player,
        bar,
        audio: document.createElement("audio"),
        tracks: [],
        index: 0,
        playing: false,
        playWhenReady: false,
        trackTitle: "",
        chromeClosed: false,
        mobileQuery: window.matchMedia("(max-width: 44.99rem)"), // matches CSS mobile breakpoint
        playlistRemote: player.getAttribute("data-playlist") || "",
        playlistLocal: "/audio/playlist.json",

        toggle: q("[data-player-toggle]"),
        skip: q("[data-player-skip]"),
        stop: q("[data-player-stop]"),
        reopenBtn: q("[data-player-reopen]"),
        label: q("[data-player-title]"),
        labelText: q("[data-player-title-text]"),
        toggleIconPlay: q("[data-player-icon-play]"),
        toggleIconPlaying: q("[data-player-icon-playing]"),
        dockIdle: q("[data-player-dock-idle]"),
        dockKick: q("[data-player-dock-kick]"),
        dockHearts: q("[data-player-dock-hearts]"),
        backTopBtn: q("[data-player-back-top]"),
        BACK_TOP_MIN_SCROLL: 160,

        dockPetTimer: 0,
        dockHeartsTimer: 0,
        dockPetKicking: false,
        pageHeartsTimer: 0,
        pageHeartsLayer: null,
        // Page y of the footer line and the float offset, set by placeOnFooter().
        parkLineY: 0,
        floatGap: 0,
    };
    s.dockKickStrip = s.dockKick ? s.dockKick.querySelector(".sprite-anim") : null;
    s.audio.preload = "metadata";
    player.appendChild(s.audio);

    definePet(s);
    definePlayback(s);
    definePlace(s);
    defineNav(s);

    if (s.toggle) {
        s.toggle.addEventListener("click", () => {
            if (s.playing) s.pauseMedia();
            else s.playMedia();
        });
    }
    if (s.skip) s.skip.addEventListener("click", s.skipMedia);
    if (s.stop) {
        s.stop.addEventListener("click", () => {
            s.playWhenReady = false;
            s.stopMedia();
            s.setChromeClosed(true);
        });
    }
    if (s.reopenBtn) {
        // Reopening restores the chrome paused, even if a media key resumed audio while hidden.
        s.reopenBtn.addEventListener("click", () => {
            s.playWhenReady = false;
            s.setChromeClosed(false);
            if (s.playing) s.pauseMedia();
            else s.show();
        });
    }
    if (s.backTopBtn) {
        s.backTopBtn.addEventListener("click", () => {
            const behavior = s.prefersReducedMotion() ? "auto" : "smooth";
            s.stompDockPetThen(() => window.scrollTo({ top: 0, behavior }));
        });
    }

    // Media keys and OS controls drive the element directly; mirror them here.
    s.audio.addEventListener("play", () => {
        if (s.playing) return;
        s.playing = true;
        s.show();
    });
    s.audio.addEventListener("pause", () => {
        if (!s.playing) return;
        s.playing = false;
        s.show();
    });
    s.audio.addEventListener("ended", () => s.load(s.index + 1, true));

    // Show the chrome before the playlist arrives; a slow fetch must not hide it.
    s.applyPlayerChrome();
    window.addEventListener("scroll", s.onScroll, { passive: true });
    // Phone toolbars change innerHeight without resizing <html>.
    window.addEventListener("resize", s.syncFloating);
    if (typeof ResizeObserver === "function") {
        new ResizeObserver(() => s.placeOnFooter()).observe(document.documentElement);
    } else {
        window.addEventListener("resize", s.placeOnFooter);
        window.addEventListener("load", s.placeOnFooter);
    }
    s.mobileQuery.addEventListener("change", s.applyPlayerChrome);

    s.loadPlaylist()
        .catch((error) => {
            console.error(error);
            return [];
        })
        .then((list) => {
            s.tracks = Array.isArray(list) ? list.filter((t) => t && t.src) : [];
            s.show();
            s.applyPlayerChrome();
            if (s.playWhenReady && s.tracks.length) s.playMedia();
        });

    document.addEventListener("click", s.onLinkClick);
    window.addEventListener("popstate", () => s.adopt(location.href, true));
    history.replaceState({ player: true }, "", location.href);
    s.show();
}
