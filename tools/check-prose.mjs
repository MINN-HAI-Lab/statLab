#!/usr/bin/env node
/*
  tools/check-prose.mjs — plain-English and footnote audit of chapter section texts
  (SPEC §8, SYLLABUS site-wide conventions, Phase 14 copy edit). Dev-only.
  For every built section (a section with a demo script wired) it reports: word count
  (SPEC: 50–150), sentences over 25 words, colons and semicolons inside sentences, a missing "Reading:" citation, the first use
  of a sample SD/variance or quantile in a chapter without a footnote, and a few idioms
  from a short blocklist. --strict exits 1 on any finding; otherwise it is a report.
*/
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const strict = process.argv.includes("--strict");
const IDIOMS = ["in a nutshell", "at the end of the day", "piece of cake", "rule of thumb", "ballpark", "hit the nail", "long story short", "needless to say", "last but not least"];
const findings = [], report = [];
for (const slug of readdirSync("chapters").sort()) {
  const file = join("chapters", slug, "index.html");
  const html = readFileSync(file, "utf8");
  if (!/demos\.init\w+\(/.test(html)) continue;   // chapter not built yet
  const sections = [...html.matchAll(/<section class="section" id="(section-\d+)"[\s\S]*?<h2[^>]*>([^<]*)<\/h2>([\s\S]*?)<div class="section__demo/g)];
  let sdFootnoted = false, quantileFootnoted = false;
  for (const [, id, title, body] of sections) {
    // A display formula ends the sentence that introduces it, so it becomes a boundary
    // marker (¶) rather than a word. Without this, every "…is given by \[…\] The next
    // sentence…" reads as one 40-word sentence and the length check cries wolf (D-034).
    let text = body.replace(/\\\[[\s\S]*?\\\]/g, " ¶ ").replace(/\\\([\s\S]*?\\\)/g, " F ").replace(/<sup>\d+<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
    const readingIdx = text.indexOf("Reading:");
    const mainText = text.replace(/\b\d (Standard deviations|Quantiles|The sample variance|The SD of sample means|s divides|F divides)[^]*$/, "").split("Reading:")[0].trim();
    const words = mainText.split(/\s+/).filter(Boolean).length;
    const sentences = mainText.split(/(?<=[.!?])\s+(?=[A-Z“])|\s*¶\s*/).map((s) => s.trim()).filter(Boolean);
    const long = sentences.filter((s) => s.split(/\s+/).length > 25);
    const line = `${slug}/${id} "${title}": ${words} words, ${sentences.length} sentences, longest ${Math.max(...sentences.map((s) => s.split(/\s+/).length))}`;
    report.push(line);
    if (words < 50 || words > 150) findings.push(`${slug}/${id}: ${words} words (SPEC §8 asks 50–150)`);
    if (readingIdx < 0) findings.push(`${slug}/${id}: no "Reading:" citation`);
    long.forEach((s) => findings.push(`${slug}/${id}: ${s.split(/\s+/).length}-word sentence: "${s.slice(0, 70)}…"`));
    // Section text reads as plain sentences. A colon or semicolon inside one is nearly
    // always a sentence that wants splitting, so it is reported (D-046). Labels like
    // "Reading:" sit outside mainText and are not affected.
    const semis = (mainText.match(/;/g) || []).length;
    if (semis) findings.push(`${slug}/${id}: ${semis} semicolon${semis > 1 ? "s" : ""} in section text — split the sentence instead`);
    const colons = (mainText.match(/\w: /g) || []).length;
    if (colons) findings.push(`${slug}/${id}: ${colons} mid-sentence colon${colons > 1 ? "s" : ""} in section text — split the sentence instead`);
    IDIOMS.forEach((idiom) => { if (mainText.toLowerCase().includes(idiom)) findings.push(`${slug}/${id}: idiom "${idiom}"`); });
    const usesSd = /sample (standard deviation|variance)|\bs\b divides|SD of sample means|sample SD|Sample variance/i.test(body.replace(/<[^>]+>/g, " ")) || /\\\(s\\\)/.test(body) || /\bs\^2|\bs\/\\sqrt|\bs\\,/.test(body);
    const hasSdNote = /n - 1|n−1|n − 1/.test(body);
    if (usesSd && !sdFootnoted) { if (!hasSdNote) findings.push(`${slug}/${id}: first use of a sample SD/variance in this chapter has no n − 1 footnote`); sdFootnoted = true; }
    const usesQuantile = /quartile|median|quantile/i.test(body);
    const hasQNote = /Weibull|\(n\+1\)p|\(n \+ 1\)p|n\+1\)/.test(body);
    if (/quartile/i.test(body) && !quantileFootnoted) { if (!hasQNote) findings.push(`${slug}/${id}: first use of quartiles in this chapter has no Weibull footnote`); quantileFootnoted = true; }
  }
}
console.log(report.join("\n"));
if (findings.length) { console.log("\nFindings:\n" + findings.join("\n")); if (strict) process.exit(1); }
else console.log("\ncheck-prose: no findings");
