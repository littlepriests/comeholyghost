# Site resources

Private notes for the site owner and agents. This file is not a Hugo page. Do not move it into `content/` or `static/`. Hugo publishes those folders. Visitors should not see this.

The dev server is `hugo server -D --disableFastRender --navigateToChanged` from the repo root, at http://localhost:1313/.

## Performance (local checklist)

What we tightened (keep the GeoCities vibe; don’t gut atmosphere):

- **Images:** the file you drop in the post folder, or in `assets/images/nongrid/`, stays in git and is not published. `layouts/partials/image-set.html` builds every published copy (AVIF, then WebP). Page slots are 480/1200 (photo and writing card), 480/800 (grid), 800/1280 (figcaption and markdown), and a 480 square (gallery). Click-to-expand is 1600. A commit refuses a source over 2000px or 1.5MB. `corn compress` is an optional resize, not the quality setting. See `docs/posting.md`.
- **Fonts / icons:** self-hosted WOFF2 only — Fira Mono, Montserrat variable (articles), DotMatrixNarrow (homepage title line 2). Every `@font-face` lives in `assets/css/fonts.css`; files under `static/fonts/`. Site vs article faces via `[params.fonts]` (see **Fonts** below). No Google Fonts / Font Awesome / Academicons CDN. Icons via `layouts/partials/icon.html`.
- **CSS / JS scope:** all site CSS lives in `assets/css/` and all site JS in `assets/js/`, minified and fingerprinted, so Netlify caches `/css/*` and `/js/*` for a year. See **Stylesheets** and **Scripts** below.
- **Atmosphere JS:** gold star cursor trail self-hosted (`assets/js/vendor/cursor-effects.esm.js` v1.0.18 motion), homepage + desktop only. Background stars: fewer on phone / `prefers-reduced-motion`; no scroll voiding on narrow viewports.
- **npm:** project `.npmrc` → `registry.npmjs.org` only. Before any zip, confirm lockfile `resolved` URLs are all `registry.npmjs.org` (no private registry hosts).

Quick check: cold Network on `/`, `/blog/`, `/blog/crossroad-beauty/` — no cdnjs/fonts.googleapis/unpkg `@latest`; post photos arrive as AVIF (WebP if the browser skips it), sized to the slot.

## Design direction

Old-school GeoCities personal homepage energy with modern restraint: playful atmosphere (stars, visitor counter personality, music player, guestbook, corner art, framed pictures, sprite pets), clear readable layout, palette-driven color. Not CRT scanlines, not film-grain “cinematic” overlays, not chaotic 1999 clutter. Custom fun cursor is planned by the owner later — leave `[params.cursor]` alone unless they ask.

## Backlog (do not start unless asked)

Owner notes, 2026-11-09. Capture only — do not implement from this list without an explicit ask.

Done in-tree (pending zip/deploy): sitewide stars; blue stepped headings; relative nav links + pinned production `baseURL`; first-paint player hide; synced `comeholyghost-main(1)` visuals; bubble cursor; ASCII angel glow/CTA; read-me sword figure with fountain hearts; first-visit Kagura attack → idle walk parked right of the player + Sango left (hurt on slash, click-to-attack Kagura); Joan G. Stark moon in the homepage title row + sparse ASCII stars; emojicombos clouds; rotating `bannerDir`; configurable homepage title font.

