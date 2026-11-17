import { paintStarfield } from "./stars/field.js";
import { bindStarVoids } from "./stars/voids.js";

const starsHost = document.querySelector(".home-stars");
if (starsHost && !starsHost.dataset.ready) {
    starsHost.dataset.ready = "1";
    paintStarfield(starsHost);
    bindStarVoids(starsHost);
}
