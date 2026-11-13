# Site resources

Private notes for the site owner and agents. This file is not a Hugo page. Do not move it into `content/` or `static/`. Hugo publishes those folders. Visitors should not see this.

The dev server is `hugo server -D --disableFastRender --navigateToChanged` from the repo root, at http://localhost:1313/.

## Performance (local checklist)

What we tightened (keep the GeoCities vibe; don’t gut atmosphere):

- **Images:** article masters as WebP where possible; `photo` / `figcaption` / `photo-grid` / writing-index serve Hugo-processed WebP display sizes from page resources. Prefer masters under ~300–500 KB (see `docs/posting.md`).
- **Fonts / icons:** self-hosted WOFF2 only — Fira Mono (`static/fonts/fira-mono-*.woff2`, `static/css/site-fonts.css`), Montserrat variable (`article-font.css`), DotMatrixNarrow (homepage title). Site vs article faces via `[params.fonts]` (see **Fonts** below). No Google Fonts / Font Awesome / Academicons CDN. Icons via `layouts/partials/icon.html`.
- **CSS scope:** always-on chrome in `layouts/partials/head.html` (player, reading, subscribe, stars, sprites, backdrop). `retro.css` is homepage-only and scoped to `body.home`. `buttons.css` loads only with button markup. `article-reading` (blog posts), `article-media` / `blog-index` load from their layouts. Gallery / guestbook keep their own sheets. Base layout CSS lives in `assets/css/` (forked from Risotto; unused palettes dropped).
- **Atmosphere JS:** bubble cursor self-hosted (`static/js/vendor/cursor-effects.esm.js` v1.0.18), homepage + desktop only. Stars: fewer on phone / `prefers-reduced-motion`; no scroll voiding on narrow viewports.
- **npm:** project `.npmrc` → `registry.npmjs.org` only. Before any zip, confirm lockfile `resolved` URLs are all `registry.npmjs.org` (no private registry hosts).

Quick check: cold Network on `/`, `/blog/`, `/blog/1126/` — no cdnjs/fonts.googleapis/unpkg `@latest`; banner/post thumbs are WebP-sized responses.

## Design direction

Old-school GeoCities personal homepage energy with modern restraint: playful atmosphere (stars, visitor counter personality, music player, guestbook, corner art, framed pictures, sprite pets), clear readable layout, palette-driven color. Not CRT scanlines, not film-grain “cinematic” overlays, not chaotic 1999 clutter. Custom fun cursor is planned by the owner later — leave `[params.cursor]` alone unless they ask.

## Backlog (do not start unless asked)

Owner notes, 2026-11-09. Capture only — do not implement from this list without an explicit ask.

Done in-tree (pending zip/deploy): sitewide stars; blue stepped headings; relative nav links + pinned production `baseURL`; first-paint player hide; synced `comeholyghost-main(1)` visuals; bubble cursor (pauses over sword); ASCII angel glow/CTA; footer-anchored sword figure with fountain hearts; first-visit Kagura attack → idle walk parked right of the player + Sango left (hurt on slash, click-to-attack Kagura); Joan G. Stark moon + sparse ASCII stars; emojicombos clouds; rotating `bannerDir`; configurable homepage title font.

