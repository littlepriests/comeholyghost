/**
 * How the site's scripts talk to each other. Every message is a plain event
 * on document, so separately bundled scripts share it without globals.
 *
 *   site:page      SPA nav put a new #page-root in place (player/nav.js).
 *   site:relayout  Something changed size; layout.js re-measures right away.
 *   site:layout    layout.js finished a pass; page decor re-places itself.
 *
 * Scripts inside #page-root run again on every SPA swap. Their window and
 * document listeners take { signal: pageSignal() }, so they are removed with
 * the page instead of piling up.
 */
export const PAGE = "site:page";
export const RELAYOUT = "site:relayout";
export const LAYOUT = "site:layout";

export function emit(name) {
    document.dispatchEvent(new Event(name));
}

export function on(name, handler, options) {
    document.addEventListener(name, handler, options);
}

export function requestLayout() {
    emit(RELAYOUT);
}

/** Aborted when SPA nav replaces #page-root. site-context.js creates the first one. */
export function pageSignal() {
    return window.__site.page.signal;
}
