/* Floating label for .site-tip[data-tip]; follows the pointer, or sits over the element on keyboard focus. */
(function () {
    if (window.__site && window.__site.tipsReady) return;
    if (window.__site) window.__site.tipsReady = true;

    // Up and to the right of the pointer so the custom cursor doesn't cover it.
    let OFFSET_X = 16;
    let OFFSET_Y = -18;

    let tip = document.createElement("div");
    tip.className = "site-tip-float";
    tip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tip);

    let active = null;
    let lastX = 0;
    let lastY = 0;

    function hide() {
        active = null;
        tip.classList.remove("is-open");
        tip.textContent = "";
        tip.style.transform = "translate(-9999px, -9999px)";
    }

    function placeAt(clientX, clientY) {
        if (!active) return;
        let text = active.getAttribute("data-tip");
        if (!text) {
            hide();
            return;
        }
        tip.textContent = text;
        tip.classList.add("is-open");
        tip.style.transform = "translate(0px, 0px)";
        let tw = tip.offsetWidth || 0;
        let th = tip.offsetHeight || 0;
        let left = clientX + OFFSET_X;
        let top = clientY + OFFSET_Y - th;
        if (top < 4) top = clientY - OFFSET_Y;
        if (left + tw > window.innerWidth - 4) left = clientX - tw - OFFSET_X;
        left = Math.max(4, Math.min(left, window.innerWidth - tw - 4));
        top = Math.max(4, Math.min(top, window.innerHeight - th - 4));
        tip.style.transform =
            "translate(" + Math.round(left) + "px, " + Math.round(top) + "px)";
    }

    function fromEvent(event) {
        let el = event.target && event.target.closest
            ? event.target.closest(".site-tip[data-tip]")
            : null;
        return el;
    }

    document.addEventListener("pointerover", function (event) {
        let el = fromEvent(event);
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
        let el = fromEvent(event);
        if (!el || el !== active) return;
        let next = event.relatedTarget && event.relatedTarget.closest
            ? event.relatedTarget.closest(".site-tip[data-tip]")
            : null;
        if (next === el) return;
        hide();
    });

    document.addEventListener("focusin", function (event) {
        let el = fromEvent(event);
        if (!el) return;
        active = el;
        let r = el.getBoundingClientRect();
        placeAt(r.left + r.width / 2, r.top);
    });

    document.addEventListener("focusout", function (event) {
        let el = fromEvent(event);
        if (!el || el !== active) return;
        let next = event.relatedTarget && event.relatedTarget.closest
            ? event.relatedTarget.closest(".site-tip[data-tip]")
            : null;
        if (next === el) return;
        hide();
    });

    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
})();
