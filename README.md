# StatLab

An interactive, visual introduction to probability and statistics for undergraduates of any major. Every core concept is taught through a manipulable visualization: the student drags, clicks, or samples, and the mathematics responds in real time. Text explains; interaction convinces.

Content follows OpenStax *Introductory Statistics* (Illowsky & Dean) chapter for chapter, then adds counting, Bayesian inference, resampling, and multivariable thinking.

Built with hand-written HTML, CSS, and JavaScript plus D3 v7 and KaTeX. No build step, no package manager, no frameworks.

## How to run

The repository is the website. Either:

- Open `index.html` directly in a browser (double-click, or `file://` URL), or
- Serve the folder with any static server, for example:

```
python3 -m http.server 8000
```

then open <http://localhost:8000/>.

Pages: `index.html` (landing), `about.html`, and `chapters/<slug>/index.html` for each chapter in `docs/SYLLABUS.md`. Chapter order, titles, and section lists come from `assets/js/chapters.js`; `node tools/check-content.mjs` verifies every chapter page against it.

Tests: open `tests/index.html` in a browser. Every case is listed with a green or red mark and a total at the top. All green is required before any phase is marked done (see `docs/HANDBOOK.md` §7).

## How to deploy

GitHub Pages, from the `main` branch, root folder. Nothing else.

1. Push `main` to GitHub.
2. Repository **Settings → Pages → Build and deployment**: Source "Deploy from a branch", Branch `main`, Folder `/ (root)`.
3. The site is live at `https://<user>.github.io/<repo>/` within a minute. The `.nojekyll` file in the root tells Pages to serve files as-is.

## Dependencies

| Dependency | Version | How it is loaded | Integrity |
|---|---|---|---|
| D3 | 7.9.0 | Vendored at `assets/vendor/d3.v7.min.js` (exact file from `https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js`) | sha256 `f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539` |
| KaTeX CSS | 0.18.7 | CDN `https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/katex.min.css` | `sha384-JctiRyLzXCrSoOOzFlSoWLdyzQl7OrrRnhyeBmzB6ZWtcjccUyc8lCQJqIbs3uQX` |
| KaTeX JS | 0.18.7 | CDN `https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/katex.min.js` | `sha384-+7Keh381hSkXmXqnjC0JBM/kzsN6TFj+wMKychSLjTvJ8/0ElMde2uKl8i6p6Buj` |
| KaTeX auto-render | 0.18.7 | CDN `https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/contrib/auto-render.min.js` | `sha384-bjyGPfbij8/NDKJhSGZNP/khQVgtHUE5exjm4Ydllo42FwIgYsdLO2lXGmRBf5Mz` |

KaTeX is the only network dependency and must degrade gracefully: if it fails to load, raw LaTeX source is shown and every demo still works. No other dependency of any kind is permitted (`docs/HANDBOOK.md` §3).

## Quality gates

Gates are listed in `docs/HANDBOOK.md` §7. Two dev-only helpers make them repeatable; neither is part of the deployed site and neither adds a dependency to it.

```
# console messages, #summary text, horizontal-overflow check, screenshot, keyboard walkthrough
node tools/gates.mjs tests/index.html
node tools/gates.mjs tests/ui.html --width 360 --shot /tmp/ui-360.png --keys 14

# Lighthouse accessibility (needs a local server; npx caches Lighthouse outside the repo)
python3 -m http.server 8765 &
npx --yes lighthouse@12 http://127.0.0.1:8765/tests/ui.html --only-categories=accessibility --output=json --output-path=/tmp/lh.json --chrome-flags="--headless=new"
```

`node tools/check-content.mjs` verifies chapter pages against `chapters.js`; `node tools/lint-demos.mjs` checks every demo file's header, globals, and init order; `node tools/check-links.mjs` resolves every internal link and anchor and HEAD-checks external URLs; `node tools/check-prose.mjs` reports section word counts, long sentences, citations, and formula footnotes. `tools/gates.mjs` also takes `--reduced` (prefers-reduced-motion), `--gray` (achromatopsia, for the colour-blind audit), `--offline`, and `--eval "js"`.

Cross-browser: Firefox and WebKit run through Playwright's browser builds, installed outside the repository with `npx --yes playwright@1 install firefox webkit`; the sweep script used for v0.5 is recorded in `docs/DECISIONS.md` D-029. `tools/gates.mjs` uses only Node built-ins and the Chrome DevTools Protocol (Google Chrome must be installed; set `CHROME` to point elsewhere).

## Releases

These are the build milestones the project passed through, not git tags. The repository moved accounts on 2026-09-10 and its history was squashed to a single initial commit, so there is no separate commit for either milestone to point at (`docs/DECISIONS.md` D-047). Tagging resumes at v1.0 after the student pilot.

| Milestone | Date | Scope |
|---|---|---|
| v0.5 | 2026-09-09 | Chapters 1–9 (Part A through one-sample hypothesis testing), landing and About pages, 26 demos, 142 numeric and behaviour tests. Hardening sweep per PLAN A1 Phase 14. |
| v0.9 | 2026-09-10 | All 17 chapters and 46 demos, 207 numeric and behaviour tests. Site-wide hardening per PLAN A1 Phase 24: SPEC §10 satisfied. Verified in Chrome, Firefox and WebKit at 1280 and 360 px, under reduced motion and in grayscale; Lighthouse accessibility 100 on every page. Feature complete, awaiting the student pilot. |

## Project documents

| File | Role |
|---|---|
| `docs/SPEC.md` | What to build; demo acceptance criteria D1–D10 |
| `docs/HANDBOOK.md` | How to build it: stack, layout, tokens, conventions, quality gates |
| `docs/PLAN.md` | Phase order (Amendment A1 governs) |
| `docs/SYLLABUS.md` | Chapters, sections, learning goals, demo briefs |
| `docs/DECISIONS.md` | Append-only decision log |
| `docs/STATUS.md` | Audit ledger: what is done and whether gates passed |

## License

Code is MIT. Explanatory text is CC BY 4.0. See `LICENSE`.
