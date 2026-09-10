# PLAN.md — Build Plan

> **⚠ Amendment in force.** The phase map below (Phases 4–12) is superseded by **Amendment A1 (2026-09-08)** at the end of this file, which follows SYLLABUS.md v3 (book-first, 17 chapters). Phases 0–3 and the Standing rules remain in force as written. Original text is preserved unchanged per the additive-changes rule.

Execute phases strictly in order; each phase assumes the previous ones passed their exit criteria. One phase per Claude Code session unless the maintainer says otherwise. Do not start a later phase to "get ahead."

Chapter and demo names below reference SYLLABUS.md; if the maintainer's syllabus differs from the provisional one, follow the maintainer's version and update this plan's phase list accordingly (additively — note the change in DECISIONS.md).

---

## Phase 0 — Repository scaffold
Create the full directory layout (HANDBOOK §4), LICENSE (MIT + CC BY 4.0 note), README.md (project summary, how to run, how to deploy, dependency version table), empty `theme.css` populated with the locked tokens (HANDBOOK §5), placeholder `index.html` that renders tokens correctly, vendored D3 v7 file, and the `/tests/index.html` runner skeleton (working red/green harness with one trivial passing test).
**Exit:** repo deploys to GitHub Pages; landing placeholder renders with correct fonts/colors; test page shows 1/1 green; console clean.

## Phase 1 — Core math library (`stats.js`) + tests
Implement and verify: seeded & unseeded RNG helpers; Box–Muller normal sampler; samplers for uniform, Bernoulli, binomial, poisson, exponential; PDFs/PMFs and CDFs for those plus normal; mean/variance (Welford); quantile (Weibull method, `(n+1)p` — this is the site-wide convention, footnoted per SPEC §8); binomial coefficient (log-space); erf approximation for normal CDF; simple linear regression (slope, intercept, r, r²).
Every function gets test cases with independently computed reference values (record NumPy/SciPy snippets in comments).
**Exit:** all tests green; no demo code yet.
*(Scope note: see Amendment A1 §2 — this phase covers Chapters 1–7 needs only; later math lands per-chapter.)*

## Phase 2 — Shared UI kit (`ui.js`) + `components.css`
Factories: labeled slider (mouse/touch/keyboard, 44 px targets), primary/secondary button, play–pause–reset control group, numeric readout, chart frame helper (margins, responsive resize, axis styling per tokens). Build a hidden `/tests/ui.html` gallery page exercising every component at 360 px and 1280 px.
**Exit:** gallery page passes keyboard walkthrough; components consume only tokens; console clean.

## Phase 3 — Landing page + chapter template
Real landing page (SPEC §4) with chapter grid generated from a single `chapters.js` data array (single source of truth for slugs/titles/blurbs, mirroring SYLLABUS.md). One reusable chapter page template establishing the text+demo section layout, KaTeX inclusion with graceful degradation, anchor links, prev/next chapter nav, footer attribution. About page.
**Exit:** navigation works end-to-end with placeholder demo boxes; Lighthouse a11y ≥ 95 on landing + template; 360 px layout correct.

## Phase 4 — Pilot chapter, first demo (walking skeleton)
Implement Chapter 1's first demo ONLY (provisional syllabus: coin-flip chance events — empirical frequency converging to true probability, adjustable p, flip 1/100 controls). This is the pattern-setting demo: its structure, comments, and quality bar become the reference for all later demos.
**Exit:** full quality-gate run (HANDBOOK §7) documented in the delivery report; maintainer review REQUIRED before Phase 5 — later demos copy this one's patterns, so its flaws would multiply.
*(Superseded by A1 — the coin-flip demo is now SYLLABUS v3 section 3.1; see A1 Phase 4.)*

## Phase 5 — Complete pilot chapter
Remaining Chapter 1 demos per SYLLABUS.md. Refine shared components only if the pilot review demanded it (log in DECISIONS.md).
**Exit:** chapter fully passes D1–D10 per demo; tests green.
*(Superseded by A1.)*

## Phases 6–10 — Remaining chapters, one phase each
In syllabus order (provisional: Compound Probability; Distributions; Frequentist Inference; Bayesian Inference; Regression). Each phase: all demos for that chapter + its section texts + its tests.
**Exit per phase:** same as Phase 5.
*(Superseded by A1.)*

## Phase 11 — Site-wide hardening
Cross-browser sweep (Chrome/Firefox/Safari/Edge, phone + desktop); `prefers-reduced-motion` audit; grayscale-view audit of every chart; copy-edit all text for plain English; verify every formula footnote; full Lighthouse pass; broken-link check; final handbook grep audit.
**Exit:** SPEC §10 definition of done fully satisfied.
*(Superseded by A1 — hardening now occurs twice: A1 Phase 19 for v0.5 and A1 Phase 24 for v1.0.)*

## Phase 12 — Pilot with real students (maintainer-led)
Maintainer runs the site with one tutorial group on their own devices; collects observed confusions and device failures; files them as issues. Claude Code sessions then fix issues in batches.
**Exit:** all pilot-blocking issues closed. Site is v1.0; tag the release.
*(Superseded by A1 Phase 25 — same content, renumbered.)*

---

