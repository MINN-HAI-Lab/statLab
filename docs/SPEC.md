# SPEC.md — Product Specification

Project codename: **StatLab** (rename freely; update all three docs if you do).

This document defines WHAT to build. HANDBOOK.md defines HOW. PLAN.md defines the ORDER. SYLLABUS.md defines the statistical CONTENT (chapters, concepts, and what each demo must teach). If these documents conflict, resolve in this priority: SPEC > HANDBOOK > SYLLABUS > PLAN, and flag the conflict to the maintainer instead of silently choosing.

---

## 1. Purpose

An interactive, visual introduction to probability and statistics for undergraduate students of any university and any major. Every core concept is taught through a manipulable visualization: the student drags, clicks, or samples, and the mathematics responds in real time. Text explains; interaction convinces.

Inspiration: seeing-theory.brown.edu (structure and pedagogy), but built on a current stack and a calmer, more neutral visual language.

## 2. Audience and context of use

- Undergraduates with no assumed background beyond high-school algebra. No calculus required to *use* any demo.
- Used both self-directed (student browsing at home) and instructor-directed (projected in lecture, or opened from a QR code on a slide, often on a phone).
- English as a second language for many users. All copy must use plain, short sentences. Every demo must be understandable **without reading instructions**: the affordances themselves (a big obvious button, a draggable handle with a grab cursor, an animation that invites repetition) must communicate what to do within 5 seconds.

## 3. Non-goals (explicitly out of scope)

- No user accounts, login, or personalization.
- No backend, database, or server-side computation. The site is 100% static files.
- No progress tracking, grades, or quizzes with stored results.
- No cookies, no analytics in v1, no third-party trackers.
- No content beyond SYLLABUS.md scope. Do not add extra chapters or demos on your own initiative.
- No mobile app. The website itself must work on phones (see §6), but no native builds.

## 4. Information architecture

- **Landing page** (`index.html`): project title, one-sentence value proposition, chapter grid. Each chapter card shows its title, a one-line description, and its demo thumbnails. Calm, minimal, no full-screen scroll-jacking.
- **One page per chapter** (`/chapters/<slug>/index.html`): contains that chapter's 2–4 sections. Each section = short explanatory text (left/top) + one interactive demo (right/bottom). Sections are anchor-linkable (`#section-2`) so a QR code can land on an exact demo.
- **About page**: authorship, license, how to cite, link to repository.
- Chapter list, section titles, and per-demo learning goals come from **SYLLABUS.md**. If SYLLABUS.md is absent, use its provisional version and note this in the delivery report.

## 5. Functional requirements — every demo

Each interactive demo MUST satisfy all of the following. These are acceptance criteria; check each one before marking a demo done.

- **D1. Zero-instruction usability.** A first-time user discovers the primary interaction within 5 seconds without reading help text. Primary action is the most visually prominent element.
- **D2. Immediate feedback.** Every user input produces a visible change in under 100 ms (animations may take longer, but must *start* immediately).
- **D3. Honest mathematics.** All displayed quantities are computed, never faked or hard-coded. Empirical results (e.g., sample means) must actually come from the random draws shown. Theoretical curves must come from correct closed-form formulas.
- **D4. Reset.** Every demo has a clearly visible reset control restoring its initial state.
- **D5. Sensible defaults.** The initial state already shows something meaningful — never an empty chart waiting for input.
- **D6. Bounded inputs.** Sliders and inputs are range-limited so no reachable state produces NaN, Infinity, a frozen browser, or a meaningless plot. Test the extremes of every slider.
- **D7. Determinism where it matters.** Random simulation is genuinely random, but axes, scales, and layout must remain stable while data accumulates (no jittering rescale every frame; rescale smoothly and rarely).
- **D8. Self-contained.** The demo works when its chapter HTML file is opened from the local filesystem (`file://`) with no network, except for the two approved CDN assets (see HANDBOOK §3) which must degrade gracefully: if KaTeX fails to load, raw LaTeX source is shown, and the demo still works.
- **D9. Performance.** Smooth (no dropped-frame stutter visible to the eye) with the demo's maximum data size on a mid-range phone. If a demo animates > 500 elements, it must use Canvas, not SVG, for those elements.
- **D10. Verified numerics.** Every statistical formula implemented in JS is verified against reference values in a test file (see HANDBOOK §7) before the demo is considered done.

## 6. Compatibility requirements

