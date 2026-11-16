export function initHomeBanner() {
    // Banner URL is chosen in Hugo (shuffle + preload). Hold .is-pending until
    // decode so cold paint and SPA home returns do not flash an empty/half frame.
    function revealHomeBanner() {
        let bannerHost = document.querySelector(".home-banner");
        let bannerImg = document.querySelector("[data-home-banner]");
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
}
