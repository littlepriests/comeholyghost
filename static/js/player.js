(function () {
    var player = document.getElementById("site-player");
    if (!player || window.__sitePlayer) return;
    window.__sitePlayer = true;

    var audio = document.createElement("audio");
    audio.preload = "auto";
    player.appendChild(audio);

    var tracks = [];
    var playWhenReady = false;
    var index = 0;
    var playing = false;
    var trackTitle = "";
    var slotObserver = null;
    var skinDockObserver = null;
    var chromeClosed = false;
    var skinUnavailable = false;
    var syncingWebampClose = false;
    var mobileQuery = window.matchMedia("(max-width: 44.99rem)");
    var playlistRemote = "https://surface-according-federal-forestry.trycloudflare.com/playlist.json";
    var playlistLocal = "/audio/playlist.json";
    var toggle = player.querySelector("[data-player-toggle]");
    var skip = player.querySelector("[data-player-skip]");
    var stop = player.querySelector("[data-player-stop]");
    var closeBtn = player.querySelector("[data-player-close]");
    var reopenBtn = player.querySelector("[data-player-reopen]");
    var label = player.querySelector("[data-player-title]");
    var labelText = player.querySelector("[data-player-title-text]");
    var toggleIconPlay = toggle ? toggle.querySelector("[data-player-icon-play]") : null;
    var toggleIconPlaying = toggle ? toggle.querySelector("[data-player-icon-playing]") : null;
    var dockIdle = player.querySelector("[data-player-dock-idle]");
    var dockKick = player.querySelector("[data-player-dock-kick]");
    var dockKickStrip = dockKick ? dockKick.querySelector(".sprite-anim") : null;
    var dockPetTimer = 0;
    var dockPetKicking = false;
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

    function playDockKickThenIdle() {
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
        var kickMs = 400;
        try {
            var fps = dockKickStrip
                ? parseFloat(getComputedStyle(dockKickStrip).getPropertyValue("--sprite-fps")) || 8
                : 8;
            var frames = dockKickStrip
                ? parseFloat(getComputedStyle(dockKickStrip).getPropertyValue("--sprite-frames")) || 3
                : 3;
            // One kick cycle, brief hold, then static idle again.
            kickMs = Math.max(320, Math.round((frames / fps) * 1000) + 120);
        } catch (error) {}
        dockPetTimer = window.setTimeout(showDockIdle, kickMs);
    }

    function syncDockPet() {
        if (!dockIdle && !dockKick) return;
        // Don't clobber an in-progress kick (pauseMedia + audio "pause" both call show).
        if (!dockPetKicking) showDockIdle();
    }

    function pulseDockKick() {
        playDockKickThenIdle();
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

    // HTML <audio> always owns real playback + auto-next (survives SPA).
    // Winamp is chrome/visual only — never start it, never hand off into setTracksToPlay
    // (that API always autoplays and caused idle navigations / cold loads to start music).
    function useWebampTransport() {
        return false;
    }

    function silenceWebamp() {
        var w = window.__webamp;
        if (!w || typeof w.pause !== "function") return;
        try {
            w.pause();
        } catch (error) {}
    }

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
        silenceWebamp();
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
        silenceWebamp();
        // Set playing first so the audio "pause" listener does not run a second show()
        // that would cancel the dock kick animation.
        playing = false;
        show();
        try {
            audio.pause();
        } catch (error) {}
    }

    function stopMedia() {
        silenceWebamp();
        playing = false;
        show();
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (error) {}
    }

    function skipMedia() {
        silenceWebamp();
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
            stopMedia();
            pulseDockKick();
        });
    }

    function setChromeClosed(closed) {
        chromeClosed = !!closed;
        syncClosedChrome();
        syncWebampClosedState();
        measureSimplePlayer();
        placeHomePlayer();
        placeSkinPlayer();
    }

    function syncClosedChrome() {
        var canClose = player.classList.contains("site-player--simple")
            || player.classList.contains("site-player--skin");
        var closed = canClose && chromeClosed;
        player.classList.toggle("site-player--closed", closed);
        if (reopenBtn) {
            if (closed) reopenBtn.removeAttribute("hidden");
            else reopenBtn.setAttribute("hidden", "");
        }
    }

    function syncWebampClosedState() {
        if (!window.__webamp || syncingWebampClose) return;
        var skinMode = player.classList.contains("site-player--skin");
        syncingWebampClose = true;
        try {
            if (skinMode && chromeClosed) {
                if (typeof window.__webamp.close === "function") window.__webamp.close();
            } else if (typeof window.__webamp.reopen === "function") {
                // Simple mode parks an open skin off-screen; skin reopen restores Winamp.
                window.__webamp.reopen();
            }
        } catch (error) {
        } finally {
            syncingWebampClose = false;
        }
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            // Hide chrome only — leave play/pause where it is.
            setChromeClosed(true);
        });
    }

    if (reopenBtn) {
        reopenBtn.addEventListener("click", function () {
            setChromeClosed(false);
        });
    }

    audio.addEventListener("play", function () {
        if (useWebampTransport()) return;
        if (playing) return;
        playing = true;
        show();
    });
    audio.addEventListener("pause", function () {
        if (useWebampTransport()) return;
        // pauseMedia/stopMedia already updated UI; skip duplicate show().
        if (!playing) return;
        playing = false;
        show();
    });
    audio.addEventListener("ended", function () {
        if (useWebampTransport()) return;
        load(index + 1, true);
    });

    // Show the right chrome immediately (esp. mobile simple) so playlist /
    // Webamp network work cannot leave the player stuck in --booting.
    applyPlayerChrome();

    loadPlaylist()
        .then(function (list) {
            tracks = Array.isArray(list) ? list : [];
            show();
            applyPlayerChrome();
            if (playWhenReady && tracks.length) playMedia();
            return bootSkin(tracks);
        })
        .catch(function (error) {
            console.error(error);
            skinUnavailable = true;
            player.classList.remove("site-player--booting");
            applyPlayerChrome();
        });

    function loadScript(src, globalName) {
        return new Promise(function (resolve, reject) {
            if (window[globalName]) {
                resolve(window[globalName]);
                return;
            }
            var script = document.createElement("script");
            script.src = src;
            script.onload = function () { resolve(window[globalName]); };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function clearInlinePlacement() {
        player.style.removeProperty("top");
        player.style.removeProperty("left");
        player.style.removeProperty("right");
        player.style.removeProperty("bottom");
        player.style.removeProperty("width");
        player.style.removeProperty("height");
    }

    function clearWebampWindowCache() {
        try {
            Object.keys(localStorage).forEach(function (key) {
                if (/webamp/i.test(key)) localStorage.removeItem(key);
            });
        } catch (error) {}
    }

    function clearForcedWindowStyles() {
        // Webamp positions each window with a parent translate().
        // Forcing top/inset on .window doubles that offset and segments the skin.
        ["main-window", "equalizer-window", "playlist-window"].forEach(function (id) {
            var node = document.getElementById(id);
            if (!node) return;
            node.style.removeProperty("inset");
            node.style.removeProperty("top");
            node.style.removeProperty("left");
            node.style.removeProperty("right");
            node.style.removeProperty("bottom");
        });
    }

    function revealSkin() {
        clearForcedWindowStyles();
        void player.offsetWidth;
        requestAnimationFrame(function () {
            player.classList.remove("site-player--booting");
            applyPlayerChrome();
            requestAnimationFrame(fitSkinBox);
        });
    }

    function bootSkin(list) {
        var host = document.getElementById("winamp-host");
        if (!host || !list.length) {
            skinUnavailable = true;
            player.classList.remove("site-player--booting");
            applyPlayerChrome();
            return Promise.resolve();
        }
        var isHome = document.body.classList.contains("home");
        var useSimple = isHome || isMobileViewport() || skinUnavailable;

        // Keep simple icons put on home and mobile. Desktop inner pages mount
        // in the real skin frame (hidden via --booting) so geometry matches a hard refresh.
        if (useSimple) {
            player.classList.add("site-player--simple");
            player.classList.remove("site-player--skin", "site-player--booting");
        } else {
            player.classList.remove("site-player--simple");
            player.classList.add("site-player--skin", "site-player--booting");
            clearInlinePlacement();
        }

        clearWebampWindowCache();

        return import("https://unpkg.com/webamp@2.3.1/built/webamp.bundle.min.mjs").then(function (mod) {
            var Webamp = mod.default;
            if (!Webamp.browserIsSupported()) {
                skinUnavailable = true;
                player.classList.remove("site-player--booting");
                applyPlayerChrome();
                return;
            }
            var webamp = new Webamp({
                // Empty on purpose — loading real URLs here made Winamp audible on boot
                // and fought the HTML <audio> transport. Skin is visual chrome only.
                initialTracks: [],
                initialSkin: { url: new URL("/skins/Opaline.wsz", location.origin).href },
                windowLayout: {
                    main: { position: { left: 0, top: 0 } },
                    equalizer: { position: { left: 0, top: 116 } },
                    playlist: { position: { left: 0, top: 232 } },
                    milkdrop: { position: { left: 0, top: 0 }, closed: true }
                },
                zIndex: 40,
                requireJSZip: function () {
                    return loadScript("https://unpkg.com/jszip@3.10.1/dist/jszip.min.js", "JSZip");
                },
                requireMusicMetadata: function () {
                    return Promise.resolve({
                        parseBlob: function () { return Promise.resolve({ common: {} }); }
                    });
                }
            });
            window.__webamp = webamp;
            if (typeof webamp.onClose === "function") {
                webamp.onClose(function () {
                    if (syncingWebampClose) return;
                    // Winamp's own × — leave HTML audio alone, show the reopen heart.
                    chromeClosed = true;
                    syncClosedChrome();
                    placeSkinPlayer();
                });
            }
            return webamp.renderInto(host).then(function () {
                silenceWebamp();
                [50, 200, 500].forEach(function (ms) {
                    window.setTimeout(silenceWebamp, ms);
                });
                if (document.body.classList.contains("home") || isMobileViewport()) {
                    applyPlayerChrome();
                } else {
                    revealSkin();
                }
                window.addEventListener("resize", onViewportChange);
                window.addEventListener("scroll", placeHomePlayer, { passive: true });
            });
        }).catch(function (error) {
            console.error(error);
            skinUnavailable = true;
            player.classList.remove("site-player--booting");
            applyPlayerChrome();
        });
    }

    function applyPlayerChrome() {
        var isHome = document.body.classList.contains("home");
        var mobile = !isHome && isMobileViewport();
        var useSimple = isHome || mobile || skinUnavailable;
        // Simple chrome can show while Webamp is still mounting; only the
        // desktop skin waits behind site-player--booting.
        if (player.classList.contains("site-player--booting") && !useSimple && !window.__webamp) return;
        if (!useSimple && !window.__webamp) {
            player.classList.remove("site-player--simple", "site-player--mobile");
            player.classList.add("site-player--skin", "site-player--booting");
            clearInlinePlacement();
            syncClosedChrome();
            return;
        }
        player.classList.toggle("site-player--simple", useSimple);
        player.classList.toggle("site-player--skin", !useSimple);
        player.classList.toggle("site-player--mobile", mobile);
        if (useSimple) player.classList.remove("site-player--booting");
        if (isHome) {
            if (!supportsAnchor) player.classList.add("site-player--home-pending");
            else player.classList.remove("site-player--home-pending");
        } else {
            player.classList.remove("site-player--home-pending");
            if (useSimple) clearInlinePlacement();
            else clearForcedWindowStyles();
        }
        // Never start/stop HTML audio on chrome swap. Keep Winamp muted so it
        // cannot autoplay under the skin.
        if (window.__webamp) silenceWebamp();
        syncClosedChrome();
        syncWebampClosedState();
        watchHomeSlot();
        measureSimplePlayer();
        placeHomePlayer();
        placeSkinPlayer();
        watchSkinDock();
    }

    function measureSimplePlayer() {
        if (!player.classList.contains("site-player--simple")) return;
        var root = document.documentElement;
        root.style.setProperty("--simple-player-width", Math.ceil(player.offsetWidth || 176) + "px");
        root.style.setProperty("--simple-player-height", Math.ceil(player.offsetHeight || 44) + "px");
    }

    function fitSkinBox() {
        var skinHost = document.getElementById("winamp-host");
        if (!skinHost || player.classList.contains("site-player--simple")) return;
        var nodes = skinHost.querySelectorAll(".window");
        var top = Infinity;
        var left = Infinity;
        var right = -Infinity;
        var bottom = -Infinity;
        var any = false;
        for (var i = 0; i < nodes.length; i++) {
            var rect = nodes[i].getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) continue;
            any = true;
            if (rect.top < top) top = rect.top;
            if (rect.left < left) left = rect.left;
            if (rect.right > right) right = rect.right;
            if (rect.bottom > bottom) bottom = rect.bottom;
        }
        if (!any) return;
        var root = document.documentElement;
        root.style.setProperty("--skin-box-width", Math.ceil(right - left) + "px");
        root.style.setProperty("--skin-box-height", Math.ceil(bottom - top) + "px");
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

    function normalizeText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .replace(/[.\s]+$/g, "")
            .trim()
            .toLowerCase();
    }

    function skinVerticalAnchor() {
        // Blog articles: flush with the first real body prose (skip a lede that
        // only repeats the title), so the skin sits beside where text appears.
        var contentBody = document.querySelector(".page__body .content__body")
            || document.querySelector(".content__body");
        if (contentBody) {
            var title = normalizeText(
                (document.querySelector(".content__header h1, .page__body h1") || {}).textContent
            );
            var blocks = contentBody.querySelectorAll(":scope > p, :scope > ul, :scope > ol, :scope > blockquote");
            for (var i = 0; i < blocks.length; i++) {
                var block = blocks[i];
                if (block.querySelector("img, picture, video, .retro-media")) continue;
                var text = normalizeText(block.textContent);
                if (!text) continue;
                if (title && text === title) continue;
                return block;
            }
            if (blocks.length) return blocks[0];
            return contentBody;
        }
        return document.querySelector(".page__body")
            || document.querySelector(".gallery-wrap > main")
            || document.querySelector(".guestbook-wrap > main")
            || document.querySelector(".page");
    }

    function skinHorizontalAnchor() {
        return document.querySelector(".page__aside")
            || document.querySelector(".page__body")
            || document.querySelector(".gallery-wrap > main")
            || document.querySelector(".guestbook-wrap > main");
    }

    function placeSkinPlayer() {
        if (!player.classList.contains("site-player--skin")) return;
        var vertical = skinVerticalAnchor();
        var horizontal = skinHorizontalAnchor();
        if (!vertical) return;
        // Position relative to body (position: relative) so the skin scrolls
        // with the page, top-aligned to the article content start.
        var vRect = vertical.getBoundingClientRect();
        var bodyRect = document.body.getBoundingClientRect();
        var gap = 24;
        try {
            var gapRaw = getComputedStyle(document.documentElement).getPropertyValue("--skin-gap").trim();
            if (gapRaw) gap = Math.round(parseFloat(gapRaw) * (gapRaw.indexOf("rem") >= 0 ? 16 : 1)) || 24;
        } catch (error) {}
        player.style.top = Math.round(vRect.top - bodyRect.top) + "px";
        if (horizontal && horizontal.classList.contains("page__aside")) {
            var aRect = horizontal.getBoundingClientRect();
            player.style.left = Math.round(aRect.left - bodyRect.left) + "px";
            player.style.right = "auto";
            document.documentElement.style.setProperty(
                "--skin-offset-top",
                Math.max(0, Math.round(vRect.top - aRect.top)) + "px"
            );
        } else if (horizontal) {
            var hRect = horizontal.getBoundingClientRect();
            player.style.left = Math.round(hRect.right - bodyRect.left + gap) + "px";
            player.style.right = "auto";
            document.documentElement.style.removeProperty("--skin-offset-top");
        } else {
            player.style.removeProperty("left");
            player.style.removeProperty("right");
            document.documentElement.style.removeProperty("--skin-offset-top");
        }
        placeDockedChrome();
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

    // When the Winamp skin scrolls out of view, stick the minimalist chrome mid-
    // viewport (tracks the scrollbar vertically) and center it on the skin column.
    function clearDockedChromePlacement() {
        if (chromeEl) {
            chromeEl.style.removeProperty("left");
            chromeEl.style.removeProperty("right");
        }
        if (reopenBtn) {
            reopenBtn.style.removeProperty("left");
            reopenBtn.style.removeProperty("right");
        }
    }

    function placeDockedChrome() {
        if (!player.classList.contains("site-player--docked") || !player.classList.contains("site-player--skin")) {
            clearDockedChromePlacement();
            return;
        }
        if (document.body.classList.contains("home") || isMobileViewport()) {
            clearDockedChromePlacement();
            return;
        }
        var anchor = skinHorizontalAnchor() || document.getElementById("winamp-host");
        if (!anchor) return;
        var rect = anchor.getBoundingClientRect();
        if (rect.width < 2) return;
        var cx = Math.round(rect.left + rect.width / 2) + "px";
        if (chromeEl) {
            chromeEl.style.left = cx;
            chromeEl.style.right = "auto";
        }
        if (reopenBtn) {
            reopenBtn.style.left = cx;
            reopenBtn.style.right = "auto";
        }
    }

    function setSkinDocked(docked) {
        player.classList.toggle("site-player--docked", !!docked);
        if (docked) placeDockedChrome();
        else clearDockedChromePlacement();
    }

    function watchSkinDock() {
        if (skinDockObserver) {
            skinDockObserver.disconnect();
            skinDockObserver = null;
        }
        setSkinDocked(false);
        if (!player.classList.contains("site-player--skin")) return;
        if (document.body.classList.contains("home") || isMobileViewport()) return;
        if (typeof IntersectionObserver !== "function") return;
        var host = document.getElementById("winamp-host");
        if (!host) return;
        skinDockObserver = new IntersectionObserver(
            function (entries) {
                var entry = entries[0];
                if (!entry) return;
                if (!player.classList.contains("site-player--skin")) {
                    setSkinDocked(false);
                    return;
                }
                setSkinDocked(!entry.isIntersecting);
            },
            { root: null, threshold: 0, rootMargin: "0px" }
        );
        skinDockObserver.observe(host);
        placeDockedChrome();
    }

    function onViewportChange() {
        applyPlayerChrome();
        if (player.classList.contains("site-player--skin")) {
            fitSkinBox();
            placeSkinPlayer();
            placeDockedChrome();
        } else {
            placeHomePlayer();
        }
    }

    window.addEventListener("resize", placeDockedChrome);
    window.addEventListener("scroll", placeDockedChrome, { passive: true });

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
                        if (player.classList.contains("site-player--skin")) {
                            requestAnimationFrame(function () {
                                fitSkinBox();
                                placeSkinPlayer();
                                watchSkinDock();
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
