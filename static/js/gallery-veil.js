/* Photobook-only load veil: show only if first thumbs are still slow. */
(function () {
    var veil = document.getElementById("gallery-veil");
    if (!veil || veil.dataset.ready || !document.body.classList.contains("gallery-page")) {
        return;
    }
    veil.dataset.ready = "1";

    var hold = /(?:\?|&)veil(?:=|&|$)/.test(location.search);
    var reduce =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce && !hold) {
        veil.remove();
        return;
    }

    // Wait this long before deciding the grid is "slow" enough for the veil.
    var SLOW_MS = 320;
    var minMs = 900;
    var maxMs = 2200;
    var started = performance.now();
    var done = false;
    var opened = false;

    function firstThumbsReady() {
        var imgs = document.querySelectorAll(".gallery__item img");
        if (!imgs.length) return true;
        var limit = Math.min(imgs.length, 4);
        for (var i = 0; i < limit; i++) {
            var img = imgs[i];
            if (!(img.complete && img.naturalWidth > 0)) return false;
        }
        return true;
    }

    function spawnHearts() {
        var heartsHost = veil.querySelector(".gallery-veil__hearts");
        if (!heartsHost || reduce || heartsHost.childNodes.length) return;
        var n = 7;
        for (var i = 0; i < n; i++) {
            var heart = document.createElement("span");
            heart.className =
                "gallery-veil__heart" + (i % 3 === 0 ? " is-bright" : "");
            heart.textContent = "♡";
            heart.style.setProperty("--i", String(i));
            heart.style.setProperty("--n", String(n));
            heart.style.setProperty("--scale", (0.75 + (i % 3) * 0.2).toFixed(2));
            heart.style.setProperty("--delay", (i * 0.12).toFixed(2) + "s");
            heartsHost.appendChild(heart);
        }
    }

    function openVeil() {
        if (done || opened) return;
        opened = true;
        spawnHearts();
        veil.classList.add("is-open");
        if (hold) return;
        window.setTimeout(tryDismiss, minMs);
        window.setTimeout(dismiss, maxMs);
    }

    function dismiss() {
        if (done) return;
        done = true;
        if (!opened) {
            if (veil && veil.parentNode) veil.remove();
            return;
        }
        veil.classList.remove("is-open");
        veil.classList.add("is-gone");
        window.setTimeout(function () {
            if (veil && veil.parentNode) veil.remove();
        }, 320);
    }

    function tryDismiss() {
        if (hold) return;
        if (!opened) return;
        if (performance.now() - started < minMs) return;
        dismiss();
    }

    if (hold) {
        openVeil();
        veil.addEventListener(
            "click",
            function () {
                dismiss();
            },
            { once: true }
        );
        veil.style.pointerEvents = "auto";
        veil.style.cursor = "pointer";
        return;
    }

    // Fast path: first row already painted → never flash the Krawk.
    if (firstThumbsReady()) {
        dismiss();
        return;
    }

    window.setTimeout(function () {
        if (done) return;
        if (firstThumbsReady()) {
            dismiss();
            return;
        }
        openVeil();
    }, SLOW_MS);

    var firstImg = document.querySelector(".gallery__item img");
    if (firstImg) {
        firstImg.addEventListener("load", tryDismiss, { once: true });
        firstImg.addEventListener("error", tryDismiss, { once: true });
    }
})();
