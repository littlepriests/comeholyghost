+++
title = "posting demo (dummy)"
date = 2026-11-09
summary = "living example of front matter, photo / figcaption / photo-grid, sprites, buttons, and a youtube embed — delete when you have enough real posts."
index_image = "filler.webp"
index_caption = "dummy cover"
back_to_top = true
[[resources]]
src = "filler.webp"
title = "Dummy filler"
+++

Throwaway post that exercises the shortcodes documented in `docs/posting.md`. Safe to delete.

Omit `toc = true` unless you want an “On this page” list in the aside. Omit `[[buttons]]` unless you want a labeled button row after the body — this demo uses `back_to_top` (⌃) instead.

## photo — medium thumb, click to enlarge

{{< photo src="filler.webp" caption="filler · photo shortcode" />}}

Caption can also be **markdown** in the shortcode body:

{{< photo src="filler.webp" alt="filler alt" >}}Optional caption with **emphasis**{{< /photo >}}

## figcaption — full width, no lightbox

{{< figcaption src="filler.webp" caption="filler · figcaption (full column)" />}}

## photo-grid — grouped thumbs

### three-up

{{< photo-grid caption="filler · three" >}}
filler.webp
filler.webp
filler.webp
{{< /photo-grid >}}

### four-up

{{< photo-grid caption="filler · four" >}}
filler.webp
filler.webp
filler.webp
filler.webp
{{< /photo-grid >}}

## sprites

Inline strips from `[[params.sprites]]` in `hugo.toml`. Put each on its own line — `scale` uses CSS `transform`, so jammed neighbors used to paint over each other.

{{< sprite "misdreavus" >}}

{{< sprite id="kagura-walk" scale="3" >}}

{{< sprite id="sango-idle" scale="3" >}}

{{< sprite id="skifree-yeti" scale="3" >}}

(`skifree-yeti` is the yeti **eating** the skier — that colorful figure is part of the strip, not a second shortcode.)

## button (inline)

Body shortcode only (no front-matter button row on this post):

{{< button text="read-me" url="/read-me/" icon="fa-solid fa-heart" >}}

## youtube

Hugo built-in — pass the video **id**, not the full URL:

{{< youtube ZJthWmvUzzc >}}

## plain markdown image

No lightbox (prefer `photo` for gallery-style posts):

![plain markdown image of filler](filler.webp)