- **Browsers:** last 2 versions of Chrome, Firefox, Safari, Edge. No IE support.
- **Viewports:** fully usable from 360 px wide (small phone) to 1920 px. Demos may stack vertically on narrow screens but must never require horizontal scrolling.
- **Input:** all interactions must work with both mouse and touch. Drag targets ≥ 44×44 px on touch.
- **Keyboard & accessibility:** every control reachable and operable by keyboard; visible focus states; WCAG 2.1 AA contrast; all meaning conveyed by color is also conveyed by position, shape, or label (color-blind safe).
- **No motion trap:** respect `prefers-reduced-motion` — replace continuous animations with stepped updates.

## 7. Visual and tonal requirements

- **Mood: mild, calm, unhurried.** The site should feel like a quiet reading room, not a dashboard. No saturated brights, no gradients-for-decoration, no drop-shadow stacking, no parallax, no autoplaying motion on page load.
- Neutral academic theme usable by any university: off-white background, near-black text, ONE muted accent color for interactive elements and data, plus a small set of muted categorical colors for multi-series charts. Exact tokens are locked in HANDBOOK §5; do not invent new colors.
- Generous whitespace and a limited type scale. Reading text max width ~70 characters.
- Every demo visually consistent with every other demo: same slider style, same button style, same chart margins, same font.

## 8. Content requirements

- Explanatory text per section: 50–150 words, plain English, defined terms in **bold** on first use, formulas rendered with KaTeX.
- Each section states (implicitly through its text, not as a labeled list) what the student should notice in the demo.
- All statistical claims must be standard textbook material. When two legitimate conventions exist (e.g., quantile methods, sample vs. population variance), pick one, state it in a footnote, and use it consistently site-wide.

## 9. Licensing and attribution

- Code: MIT license. Content text: CC BY 4.0. Include LICENSE file and per-page footer attribution.
- Do not copy text, code, or design assets from seeing-theory or any other site. Inspiration in structure is fine; reproduction is not.

## 10. Definition of done (release-level)

The project is releasable when: every chapter in SYLLABUS.md is implemented; every demo passes D1–D10; the numeric test page passes 100%; the site scores ≥ 95 in Lighthouse accessibility on landing and one chapter page; and the whole repository deploys as-is to GitHub Pages with no build step.

---

# Amendment S1 — 2026-09-10 (D-040, D-041)

Maintainer-ordered design revision, authorised in writing. Original text above is preserved
unchanged; where the two disagree, S1 governs.

## S1 Section 1 — The landing page is a learning-journey path (supersedes Section 4, bullet 1)

Section 4's first bullet describes a chapter grid with demo thumbnails. It is replaced by a
**vertical journey path**: a trail of chapter nodes drawn in prerequisite order, so a student can
see what a chapter needs before they open it. The chain is fixed by the maintainer and recorded in
`chapters.js` as `tier` and `branchOf`; it is never written into HTML by hand.

- **Core Concepts** are the thirteen chapters of the main trail, in order 1 to 13.
- **Advanced Concepts** are four side branches: Counting and Bayesian Inference off Chapter 3,
  Resampling off Chapter 9, Beyond One Variable off Chapter 12.
- A node shows the chapter number, title and one-line description, is a single link, and meets the
  44 px touch target of Section 6. Consecutive nodes are joined by a connector; a branch joins its
  prerequisite with a lighter dashed connector.
- At 360 px the path is a single column with branches inline directly after their prerequisite.
- Chapter pages keep their layout and gain trail-order previous/next links. A branch chapter offers
  a way back to the trail node it hangs off rather than a next step.

**Section 3's non-goals are unchanged, and one of them is load-bearing here: there is still NO
progress tracking.** No checkmarks, no locks, no completion states, no streaks, no mascots. The path
shows the order to learn in, not how far anyone has got, and every node is always clickable.
`tools/check-content.mjs` fails the build if progress vocabulary appears in the path.

## S1 Section 2 — Two accents and two themes (extends Section 7)

Section 7's calm-mood rule stands in full: quiet reading room, no saturated brights, no decorative
gradients, no shadow stacking, no parallax, no autoplaying motion. Two things are added.

1. **A second accent for tier.** Section 7's "ONE muted accent colour" becomes two: `--accent` for
   core chapters and data, `--accent-2` for the advanced tier. It is used only to distinguish the
   two tiers of the journey path, never inside a chart. Because colour is never a sole cue
   (Section 6), the tiers also differ in **shape** — core nodes are circles, advanced nodes are
   diamonds — and each node names its tier in words.
2. **A day and a night theme.** Both are neutral and academic and both meet WCAG AA. Exact tokens
   are locked in HANDBOOK Amendment H2. The viewer's system preference decides the first load; a
   header toggle switches it; the choice is remembered in one storage key that the About page
   discloses.
