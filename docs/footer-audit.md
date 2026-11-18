# Footer audit

Measured with Playwright at 1440×900 and 390×844 on `/`, `/blog/`, `/blog/crossroad-beauty/`, `/read-me/`, `/gallery/`, `/guestbook/`, and `/unsubscribe/`.

## Status after the footer-dock rework

Every page now uses one three-slot footer dock (`site-footer.html`, `footer-dock.css`, `footer-dock.js`), with only the slot contents differing. Grundo moved out of the player into the right slot on inner pages, the floating player is play-only on every page, and the per-page `back_to_top` ⌃ is gone. Measured after: the bar sits on the dock line (0px) and play is at the same x floating and parked on every page; the side slots mirror around the column center (±102px homepage, ±96px elsewhere); desktop band 159px homepage, 160px elsewhere.

- Resolved: 1 (copyright now renders on every page when set; extras stay homepage-only by design), 2, 4, 5, 6, 8, 11, 12, 16. 13 is down to `site-shell.css` (band), `footer-dock.css` (slots, Grundo), `dock.css` (homepage pets), and `subscribe.css` (yeti look).
- Still open: 3 (space above the footer), 7 (phone lead needs JS to center), 14 (homepage has its own shell template), 15 (short pages don't pin the footer).
- Resolved since: 9 (the subscribe word is always on, on every page).

The catalog below is the state before the rework.

## Already shared

- One partial, `layouts/partials/site-footer.html`, with `data-site-footer`, on every page.
- Same padding everywhere: 1.5rem top and bottom (`--footer-pad-top`, `--footer-pad-bottom`).
- Desktop: the lead (yeti or visitor counter) is centered in the column on every page (0px off).
- Park line: the bar, play, and ↑ bottoms land exactly on the footer line on every page and both sizes (0px).
- The player's horizontal position is identical on every page.
- Phone: the lead, bar, and ↑ form one row on every page (`placeFooterRow()`).

## Discrepancies

| # | What differs | Where |
| --- | --- | --- |
| 1 | Two variants with different contents. The homepage renders the dock and `[params.home.footer]` extras and skips `footer.html`, so it never gets the copyright or anything added to `footer.html`. Pages get the yeti and copyright, with no extras slot. | `site-footer.html` |
| 2 | Desktop band height: homepage 159px (set by the dock), pages 182px (a `min-height` built from magic numbers `100px + 0.15rem + 2rem`, copied from Grundo and the bar). Phones match (91px). | `site-shell.css`, `dock.css` |
| 3 | Space above the footer comes from three mechanisms. Pages use the shell `row-gap: 2rem` (32px) plus whatever bottom margin the last element in main leaks (articles and read-me 56px, guestbook 44px, blog index and gallery 32px). The homepage sets `row-gap: 0` and uses `.home-main { margin-bottom: 3rem }` (2rem on phones), plus the angel's margin. | `layout.css`, `home.css` |
| 4 | Homepage dock wrapper adds `margin-top: 0.75rem` on top of the shared footer padding. | `dock.css` |
| 5 | Park line has two code paths: the dock's bottom on the homepage, the footer's padding edge elsewhere. They agree today only because the dock has no bottom margin. | `place.js` `placeOnFooter()` |
| 6 | The lead is found by two hard-coded selectors (`[data-home-dock], .page-footer__skifree`), and the yeti gets a special-case nudge (`--footer-yeti-nudge`, `closest(".page-footer__skifree")`). No single "footer lead" hook. | `place.js`, `site-shell.css` |
| 7 | Phone: both leads are left-anchored in CSS (`justify-content: flex-start` on the dock, `align-self: flex-start` on the yeti) so JS can push them with `margin-left`. Without JS they sit flush left. | `dock.css`, `site-shell.css` |
| 8 | Desktop floating player: on articles (`section-blog kind-page`) only play shows while floating. Every other page, including read-me, shows the full bar and Grundo. Phones are play-only everywhere. | `player.css` |
| 9 | Yeti "subscribe" label: always visible on articles, hover/focus only elsewhere. On phones it moves above the yeti whatever `yetiIconPos` says. | `subscribe.css`, `site-shell.css` |
| 10 | Lead size differs by page and viewport: counter 45px (37px phone), yeti 64px (32px phone, CSS clears the sprite scale). | `dock.css`, `site-shell.css` |
| 11 | Yeti's own margin (`0.35rem 0 0.75rem`) is set in `subscribe.css` and then zeroed in `site-shell.css`. | `subscribe.css`, `site-shell.css` |
| 12 | Two class systems for one object: `site-footer--home` + `home-footer` vs `site-footer--page` + `page__footer`. `home-footer__*` pieces live in `dock.css` and `home.css`. | layouts, CSS |
| 13 | Footer styling spans seven files: `site-shell.css`, `dock.css`, `home.css`, `subscribe.css`, `chrome.css`, `player.css`, `place.js`. | — |
| 14 | The homepage has its own shell (`index.html`), so the footer partial is called from two templates with different arguments. | `index.html`, `baseof.html` |
| 15 | Short pages: the footer does not sit at the window bottom. Desktop `/unsubscribe/` ends 263px above it; phone `/` ends 54px above it. | `layout.css` |
| 16 | Pages render an empty `<p class="copyright">` hidden by `:empty`; the homepage renders none. `single.html` also emits an empty `<footer class="content__footer">` inside main. | `footer.html`, `single.html` |

## Open decisions

- Should the floating player and the yeti label behave the same on every page, or are articles intentionally quieter?
- Should the homepage keep its own lead (dock) inside the same footer object, with only the lead swapped?
- Should short pages pin the footer to the window bottom?
