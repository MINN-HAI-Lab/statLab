# MIGRATION.md — Moving StatLab to a new GitHub account

Written 2026-09-10 at commit `faa0144`. This file is the handoff. It says what exists, what has been done, what must change when the repository moves, how to prove the move worked, and how to pick the work up again in a fresh Claude Code session on the new account. Everything here is also in the other `docs/` files in more detail. This is the short path.

---

## 1. Where the project stands

StatLab is feature complete and waiting on one thing that only the maintainer can do.

| Fact | Value |
|---|---|
| Build phases done | 0 through 24 of PLAN Amendment A1, all `✅ done` in `docs/STATUS.md` |
| Phase remaining | 25, the student pilot. Maintainer-led. Exit is the `v1.0` tag |
| Chapters and demos | 17 chapters, 46 sections, 46 demo files under `assets/js/demos/` |
| stats.js | 83 public functions, every one ledgered with a NumPy or SciPy reference test |
| Tests | 209 of 209 pass in `tests/index.html`, verified in Chrome, Firefox 155 and WebKit 26.6 |
| Tags | `v0.5` (2026-09-09, Chapters 1–9) and `v0.9` (2026-09-10, feature complete) |
| Decisions logged | D-001 through D-046 in `docs/DECISIONS.md` |
| Commits | 33 on `main` |
| Live site (old account) | https://khh-aka-lucifer.github.io/statLab/ |
| Old remote | `git@github.com:KHH-AKA-Lucifer/statLab.git` |

Three maintainer-ordered changes landed after `v0.9` and are not yet in a tag. They are the last three commits.

- `67a41d4` — landing page rebuilt as a learning-journey path, day and night themes with a header toggle, tier names changed to Core Concepts and Advanced Concepts, the section glyph removed from site copy, a Resources & Credits section on About. Recorded as HANDBOOK H2, SPEC S1, SYLLABUS v4, D-040 to D-044.
- `dcb2f28` — the site is credited to Dr. Sein Minn and Kaung Hein Htet. D-045.
- `faa0144` — 133 colons and semicolons removed from sentences in section text and demo panels, with a prose gate so the pattern cannot return. D-046.

---

## 2. What was built, phase by phase

The full ledger with dates, test counts and gate results is `docs/STATUS.md` section 1. This is the shape of it.

| Phase | Delivered |
|---|---|
| 0 | Repository scaffold, GitHub Pages from `main` root, `.nojekyll` |
| 1 | `stats.js` core, the math for Chapters 1–7, 46 functions with reference tests |
| 2 | `ui.js` component kit, `components.css`, the `tests/ui.html` gallery, `tools/gates.mjs` |
| 3 | Landing page, About page, one chapter page per slug, `chapters.js` as the single source of truth |
| 4 | Pilot demo, the Section 3.1 coin flip, which set the pattern every later demo follows (D-019) |
| 5–13 | Chapters 3, 1, 2, 4, 5, 6, 7, 8, 9 in that order, each with demos, texts and tests |
| 14 | `v0.5` hardening sweep and release |
| 15–18 | Chapters 10, 11, 12, 13. stats.js gained the t, chi-square and F distributions and every test statistic |
| 19 | Core Concepts hardening sweep, cross-browser, an SVG label-overlap gate, a copy edit |
| 20–23 | Chapters 14, 15, 16, 17, the Advanced Concepts tier |
| 24 | Final hardening, scripts deferred, static chrome baked into HTML, `v0.9` tagged. SPEC section 10 satisfied |

Every phase was run with the custom command `/phase <n> <budget%>` defined in `.claude/commands/phase.md`, which travels with the repository.

---

## 3. The move itself

### 3.1 Push the history, including tags

Tags do not travel with a plain push. Both must go.

```sh
cd statLab
git remote set-url origin git@github.com:<NEW-OWNER>/statLab.git
git push -u origin main
git push origin --tags
git ls-remote --tags origin        # expect v0.5 and v0.9
```

If the new repository is created with its own README or licence, delete that first or push with `--force` once, before anyone else has pulled. After that, never force-push. HANDBOOK section 8 forbids it and `v0.5` was deliberately left in place once because of that rule.

### 3.2 Enable GitHub Pages

