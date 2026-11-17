/**
 * Cursor extras on desktop with a fine pointer and motion allowed: a ♡ burst
 * on click and an occasional bubble at the resting pointer. The homepage star
 * trail is separate (cursor-effects.html).
 */
(function () {
  let mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let mqNarrow = window.matchMedia("(max-width: 44.99rem)");
  let mqCoarse = window.matchMedia("(pointer: coarse)");

  function allowed() {
    return !mqReduce.matches && !mqNarrow.matches && !mqCoarse.matches;
  }

  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let running = false;
  let bubbleTimer = 0;

  function spawnLayer(className, x, y, children, lifetimeMs) {
    let layer = document.createElement("div");
    layer.className = className;
    layer.style.left = x + "px";
    layer.style.top = y + "px";
    layer.setAttribute("aria-hidden", "true");
    children.forEach(function (child) {
      layer.appendChild(child);
    });
    document.body.appendChild(layer);
    window.setTimeout(function () {
      layer.remove();
    }, lifetimeMs);
  }

  function burstHearts(x, y) {
    let hearts = [];
    let count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      let heart = document.createElement("span");
      heart.className =
        "site-cursor-hearts__heart" +
        (Math.random() > 0.65 ? " is-bright" : "");
      heart.textContent = "♡";
      // Fan upward: straight up ± ~85°.
      let angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
      let dist = 22 + Math.random() * 36;
      heart.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      heart.style.setProperty("--dy", Math.sin(angle) * dist - 12 + "px");
      heart.style.setProperty("--hd", (Math.random() * 0.15).toFixed(2) + "s");
      heart.style.setProperty("--rot", ((Math.random() * 28) - 14).toFixed(1) + "deg");
      heart.style.setProperty("--scale", (0.75 + Math.random() * 0.35).toFixed(2));
      hearts.push(heart);
    }
    // Outlasts the 1.55s pop plus the max delay.
    spawnLayer("site-cursor-hearts", x, y, hearts, 1800);
  }

  function burstBubble(x, y) {
    let bubble = document.createElement("span");
    bubble.className = "site-cursor-bubbles__bubble";
    bubble.style.setProperty("--dx", ((Math.random() * 28) - 14).toFixed(1) + "px");
    bubble.style.setProperty("--dy", (-8 - Math.random() * 22).toFixed(1) + "px");
    bubble.style.setProperty("--hd", (Math.random() * 0.05).toFixed(2) + "s");
    bubble.style.setProperty("--scale", (0.7 + Math.random() * 0.45).toFixed(2));
    spawnLayer("site-cursor-bubbles", x, y, [bubble], 900);
  }

  function onMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target && e.target.closest && e.target.closest("input, textarea, select, [contenteditable='true']")) return;
    burstHearts(e.clientX, e.clientY);
  }

  // Every 4–7s, a 55% chance of one bubble; skipped while the tab is hidden.
  function scheduleBubble() {
    bubbleTimer = window.setTimeout(function () {
      if (!running) return;
      if (!document.hidden && Math.random() < 0.55) burstBubble(mouse.x, mouse.y);
      scheduleBubble();
    }, 4000 + Math.random() * 3000);
  }

  function start() {
    if (running) return;
    running = true;
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, true);
    scheduleBubble();
  }

  function stop() {
    if (!running) return;
    running = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown, true);
    window.clearTimeout(bubbleTimer);
    document.querySelectorAll(".site-cursor-hearts, .site-cursor-bubbles").forEach(function (n) {
      n.remove();
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
