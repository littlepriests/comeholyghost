(function () {
    var player = document.getElementById("site-player");
    if (!player || window.__sitePlayer) return;
    window.__sitePlayer = true;

    var audio = document.createElement("audio");
    audio.preload = "auto";
    player.appendChild(audio);

    var tracks = [];
    var index = 0;
    var playing = false;
    var trackTitle = "";
    var slotObserver = null;
    var toggle = player.querySelector("[data-player-toggle]");
    var skip = player.querySelector("[data-player-skip]");
    var stop = player.querySelector("[data-player-stop]");
    var label = player.querySelector("[data-player-title]");
    var labelText = player.querySelector("[data-player-title-text]");
    var toggleIcon = toggle ? toggle.querySelector("i") : null;
    var supportsAnchor = typeof CSS !== "undefined" && CSS.supports && CSS.supports("anchor-name", "--home-player-slot");

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

    function show() {
        if (labelText) labelText.textContent = currentTitle();
        else if (label) label.textContent = currentTitle();
        if (toggleIcon) {
            toggleIcon.className = playing ? "fa-solid fa-pause" : "fa-solid fa-play";
        }
        if (toggle) {
            toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
        }
        requestAnimationFrame(syncTitleMarquee);
    }

    function load(nextIndex, andPlay) {
        if (!tracks.length) return;
        index = (nextIndex + tracks.length) % tracks.length;
        trackTitle = tracks[index].title || "";
        var src = tracks[index].src;
        if (audio.getAttribute("src") !== src) audio.src = src;
        if (andPlay) {
            audio.play();
            playing = true;
        }
        show();
    }

    function playMedia() {
        if (window.__webamp) {
            window.__webamp.play();
            playing = true;
            show();
            return;
        }
        if (!tracks.length) return;
        if (!audio.getAttribute("src")) load(0, true);
        else {
            audio.play();
            playing = true;
            show();
        }
    }

    function pauseMedia() {
        if (window.__webamp) {
            window.__webamp.pause();
        } else {
            audio.pause();
        }
        playing = false;
        show();
    }

    function stopMedia() {
        if (window.__webamp) {
            window.__webamp.stop();
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
        playing = false;
        show();
    }

    function skipMedia() {
        if (window.__webamp) {
            window.__webamp.nextTrack();
            playing = true;
            show();
            return;
        }
        load(index + (audio.getAttribute("src") ? 1 : 0), true);
    }

    toggle.addEventListener("click", function () {
        if (playing) pauseMedia();
        else playMedia();
    });

    skip.addEventListener("click", function () {
        skipMedia();
    });

    if (stop) {
        stop.addEventListener("click", function () {
            stopMedia();
        });
    }

    audio.addEventListener("play", function () {
        if (window.__webamp) return;
        playing = true;
        show();
    });
    audio.addEventListener("pause", function () {
        if (window.__webamp) return;
        playing = false;
        show();
    });
    audio.addEventListener("ended", function () {
        if (window.__webamp) return;
        load(index + 1, true);
    });

    fetch("/audio/playlist.json")
        .then(function (response) { return response.json(); })
        .then(function (list) {
            tracks = Array.isArray(list) ? list : [];
            show();
            applyPlayerChrome();
            return bootSkin(tracks);
        })
        .catch(function (error) {
            console.error(error);
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
        if (!host || !list.length) return Promise.resolve();
        var isHome = document.body.classList.contains("home");

        // Keep homepage icons put. On inner pages, mount in the real skin
        // frame (hidden via --booting) so geometry matches a hard refresh.
        if (isHome) {
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
                player.classList.remove("site-player--booting");
                applyPlayerChrome();
                return;
            }
            var webamp = new Webamp({
                initialTracks: list.map(function (track) {
                    return {
                        metaData: { artist: "", title: track.title },
                        url: new URL(track.src, location.origin).href,
                        duration: 8
                    };
                }),
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
            if (typeof webamp.onTrackDidChange === "function") {
                webamp.onTrackDidChange(function (track) {
                    if (track && track.metaData) {
                        trackTitle = track.metaData.title || "";
                        var found = tracks.findIndex(function (item) {
                            return item.title === trackTitle;
                        });
                        if (found >= 0) index = found;
                    }
                    show();
                });
            }
            return webamp.renderInto(host).then(function () {
                audio.pause();
                revealSkin();
                window.addEventListener("resize", onViewportChange);
                window.addEventListener("scroll", placeHomePlayer, { passive: true });
            });
        }).catch(function (error) {
            console.error(error);
            player.classList.remove("site-player--booting");
            applyPlayerChrome();
        });
    }

    function applyPlayerChrome() {
        if (player.classList.contains("site-player--booting")) return;
        var isHome = document.body.classList.contains("home");
        if (!isHome && !window.__webamp) {
            player.classList.remove("site-player--simple");
            player.classList.add("site-player--skin", "site-player--booting");
            clearInlinePlacement();
            return;
        }
        player.classList.toggle("site-player--simple", isHome);
        player.classList.toggle("site-player--skin", !isHome);
        if (isHome) {
            if (!supportsAnchor) player.classList.add("site-player--home-pending");
            else player.classList.remove("site-player--home-pending");
        } else {
            player.classList.remove("site-player--home-pending");
            clearInlinePlacement();
            clearForcedWindowStyles();
        }
        watchHomeSlot();
        measureSimplePlayer();
        placeHomePlayer();
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
            if (!document.body.classList.contains("home")) clearInlinePlacement();
            return;
        }
        measureSimplePlayer();
        if (supportsAnchor) {
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
        if (player.classList.contains("site-player--skin")) fitSkinBox();
        else placeHomePlayer();
    }

    function adopt(href, fromPop) {
        return fetch(href)
            .then(function (response) { return response.text(); })
            .then(function (text) {
                var doc = new DOMParser().parseFromString(text, "text/html");
                var incoming = doc.getElementById("page-root");
                var current = document.getElementById("page-root");
                if (!incoming || !current) {
                    location.assign(href);
                    return;
                }
                doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
                    var absolute = new URL(link.getAttribute("href"), href).href;
                    var present = Array.prototype.some.call(document.styleSheets, function (sheet) {
                        return sheet.href === absolute;
                    });
                    if (present) return;
                    var copy = document.createElement("link");
                    copy.rel = "stylesheet";
                    copy.href = absolute;
                    document.head.appendChild(copy);
                });
                current.replaceWith(document.importNode(incoming, true));
                document.title = doc.title;
                document.body.className = doc.body.className;
                document.getElementById("page-root").querySelectorAll("script[src]").forEach(function (old) {
                    var created = document.createElement("script");
                    created.src = new URL(old.getAttribute("src"), href).href;
                    document.body.appendChild(created);
                });
                applyPlayerChrome();
                if (player.classList.contains("site-player--skin")) {
                    requestAnimationFrame(fitSkinBox);
                }
                if (!fromPop) history.pushState({ player: true }, "", href);
                if (location.hash) {
                    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
                    if (target) target.scrollIntoView();
                } else {
                    window.scrollTo(0, 0);
                }
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