Settings → Pages → Source "Deploy from a branch", branch `main`, folder `/ (root)`. The `.nojekyll` file is already committed, so `assets/` and the underscore-free layout serve as-is. The first deploy takes a minute or two. The site will be at `https://<new-owner>.github.io/statLab/`, unless the repository is renamed.

### 3.3 Make the repository public, or accept the 404s

The old repository was private, so the source links on the About page and in README returned 404 to the public. This was an open maintainer item throughout. Decide it now, before students see the site.

### 3.4 Change the two hard-coded references

Only two files outside the historical logs name the old account. Both are on the About page.

| File | Line | What it is |
|---|---|---|
| `about.html` | 49 | The "How to cite" URL |
| `about.html` | 55 | The "Source and issues" GitHub link |

`docs/STATUS.md` names the old URL once, in the Phase 0 row that records the first deploy. That is a historical record and stays as it is.

Replace both in one step, then check nothing else slipped through.

```sh
sed -i '' \
  -e 's#https://khh-aka-lucifer.github.io/statLab/#https://<new-owner>.github.io/statLab/#g' \
  -e 's#https://github.com/KHH-AKA-Lucifer/statLab#https://github.com/<NEW-OWNER>/statLab#g' \
  about.html
grep -rn "KHH-AKA-Lucifer\|khh-aka-lucifer" --exclude-dir=.git . | grep -v docs/STATUS.md   # expect nothing
```

The citation line is a published reference. If the site has already been cited anywhere with the old URL, consider keeping the old Pages site alive as a redirect rather than deleting it.

### 3.5 Verify the move

Run from the repository root once Pages reports the deploy is live.

```sh
node tools/check-links.mjs                 # fetches the external URLs too
node tools/gates.mjs https://<new-owner>.github.io/statLab/ --wait 6000
node tools/gates.mjs https://<new-owner>.github.io/statLab/tests/index.html --wait 60000
```

Expect a clean console on both, and `209 / 209 passed` in the test page summary. Then commit the About page change with a message that says the account moved, and add one line to the session log at the end of `docs/STATUS.md`.

---

## 4. The machine, not the repository

These live on the Mac, not in git. A new machine needs them again.

| Thing | Where | Why it matters |
|---|---|---|
| Node 25 | `node -v` | Every tool in `tools/` is a Node script with no dependencies |
| Chrome 152 | `/Applications/Google Chrome.app` | `tools/gates.mjs` drives it over the DevTools protocol for console, overflow, screenshots, keyboard walks |
| Python 3.13 with NumPy 2.4.4 and SciPy 1.17.1 | `python3` | Every stats.js function is checked against reference values computed here, and the snippet is kept in a comment beside the test |
| Lighthouse 12 | `npx --yes lighthouse@12` | Run against `python3 -m http.server`, never against `file://` |
| Playwright Firefox and WebKit builds | `~/Library/Caches/ms-playwright/` | `npx --yes playwright@1 install firefox webkit`. The 40-line driver script is described in D-029 and was kept outside the repository |
| Claude Code memory | `~/.claude/projects/<path-derived-name>/memory/` | Keyed to the absolute path of the checkout, so it does not follow a clone. Section 6 says what was in it |

There is no `gh` CLI on the old machine. Everything used `git` and the GitHub web UI.

The gate commands, as they were run every phase, are listed in `docs/HANDBOOK.md` section 7 and in the session log of `docs/STATUS.md`. The short form is

```sh
node tools/lint-demos.mjs && node tools/check-content.mjs && node tools/check-links.mjs --offline && node tools/check-prose.mjs
node tools/gates.mjs tests/index.html --wait 60000
node tools/gates.mjs chapters/<slug>/index.html --width 360 --wait 4000
node tools/gates.mjs chapters/<slug>/index.html --width 1280 --keys 40 --wait 4000 --shot out.png
```

---

## 5. Rules that must survive the move

These are already binding through `CLAUDE.md` and `docs/`, which travel with the repository. Listed here because a fresh session should be reminded before its first edit.

