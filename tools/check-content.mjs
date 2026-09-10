#!/usr/bin/env node
/*
  tools/check-content.mjs — verifies every chapter page against assets/js/chapters.js
  (single source of truth, HANDBOOK §4 + D-018). Dev-only, Node built-ins only.
  Checks: folder + index.html exist per slug; data-slug matches; one <section>
  per syllabus section with the right id, h2 text "n.k Title", and data-demo
  name; <title> contains the chapter title; no extra sections. Exit 1 on any
  mismatch, printing each one.
*/
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

globalThis.window = {};
await import(pathToFileURL(resolve("assets/js/chapters.js")).href);
const chapters = globalThis.window.chapters;
const problems = [];
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

for (const c of chapters) {
  const file = `chapters/${c.slug}/index.html`;
  if (!existsSync(file)) { problems.push(`${file}: missing`); continue; }
  const html = readFileSync(file, "utf8");
  if (!html.includes(`data-slug="${c.slug}"`)) problems.push(`${file}: data-slug is not ${c.slug}`);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  if (!decode(title).includes(c.title)) problems.push(`${file}: <title> lacks "${c.title}"`);
  const sections = [...html.matchAll(/<section class="section" id="([^"]+)"[\s\S]*?<h2 id="[^"]+">([^<]*)<\/h2>[\s\S]*?data-demo="([^"]+)"/g)];
  if (sections.length !== c.sections.length) problems.push(`${file}: ${sections.length} sections in HTML, ${c.sections.length} in chapters.js`);
  c.sections.forEach((s, i) => {
    const got = sections[i];
    if (!got) return;
    if (got[1] !== s.id) problems.push(`${file}: section ${i + 1} id ${got[1]} ≠ ${s.id}`);
    if (decode(got[2]) !== `${s.number} ${s.title}`) problems.push(`${file}: h2 "${decode(got[2])}" ≠ "${s.number} ${s.title}"`);
    if (got[3] !== s.demo) problems.push(`${file}: data-demo ${got[3]} ≠ ${s.demo}`);
  });
}
const slugs = new Set(chapters.map((c) => c.slug));
if (slugs.size !== chapters.length) problems.push("duplicate slugs in chapters.js");
for (const f of ["index.html", "about.html"]) if (!existsSync(f)) problems.push(`${f}: missing`);

// The chapter header and nav are baked into each page so they do not arrive after
// first paint (D-039). They must still say exactly what chapters.js says, or a reader
// would see one title and the tab another.
const core = chapters.filter((c) => c.tier === "core");
for (const c of chapters) {
  if (c.tier !== "core" && c.tier !== "advanced") problems.push(`chapters.js: ${c.slug} has no valid tier`);
  if (c.tier === "core" && c.branchOf !== null) problems.push(`chapters.js: core chapter ${c.slug} must have branchOf null`);
  if (c.tier === "advanced" && !chapters.some((x) => x.number === c.branchOf)) problems.push(`chapters.js: ${c.slug} branches off a chapter that does not exist`);
}
if (core.length !== 13) problems.push(`chapters.js: ${core.length} core chapters, the trail expects 13`);

for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  const file = `chapters/${c.slug}/index.html`;
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  const header = (html.match(/<header class="chapter__header"[^>]*>([\s\S]*?)<\/header>/) || [])[1];
  if (!header || !header.trim()) { problems.push(`${file}: chapter header is not baked into the HTML`); continue; }
  const kicker = `Chapter ${c.number} \u00b7 ${c.book ? "OpenStax " + c.book : "Advanced Concepts"}`;
  if (!header.includes(kicker)) problems.push(`${file}: baked kicker is not "${kicker}"`);
  const h1 = (header.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
  if (decode(h1) !== c.title) problems.push(`${file}: baked <h1> "${decode(h1)}" \u2260 "${c.title}"`);
  const blurb = (header.match(/<p class="chapter__blurb">([^<]*)<\/p>/) || [])[1] || "";
  if (decode(blurb) !== c.blurb) problems.push(`${file}: baked blurb differs from chapters.js`);
  c.sections.forEach((sec) => {
    const link = `<a href="#${sec.id}">${sec.number} ${sec.title}</a>`;
    if (!header.includes(link)) problems.push(`${file}: baked section link missing or wrong for ${sec.number}`);
  });
  const nav = (html.match(/<nav class="chapter__nav"[^>]*>([\s\S]*?)<\/nav>/) || [])[1];
  if (!nav || !nav.trim()) { problems.push(`${file}: chapter nav is not baked into the HTML`); continue; }
  // Trail order, not chapter numbering (D-040): a core chapter sits between its
  // core neighbours, and an advanced chapter offers the way back to its branch point.
  let prevText, prevHref, nextText, nextHref;
  if (c.tier === "advanced") {
    const back = chapters.find((x) => x.number === c.branchOf);
    if (!back) { problems.push(`${file}: branchOf ${c.branchOf} matches no chapter`); continue; }
    prevText = `\u2190 Back to the trail: ${back.number}. ${back.title}`;
    prevHref = `../${back.slug}/index.html`;
    nextText = "All chapters \u2192";
    nextHref = "../../index.html";
  } else {
    const t = core.indexOf(c);
    const prev = t > 0 ? core[t - 1] : null;
    const next = t < core.length - 1 ? core[t + 1] : null;
    prevText = prev ? `\u2190 ${prev.number}. ${prev.title}` : "\u2190 All chapters";
    nextText = next ? `${next.number}. ${next.title} \u2192` : "All chapters \u2192";
    prevHref = prev ? `../${prev.slug}/index.html` : "../../index.html";
    nextHref = next ? `../${next.slug}/index.html` : "../../index.html";
  }
  if (!decode(nav).includes(prevText)) problems.push(`${file}: baked previous link is not "${prevText}"`);
  if (!decode(nav).includes(nextText)) problems.push(`${file}: baked next link is not "${nextText}"`);
  if (!nav.includes(`href="${prevHref}"`)) problems.push(`${file}: baked previous href is not ${prevHref}`);
  if (!nav.includes(`href="${nextHref}"`)) problems.push(`${file}: baked next href is not ${nextHref}`);
}

