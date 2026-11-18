# Posting blog posts (multimedia)

How to write and ship a post on this site: folder layout, front matter, shortcodes, sprites, and video. Maintainer chrome (player, stars, Netlify) lives in `docs/resources.md` — this file is for **content**.

Do not put secrets, API tokens, or private paths in `content/` or `static/`. Those folders publish.

## Quick start

1. Create `content/blog/<slug>/` (example: `content/blog/crossroad-beauty/`).
2. Add `index.md` with front matter + markdown body.
3. Drop images (and optional local video files) in that same folder.
4. Run `hugo server -D` from the repo root and open `/blog/` then `/blog/<slug>/`.

Minimal post:

```toml
+++
title = "my post title"
date = 2026-11-10
summary = "one or two sentences for the writing index card."
index_image = "cover.png"
index_caption = "optional caption under the index thumb"
+++

Opening paragraph.

{{< photo src="cover.png" caption="cover" />}}
```

## Folder layout

```text
content/blog/<slug>/
  index.md                 # required
  cover.png                # page resource (preferred for post images)
  more-shots.png
  clip.mp4                 # optional local video (see Videos)
```

- **Page resources** = files next to `index.md`. Reference them by filename in shortcodes (`src="cover.webp"`).
- **`assets/` paths** (`src="images/nongrid/photo.webp"`) are processed with the post photos and the original is not published. Shared pictures that should not join the photobook live in `assets/images/nongrid/`.
- **`static/` paths** are copied as-is (`src="images/foo.webp"` → `static/images/foo.webp`). Use that only for a file that should be served unchanged.
- Photobook (`/gallery/`) auto-picks **image** page resources from every blog post. If it should appear in the photobook, put it in the post folder.

### Image size

Drop one JPEG or WebP in the post folder, at about 1600px on the long side. That file stays in git and is not published (`publishResources = false`). `layouts/partials/image-set.html` publishes the copies the layout uses: AVIF first, WebP as the fallback. A single photo is 480 and 1200 on the page and 1600 on click. A grid tile is 480 and 800. A gallery tile is a 480 square. The click-to-expand file is the 1600 copy.

A commit refuses a file whose long edge is over 2000px or whose size is over 1.5MB. Export a smaller copy. `corn compress content/blog/your-post` can do that resize (long edge 2000, WebP q82). It is optional. It is not the quality setting for the site. `--force` re-encodes a file that was already compressed and can soften it. Use `--dry-run` first.

### Corn CLI (Writer vs Ship)

Same `corn` binary; two machine profiles:

| Profile | Machine | Commands |
| --- | --- | --- |
| **Writer** | personal / writing | `run`, `edit`, `md`, `compress`, `email` |
| **Ship** | deploy / git+Netlify box | Writer cmds + `update`, `branch`, `add`, `push`, `deploy` |

One-time install (PowerShell, any cwd):

```text
powershell -File scripts/install-corn.ps1
. $PROFILE
npm install --prefix scripts
corn help
```

Without install: from the repo root `.\corn help` or `node scripts\corn.mjs help`.

A commit checks staged images under `content/`. A file over 2000px on the long edge, or over 1.5MB, stops the commit. Smaller files pass with nothing to do.

Writing-index (`/blog/`) preview: shows the picture with `object-fit: contain` (no crop/stretch). The card image is 480 and 1200 from `image-set.html`. On-page max width and height live in `assets/css/blog-index.css`. Adjust those when a card looks too big or too small — details in `docs/resources.md`.

### Local preview (`corn run`)

```text
corn run
```

Runs `hugo server -D --disableFastRender --navigateToChanged` from the repo root → http://localhost:1313/. Extra Hugo flags pass through (`corn run --bind 0.0.0.0`).

`corn run --cache` deletes `resources/_gen` (and `.hugo_build.lock` if present), then starts the server with `--ignoreCache` — use after stale processed images or a weird local preview.

### Prose lint (`corn edit`)

Vale (`vale.ini` + `styles/wraith`) plus `tools/be-density` (be-verb share). Requires `vale` on PATH. **Only markdown under `content/`** — never `docs/` or the rest of the repo.

