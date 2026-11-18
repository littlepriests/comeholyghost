import { initHomeBanner } from "./home/banner.js";
import { initHomeClouds } from "./home/clouds.js";
import { initHomePets } from "./home/pets.js";

// SPA nav re-runs this file on every return home. Window listeners must bind
// only on the first run; later runs just re-point the window.__site.* hooks they call.
// The footer dock itself (spacing, fit) is footer-dock.js, on every page.
const windowBound = !!(window.__site && window.__site.homeWindowBound);
if (window.__site) window.__site.homeWindowBound = true;

initHomeBanner();
initHomeClouds(windowBound);
initHomePets();
