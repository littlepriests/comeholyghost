# Site resources

Private notes for the site owner and agents. This file is not a Hugo page. Do not move it into `content/` or `static/`. Hugo publishes those folders. Visitors should not see this.

The dev server is `hugo server -D --disableFastRender --navigateToChanged` from the repo root, at http://localhost:1313/.

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
| `--bg` (`--base00`) | `#181818` | Page background |
| `--off-bg` (`--base01`) | `#282828` | Article panel, guestbook entries, the fallback player box |
| `--inner-bg` (`--base02`) | `#383838` | Banner frame, form fields, code blocks, gallery tile backing |
| `--muted` (`--base03`) | `#585858` | Borders, timestamps, empty-state text |
| `--off-fg` (`--base04`) | `#b8b8b8` | Aside, footer, intro text, code text |
| `--fg` (`--base05`) | `#d8d8d8` | Body text |
| `--base06` | `#e8e8e8` | Syntax highlighting |
| `--base07` | `#f8f8f8` | Syntax highlighting |
| `--base08` | `#ab4642` | Guestbook error text |
| `--base09` | `#dc9656` | Syntax highlighting |
| `--highlight` (`--base0A`) | `#f7ca88` | Visitor-count digits, selected text |
| `--logo` (`--base0B`) | `#a1b56c` | Site-title chip |
| `--hover` (`--base0C`) | `#86c1b9` | Link hover |
| `--link` (`--base0D`) | `#7cafc2` | Links |
| `--base0E` | `#ba8baf` | Syntax highlighting |
| `--base0F` | `#a16946` | Syntax highlighting |

Two paints are not in the palette. The visitor-count background is `#111` in `assets/css/home.css`. The starter banner SVG has its own fills (`#282828` frame, `#7cafc2` dashed stroke, `#f8f8f8` title, `#b8b8b8` caption). Replacing the SVG replaces those colors. Editing the palette does not.

## Dimensions

Sizes the layout actually uses. `1rem` is 16px unless the browser's default font size has been changed.

- Cursor image: 32×32. Hotspot `x` and `y` are pixels from the top left. The starter arrow is `0` `0`.
- Banner file: the starter SVG is 1200×280. On the page it fills the homepage column, which is at most 40rem wide, and its height follows the picture, capped at 16rem. The empty frame is at least 8rem tall.
- Homepage writing column: at most 38rem wide, centered under the banner. That is about 60 characters of the monospace face, which is the reading width the column keeps.
- Inner pages: the page is at most 53rem wide, so it stays between the corner pictures. At 45rem and wider, the right column is 15rem with a 2rem gap, which leaves the article about 36rem. The skin sits in that column. Below 45rem the column stacks under the article and the skin sits at the bottom right.
- Gallery tiles: 9.5rem square. Each thumb is cropped to 600×600 before it is shown.
- Guestbook: below 45rem the column is at most 40rem. At 45rem and wider the page uses the same 53rem middle column as the other inner pages, with the 15rem right column, so the form stays to the left of the skin and between the corner pictures.
- Winamp skin: a classic main window is 275×116. This site stacks the main window, the equalizer, and the playlist, so the unscaled stack is 275×348. On screen the width is 15rem, or the viewport minus 2rem when that is smaller, and the height scales with the width. After the skin loads, `static/js/player.js` measures the open windows and writes `--skin-box-width` and `--skin-box-height`. The homepage visitor count centers on that measured box, so a different skin does not need a new offset.
- Favicon slots the theme already looks for, if you add the files under `static/`: `favicon.ico`, `favicon-32x32.png` (32×32), `favicon-16x16.png` (16×16), and `apple-touch-icon.png` (180×180 is the usual size). None of those files are in the repo right now.
- Backdrop: each corner's cap is `maxwidth` and `maxheight`, both `24rem` (384px) right now. On screen the picture is smaller whenever it needs to stay outside the middle column. Each starter file is drawn at the cap, 384×384: `static/images/backdrop-bottom-right.svg`, `backdrop-bottom-left.svg`, `backdrop-top-right.svg`, and `backdrop-top-left.svg`. A replacement can be any size up to that corner's cap. A larger file is shrunk to fit. A smaller file stays at its own pixel size.

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