```text
corn edit                         # prompt: content/blog/<name> + Vale picker
corn edit --all                   # all content/**/*.md + picker
corn edit --report --blog/post    # report-only Vale (no picker)
corn edit --read-me.md            # content/read-me.md
corn edit --blog/your-post        # that post folder
corn edit content/blog/your-post  # same (must stay under content/)
```

First run may `vale sync` package styles. Flags: `--all`, `--vale-only`, `--density-only`, `--skip-sync`, `--report` (report-only). `--fix` / `--review` still work but are the default.

Default `corn edit` walks alerts that have a Vale `Action` (replace / edit / suggest / …), prompts per alert, and writes chosen fixes into the markdown. Keys: `y`/`Enter` apply, `1–N` pick, `n` skip once, `i` ignore that match for the rest of the run (all repeats; for spelling, possessives share the stem — `amaral` also ignores `amaral's`, but not bare plural `amarals`, and not non-spelling/grammar alerts), `a` accept into the batch Vale list (`styles/config/vocabularies/Batch/accept.txt`, committed with the PR, cleared on `preview` by `corn deploy` after that batch is on `main`), `p` accept into the permanent Site list (`styles/config/vocabularies/Site/accept.txt`), `q` quit. Needs a real terminal (TTY); use `--report` otherwise.

`corn edit` drops spelling alerts that only differ by case (`illinois` vs `Illinois`) so house-style lowercase isn’t treated as a typo. Real misspellings still flag.

### Markdown structure (`corn md`)

`markdownlint-cli2` (config: `.markdownlint-cli2.yaml`) plus an 80-column prose wrap that leaves Hugo shortcodes, front matter, fences, tables, lists, headings, HTML/`<pre>`/braille ASCII, and markdown links/URLs alone. **Only `content/`.** Style/spelling stay with `corn edit` — `corn md --fix` does **not** open the Vale picker.

Whitespace / lists (fixable with `--fix`): unordered markers are `-`, nested lists indent with 2 spaces (no tabs), strip stray trailing spaces (exactly two spaces still OK for a hard break), collapse extra blank lines, one space after list markers.

```text
corn md                         # prompt: content/blog/<name>
corn md --all                   # lint all content/**/*.md
corn md --blog/your-post
corn md --fix --blog/your-post  # wrap to 80 + markdownlint --fix (not Vale)
corn md --wrap-only …
corn md --lint-only …
corn md --dry-run --fix …
```

## Front matter

TOML between `+++` fences (YAML `---` also works). Fields this site cares about:

| Field | Required | What it does |
| --- | --- | --- |
| `title` | yes | Article `<h1>` and writing-index link |
| `date` | yes | Sort order + date line on `/blog/` |
| `summary` | strongly recommended | Teaser on `/blog/` under the thumb. **Not** the article body — if omitted, the index card has no teaser (body stubs like `soon!` will not leak onto `/blog/`) |
| `index_image` | strongly recommended | Filename (or `static/` path) for the writing-index image (full-size up to Fit/CSS caps — see `docs/resources.md` **Writing-index thumbnails**) |
| `index_caption` | no | Caption under that image (falls back to resource `title`) |
| `description` | no | Fallback teaser if `summary` is empty; also used in some asides |
| `index_summary` | no | Extra fallback teaser name |
| `draft` | no | `true` — not built on Netlify / normal `hugo` (only with `hugo server -D` or `-D` builds). Soft “hide from the site.” |
| `hide_date` | no | `true` hides the date in the article aside. Keep `date` in front matter for `/blog/` sort order and the writing-index card |
| `sword_figure` | no | Read-me: centered stabbed-girl hero + ♡ fountain before the h1; clicking it opens the mailto from `[params.about] email` |
| `toc` | no | **Off by default.** Set `toc = true` only if you want “On this page” in the aside. Omit it (or `false`) to hide the ToC |
| `author` | no | Optional byline in the aside |
| `[[buttons]]` | no | **Off by default.** Each `[[buttons]]` block adds one labeled link after the body. Delete those blocks to drop the row |
| `[_build]` | no | Hugo build options — unlisted / never render (see **Hide a post** below) |
| `[[resources]]` | no | Optional metadata for a page resource (e.g. `title` used as caption fallback) |

