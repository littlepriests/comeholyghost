/* cursor-effects v1.0.18 (MIT, tholman/cursor-effects) — star trail
   (same motion as bubbleCursor; particles draw ✦ instead of arcs). */
function h(t) {
  let e,
    n,
    i,
    o = t && t.element,
    s = o || document.body,
    h = window.innerWidth,
    c = window.innerHeight,
    l = { x: h / 2, y: h / 2 },
    a = [],
    r = (t && t.colors) || ["#d4b85c", "#e6d48a", "#c9a84a", "#f0e6b8"],
    skip = 0;
  const d = window.matchMedia("(prefers-reduced-motion: reduce)");
  function u() {
    if (d.matches)
      return (
        console.log(
          "This browser has prefers reduced motion turned on, so the cursor did not init"
        ),
        !1
      );
    (e = document.createElement("canvas")),
      (n = e.getContext("2d")),
      (e.style.top = "0px"),
      (e.style.left = "0px"),
      (e.style.pointerEvents = "none"),
      /* Above .home-root (z:1) / player (z:30); below tips / hearts. */
      (e.style.zIndex = "40"),
      o
        ? ((e.style.position = "absolute"),
          s.appendChild(e),
          (e.width = s.clientWidth),
          (e.height = s.clientHeight))
        : ((e.style.position = "fixed"),
          document.body.appendChild(e),
          (e.width = h),
          (e.height = c)),
      s.addEventListener("mousemove", g),
      s.addEventListener("touchmove", m, { passive: !0 }),
      s.addEventListener("touchstart", m, { passive: !0 }),
      window.addEventListener("resize", A),
      p();
  }
  function A() {
    (h = window.innerWidth),
      (c = window.innerHeight),
      o
        ? ((e.width = s.clientWidth), (e.height = s.clientHeight))
        : ((e.width = h), (e.height = c));
  }
  function m(t) {
    if (t.touches.length > 0)
      for (let e = 0; e < t.touches.length; e++)
        f(
          t.touches[e].clientX,
          t.touches[e].clientY,
          r[Math.floor(Math.random() * r.length)]
        );
  }
  function g(t) {
    if (o) {
      const e = s.getBoundingClientRect();
      (l.x = t.clientX - e.left), (l.y = t.clientY - e.top);
    } else (l.x = t.clientX), (l.y = t.clientY);
    /* Spawn every other move — between dense and sparse. */
    skip = (skip + 1) % 2;
    if (skip !== 0) return;
    f(l.x, l.y);
  }
  function f(t, e, n) {
    if (a.length > 40) return;
    a.push(new v(t, e, n));
  }
  function p() {
    !(function () {
      if (0 != a.length) {
        n.clearRect(0, 0, h, c);
        for (let t = 0; t < a.length; t++) a[t].update(n);
        for (let t = a.length - 1; t >= 0; t--)
          a[t].lifeSpan < 0 && a.splice(t, 1);
        0 == a.length && n.clearRect(0, 0, h, c);
      }
    })(),
      (i = requestAnimationFrame(p));
  }
  function y() {
    e.remove(),
      cancelAnimationFrame(i),
      s.removeEventListener("mousemove", g),
      s.removeEventListener("touchmove", m),
      s.removeEventListener("touchstart", m),
      window.removeEventListener("resize", A);
  }
  function v(t, e, color) {
    const i = Math.floor(44 * Math.random() + 46);
    (this.initialLifeSpan = i),
      (this.lifeSpan = i),
      (this.velocity = {
        x: (Math.random() < 0.5 ? -1 : 1) * (Math.random() / 14),
        y: -0.5 * Math.random() - 0.28,
      }),
      (this.position = { x: t, y: e }),
      (this.color = color || r[Math.floor(Math.random() * r.length)]),
      (this.baseDimension = 4.5 + Math.random() * 3.2),
      (this.rot = Math.random() * Math.PI),
      (this.spin = (Math.random() < 0.5 ? -1 : 1) * (0.014 + Math.random() * 0.022)),
      (this.update = function (t) {
        (this.position.x += this.velocity.x),
          (this.position.y += this.velocity.y),
          (this.velocity.x += (2 * (Math.random() < 0.5 ? -1 : 1)) / 95),
          (this.velocity.y -= Math.random() / 750),
          (this.rot += this.spin),
          this.lifeSpan--;
        const life = Math.max(0, this.lifeSpan / this.initialLifeSpan);
        const grow =
          0.4 + 0.5 * ((this.initialLifeSpan - this.lifeSpan) / this.initialLifeSpan);
        const size = this.baseDimension * grow;
        t.save();
        t.globalAlpha = life * 0.85;
        t.fillStyle = this.color;
        t.translate(this.position.x, this.position.y);
        t.rotate(this.rot);
        /* 4-point sparkle ✦ — mid size between loud and tiny */
        t.beginPath();
        for (let i = 0; i < 8; i++) {
          const tip = i % 2 === 0 ? size : size * 0.36;
          const a = (i * Math.PI) / 4 - Math.PI / 2;
          const x = Math.cos(a) * tip;
          const y = Math.sin(a) * tip;
          if (i === 0) t.moveTo(x, y);
          else t.lineTo(x, y);
        }
        t.closePath();
        t.fill();
        t.restore();
      });
  }
  return (
    (d.onchange = () => {
      d.matches ? y() : u();
    }),
    u(),
    { destroy: y }
  );
}
export { h as bubbleCursor, h as starCursor };
