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
        });

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
