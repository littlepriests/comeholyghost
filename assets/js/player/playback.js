/** Playlist loading and the <audio> element, which survives SPA page swaps. */
export function definePlayback(s) {
    let pendingCanPlay = null;

    function fetchJson(url, label) {
        return fetch(url).then((response) => {
            if (!response.ok) throw new Error(label + " playlist " + response.status);
            return response.json();
        });
    }

    s.loadPlaylist = function () {
        const local = () => fetchJson(s.playlistLocal, "local");
        if (!s.playlistRemote) return local();
        return fetchJson(s.playlistRemote, "remote").catch(local);
    };

    s.currentTitle = function () {
        if (s.trackTitle) return s.trackTitle;
        const track = s.tracks[s.index];
        return track ? track.title : "Playlist";
    };

    s.syncTitleMarquee = function () {
        if (!s.label || !s.labelText) return;
        s.label.classList.remove("is-marquee");
        s.label.style.removeProperty("--marquee-distance");
        const overflow = s.labelText.scrollWidth - s.label.clientWidth;
        if (overflow > 1) {
            s.label.style.setProperty("--marquee-distance", "-" + overflow + "px");
            s.label.classList.add("is-marquee");
        }
    };

    s.show = function () {
        if (s.labelText) s.labelText.textContent = s.currentTitle();
        else if (s.label) s.label.textContent = s.currentTitle();
        if (s.toggleIconPlay) s.toggleIconPlay.hidden = s.playing;
        if (s.toggleIconPlaying) s.toggleIconPlaying.hidden = !s.playing;
        if (s.toggle) {
            s.toggle.classList.toggle("is-playing", s.playing);
            s.toggle.setAttribute("aria-label", s.playing ? "Pause" : "Play");
        }
        s.syncDockPet();
        requestAnimationFrame(s.syncTitleMarquee);
    };

    /** play() rejects on autoplay policy or decode errors; the UI only flips once it resolves. */
    function attemptPlay() {
        let promise;
        try {
            promise = s.audio.play();
        } catch (error) {
            promise = Promise.reject(error);
        }
        Promise.resolve(promise).then(
            () => {
                s.playing = true;
                s.show();
            },
            () => {
                s.playing = false;
                s.show();
            }
        );
    }

    s.load = function (nextIndex, andPlay) {
        if (!s.tracks.length) return;
        s.index = (nextIndex + s.tracks.length) % s.tracks.length;
        const track = s.tracks[s.index];
        s.trackTitle = track.title || "";
        const changed = s.audio.getAttribute("src") !== track.src;
        if (pendingCanPlay) {
            s.audio.removeEventListener("canplay", pendingCanPlay);
            pendingCanPlay = null;
        }
        if (changed) {
            s.audio.src = track.src;
            s.audio.load();
        }
        s.show();
        if (!andPlay) return;
        // Calling play() on a freshly loaded src can no-op in some browsers; wait for canplay.
        if (changed && s.audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            pendingCanPlay = function () {
                pendingCanPlay = null;
                attemptPlay();
            };
            s.audio.addEventListener("canplay", pendingCanPlay, { once: true });
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
        else attemptPlay();
    };

    // playing flips before pause() so the element's "pause" event doesn't re-render.
    s.pauseMedia = function () {
        s.playing = false;
        s.show();
        s.audio.pause();
    };

    s.stopMedia = function () {
        s.pauseMedia();
        try {
            s.audio.currentTime = 0;
        } catch (error) {
            // Throws when no source is loaded yet.
        }
    };

    s.skipMedia = function () {
        s.load(s.index + (s.audio.getAttribute("src") ? 1 : 0), true);
    };
}
