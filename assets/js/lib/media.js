import * as params from "@params";

/** A MediaQueryList for a name defined in assets/css/media.css ("mobile", "desktop", …). */
export function mq(name) {
    const query = params.media && params.media[name];
    if (!query) throw new Error("media: no query named " + name + " in assets/css/media.css");
    return window.matchMedia(query);
}

export function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
