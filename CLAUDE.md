# CLAUDE.md — StatLab

Interactive statistics website for undergraduates. Vanilla HTML/CSS/JS + D3 v7 + KaTeX. No build step, no npm, no frameworks. Deploys as-is to GitHub Pages.

## Governing documents (read before any work)
Priority on conflict: SPEC > HANDBOOK > SYLLABUS > PLAN. Flag conflicts; never silently choose.

- docs/SPEC.md — what to build; demo acceptance criteria D1–D10
- docs/HANDBOOK.md — stack, conventions, quality gates §7, workflow §8
- docs/PLAN.md — phase order. **Amendment A1 governs**: 26 phases, book-first
- docs/SYLLABUS.md — v3, content authority; slugs are source of truth
- docs/DECISIONS.md — append-only decision log (D-001…D-010 seeded)
- docs/STATUS.md — audit ledger. **Updating it is part of every phase, not optional**

## Hard rules (repeated here because they are violated most often)
- One phase (or explicit task) per session. Never work ahead.
- Additive changes only; no refactors outside scope.
- No new dependencies of any kind. No localStorage/sessionStorage/cookies.
- Colors/sizes/fonts only via theme.css custom properties.
- Every stats.js function needs same-session tests vs NumPy/SciPy reference values (snippet in comment).
- A phase with any failing gate is `⚠ partial` in STATUS.md, never `✅ done`.

## How work is invoked
The maintainer runs the custom command `/phase <n> <budget%>` (defined in .claude/commands/phase.md). The budget percent scopes how many complete units of the phase to deliver this session; partial deliveries resume via the same command. Respect it strictly.

## Maintainer
Kaung Hein Htet (AIT). Ask rather than assume; conflicts and ambiguities stop work.
