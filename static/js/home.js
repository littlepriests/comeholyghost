(function () {
    // Scale the footer dock (pets + ticker) as one unit to the
    // available width so the row never wraps or spills horizontally.
    var dockFit = document.querySelector("[data-home-dock-fit]");
    var dock = document.querySelector("[data-home-dock]");
    var dockScale = 1;

    /* Equal padding on the counter pushes Sango and Kagura apart.
       Stop at the text column, or halfway from Kagura to the player. */
    function spaceDockPets() {
        var ticker = dock.querySelector(".ticker");
        var sango = dock.querySelector(".home-dock__pet--left");
        var kagura = dock.querySelector(".home-dock__pet--right");
        var column = document.querySelector(".home-main");
        var player = document.querySelector("#site-player");
        if (!ticker || !sango || !kagura || !column || !player) return;
        if (!window.matchMedia("(min-width: 45rem)").matches) {
            ticker.style.removeProperty("padding-left");
            ticker.style.removeProperty("padding-right");
            return;
        }
        var applied = dock.style.getPropertyValue("--home-dock-scale");
        dock.style.setProperty("--home-dock-scale", "1");
        ticker.style.paddingLeft = "0px";
        ticker.style.paddingRight = "0px";
        var sr = sango.getBoundingClientRect();
        var kr = kagura.getBoundingClientRect();
        var cr = column.getBoundingClientRect();
        var pr = player.getBoundingClientRect();
        var sangoRoom = sr.left - cr.left;
        var kaguraColumn = cr.right - kr.right;
        var kaguraHalf = (pr.left - kr.right) / 2;
        var room = Math.min(sangoRoom, kaguraColumn, kaguraHalf);
        /* Halfway back from the full spread toward the counter. */
        var pad = Math.max(0, Math.round(room / 2));
        ticker.style.paddingLeft = pad + "px";
        ticker.style.paddingRight = pad + "px";
        if (applied) dock.style.setProperty("--home-dock-scale", applied);
        else dock.style.removeProperty("--home-dock-scale");
    }

    function fitHomeDock() {
        if (!dockFit || !dock || !document.body.classList.contains("home")) return;
        spaceDockPets();
        // Dock is width:100% grid — measure the columns' content, not scrollWidth.
        var avail = dockFit.clientWidth;
        var cells = [
            dock.querySelector(".home-dock__pet--left"),
            dock.querySelector(".ticker"),
            dock.querySelector(".home-dock__pet--right")
        ].filter(function (el) {
            return el && el.offsetWidth > 0;
        });
        var gap = parseFloat(getComputedStyle(dock).columnGap) || 0;
        var need = gap * Math.max(0, cells.length - 1);
        cells.forEach(function (el) {
            if (el) need += el.offsetWidth;
        });
        var next = 1;
        if (avail > 0 && need > avail) {
            next = Math.max(0.55, (avail / need) * 0.98);
        }
        if (Math.abs(next - dockScale) <= 0.002) {
            dockFit.style.setProperty("--home-dock-h", dock.offsetHeight + "px");
            return;
        }
        dockScale = next;
        var token = next.toFixed(4);
        dock.style.setProperty("--home-dock-scale", token);
        dockFit.style.setProperty("--home-dock-scale", token);
        dockFit.style.setProperty("--home-dock-h", dock.offsetHeight + "px");
        window.dispatchEvent(new Event("resize"));
    }

    if (dockFit && dock) {
        fitHomeDock();
        window.addEventListener("resize", fitHomeDock);
        if (typeof ResizeObserver === "function") {
            new ResizeObserver(fitHomeDock).observe(dockFit);
        }
        window.addEventListener("load", fitHomeDock);
    }

    // Banner URL is chosen in Hugo (shuffle + preload). Hold .is-pending until
    // decode so cold paint and SPA home returns do not flash an empty/half frame.
    function revealHomeBanner() {
        var bannerHost = document.querySelector(".home-banner");
        var bannerImg = document.querySelector("[data-home-banner]");
        if (!bannerHost || !bannerImg) return;
        bannerHost.classList.add("is-pending");
        function reveal() {
            bannerHost.classList.remove("is-pending");
        }
        function afterReady() {
            if (typeof bannerImg.decode === "function") {
                bannerImg.decode().then(reveal).catch(reveal);
            } else {
                reveal();
            }
        }
        if (bannerImg.complete && bannerImg.naturalWidth) {
            afterReady();
        } else {
            bannerImg.addEventListener("load", afterReady, { once: true });
            bannerImg.addEventListener("error", reveal, { once: true });
        }
    }
    revealHomeBanner();
    window.revealHomeBanner = revealHomeBanner;

    var page = document.querySelector(".home-page");
    var root = document.querySelector(".home-root");

    function placeClouds() {
        if (!root || !page) return;
        var angel = document.querySelector(".ascii-angel");
        var footer = document.querySelector(".home-footer");
        var cloudsWrap = document.querySelector(".home-clouds");
        if (!angel || !footer) return;

        var rootBox = root.getBoundingClientRect();
        var ar = angel.getBoundingClientRect();
        var fr = footer.getBoundingClientRect();
        var hairY = fr.top;

        function setCloud(name, viewportX, viewportY, centerX, centerY) {
            var el =
                name === "nest"
                    ? document.querySelector(".ascii-cloud-nest")
                    : document.querySelector('.ascii-cloud[data-cloud="' + name + '"]');
            if (!el) return;
            var x = viewportX - rootBox.left;
            var y = viewportY - rootBox.top;
            var w = el.offsetWidth;
            var h = el.offsetHeight;
            if (centerX) x -= w / 2;
            if (centerY) y -= h / 2;
            // Keep the whole cloud above the hairline.
            var maxTop = hairY - rootBox.top - h - 6;
            if (y > maxTop) y = maxTop;
            el.style.left = x.toFixed(1) + "px";
            el.style.top = y.toFixed(1) + "px";
        }

        var halo = document.querySelector(".ascii-angel__halo");
        var wingR = document.querySelector(".ascii-angel__wing--right");
        var heart = document.querySelector('.ascii-cloud[data-cloud="heart"]');
        var heartHeading = null;
        page.querySelectorAll("h1").forEach(function (h) {
            var t = (h.textContent || "").replace(/\s+/g, "");
            if (t === "♡" || t === "#♡") heartHeading = h;
        });

        // Top cloud: above the cat over the halo↔right-wing pocket — no overlap.
        if (heart && halo && wingR) {
            var hr = halo.getBoundingClientRect();
            var wr = wingR.getBoundingClientRect();
            var haloCx = (hr.left + hr.right) / 2;
            var wingCx = (wr.left + wr.right) / 2;
            // Between halo and right wing, then ~8% further right.
            var zoneX = haloCx + (wingCx - haloCx) * 0.72 + ar.width * 0.08;
            var catClear = hr.top - 16;
            var textClear = heartHeading
                ? heartHeading.getBoundingClientRect().bottom + 8
                : catClear - 80;
            var avail = catClear - textClear;
            heart.style.fontSize = "";
            if (avail > 12) {
                var fs = parseFloat(window.getComputedStyle(heart).fontSize) || 4.5;
                var guard = 0;
                while (heart.offsetHeight > avail - 2 && fs > 3.2 && guard < 8) {
                    fs *= 0.92;
                    heart.style.fontSize = fs.toFixed(2) + "px";
                    guard += 1;
                }
            }
            var heartH = heart.offsetHeight || 56;
            var top = Math.max(textClear, catClear - heartH);
            if (top + heartH > catClear) top = catClear - heartH;
            setCloud("heart", zoneX, top, true, false);
        }

        // Two smaller clouds in the negative space right of # ♡.
        // gap-a left of the top heart cloud; gap-b peeks to its right (bg, no overlap).
        if (heartHeading) {
            var hb = heartHeading.getBoundingClientRect();
            var heartEl = document.querySelector('.ascii-cloud[data-cloud="heart"]');
            var heartBox = heartEl ? heartEl.getBoundingClientRect() : null;
            var pageBox = page.getBoundingClientRect();
            var gapY = hb.top + hb.height * 0.2;
            if (heartBox && heartBox.width > 0) {
                var leftGap = document.querySelector('.ascii-cloud[data-cloud="gap-a"]');
                var rightGap = document.querySelector('.ascii-cloud[data-cloud="gap-b"]');
                if (leftGap) {
                    setCloud("gap-a", heartBox.left - 14, gapY - 6, false, false);
                    leftGap.style.left =
                        (heartBox.left - 14 - rootBox.left - leftGap.offsetWidth).toFixed(1) +
                        "px";
                }
                if (rightGap) {
                    setCloud("gap-b", heartBox.right + 10, gapY + 10, false, false);
                }
            } else {
                var gapLeft = Math.max(hb.left + 72, pageBox.left + 100);
                var gapRight = pageBox.right - 24;
                var gapMid = gapLeft + (gapRight - gapLeft) * 0.4;
                setCloud("gap-a", gapMid, gapY, true, false);
                setCloud("gap-b", gapMid + (gapRight - gapLeft) * 0.32, gapY + 14, true, false);
            }
        }

        // Nest cloud just under the cat (guestbook sits inside on hover).
        var nestY = Math.min(ar.bottom + 10, hairY - 24);
        setCloud("nest", (ar.left + ar.right) / 2, nestY, true, true);

        var nestEl = document.querySelector(".ascii-cloud-nest");
        var nestBox = nestEl ? nestEl.getBoundingClientRect() : null;

        // Lower flanks — beside the nest; right stays in the background (no overlap).
        var flankY = nestBox
            ? (nestBox.top + nestBox.bottom) / 2
            : ar.bottom - ar.height * 0.16;
        var gap = 12;
        if (nestBox) {
            var leftEl = document.querySelector('.ascii-cloud[data-cloud="below"]');
            var rightEl = document.querySelector('.ascii-cloud[data-cloud="mid"]');
            if (leftEl) {
                setCloud("below", nestBox.left - gap, flankY, false, true);
                leftEl.style.left =
                    (nestBox.left - gap - rootBox.left - leftEl.offsetWidth).toFixed(1) + "px";
            }
            if (rightEl) {
                setCloud("mid", nestBox.right + gap, flankY + 4, false, true);
            }
        } else {
            setCloud("below", ar.left - 10, flankY, true, true);
            setCloud("mid", ar.right + 10, flankY + 4, false, true);
        }

        // Keep the guestbook CTA over the nest cloud when clouds are visible.
        // On narrow screens .home-clouds is display:none — clear inline coords so CSS can place it.
        var cta = angel.querySelector(".ascii-angel__cta");
        if (cta && nestEl) {
            var wrapCs = cloudsWrap ? window.getComputedStyle(cloudsWrap) : null;
            var nestCs = window.getComputedStyle(nestEl);
            var nr = nestEl.getBoundingClientRect();
            var wrapHidden =
                wrapCs &&
                (wrapCs.display === "none" || wrapCs.visibility === "hidden");
            var nestVisible =
                !wrapHidden &&
                nestCs.display !== "none" &&
                nestCs.visibility !== "hidden" &&
                nr.width > 1;
            if (!nestVisible) {
                cta.style.removeProperty("left");
                cta.style.removeProperty("top");
                cta.style.removeProperty("bottom");
                cta.style.removeProperty("transform");
                cta.style.removeProperty("min-width");
            } else {
                var ab = angel.getBoundingClientRect();
                cta.style.left = ((nr.left + nr.right) / 2 - ab.left).toFixed(1) + "px";
                cta.style.bottom = "auto";
                cta.style.top = (nr.top - ab.top + nr.height * 0.35).toFixed(1) + "px";
                cta.style.transform = "translate(-50%, 0)";
                cta.style.minWidth = Math.max(16, nr.width * 0.85).toFixed(1) + "px";
            }
        }

        if (cloudsWrap) cloudsWrap.classList.add("is-placed");
    }

    // Guestbook copy falls into the nest cloud on angel hover, then fades out on leave.
    (function bindAngelGuest() {
        var fig = document.querySelector(".ascii-angel");
        var nest = document.querySelector(".ascii-cloud-nest");
        if (!fig || !nest || !root || fig.dataset.guestBound) return;
        fig.dataset.guestBound = "1";
        var fadeTimer = 0;
        function on() {
            if (fadeTimer) {
                window.clearTimeout(fadeTimer);
                fadeTimer = 0;
            }
            nest.classList.remove("is-guest-out");
            nest.classList.add("is-guest");
            root.classList.add("is-angel-hover");
        }
        function off() {
            nest.classList.remove("is-guest");
            nest.classList.add("is-guest-out");
            root.classList.remove("is-angel-hover");
            fadeTimer = window.setTimeout(function () {
                nest.classList.remove("is-guest-out");
                fadeTimer = 0;
            }, 480);
        }
        fig.addEventListener("mouseenter", on);
        fig.addEventListener("mouseleave", off);
        fig.addEventListener("focusin", on);
        fig.addEventListener("focusout", function () {
            if (!fig.contains(document.activeElement)) off();
        });
    })();

    // Hide twinkling stars whose viewport point sits behind a cloud / moon box.
    function clearStarsBehindClouds() {
        var masks = document.querySelectorAll(
            ".ascii-cloud[data-cloud='heart'], .ascii-cloud[data-cloud='nest'], .ascii-cloud-nest, .ascii-moon"
        );
        var stars = document.querySelectorAll(".home-stars__star, .home-stars__ascii-star");
        if (!masks.length || !stars.length) return;
        var pad = 8;
        var rects = [];
        for (var i = 0; i < masks.length; i++) {
            var cr = masks[i].getBoundingClientRect();
            if (cr.width < 1 || cr.height < 1) continue;
            if (cr.bottom < 0 || cr.top > window.innerHeight) continue;
            rects.push(cr);
        }
        for (var s = 0; s < stars.length; s++) {
            var star = stars[s];
            var sr = star.getBoundingClientRect();
            var cx = (sr.left + sr.right) / 2;
            var cy = (sr.top + sr.bottom) / 2;
            var hit = false;
            for (var r = 0; r < rects.length; r++) {
                var box = rects[r];
                if (
                    cx >= box.left - pad &&
                    cx <= box.right + pad &&
                    cy >= box.top - pad &&
                    cy <= box.bottom + pad
                ) {
                    hit = true;
                    break;
                }
            }
            if (hit) star.classList.add("is-cloud-void");
            else star.classList.remove("is-cloud-void");
        }
    }

    function placeDecor() {
        placeClouds();
        clearStarsBehindClouds();
    }
    window.placeHomeDecor = placeDecor;
    placeDecor();
    window.addEventListener("resize", placeDecor);
    window.addEventListener("load", placeDecor);
    window.addEventListener("scroll", clearStarsBehindClouds, { passive: true });
})();

