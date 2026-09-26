# Notes site

A small static site that turns a folder of HTML notes into a browsable website,
auto-generating the home page and per-subject index every time you deploy.

## How it works

- `notes/<subject-slug>/*.html` — your real notes, one folder per subject.
- `build.js` — scans that folder and generates the full site into `public/`
  (home page, one index page per subject, and your notes with a small nav bar added).
- `netlify.toml` — tells Netlify to run `node build.js` on every deploy and
  publish the `public/` folder.

Because the build runs automatically on every deploy, **you never edit the
website by hand** — you only ever add files under `notes/`.

## Adding a new note

1. Put the `.html` file in `notes/<subject-slug>/`, e.g.
   `notes/testing-and-verification/04-regression-testing.html`.
2. Commit and push to GitHub.
3. Netlify picks up the push, runs the build, and the new note appears on the
   site automatically — no manual index editing.

The note's title on the index page comes from its `<title>` tag (or first
`<h1>`, or the filename if neither is present).

## Adding a new subject

1. Create a new folder under `notes/`, e.g. `notes/operating-systems/`.
2. Optionally add a `meta.json` inside it:
   ```json
   { "title": "Operating Systems", "description": "Notes on OS concepts" }
   ```
   Without this file, the folder name is used as the title (e.g.
   `operating-systems` → "Operating Systems").
3. Add your `.html` notes to that folder and push.

## One-time setup: connect to GitHub + Netlify

1. **Create a GitHub repo** and push this project to it:
   ```bash
   git init
   git add .
   git commit -m "Initial notes site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. **On Netlify:** "Add new site" → "Import an existing project" → connect
   your GitHub repo.
3. Netlify should auto-detect the settings from `netlify.toml`:
   - Build command: `node build.js`
   - Publish directory: `public`
4. Deploy. You'll get a `*.netlify.app` URL (you can add a custom domain
   later in Netlify's site settings).

From then on, every `git push` to `main` triggers a new Netlify build and the
live site updates automatically within a minute or so.

## Running locally

```bash
node build.js
npx serve public
```

## Included sample content

This project ships with a `testing-and-verification` subject containing 3
placeholder notes so you can see the system working end to end. Replace
those 3 files with your real notes (same filenames or new ones — either is
fine), or delete them and add your own.
