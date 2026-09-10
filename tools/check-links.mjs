#!/usr/bin/env node
/*
  tools/check-links.mjs — broken-link check for the static site (HANDBOOK §7.5 / Phase 14).
  Walks every .html file, resolves each href/src that is relative, and verifies the
  target file exists and, for "#fragment" links, that the target page defines the id
  (including ids that site.js generates: chapter sections and the landing #chapters).
  External http(s) links are HEAD-checked unless --offline. Exit 1 on any problem.
*/
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const offline = process.argv.includes("--offline");
const root = process.cwd();
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p); else if (name.endsWith(".html")) pages.push(p);
  }
})(root);

const idsOf = new Map();
function ids(file) {
  if (!idsOf.has(file)) {
    const html = readFileSync(file, "utf8");
    const set = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    if (/data-site-header/.test(html)) set.add("chapters");   // rendered by site.js on the landing page
    idsOf.set(file, set);
  }
  return idsOf.get(file);
}

const problems = [], external = new Set();
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(mailto:|javascript:|data:)/.test(url)) continue;
    if (/^https?:\/\//.test(url)) { external.add(url); continue; }
    const [path, fragment] = url.split("#");
    let target = page;
    if (path) {
      target = resolve(dirname(page), path);
      if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
      if (!existsSync(target)) { problems.push(`${relative(root, page)}: ${url} → missing file`); continue; }
    }
    if (fragment && target.endsWith(".html") && !ids(target).has(fragment)) problems.push(`${relative(root, page)}: ${url} → no id "${fragment}" in ${relative(root, target)}`);
  }
}
if (!offline) {
  for (const url of external) {
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (!res.ok) problems.push(`external ${url} → HTTP ${res.status}`);
    } catch (e) { problems.push(`external ${url} → ${e.message}`); }
  }
}
if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
console.log(`check-links: ${pages.length} pages, ${external.size} external URLs${offline ? " (not fetched)" : ""}, all links resolve`);
