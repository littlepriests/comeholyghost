import { initHomeBanner } from "./home/banner.js";
import { initHomeClouds } from "./home/clouds.js";
import { initHomeDock } from "./home/dock.js";
import { initHomePets } from "./home/pets.js";

// SPA nav re-runs this file on every return home. Window listeners must bind
// only on the first run; later runs just re-point the window.* hooks they call.
const windowBound = !!window.__homeWindowBound;
window.__homeWindowBound = true;

initHomeDock(windowBound);
initHomeBanner();
initHomeClouds(windowBound);
initHomePets();
