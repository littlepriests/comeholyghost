/** Playlist load and the audio element. The same element survives page swaps. */
export function definePlayback(s) {
    s.loadLocalPlaylist = function () {
        return fetch(s.playlistLocal).then(function (response) {
            if (!response.ok) throw new Error("local playlist " + response.status);
            return response.json();
        });
    };

    s.loadPlaylist = function () {
        if (!s.playlistRemote) return s.loadLocalPlaylist();
        return fetch(s.playlistRemote)
            .then(function (response) {
                if (!response.ok) throw new Error("remote playlist " + response.status);
                return response.json();
            })
            .catch(s.loadLocalPlaylist);
    };

    s.currentTitle = function () {
        if (s.trackTitle) return s.trackTitle;
        let track = s.tracks[s.index];
        return track ? track.title : "Playlist";
    };

    s.syncTitleMarquee = function () {
        if (!s.label || !s.labelText) return;
        s.label.classList.remove("is-marquee");
        s.label.style.removeProperty("--marquee-distance");
        let overflow = s.labelText.scrollWidth - s.label.clientWidth;
        if (overflow > 1) {
            s.label.style.setProperty("--marquee-distance", "-" + overflow + "px");
            s.label.classList.add("is-marquee");
        }
    };

    s.show = function () {
        if (s.labelText) s.labelText.textContent = s.currentTitle();
        else if (s.label) s.label.textContent = s.currentTitle();
        // Play chevron when paused; speaker when audio is on (tab-style cue).
        if (s.toggleIconPlay) {
            if (s.playing) s.toggleIconPlay.setAttribute("hidden", "");
            else s.toggleIconPlay.removeAttribute("hidden");
        }
        if (s.toggleIconPlaying) {
            if (s.playing) s.toggleIconPlaying.removeAttribute("hidden");
            else s.toggleIconPlaying.setAttribute("hidden", "");
        }
        if (s.toggle) {
            s.toggle.classList.toggle("is-playing", s.playing);
            s.toggle.setAttribute("aria-label", s.playing ? "Pause" : "Play");
        }
        s.syncDockPet();
        requestAnimationFrame(s.syncTitleMarquee);
    };

    s.load = function (nextIndex, andPlay) {
        if (!s.tracks.length) return;
        s.index = (nextIndex + s.tracks.length) % s.tracks.length;
        s.trackTitle = s.tracks[s.index].title || "";
        let src = s.tracks[s.index].src;
        let changed = s.audio.getAttribute("src") !== src;
        if (changed) {
            s.audio.src = src;
            s.audio.load();
        }
        if (!andPlay) {
            s.show();
            return;
        }
        function attemptPlay() {
            let playPromise = s.audio.play();
            if (playPromise && typeof playPromise.then === "function") {
                playPromise.then(function () {
                    s.playing = true;
                    s.show();
                }).catch(function () {
                    // Autoplay / decode can reject; leave chrome paused.
                    s.playing = false;
                    s.show();
                });
            } else {
                s.playing = true;
                s.show();
            }
        }
        // After a src change, wait until the element can play or play() no-ops.
        if (changed && s.audio.readyState < 2) {
            let onReady = function () {
                s.audio.removeEventListener("canplay", onReady);
                attemptPlay();
            };
            s.audio.addEventListener("canplay", onReady);
            s.show();
            return;
        }
        attemptPlay();
    };

    s.playMedia = function () {
        if (!s.tracks.length) {
            s.playWhenReady = true;
            return;
        }
        s.playWhenReady = false;
        if (!s.audio.getAttribute("src")) s.load(0, true);
        else {
            s.audio.play();
            s.playing = true;
            s.show();
        }
    };

    s.pauseMedia = function () {
        // Set playing first so the audio "pause" listener does not run a second show().
        s.playing = false;
        s.show();
        try {
            s.audio.pause();
        } catch (error) {}
    };

    s.stopMedia = function () {
        s.playing = false;
        s.show();
        try {
            s.audio.pause();
            s.audio.currentTime = 0;
        } catch (error) {}
    };

    s.skipMedia = function () {
        s.load(s.index + (s.audio.getAttribute("src") ? 1 : 0), true);
    };
}
