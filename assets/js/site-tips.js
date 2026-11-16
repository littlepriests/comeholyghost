/* Floating data-tip labels — follow the pointer, above Winamp / sprites / images. */
(function () {
    if (window.__siteTips) return;
    window.__siteTips = true;

    // Sit ahead of the cursor (LTR): right + slightly above so the tip isn't under it.
    var OFFSET_X = 16;
    var OFFSET_Y = -18;

    var tip = document.createElement("div");
    tip.className = "site-tip-float";
    tip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tip);

    var active = null;
    var lastX = 0;
    var lastY = 0;

    function hide() {
        active = null;
        tip.classList.remove("is-open");
        tip.textContent = "";
        tip.style.transform = "translate(-9999px, -9999px)";
    }

    function placeAt(clientX, clientY) {
        if (!active) return;
        var text = active.getAttribute("data-tip");
        if (!text) {
            hide();
            return;
        }
        tip.textContent = text;
        tip.classList.add("is-open");
        tip.style.transform = "translate(0px, 0px)";
        var tw = tip.offsetWidth || 0;
        var th = tip.offsetHeight || 0;
        var left = clientX + OFFSET_X;
        var top = clientY + OFFSET_Y - th;
        // Flip below / left if we'd clip the viewport.
        if (top < 4) top = clientY - OFFSET_Y;
        if (left + tw > window.innerWidth - 4) left = clientX - tw - OFFSET_X;
        left = Math.max(4, Math.min(left, window.innerWidth - tw - 4));
        top = Math.max(4, Math.min(top, window.innerHeight - th - 4));
        tip.style.transform =
            "translate(" + Math.round(left) + "px, " + Math.round(top) + "px)";
    }

    function fromEvent(event) {
        var el = event.target && event.target.closest
            ? event.target.closest(".site-tip[data-tip]")
            : null;
        return el;
    }

    document.addEventListener("pointerover", function (event) {
        var el = fromEvent(event);
        if (!el) return;
        active = el;
        lastX = event.clientX;
        lastY = event.clientY;
        placeAt(lastX, lastY);
    });

    document.addEventListener("pointermove", function (event) {
        if (!active) return;
        lastX = event.clientX;
        lastY = event.clientY;
        placeAt(lastX, lastY);
    });

    document.addEventListener("pointerout", function (event) {
        var el = fromEvent(event);
        if (!el || el !== active) return;
        var next = event.relatedTarget && event.relatedTarget.closest
            ? event.relatedTarget.closest(".site-tip[data-tip]")
            : null;
        if (next === el) return;
        hide();
    });

    document.addEventListener("focusin", function (event) {
        var el = fromEvent(event);
        if (!el) return;
        active = el;
        var r = el.getBoundingClientRect();
        placeAt(r.left + r.width / 2, r.top);
    });

    document.addEventListener("focusout", function (event) {
        var el = fromEvent(event);
        if (!el || el !== active) return;
        var next = event.relatedTarget && event.relatedTarget.closest
            ? event.relatedTarget.closest(".site-tip[data-tip]")
            : null;
        if (next === el) return;
        hide();
    });

    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
})();
