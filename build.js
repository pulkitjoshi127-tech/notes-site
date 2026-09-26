// build.js
// Scans notes/<subject>/*.html and generates the full public/ site:
//   public/index.html                 -> list of subjects
//   public/notes/<subject>/index.html -> list of notes in that subject
//   public/notes/<subject>/<file>.html -> the note itself (with a small nav bar added)
//   public/assets/style.css           -> shared stylesheet
//
// Run automatically by Netlify on every deploy (see netlify.toml).
// To add a note: drop an .html file into notes/<subject>/ and push to git.

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const NOTES_DIR = path.join(ROOT, "notes");
const PUBLIC_DIR = path.join(ROOT, "public");

function slugToTitle(slug) {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractTitle(html, fallback) {
  const m = html.match(/<title>([^<]*)<\/title>/i) || html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  return m ? m[1].trim() : fallback;
}

function readSubjectMeta(subjectDir, slug) {
  const metaPath = path.join(subjectDir, "meta.json");
  if (fs.existsSync(metaPath)) {
    try {
      return JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch (e) {
      console.warn(`Could not parse ${metaPath}, using defaults`);
    }
  }
  return { title: slugToTitle(slug), description: "" };
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function page({ title, crumb, bodyHtml, depth }) {
  const prefix = "../".repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>
<div class="wrap">
${crumb ? `<p class="crumb">${crumb}</p>` : ""}
${bodyHtml}
<footer class="site">Auto-generated from the notes/ folder. Updated on every deploy.</footer>
</div>
</body>
</html>`;
}

function buildHome(subjects) {
  ensureDir(PUBLIC_DIR);
  const items = subjects.length
    ? `<ul class="index-list">
${subjects
  .map(
    (s, i) => `      <li><a href="notes/${s.slug}/">
        <span class="num">${String(i + 1).padStart(2, "0")}</span>
        <span class="name">${s.meta.title}</span>
        <span class="meta">${s.notes.length} ${s.notes.length === 1 ? "note" : "notes"}</span>
      </a></li>`
  )
  .join("\n")}
    </ul>`
    : `<p class="empty">No subjects yet. Add a folder under <code>notes/</code> to get started.</p>`;

  const html = page({
    title: "Notes",
    crumb: "",
    depth: 0,
    bodyHtml: `<header class="site">
    <h1>Notes</h1>
    <span class="tagline">A running set of study notes</span>
  </header>
  ${items}`,
  });
  fs.writeFileSync(path.join(PUBLIC_DIR, "index.html"), html);
}

function buildSubjectIndex(subject) {
  const dir = path.join(PUBLIC_DIR, "notes", subject.slug);
  ensureDir(dir);
  const items = subject.notes.length
    ? `<ul class="index-list">
${subject.notes
  .map(
    (n, i) => `      <li><a href="${n.file}">
        <span class="num">${String(i + 1).padStart(2, "0")}</span>
        <span class="name">${n.title}</span>
      </a></li>`
  )
  .join("\n")}
    </ul>`
    : `<p class="empty">No notes in this subject yet.</p>`;

  const html = page({
    title: subject.meta.title,
    crumb: `<a href="../../">Home</a>`,
    depth: 2,
    bodyHtml: `<h1>${subject.meta.title}</h1>
  ${subject.meta.description ? `<p class="subject-count">${subject.meta.description}</p>` : `<p class="subject-count">${subject.notes.length} ${subject.notes.length === 1 ? "note" : "notes"}</p>`}
  ${items}`,
  });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

function copyNoteWithNav(subject, note) {
  const srcPath = path.join(NOTES_DIR, subject.slug, note.file);
  const destPath = path.join(PUBLIC_DIR, "notes", subject.slug, note.file);
  let html = fs.readFileSync(srcPath, "utf8");

  const nav = `<div class="note-nav"><a href="../../../">Home</a> &nbsp;/&nbsp; <a href="../">${subject.meta.title}</a></div>`;
  const fontLink = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:wght@600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="../../../assets/style.css">`;

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${fontLink}`);
  } else {
    html = `<head>${fontLink}</head>` + html;
  }

  if (/<body[^>]*>/i.test(html)) {
    html = html.replace(/<body[^>]*>/i, (m) => `${m}\n${nav}`);
  } else {
    html = nav + html;
  }

  fs.writeFileSync(destPath, html);
}

function main() {
  if (fs.existsSync(PUBLIC_DIR)) {
    fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
  }
  ensureDir(PUBLIC_DIR);

  // copy shared assets
  ensureDir(path.join(PUBLIC_DIR, "assets"));
  fs.copyFileSync(
    path.join(ROOT, "assets", "style.css"),
    path.join(PUBLIC_DIR, "assets", "style.css")
  );

  if (!fs.existsSync(NOTES_DIR)) {
    console.log("No notes/ directory found, generating empty home page.");
    buildHome([]);
    return;
  }

  const subjectSlugs = fs
    .readdirSync(NOTES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const subjects = subjectSlugs.map((slug) => {
    const subjectDir = path.join(NOTES_DIR, slug);
    const meta = readSubjectMeta(subjectDir, slug);
    const noteFiles = fs
      .readdirSync(subjectDir)
      .filter((f) => f.endsWith(".html"))
      .sort();

    const notes = noteFiles.map((file) => {
      const html = fs.readFileSync(path.join(subjectDir, file), "utf8");
      return { file, title: extractTitle(html, slugToTitle(file.replace(/\.html$/, ""))) };
    });

    return { slug, meta, notes };
  });

  for (const subject of subjects) {
    ensureDir(path.join(PUBLIC_DIR, "notes", subject.slug));
    buildSubjectIndex(subject);
    for (const note of subject.notes) {
      copyNoteWithNav(subject, note);
    }
  }

  buildHome(subjects);

  const totalNotes = subjects.reduce((sum, s) => sum + s.notes.length, 0);
  console.log(`Built ${subjects.length} subject(s), ${totalNotes} note(s) into public/`);
}

main();