Credits / provenance:
- Moon (`.ascii-moon`): “man in the moon” by **Joan G. Stark** (jgs / Spunk). Signature kept. Lives in `.home-title-row` beside “welcome to the FIELD” (above Misdreavus); scales with the viewport. Source: [ASCII Art Archive](https://www.asciiart.eu/art/5d424c2b42c2d3ac).
- Sparse background ASCII stars: motifs in Joan’s celestial / star style (same archive tradition); credit Joan G. Stark. Tiny repeats omit initials so the sky stays readable — full credit here.
- Clouds (`.ascii-cloud`): small version of the top cloud on [emojicombos.com/cloud-ascii-art](https://emojicombos.com/cloud-ascii-art). Placed around the ASCII angel (top over halo/wing, `# ♡` gap pair, lower flanks, smaller nest under the cat). Nest shows “sign the guestbook!” on angel hover; `home.js` voids twinkling stars behind cloud boxes.
- Kagura / Misdreavus / Sango / SkiFree strips: fan-use test assets; publishers own the art (see Sprite animations).

1. ~~**Mobile player chrome**~~ — Done. Under `44.99rem` the player is the same bar (`applyPlayerChrome()` in `player.js`). `[x]` hides it behind a ♡ without changing play/pause. Remote playlist fetch falls back to `/audio/playlist.json`.
1b. ~~**Mobile layout pass**~~ — Done. Owner OK on phone layout; remaining polish is orphan/widow avoidance (CSS `text-wrap` — see Typography).
2. ~~**Desktop player + sticky header**~~ — Dropped. Current footer player behavior is what the owner wants; do not reopen.
3. ~~**First-paint flicker (follow-up)**~~ — Done / no longer reproducing. SPA stylesheet wait, banner pending-until-decode, font preload, backdrop fade, `fonts-ready` gate. Banner still picks one image per homepage **render** from `bannerDir` (shuffle in Hugo — refresh or SPA re-enter home to see another); it is not a timed slideshow.
4. ~~**Domain primary in Netlify**~~ — Done (`cornfieldjournal.com` is primary).
5. ~~**Fun custom cursor (owner later)**~~ — Ghost kept; homepage star trail + click hearts + idle bubbles (`cursor-effects` / `site-cursor-fx.js`). Tweak/revert after you try it.
6. ~~**`site.webmanifest` polish (optional)**~~ — Skipping for now (unlikely anyone installs as an app).
7. ~~**Article images reserve no space.**~~ Done. `layouts/partials/responsive-img.html` sets the processed width and height and a smaller `srcset` for `photo`, `photo-grid`, `figcaption`, the writing-index thumb, and markdown images.
8. ~~**A newsletter paragraph that contains a link is inserted raw.**~~ Done. `markdownToEmailHtml` escapes the prose before it inserts links, so a `<` in that paragraph stays text.

## Sprite animations (test)

**Beginner how-to (make a strip from Spriters Resource, no prior experience):** [`docs/sprites.md`](sprites.md).

Horizontal strip sheets under `static/images/sprites/`, driven by CSS `steps()` in `assets/css/sprites.css`. Config is `[[params.sprites]]` in `hugo.toml` (`id`, `src`, `frameWidth`, `frameHeight`, `frames`, `fps`, `alt`, optional `scale`).

### Invoke in content

```
{{< sprite "kagura-walk" >}}
{{< sprite id="misdreavus" scale="3" >}}
```

`id` (or the first positional arg) must match a `[[params.sprites]]` entry. Unknown ids render a visible missing marker. Optional `scale` overrides that entry’s default. Shortcode: `layouts/shortcodes/sprite.html` → partial `layouts/partials/sprite.html`.

Home nav button: set `[params.home] logoSprite = "misdreavus"` (a sprite `id`). That replaces the green `[title] $` chip with the floating strip; clear `logoSprite` to get the chip back. Markup is `layouts/partials/header.html`. Footer pets (Sango / Kagura / boomerang on the homepage, the yeti and Grundo elsewhere) are partials in `layouts/partials/footer/`, placed in the footer dock by `layouts/partials/site-footer.html`, not the shortcode.

### Add or refresh a strip

1. Drop the source sheet where the slicer expects it (see scripts).
2. Run the matching slicer; it writes frames under `static/images/sprites/`.
3. Register or update `[[params.sprites]]` in `hugo.toml` with the real `frameWidth` / `frameHeight` / `frames` / `fps`.
4. Use `{{< sprite "that-id" >}}` in markdown, or point `logoSprite` / dock markup at the id.

Refresh strips from source sheets (fan-use test assets; Nintendo / game publishers own the art):

- Misdreavus: `node scripts/slice-misdreavus.mjs` (needs `misdreavus-sheet.png`; front hover loop only, no shiny/back)
- Kagura rows: `node scripts/slice-kagura.mjs` (needs `kagura-sheet.png`; each row → `kagura-walk`, `kagura-down`, `kagura-attack`)
- Sango (TSR #13363 InuYasha: Fūun Emaki): `node scripts/slice-sango.mjs` → `sango-idle`, `sango-boomerang` (flying Hiraikotsu spin), `sango-attack`
- SkiFree (TSR #26926): `node scripts/slice-skifree.mjs` → `skifree-yeti` (original block only)
- Grundo (TSR #186604, LonelyMarowak): `node scripts/slice-grundo.mjs` → `grundo-idle`, `grundo-kick` (orange row; dock pet)

`pngjs` for the slicers lives under `scripts/node_modules` (`npm install pngjs --prefix scripts`).

## Deploy (Netlify)

Build settings live in `netlify.toml` at the repo root. Netlify runs Hugo `0.167.0`, publishes `public/`, and production builds with `--baseURL https://cornfieldjournal.com/` (previews still use `$DEPLOY_PRIME_URL`). Leave `baseURL` in `hugo.toml` as localhost for local work.

Nav and in-site list links should stay **relative** (`relURL` / `relLangURL` / `RelPermalink`) so a Netlify primary of `*.netlify.app` cannot send clicks off `cornfieldjournal.com`. Set the custom domain as **primary** in Domain management anyway. Keep `noindex = true` in `hugo.toml` until the site should be searchable.

## Atmosphere (stars)

Twinkling starfield is sitewide: `layouts/partials/stars.html` (outside `#page-root` so SPA nav keeps it), `assets/css/stars.css`, `assets/js/stars.js` (`stars/field.js` paints the field, `stars/voids.js` punches the reading hole). Linked from `head.html`. Homepage visitor ticker stays in `assets/js/home.js`. On non-home pages, `stars.js` punches one CSS mask hole in `.home-stars` over `.page__body` (title + prose + figures), so stars and their glows never sit behind article text. The starfield is fixed and the page scrolls under it, so the hole is redrawn on scroll and resize (once per frame). Header, footer, and gutters keep the sky. The homepage has no hole at any width. On phones (`mobile` in `assets/css/media.css`) the ASCII stars are not drawn. The hole is redrawn on every `site:page` (SPA swap) and `site:layout` (see Scripts).

## Read-me email CTA

The read-me sword figure (`sword_figure = true`) is the mailto link: clicking it opens `[params.about] email` from `hugo.toml`, with the `email` tip from `data/tips.yaml`. Address is public on purpose; keep secrets out of `content/` / `hugo.toml` if you ever need a private inbox. Hover label uses `.site-tip` / `data-tip` (see **Hover tips**).

## Read-me sword figure

`sword_figure = true` on read-me loads `layouts/partials/sword-figure.html` before the h1 (image from `[params.backdrop.bottom-right]`). Centered hero; ♡ fountain on hover (`assets/css/sword.css`). Not shown on the homepage.

## Aside meta (removed)

The right-hand aside (date / author / ToC) was removed so articles center in the column. The date shows on the writing-index card. `hide_date`, `toc`, and `author` front matter no longer render on the article page.

## Fonts (site vs blog articles)

Two faces, both set in `hugo.toml` — no Google Fonts / company CDNs:

```toml
[params.fonts]
site = "\"Fira Mono\", ui-monospace, monospace"
article = "\"Montserrat\", sans-serif"
```

| Token | Where it applies | How to change |
| --- | --- | --- |
| `--font-site` | Body / chrome (home, guestbook, gallery, writing index, asides) | `[params.fonts] site` |
| `--font-article` | `/blog/<slug>/` prose (`.content__header` + `.content__body`) | `[params.fonts] article` |

`head.html` writes the CSS variables; `assets/css/typography.css` applies `--font-site` on `body`. Blog posts also load `assets/css/article-reading.css` (linked from `layouts/_default/single.html` when `.Section == "blog"`). **Ad-hoc article readability fixes** (line-height, measure, heading weight, code face) go in `article-reading.css` — keep `typography.css` for sitewide rules. Articles change the face only, never the font size, so body text and headings match the homepage and read-me. `typography.css` sets `text-wrap: balance` on headings plus homepage title lines and writing-index titles, and `text-wrap: pretty` on paragraphs, lists, captions, quotes, index summaries, and the article aside — so a title or short line is less likely to end on one lone word (orphan/widow). Chromium supports this best; Safari/Firefox may still orphan. No `&nbsp;` rewrites in `content/`. Writing-index face stays on `.blog-index` in `assets/css/blog-index.css` (still site mono by default).

Self-host a new face: drop WOFF2 under `static/fonts/`, add its `@font-face` to `assets/css/fonts.css`, and put that family first in `site` or `article`.

## Stylesheets

One source of truth: `assets/css/`. Hugo concatenates, minifies, and fingerprints it, so there are no `?v=` bumps for CSS.

- **Sitewide bundle** (`css/site.<hash>.css`, built in `layouts/partials/head.html`): fonts, tokens, typography, layout, header, logo, chrome, site-shell, subscribe, stars, sprites, backdrop, sword, buttons, article-media. Order matters — later files win ties.
- **Homepage bundle** (`layouts/index.html`): `home.css`, `angel.css`, `dock.css`, `retro.css`.
- **Page sheets** via `{{ partial "css.html" "name" }}` (or a slice of names): `article-reading` (blog posts), `blog-index`, `gallery`, `guestbook`. Put that call inside the layout's `main` block so same-site navigation picks it up.
- **Player:** `assets/css/player.css` stays its own file, linked right after the bundle in `head.html` via `css.html`, so it wins ties with the bundle.
- Colors: `assets/css/tokens.css` holds the raw base16 hex values and the jobs (`--bg`, `--fg`, `--link`, …) — edit there.
- **Breakpoints:** `assets/css/media.css` names every media query once (`@custom-media --mobile …;`, `--desktop`, `--no-clouds`). Sheets write `@media (--mobile) { … }`; `layouts/partials/css-resource.html` swaps in the query as each sheet is built and fails the build on an undefined name. JS uses `mq("mobile")` (`assets/js/lib/media.js`, fed by `js.html`), and image `sizes` read `partialCached "media-queries.html" "media"`. To move a breakpoint, change `media.css` only; a unit test rejects a raw width query anywhere else.

## Scripts

Same idea as stylesheets: every script lives in `assets/js/` and is included with `{{ partial "js.html" "name" }}` (for `assets/js/name.js`). That partial bundles imports with `js.Build` (classic script, so same-site nav can re-run it by src), then minifies and fingerprints. No `?v=` bumps. Scripts inside `#page-root` re-run on same-site navigation, so a page-only script goes inside that wrapper. The homepage script is `assets/js/home.js`, which calls `assets/js/home/` (dock, banner, clouds, pets). The player script is `assets/js/player.js`, which calls `assets/js/player/` (playback, pet, closed/open state, page swap). The homepage star trail is `assets/js/cursor-trail.js`, loaded on every page and active only while the body has `home`.

What SPA nav carries over: `#page-root`, the new page's stylesheets, the title, and the body class. `<head>` scripts and styles and everything outside `#page-root` stay from the first page loaded, so they must be the same on every page (a behavior test compares them). Anything one page needs goes inside `#page-root`; a script outside it that only belongs on some pages checks the body class and listens for `site:page`.

Scripts talk through events on `document` (`assets/js/lib/site.js`), not through functions stored on `window.__site`:

- `site:page` — SPA nav put a new `#page-root` in place.
- `site:relayout` — something changed size (bar closed, counter grew a digit); call `requestLayout()`.
- `site:layout` — `assets/js/layout.js` finished a pass; page decor (homepage clouds, star masks) re-places itself.

Scripts inside `#page-root` run again on every swap, so their window/document listeners pass `{ signal: pageSignal() }` and are dropped with the page.

`assets/js/layout.js` is the one place positions are measured. CSS owns every formula (player.css, footer-dock.css); layout.js measures only what CSS can't (the dock's fit between the parked bar and the ↑, the footer line the player parks on) in one pass on resize, load, font load, `site:page`, and `site:relayout`. It reads the parked bar's left edge from `.player-park-probe`, which player.css places with the same `--player-park-left` as the parked bar, so no formula is repeated in JS.

## Tests

`corn test` runs what CI runs (`.github/workflows/tests.yml`): unit tests for `netlify/` and `corn`, plus browser behavior tests (page swap keeps the music element, the first-visit slash bumps the counter once, Sango's throw, player float and park, the ↑, stop and reopen, subscribe, the star trail on SPA nav, identical head and chrome on every page, no script errors). `corn test --visual` compares every page, top and footer, on desktop and phone against the PNGs in `tests/e2e/__screenshots__/`. Run it before shipping a layout change. If the change was on purpose, `corn test --update` re-records the PNGs; commit them with the change. Screenshot tests stay local because fonts render differently on the Linux runner. The tests fix `Math.random`, hide the shuffled banner, and stub `/api/*`, so nothing reaches the real counter or mailing list.

## Hover tips (`data/tips.yaml`)

Native `title=` tooltips sit under the cursor and fight the star trail. Use instead:

- **Decorative chrome** (sprites, pets, player, logo, email chip): edit **`data/tips.yaml`** keys (`grundo`, `sango`, `kagura`, `player_play`, …). Optional `social:` overrides by hugo.toml link title.
- **Article photos**: case-by-case on the shortcode — `tip="…"` (and `alt=` / `caption=` as usual), not the YAML map.
- Templates resolve YAML via `layouts/partials/tip-text.html` → `data-tip` + class `site-tip`
- `assets/js/site-tips.js` draws a **fixed** `.site-tip-float` that **follows the pointer** (ahead of the cursor; `z-index: 13000`)

Script is included from `baseof.html` (and gallery/guestbook shells). Keep `aria-label`; omit native `title` so you do not get a double tip.

## Writing-index thumbnails (`/blog/` cards)

Tune preview size in two places (no stretch/crop — `object-fit: contain`):

1. **Published widths** — `layouts/partials/image-set.html`, called from `layouts/partials/blog-entry.html`. The card is 480 and 1200. Click opens the 1600 copy.
2. **CSS display caps** — `assets/css/blog-index.css`:
   - `.blog-entry__figure { max-width: … }` — how wide the card image may run in the column
   - `.blog-entry__thumb picture img { max-height: … }` — vertical cap (phone rules in the same file’s media query)

CSS is fingerprinted, so edits ship without a version bump.

## Footer SkiFree

The `skifree-yeti` strip (`layouts/partials/footer/yeti.html`; 9 native-width frames, 3 fps, scale 2) is the left slot of the footer dock on every page except the homepage. The "subscribe" word sits beside him on every page (`[params.subscribe] yetiIcon` defaults to `word`, `yetiIconPos` to `right`); hover only brightens it. Re-slice with `node scripts/slice-skifree.mjs` if the sheet changes.

### Footer dock

Every layout renders its footer through `layouts/partials/site-footer.html`: the band (padding, phone row, extras, copyright) is `assets/css/site-shell.css`, and inside it one row of three slots, left / center / right, is `assets/css/footer-dock.css`, measured by `assets/js/layout.js`. The same code lays out, spaces, and fits that row on every page; pages differ only in what fills each slot, set in one `dict` at the top of `site-footer.html`:

| Page | Left | Center | Right | Lead (phone) |
| --- | --- | --- | --- | --- |
| Homepage | Sango (`footer/sango.html`) | visitor counter (`footer/counter.html`) | Kagura (`footer/kagura.html`) | center |
| Every other page | yeti (`footer/yeti.html`) | empty | Grundo (`footer/grundo.html`) | left |

To move a piece, change its slot there. Both side slots take the wider one's width so their centers mirror around the center slot, and `layout.js` pads the center so they spread to halfway between the center and the furthest spot that still stays in the column and clear of the player. The row scales as one unit (`--footer-dock-scale`, floor 0.55) so it never wraps. Slot content reserves its own painted size (scaled sprites paint outside their layout box). Below 45rem only the lead slot shows, centered like the desktop center slot. The player parks on the dock's bottom line on every page and at every width, in the left gutter (see Player). `layout.js` keeps the row clear of the ↑ and of the parked bar (`playerSpots()`). `[params.home.footer]` extras render under the dock on the homepage only; `copyright` in `hugo.toml` renders under it on every page when set.

Writing index (`/blog/`): one page listing all posts (not infinite scroll). `layouts/blog/list.html` ranges `.Pages` directly, so there is no pagination config in `hugo.toml` — no subpage tabs unless you wire Hugo pagination later.

## Guestbook

Shared signatures use a Netlify Function at `/api/guestbook` (`netlify/functions/guestbook.mjs`) and a site-wide Netlify Blobs store named `guestbook` (JSON key `entries`). Root `package.json` lists `@netlify/blobs` so Netlify can install it on build. Plain `hugo server` has no functions, so the page falls back to local-only storage and shows a status note. For a real shared guestbook locally, use `netlify dev` (needs the Netlify CLI) or deploy. Honeypot field is `website`. Cap is 100 entries; name 80 chars; message 500.

## Visitor counter

Global homepage tally uses `/api/visitors` (`netlify/functions/visitors.mjs`) and a Netlify Blobs store named `visitors` (JSON key `count`). `assets/js/home.js` GETs the total on load and POSTs once per browser session when the dock bump runs (same Kagura / `sessionStorage` gate as before). Plain `hugo server` has no functions, so it falls back to a localStorage cache and local +1. Deploy (or `netlify dev`) for a site-wide accumulative count.

## Color palette

All colors live in `assets/css/tokens.css`: the base16-dark hex values first, then the jobs that use them. Edit a hex to change it everywhere, or point a job at a different slot if, for example, links should use something other than `--base0D`.

What the current dark palette paints:

| Token | Hex now | Where it shows |
| --- | --- | --- |
| `--bg` (`--base00`) | `#31263E` | Flat background on inner pages; base of the homepage gradient |
| `--off-bg` (`--base01`) | `#31263E` | Article panel, guestbook entries, simple-player glass |
| `--inner-bg` (`--base02`) | `#44355B` | Banner frame, form fields, code blocks, gallery tile backing, gradient highlights |
| `--muted` (`--base03`) | `#7cafc2` | Borders, timestamps, empty-state text |
| `--off-fg` (`--base04`) | `#b8b8b8` | Aside, footer, intro text, code text |
| `--fg` (`--base05`) | `#d8d8d8` | Body text |
| `--base06` | `#e8e8e8` | Syntax highlighting |
| `--base07` | `#f8f8f8` | Syntax highlighting |
| `--base08` | `#ab4642` | Guestbook error text |
| `--base09` | `#dc9656` | Syntax highlighting |
| `--highlight` (`--base0A`) | `#18FF6D` | Visitor-count digits, selected text |
| `--logo` (`--base0B`) | `#18FF6D` | Site-title chip |
| `--hover` (`--base0C`) | `#f27e57` | Link hover |
| `--link` (`--base0D`) | `#7cafc2` | Links |
| `--base0E` | `#ba8baf` | Syntax highlighting |
| `--base0F` | `#a16946` | Syntax highlighting |

Every page uses a vertical linear gradient in `assets/css/backdrop.css`: charcoal near-black at the top (`#121014`), easing into the palette purple (`--bg` / `#31263E`) and a touch of `--inner-bg` / `#44355B` at the bottom. Inner pages match the homepage content look — prose sits directly on the gradient (the theme body plate is gone from `assets/css/layout.css`). Corner art is homepage-only.

## Dimensions

Sizes the layout actually uses. `1rem` is 16px unless the browser's default font size has been changed.

- Cursor image: 32×32. Hotspot `x` and `y` are pixels from the top left. The starter arrow is `0` `0`.
- Banner file: the starter SVG is 1200×280. On the page it fills the content column, and its height follows the picture, capped at 16rem. The empty frame is at least 8rem tall.
- Page model, every page (homepage, writing, articles, photobook, guestbook, read-me): one centered `.site-shell` column in `assets/css/layout.css`, 38rem wide (`--middle-column`), with equal gutters. No page overrides that width, so the nav, column, footer, and player sit in the same place on every page and SPA nav never shifts them. To resize the site, change that one value. Header: the nav is centered in the column. Main: content fills the column. Images, figures, photo grids, and Markdown images center in it; prose and form controls stay left-aligned. Footer: one three-slot dock centered in the column on every page (Sango / ticker / Kagura on the homepage, yeti / empty / Grundo elsewhere; see Footer dock), and the player buttons sit in the right gutter flush with the column edge, with the ↑ halfway to the window edge. The photobook and guestbook use `baseof.html` like every other inner page (body class `layout-<name>`). The only side inset is `--page-gutter` (1.25rem a side on desktop, 2.5rem on phones, where it holds the floating player). `body` has no margin, so the gradient runs edge to edge on every page. Below 45rem the player uses that same footer park.
- Gallery tiles: square, fluid (at least 8.5rem, four across on desktop) so the grid fills the column edge to edge. Each thumb is a 480px center crop. Click opens the uncropped 1600 copy.
- Homepage player: the same player as every other page, on the dock baseline and at the same page edge. Sango, the ticker, and Kagura fill the footer dock's three slots. Below 45rem the pets are hidden. On a phone the counter, the player, and the ↑ share one centered footer row once parked; while floating, play / pause mirrors to the top of the right gutter and the ↑ keeps the bottom corner. The homepage counter, the player buttons, and the ↑ share one chip theme (`--chip-bg`, `--chip-fg`, `--chip-border`, `--chip-font` in `assets/css/tokens.css`). Phone nav: Misdreavus and Pancham are bookends, with the links centered between them (two per row when they fit).
- Atmosphere: `.home-stars` via `layouts/partials/stars.html` / `assets/js/stars.js` (~153 CSS dots + ~5 sparse Joan-style `\/` ASCII stars in the side gutters, away from text). Homepage moon is Joan G. Stark’s “man in the moon” (`.ascii-moon`, `jgs` kept) in `.home-title-row` beside the centered site title. First homepage session only: when the visitor ticker scrolls into view, large Kagura attacks across the dock with feet on the ticker baseline, the count bumps mid-slash with `+1` (Sango in her pad, `.dock-pad--sango`, stays idle), then Kagura crossfades to a ~30% smaller `kagura-walk` and parks in `.dock-pad--kagura` (`assets/js/home/pets.js`). Returning visits keep Kagura idle-walking right and Sango idle left. Click Sango to play `sango-attack`; mid-swing knocks Kagura into `kagura-down`, then she gets back up to walk; Sango returns to idle when the attack strip finishes (Hiraikotsu home). If they leave without seeing the attack, the count still bumps once with no park. Counts 10 / 100 / 1000 also get a green milestone glow.
- Media polish: `assets/css/retro.css` adds twinkling corner sparkles on the **homepage banner only** — not gallery, article, or writing-index thumbs. No border, no purple wash, no scanlines.
- Favicons: `layouts/partials/head.html` links `favicon.ico`, `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png`, and `site.webmanifest` from `static/` when they exist. They are all in the repo now (cat + hearts). `site.webmanifest` still has an empty `name` / `short_name` and white theme colors.
- Backdrop: fixed corner caps use `maxwidth` / `maxheight` in `hugo.toml`. Bottom-right image feeds read-me `.sword-figure` (`layouts/partials/sword-figure.html`) and is never emitted as `.site-backdrop`. Other corners still use `layouts/partials/backdrop.html`; SPA home adopt also strips any leftover bottom-right corner node.
- Homepage dock: the sitewide footer dock (see Footer dock) with Sango, the ticker, and Kagura in its slots. Below 45rem the pets are hidden and the counter is the lead. The first-visit slash is skipped there; the count still bumps.

## Cursor

Two different “cursor” ideas on this site — don’t confuse them:

1. **Pointer image (shipped)** — CSS `cursor: url(…)` from `[params.cursor]` in `hugo.toml`. Replaces the system arrow with a 32×32 GIF (or PNG). Hotspot `x` / `y` is where clicks register. Text fields keep the I-beam. Agents must not change this unless asked.
2. **Star trail (shipped, homepage desktop)** — `assets/js/vendor/cursor-effects.esm.js` (`starCursor`) draws gold sparkles that follow the pointer (same motion as the old bubble trail). Separate from the pointer image.
3. **Fun custom cursor (experimenting)** — Keep the ghost GIF as the pointer. Extras in `assets/js/site-cursor-fx.js` + `chrome.css`: click → soft ♡ burst; idle soft bubbles near the hotspot. Same desktop / fine-pointer / motion gates as the trail.

```toml
[params.cursor]
image = "images/cursor.gif"
x = 0
y = 0
```

- Replace `static/images/cursor.gif`. Keep it 32×32 pixels. Larger images are ignored by some browsers.
- `x` and `y` are the click point, in pixels from the top left of the image. The starter arrow uses `0` `0` because the tip is the top left.
- The rule is injected in `layouts/partials/head.html`. It applies to the whole page, including links. Text fields and text areas keep the text cursor.
- To go back to the normal pointer, delete the `image` line, or point it at a file that is not in `static/`.

## Banner

Homepage only. The slot is the first thing on the page, above the header.

```toml
[params.home]
bannerDir = "images/banners"
banner = "images/banner.webp"
bannerAlt = "Site banner"
```

- `bannerDir` is a folder under `static/` (starter: `static/images/banners/`). On each homepage render Hugo shuffles that folder, preloads one image (png/jpg/webp/gif), and embeds it — no JS src swap. Prefer ~1200×280 WebP. Drop more same-size banners in the folder to rotate on refresh.
- `banner` is the fallback single file if `bannerDir` is empty or missing.
- `bannerAlt` is the image description. `home.js` only holds `.is-pending` until decode (SPA-safe).
- Homepage title under the banner: `displayTitle` (defaults to site title), `displayTitleLine2`, and the look: `titleFont` / `titleColor` (line 1), `titleFontLine2` / `titleColorLine2` (line 2), `titleHighlight` (background). Those keys are the only place to set it; `home.css` only holds fallbacks. Fonts must be system fonts or declared in `assets/css/fonts.css`.
- The markup is in `layouts/index.html`. If the file is missing, the page shows an empty frame that names the path it expected.

## Social links

The icons under the site title in the right column come from `hugo.toml`. They show on every page that uses the standard layout: blog, posts, and About. The homepage, the gallery, and the guestbook do not render that column.

```toml
[[params.socialLinks]]
icon = "fa-brands fa-github"
title = "GitHub"
url = "https://github.com/"
```

Add another block for another icon. The fields are `icon`, `title`, and `url`.

- `icon` is a short name (`github`, `envelope`, `heart`, `book`, `pen`, `play`, `stop`, `forward`) or a legacy FA class (`fa-brands fa-github`) mapped in `layouts/partials/icon-name.html`. Inline SVGs — no Font Awesome / Academicons CDN.
- `title` is the tooltip and the accessible name. The icon itself is hidden from assistive tech.
- `url` is the destination. Use a full `https://` address, or `mailto:you@example.com`.
- The markup is `layouts/partials/about.html`. The list style is `assets/css/about.css`.

To put a social link on one page only, including the homepage, gallery, or guestbook, use a button on that page (next section) and set `icon` to the same class.

## Buttons

A button is a labeled link. Three places accept them.

On one page, add `buttons` to that page's front matter. This works on a post, About, the homepage (`content/_index.md`), the blog list, the gallery, and the guestbook.

```yaml
---
title: About
buttons:
  - title: GitHub
    url: https://github.com/
    icon: fa-brands fa-github
  - title: Notes
    url: /blog/
---
```

`icon` is optional. The row is rendered by `layouts/partials/page-buttons.html` after the page's own text.

Inside the page's markdown, a shortcode places a button in the paragraph where you write it:

```
{{< button text="GitHub" url="https://github.com/" icon="fa-brands fa-github" >}}
```

`icon` is optional. The shortcode is `layouts/shortcodes/button.html`.

On the homepage footer, under the visitor count and the player, uncomment or add a block in `hugo.toml`:

```toml
[[params.home.footer]]
kind = "button"
title = "GitHub"
url = "https://github.com/"
icon = "fa-brands fa-github"
```

The same footer list also takes `kind = "text"` (`text`) and `kind = "image"` (`src`, `alt`, and an optional `url`). Those are rendered in `layouts/index.html`.

The look is `assets/css/buttons.css`, part of the sitewide bundle.

## Article media shortcodes

Posts and pages can embed framed pictures without raw HTML. The shortcodes live under `layouts/shortcodes/`. `photo`, `figcaption`, and a markdown image on its own line all render through one partial, `layouts/partials/article-photo.html`, so a picture looks and behaves the same on any page that renders a body (articles, read-me, guestbook, homepage, section lists, unsubscribe). Styles are `assets/css/article-media.css`, part of the sitewide bundle so no layout has to remember to load it. The photo lightbox is `assets/js/article-media.js`. The script tag sits inside `#page-root` (home and base layout) so same-site navigation, which only swaps that node, still loads it.

Only raw `<img>` HTML opts out (it gets `max-width: 100%` and nothing else). An image inside a sentence stays inline at text height.

Put the image next to the markdown as a **page resource** (same folder as `index.md`, or listed in front matter `[[resources]]`), or use a path under `static/` (for example `images/foo.png`).

### `photo` — medium thumb, click to enlarge

Centered medium thumbnail with the retro frame. Click opens the full image.

```
{{< photo src="weaving-infinite-gold.png" caption="Amaral Gold" />}}
{{< photo src="weaving-infinite-gold.png" alt="Gallery install" >}}Optional caption with **markdown**{{< /photo >}}
```

- `src` (required): page resource name or `static/`-relative path. Positional `{{< photo "file.png" >}}` also works.
- `caption` or inner markdown: shown under the thumb; if `alt` is omitted, the plain caption becomes `alt`.
- `alt`: image alt text when you do not want it derived from the caption.
- Self-closing `/>` is fine when there is no inner body (Hugo shortcode syntax).

Example in-tree: `content/blog/crossroad-beauty/index.md`.

### `figcaption` — same as `photo`

Kept as a name only; it renders the same figure as `photo` (28rem, centered, click to enlarge).

```
{{< figcaption src="photo.png" caption="Hello" >}}
{{< figcaption src="photo.png" alt="Hello" >}}Caption text{{< /figcaption >}}
```

### `photo-grid` — grouped thumbs (2-up, odd leftover centered)

One image path per line inside the shortcode. Optional `caption=` under the group (Fira Mono). Click any tile → same lightbox as `photo`.

```
{{< photo-grid caption="amaral gold · three" >}}
weaving-infinite-gold.png
weaving-infinite-gold.png
weaving-infinite-gold.png
{{< /photo-grid >}}
```

| Count | Layout |
| --- | --- |
| 1 | single |
| 2 | two-up |
| 3 | two + one centered under |
| 4 | 2×2 |
| 5 | 2×2 + one centered under |
| 6+ | two columns |

Example grids live on `content/blog/crossroad-beauty/index.md`.

### `button` and `sprite`

See **Buttons** above and **Sprite animations** for `{{< button ... >}}` and `{{< sprite ... >}}`.

## Content updates

**Posting blog posts** (front matter, shortcodes, sprites, video, writing-index cards): see [`docs/posting.md`](posting.md).

How to change what visitors read without touching layout chrome.

| Change | Where |
| --- | --- |
| Homepage copy | `content/_index.md` |
| New blog post | Folder under `content/blog/<slug>/` with `index.md` + images |
| Blog list title | `content/blog/_index.md` |
| Photobook | `content/gallery.md` (+ images under `static/` or as page resources) |
| Guestbook page copy | `content/guestbook.md` (signatures are Netlify Blobs / local fallback, not markdown) |
| read-me | `content/read-me.md` |
| Nav labels / URLs | `[[menu.main]]` in `hugo.toml` |
| Site title, banner, sprites, socials, backdrop | `hugo.toml` `[params.*]` — see sections above |
| Playlist (local test) | `static/audio/playlist.json` (`title`, `src`); remote URL is `[params.player] playlist` in `hugo.toml` |

New post checklist:

1. `content/blog/<slug>/index.md` with `title`, `date`, and body.
2. Drop images in that folder; reference with `{{< photo src="file.png" caption="…" />}}` or `figcaption`.
3. Fill writing-index front matter (drives `/blog/` card): `summary`, `index_image`, optional `index_caption`.
4. Optional `[[resources]]` entries for titles used elsewhere.
5. `hugo server` and open `/blog/` then `/blog/<slug>/`.

### Writing index (`/blog/`)

Vajra-style feed (not a bare link list). Layout: `layouts/blog/list.html` + `layouts/partials/blog-entry.html`; styles `assets/css/blog-index.css` (Fira Mono, all lowercase via CSS). Each post card uses that post’s front matter:

| Field | Role |
| --- | --- |
| `title` | Linked heading |
| `date` | Date line |
| `summary` | Teaser under the thumb (fallback: `description` or `index_summary` only — never the article body) |
| `index_image` | Page-resource filename (or `static/` path); natural size up to Fit/CSS caps (see **Writing-index thumbnails**) |
| `index_caption` | Figcaption under the thumb (fallback: resource `title`) |

Thumb click opens the existing article lightbox; title links into the post. Example: `content/blog/crossroad-beauty/index.md`.

Do not put secrets, API tokens, or maintainer-only paths into `content/` or `static/` — those folders publish. Keep private notes in this file (`docs/resources.md`) only.

## Background image

Each corner of the window can hold its own picture. The pictures stay fixed on the homepage only (`body:not(.home) .site-backdrop` hides them on inner pages, and every corner is hidden below 45rem). The middle column is held between them: every page is 38rem wide (`--middle-column` in `assets/css/layout.css`). Corner pictures use the space outside that column. They also shrink on a short window so about 20rem of vertical room stays between the top and bottom pictures. They never grow past `maxwidth` and `maxheight`, and a file smaller than the slot stays at its own size.

When the window is too narrow for both the column and the pictures, the pictures shrink first. The column keeps its width until the window itself is narrower.

The header, column, and footer are transparent so the gradient shows through behind the writing. Corner pictures stay fully opaque and size against the same column.

The four blocks are `[params.backdrop.bottom-right]`, `[params.backdrop.bottom-left]`, `[params.backdrop.top-right]`, and `[params.backdrop.top-left]`. They use the same fields. This is the bottom-right block; the other three match it.

```toml
[params.backdrop.bottom-right]
image = "images/backdrop-bottom-right.webp"
alt = ""
x = "1.5rem"
y = "1.5rem"
maxwidth = "24rem"
maxheight = "24rem"
```

- `image` is a path under `static/`. Only `static/images/backdrop-bottom-right.webp` exists today (it feeds the read-me sword figure); add files for the other corners and point their `image` at them. Replacing one file changes only the corner that points at it.
- `alt` is the description. Leave it empty when the picture is decoration. An empty `alt` still shows the picture.
- `x` and `y` are the distance from that corner. Any CSS length works (`1.5rem`, `24px`). A blank `x` or `y` uses `1.5rem`.
- `maxwidth` and `maxheight` are the largest that corner's picture is allowed to be. The layout also keeps the picture outside the middle column, so the size you see is the smaller of that cap and the free space in the corner. A file smaller than the slot stays at its own size. A larger file is shrunk to fit, keeping its proportions. The picture is never scaled up. A blank `maxwidth` or `maxheight` uses `24rem`.
- The elements are `layouts/partials/backdrop.html`. The rules are `assets/css/backdrop.css`. They sit outside `#page-root`, next to the player, so same-site navigation leaves them in place. Include that partial after `#page-root` on any new layout, the same way the player partial is included.

A blank corner draws nothing. The other corners stay as they are. Leaving `image` blank means either of these:

```toml
[params.backdrop.top-left]
image = ""
```

or deleting the `image` line and keeping the rest of that corner's block. Deleting the whole corner block does the same thing. A path that does not match a file under `static/` is also blank, so a typo leaves that corner empty too. To keep a corner empty on purpose, set `image = ""` and leave the block in `hugo.toml`. The size lines can stay; they have no effect until `image` names a file that exists.

The player stays above the pictures. On a short window the skin can cover the corner it sits in.

## Git branches (preview → main)

Stopgap flow before a heavier release process:

- **`main`** — Netlify **production** branch (`cornfieldjournal.com`). Each production deploy costs **15 credits**.
- **`preview`** — integration / develop stand-in. Open feature PRs **into `preview`**. When ready, one PR `preview` → `main` for the live release.

### corn git commands

Repo is always `littlepriests/comeholyghost`. Remote **name** depends on machine:

| Flag | Machine | Git remote name |
| --- | --- | --- |
| `--thinkpad` | work | `personal` (SSH host `github.com-personal`) |
| `--aura` | home | `origin` (standard `github.com`) |
| (neither) | — | interactive prompt |

Pass the flag on `branch` / `add` / `push` / `deploy` (or answer the prompt). There is no separate `develop` branch — **`preview` is develop**.

| Command | What it does |
| --- | --- |
| `corn branch` | Fetch; merge `main` into local `preview`; create `update-MMDDYY` (or `-2`, …) from `preview`. |
| `corn add` | On a feature branch: stage → **prompt for commit message** → `git push -u` (no preview checkout). On `main`/`preview`: create `update-*` first (stashes if dirty). `--sync` stashes if dirty, syncs `preview`←`main`, merges into the branch, pops, then commits. |
| `corn push` | Push current branch; open or reuse a PR **into `preview`**. |
| `corn deploy` | If `preview` is ahead of `main` **and checks are green**, open/merge the release PR `preview` → `main`. `--pr-only` stops before merge; `--dry-run` prints intent. |

You still **merge feature PRs into `preview` in GitHub** yourself. `corn deploy` only promotes already-merged preview work to production when checks pass — it does not auto-merge feature branches.

**PR base must be `preview`.** GitHub’s default compare URL targets `main` (the default branch). Prefer `corn push`, or open `compare/preview...<branch>?expand=1`. Cadence: land many feature PRs on `preview` through the month; one `corn deploy` (`preview` → `main`) when you want production.

**Vale CI:** `.github/workflows/vale.yml` uses the same `vale.ini` as `corn edit` (`Vocab = Site, Batch`). Annotations stay non-blocking. The job fails only for a real misspelling on a line added since the base that is **not** on either accept list. A case change (`illinois` / `Illinois`) is not a misspelling. Posts already on the base are not checked again.

Two accept lists (local picker and GitHub check read the same files):

| List | File | How it changes |
| --- | --- | --- |
| Permanent | `styles/config/vocabularies/Site/accept.txt` | `corn edit` key `p`, or edit the file |
| Batch | `styles/config/vocabularies/Batch/accept.txt` | `corn edit` key `a` |

Run `corn edit`, accept names with `a`/`p`, and **commit the accept file with the feature PR** so CI sees it. Batch stays on `preview` through the `preview` → `main` merge. `corn deploy` then clears the batch file on `preview` (that commit only touches the accept file, so Vale does not re-read the posts). The next `corn branch` starts empty. If the release PR was merged by hand, run `corn deploy` once more: with nothing left to promote, it still clears a batch list that is already on `main`.

### Do Deploy Previews burn credits?

**The deploy itself: no.** On credit-based plans, Netlify lists Deploy Previews and branch deploys as **0 credits** (same for failed deploys). Production publishes are what cost 15 credits each.

**Still metered if you use them:** visiting a preview URL still counts **bandwidth** and **web requests**; hitting Functions still counts **compute**. Light self-checks are cheap; don’t load-test previews.

**Netlify UI:** keep Production branch = `main`. Optionally enable **branch deploys** for `preview` → stable URL like `preview--<site>.netlify.app` (also 0 deploy credits). PR Deploy Previews stay on by default.

`netlify.toml` already uses a separate build command for deploy-preview / branch-deploy (no newsletter auto-send). Keep `NEWSLETTER_AUTO_SEND` on **production** only.

**Metered APIs on preview:** builds bake `CONTEXT` into the page. On `deploy-preview` / `branch-deploy`, the browser **skips** `/api/visitors`, `/api/guestbook`, `/api/subscribe`, and `/api/unsubscribe` (local fallbacks / “preview only” messages). Functions also no-op Blobs/Resend if something still hits them. Production is unchanged. Static page views still count as normal web requests/bandwidth.

## Newsletter (Resend)

Templates live in git under `emails/` (not published by Hugo). Site subscribe UI: nav `./subscribe` + SkiFree yeti → dialog → `POST /api/subscribe`.

### One-time Resend + Netlify setup

1. Create a [Resend](https://resend.com) account (free Marketing tier covers up to 1,000 contacts).
2. Add and verify a sending domain (e.g. `cornfieldjournal.com` or `mail.cornfieldjournal.com`) — DNS SPF/DKIM as Resend shows.
3. Marketing → create a **Segment** for the blog list; copy its id.
4. Create an API key.
5. Netlify → Site → Environment variables (production):

| Variable | Example |
|---|---|
| `RESEND_API_KEY` | `re_…` |
| `RESEND_FROM` | `FIELD <news@cornfieldjournal.com>` (must be on the verified domain) |
| `RESEND_SEGMENT_ID` | segment id from step 3 |
| `RESEND_NOTIFY_TO` | `fellbeasts@proton.me` (owner ping on new subscribe; optional, this is the default) |
| `RESEND_WEBHOOK_SECRET` | `whsec_…` from the Resend webhook details page |
| `UNSUBSCRIBE_SECRET` | optional. signs unsubscribe links; without it they are signed with `RESEND_API_KEY`, so rotating that key breaks links already sent |
| `NEWSLETTER_AUTO_SEND` | `1` when you want deploys to broadcast **net-new** posts |

Optional local: same vars in a gitignored `.env` for `netlify dev` / `--send`.

**Owner notify (webhook):** In Resend → Webhooks, add `https://cornfieldjournal.com/api/resend-webhook` for event `contact.created`. Paste the signing secret into `RESEND_WEBHOOK_SECRET`. The handler emails `RESEND_NOTIFY_TO` (or the default above). `/api/subscribe` also sends the same ping when it creates a contact, so you still get a notice if the webhook is late or unset.

### Behavior

- **Subscribe:** adds the contact to the segment; sends the welcome letter once (skipped if they were already on the list); pings the owner. **All welcome copy** (subject, greeting, headline, preheader, footer, body, optional `image`) lives in `emails/welcome.md` only; `emails/welcome.html` is chrome/tokens. Welcome is transactional (not a Broadcast), so unsub is a site link to `/unsubscribe/?email&token` + `POST /api/unsubscribe` (the token is an HMAC of that address; a POST without it does nothing). A valid one **deletes** the Resend contact. Post letters still use `{{{RESEND_UNSUBSCRIBE_URL}}}`.
- **New posts:** `scripts/newsletter-on-deploy.mjs` runs after Hugo. First run **seeds** a ledger with every existing post (nothing historical is emailed). Later deploys broadcast only slugs not yet in the ledger via Resend **Broadcasts** (not transactional `/emails`). Skip a post with front matter `newsletter = false`.
- **Ledger:** Netlify Blobs store `newsletter` / key `sent` on deploy; locally `.newsletter-sent.json` (gitignored).

### Design / preview

```bash
corn email
corn email --watch
```

(or `npm run emails:preview`) Rebuilds `emails/preview/` and serves **both** letters at **http://127.0.0.1:3939/** (welcome + post; opens the browser). Also serves Hugo `public/` on **:3940** for post Fit images when that folder exists. `--watch` keeps serving and rebuilds when `emails/`, email libs, or `content/blog/` change. Env: `EMAIL_PREVIEW_NO_OPEN=1`, `EMAIL_PREVIEW_PORT`, `EMAIL_ASSET_PORT`. Welcome copy: `emails/welcome.md`. Post chrome: `emails/post.html` (body comes from the Hugo post). Placeholders: `{{TITLE}}` `{{DATE}}` `{{SUMMARY}}` `{{PERMALINK}}` `{{HERO_BLOCK}}` `{{BODY}}`; leave `{{{RESEND_UNSUBSCRIBE_URL}}}` for Broadcasts. Photo-grids render as 2-up tables (no lightbox); img `alt` is “go to site for full image”.

```bash
npm run newsletter:dry    # list what would send
npm run newsletter:send -- --slug my-post   # force one (needs Resend env)
```

## Player

One chrome: HTML `<audio>` owns play / pause / stop / skip / auto-next and survives same-site navigation. The footer is the footer dock (see Footer dock), with the parked bar to its left and the ↑ to its right. The bar and the ↑ are mirrors. The ↑ sits in a column in the right gutter (`--player-col-x`, its center's distance from the window edge), `--player-float` above the window bottom. While you read, the bar floats in that same column at the top of the window, `--player-float` below the window top, and only play/pause shows. When the footer line arrives it moves to the footer's left gutter: stop is centered on the mirrored column (`--player-col-x` from the left edge), play and skip sit either side, and its bottom edge is on the footer line like the ↑'s. Both placements are offsets inside the same sticky track (`.site-player--parked` picks the second), and the move is one CSS transition that is switched on after the first paint (`.site-player--live`). On every page and at every width stop and skip fade in once parked; they keep their slots while hidden, so the bar's width does not change. The track title sits above the parked bar, centered on the button row and the same width as it. It stays hidden while the bar floats and fades in after the move. Closed, the ♡ follows the same two spots. Windows too narrow for the mirror (narrow desktop, every phone) clamp the parked bar to 0.5rem from the left edge. Phones use the same placements and the same footer: bar on the left, the lead slot (yeti, or the counter on the homepage) centered at desktop size, ↑ on the right, all on the footer line; `layout.js` shrinks the row only if it would run into the bar or the ↑. Glyphs: every player glyph (play, pause, stop, skip, ↑) is `--player-glyph-fill` (0.4) of its own circle's diameter, so they share one ring of empty space. The icons in `layouts/partials/icon.html` (`play`, `volume`, `stop`, `forward`, `up`) have square viewBoxes cropped to their artwork for that; change the one value to resize them all. Play and skip are triangles, so their weight sits left of the box; each carries `--glyph-nudge-x` and the one glyph rule shifts it onto the circle's center. The toggle gets `.is-playing` while music plays, which breathes a slow glow (`player-playing-pulse`); reduced motion keeps a steady glow instead. Grundo is not part of the player: he is the right slot of the footer dock on inner pages (`layouts/partials/footer/grundo.html`), desktop-only. The ↑ makes him kick (stomp, then the ♡ spill) when he is on screen, then the page hearts rise and the page scrolls; elsewhere it goes straight to the page hearts. Stop hides the bar behind a green ♡ and does not autoplay on reopen. The ↑ sits in the same place on every page and appears after a 160px scroll. Long titles scroll inside a fixed slot (`is-marquee`). The footer row itself is the footer dock (see Footer dock). The player lives outside `#page-root`. Same-site clicks swap `#page-root` and leave the player in place. A new tab, an external link, or a page with no `#page-root` loads a fresh document and the music stops.

Files:

- `layouts/partials/player.html` — title and icon buttons, plus the ↑
- `assets/css/player.css` — position and look, and the ↑ heart effects
- `assets/js/player.js` — wires `assets/js/player/` (playback, the ↑ stomp, closed/open state, page swap)
- `assets/js/layout.js` — measures the footer line and `--player-lift`, toggles `.site-player--parked` on scroll
- `static/audio/playlist.json` — local fallback list (`[]` until you add tracks or point the fetch at a remote list)

Every layout that should keep music playing must wrap its page in `<div id="page-root">` and include `{{ partial "player.html" . }}` after that wrapper. Those layouts today are `layouts/index.html`, `layouts/_default/baseof.html`, `layouts/_default/gallery.html`, and `layouts/_default/guestbook.html`.

## Playlist

The player loads a JSON list, then sets the audio source to each track's `src`.

```json
[
  { "title": "Hello", "src": "/audio/hello.mp3" }
]
```

`title` is the label on the button row. `src` is the file the browser plays. Local fallback ships as `[]`. The remote list address is set in `hugo.toml`:

```toml
[params.player]
playlist = "http://192.168.1.20:8080/playlist.json"
```

The player tries that address first and falls back to `/audio/playlist.json` when it is empty or unreachable. Track `src` values can be absolute (`https://…`) or site-relative (`/audio/…`).

### Calling a folder on another server

Plex and Symphony can keep streaming the same files for you. This site cannot see their libraries. It cannot open a drive letter, a `\\server\share` path, or a folder you can browse in File Explorer. A web page can only ask for an address that starts with `http://` or `https://`.

A Plex token in `hugo.toml`, `player.js`, or the playlist would be readable by anyone who opens the site. Do not put one there.

What you set up instead is a second door to the same folder: a small web server that hands out the files and one list, `playlist.json`. The site fetches the list, then plays each `src` in order. Plex and Symphony stay as they are.

Words used below:

- A **URL** is the full address of one file, like `http://192.168.1.20:8080/song.mp3`.
- An **origin** is the site address the visitor has open. While you are developing, that is `http://localhost:1313`. The music server is a different origin.
- **CORS** is a header on the music server's reply. The playlist is loaded with `fetch()`, and the browser blocks that read unless the music server says this site is allowed. Playback of a song URL is looser. The list is the part that fails without the header.

Do the steps in order. Each one ends with something you can see in a browser. Stop and fix that step before the next.

#### 1. Make a small folder of test tracks

On the machine that holds the music, create a folder used only for this test. Two `mp3` files is enough. Copy them. Leave the originals where Plex or Symphony already finds them.

```text
C:\music-site\
  hello.mp3
  second.mp3
```

Use a folder you can empty or rebuild. After the test works, point the same web server at the real library folder, or keep copying files into this one.

`mp3` is the format to use for real tracks.

#### 2. Write the playlist by hand

In that same folder, create `playlist.json` with a plain text editor (Notepad, VS Code, Cursor). Do not use Word. Word changes quotes into curly quotes and the file will not load.

```json
[
  { "title": "Hello", "src": "http://192.168.1.20:8080/hello.mp3" },
  { "title": "Second", "src": "http://192.168.1.20:8080/second.mp3" }
]
```

Rules that matter:

- The order in this file is the play order.
- `title` is the label on the player. It can be anything.
- `src` is the address the visitor's browser will request. It is not the path on the server's disk. You will not know the exact host and port until step 3. Write the titles now, and come back to paste the real `src` values after you can open a song in the browser.
- A comma goes between objects. No comma after the last one.
- Quotes are straight `"` characters.
- Spaces in a file name must be `%20` in the URL. `my song.mp3` becomes `my%20song.mp3`.

Save the file as `playlist.json` in the same folder as the mp3s. If the editor offers an encoding, choose UTF-8.

#### 3. Serve that folder over HTTP

Install [Caddy](https://caddyserver.com/docs/install) on the media server. It is one program and one config file, and it can add the CORS header from step 5.

In the folder where you want to keep the config (it does not have to be the music folder), create a file named `Caddyfile` with no extension:

```caddyfile
:8080 {
	root * C:\music-site
	header Access-Control-Allow-Origin http://localhost:1313
	header Access-Control-Allow-Methods GET,HEAD,OPTIONS
	header Access-Control-Allow-Headers Range
	file_server browse
}
```

On Linux or a NAS, change the root line to that machine's path, for example `root * /srv/music-site`.

`browse` turns on a file list so you can click a song and copy its address while you are setting up. The player does not read that list. It only reads `playlist.json`. When the playlist works, delete the word `browse` if other people can reach this server.

From a terminal in the same directory as the `Caddyfile`:

```text
caddy run
```

Leave that window open. Closing it stops the server.

Find the media server's address on your home network. On Windows, `ipconfig` shows an IPv4 address like `192.168.1.20`. On the media server, or on your own computer if the server is this PC, open:

```text
http://192.168.1.20:8080/
```

You should see the file list, including `hello.mp3` and `playlist.json`. Click `hello.mp3`. The browser should play it or download it. Copy that address from the address bar. It is the `src` for that track. Paste it into `playlist.json`, save, and do the same for the second file.

If this page does not load, the site cannot load it either. Check that `caddy run` is still going, that the root path is the folder you created, and that a firewall is not blocking port 8080.

#### 4. Prove the playlist file opens

Open the playlist address itself:

```text
http://192.168.1.20:8080/playlist.json
```

You should see the JSON text, with the `src` values you just pasted. If the browser downloads the file instead of showing it, open the download. The contents are what matter.

Every `src` should play when you paste it into a new tab. A `src` that 404s will be a skip that lands on silence.

#### 5. Prove the site is allowed to read the list

CORS is already in the `Caddyfile` above for `http://localhost:1313`. Restart Caddy after any edit to that file (`Ctrl+C`, then `caddy run` again).

On the Hugo site, open http://localhost:1313/, then the browser's developer tools, then the Console. Paste this, using your playlist address:

```js
fetch("http://192.168.1.20:8080/playlist.json")
  .then(function (response) { return response.json(); })
  .then(function (list) { console.log(list); })
  .catch(function (error) { console.log(error); });
```

You should see the array of tracks printed in the console.

If the console says `Failed to fetch` or mentions CORS, the header is missing, the origin does not match, or Caddy was not restarted. The origin must match exactly, including `http://` and the port. `http://localhost:1313` and `http://127.0.0.1:1313` are different origins. Use the one in your address bar.

When the Hugo site later has a public address, change the Caddy header from `http://localhost:1313` to that address and restart Caddy.

#### 6. Point the player at the playlist

In `hugo.toml`, set the playlist URL under `[params.player]`:

```toml
[params.player]
playlist = "http://192.168.1.20:8080/playlist.json"
```

Save. Hugo rebuilds on save. Reload the site, press Play, and the label should be the first `title` from your file. Skip should play the second track. Moving from the homepage to Blog should keep the song going.

#### 7. Add a track later

1. Put the new `mp3` in the served folder.
2. Open the folder in the browser, click the file, and copy the address.
3. Add an object to `playlist.json` in the spot where it should play. Keep the commas valid.
4. Reload the site. The player reads the file on each visit. You do not rebuild the media server for a playlist edit.

The site will not notice a file that is only dropped in the folder. Something has to add it to `playlist.json`. That can be you, or a small script on the media server that rewrites the JSON from the directory. The site cannot list the directory for you.

#### If a song or the list asks you to log in

The playlist URL and each song URL need to open in a private browser window where you are not logged in. If they ask for a password, every visitor would hit that wall too. A password or token stored in this repo is visible to anyone who loads the page. Prefer a folder that does not need a login. Plex and Symphony can keep their own logins for your apps. The web folder for this site is separate.
