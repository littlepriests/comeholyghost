import { initHomeBanner } from "./home/banner.js";
import { initHomeClouds } from "./home/clouds.js";
import { initHomeDock } from "./home/dock.js";
import { initHomePets } from "./home/pets.js";

// Same-site nav re-runs this file. The flag is read once so dock and clouds
// share the "listeners already bound" decision from the old single function.
const windowBound = !!window.__homeWindowBound;
window.__homeWindowBound = true;

initHomeDock(windowBound);
initHomeBanner();
initHomeClouds(windowBound);
initHomePets();
