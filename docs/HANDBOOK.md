# HANDBOOK.md — Engineering Handbook

> **⚠ Amendment H3 in force (2026-09-12):** H2 Section 1 ("Two themes") is superseded by
> Amendment H3 at the end of this file (a third theme, `paper`; the token set and the single
> storage key are otherwise unchanged). Original text preserved unchanged per Section 1.5.
>
> **⚠ Amendment H2 in force (2026-09-10):** the Section 5 token block is superseded by Amendment H2 at the end of this file (two themes, three new tokens, one storage key). Original text preserved unchanged per Section 1.5.
>
> **⚠ Amendment H1 in force (2026-09-08):** §2 "native ES modules" and the §6 global-variable rule are superseded by Amendment H1 at the end of this file (classic scripts, namespace globals). Original text preserved unchanged per §1.5.

This document defines HOW the site is built: stack, structure, conventions, and quality gates. It is binding. If you believe a rule should change, propose the change to the maintainer with reasoning — never silently deviate. See SPEC.md §preamble for document priority.

---

## 1. Prime directives

1. **Longevity over fashion.** This site must still run, untouched, in 10 years. Every dependency is a liability. When in doubt, use the platform (vanilla HTML/CSS/JS) instead of a library.
2. **No build step.** The repository IS the website. Cloning it and opening `index.html` must work. `git push` to GitHub Pages must be the entire deployment.
3. **One demo, one file.** Each interactive demo lives in exactly one JS file that can be understood in isolation.
4. **Boring code.** Prefer obvious code over clever code. A junior student should be able to read any file and follow it.
5. **Additive changes.** When modifying existing pages, never delete or rewrite working demos/sections unless the task explicitly says so. Extend; don't churn.

## 2. Tech stack (locked)

| Concern | Choice | Notes |
|---|---|---|
| Markup/styling | Hand-written HTML5 + CSS (custom properties) | No preprocessors, no Tailwind, no frameworks |
| Interactivity | Vanilla JavaScript, ES2020, native ES modules | No React/Vue/Svelte/Alpine, no TypeScript, no JSX |
| Visualization | **D3 v7** (vendored, see §3) | Modular use; Canvas for >500 animated elements (SPEC D9) |
| Math rendering | **KaTeX** (CDN with graceful degradation) | Never MathJax |
| Statistics math | **Hand-written** in `assets/js/stats.js` | No jStat, no stdlib. Small, verified, self-owned (see §7) |
| Fonts | System font stack (see §5) | No webfont downloads |
| Testing | Plain-HTML test runner page (see §7) | No Jest/Vitest/node_modules |
| Deployment | GitHub Pages from `main` branch root | Nothing else |

Forbidden unless the maintainer approves in writing: any npm package, any bundler, any CSS framework, any additional CDN, localStorage/sessionStorage, cookies, service workers, analytics, iframes to third parties.

## 3. Dependencies policy

- **Vendored (committed to repo):** `assets/vendor/d3.v7.min.js` — exact file, exact version noted in a comment at the top of the repo README table.
- **CDN (only these two URLs, with graceful degradation per SPEC D8):** KaTeX CSS + JS from cdn.jsdelivr.net, version pinned with an integrity hash.
- Nothing else. If a demo seems to need another library, it doesn't; implement the needed 30 lines by hand in `stats.js` or the demo file.

## 4. Repository layout

```
/                     index.html, about.html, LICENSE, README.md
/chapters/<slug>/     index.html            (one per chapter)
/assets/css/          theme.css  (tokens + base)   components.css  (controls, cards)
/assets/js/           stats.js   (all math)        ui.js (shared controls: slider, button factory)
/assets/js/demos/     <chapter-slug>__<demo-slug>.js   (one file per demo)
/assets/vendor/       d3.v7.min.js
/tests/               index.html (numeric test runner, opens in browser, red/green output)
/docs/                SPEC.md HANDBOOK.md PLAN.md SYLLABUS.md DECISIONS.md
```

Naming: kebab-case for files and slugs; camelCase for JS identifiers; no spaces anywhere; chapter slugs match SYLLABUS.md exactly.

## 5. Design tokens (locked)

Defined once in `theme.css` as CSS custom properties. Never hard-code a color, size, or font elsewhere — always `var(--…)`.

