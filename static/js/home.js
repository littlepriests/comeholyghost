(function () {
    var countKey = "pd-visitor-count";
    var seenKey = "pd-visitor-seen";
    var digits = document.querySelector("[data-visitor-count]");
    var pop = document.querySelector("[data-visitor-pop]");
    var starsHost = document.querySelector(".home-stars");

    if (digits) {
        var count = Number(localStorage.getItem(countKey) || "0");
        var isNew = !sessionStorage.getItem(seenKey);
        if (isNew) {
            count += 1;
            localStorage.setItem(countKey, String(count));
            sessionStorage.setItem(seenKey, "1");
        }
        digits.textContent = String(count || 0).padStart(6, "0");

        if (isNew) {
            digits.classList.remove("is-bump");
            void digits.offsetWidth;
            digits.classList.add("is-bump");
            if (count === 10 || count === 100 || count === 1000) {
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
    }

    if (starsHost && !starsHost.dataset.ready && document.body.classList.contains("home")) {
        starsHost.dataset.ready = "1";
        var total = 180;
        for (var i = 0; i < total; i++) {
            var star = document.createElement("span");
            var bright = Math.random() > 0.62;
            star.className = "home-stars__star" + (bright ? " is-bright" : "");
            star.style.left = (Math.random() * 100).toFixed(2) + "%";
            star.style.top = (Math.random() * 100).toFixed(2) + "%";
            star.style.setProperty("--star-size", (bright ? 2 + Math.random() * 2.6 : 1.1 + Math.random() * 1.9).toFixed(2) + "px");
            star.style.setProperty("--star-delay", (-Math.random() * 10).toFixed(2) + "s");
            star.style.setProperty("--star-duration", (bright ? 3.5 + Math.random() * 4 : 5 + Math.random() * 6).toFixed(2) + "s");
            star.style.setProperty("--star-opacity", (bright ? 0.75 + Math.random() * 0.25 : 0.4 + Math.random() * 0.45).toFixed(2));
            starsHost.appendChild(star);
        }
    }
})();
