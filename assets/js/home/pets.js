import { mq } from "../lib/media.js";
import { pageSignal, requestLayout } from "../lib/site.js";

/** Visitor counter and the dock pets. placeDecor re-places the homepage clouds (home/clouds.js). */
export function initHomePets({ placeDecor }) {
    let apiUrl = "/api/visitors";
    let countKey = "pd-visitor-count";
    let seenKey = "pd-visitor-seen";
    let digits = document.querySelector("[data-visitor-count]");
    let pop = document.querySelector("[data-visitor-pop]");
    let ticker = document.querySelector("[data-visitor-ticker]");
    let dock = document.querySelector("[data-footer-dock]");
    let park = document.querySelector('[data-dock-pad="kagura"]');
    let kagura = document.querySelector("[data-visitor-kagura]");
    let sango = document.querySelector("[data-dock-sango]");
    let boomerang = document.querySelector("[data-dock-boomerang]");
    let leftPark = document.querySelector('[data-dock-pad="sango"]');
    let kAttackStrip = kagura && kagura.querySelector(".dock-kagura__strip--attack");
    let kWalkStrip = kagura && kagura.querySelector(".dock-kagura__strip--walk");
    let kDownStrip = kagura && kagura.querySelector(".dock-kagura__strip--down");
    let sIdleStrip = sango && sango.querySelector(".dock-sango__strip--idle");
    let sAttackStrip = sango && sango.querySelector(".dock-sango__strip--attack");

    if (!digits) return;

    let count = Number(localStorage.getItem(countKey) || "0");
    // ?replay-pets=1 forces the first-visit slash (and clears the session flag without
    // racing pagehide handlers that would immediately re-mark the visit).
    try {
        if (new URLSearchParams(location.search).has("replay-pets")) {
            sessionStorage.removeItem(seenKey);
        }
    } catch (error) {}
    let isNew = !sessionStorage.getItem(seenKey);
    let pending = isNew;
    let finishing = false;
    let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let slashMs = 2600;
    let bumpAt = 0.38;
    let sangoBusy = false;
    let kaguraRecoverTimer = 0;
    let boomTimer = 0;

    function paintCount() {
        // Min 2 digits (04); grow only as the real tally needs more places.
        let n = Math.max(0, Math.floor(Number(count) || 0));
        let raw = String(n);
        digits.textContent = raw.padStart(Math.max(2, raw.length), "0");
        try {
            localStorage.setItem(countKey, String(n));
        } catch (error) {}
        // An extra digit widens the ticker; layout.js refits the row.
        requestLayout();
    }

    function applyCount(next, withFx) {
        count = Math.max(0, Math.floor(Number(next) || 0));
        paintCount();
        if (withFx) showBumpFx(count);
    }

    // Without functions (plain hugo server) or on a deploy preview, the count
    // falls back to the number cached in localStorage.
    function skipMetered() {
        return typeof window.siteSkipMeteredApi === "function" && window.siteSkipMeteredApi();
    }

    function loadRemoteCount() {
        if (skipMetered()) return;
        fetch(apiUrl, { headers: { Accept: "application/json" } })
            .then(function (response) {
                if (!response.ok) throw new Error("visitor GET failed");
                return response.json();
            })
            .then(function (data) {
                let next = Number(data && data.count);
                if (!Number.isFinite(next) || next < 0) return;
                if (finishing) return;
                count = Math.floor(next);
                paintCount();
            })
            .catch(function () {});
    }

    function bumpRemote(withFx, done) {
        if (skipMetered()) {
            applyCount(count + 1, withFx);
            if (done) done();
            return;
        }
        fetch(apiUrl, {
            method: "POST",
            headers: { Accept: "application/json" }
        })
            .then(function (response) {
                if (!response.ok) throw new Error("visitor POST failed");
                return response.json();
            })
            .then(function (data) {
                let next = Number(data && data.count);
                if (!Number.isFinite(next) || next < 0) throw new Error("bad count");
                applyCount(next, withFx);
                if (done) done();
            })
            .catch(function () {
                applyCount(count + 1, withFx);
                if (done) done();
            });
    }

    paintCount();
    loadRemoteCount();

    function showBumpFx(next) {
        digits.classList.remove("is-bump", "is-milestone");
        void digits.offsetWidth;
        digits.classList.add("is-bump");
        if (next === 10 || next === 100 || next === 1000) {
            digits.classList.add("is-milestone");
        }
        if (pop) {
            pop.hidden = false;
            pop.classList.remove("is-show");
            void pop.offsetWidth;
            pop.classList.add("is-show");
            window.setTimeout(function () {
                pop.classList.remove("is-show");
                pop.hidden = true;
            }, 1200);
        }
        window.setTimeout(function () {
            digits.classList.remove("is-bump", "is-milestone");
        }, 900);
    }

    function setKaguraStrip(mode) {
        if (kAttackStrip) kAttackStrip.classList.toggle("is-active", mode === "attack");
        if (kWalkStrip) kWalkStrip.classList.toggle("is-active", mode === "walk");
        if (kDownStrip) kDownStrip.classList.toggle("is-active", mode === "down");
    }

    function setSangoStrip(mode) {
        if (sIdleStrip) sIdleStrip.classList.toggle("is-active", mode === "idle");
        if (sAttackStrip) sAttackStrip.classList.toggle("is-active", mode === "attack");
    }

    function restartStripAnim(strip) {
        if (!strip) return;
        let el = strip.querySelector(".sprite-anim");
        if (!el) return;
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.removeProperty("animation");
    }

    function stripDurationMs(strip, iterations) {
        if (!strip) return 800;
        let el = strip.querySelector(".sprite-anim");
        if (!el) return 800;
        let frames = Number(getComputedStyle(el).getPropertyValue("--sprite-frames")) || 1;
        let fps = Number(getComputedStyle(el).getPropertyValue("--sprite-fps")) || 8;
        return Math.round((frames / fps) * 1000 * (iterations || 1));
    }

    function measureTravel() {
        if (!dock || !kagura || !park || !ticker) {
            return { startX: -72, endX: 220, midX: 80 };
        }
        let dockBox = dock.getBoundingClientRect();
        let tickerBox = ticker.getBoundingClientRect();
        let parkBox = park.getBoundingClientRect();
        // Start over Sango so the wind sweep reads as hitting her, then the ticker.
        let startX = leftPark
            ? leftPark.getBoundingClientRect().left - dockBox.left + 8
            : tickerBox.left - dockBox.left - 72;
        let endX = parkBox.left - dockBox.left + (parkBox.width - kagura.offsetWidth) / 2;
        let midX = tickerBox.left - dockBox.left + tickerBox.width * 0.35;
        return { startX: startX, endX: Math.max(endX, midX + 40), midX: midX };
    }

    function boomXFor(el) {
        if (!dock || !boomerang || !el) return 0;
        let dockBox = dock.getBoundingClientRect();
        let box = el.getBoundingClientRect();
        return box.left - dockBox.left + (box.width - boomerang.offsetWidth) / 2;
    }

    function hideBoomerang() {
        if (!boomerang) return;
        window.clearTimeout(boomTimer);
        boomerang.classList.remove("is-flying", "is-returning");
        boomerang.style.removeProperty("transform");
        boomerang.style.removeProperty("transition");
    }

    function parkKaguraIdle() {
        if (!kagura || !park) return;
        window.clearTimeout(kaguraRecoverTimer);
        kagura.classList.remove("is-attacking", "is-traveling", "is-down");
        kagura.style.removeProperty("transform");
        kagura.style.removeProperty("transition");
        setKaguraStrip("walk");
        park.appendChild(kagura);
        kagura.classList.add("is-idle");
        requestAnimationFrame(placeDecor);
    }

    function setSangoIdle() {
        if (!sango) return;
        sango.classList.remove("is-attacking", "is-busy");
        sango.classList.add("is-idle");
        setSangoStrip("idle");
        sangoBusy = false;
    }

    function knockKaguraDown() {
        if (!kagura || reduceMotion) return;
        if (!kagura.classList.contains("is-idle") && !kagura.classList.contains("is-down")) return;
        window.clearTimeout(kaguraRecoverTimer);
        kagura.classList.remove("is-idle", "is-attacking", "is-traveling");
        kagura.classList.add("is-down");
        setKaguraStrip("down");
        restartStripAnim(kDownStrip);
        kaguraRecoverTimer = window.setTimeout(function () {
            if (!kagura) return;
            kagura.classList.remove("is-down");
            setKaguraStrip("walk");
            kagura.classList.add("is-idle");
        }, stripDurationMs(kDownStrip, 1) + 280);
    }

    function playSangoAttack() {
        if (!sango || reduceMotion || sangoBusy) return;
        if (!kagura || (!kagura.classList.contains("is-idle") && !kagura.classList.contains("is-down"))) return;

        sangoBusy = true;
        sango.classList.add("is-busy");
        sango.classList.remove("is-idle");
        sango.classList.add("is-attacking");
        setSangoStrip("attack");
        restartStripAnim(sAttackStrip);

        let attackMs = stripDurationMs(sAttackStrip, 1);
        let throwAt = Math.round(attackMs * 0.28);
        let returnMs = 650;

        // The one-shot attack strip ends on a blank cell, before the boomerang returns.
        window.setTimeout(function () {
            if (!sangoBusy) return;
            sango.classList.remove("is-attacking");
            setSangoStrip("idle");
        }, attackMs);

        window.clearTimeout(boomTimer);
        boomTimer = window.setTimeout(function () {
            if (!boomerang || !dock || !kagura) {
                knockKaguraDown();
                setSangoIdle();
                return;
            }
            if (boomerang.parentElement !== dock) dock.appendChild(boomerang);
            let fromX = boomXFor(sango);
            let toX = boomXFor(kagura);
            boomerang.classList.remove("is-returning");
            boomerang.style.transition = "none";
            boomerang.style.transform = "translateX(" + fromX + "px)";
            void boomerang.offsetWidth;
            boomerang.classList.add("is-flying");
            requestAnimationFrame(function () {
                boomerang.style.removeProperty("transition");
                boomerang.style.transform = "translateX(" + toX + "px)";
            });

            boomTimer = window.setTimeout(function () {
                knockKaguraDown();
                boomerang.classList.remove("is-flying");
                boomerang.classList.add("is-returning");
                void boomerang.offsetWidth;
                boomerang.style.transform = "translateX(" + fromX + "px)";
                boomTimer = window.setTimeout(function () {
                    hideBoomerang();
                    setSangoIdle();
                }, returnMs);
            }, 700);
        }, throwAt);

        if (!boomerang) {
            window.setTimeout(knockKaguraDown, Math.round(attackMs * 0.45));
            window.setTimeout(setSangoIdle, attackMs + 40);
        }
    }

    function commitBump(withFx) {
        if (!pending || finishing) return;
        finishing = true;
        pending = false;
        try {
            sessionStorage.setItem(seenKey, "1");
        } catch (error) {}
        bumpRemote(withFx, cleanup);
    }

    function playAttackThenBump() {
        if (!pending || finishing) return;
        let narrow = mq("mobile").matches;
        if (reduceMotion || narrow || !kagura || !dock || !park) {
            commitBump(true);
            if (!reduceMotion && !narrow) parkKaguraIdle();
            return;
        }
        finishing = true;
        pending = false;
        try {
            sessionStorage.setItem(seenKey, "1");
        } catch (error) {}

        let bumped = false;
        let travel = measureTravel();

        if (kagura.parentElement !== dock) dock.appendChild(kagura);
        kagura.classList.remove("is-idle", "is-down");
        kagura.classList.add("is-traveling");
        setKaguraStrip("attack");
        restartStripAnim(kAttackStrip);
        // Commit the start position with transitions off, then animate on the
        // second frame; otherwise the browser merges both and she jumps to park.
        kagura.style.transition = "none";
        kagura.style.transform = "translateX(" + travel.startX + "px)";
        void kagura.offsetWidth;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                kagura.classList.add("is-attacking");
                kagura.style.transition =
                    "transform " + slashMs / 1000 + "s cubic-bezier(0.33, 0.12, 0.2, 1)";
                kagura.style.transform = "translateX(" + travel.endX + "px)";
                ticker && ticker.classList.add("is-attacking");

                window.setTimeout(function () {
                    if (bumped) return;
                    bumped = true;
                    bumpRemote(true);
                }, slashMs * bumpAt);

                window.setTimeout(function () {
                    ticker && ticker.classList.remove("is-attacking");
                    parkKaguraIdle();
                    cleanup();
                }, slashMs);
            });
        });
    }

    function onLeave() {
        if (!pending) return;
        commitBump(false);
    }

    // An SPA swap never fires pagehide, so commit the bump on the link click
    // itself, in the capture phase before player.js handles it.
    function onSameSiteNav(event) {
        if (!pending) return;
        let link = event.target.closest && event.target.closest("a");
        if (!link || !link.href) return;
        if (link.target && link.target !== "_self") return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        let url;
        try {
            url = new URL(link.href, location.href);
        } catch (error) {
            return;
        }
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
        onLeave();
    }

    let observer = null;
    let armed = false;

    function cleanup() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        window.removeEventListener("pagehide", onLeave);
        document.removeEventListener("click", onSameSiteNav, true);
    }

    function triggerOnce() {
        if (!pending || finishing || armed) return;
        armed = true;
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        playAttackThenBump();
    }

    if (sango && !reduceMotion) {
        setSangoIdle();
        sango.addEventListener("click", function (event) {
            event.preventDefault();
            playSangoAttack();
        });
    }

    if (!pending) {
        if (!reduceMotion) parkKaguraIdle();
        return;
    }

    let signal = pageSignal();
    window.addEventListener("pagehide", onLeave, { signal: signal });
    document.addEventListener("click", onSameSiteNav, { capture: true, signal: signal });

    if (!ticker || typeof IntersectionObserver !== "function") {
        triggerOnce();
        return;
    }

    let wasHidden = false;
    observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    wasHidden = true;
                    return;
                }
                if (wasHidden) {
                    triggerOnce();
                    return;
                }
                wasHidden = true;
                window.setTimeout(triggerOnce, 1000);
            });
        },
        // No bottom rootMargin: the ticker sits on the page's last line, so any
        // inset can keep it from ever reaching the threshold at full scroll.
        { threshold: 0.55 }
    );
    observer.observe(ticker);
}