```css
:root {
  /* Calm neutral palette — muted, low-saturation, WCAG AA on --bg */
  --bg:            #FAF9F7;  /* warm off-white page background */
  --surface:       #FFFFFF;  /* cards, demo panels */
  --ink:           #2B2B2B;  /* body text, axis text */
  --ink-soft:      #6B6560;  /* secondary text, captions */
  --line:          #E4E0DB;  /* borders, gridlines */

  --accent:        #5B7B9A;  /* muted slate blue: interactive elements, primary data */
  --accent-strong: #3E5C78;  /* hover/active, emphasized data */
  --accent-soft:   #DCE5EC;  /* fills, selected backgrounds */

  /* Categorical series (max 5; all muted, distinguishable in grayscale by order/label) */
  --cat-1: #5B7B9A;  --cat-2: #A98467;  --cat-3: #7A9E7E;
  --cat-4: #9A7B9A;  --cat-5: #C2A05A;

  --ok:            #7A9E7E;  /* confirmations, CI "captured" */
  --warn:          #B0713F;  /* cautions, CI "missed" */

  /* Type & spacing */
  --font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --fs-0: 0.875rem; --fs-1: 1rem; --fs-2: 1.25rem; --fs-3: 1.6rem; --fs-4: 2.1rem;
  --space-1: 0.5rem; --space-2: 1rem; --space-3: 2rem; --space-4: 4rem;
  --radius: 6px;
  --measure: 68ch;  /* max text column width */
}
```

Rules: backgrounds only `--bg`/`--surface`/`--accent-soft`; text only `--ink`/`--ink-soft`; data marks default to `--accent`; multi-series uses `--cat-*` in order. Transitions 150–250 ms ease-out; nothing animates on page load; honor `prefers-reduced-motion`.

## 6. Code conventions

- Every demo file starts with a header comment: what it teaches (one line, from SYLLABUS.md), its public init function, and which `stats.js` functions it uses.
- Each demo exports exactly one `init<DemoName>(containerEl)` function; the chapter HTML calls it. No demo touches DOM outside its container.
- No global variables except the `stats` and `ui` module imports.
- All randomness through `stats.js` helpers (so tests can exercise the same code paths).
- Shared UI (sliders, buttons, number readouts) comes from `ui.js` factories — never restyle a one-off control.
- Comments explain *why*, not *what*. Every formula cites its source in a comment (e.g., "Welford's online variance — Knuth TAOCP vol 2").
- Errors: demos must never throw to the console in normal use. Guard divisions, logs, and empty-sample states.

## 7. Quality gates (all must pass before a task is "done")

1. **Numeric verification.** Every function in `stats.js` has cases in `/tests/index.html` comparing against reference values computed independently (e.g., with NumPy/SciPy — record the reference snippet in a comment). Tolerance 1e-9 for closed forms; distributional tests for samplers (mean/variance of 100k draws within stated tolerance). The test page shows green/red per case; all green required.
2. **Spec check.** Walk demo criteria D1–D10 from SPEC §5 and state pass/fail for each in the delivery report.
3. **Extremes check.** Set every slider to min and max; click every button 20× fast; resize to 360 px and 1920 px; reload mid-animation. No errors, no broken layout.
4. **Console-clean.** Zero errors and zero warnings in the browser console on every page.
5. **Static check.** `file://` open works; GitHub Pages deploy works; no network requests besides the two KaTeX URLs.
6. **Accessibility pass.** Keyboard-only walkthrough of the demo; Lighthouse a11y ≥ 95 on touched pages.
7. **Handbook audit.** Grep for hard-coded colors, forbidden APIs (`localStorage`, `fetch` to third parties), stray globals.

## 8. Workflow rules for the coding agent (Claude Code)

- Read SPEC.md, HANDBOOK.md, PLAN.md, SYLLABUS.md at the start of every session, then implement exactly one PLAN phase (or the explicitly requested task) per session.
- Before coding, restate the task's acceptance criteria in your own words; if anything is ambiguous or conflicts between documents, STOP and ask.
- After coding, run the quality gates (§7) and produce a short delivery report: files changed, criteria pass/fail, known limitations, suggested next phase.
- Record every non-obvious decision (convention choices, trade-offs, approved deviations) as a dated entry in `docs/DECISIONS.md`. Never edit past entries.
- Commit style: one phase = one commit series with imperative messages ("Add CLT demo sampling animation"); never force-push; never commit commented-out code or dead files.
- Do not refactor, rename, reformat, or "improve" files outside the current task's scope.

---
---

# Amendment H1 — 2026-09-08 (D-013)

Reason: Chrome refuses ES-module `import` of local files under `file://`, which breaks SPEC D8 and §7.5. SPEC outranks HANDBOOK, so script loading changes; everything else stands.

