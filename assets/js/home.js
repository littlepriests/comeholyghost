import { initHomeBanner } from "./home/banner.js";
import { initHomeClouds } from "./home/clouds.js";
import { initHomePets } from "./home/pets.js";

// SPA nav re-runs this file on every return home. Its window and document
// listeners use pageSignal() (lib/site.js), so each run's go away with the page.
// The footer dock itself (spacing, fit) is assets/js/layout.js, on every page.
initHomeBanner();
const placeDecor = initHomeClouds();
initHomePets({ placeDecor });
