(function () {
    var player = document.getElementById("site-player");
    if (!player || window.__sitePlayer) return;
    window.__sitePlayer = true;

    var audio = document.createElement("audio");
    audio.preload = "auto";
    player.appendChild(audio);

    var tracks = [];
    var index = 0;
    var toggle = player.querySelector("[data-player-toggle]");
    var skip = player.querySelector("[data-player-skip]");
    var label = player.querySelector("[data-player-title]");

    function show() {
        var track = tracks[index];
        label.textContent = track ? track.title : "Playlist";
        toggle.textContent = audio.paused ? "Play" : "Pause";
    }

    function load(nextIndex, andPlay) {
        if (!tracks.length) return;
        index = (nextIndex + tracks.length) % tracks.length;
        var src = tracks[index].src;
        if (audio.getAttribute("src") !== src) audio.src = src;
        if (andPlay) audio.play();
        show();
    }

    toggle.addEventListener("click", function () {
        if (!tracks.length) return;
        if (!audio.getAttribute("src")) load(0, true);
        else if (audio.paused) audio.play();
        else audio.pause();
        show();
    });

    skip.addEventListener("click", function () {
        load(index + (audio.getAttribute("src") ? 1 : 0), true);
    });

    audio.addEventListener("play", show);
    audio.addEventListener("pause", show);
    audio.addEventListener("ended", function () {
        load(index + 1, true);
    });

    fetch("/audio/playlist.json")
        .then(function (response) { return response.json(); })
        .then(function (list) {
            tracks = Array.isArray(list) ? list : [];
            show();
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

    function bootSkin(list) {
        var host = document.getElementById("winamp-host");
        if (!host || !list.length) return Promise.resolve();
        host.style.position = "relative";
        host.style.display = "block";
        host.style.width = "275px";
        host.style.height = "348px";
        return import("https://unpkg.com/webamp@2.3.1/built/webamp.bundle.min.mjs").then(function (mod) {
            var Webamp = mod.default;
            if (!Webamp.browserIsSupported()) return;
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
            return webamp.renderInto(host).then(function () {
                host.style.position = "";
                player.classList.add("site-player--skin");
                requestAnimationFrame(fitSkinBox);
                window.addEventListener("resize", fitSkinBox);
            });
        });
    }

    function fitSkinBox() {
        var skinHost = document.getElementById("winamp-host");
        if (!skinHost) return;
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

    history.replaceState({ player: true }, "", location.href);
    show();
})();
