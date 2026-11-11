/* Floating data-tip labels above Winamp / sprites / images (escapes stacking). */
(function () {
    if (window.__siteTips) return;
    window.__siteTips = true;

    var GAP = 8;
    var tip = document.createElement("div");
    tip.className = "site-tip-float";
    tip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tip);

    var active = null;

    function hide() {
        active = null;
        tip.classList.remove("is-open");
        tip.textContent = "";
        tip.style.transform = "translate(-9999px, -9999px)";
    }

    function place(el) {
        var text = el.getAttribute("data-tip");
        if (!text) {
            hide();
            return;
        }
        active = el;
        tip.textContent = text;
        tip.classList.add("is-open");
        // Measure after paint so width/height are real.
        tip.style.transform = "translate(0px, 0px)";
        var r = el.getBoundingClientRect();
        var tw = tip.offsetWidth || 0;
        var th = tip.offsetHeight || 0;
        var left = r.left + r.width / 2 - tw / 2;
        var top = r.top - th - GAP;
        // Prefer above the control; flip below if that would clip under the viewport top
        // (also keeps labels clear of Winamp when the control sits just under the skin).
        if (top < 4) top = r.bottom + GAP;
        left = Math.max(4, Math.min(left, window.innerWidth - tw - 4));
        top = Math.max(4, Math.min(top, window.innerHeight - th - 4));
        tip.style.transform = "translate(" + Math.round(left) + "px, " + Math.round(top) + "px)";
    }

    function fromEvent(event) {
        var el = event.target && event.target.closest
            ? event.target.closest(".site-tip[data-tip]")
            : null;
        return el;
    }

    document.addEventListener("pointerover", function (event) {
        var el = fromEvent(event);
        if (el) place(el);
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
        if (el) place(el);
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
