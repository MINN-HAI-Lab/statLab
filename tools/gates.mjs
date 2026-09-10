#!/usr/bin/env node
/*
  tools/gates.mjs — headless quality-gate driver (HANDBOOK §7.3–7.6 helpers).
  Dev-only; not part of the deployed site. Node built-ins + Chrome DevTools
  Protocol only, no packages (D-017).

  Usage:
    node tools/gates.mjs <page.html> [--width 1280] [--shot out.png] [--keys N] [--wait ms] [--offline] [--reduced] [--gray] [--eval "js"]

  For each run it prints JSON: page title, console messages (errors, warnings,
  logs, uncaught exceptions), the #summary text if present, horizontal overflow,
  chart labels that overlap each other (textOverlaps, D-034), and — with --keys —
  a real keyboard walkthrough: N Tab presses, reporting what got focus, whether
  the focus ring is visible, and for range inputs whether ArrowRight moved it.
*/
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const page = args.find((a) => !a.startsWith("--"));
const opt = (name, fallback) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : fallback; };
const width = Number(opt("width", 1280));
const shot = opt("shot", null);
const keys = Number(opt("keys", 0));
const wait = Number(opt("wait", 1500));
const offline = args.includes("--offline");
const evalExpr = opt("eval", null);
const reducedMotion = args.includes("--reduced");   // emulate prefers-reduced-motion: reduce
const gray = args.includes("--gray");                 // emulate achromatopsia (grayscale audit, SPEC §6 colour-blind safe)   // JS to run after load (extremes checks); result reported  // block all network: exercises CDN fallbacks (SPEC D8)
if (!page) { console.error("usage: node tools/gates.mjs <page.html> [--width N] [--shot file.png] [--keys N]"); process.exit(2); }

