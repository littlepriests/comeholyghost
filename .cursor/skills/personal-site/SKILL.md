---
name: personal-site
description: >-
  Workflow and hard boundaries for this personal Hugo site (agent prompting /
  frontend experiments). Use when editing this repo, syncing with
  littlepriests/comeholyghost, optional proj-zip backup, regenerating
  package-lock.json, Netlify deploy, or when employer/docs skills might
  otherwise leak in. Never apply freshness, ENGDOCS, docs-data, or other
  company skills here.
---

# Personal site (git → littlepriests/comeholyghost)

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
- **Do not** run Docker, Docker Compose, or private container registries from
  this tree. Do not copy `~/.docker`, work kube configs, or work tokens into
  the project. Do not `gh auth login` / switch to the personal GitHub account
  as this machine’s default — git uses a **repo deploy key** via the
  `github.com-personal` SSH host alias.
- **Do not** leave Cursor `Co-authored-by` / `Made-with: Cursor` trailers on
  commits. Repo `.githooks/commit-msg` strips them; also keep Cursor Settings →
  Git & PRs → Attribution (commit + PR) off for this machine if possible.
<<<<<<< HEAD
- Site source of truth is the private GitHub repo
  [`littlepriests/comeholyghost`](https://github.com/littlepriests/comeholyghost)
  on branch `main`, remote name **`personal`**. Optional backup only:
=======
-   Site source of truth is the private GitHub repo
  [`littlepriests/comeholyghost`](https://github.com/littlepriests/comeholyghost)
  on branch `main`. Git remote name is machine-specific: **`personal`** on
  thinkpad (`corn … --thinkpad`), **`origin`** on aura (`corn … --aura`);
  bare ship commands prompt. Optional backup only:
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
  [`akristen/proj-zip`](https://github.com/akristen/proj-zip). Never add an
  employer remote.

## Working model

1. Edit **only** under this clone (`comeholyghost`).
2. Ship via **`preview`** (integration) → **`main`** (production). Prefer:
   `corn branch` → edit → `corn add` → `corn push` → merge the PR into
   `preview` on GitHub → when ready, `corn deploy` (promotes `preview` →
<<<<<<< HEAD
   `main` only if checks are green). Do not push straight to `main` for
   day-to-day work.
3. Keep work GitHub (`gh`, default `github.com` SSH) as the machine default.
   Pushes here must use `git@github.com-personal:littlepriests/comeholyghost.git`
   (deploy key). Do not force-push `main` unless the user explicitly asks.
=======
   `main` only if checks are green). Pass `--thinkpad` or `--aura` on those
   git commands (or answer the prompt). Do not push straight to `main` for
   day-to-day work.
3. On thinkpad, keep work GitHub (`gh`, default `github.com` SSH) as the
   machine default; site pushes use
   `git@github.com-personal:littlepriests/comeholyghost.git` (deploy key,
   remote name `personal`). On aura, standard `origin` → github.com is fine.
   Do not force-push `main` unless the user explicitly asks.
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3
4. Optional backup: when asked to zip / update proj-zip, build a zip and upload
   via `gh api` — that path is backup, not the primary ship loop.

### Ship checks (before commit/push)

- Lockfile `resolved` URLs are all `registry.npmjs.org` (no private registry).
- No `.env`, tokens, `*.pem`, docker/kube configs, or work credentials staged.
<<<<<<< HEAD
- Remotes: only `personal` → littlepriests/comeholyghost (plus none from work).
=======
- Remotes: thinkpad `personal` or aura `origin` → littlepriests/comeholyghost
  (plus none from work).
>>>>>>> 55e89f4566953d7c84d0ad767b1721fe205d0ec3

### Zip contents (optional backup)

Include source the site needs to build/deploy. Exclude:

- `node_modules/`
- `scripts/node_modules/`
- `public/`
- `resources/_gen/`
- `.hugo_build.lock`
- `.git/` (unless the user explicitly wants it)

Keep `package.json` and `package-lock.json` in the zip when Netlify functions
are in play.

## npm / lockfile (this site only)

- Registry: `https://registry.npmjs.org` only.
- Project `.npmrc` (repo root + `scripts/.npmrc`) forces that registry so a
  machine `~/.npmrc` aimed at a private registry cannot rewrite `resolved`
  URLs in lockfiles here. Do not delete those files.
- If a lockfile `resolved` field is not `registry.npmjs.org`, delete the lock
  and regenerate with `npm install --package-lock-only` from this repo.
  Never import a work lockfile.
- `package.json` currently tracks Netlify Blobs for the guestbook and visitor-count functions;
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
  and stay in this repo (+ optional proj-zip backup).