### Hide the aside date

Keep `date = …` (needed for sorting). Add:

```toml
hide_date = true
```

That drops only the aside date line. The writing-index card still shows the date unless you change that template later.

### Hide a post from the site

| Goal | Front matter |
| --- | --- |
| Work in progress; invisible on Netlify | `draft = true` (preview locally with `hugo server -D`) |
| Unlisted: page builds at its URL, but not on `/blog/` (or other lists); photobook won’t pick its images via the blog listing either | `[_build]` → `list = "never"` |
| Gone: no HTML page at all | `[_build]` → `list = "never"` and `render = "never"` |

Unlisted example:

```toml
+++
title = "secret notes"
date = 2026-11-10
[_build]
list = "never"
+++
```

Fully excluded example:

```toml
+++
title = "parked"
date = 2026-11-10
draft = true
[_build]
list = "never"
render = "never"
+++
```

Deleting the folder also works. Prefer `draft` for WIPs you still edit locally.

### Drop the ToC

Do nothing — ToC only appears when you set:

```toml
toc = true
```

Remove that line (or set `toc = false`) and the aside list is gone.

### Drop the bottom button row

Those links are **only** from front matter, e.g.:

```toml
[[buttons]]
title = "guestbook"
url = "/guestbook/"
icon = "fa-solid fa-book"
```

Delete every `[[buttons]]` block on the page. The inline `{{< button ... >}}` shortcode is separate and only appears where you place it in the markdown.

There is no per-page back-to-top control. The player's ↑ is the same on every page.

Example resource title:

```toml
[[resources]]
src = "weaving-infinite-gold.png"
title = "Amaral Gold"
```

### Writing index (`/blog/`)

The list is a feed of cards (not infinite scroll, not paginated tabs). Each card reads that post’s front matter: title → date → centered thumb + caption → summary. Thumbnails stay small; click opens the lightbox, title opens the post.

## Markdown body

Normal Hugo markdown: headings, lists, links, emphasis, blockquotes, code fences, footnotes.

Headings render with `#` / `##` prefixes (theme). `h1` is gold; `h2+` are link blue.

Raw HTML in markdown works when you need it, but prefer shortcodes for pictures so framing + lightbox stay consistent.

## Shortcodes (site-specific)

All live under `layouts/shortcodes/`. Styles: `assets/css/article-media.css`. Lightbox: `assets/js/article-media.js`.

Self-closing form is fine when there is no inner body: `{{< photo src="x.png" />}}`.

### `photo` — medium thumb, click to enlarge

```
{{< photo src="weaving-infinite-gold.png" caption="Amaral Gold" />}}
{{< photo src="shot.png" alt="Alt text" tip="fun hover" >}}Caption with **markdown**{{< /photo >}}
```

| Param | Notes |
| --- | --- |
| `src` | Required. Page resource name or `static/`-relative path. Positional `{{< photo "file.png" >}}` works |
| `caption` | Under the image; plain form becomes `alt` if `alt` is omitted |
| `alt` | Explicit alt text |

### `figcaption` — same as `photo`

Kept as a name only. It renders the same figure as `photo` (one size, centered, click to enlarge), through `layouts/partials/article-photo.html`.

```
{{< figcaption src="wide.png" caption="installation view" />}}
```

### `photo-grid` — grouped thumbs

One image path per line. Optional shared `caption=` (Fira Mono, same as body).

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

Tiles use center-crop (`object-fit: cover`) so odd aspect ratios are not stretched. Click any tile → lightbox.

Live example: `content/blog/crossroad-beauty/index.md`.

### `sprite` — animated pixel strips

IDs must match `[[params.sprites]]` in `hugo.toml`.

```
{{< sprite "misdreavus" >}}
{{< sprite id="kagura-walk" scale="3" >}}
```

Registered ids (today):

- `misdreavus`
- `kagura-walk`, `kagura-down`, `kagura-attack`
- `sango-idle`, `sango-attack`, `sango-boomerang`
- `skifree-yeti`
- `grundo-idle`, `grundo-kick`