## Standing rules
- A phase is never "done" with failing gates — partial delivery must say so explicitly.
- Bugs found in earlier phases interrupt the current phase: fix, re-run gates, then resume.
- New feature ideas mid-build go to a `BACKLOG.md` list, not into the code.

---
---

# Amendment A1 — 2026-09-08 (maintainer-approved)

Reason: SYLLABUS.md v3 replaced the 6-chapter provisional syllabus with a 17-chapter book-first structure (OpenStax Part A = Chapters 1–13; Part B = Chapters 14–17). Logged in DECISIONS.md (D-001, D-002, D-003, D-008). This amendment redefines Phases 4 onward and adds the audit protocol. Phases 0–3 and the Standing rules above are unchanged.

## A1 §1 — Revised phase map (Phase 4 onward)

| Phase | Scope | Notes |
|---|---|---|
| 4 | **Pilot demo: SYLLABUS v3 §3.1 (coin flip)** — built inside `chapters/probability-topics/` | Pattern-setter. Chapter 3 is deliberately built before Chapters 1–2 (D-002). Maintainer review REQUIRED before Phase 5. |
| 5 | Complete Chapter 3 (Probability Topics: §3.2, §3.3 + section texts) | Same exit criteria as original Phase 5. |
| 6 | Chapter 1 — Sampling and Data | Canvas required for 1.1/1.2 dot fields (D-007). |
| 7 | Chapter 2 — Descriptive Statistics | Skew mechanism per D-004. |
| 8 | Chapter 4 — Discrete Random Variables | stats.js grows: geometric + hypergeometric samplers/PMFs (A1 §2). |
| 9 | Chapter 5 — Continuous Random Variables | |
| 10 | Chapter 6 — The Normal Distribution | |
| 11 | Chapter 7 — The Central Limit Theorem | |
| 12 | Chapter 8 — Confidence Intervals | stats.js grows: log-gamma, incomplete beta, t CDF, inverse-t via bisection. |
| 13 | Chapter 9 — Hypothesis Testing (One Sample) | |
| 14 | **v0.5 hardening + release** | Original Phase 11 checklist applied to Chapters 1–9 + landing. Tag `v0.5`. Rationale: complete descriptive → probability → inference arc becomes publicly usable (D-008). |
| 15 | Chapter 10 — Two-Sample Tests | |
| 16 | Chapter 11 — Chi-Square | stats.js grows: incomplete gamma, χ² CDF. |
| 17 | Chapter 12 — Linear Regression and Correlation | Mode toggle per D-006. |
| 18 | Chapter 13 — F Distribution and ANOVA | stats.js grows: F CDF (from incomplete beta). |
| 19 | Part A hardening sweep | Original Phase 11 checklist, all of Part A. |
| 20 | Chapter 14 — Counting (2 sections per SYLLABUS v3) | |
| 21 | Chapter 15 — Bayesian Inference | Canvas for 15.1 icon array (D-007). stats.js grows: Beta PDF. |
| 22 | Chapter 16 — Resampling | |
| 23 | Chapter 17 — Beyond One Variable | stats.js grows: 3×3 normal-equations solve (Cramer, hand-written). |
| 24 | Final site-wide hardening | Original Phase 11 checklist, full site. Exit = SPEC §10. |
| 25 | Student pilot (maintainer-led) | Original Phase 12, renumbered. Exit = v1.0 tag. |

## A1 §2 — stats.js growth policy (replaces "all math in Phase 1")

Phase 1 implements only what Chapters 1–7 need (the list in the original Phase 1 text). Every later mathematical function lands in the FIRST phase whose chapter needs it, in the same session, with its reference-value tests (NumPy/SciPy snippet recorded in a comment) landing in the same session. The per-phase math additions are listed in the A1 §1 table's Notes column and ledgered in STATUS.md. A math function is never merged untested, and never earlier than needed. (D-003)

## A1 §3 — Audit protocol (STATUS.md)

`docs/STATUS.md` is the project's audit ledger — the single place the maintainer checks to see what is complete, what is in progress, and whether gates truly passed.

Rules (binding, same force as HANDBOOK §8):

1. **Every session ends by updating STATUS.md.** A phase may not be reported "done" — and its commit series may not be pushed as final — until its STATUS.md rows are filled in. Updating STATUS.md is part of the phase, not optional paperwork.
2. **What gets recorded:** phase status and date; per-demo D1–D10 pass/fail; per-function test status in the stats.js ledger; gate results (tests green count, console-clean, Lighthouse score where applicable); deviations or known limitations, each with its DECISIONS.md reference.
3. **Append-only honesty.** Never delete or rewrite past rows. Corrections are new dated note lines. If a gate failed and the phase shipped anyway (maintainer-approved only), STATUS.md says so explicitly.
4. **Cross-references, not prose.** STATUS.md links phases to DECISIONS.md entries and delivery reports. Detailed reasoning lives in DECISIONS.md; STATUS.md stays scannable.
5. **Maintainer audit path** (how Kaung Hein Htet verifies a phase independently, ~5 minutes): open STATUS.md and read the phase row → open `/tests/index.html` in a browser and confirm the green count matches the recorded count → open the touched chapter page, check the console is clean, and try the demo's extremes → spot-check one DECISIONS.md reference. If any of these disagree with STATUS.md, the phase reopens.