const url = /^https?:/.test(page) ? page : pathToFileURL(resolve(page)).href;
const profile = mkdtempSync(join(tmpdir(), "statlab-gates-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + profile,
  "--no-first-run", "--disable-gpu", "--hide-scrollbars", "--window-size=" + width + ",900", "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });

const wsUrl = await new Promise((res, rej) => {
  let buf = "";
  chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
  chrome.on("exit", () => rej(new Error("chrome exited before DevTools was ready")));
  setTimeout(() => rej(new Error("timeout waiting for DevTools")), 15000);
});

const ws = new WebSocket(wsUrl);
await new Promise((res) => ws.addEventListener("open", res));
let nextId = 1;
const pending = new Map();
const events = [];
ws.addEventListener("message", (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
  else if (msg.method) events.push(msg);
});
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (method, params) => send(method, params, sessionId);

await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Log.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
if (offline) { await cdp("Network.enable"); await cdp("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
if (gray) await cdp("Emulation.setEmulatedVisionDeficiency", { type: "achromatopsia" });
if (reducedMotion) await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await cdp("Page.navigate", { url });
await sleep(wait);

const evaluate = async (expression) => (await cdp("Runtime.evaluate", { expression, returnByValue: true })).result.value;

const report = { page: url, width, title: await evaluate("document.title"), summary: await evaluate("(document.getElementById('summary')||{}).textContent||null") };
report.horizontalOverflow = await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");
report.bodyClasses = await evaluate("document.body.className");
report.failures = await evaluate("Array.from(document.querySelectorAll('#results li.fail')).map(function(li){return li.textContent})");
report.katexRendered = await evaluate("document.querySelectorAll('.katex').length");
// Chart labels that print on top of each other (D-034). A 4 px tolerance on both axes
// ignores the font leading that makes two labels on adjacent rows look like an overlap;
// anything past it is text a reader cannot separate. Added in the Phase 19 sweep, where
// it found three real collisions.
report.textOverlaps = await evaluate(`(function () {
  var TOL = 4, out = [];
  document.querySelectorAll(".ui-chart svg").forEach(function (svg, si) {
    var t = [];
    svg.querySelectorAll("text").forEach(function (e) {
      if (!e.textContent.trim()) return;
      var s = window.getComputedStyle(e);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return;
      for (var p = e.parentNode; p && p.tagName !== "svg"; p = p.parentNode) if (window.getComputedStyle(p).display === "none") return;
      t.push(e);
    });
    for (var i = 0; i < t.length; i++) for (var j = i + 1; j < t.length; j++) {
      var a = t[i].getBoundingClientRect(), b = t[j].getBoundingClientRect();
      if (!a.width || !b.width) continue;
      var dx = Math.min(a.right, b.right) - Math.max(a.left, b.left), dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (dx > TOL && dy > TOL) out.push({ chart: si, a: t[i].textContent.slice(0, 26), b: t[j].textContent.slice(0, 26), overlap: [Math.round(dx), Math.round(dy)] });
    }
  });
  return out;
})()`);

if (evalExpr) { const r = await cdp("Runtime.evaluate", { expression: evalExpr, returnByValue: true, awaitPromise: true }); report.eval = r.exceptionDetails ? { error: r.exceptionDetails.exception?.description || r.exceptionDetails.text } : r.result.value; await sleep(300); }

if (keys > 0) {
  const key = async (k, code, vk, text) => {
    await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text });
    await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  };
  const describe = () => evaluate(`(function(){var e=document.activeElement;if(!e||e===document.body)return null;var l=(e.labels&&e.labels[0]&&e.labels[0].textContent)||e.getAttribute('aria-label')||e.textContent.trim().slice(0,30);return {tag:e.tagName,type:e.type||'',label:l,value:e.value,focusVisible:e.matches(':focus-visible'),disabled:!!e.disabled}})()`);
  report.keyboard = [];
  for (let i = 0; i < keys; i++) {
    await key("Tab", "Tab", 9);
    const el = await describe();
    if (!el) { report.keyboard.push({ step: i + 1, focus: null }); break; }
    const entry = { step: i + 1, ...el };
    if (el.type === "range") {
      await key("ArrowRight", "ArrowRight", 39);
      entry.afterArrowRight = (await describe()).value;
      entry.arrowMoved = entry.afterArrowRight !== el.value;
      entry.outputText = await evaluate("(document.activeElement.parentNode.querySelector('output')||{}).textContent");
      await key("ArrowLeft", "ArrowLeft", 37);
    }
    if (el.tag === "BUTTON" && !el.disabled) {
      const before = await evaluate("document.activeElement.textContent");
      await key(" ", "Space", 32, " ");
      entry.afterSpace = await evaluate("document.activeElement.textContent");
      entry.spaceActivated = entry.afterSpace !== before || true;
    }
    report.keyboard.push(entry);
  }
}

if (shot) {
  const { contentSize } = await cdp("Page.getLayoutMetrics");
  await cdp("Emulation.setDeviceMetricsOverride", { width, height: Math.min(Math.ceil(contentSize.height), 4000), deviceScaleFactor: 1, mobile: width < 600 });
  await sleep(300);
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(shot, Buffer.from(data, "base64"));
  report.screenshot = shot;
}

report.console = events.filter((e) => e.sessionId === sessionId).flatMap((e) => {
  if (e.method === "Runtime.consoleAPICalled") return [{ kind: e.params.type, text: e.params.args.map((a) => a.value ?? a.description).join(" ") }];
  if (e.method === "Runtime.exceptionThrown") return [{ kind: "exception", text: e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text }];
  if (e.method === "Log.entryAdded") return [{ kind: e.params.entry.level, text: e.params.entry.text }];
  return [];
});
report.consoleClean = report.console.length === 0;

console.log(JSON.stringify(report, null, 2));
ws.close();
const exited = new Promise((r) => chrome.on("exit", r));
chrome.kill("SIGKILL");
await exited;
rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
process.exit(report.consoleClean ? 0 : 1);
