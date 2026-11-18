/**
 * Hugo picks and preloads the banner; this only holds .is-pending until the
 * image decodes, so first paint and SPA returns home never show a half-drawn frame.
 */
export function initHomeBanner() {
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
}
