# VIDEO_PLAN.md — the scene manifest

Created 2026-09-27 from the `/video` command's §2, verbatim. Status lines are appended per scene
and are the record of what exists; STATUS.md carries the per-session log.

## Rule for every scene
It teaches what the chapter's interactive demo CANNOT — a derivation, a piece of notation, a
conceptual distinction. It never re-shows what a demo already does. One idea per scene. 30–60 s.
On-screen text only, sentences under 20 words. All numbers computed in NumPy with a seeded
generator (seed in a comment) and cross-checked against a SciPy value in a comment. Style from
`statlab_theme` only.

Status legend: `⬜ not started` · `🔨 in progress` · `🎬 rendered` · `✅ embedded` · `🔁 reopened`

## Priority 1 (build first, in this order)

- **V07 `ch07-standard-error`** — Why SE = σ/√n. Chain: Var of a sum of independent draws adds →
  Var(mean) = σ²/n → SD = σ/√n → quadruple n to halve the spread. Demo already shows the
  narrowing; the video shows WHY.
  - `✅ embedded` · 2026-09-25 · landscape 0.84 MB, vertical 0.47 MB (CRF 23, 32.2 s) · built
    under the pipeline task (D-054/D-055, HANDBOOK H4); captions were hand-written from the
    scene's printed timeline, before the `caption()` helper existed. mp4 not yet on the Release:
    `media-v1` exists with no asset attached (the file was dropped into the description box),
    so `chapters.js` still holds the placeholder.
- **V02 `ch02-why-n-minus-1`** — Why sample variance divides by n−1. Chain: deviations from the
  sample mean sum to zero → one deviation is determined by the others → dividing by n
  underestimates on average → n−1 corrects it. Show a tiny n=3 example with actual numbers.
  - `✅ embedded` · 2026-09-27 · landscape 0.67 MB, vertical 0.38 MB (CRF 23, 31.0 s) · seed 20260927, N(50, 10); x = 29.5, 45.5, 45.8; averages over 20 000 samples 67.2 (÷n) and 100.7 (÷(n−1)) against 100. mp4 not yet on a Release; placeholder URL.
- **V09 `ch09-what-a-p-value-is-not`** — Three misreadings, each struck out and replaced:
  "probability H₀ is true" ✗; "probability the result is due to chance" ✗; "1 − p = probability
  of the effect" ✗. Then the one correct sentence, built word by word.
  - `✅ embedded` · 2026-09-27 · landscape 0.56 MB, vertical 0.34 MB (CRF 23, 31.6 s) · true mean 52.5 chosen so the seeded sample gives p = 0.023, "about 2 times in 100"; the first choice, 54.5, gave p = 0.001 and "0 times", now guarded by an assertion. mp4 not yet on a Release; placeholder URL.
- **V08 `ch08-where-1-96-comes-from`** — 95% ↔ 1.96: shade the middle 95% of the standard
  normal, show the two tails of 2.5%, look up the z, then show the interval formula assemble
  from x̄, z, σ/√n.
  - `✅ embedded` · 2026-09-27 · landscape 0.59 MB, vertical 0.35 MB (CRF 23, 30.6 s) · z = 1.959963985 by bisection on erfc, against SciPy 1.959963984540054; sample of 20 gives 52.1 ± 4.38. mp4 not yet on a Release; placeholder URL.
- **V15 `ch15-bayes-from-conditional`** — Derive Bayes from P(A∩B) = P(A|B)P(B) = P(B|A)P(A).
  Then one disease-test number line: prior → likelihood ratio → posterior odds.
  - `⬜`

## Priority 2

- **V04 `ch04-binomial-mean-is-np`** — E[X] = np via linearity: X is a sum of n Bernoullis, each
  with mean p. No combinatorics.
  - `⬜`
- **V05 `ch05-density-is-not-probability`** — Why P(X=x)=0 yet f(x) can exceed 1: probability is
  area, area of a line is zero, f is a rate. Show a uniform on [0, ½] with height 2.
  - `⬜`
- **V06 `ch06-what-z-does`** — z = (x−μ)/σ as two moves: shift by μ, then rescale by σ; two
  different normals land on the same standard curve.
  - `⬜`
- **V10 `ch10-why-pairing-helps`** — Var(X−Y) = Var X + Var Y − 2Cov(X,Y): positive covariance
  shrinks the noise, so paired differences are tighter than independent ones.
  - `⬜`
- **V11 `ch11-chi-square-from-z`** — χ² = Σ (O−E)²/E as a sum of squared standardised
  deviations; one 2-category table, real numbers.
  - `⬜`
- **V12 `ch12-what-r-squared-means`** — SST = SSR + SSE, so r² is the fraction of variation the
  line explains. Show the three sums as areas that must add up.
  - `⬜`
- **V13 `ch13-f-is-a-ratio-of-variances`** — F = (between-group variance estimate) /
  (within-group variance estimate); both estimate σ² under H₀, so F ≈ 1 when means are equal.
  - `⬜`

## Priority 3

- **V16 `ch16-why-resampling-works`** — The sample stands in for the population; resampling it
  imitates repeated sampling. Contrast with Chapter 7's true sampling distribution.
  - `⬜`
- **V17 `ch17-simpsons-paradox-arithmetic`** — Two 2×2 tables whose within-group rates both
  favour A while the pooled rate favours B; the arithmetic, not the picture (the demo has the
  picture).
  - `⬜`
- **V03 `ch03-independent-vs-exclusive`** — P(A∩B)=P(A)P(B) versus P(A∩B)=0: two equations, two
  Venn states, why exclusive events are strongly dependent.
  - `⬜`

Chapters 1 and 14 get no video: the demos already carry the whole idea.