- `banner` is a path under `static/`. The starter is `static/images/banner.svg`.
- `bannerAlt` is the image description.
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

- `icon` is a Font Awesome 6 class (`fa-brands fa-github`, `fa-solid fa-envelope`) or an Academicons class (`ai ai-orcid`). Both stylesheets are already loaded from the theme head.
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

## Background image

Each corner of the window can hold its own picture. The pictures stay fixed while you move between pages. The middle column is held between them: the homepage stack is at most 40rem, and inner pages are at most 53rem (`--middle-column` in `static/css/player.css`). Corner pictures use the space outside that column. They also shrink on a short window so about 20rem of vertical room stays between the top and bottom pictures. They never grow past `maxwidth` and `maxheight`, and a file smaller than the slot stays at its own size.

The article on an inner page stays about 36rem beside the 15rem right column. That is a normal line length for the monospace face. The homepage writing stays 38rem. When the window is too narrow for both the column and the pictures, the pictures shrink first. The column keeps its width until the window itself is narrower.

The banner, the header, the writing column, the right column, and the footer are painted solid. Where a picture still meets one of those panels, the panel covers it. Text is drawn on those solid panels.

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

## Player

The player is a Winamp skin. On the homepage it sits in the footer, beside the visitor count, and the count is centered on the skin's measured height. On every other page it sits in the right column. The audio element lives outside `#page-root`. Same-site link clicks swap `#page-root` and leave the audio element in place, so the track keeps playing. A new tab, an external link, or a page with no `#page-root` loads a fresh document and the music stops.

Files:

- `layouts/partials/player.html` — the buttons
- `static/css/player.css` — position and look
- `static/js/player.js` — playlist load, playback, and the page swap
- `static/audio/playlist.json` — the current list
- `static/audio/tone-a.wav` and `tone-b.wav` — dummy tones for local testing

Every layout that should keep music playing must wrap its page in `<div id="page-root">` and include `{{ partial "player.html" . }}` after that wrapper. Those layouts today are `layouts/index.html`, `layouts/_default/baseof.html`, `layouts/_default/gallery.html`, and `layouts/_default/guestbook.html`.

## Playlist

The player loads a JSON list, then sets the audio source to each track's `src`.

```json
[
  { "title": "Tone A", "src": "/audio/tone-a.wav" },
  { "title": "Tone B", "src": "/audio/tone-b.wav" }
]
```

`title` is the label on the button row. `src` is the file the browser plays. The fetch is hardcoded in `static/js/player.js`:

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

`mp3` is the format to use. The `.wav` files in `static/audio/` are only the local dummy tones.

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

Save. Hugo rebuilds on save. Reload the site, press Play, and the label should be the first `title` from your file. Skip should play the second track. Moving from the homepage to Blog should keep the song going, the same as it does with the dummy tones.

The local dummy files can stay in `static/audio/`. The player ignores them once it is fetching the other list.

#### 7. Add a track later

1. Put the new `mp3` in the served folder.
2. Open the folder in the browser, click the file, and copy the address.
3. Add an object to `playlist.json` in the spot where it should play. Keep the commas valid.
4. Reload the site. The player reads the file on each visit. You do not rebuild the media server for a playlist edit.

The site will not notice a file that is only dropped in the folder. Something has to add it to `playlist.json`. That can be you, or a small script on the media server that rewrites the JSON from the directory. The site cannot list the directory for you.

#### If a song or the list asks you to log in

The playlist URL and each song URL need to open in a private browser window where you are not logged in. If they ask for a password, every visitor would hit that wall too. A password or token stored in this repo is visible to anyone who loads the page. Prefer a folder that does not need a login. Plex and Symphony can keep their own logins for your apps. The web folder for this site is separate.