`scale` is optional (`2` or `3`). Unknown ids render a visible missing marker.

Put each sprite on its **own line** (blank line between shortcodes). `scale` uses CSS `transform`, which enlarges the paint without growing the layout box by itself — article CSS adds margins so neighbors don’t stack, but separate paragraphs are still clearer.

Homepage dock pets / Misdreavus nav are **not** this shortcode — those are wired in layouts + `home.js`. Use `sprite` inside post bodies when you want a strip inline.

### Adding a new sprite

Full beginner guide (what a strip is, GIMP/Aseprite step-by-step, repo slicers, Hugo config, troubleshooting): **[`docs/sprites.md`](sprites.md)**.

Short version: cook a horizontal strip PNG → `static/images/sprites/` → add `[[params.sprites]]` in `hugo.toml` → `{{< sprite "id" >}}`. You do not remake CSS/JS.

### `button` — labeled link in the body

```
{{< button text="guestbook" url="/guestbook/" icon="book" >}}
```

`icon` is optional: short name (`book`, `heart`, `github`, …) or legacy `fa-solid fa-book` (mapped). Inline SVG — no Font Awesome CDN.

Or attach a row after the whole post via front matter (`[[buttons]]` — omit entirely if you don’t want it).

## Videos

### YouTube / Vimeo (Hugo built-ins)

Hugo’s built-in shortcodes work in posts:

```
{{< youtube ZJthWmvUzzc >}}
{{< vimeo_simple 48912912 >}}
```

- YouTube: pass the **video id** (the part after `v=`), not the full URL.
- Prefer `vimeo_simple` / privacy-friendly variants when you care about cookies; see [Hugo shortcodes](https://gohugo.io/content-management/shortcodes/) and privacy config if embeds are blocked or empty.
- Only `[privacy.x]` is set in this repo’s `hugo.toml` today; add `[privacy.youtube]` / `[privacy.vimeo]` if you harden embeds later.

### Local / self-hosted video

No custom video shortcode yet. Options:

1. Put `clip.mp4` (and optional poster still) in the post folder or under `static/`, then use markdown/HTML:

```html
<video controls playsinline preload="metadata" poster="poster.jpg">
  <source src="clip.mp4" type="video/mp4">
</video>
```

If the file is a **page resource**, Hugo may rewrite relative URLs depending on how you reference it — when in doubt use a `static/` path like `/video/clip.mp4` → `static/video/clip.mp4`.

2. Host elsewhere and link, or use YouTube/Vimeo as above.

Keep files small; giant uploads hurt Netlify deploys and first paint.

## Images that are not shortcodes

Plain markdown images work and behave exactly like `photo`:

```markdown
![alt text](cover.png "optional caption")
```

An image on its own line goes through the same partial as `photo` (`layouts/partials/article-photo.html`), so it is the same size, centered, and opens the lightbox. The quoted title becomes the caption. This needs `wrapStandAloneImageWithinParagraph = false` in `hugo.toml`.

An image inside a sentence stays inline at text height (`.inline-media`), with no lightbox.

Raw `<img>` in HTML opts out of all of this. It only gets `max-width: 100%`.

## Checklist before you publish

- [ ] `title`, `date`, `summary`, `index_image` set
- [ ] Images live in the post folder (or intentional `static/` paths)
- [ ] Captions/alt text written where it matters
- [ ] `/blog/` card looks right (thumb + summary, not the raw body stub)
- [ ] Article page: photos/grids/sprites/videos render; lightbox opens
- [ ] Photobook: new images show if they are blog page-resource images
- [ ] No secrets in the markdown or committed assets

## Preview & ship

Local:

```bash
hugo server -D --disableFastRender --navigateToChanged
```

Ship via `corn branch` → `corn add` → `corn push` → merge into `preview` → `corn deploy` (see the personal-site skill). Optional zip / proj-zip is backup only.

## Related

- Site chrome, player, sprites slicing, Netlify: `docs/resources.md`
- Real post using photo + photo-grid: `content/blog/crossroad-beauty/index.md`