## H1 §1 — Script loading (supersedes §2 "native ES modules")
- All site JavaScript is loaded with classic `<script src="…"></script>` tags, in this order on every page that needs them: `assets/vendor/d3.v7.min.js` → `assets/js/stats.js` → `assets/js/ui.js` → demo files. No `type="module"`, no `import`/`export`, no dynamic `import()`.
- Each file is wrapped in an IIFE with `"use strict"` and attaches exactly one namespace to `window`: `stats.js` → `window.stats`; `ui.js` → `window.ui`; each demo → `window.demos.<initDemoName>` (a demo file creates `window.demos` if absent).
- `tests/index.html` exposes `window.StatLabTests` (harness only).

## H1 §2 — Globals (supersedes the §6 "no global variables" line)
Permitted globals: `d3`, `stats`, `ui`, `demos`, `StatLabTests`. Nothing else.
*Amended 2026-09-08 (D-018):* also `chapters` (chapter data, `assets/js/chapters.js`) and `site` (page chrome, `assets/js/site.js`). Load order on every page: `d3 → stats → ui → chapters → site → demos`; `site.js` is the last script in `<body>`. The §7.7 handbook audit greps for any other `window.` assignment or bare top-level declaration.

## H1 §3 — Unchanged
ES2020 syntax, one demo one file, `init<DemoName>(containerEl)` signature, all randomness through `stats.js`, tokens only, and every other rule in §1–§8 remain in force.

---

# Amendment H2 — 2026-09-10 (D-040 … D-044)

Maintainer-ordered design revision, authorised in writing. **H2 supersedes the token block in
Section 5.** Everything else in Section 5 — the type scale, spacing, radius, measure, and the rule
that no colour, size or font is ever hard-coded outside `theme.css` — is unchanged and still binding.

## H2 Section 1 — Two themes (supersedes the Section 5 token block)

`:root` carries the light theme. `[data-theme="dark"]` on `<html>` overrides it. Token **names are
identical in both blocks**, so no component ever asks which theme is running: it says `var(--accent)`
and gets the right colour. Three tokens are new: `--accent-2` and `--accent-2-soft` for the
advanced tier on the journey path, and `--path-line` for the journey connectors.

**Light (`:root`)**

| Token | Value | Token | Value |
|---|---|---|---|
| `--bg` | `#FAF8F4` | `--accent-2` | `#7555A5` |
| `--surface` | `#FFFFFF` | `--accent-2-soft` | `#E7DFF2` |
| `--ink` | `#282725` | `--cat-1` | `#2E7D6B` |
| `--ink-soft` | `#6B6560` | `--cat-2` | `#B5763F` |
| `--line` | `#E4E0DA` | `--cat-3` | `#4E7DA6` |
| `--accent` | `#2E7D6B` | `--cat-4` | `#9A5D8F` |
| `--accent-strong` | `#1F5A4D` | `--cat-5` | `#8A8F3C` |
| `--accent-soft` | `#D9EBE5` | `--ok` | `#4C8B57` |
| `--path-line` | `#CFC9C0` | `--warn` | `#C06A2E` |

**Dark (`[data-theme="dark"]`)**

| Token | Value | Token | Value |
|---|---|---|---|
| `--bg` | `#1B1A19` | `--accent-2` | `#AE93D8` |
| `--surface` | `#252423` | `--accent-2-soft` | `#312A40` |
| `--ink` | `#EAE7E2` | `--cat-1` | `#57B79F` |
| `--ink-soft` | `#A6A19A` | `--cat-2` | `#D19A64` |
| `--line` | `#3B3936` | `--cat-3` | `#7FABD0` |
| `--accent` | `#57B79F` | `--cat-4` | `#C08AB4` |
| `--accent-strong` | `#7BCDB8` | `--cat-5` | `#B4BA6A` |
| `--accent-soft` | `#1F3B34` | `--ok` | `#79B584` |
| `--path-line` | `#4A4744` | `--warn` | `#D98F52` |

Both blocks also set `color-scheme`, so the browser paints form controls, scrollbars and the
`input[type=range]` track to match.

**Contrast, measured, not assumed.** Every foreground/background pair clears WCAG AA (4.5:1) in both
themes. One value was adjusted to get there: light `--accent-2` is `#7555A5`, one lightness step down
from the `#7C5CAB` originally specified, because the advanced node's number sets it on `--accent-2-soft`
and that pair was 4.08:1. It is now 4.51:1. Lowest of the whole set is `--accent` on `--bg` in light
at 4.65:1. `--ink` is 14.07:1 light and 14.09:1 dark; `--ink-soft` is 5.42:1 light and 6.77:1 dark.
D-016 still stands: link and filled-control text uses `--accent-strong` (7.53:1 light, 9.32:1 dark),
and `--ok`/`--warn` are never text colours.

