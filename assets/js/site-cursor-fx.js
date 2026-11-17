/**
 * Ghost cursor extras (desktop, fine pointer, motion OK):
 *  - click → soft ♡ burst (sword / back-to-top style)
 *  - idle → rare soft bubble near the pointer
 * Star trail on move lives in cursor-effects.html (homepage).
 */
(function () {
  let mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let mqNarrow = window.matchMedia("(max-width: 44.99rem)");
  let mqCoarse = window.matchMedia("(pointer: coarse)");

  function allowed() {
    return !mqReduce.matches && !mqNarrow.matches && !mqCoarse.matches;
  }

  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let lastTwinkle = 0;
  let running = false;
  let raf = 0;

  function burstHearts(x, y) {
    let layer = document.createElement("div");
    layer.className = "site-cursor-hearts";
    layer.style.left = x + "px";
    layer.style.top = y + "px";
    layer.setAttribute("aria-hidden", "true");
    let count = 4 + Math.floor(Math.random() * 3); // 4–6
    for (let i = 0; i < count; i++) {
      let heart = document.createElement("span");
      heart.className =
        "site-cursor-hearts__heart" +
        (Math.random() > 0.65 ? " is-bright" : "");
      heart.textContent = "♡";
      let angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
      let dist = 22 + Math.random() * 36;
      heart.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      heart.style.setProperty("--dy", Math.sin(angle) * dist - 12 + "px");
      heart.style.setProperty("--hd", (Math.random() * 0.15).toFixed(2) + "s");
      heart.style.setProperty("--rot", ((Math.random() * 28) - 14).toFixed(1) + "deg");
      heart.style.setProperty("--scale", (0.75 + Math.random() * 0.35).toFixed(2));
      layer.appendChild(heart);
    }
    document.body.appendChild(layer);
    window.setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 1800);
  }

  function burstBubbles(x, y, count) {
    let layer = document.createElement("div");
    layer.className = "site-cursor-bubbles";
    layer.style.left = x + "px";
    layer.style.top = y + "px";
    layer.setAttribute("aria-hidden", "true");
    let n = count || 1;
    for (let i = 0; i < n; i++) {
      let bubble = document.createElement("span");
      bubble.className = "site-cursor-bubbles__bubble";
      bubble.style.setProperty(
        "--dx",
        ((Math.random() * 28) - 14).toFixed(1) + "px"
      );
      bubble.style.setProperty(
        "--dy",
        (-8 - Math.random() * 22).toFixed(1) + "px"
      );
      bubble.style.setProperty("--hd", (Math.random() * 0.05).toFixed(2) + "s");
      bubble.style.setProperty("--scale", (0.7 + Math.random() * 0.45).toFixed(2));
      layer.appendChild(bubble);
    }
    document.body.appendChild(layer);
    window.setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 900);
  }

  function onMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onDown(e) {
    if (!allowed()) return;
    if (e.button != null && e.button !== 0) return;
    let t = e.target;
    if (
      t &&
      t.closest &&
      t.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }
    burstHearts(e.clientX, e.clientY);
  }

  function idleTick(now) {
    raf = requestAnimationFrame(idleTick);
    if (!allowed()) return;
    if (now - lastTwinkle < 4000 + Math.random() * 3000) return;
    lastTwinkle = now;
    if (Math.random() > 0.55) return;
    burstBubbles(mouse.x, mouse.y, 1);
  }

  function start() {
    if (running || !allowed()) return;
    running = true;
    lastTwinkle = performance.now();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, true);
    raf = requestAnimationFrame(idleTick);
  }

  function stop() {
    running = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown, true);
    cancelAnimationFrame(raf);
    document.querySelectorAll(".site-cursor-hearts, .site-cursor-bubbles").forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
  }

  function sync() {
    if (allowed()) start();
    else stop();
  }

  mqReduce.addEventListener("change", sync);
  mqNarrow.addEventListener("change", sync);
  mqCoarse.addEventListener("change", sync);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }
})();
