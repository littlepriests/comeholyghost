---
name: personal-site
description: >-
  Workflow and hard boundaries for this personal Hugo site (agent prompting /
  frontend experiments). Use when editing this repo, syncing from or writing
  zips to akristen/proj-zip, regenerating package-lock.json, deploying via
  Netlify zip upload, or when employer/docs skills might otherwise leak in.
  Never apply freshness, ENGDOCS, docs-data, or other company skills here.
---

# Personal site (local → zip → proj-zip)

This workspace is a **personal** Hugo + Netlify playground for practicing
agent-driven frontend work and prompting. It is not a work/docs project and
must stay isolated from employer clones and company skills.

Maintainer detail for visuals/player/sprites lives in `docs/resources.md` and
`.cursor/rules/site-resources.mdc`. Blog authoring (front matter, shortcodes,
video) is `docs/posting.md`; making sprite strips is `docs/sprites.md`. Prefer
those over inventing new patterns.

## Hard isolation (non-negotiable)

- **Do not** open, edit, search, commit, push, or reference employer/docs repos
  (docs site, docs clones under Documents, ENGDOCS, freshness trackers, etc.).
- **Do not** load or follow company/docs skills (`docs-data`, `freshness-*`,
  `docs-accuracy`, `docs-coverage`, `engdocs-jira-backlog`, etc.) while in
  this workspace.
- **Do not** treat `package-lock.json` / `npm` here as work npm. This lockfile
  is only for this site’s Netlify deps (`@netlify/blobs` and friends) from
  **public** `registry.npmjs.org`. Never point npm at a private/work registry
  or copy a work lockfile into this tree.
- Site source of truth for transfer is the private zip dump
  [`akristen/proj-zip`](https://github.com/akristen/proj-zip) — not a site git
  remote, and not any employer remote.

## Working model

1. Edit **only** under this local folder (`personal-development`).
2. Keep work local until the user asks to package or upload.
3. When asked to ship/backup: zip this tree, then put the zip into
   `akristen/proj-zip` (replace `personal-development.zip` or the name the
   user specifies). Do not invent a public site remote.

### Zip contents

Include source the site needs to build/deploy. Exclude:

- `node_modules/`
- `scripts/node_modules/`
- `public/`
- `resources/_gen/`
- `.hugo_build.lock`
- `.git/` (unless the user explicitly wants it)

Keep `package.json` and `package-lock.json` in the zip when Netlify functions
are in play.

### Pull updated code from proj-zip

When the user says a new zip landed in `proj-zip`:

1. List `akristen/proj-zip` contents/commits; pick the newest relevant zip
   (confirm name if several).
2. Download and extract to a temp folder under `Projects` (not inside employer
   doc paths).
3. Replace this local tree’s tracked/source files with the zip contents,
   preserving `.git` if present and not wiping unrequested local-only notes
   unless the user said “replace everything.”
4. Reinstall deps with public npm if `package-lock.json` changed:
   `npm ci` or `npm install` from this repo root only.

### Push local changes as a zip

When the user asks to zip / update proj-zip:

1. Build `personal-development.zip` (or requested name) next to this folder.
2. Upload/update the file in `akristen/proj-zip` via `gh api` (private repo).
3. Do not push this working tree to employer remotes; this folder typically has
   **no** deploy git remote.

## npm / lockfile (this site only)

- Registry: `https://registry.npmjs.org` only.
- Project `.npmrc` (repo root + `scripts/.npmrc`) forces that registry so a
  machine `~/.npmrc` aimed at a private registry cannot rewrite `resolved`
  URLs in lockfiles here. Do not delete those files.
- If a lockfile `resolved` field is not `registry.npmjs.org`, delete the lock
  and regenerate with `npm install --package-lock-only` from this repo.
  Never import a work lockfile.
- `package.json` currently tracks Netlify Blobs for the guestbook function;
  treat that as personal-site infra, not company tooling.

## Dev / deploy notes

- Local preview: `hugo server -D --disableFastRender --navigateToChanged`
  → http://localhost:1313/
- Shared guestbook needs Netlify Functions/Blobs (`netlify/`, `netlify.toml`);
  plain Hugo falls back to local-only storage.
- Do not put API tokens, Plex/Symphony paths, or secrets into `content/` or
  `static/`. Owner secrets stay out of published folders (see resources docs).

## Agent posture

- Prefer heftier frontend experiments the user asks for; match existing
  GeoCities-meets-restraint vibe from `docs/resources.md`.
- Do not start backlog items in `docs/resources.md` unless explicitly asked.
- When unsure whether a path or skill belongs to employer/docs work, skip it
  and stay in this repo + `proj-zip`.
