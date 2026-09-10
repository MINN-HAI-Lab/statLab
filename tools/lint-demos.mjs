#!/usr/bin/env node
/*
  tools/lint-demos.mjs — mechanical checks for demo files (D-019, D-021). Dev-only.
  1. Init order: any `var NAME = {…}` / `[…]` declared AFTER the first ui.chart( call
     and referenced inside render() is flagged — frame.onResize renders synchronously
     during setup, when such a var is still undefined.
  2. Header: the file starts with a comment naming its SYLLABUS section and init function.
  3. One global: only `window.demos` is assigned.
  Exit 1 on any finding.
*/
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "assets/js/demos";
const problems = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith(".js")).sort()) {
  const src = readFileSync(join(dir, file), "utf8");
  const path = join(dir, file);
  if (!/^\/\*[\s\S]*?SYLLABUS §\d+\.\d+[\s\S]*?demos\.init\w+\(/.test(src)) problems.push(`${path}: header comment must name the SYLLABUS section and the init function`);
  const globals = [...src.matchAll(/window\.(\w+)\s*=[^=]/g)].map((m) => m[1]).filter((g) => g !== "demos");
  if (globals.length) problems.push(`${path}: assigns globals other than demos: ${globals.join(", ")}`);
  // render() first runs inside the first frame.onResize(...) registration; any init-scope
  // (4-space indented) table declared after that point is still undefined at that moment.
  // The first render fires at the first onResize registration in EXECUTION order: either the
  // first literal `.onResize(` or the first call to a local helper whose body registers one
  // (a helper defined lower in the file can render earlier than its source position).
  const triggers = [src.search(/\.onResize\(/)].filter((i) => i >= 0);
  for (const fn of src.matchAll(/\n    function (\w+)\(/g)) {
    const bodyStart = fn.index, bodyEnd = src.indexOf("\n    }", bodyStart);
    if (bodyEnd < 0 || !src.slice(bodyStart, bodyEnd).includes(".onResize(")) continue;
    const call = src.search(new RegExp(`(?<!function )\\b${fn[1]}\\(`));
    if (call >= 0 && call < bodyStart) triggers.push(call);
  }
  const resizeAt = triggers.length ? Math.min(...triggers) : -1;
  const renderMatch = src.match(/function render\(\)\s*\{([\s\S]*?)\n    \}/);
  if (resizeAt >= 0 && renderMatch) {
    const renderBody = renderMatch[1];
    for (const m of src.slice(resizeAt).matchAll(/\n    var (\w+) = [\[{]/g)) {
      const name = m[1];
      if (new RegExp(`\\b${name}\\b`).test(renderBody)) problems.push(`${path}: '${name}' is declared after the first chart is built but used in render() — declare it before the chart (D-021 §2)`);
    }
  }
}
if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
console.log(`lint-demos: ${readdirSync(dir).filter((f) => f.endsWith(".js")).length} demo files clean`);