- Documents rank SPEC over HANDBOOK over SYLLABUS over PLAN. Conflicts stop work, they are never silently resolved.
- One phase or one explicit task per session. Additive changes only. No new dependencies of any kind. No build step.
- Colours, sizes and fonts only through `theme.css` tokens. Two themes now exist, and token names are identical in both (HANDBOOK H2).
- Exactly one storage key is permitted, `statlab-theme`, always inside `try`/`catch` (D-042). Nothing else may ever be stored.
- Every new stats.js function ships with a same-session test against NumPy or SciPy values, snippet in a comment.
- `docs/STATUS.md` and `docs/DECISIONS.md` are append-only. Every phase updates STATUS. Every non-obvious choice gets a dated D-entry with the next free number. D-047 is next.
- Site copy never uses the section glyph and cites the book as "Section x.y" (D-044). Sentences do not carry colons or semicolons, and `tools/check-prose.mjs` reports any that appear (D-046). Chart legends and labels like "Reading:" keep theirs.
- The concept chain on the landing page is fixed by the maintainer and lives in `chapters.js` as `tier` and `branchOf`. It is not to be redesigned (D-040). There is no progress tracking of any kind, and `tools/check-content.mjs` fails the build if progress vocabulary appears.
- Commit messages end with a `Co-Authored-By` line for the assistant. Never force-push.

---

## 6. What the previous Claude sessions carried in memory

Memory is per machine and per path, so none of this follows the clone. Tell the new session, or point it at this section.

**Delegated authority.** On 2026-09-08 the maintainer gave the assistant "rightful authority" over technical decisions and minor product improvements during development, including overriding docs when justified, provided each such call is logged as a dated DECISIONS entry. Product-scope changes, new chapters or demos, and anything destructive still stop for the maintainer. D-013 and D-014 are the first entries made under that delegation.

**Working style the maintainer asked for.** Plain language. No hype. Colons, semicolons and dashes out of sentences unless they genuinely earn their place. Professional and academic but friendly to an undergraduate reader. The `/personal-humanizer` skill exists on the old machine and was used for the copy edit in D-046.

**Authorship.** The site is by Dr. Sein Minn and Kaung Hein Htet, in that order. Both are placed at the Asian Institute of Technology on the About page by extending the affiliation that was already there. If Dr. Sein Minn's affiliation differs, correct line 30 of `about.html`. The `Maintainer` line in `CLAUDE.md` still names Kaung Hein Htet alone, because it says who directs the build rather than who the site is by (D-045).

---

## 7. Open items, none of them code defects

1. **Phase 25, the student pilot.** The only remaining phase. The maintainer runs the site with a tutorial group on their own devices, collects confusions and device failures, files them as issues, and the assistant fixes them in batches. Exit is the `v1.0` tag. This cannot start without real students.
2. **Repository visibility.** See section 3.3.
3. **One flaky test.** `independence: moderate association needs n…` in `tests/demos.test.js` failed once in roughly five runs during the last session and passed three in a row afterwards. It is unseeded and asserts that a sampled table at n = 30 produces an expected count below 5, which sits on a boundary. It predates the last three commits and was left alone under the "touch only what the task requires" rule. Seeding it or moving the assertion to n = 20 would settle it.
4. **Section glyph in engineering docs.** D-044 removed it from site copy and SYLLABUS only. SPEC, HANDBOOK and PLAN still use it to cross-reference their own sections. Sweeping those is a one-line order if wanted.
5. **Landing-page thumbnails** stay deferred (D-018, D-029). Section chips serve as deep links.
6. **Residual layout shift** on demo-heavy chapters, because a panel's height is known only once its chart draws. Reserving real heights would mean pixel values in HTML, which `CLAUDE.md` forbids. Lighthouse performance sits at 73 to 100 (D-039).
7. **Tag the three post-v0.9 commits** once the maintainer is satisfied with the journey path and themes. `v0.9.1` or fold them into `v1.0` after the pilot.

---

## 8. Resuming work in a new session

1. Clone the new repository and open it in Claude Code.
2. Say that `docs/MIGRATION.md` is the handoff and that section 6 restates the standing delegation.
3. Run the short gate set from section 4 once, so the session sees green before it changes anything.
4. For pilot fixes, work in batches with explicit tasks rather than `/phase`, because Phase 25 is maintainer-led. For anything else, `/phase 25 100` will correctly refuse to start on its own and explain why.
5. Keep appending to STATUS and DECISIONS. The next decision number is D-047.
