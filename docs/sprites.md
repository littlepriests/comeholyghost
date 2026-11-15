# Making a sprite for this site (beginner guide)

You do **not** need to write animation code. The site already knows how to play a sprite. Your job is only:

1. Get art (usually a big sheet from [The Spriters Resource](https://www.spriters-resource.com/)).
2. Turn **one animation** into a single **horizontal strip** PNG.
3. Tell Hugo the strip’s size in `hugo.toml`.
4. Drop `{{< sprite "your-id" >}}` in a post.

If that sounds opaque, start with **What you’re making**, then pick **Path A (by hand)** or **Path B (repo slicer)**.

Fan-use / personal-site assets only. Game publishers own the characters. Don’t claim the art as yours; don’t sell it.

---

## What you’re making

### The big sheet (input)

Spriters Resource usually gives you something like this — many poses on one PNG, often with bright lime or colored gutters:

```text
┌──────┬──────┬──────┬──────┐
│ walk1│ walk2│ walk3│ walk4│   ← one animation (a “row”)
├──────┼──────┼──────┼──────┤
│ atk1 │ atk2 │ atk3 │ atk4 │   ← a different animation
├──────┼──────┼──────┼──────┤
│ idle1│ idle2│ …           │
└──────┴──────┴──────┴──────┘
```

You only care about **one** animation at a time (one row of related frames).

### The horizontal strip (output)

This site wants **one file per animation**, frames in a single line, left → right:

```text
[ frame1 ][ frame2 ][ frame3 ][ frame4 ]
```

Rules for that file:

| Rule | Why |
| --- | --- |
| Frames sit in **one row** | The CSS slides sideways; a second row is never shown |
| Every frame uses the **same width and height** (the “cell”) | So the slide lines up on each pose |
| Background is **transparent** | No white/lime boxes around the character |
| File lives under `static/images/sprites/` | Hugo can serve it |

Example that already works: `static/images/sprites/skifree-yeti.png` is 9 frames. Each cell is 32×43 pixels, so the whole PNG is **288×43** (`32 × 9` wide, `43` tall).

### How the site plays it

Imagine a tiny window the size of **one cell**. The long strip sits behind that window. Every fraction of a second the strip jumps left by exactly one cell width — that’s the animation.

You describe the window in `hugo.toml`:

- `frameWidth` / `frameHeight` = size of one cell  
- `frames` = how many cells in the strip  
- `fps` = how fast it advances  

**Must match the PNG:**  
`frameWidth × frames` = image width in pixels  
`frameHeight` = image height in pixels  

Wrong numbers → mashed / half-a-frame animation. That’s the #1 beginner mistake.

---

## Words you’ll see

| Term | Meaning |
| --- | --- |
| **Sheet** | The big downloaded PNG with many animations |
| **Strip** | The cooked one-row PNG this site uses |
| **Frame / cell** | One pose; one “slot” in the strip |
| **Frame size** | Width × height of every cell (e.g. 32×43) |
| **fps** | Frames per second (4–8 feels fine for most pixel walks) |
| **scale** | Optional 2× or 3× enlargement when you *display* the sprite (doesn’t change the PNG) |
| **id** | Short name you invent (`my-walk`) used in shortcodes and config |

---

## Tools (pick one)

| Tool | Cost | Good for |
| --- | --- | --- |
| **[GIMP](https://www.gimp.org/)** | Free | Path A on Windows with no pixel-art app |
| **[Aseprite](https://www.aseprite.org/)** | Paid (or compile free) | Path A if you already like pixel tools |
| **Photoshop** | Paid | Same idea as GIMP |
| **Repo slicer** (`scripts/slice-*.mjs`) | Free (Node) | Path B when the sheet matches an existing script |

You also need a text editor for `hugo.toml` and (for Path B) Node.js.

---

## Path A — cut a strip by hand (no coding)

Use this when you’re new, or the sheet doesn’t match an existing slicer.

### A1. Download the sheet

1. Open [The Spriters Resource](https://www.spriters-resource.com/).
2. Find the game → character → sheet you want.
3. Download the PNG. Keep a note of the sheet ID / game name for your own credits.
4. Optional: copy it into `assets-src/sprites/` as e.g. `my-character-sheet.png` so it lives with the project (raw sheets are not published — only the finished strip under `static/images/sprites/` is).

### A2. Open it and zoom in

1. Open the PNG in GIMP (or Aseprite / Photoshop).
2. Zoom until you can see individual pixels (`View → Zoom`).
3. Find **one** animation: a sequence of the same character changing pose (walk cycle, attack, yeti eating, …). Ignore other rows for now.

### A3. Decide the cell size

Every frame in *this* strip must share one width and one height.

**Easy case — neat grid**

The sheet already divides poses with even boxes. Measure one box:

- In GIMP: select one frame with the Rectangle Select tool; the size appears in the pointer / tool options (width × height).
- Write those numbers down — that is your `frameWidth` and `frameHeight`.

**Uneven case — common on TSR**

Frames are different widths (one pose has a bigger sword swing). Then:

1. Find the **widest** frame’s width → use that as `frameWidth`.
2. Find the **tallest** frame’s height → use that as `frameHeight`.
3. When you paste each pose into the strip, center it horizontally and align **feet to the bottom** of the cell so the character doesn’t bounce when playing.

Example: poses are ~28–32 wide and ~40–43 tall → pick cell **32×43**.

### A4. Create the empty strip canvas

If you have **4** frames at **32×43**:

- New image width = `32 × 4` = **128**
- New image height = **43**
- Fill = **Transparency** (not white)

In GIMP: `File → New…` → set width/height → fill with transparency.

### A5. Copy each frame into the strip

For frame number `i` (starting at 0):

1. On the **sheet**, carefully select that pose (include the whole character; exclude lime gutters and neighboring poses).
2. Copy.
3. On the **strip**, paste as a new layer (or into the same layer).
4. Move it so it sits in the cell starting at x = `i × frameWidth`  
   - Frame 0 → x = 0  
   - Frame 1 → x = 32  
   - Frame 2 → x = 64  
   - …
5. If the paste is smaller than the cell, nudge it so feet sit on the bottom edge of the cell.

Tips:

- Turn on a grid: spacing = `frameWidth` horizontally (GIMP: `Image → Configure Grid…`, then `View → Show Grid`).
- Delete / erase any leftover white or lime pixels around the character so they become transparent.
- Don’t resize with “smooth” scaling — keep **nearest neighbor** / none if you enlarge for editing; export at 1× pixel size.

### A6. Export the strip

1. Merge / flatten only if you still have transparency.
2. Export as PNG, e.g. `my-walk.png`.
3. Save it to:

```text
static/images/sprites/my-walk.png
```

### A7. Measure once to double-check

Open the exported file’s properties (or GIMP’s title bar / Image → Scale Image read-only size):

- Width should be `frameWidth × frames`
- Height should be `frameHeight`

If not, fix the canvas before registering in Hugo.

Then jump to **Register the sprite** below.

---

## Path B — use a repo slicer (semi-automatic)

The scripts under `scripts/slice-*.mjs` already know how to:

- ignore TSR-style background / lime lines (per sheet),
- find rows of content,
- pack frames into a horizontal strip with shared cell size,
- write PNGs under `static/images/sprites/`.

They are **not** a universal “any TSR download” button. Each script is tuned to one sheet layout.

| Script | Expects this file | Writes |
| --- | --- | --- |
| `scripts/slice-misdreavus.mjs` | `assets-src/sprites/misdreavus-sheet.png` | `misdreavus.png` |
| `scripts/slice-kagura.mjs` | `assets-src/sprites/kagura-sheet.png` | `kagura-walk`, `kagura-down`, `kagura-attack` |
| `scripts/slice-sango.mjs` | `assets-src/sprites/sango-sheet.png` | `sango-idle`, `sango-boomerang`, `sango-attack` |
| `scripts/slice-skifree.mjs` | `assets-src/sprites/skifree-sheet.png` | `skifree-yeti` |
| `scripts/slice-grundo.mjs` | `assets-src/sprites/grundo-sheet.png` | `grundo-idle`, `grundo-kick` |

### B1. Install the dependency once

From the repo root:

```bash
npm install pngjs --prefix scripts
```

### B2. Drop the sheet where the script looks

Put the downloaded PNG at the path in the table (same filename the script opens).

### B3. Run it

```bash
node scripts/slice-skifree.mjs
```

Watch the console: it prints row sizes and `wrote static/images/sprites/….png …`.

### B4. Copy the numbers into Hugo

The script logs `frameWidth`, height, and frame count (and writes a small `*.json` meta log to `assets-src/sprites/meta/`, which is not published; `hugo.toml` is the source of truth). Use those values in `hugo.toml` (existing SkiFree / Sango / Kagura / Misdreavus entries are already filled in).

### B5. New character / new sheet?

1. Copy the closest `slice-*.mjs`.
2. Change the input filename.
3. Adjust which rows become which ids (the filters near the bottom of each script).
4. You may need to tweak the `isBg` color test if the sheet uses different gutter colors.
5. Run, inspect the PNGs, then register new `[[params.sprites]]` blocks.

If that feels like too much code for a first sprite, use **Path A** once; you can automate later.

---

## Register the sprite

Open `hugo.toml` and add a block (anywhere near the other `[[params.sprites]]` entries):

```toml
[[params.sprites]]
id = "my-walk"
src = "images/sprites/my-walk.png"
frameWidth = 32
frameHeight = 43
frames = 4
fps = 8
alt = "my walk cycle"
```

| Field | What to put |
| --- | --- |
| `id` | Your short name (letters, numbers, hyphens). Used in shortcodes |
| `src` | Path under `static/` — **no** leading `static/` |
| `frameWidth` | Cell width in pixels |
| `frameHeight` | Cell height in pixels |
| `frames` | Number of cells in the strip |
| `fps` | Playback speed (try 4–10; lower = slower / choppier on purpose) |
| `alt` | Accessibility label |
| `scale` | Optional default `2` or `3` if you always want it enlarged |

Save the file.

---

## Show it on the site

In any markdown page (e.g. a blog post):

```
{{< sprite "my-walk" >}}
```

Or larger:

```
{{< sprite id="my-walk" scale="3" >}}
```

Put each sprite on its **own line** with a blank line between them so they don’t visually stack.

Then run:

```bash
hugo server -D --disableFastRender --navigateToChanged
```

Open the page. You should see the animation loop.

Unknown `id` → a visible placeholder with the id text (means Hugo config typo or server needs refresh).

Live examples: the site nav, footer, homepage dock, and player use these ids (see `hugo.toml`).

---

## Checklist

- [ ] One animation only in the PNG (not a full multi-row sheet)
- [ ] Transparent background
- [ ] Equal cell sizes; strip width = cell width × frame count
- [ ] File in `static/images/sprites/`
- [ ] `[[params.sprites]]` matches the real pixel size
- [ ] `{{< sprite "id" >}}` uses that same `id`
- [ ] Previewed with `hugo server`

---

## Common problems

| What you see | Likely cause | Fix |
| --- | --- | --- |
| Frames look cut in half / sliding wrong | `frameWidth` or `frames` doesn’t match the PNG | Re-measure image; fix `hugo.toml` |
| White or lime boxes around the character | Background not removed | Erase gutters to transparency; re-export |
| Character bounces up and down | Frames aligned to top or mixed baselines | Align all poses to the **bottom** of the cell |
| Several sprites piled on one spot | Many scaled sprites in one paragraph | One shortcode per paragraph; article CSS also adds margins for `scale` |
| Placeholder text instead of art | Wrong `id` or missing config | Match `hugo.toml` `id`; restart / hard-refresh |
| Huge blurry pixels when scaled | Editor smoothed the art | Export 1× nearest-neighbor; use shortcode `scale`, don’t upsample the PNG |
| Animation too fast / slow | `fps` | Lower fps to slow down |

---

## What you never need to remake

These are already shared for every sprite:

- `layouts/shortcodes/sprite.html`
- `layouts/partials/sprite.html`
- `assets/css/sprites.css`

Per new animation you only add: **strip PNG** + **`[[params.sprites]]`** + **shortcode call**.

Homepage dock pets (Sango / Kagura) and the Misdreavus nav button are separate wiring in layouts / `home.js`. Inline post sprites only need the steps above.

---

## Related

- Shortcodes + posting workflow: `docs/posting.md`
- Existing slicers / ids / fan-use notes: `docs/resources.md` → Sprite animations