Credits / provenance:
- Moon (`.ascii-moon`): “man in the moon” by **Joan G. Stark** (jgs / Spunk). Signature kept. Source: [ASCII Art Archive](https://www.asciiart.eu/art/5d424c2b42c2d3ac).
- Sparse background ASCII stars: motifs in Joan’s celestial / star style (same archive tradition); credit Joan G. Stark. Tiny repeats omit initials so the sky stays readable — full credit here.
- Clouds (`.ascii-cloud`): small version of the top cloud on [emojicombos.com/cloud-ascii-art](https://emojicombos.com/cloud-ascii-art). Placed around the ASCII angel (top over halo/wing, `# ♡` gap pair, lower flanks, smaller nest under the cat). Nest shows “sign the guestbook!” on angel hover; `home.js` voids twinkling stars behind cloud boxes.
- Kagura / Misdreavus / Sango / SkiFree strips: fan-use test assets; publishers own the art (see Sprite animations).

1. ~~**Mobile player chrome**~~ — Done. Under `44.99rem` on non-home pages, `applyPlayerChrome()` uses `site-player--simple` + `site-player--mobile` (no Winamp). Simple chrome (home + mobile) has `[x]` → ♡ without changing play/pause. Remote playlist fetch falls back to `/audio/playlist.json`; if the skin cannot boot, chrome falls back to simple instead of staying hidden.
1b. ~~**Mobile layout pass**~~ — Done in-tree. Narrow title scale; dock wrap + smaller pets; hide sword; overflow-x clip; larger player touch targets + safe-area; non-sticky aside; gallery/guestbook padding; under `52rem` show angel guestbook CTA (clouds hidden; `home.js` clears nest-driven CTA inline coords). Phone crawl at 390×844 passed home → blog → post → gallery → guestbook. Still spot-check on a real phone after deploy.
2. **Desktop player + sticky header** — Same minimalist player (same close/reopen behavior as mobile) docked on `/blog`, `/gallery`, `/guestbook`, `/about` on the far side of the link dock. On article bodies that already have a third column, dock the player there. On scroll, the whole link dock (home control + player) scrolls with the article — sticky header strip, not a sticky banner.
3. ~~**First-paint flicker (follow-up)**~~ — Done in-tree: SPA waits for new stylesheets before swapping `#page-root`; banner stays pending until the random pick loads; title face uses `font-display: swap` + Fira preload; backdrop images fade in on load; `fonts-ready` gate. Verify after deploy; reopen if anything still flashes live.
4. **Domain primary in Netlify** — Code already uses relative nav/`RelPermalink` and pins production `--baseURL https://cornfieldjournal.com/` in `netlify.toml`. Remaining work is Netlify UI: set `cornfieldjournal.com` as the site primary domain (not only an alias) after deploy.

## Sprite animations (test)

**Beginner how-to (make a strip from Spriters Resource, no prior experience):** [`docs/sprites.md`](sprites.md).

Horizontal strip sheets under `static/images/sprites/`, driven by CSS `steps()` in `static/css/sprites.css`. Config is `[[params.sprites]]` in `hugo.toml` (`id`, `src`, `frameWidth`, `frameHeight`, `frames`, `fps`, `alt`, optional `scale`).

### Invoke in content

```
{{< sprite "kagura-walk" >}}
{{< sprite id="misdreavus" scale="3" >}}
```

`id` (or the first positional arg) must match a `[[params.sprites]]` entry. Unknown ids render a visible missing marker. Optional `scale` overrides that entry’s default. Shortcode: `layouts/shortcodes/sprite.html` → partial `layouts/partials/sprite.html`.

Home nav button: set `[params.home] logoSprite = "misdreavus"` (a sprite `id`). That replaces the green `[title] $` chip with the floating strip; clear `logoSprite` to get the chip back. Markup is `layouts/partials/header.html`. Homepage dock pets (Sango / Kagura / boomerang) are wired in `layouts/index.html` + `static/js/home.js`, not the shortcode.

### Add or refresh a strip

1. Drop the source sheet where the slicer expects it (see scripts).
2. Run the matching slicer; it writes frames under `static/images/sprites/`.
3. Register or update `[[params.sprites]]` in `hugo.toml` with the real `frameWidth` / `frameHeight` / `frames` / `fps`.
4. Use `{{< sprite "that-id" >}}` in markdown, or point `logoSprite` / dock markup at the id.

Refresh strips from source sheets (fan-use test assets; Nintendo / game publishers own the art):

- Misdreavus: `node scripts/slice-misdreavus.mjs` (needs `misdreavus-sheet.png`; front hover loop only, no shiny/back)
- Kagura rows: `node scripts/slice-kagura.mjs` (needs `kagura-sheet.png`; each row → `kagura-walk`, `kagura-down`, `kagura-attack`)
- Sango (TSR #13363 InuYasha: Fūun Emaki): `node scripts/slice-sango.mjs` → `sango-idle`, `sango-hurt` (impact pose only), `sango-boomerang` (flying Hiraikotsu spin), `sango-attack`
- SkiFree (TSR #26926): `node scripts/slice-skifree.mjs` → `skifree-yeti` (original block only)
- Grundo (TSR #186604, LonelyMarowak): `node scripts/slice-grundo.mjs` → `grundo-idle`, `grundo-kick` (orange row; dock pet)

`pngjs` for the slicers lives under `scripts/node_modules` (`npm install pngjs --prefix scripts`).

## Deploy (Netlify)

Build settings live in `netlify.toml` at the repo root. Netlify runs Hugo `0.167.0`, publishes `public/`, and production builds with `--baseURL https://cornfieldjournal.com/` (previews still use `$DEPLOY_PRIME_URL`). Leave `baseURL` in `hugo.toml` as localhost for local work.

Nav and in-site list links should stay **relative** (`relURL` / `relLangURL` / `RelPermalink`) so a Netlify primary of `*.netlify.app` cannot send clicks off `cornfieldjournal.com`. Set the custom domain as **primary** in Domain management anyway. Keep `noindex = true` in `hugo.toml` until the site should be searchable.

## Atmosphere (stars)

Twinkling starfield is sitewide: `layouts/partials/stars.html` (outside `#page-root` so SPA nav keeps it), `static/css/stars.css`, `static/js/stars.js`. Linked from `head.html`. Homepage visitor ticker stays in `static/js/home.js`. On non-home pages, `stars.js` voids twinkles behind `.page__body` (title + prose + figures) and punches a CSS mask hole in `.home-stars` so glows cannot sit in letter gaps; gutters / aside keep the sky. SPA nav re-runs `refreshStarReadingVoids` from `player.js`.

## Music prompt (first homepage landing)

On the first homepage view in a browser session (desktop / ≥45rem), one ASCII thought bubble sits by Misdreavus (“⋆｡˚ play music? ˚｡⋆” with **y** / **n**). Phone (≤44.99rem): cloud CTA is omitted — use the bottom player. Cloud + pink fill + CTA are one unit (`.music-prompt__bubble`); move with `--bubble-left` / `--bubble-top`. Grow ASCII+fill with `--cloud-scale` (panel/buttons stay fixed; `--dot-*` are scale-1 bases). Nudge ask + buttons with `--panel-nudge-x` / `--panel-nudge-y`. Pink fill is `.music-prompt__fill` (CSS radials). Trail dots: `--dot-mid-*` / `--dot-tip-*`. `--thought-bob` syncs to Misdreavus frame centroids in `home.js`. Invisible `.music-prompt__hits` halves cover the ASCII cloud (left = yes, right = no) so approximate clicks work; visible **y** / **n** still work. **y** → `window.sitePlayerPlay` then dismiss; **n** dismiss only. `sessionStorage` `home-music-prompt-seen` (not set on phone); retest `?replay-music=1`.

## Read-me email CTA

`content/read-me.md` sets `email_cta = true`. The aside (under Winamp on desktop) shows a mailto link from `[params.about] email` in `hugo.toml` — envelope + ♥ icon only. Address is public on purpose; keep secrets out of `content/` / `hugo.toml` if you ever need a private inbox. Hover label uses `.site-tip` / `data-tip` (see **Hover tips**).

## Aside meta (date / author / ToC)

Article front matter in the right column (`.page__aside`) **scrolls with the page** — not sticky. Override lives in site-owned `static/css/reading.css` (`position: static` on `body:not(.home) .page__aside`), so Risotto’s theme `layout.css` sticky rule does not chase the viewport. Hide only the date line with front matter `hide_date = true` (keep `date` for sort order). ToC still needs `toc = true`.

## Fonts (site vs blog articles)

Two faces, both set in `hugo.toml` — no Google Fonts / company CDNs:

```toml
[params.fonts]
site = "\"Fira Mono\", ui-monospace, monospace"
article = "Georgia, \"Iowan Old Style\", \"Palatino Linotype\", Palatino, \"Times New Roman\", serif"
# Optional self-hosted @font-face sheet for the article stack:
# articleFontUrl = "css/article-font.css"
```

| Token | Where it applies | How to change |
| --- | --- | --- |
| `--font-site` | Body / chrome (home, guestbook, gallery, writing index, asides) | `[params.fonts] site` |
| `--font-article` | `/blog/<slug>/` prose (`.content__header` + `.content__body`) | `[params.fonts] article` + optional `articleFontUrl` |

`head.html` writes the CSS variables; `static/css/reading.css` applies `--font-site` on `body`. Blog posts also load `static/css/article-reading.css` (linked from `layouts/_default/single.html` when `.Section == "blog"`). **Ad-hoc article readability fixes** (line-height, measure, heading weight, code face) go in `article-reading.css` — leave Risotto `typography.css` alone unless you intentionally want a theme-wide change. Writing-index face stays on `.blog-index` in `static/css/blog-index.css` (still site mono by default).

Self-host a new article face: drop WOFF2 under `static/fonts/`, add `@font-face` in e.g. `static/css/article-font.css`, set `articleFontUrl` and put that family first in `article`.

## Photobook veil (`/gallery/`)

Gallery-only. One SunnyNeo Faerie Krawk GIF (`static/images/glitters/faerie-krawk.gif`) + soft dim + CSS glow/♡. Thumbs stay `loading="lazy"`. Veil stays hidden unless the first thumbs are still unfinished after ~320ms (warm cache → no flash), then lifts ~0.9–2.2s. Markup/JS in `layouts/_default/gallery.html` + `static/js/gallery-veil.js` (inside `#page-root` for SPA). `?veil` freezes it open until you click (preview). Credit SunnyNeo in `content/gallery.md`.

## Hover tips (`data/tips.yaml`)

Native `title=` tooltips sit under the cursor and fight the bubble cursor. Use instead:

- **Decorative chrome** (sprites, pets, player, logo, email chip): edit **`data/tips.yaml`** keys (`grundo`, `sango`, `kagura`, `player_play`, …). Optional `social:` overrides by hugo.toml link title.
- **Article photos**: case-by-case on the shortcode — `tip="…"` (and `alt=` / `caption=` as usual), not the YAML map.
- Templates resolve YAML via `layouts/partials/tip-text.html` → `data-tip` + class `site-tip`
- `static/js/site-tips.js` draws a **fixed** `.site-tip-float` that **follows the pointer** (ahead of the cursor; `z-index: 13000`)

Script is included from `baseof.html` (and gallery/guestbook shells). Keep `aria-label`; omit native `title` so you do not get a double tip.

## Writing-index thumbnails (`/blog/` cards)

Tune preview size in two places (no stretch/crop — `object-fit: contain`):

1. **Hugo Fit caps** — `layouts/partials/blog-entry.html` (`$previewMaxW` / `$previewMaxH`, default 960×720). Masters larger than the box are downscaled to WebP; smaller masters keep native pixel size inside the box.
2. **CSS display caps** — `static/css/blog-index.css`:
   - `.blog-entry__figure { max-width: … }` — how wide the card image may run in the column
   - `.blog-entry__thumb > img { max-height: … }` — vertical cap (phone rules in the same file’s media query)

Bump `blog-index.css?v=` in `layouts/blog/list.html` after CSS edits so SPA/cache picks them up. Lightbox still uses the larger Fit (`2400x2400`) full URL from the same partial.

## Footer SkiFree

Wherever `$ echo $LANG` used to sit (`layouts/partials/footer.html` on baseof pages), the `skifree-yeti` strip plays instead (9 native-width frames, 3 fps, scale 2). Home / gallery / guestbook don’t use that footer. Re-slice with `node scripts/slice-skifree.mjs` if the sheet changes.

Writing index (`/blog/`): one page listing all posts (not infinite scroll). `pagerSize = 3` in `hugo.toml` is unused by `layouts/blog/list.html`, which ranges `.Pages` directly — no subpage tabs unless you wire Hugo pagination later.

## Guestbook

Shared signatures use a Netlify Function at `/api/guestbook` (`netlify/functions/guestbook.mjs`) and a site-wide Netlify Blobs store named `guestbook` (JSON key `entries`). Root `package.json` lists `@netlify/blobs` so Netlify can install it on build. Plain `hugo server` has no functions, so the page falls back to local-only storage and shows a status note. For a real shared guestbook locally, use `netlify dev` (needs the Netlify CLI) or deploy. Honeypot field is `website`. Cap is 100 entries; name 80 chars; message 500.

## Visitor counter

Global homepage tally uses `/api/visitors` (`netlify/functions/visitors.mjs`) and a Netlify Blobs store named `visitors` (JSON key `count`). `static/js/home.js` GETs the total on load and POSTs once per browser session when the dock bump runs (same Kagura / `sessionStorage` gate as before). Plain `hugo server` has no functions, so it falls back to a localStorage cache and local +1. Deploy (or `netlify dev`) for a site-wide accumulative count.

## Color palette

The active palette is `base16-dark`. Switch the whole set by changing the name in `hugo.toml`:

```toml
[params.theme]
palette = "base16-dark"
```

The name is a file in `themes/risotto/assets/css/palettes/`, without `.css`. The choices on disk are `apprentice`, `base16-dark`, `base16-light`, `catppuccin-frappe`, `catppuccin-latte`, `catppuccin-macchiato`, `catppuccin-mocha`, `dracula`, `gruvbox-dark`, `gruvbox-light`, `material`, `papercolor-dark`, `papercolor-light`, `solarized-dark`, `solarized-light`, `tender`, `tokyo-night-dark`, `tokyo-night-light`, `windows-95`, and `windows-95-light`. `themes/risotto/layouts/partials/head.html` loads that file. Save `hugo.toml` and reload the site.

To change one color and keep the rest, edit the hex in `themes/risotto/assets/css/palettes/base16-dark.css`. The page does not use those hex values directly. `themes/risotto/assets/css/colours.css` gives each one a job. Change the job there if, for example, links should use a different base color than `--base0D`.

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

Every page uses a vertical linear gradient in `static/css/backdrop.css`: charcoal near-black at the top (`#121014`), easing into the palette purple (`--bg` / `#31263E`) and a touch of `--inner-bg` / `#44355B` at the bottom. Inner pages match the homepage content look — prose sits directly on the gradient (`static/css/reading.css` clears the theme body plate). Corner art is homepage-only.

## Dimensions

Sizes the layout actually uses. `1rem` is 16px unless the browser's default font size has been changed.

- Cursor image: 32×32. Hotspot `x` and `y` are pixels from the top left. The starter arrow is `0` `0`.
- Banner file: the starter SVG is 1200×280. On the page it fills the homepage column, which is at most 40rem wide, and its height follows the picture, capped at 16rem. The empty frame is at least 8rem tall.
- Homepage writing column: at most 38rem wide, centered under the banner. That is about 60 characters of the monospace face, which is the reading width the column keeps.
- Inner pages: the page is at most 53rem wide. At 45rem and wider the aside column is `--aside-width` (275px) with `--aside-gap` (1.5rem) from the body. Sidebar matter (date, etc.) sits in that column. Body is clipped so images don’t spill into the aside. Below 45rem the simple player sits fixed bottom-right.
- Gallery tiles: 9.5rem square. Each thumb is cropped to 600×600 before it is shown.
- Guestbook: below 45rem the column is at most 40rem. At 45rem and wider the page uses the same 53rem middle column as the other inner pages, with the 275px right column, so the form stays left of the aside.
- Homepage player: a compact icon bar (play/pause, stop, skip) sits in `.home-player-slot` beside the visitor-count digits (no “Visitors” label). JS measures it into `--simple-player-width` and `--simple-player-height` so the dock stays vertically centered as a pair.
- Atmosphere: `.home-stars` via `layouts/partials/stars.html` / `static/js/stars.js` (~153 CSS dots + ~5 sparse Joan-style `\/` ASCII stars in the side gutters, away from text). Homepage moon is Joan G. Stark’s “man in the moon” (`.ascii-moon`, `jgs` kept), centered in the left grid column and scrolling with the page. First homepage session only: when the visitor ticker scrolls into view, large Kagura attacks across the dock with feet on the player/ticker baseline, the count bumps mid-slash with `+1` (Sango in `.home-dock__pet--left` flinches into `sango-hurt` then returns to idle), then Kagura crossfades to a ~30% smaller `kagura-walk` and parks in `.home-dock__pet--right` (`static/js/home.js`). Returning visits keep Kagura idle-walking right and Sango idle left. Click Sango to play `sango-attack`; mid-swing knocks Kagura into `kagura-down`, then she gets back up to walk; Sango returns to idle when the attack strip finishes (Hiraikotsu home). Sword figure is vertically aligned to that dock band. If they leave without seeing the attack, the count still bumps once with no park. Counts 10 / 100 / 1000 also get a green milestone glow.
- Media polish: `static/css/retro.css` adds twinkling corner sparkles on the **homepage banner only** — not gallery, article, or writing-index thumbs. No border, no purple wash, no scanlines.
- Player first paint: `#site-player` starts with `site-player--booting` in markup so the fixed bottom-right chrome does not flash before JS places it.
- Favicon slots the theme already looks for, if you add the files under `static/`: `favicon.ico`, `favicon-32x32.png` (32×32), `favicon-16x16.png` (16×16), and `apple-touch-icon.png` (180×180 is the usual size). None of those files are in the repo right now.
- Backdrop: fixed corner caps use `maxwidth` / `maxheight` in `hugo.toml`. Homepage bottom-right sword figure is special-cased: `layouts/partials/home-sword.html` anchors her head to the footer hairline and scales her width to the right gutter (`clamp` so she shrinks away instead of covering the column). Bottom-right is never emitted as `.site-backdrop` (SPA from a non-home full load used to leave a fixed twin beside `.home-sword`). Other corners still use `layouts/partials/backdrop.html`; SPA home adopt also strips any leftover bottom-right corner node.
- Homepage dock: `.home-footer__dock-fit` + `fitHomeDock()` in `home.js` scale pets/ticker/player as one row (`--home-dock-scale`) so the footer never wraps or spills; floor 0.55. While scaled, body gets `is-home-dock-scaled` and the player uses JS placement instead of CSS anchors.

## Cursor

The pointer is an image when `hugo.toml` names a file that exists under `static/`.

```toml
[params.cursor]
image = "images/cursor.png"
x = 0
y = 0
```

- Replace `static/images/cursor.png`. Keep it 32×32 pixels. Larger images are ignored by some browsers.
- `x` and `y` are the click point, in pixels from the top left of the image. The starter arrow uses `0` `0` because the tip is the top left.
- The rule is injected in `themes/risotto/layouts/partials/head.html`. It applies to the whole page, including links. Text fields and text areas keep the text cursor.
- To go back to the normal pointer, delete the `image` line, or point it at a file that is not in `static/`.

## Banner

Homepage only. The slot is the first thing on the page, above the header.

```toml
[params.home]
banner = "images/banner.svg"
bannerAlt = "Site banner"
```

- `bannerDir` is a folder under `static/` (starter: `static/images/banners/`). On each homepage render Hugo shuffles that folder, preloads one image (png/jpg/webp/gif), and embeds it — no JS src swap. Prefer ~1200×280 WebP. Drop more same-size banners in the folder to rotate on refresh.
- `banner` is the fallback single file if `bannerDir` is empty or missing.
- `bannerAlt` is the image description. `home.js` only holds `.is-pending` until decode (SPA-safe).
- Homepage title under the banner: `displayTitle` (defaults to site title), `titleFont` (CSS `font-family` stack — change in toml to experiment), optional `titleFontUrl` (stylesheet link for that face).
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
- The markup is `themes/risotto/layouts/partials/about.html`. The list style is `themes/risotto/assets/css/about.css`.

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

The look is `static/css/buttons.css`, linked from `themes/risotto/layouts/partials/head.html`.

## Article media shortcodes

Posts and pages can embed framed pictures without raw HTML. Both shortcodes live under `layouts/shortcodes/`. Styles are `static/css/article-media.css`; the photo lightbox is `static/js/article-media.js` (loaded from the theme head on pages that need it).

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

Example in-tree: `content/blog/1126/index.md`.

### `figcaption` — full-width figure with caption

Same framing and caption rules as `photo`, but the image displays at normal article width (no click-to-expand).

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

Example grids live on `content/blog/1126/index.md`.

### `button` and `sprite`

See **Buttons** above and **Sprite animations** for `{{< button ... >}}` and `{{< sprite ... >}}`.

## Content updates

**Posting blog posts** (front matter, shortcodes, sprites, video, writing-index cards): see [`docs/posting.md`](posting.md).

How to change what visitors read without touching layout chrome.

| Change | Where |
| --- | --- |
| Homepage copy | `content/homepage/index.md` (and sibling homepage pages if used) |
| New blog post | Folder under `content/blog/<slug>/` with `index.md` + images; or `content/post/` for theme samples |
| Blog list title | `content/blog/_index.md` |
| Photobook | `content/gallery.md` (+ images under `static/` or as page resources) |
| Guestbook page copy | `content/guestbook.md` (signatures are Netlify Blobs / local fallback, not markdown) |
| read-me | `content/read-me.md` |
| Nav labels / URLs | `[[menu.main]]` in `hugo.toml` |
| Site title, banner, sprites, socials, backdrop | `hugo.toml` `[params.*]` — see sections above |
| Playlist (local test) | `static/audio/playlist.json` (`title`, `src`); fetch URL is in `static/js/player.js` |

New post checklist:

1. `content/blog/<slug>/index.md` with `title`, `date`, and body.
2. Drop images in that folder; reference with `{{< photo src="file.png" caption="…" />}}` or `figcaption`.
3. Fill writing-index front matter (drives `/blog/` card): `summary`, `index_image`, optional `index_caption`.
4. Optional `[[resources]]` entries for titles used elsewhere.
5. `hugo server` and open `/blog/` then `/blog/<slug>/`.

### Writing index (`/blog/`)

Vajra-style feed (not a bare link list). Layout: `layouts/blog/list.html` + `layouts/partials/blog-entry.html`; styles `static/css/blog-index.css` (Fira Mono, all lowercase via CSS). Each post card uses that post’s front matter:

| Field | Role |
| --- | --- |
| `title` | Linked heading |
| `date` | Date line |
| `summary` | Teaser under the thumb (fallback: `description` or `index_summary` only — never the article body) |
| `index_image` | Page-resource filename (or `static/` path); natural size up to Fit/CSS caps (see **Writing-index thumbnails**) |
| `index_caption` | Figcaption under the thumb (fallback: resource `title`) |

Thumb click opens the existing article lightbox; title links into the post. Example: `content/blog/1126/index.md`.

Do not put secrets, API tokens, or maintainer-only paths into `content/` or `static/` — those folders publish. Keep private notes in this file (`docs/resources.md`) only.

## Background image

Each corner of the window can hold its own picture. The pictures stay fixed on the homepage only (`body:not(.home) .site-backdrop` hides them on inner pages). The middle column is held between them: the homepage stack is at most 40rem, and inner pages are at most 53rem (`--middle-column` in `static/css/player.css`). Corner pictures use the space outside that column. They also shrink on a short window so about 20rem of vertical room stays between the top and bottom pictures. They never grow past `maxwidth` and `maxheight`, and a file smaller than the slot stays at its own size.

The article on an inner page stays about 36rem beside the 15rem right column. That is a normal line length for the monospace face. The homepage writing stays 38rem. When the window is too narrow for both the column and the pictures, the pictures shrink first. The column keeps its width until the window itself is narrower.

On the homepage, the header, writing column, and footer are transparent so the mesh gradient shows through behind the writing. Corner pictures stay fully opaque; homepage sizing uses the ~40rem stack width so they still appear when a 53rem gutter would collapse them. Inner pages paint the header, aside, and footer solid `var(--bg)`.

The four blocks are `[params.backdrop.bottom-right]`, `[params.backdrop.bottom-left]`, `[params.backdrop.top-right]`, and `[params.backdrop.top-left]`. They use the same fields. This is the bottom-right block; the other three match it.

```toml
[params.backdrop.bottom-right]
image = "images/backdrop-bottom-right.svg"
alt = ""
x = "1.5rem"
y = "1.5rem"
maxwidth = "24rem"
maxheight = "24rem"
```

- `image` is a path under `static/`. The starters are `static/images/backdrop-bottom-right.svg`, `backdrop-bottom-left.svg`, `backdrop-top-right.svg`, and `backdrop-top-left.svg`. Each is 384×384, the same size as that corner's cap. Replacing one file changes only the corner that points at it.
- `alt` is the description. Leave it empty when the picture is decoration. An empty `alt` still shows the picture.
- `x` and `y` are the distance from that corner. Any CSS length works (`1.5rem`, `24px`). A blank `x` or `y` uses `1.5rem`.
- `maxwidth` and `maxheight` are the largest that corner's picture is allowed to be. The layout also keeps the picture outside the middle column, so the size you see is the smaller of that cap and the free space in the corner. A file smaller than the slot stays at its own size. A larger file is shrunk to fit, keeping its proportions. The picture is never scaled up. A blank `maxwidth` or `maxheight` uses `24rem`.
- The elements are `layouts/partials/backdrop.html`. The rules are `static/css/backdrop.css`. They sit outside `#page-root`, next to the player, so same-site navigation leaves them in place. Include that partial after `#page-root` on any new layout, the same way the player partial is included.

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

Remote is **`personal`** → `littlepriests/comeholyghost`. There is no separate `develop` branch — **`preview` is develop**.

| Command | What it does |
| --- | --- |
| `corn branch` | Fetch; merge `main` into local `preview`; create `update-MMDDYY` (or `-2`, …) from `preview`. |
| `corn add` | Same preview←main sync; stay on / create an `update-*` branch; stage; **prompt for commit message**; `git push -u` so the remote feature branch exists (PR base = `preview`). |
| `corn push` | Push current branch; open or reuse a PR **into `preview`**. |
| `corn deploy` | If `preview` is ahead of `main` **and checks are green**, open/merge the release PR `preview` → `main`. `--pr-only` stops before merge; `--dry-run` prints intent. |

You still **merge feature PRs into `preview` in GitHub** yourself. `corn deploy` only promotes already-merged preview work to production when checks pass — it does not auto-merge feature branches.

**PR base must be `preview`.** GitHub’s default compare URL targets `main` (the default branch). Prefer `corn push`, or open `compare/preview...<branch>?expand=1`. Cadence: land many feature PRs on `preview` through the month; one `corn deploy` (`preview` → `main`) when you want production.

**Vale CI:** `.github/workflows/vale.yml` runs Vale on `content/` for PRs/pushes (added lines only). It posts a check with annotations; it does **not** fail the job yet (house-style lowercase still looks like spelling errors). Local: `corn edit`.

### Do Deploy Previews burn credits?

**The deploy itself: no.** On credit-based plans, Netlify lists Deploy Previews and branch deploys as **0 credits** (same for failed deploys). Production publishes are what cost 15 credits each.

**Still metered if you use them:** visiting a preview URL still counts **bandwidth** and **web requests**; hitting Functions still counts **compute**. Light self-checks are cheap; don’t load-test previews.

**Netlify UI:** keep Production branch = `main`. Optionally enable **branch deploys** for `preview` → stable URL like `preview--<site>.netlify.app` (also 0 deploy credits). PR Deploy Previews stay on by default.

`netlify.toml` already uses a separate build command for deploy-preview / branch-deploy (no newsletter auto-send). Keep `NEWSLETTER_AUTO_SEND` on **production** only.

**Metered APIs on preview:** builds bake `CONTEXT` into the page. On `deploy-preview` / `branch-deploy`, the browser **skips** `/api/visitors`, `/api/guestbook`, and `/api/subscribe` (local fallbacks / “preview only” messages). Functions also no-op Blobs/Resend if something still hits them. Production is unchanged. Static page views still count as normal web requests/bandwidth.

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
| `NEWSLETTER_AUTO_SEND` | `1` when you want deploys to broadcast **net-new** posts |

Optional local: same vars in a gitignored `.env` for `netlify dev` / `--send`.

### Behavior

- **Subscribe:** adds the contact to the segment; sends `emails/welcome.html` once (skipped if they were already on the list).
- **New posts:** `scripts/newsletter-on-deploy.mjs` runs after Hugo. First run **seeds** a ledger with every existing post (nothing historical is emailed). Later deploys broadcast only slugs not yet in the ledger via Resend **Broadcasts** (not transactional `/emails`). Skip a post with front matter `newsletter = false`.
- **Ledger:** Netlify Blobs store `newsletter` / key `sent` on deploy; locally `.newsletter-sent.json` (gitignored).

### Design / preview

```bash
corn email
```

(or `npm run emails:preview`) Rebuilds `emails/preview/`. Open `emails/preview/index.html`. Edit `emails/welcome.html` / `emails/post.html`, re-run. Post template placeholders: `{{TITLE}}` `{{DATE}}` `{{SUMMARY}}` `{{PERMALINK}}` `{{HERO_BLOCK}}` `{{BODY}}`; leave `{{{RESEND_UNSUBSCRIBE_URL}}}` for Broadcasts.

```bash
npm run newsletter:dry    # list what would send
npm run newsletter:send -- --slug my-post   # force one (needs Resend env)
```

## Player

One chrome: HTML `<audio>` owns play / pause / stop / skip / auto-next and survives SPA navigations. Homepage pins that bar in `.home-player-slot` beside the visitor ticker (CSS anchor, JS fallback). Desktop inner pages keep the same bar fixed bottom-right, with Grundo (`grundo-idle`) above the controls; play / pause / stop / skip briefly plays `grundo-kick`. Mobile inner pages use the same bar without Grundo. Stop hides the bar for a green ♡ (no autoplay on reopen). A ↑ back-to-top control hangs under the chrome once you’ve scrolled (~160px). Long titles scroll inside a fixed slot (`is-marquee`). The player lives outside `#page-root`. Same-site link clicks swap `#page-root` and leave the player in place. A new tab, an external link, or a page with no `#page-root` loads a fresh document and the music stops.

Files:

- `layouts/partials/player.html` — icon buttons and Grundo
- `static/css/player.css` — position and look
- `static/js/player.js` — playlist load, playback, and the page swap
- `static/audio/playlist.json` — local fallback list (`[]` until you add tracks or point the fetch at a remote list)

Every layout that should keep music playing must wrap its page in `<div id="page-root">` and include `{{ partial "player.html" . }}` after that wrapper. Those layouts today are `layouts/index.html`, `layouts/_default/baseof.html`, `layouts/_default/gallery.html`, and `layouts/_default/guestbook.html`.

## Playlist

The player loads a JSON list, then sets the audio source to each track's `src`.

```json
[
  { "title": "Hello", "src": "/audio/hello.mp3" }
]
```

`title` is the label on the button row. `src` is the file the browser plays. Local fallback ships as `[]`. The fetch is hardcoded in `static/js/player.js`:

```js
fetch("/audio/playlist.json")
```

Change that URL when the list lives somewhere else. Track `src` values can be absolute (`https://…`) or site-relative (`/audio/…`).

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

In `static/js/player.js`, the load line is:

```js
fetch("/audio/playlist.json")
```

Change the address inside the quotes to your playlist URL:

```js
fetch("http://192.168.1.20:8080/playlist.json")
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
