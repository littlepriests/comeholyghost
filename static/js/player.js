(function () {
    var player = document.getElementById("site-player");
    if (!player || window.__sitePlayer) return;
    window.__sitePlayer = true;

    var audio = document.createElement("audio");
    audio.preload = "metadata";
    player.appendChild(audio);

    var tracks = [];
    var playWhenReady = false;
    var index = 0;
    var playing = false;
    var trackTitle = "";
    var slotObserver = null;
    var chromeClosed = false;
    var mobileQuery = window.matchMedia("(max-width: 44.99rem)");
    var playlistRemote = "https://administrator-corporation-syntax-page.trycloudflare.com/playlist.json";
    var playlistLocal = "/audio/playlist.json";
    var toggle = player.querySelector("[data-player-toggle]");
    var skip = player.querySelector("[data-player-skip]");
    var stop = player.querySelector("[data-player-stop]");
    var reopenBtn = player.querySelector("[data-player-reopen]");
    var label = player.querySelector("[data-player-title]");
    var labelText = player.querySelector("[data-player-title-text]");
    var toggleIconPlay = toggle ? toggle.querySelector("[data-player-icon-play]") : null;
    var toggleIconPlaying = toggle ? toggle.querySelector("[data-player-icon-playing]") : null;
    var dockIdle = player.querySelector("[data-player-dock-idle]");
    var dockKick = player.querySelector("[data-player-dock-kick]");
    var dockKickStrip = dockKick ? dockKick.querySelector(".sprite-anim") : null;
    var dockHearts = player.querySelector("[data-player-dock-hearts]");
    var dockPetTimer = 0;
    var dockHeartsTimer = 0;
    var dockPetKicking = false;
    var backTopBtn = player.querySelector("[data-player-back-top]");
    var BACK_TOP_MIN_SCROLL = 160;
    var chromeEl = player.querySelector("[data-player-chrome]");
    var supportsAnchor = typeof CSS !== "undefined" && CSS.supports && CSS.supports("anchor-name", "--home-player-slot");

    function isMobileViewport() {
        return mobileQuery.matches;
    }

    function loadPlaylist() {
        return fetch(playlistRemote)
            .then(function (response) {
                if (!response.ok) throw new Error("remote playlist " + response.status);
                return response.json();
            })
            .catch(function () {
                return fetch(playlistLocal).then(function (response) {
                    if (!response.ok) throw new Error("local playlist " + response.status);
                    return response.json();
                });
            });
    }

    function currentTitle() {
        if (trackTitle) return trackTitle;
        var track = tracks[index];
        return track ? track.title : "Playlist";
    }

    function syncTitleMarquee() {
        if (!label || !labelText) return;
        label.classList.remove("is-marquee");
        label.style.removeProperty("--marquee-distance");
        var overflow = labelText.scrollWidth - label.clientWidth;
        if (overflow > 1) {
            label.style.setProperty("--marquee-distance", "-" + overflow + "px");
            label.classList.add("is-marquee");
        }
    }

    function showDockIdle() {
        dockPetKicking = false;
        window.clearTimeout(dockPetTimer);
        if (dockIdle) dockIdle.removeAttribute("hidden");
        if (dockKick) dockKick.setAttribute("hidden", "");
        if (dockKickStrip) dockKickStrip.classList.remove("is-kick-play");
    }

    function dockKickTiming() {
        var fps = 8;
        var frames = 3;
        try {
            if (dockKickStrip) {
                fps = parseFloat(getComputedStyle(dockKickStrip).getPropertyValue("--sprite-fps")) || 8;
                frames = parseFloat(getComputedStyle(dockKickStrip).getPropertyValue("--sprite-frames")) || 3;
            }
        } catch (error) {}
        return { fps: fps, frames: frames };
    }

    function playDockKickThenIdle(onIdle) {
        if (!dockIdle || !dockKick) return;
        window.clearTimeout(dockPetTimer);
        dockPetKicking = true;
        dockIdle.setAttribute("hidden", "");
        dockKick.removeAttribute("hidden");
        if (dockKickStrip) {
            dockKickStrip.classList.remove("is-kick-play");
            void dockKickStrip.offsetWidth;
            dockKickStrip.classList.add("is-kick-play");
        }
        var timing = dockKickTiming();
        // One kick cycle, brief hold, then static idle again.
        var kickMs = Math.max(320, Math.round((timing.frames / timing.fps) * 1000) + 120);
        dockPetTimer = window.setTimeout(function () {
            showDockIdle();
            if (typeof onIdle === "function") onIdle(timing);
        }, kickMs);
    }

    function syncDockPet() {
        if (!dockIdle && !dockKick) return;
        // Don't clobber an in-progress kick (pauseMedia + audio "pause" both call show).
        if (!dockPetKicking) showDockIdle();
    }

    function pulseDockKick() {
        playDockKickThenIdle();
    }

    function prefersReducedMotion() {
        try {
            return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        } catch (error) {
            return false;
        }
    }

    function burstDockHearts() {
        if (!dockHearts) return;
        if (prefersReducedMotion()) return;
        window.clearTimeout(dockHeartsTimer);
        dockHearts.classList.remove("is-stomp");
        void dockHearts.offsetWidth;
        dockHearts.classList.add("is-stomp");
        dockHeartsTimer = window.setTimeout(function () {
            dockHearts.classList.remove("is-stomp");
        }, 2800);
    }

    var pageHeartsTimer = 0;
    var pageHeartsLayer = null;

    /**
     * Transient full-viewport ♡ fountain (no markup bloat).
     * Hearts rise so the scroll reads as floating the page up.
     * Works on mobile simple chrome too (Grundo is desktop-dock only).
     */
    function burstPageHeartsThen(done) {
        var finish = typeof done === "function" ? done : function () {};
        if (prefersReducedMotion()) {
            finish();
            return;
        }
        window.clearTimeout(pageHeartsTimer);
        if (pageHeartsLayer && pageHeartsLayer.parentNode) {
            pageHeartsLayer.parentNode.removeChild(pageHeartsLayer);
        }
        var layer = document.createElement("div");
        layer.className = "player-page-hearts";
        layer.setAttribute("aria-hidden", "true");
        var count = isMobileViewport() ? 40 : 64;
        for (var i = 0; i < count; i++) {
            var heart = document.createElement("span");
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
        pageHeartsLayer = layer;
        // Start scroll once the rise is readable.
        window.setTimeout(finish, isMobileViewport() ? 260 : 360);
        pageHeartsTimer = window.setTimeout(function () {
            if (layer.parentNode) layer.parentNode.removeChild(layer);
            if (pageHeartsLayer === layer) pageHeartsLayer = null;
        }, 3400);
    }

    /**
     * Back-to-top beat: (desktop dock) stomp → dock spill → page hearts → scroll.
     * Mobile / undocked: page hearts → scroll (Grundo isn't shown on simple chrome).
     */
    function stompDockPetThen(done) {
        var finish = typeof done === "function" ? done : function () {};
        var canStomp = player.classList.contains("site-player--docked")
            && dockIdle
            && dockKick
            && !prefersReducedMotion();

        function afterPet() {
            burstPageHeartsThen(finish);
        }

        if (!canStomp) {
            afterPet();
            return;
        }
        window.clearTimeout(dockHeartsTimer);
        if (dockHearts) dockHearts.classList.remove("is-stomp");
        playDockKickThenIdle(function () {
            burstDockHearts();
            window.setTimeout(afterPet, 200);
        });
    }

    function show() {
        if (labelText) labelText.textContent = currentTitle();
        else if (label) label.textContent = currentTitle();
        // Play chevron when paused; speaker when audio is on (tab-style cue).
        if (toggleIconPlay) {
            if (playing) toggleIconPlay.setAttribute("hidden", "");
            else toggleIconPlay.removeAttribute("hidden");
        }
        if (toggleIconPlaying) {
            if (playing) toggleIconPlaying.removeAttribute("hidden");
            else toggleIconPlaying.setAttribute("hidden", "");
        }
        if (toggle) {
            toggle.classList.toggle("is-playing", playing);
            toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
        }
        syncDockPet();
        requestAnimationFrame(syncTitleMarquee);
    }

    // HTML <audio> owns playback + auto-next (survives SPA).
    function load(nextIndex, andPlay) {
        if (!tracks.length) return;
        index = (nextIndex + tracks.length) % tracks.length;
        trackTitle = tracks[index].title || "";
        var src = tracks[index].src;
        var changed = audio.getAttribute("src") !== src;
        if (changed) {
            audio.src = src;
            audio.load();
        }
        if (!andPlay) {
            show();
            return;
        }
        function attemptPlay() {
            var playPromise = audio.play();
            if (playPromise && typeof playPromise.then === "function") {
                playPromise.then(function () {
                    playing = true;
                    show();
                }).catch(function () {
                    // Autoplay / decode can reject; leave chrome paused.
                    playing = false;
                    show();
                });
            } else {
                playing = true;
                show();
            }
        }
        // After a src change, wait until the element can play or play() no-ops.
        if (changed && audio.readyState < 2) {
            var onReady = function () {
                audio.removeEventListener("canplay", onReady);
                attemptPlay();
            };
            audio.addEventListener("canplay", onReady);
            show();
            return;
        }
        attemptPlay();
    }

    function playMedia() {
        if (!tracks.length) {
            playWhenReady = true;
            return;
        }
        playWhenReady = false;
        if (!audio.getAttribute("src")) load(0, true);
        else {
            audio.play();
            playing = true;
            show();
        }
    }

    // Homepage music-prompt (and anything else) can start playback after a gesture.
    window.sitePlayerPlay = playMedia;

    function pauseMedia() {
        // Set playing first so the audio "pause" listener does not run a second show()
        // that would cancel the dock kick animation.
        playing = false;
        show();
        try {
            audio.pause();
        } catch (error) {}
    }

    function stopMedia() {
        playing = false;
        show();
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (error) {}
    }

    function skipMedia() {
        load(index + (audio.getAttribute("src") ? 1 : 0), true);
    }

    toggle.addEventListener("click", function () {
        if (playing) pauseMedia();
        else playMedia();
        pulseDockKick();
    });

    skip.addEventListener("click", function () {
        skipMedia();
        pulseDockKick();
    });

    if (stop) {
        stop.addEventListener("click", function () {
            // Stop owns “hide player”: pause audio, swap dock for the green ♡.
            playWhenReady = false;
            stopMedia();
            setChromeClosed(true);
        });
    }

    function syncBackTop() {
        if (!backTopBtn) return;
        var scrolled = (window.scrollY || document.documentElement.scrollTop || 0) >= BACK_TOP_MIN_SCROLL;
        var chromeOpen = !player.classList.contains("site-player--closed");
        var show = chromeOpen && scrolled;
        if (show) backTopBtn.removeAttribute("hidden");
        else backTopBtn.setAttribute("hidden", "");
    }

    if (backTopBtn) {
        backTopBtn.addEventListener("click", function () {
            var reduce = prefersReducedMotion();
            stompDockPetThen(function () {
                window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
            });
        });
    }

    function setChromeClosed(closed) {
        chromeClosed = !!closed;
        syncClosedChrome();
        measureSimplePlayer();
        placeHomePlayer();
        syncBackTop();
    }

    function syncClosedChrome() {
        var closed = chromeClosed;
        player.classList.toggle("site-player--closed", closed);
        if (reopenBtn) {
            if (closed) reopenBtn.removeAttribute("hidden");
            else reopenBtn.setAttribute("hidden", "");
        }
        syncBackTop();
    }

    if (reopenBtn) {
        reopenBtn.addEventListener("click", function () {
            // Restore dock only — never autoplay.
            playWhenReady = false;
            setChromeClosed(false);
            if (playing) pauseMedia();
            else show();
        });
    }

    audio.addEventListener("play", function () {
        if (playing) return;
        playing = true;
        show();
    });
    audio.addEventListener("pause", function () {
        // pauseMedia/stopMedia already updated UI; skip duplicate show().
        if (!playing) return;
        playing = false;
        show();
    });
    audio.addEventListener("ended", function () {
        load(index + 1, true);
    });

    // Simple chrome only. Playlist must not gate the dock.
    applyPlayerChrome();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", placeHomePlayer, { passive: true });

    loadPlaylist()
        .then(function (list) {
            tracks = Array.isArray(list) ? list : [];
            show();
            applyPlayerChrome();
            if (playWhenReady && tracks.length) playMedia();
        })
        .catch(function (error) {
            console.error(error);
            tracks = [];
            show();
            applyPlayerChrome();
        });

    function clearInlinePlacement() {
        player.style.removeProperty("top");
        player.style.removeProperty("left");
        player.style.removeProperty("right");
        player.style.removeProperty("bottom");
        player.style.removeProperty("width");
        player.style.removeProperty("height");
    }


    function applyPlayerChrome() {
        var isHome = document.body.classList.contains("home");
        var mobile = !isHome && isMobileViewport();
        player.classList.add("site-player--simple");
        player.classList.remove("site-player--skin", "site-player--booting", "site-player--docked", "site-player--dock-stuck");
        player.classList.toggle("site-player--mobile", mobile);
        if (isHome) {
            if (!supportsAnchor) player.classList.add("site-player--home-pending");
            else player.classList.remove("site-player--home-pending");
        } else {
            player.classList.remove("site-player--home-pending");
            clearInlinePlacement();
        }
        syncClosedChrome();
        watchHomeSlot();
        measureSimplePlayer();
        placeHomePlayer();
        syncBackTop();
    }

    function measureSimplePlayer() {
        if (!player.classList.contains("site-player--simple")) return;
        var root = document.documentElement;
        root.style.setProperty("--simple-player-width", Math.ceil(player.offsetWidth || 176) + "px");
        root.style.setProperty("--simple-player-height", Math.ceil(player.offsetHeight || 44) + "px");
    }
    function placeHomePlayer() {
        var slot = document.querySelector(".home-player-slot");
        if (!document.body.classList.contains("home") || !slot || !player.classList.contains("site-player--simple")) {
            return;
        }
        measureSimplePlayer();
        // Anchor placement breaks when the dock is CSS-scaled as a group.
        if (supportsAnchor && !document.body.classList.contains("is-home-dock-scaled")) {
            clearInlinePlacement();
            player.classList.remove("site-player--home-pending");
            return;
        }
        var width = player.offsetWidth;
        var height = player.offsetHeight;
        var rect = slot.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2 || width < 2 || height < 2) {
            player.classList.add("site-player--home-pending");
            requestAnimationFrame(placeHomePlayer);
            return;
        }
        player.style.top = rect.top + Math.max(0, (rect.height - height) / 2) + "px";
        player.style.left = rect.left + Math.max(0, (rect.width - width) / 2) + "px";
        player.classList.remove("site-player--home-pending");
    }

    function watchHomeSlot() {
        if (slotObserver) {
            slotObserver.disconnect();
            slotObserver = null;
        }
        var slot = document.querySelector(".home-player-slot");
        if (!slot || !document.body.classList.contains("home") || supportsAnchor) return;
        if (typeof ResizeObserver === "function") {
            slotObserver = new ResizeObserver(function () {
                placeHomePlayer();
            });
            slotObserver.observe(slot);
        }
    }

    function onViewportChange() {
        applyPlayerChrome();
        placeHomePlayer();
    }

    window.addEventListener("scroll", syncBackTop, { passive: true });

    if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", onViewportChange);
    } else if (typeof mobileQuery.addListener === "function") {
        mobileQuery.addListener(onViewportChange);
    }

    function stylesheetPresent(absolute) {
        return Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
            try {
                return new URL(link.href, location.href).href === absolute;
            } catch (error) {
                return false;
            }
        });
    }

    function ensureStyles(doc, baseHref) {
        var waits = [];
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
            var href = link.getAttribute("href");
            if (!href) return;
            var absolute = new URL(href, baseHref).href;
            if (stylesheetPresent(absolute)) return;
            waits.push(new Promise(function (resolve) {
                var copy = document.createElement("link");
                copy.rel = "stylesheet";
                copy.href = absolute;
                var integrity = link.getAttribute("integrity");
                if (integrity) {
                    copy.integrity = integrity;
                    copy.crossOrigin = link.getAttribute("crossorigin") || "anonymous";
                }
                copy.onload = resolve;
                copy.onerror = resolve;
                document.head.appendChild(copy);
            }));
        });
        return Promise.all(waits);
    }

    function waitForFonts() {
        if (!document.fonts || !document.fonts.ready) return Promise.resolve();
        return Promise.race([
            document.fonts.ready.catch(function () {}),
            new Promise(function (resolve) {
                window.setTimeout(resolve, 180);
            })
        ]);
    }

    function adopt(href, fromPop) {
        var current = document.getElementById("page-root");
        if (current) current.classList.add("is-page-pending");
        return fetch(href)
            .then(function (response) { return response.text(); })
            .then(function (text) {
                var doc = new DOMParser().parseFromString(text, "text/html");
                var incoming = doc.getElementById("page-root");
                current = document.getElementById("page-root");
                if (!incoming || !current) {
                    location.assign(href);
                    return;
                }
                return ensureStyles(doc, href)
                    .then(waitForFonts)
                    .then(function () {
                        current.replaceWith(document.importNode(incoming, true));
                        document.title = doc.title;
                        document.body.className = doc.body.className;
                        var nextRoot = document.getElementById("page-root");
                        if (nextRoot) {
                            nextRoot.classList.add("is-page-pending");
                            nextRoot.querySelectorAll("script[src]").forEach(function (old) {
                                var created = document.createElement("script");
                                created.src = new URL(old.getAttribute("src"), href).href;
                                document.body.appendChild(created);
                            });
                        }
                        // Drop leftover fixed bottom-right corner art when home
                        // brings its own footer-anchored .home-sword (SPA dupe).
                        if (document.body.classList.contains("home")) {
                            document.querySelectorAll(
                                '.site-backdrop[data-anchor="bottom-right"]'
                            ).forEach(function (node) {
                                node.remove();
                            });
                            // Banner decode gate if home.js has not run yet (or re-run).
                            requestAnimationFrame(function () {
                                if (typeof window.revealHomeBanner === "function") {
                                    window.revealHomeBanner();
                                }
                            });
                        }
                        // Homepage always opens on the minimalist chrome.
                        if (document.body.classList.contains("home")) chromeClosed = false;
                        applyPlayerChrome();
                        if (typeof window.refreshStarReadingVoids === "function") {
                            requestAnimationFrame(function () {
                                window.refreshStarReadingVoids();
                                requestAnimationFrame(function () {
                                    window.refreshStarReadingVoids();
                                    window.setTimeout(window.refreshStarReadingVoids, 200);
                                });
                            });
                        }
                        if (!fromPop) history.pushState({ player: true }, "", href);
                        if (location.hash) {
                            var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
                            if (target) target.scrollIntoView();
                        } else {
                            window.scrollTo(0, 0);
                        }
                        requestAnimationFrame(function () {
                            var root = document.getElementById("page-root");
                            if (root) root.classList.remove("is-page-pending");
                        });
                    });
            })
            .catch(function () {
                var root = document.getElementById("page-root");
                if (root) root.classList.remove("is-page-pending");
                location.assign(href);
            });
    }

    document.addEventListener("click", function (event) {
        var link = event.target.closest("a");
        if (!link || !link.href) return;
        if (player.contains(link)) return;
        if (link.target && link.target !== "_self") return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        var url;
        try { url = new URL(link.href); } catch (error) { return; }
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
        event.preventDefault();
        adopt(url.href, false);
    });

    window.addEventListener("popstate", function () {
        adopt(location.href, true);
    });

    window.addEventListener("load", placeHomePlayer);

    history.replaceState({ player: true }, "", location.href);
    applyPlayerChrome();
    show();
})();