(function () {
    var apiUrl = "/api/visitors";
    var countKey = "pd-visitor-count";
    var seenKey = "pd-visitor-seen";
    var digits = document.querySelector("[data-visitor-count]");
    var pop = document.querySelector("[data-visitor-pop]");
    var ticker = document.querySelector("[data-visitor-ticker]");
    var dock = document.querySelector("[data-home-dock]");
    var park = document.querySelector('[data-dock-pet="right"]');
    var kagura = document.querySelector("[data-visitor-kagura]");
    var sango = document.querySelector("[data-dock-sango]");
    var boomerang = document.querySelector("[data-dock-boomerang]");
    var leftPark = document.querySelector('[data-dock-pet="left"]');
    var kAttackStrip = kagura && kagura.querySelector(".dock-kagura__strip--attack");
    var kWalkStrip = kagura && kagura.querySelector(".dock-kagura__strip--walk");
    var kDownStrip = kagura && kagura.querySelector(".dock-kagura__strip--down");
    var sIdleStrip = sango && sango.querySelector(".dock-sango__strip--idle");
    var sAttackStrip = sango && sango.querySelector(".dock-sango__strip--attack");

    if (!digits) return;

    var count = Number(localStorage.getItem(countKey) || "0");
    // ?replay-pets=1 forces the first-visit slash (and clears the session flag without
    // racing pagehide handlers that would immediately re-mark the visit).
    try {
        if (new URLSearchParams(location.search).has("replay-pets")) {
            sessionStorage.removeItem(seenKey);
        }
    } catch (error) {}
    var isNew = !sessionStorage.getItem(seenKey);
    var pending = isNew;
    var finishing = false;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var slashMs = 2600;
    var bumpAt = 0.38;
    var sangoBusy = false;
    var kaguraRecoverTimer = 0;
    var boomTimer = 0;

    function paintCount() {
        // Min 2 digits (04); grow only as the real tally needs more places.
        var n = Math.max(0, Math.floor(Number(count) || 0));
        var raw = String(n);
        digits.textContent = raw.padStart(Math.max(2, raw.length), "0");
        try {
            localStorage.setItem(countKey, String(n));
        } catch (error) {}
        // Refit dock if digit width changed (fitHomeDock lives in the home IIFE).
        window.dispatchEvent(new Event("resize"));
    }

    function applyCount(next, withFx) {
        count = Math.max(0, Math.floor(Number(next) || 0));
        paintCount();
        if (withFx) showBumpFx(count);
    }

    // Global tally via Netlify Blobs (/api/visitors). Plain hugo server has no
    // functions, so GET/POST fall back to the cached localStorage number.
    // Deploy preview / branch: skip the function entirely (local tally only).
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
                var next = Number(data && data.count);
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
                var next = Number(data && data.count);
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
        var el = strip.querySelector(".sprite-anim");
        if (!el) return;
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.removeProperty("animation");
    }

    function stripDurationMs(strip, iterations) {
        if (!strip) return 800;
        var el = strip.querySelector(".sprite-anim");
        if (!el) return 800;
        var frames = Number(getComputedStyle(el).getPropertyValue("--sprite-frames")) || 1;
        var fps = Number(getComputedStyle(el).getPropertyValue("--sprite-fps")) || 8;
        return Math.round((frames / fps) * 1000 * (iterations || 1));
    }

    function measureTravel() {
        if (!dock || !kagura || !park || !ticker) {
            return { startX: -72, endX: 220, midX: 80 };
        }
        var dockBox = dock.getBoundingClientRect();
        var tickerBox = ticker.getBoundingClientRect();
        var parkBox = park.getBoundingClientRect();
        // Start over Sango so the wind sweep reads as hitting her, then the ticker.
        var startX = leftPark
            ? leftPark.getBoundingClientRect().left - dockBox.left + 8
            : tickerBox.left - dockBox.left - 72;
        var endX = parkBox.left - dockBox.left + (parkBox.width - kagura.offsetWidth) / 2;
        var midX = tickerBox.left - dockBox.left + tickerBox.width * 0.35;
        return { startX: startX, endX: Math.max(endX, midX + 40), midX: midX };
    }

    function boomXFor(el) {
        if (!dock || !boomerang || !el) return 0;
        var dockBox = dock.getBoundingClientRect();
        var box = el.getBoundingClientRect();
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
        if (typeof window.placeHomeDecor === "function") {
            requestAnimationFrame(function () {
                window.placeHomeDecor();
            });
        }
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

        var attackMs = stripDurationMs(sAttackStrip, 1);
        var throwAt = Math.round(attackMs * 0.28);
        var returnMs = 650;

        // Throw strip ends before the boomerang returns — park on idle pose so she
        // doesn't freeze on a blank cell after the one-shot attack animation.
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
            var fromX = boomXFor(sango);
            var toX = boomXFor(kagura);
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

        // Fallback idle if boomerang markup is missing.
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
        if (reduceMotion || !kagura || !dock || !park) {
            commitBump(true);
            if (!reduceMotion) parkKaguraIdle();
            return;
        }
        finishing = true;
        pending = false;
        try {
            sessionStorage.setItem(seenKey, "1");
        } catch (error) {}

        var bumped = false;
        var travel = measureTravel();

        if (kagura.parentElement !== dock) dock.appendChild(kagura);
        kagura.classList.remove("is-idle", "is-down");
        kagura.classList.add("is-traveling");
        setKaguraStrip("attack");
        restartStripAnim(kAttackStrip);
        // Paint the start pose, then enable an explicit transform transition so the
        // wind slash actually sweeps across Sango/ticker instead of jumping to park.
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
                    // Keep the wind-attack strip until she parks, then swap to walk.
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

    function onSameSiteNav(event) {
        if (!pending) return;
        var link = event.target.closest && event.target.closest("a");
        if (!link || !link.href) return;
        if (link.target && link.target !== "_self") return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        var url;
        try {
            url = new URL(link.href, location.href);
        } catch (error) {
            return;
        }
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
        onLeave();
    }

    var observer = null;
    var armed = false;

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

    // Returning visitors in this session: she's already settled beside the player.
    if (!pending) {
        if (!reduceMotion) parkKaguraIdle();
        return;
    }

    window.addEventListener("pagehide", onLeave);
    document.addEventListener("click", onSameSiteNav, true);

    if (!ticker || typeof IntersectionObserver !== "function") {
        triggerOnce();
        return;
    }

    var wasHidden = false;
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
        { threshold: 0.55, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(ticker);
})();
