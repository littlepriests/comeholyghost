(function () {
    var countKey = "pd-visitor-count";
    var seenKey = "pd-visitor-seen";
    var digits = document.querySelector("[data-visitor-count]");

    if (digits) {
        var count = Number(localStorage.getItem(countKey) || "0");
        if (!sessionStorage.getItem(seenKey)) {
            count += 1;
            localStorage.setItem(countKey, String(count));
            sessionStorage.setItem(seenKey, "1");
        }
        digits.textContent = String(count || 0).padStart(6, "0");
    }
})();
