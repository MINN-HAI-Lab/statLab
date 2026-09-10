---
description: Execute one StatLab build phase under a token budget (percent of a full-phase session)
argument-hint: <phase-number> [budget-percent, default 100]
---

Arguments given: `$ARGUMENTS`

Parse them yourself: the first token is the PHASE NUMBER (call it N); the second token, if present, is the BUDGET PERCENT (call it B); if absent, B = 100. State "Phase N at B%" in your first line and use N and B everywhere below.

You are executing Phase N of the StatLab build under a work budget of B% of a normal full-phase session.

## Setup (always)
1. Read, in order: docs/SPEC.md, docs/HANDBOOK.md, docs/PLAN.md (Amendment A1 governs the phase map), docs/SYLLABUS.md, docs/DECISIONS.md, docs/STATUS.md.
2. Confirm from STATUS.md that all phases before Phase N are ✅ done. If not, STOP and report which prerequisite is missing.
3. Restate Phase N's scope and exit criteria from PLAN A1 in your own words. If anything is ambiguous or documents conflict, STOP and ask.

## Budget interpretation — B%
Your budget controls SCOPE, not quality. Never trade the quality gates for coverage. Plan the phase as an ordered list of the smallest independently-deliverable units (for a chapter phase: one demo + its stats.js functions + its tests + its section text = one unit). Then:

- **100%**: attempt the full phase, all units, full gate run.
- **75%**: attempt all units, but if the phase is large, defer the last unit rather than rushing gates.
- **50%**: deliver roughly half the units — complete, gated, tested. Do not start units you cannot finish.
- **25%**: deliver exactly one unit, fully gated. Nothing more.

Rules under any budget below 100:
- Finish units completely; never leave a unit half-built. A finished small slice beats an unfinished large one.
- When the budget's unit count is reached, STOP CODING even if context remains.
- Mark the phase row in STATUS.md as `⚠ partial (budget B%)`, list exactly which units are done and which remain, so the next `/phase N` run can resume cleanly.
- Never mark a phase ✅ done unless ALL its units pass ALL gates.

## Execution
4. Implement the planned units per HANDBOOK conventions (tokens only, one demo one file, additive changes, formulas cite sources).
5. Run the quality gates (HANDBOOK §7) on everything you touched: tests green, D1–D10 walk per demo, extremes check, console clean, static check, a11y, handbook grep audit.

## Close-out (mandatory, part of the budget — reserve effort for it)
6. Update docs/STATUS.md: phase row (status, date, tests-green count, console-clean, Lighthouse if applicable, DECISIONS refs), demo ledger rows, stats.js ledger rows, one session-log line. Append-only.
7. Log any non-obvious decision in docs/DECISIONS.md as a new dated D-### entry.
8. Produce a delivery report: files changed; units done vs deferred; gate results (pass/fail each); known limitations; recommended next command (e.g., `/phase N 50` to finish, or `/phase <next> 100`).

Do not refactor outside scope. Do not start a later phase. Do not push unfinished work as final.