## H2 Section 2 — How the theme is chosen and switched

1. Every page carries a small inline script **in `<head>`, before any stylesheet**, which reads the
   stored choice, falls back to `prefers-color-scheme`, and sets `data-theme` on `<html>`. This runs
   before first paint, so there is never a flash of the wrong theme. It is the one inline script the
   site uses and it must stay first in `<head>`.
2. `site.themeToggle()` builds the sun/moon button that sits in the page header on every page. It is
   a real `<button>`, so it is focusable and operable from the keyboard, and its `aria-label` names
   the theme it will switch **to**. It shows the icon for that destination theme.
3. `site.theme.set(v)` writes the attribute, persists the choice, relabels every toggle on the page,
   and dispatches a `themechange` event on `document` carrying `{ theme }`.

## H2 Section 3 — The one storage exception

The site may use **exactly one** storage key: `localStorage["statlab-theme"]`, holding `"light"` or
`"dark"`. Nothing else may be stored, ever — SPEC Section 3's no-cookies, no-tracking rule is
otherwise unchanged, and the About page discloses this key.

**Every access is wrapped in `try`/`catch`**, both the read in the inline script and the write in
`site.theme.set`. Private windows, blocked site data and a full quota all throw. When that happens
the toggle still works for the rest of the page session; only persistence is lost. A storage failure
must never reach the console or stop a page rendering.

## H2 Section 4 — Demos must survive a live theme switch

A demo may never bake a colour. In practice:

- **CSS-driven marks** (everything with a class in `components.css`) re-colour themselves, because
  they reference `var(--…)`. Nothing to do.
- **Canvas** keeps whatever colour it was painted with, and `ui.token` caches. So `ui.js` listens for
  `themechange`, drops the token cache, and calls `refresh()` on every live chart frame, which re-runs
  each demo's own render with the new tokens. **A demo needs no code of its own for this**, and must
  not add any: keep reading colours through `ui.token` at draw time.
- A frame removed with `frame.destroy()` is de-registered and is not refreshed.

Gate rule: the HANDBOOK Section 7 gates are run **in both themes**, and the extremes check includes
toggling the theme while a demo is animating.

---

# Amendment H3 — 2026-09-12 (D-050)

Maintainer-ordered. **H3 supersedes H2 Section 1 only.** The H2 token tables for light and dark
are unchanged and still binding, as is every other part of H2 and of Section 5.

## H3 Section 1 — Three themes (supersedes "H2 Section 1 — Two themes")

A third theme, `paper`, joins light and dark. It is selected by `[data-theme="paper"]` on `<html>`
and defines the **same token names** as the other two, so no component learns that it exists. It is
a first-class theme rather than a filter over light: every value below was chosen against the paper
ground and checked against the same contrast pairs light and dark are held to.

`color-scheme` stays `light` for paper, so form controls and scrollbars render light-side.

**Paper (`[data-theme="paper"]`)**

| Token | Value | Token | Value |
|---|---|---|---|
| `--bg` | `#F4ECD8` | `--accent-2` | `#6B4C94` |
| `--surface` | `#FBF5E6` | `--accent-2-soft` | `#E3D9F0` |
| `--ink` | `#3A322A` | `--cat-1` | `#2A6F5E` |
| `--ink-soft` | `#6A5D4C` | `--cat-2` | `#A2652F` |
| `--line` | `#DFD2B6` | `--cat-3` | `#436F96` |
| `--accent` | `#2A6F5E` | `--cat-4` | `#8A4F80` |
| `--accent-strong` | `#1C5044` | `--cat-5` | `#767B2E` |
| `--accent-soft` | `#D6E5DC` | `--ok` | `#45804F` |
| `--path-line` | `#CBBB9A` | `--warn` | `#B05F26` |

## H3 Section 2 — The control is a cycle, not a flip

The header button walks `light → paper → dark → light` and shows the icon of the theme it would
move **to**, with an `aria-label` naming that destination. Exactly one of its three icons is visible
in any theme, decided by CSS.

`paper` is never selected automatically. The pre-paint script still honours a stored choice first
and otherwise falls back to `prefers-color-scheme`, which only distinguishes light from dark, so
paper is only ever reached deliberately.

## H3 Section 3 — Storage is unchanged

Still exactly one key, `statlab-theme` (D-042), still wrapped in `try`/`catch`, now holding one of
three values instead of two. No second key was added and none may be.