// The journey path is baked into index.html for the same reason (D-039/D-040): the
// trail order and the branch points must match chapters.js exactly, or the picture of
// the prerequisite chain would disagree with the data that defines it.
{
  const landing = readFileSync("index.html", "utf8");
  const path = (landing.match(/<div id="chapters"[^>]*>([\s\S]*?)\n    <\/div>/) || [])[1];
  if (!path || !path.trim()) problems.push("index.html: the journey path is not baked into the HTML");
  else {
    const steps = (path.match(/<li class="journey__step">/g) || []).length;
    if (steps !== core.length) problems.push(`index.html: ${steps} trail steps baked, ${core.length} core chapters in chapters.js`);
    const nodes = (path.match(/<a class="node node--/g) || []).length;
    if (nodes !== chapters.length) problems.push(`index.html: ${nodes} nodes baked, ${chapters.length} chapters in chapters.js`);
    if (!path.includes("<h2>Core Concepts</h2>")) problems.push("index.html: the trail is not headed \"Core Concepts\"");
    if (!/Advanced Concepts branch off/.test(path)) problems.push("index.html: the path does not name Advanced Concepts");
    for (const c of chapters) {
      const href = `chapters/${c.slug}/`;
      if (!path.includes(`<a class="node node--${c.tier}" href="${href}">`)) problems.push(`index.html: node missing or wrong tier for ${c.slug}`);
      const word = c.tier === "core" ? "Core" : "Advanced";
      if (!path.includes(`<span class="node__kicker">Chapter ${c.number} \u00b7 ${word}</span>`)) problems.push(`index.html: node kicker wrong for ${c.slug}`);
      if (!decode(path).includes(`<span class="node__title">${c.title}</span>`)) problems.push(`index.html: node title wrong for ${c.slug}`);
      if (!decode(path).includes(c.blurb)) problems.push(`index.html: node blurb differs from chapters.js for ${c.slug}`);
    }
    for (const c of core) {
      const branches = chapters.filter((x) => x.branchOf === c.number);
      if (branches.length && !path.includes(`branch off ${c.title}"`)) problems.push(`index.html: branch group not labelled for ${c.slug}`);
    }
    if (/progress|completed|locked|streak/i.test(path)) problems.push("index.html: the path must carry no progress state (SPEC section 3)");
  }
}

// Every page carrying KaTeX delimiters must load KaTeX, or the reader sees raw LaTeX.
// about.html shipped "\((n+1)p\)" without the library until the Phase 19 sweep (D-034).
for (const f of ["index.html", "about.html", ...chapters.map((c) => `chapters/${c.slug}/index.html`)]) {
  if (!existsSync(f)) continue;
  const html = readFileSync(f, "utf8");
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  if (/\\\(|\\\[/.test(body) && !/katex/.test(html)) problems.push(`${f}: math delimiters but KaTeX is not loaded`);
}

// The "\u00a7" glyph never appears in site copy (D-044); pages cite "Section x.y".
for (const f of ["index.html", "about.html", ...chapters.map((c) => `chapters/${c.slug}/index.html`)]) {
  if (!existsSync(f)) continue;
  const body = readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  if (body.includes("\u00a7")) problems.push(`${f}: the "\u00a7" glyph appears in site copy`);
}

if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
console.log(`content check: ${chapters.length} chapters, ${chapters.reduce((n, c) => n + c.sections.length, 0)} sections, all consistent`);
