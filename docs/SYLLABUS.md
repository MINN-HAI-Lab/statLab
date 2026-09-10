# SYLLABUS.md — Content Authority

> **Status: maintainer-approved structure, v4 (2026-09-10).** Changes from v3, all logged in DECISIONS.md: the two tiers are renamed **Core Concepts** (was Part A — The Book) and **Advanced Concepts** (was Part B — Beyond the Book) (D-043); book section references are written `[Sec x.y]` instead of the "§" glyph, which is barred from site copy (D-044); the landing page presents the chapters as a learning-journey path along the prerequisite chain rather than as a grid (D-040). Chapter content, order, goals and demo briefs are unchanged from v3. Changes from v2 were: Sec 2.3 skew mechanism specified (D-004); Sec 11.2 association model specified (D-005); Sec 12.1 mode toggle added (D-006); Chapter 14 expanded to two sections (D-009). The site follows OpenStax *Introductory Statistics* (Illowsky & Dean, CC BY 4.0) chapter-for-chapter in **Core Concepts**, then adds concepts the book does not cover in **Advanced Concepts**. Book section numbers are given as `[Sec x.y]` so text authors can cite the free book directly. Chapter slugs here are the single source of truth for folder names and `chapters.js`. Phase mapping lives in PLAN.md Amendment A1.

Format: each chapter lists its sections. Each section has a **learning goal** (the one idea the student must take away) and a **demo brief** (what the interaction is and what the student should notice). Demos must teach the goal — pedagogy decides design, not aesthetics. Book "lab" sections (data-collection experiments) are intentionally omitted; the demos serve their purpose.

---

# CORE CONCEPTS (build phase 1)

## Chapter 1 — Sampling and Data  (`sampling-and-data`)  [book Ch 1]

**1.1 Population and sample** [Sec 1.1] — Goal: a statistic estimates a parameter; we see the sample, not the population. Demo: a field of dots (population, true mean marked but dimmed); click to draw a random sample; sample mean marker appears next to the true mean; redraw repeatedly to see the estimate move while the truth stays put.
**1.2 Sampling methods and bias** [Sec 1.2] — Goal: how you sample decides what you can conclude. Demo: same population with visible subgroups; toggle simple random / stratified / cluster / convenience sampling; convenience sampling visibly over-picks one region and its running mean settles away from the truth.
**1.3 Variation in samples** [Sec 1.2, 1.3] — Goal: two honest samples disagree; variation is normal, not error. Demo: draw many samples of size n; each sample mean drops onto a strip chart; n slider shows the spread of sample means tightening.

## Chapter 2 — Descriptive Statistics  (`descriptive-statistics`)  [book Ch 2]

**2.1 Histograms** [Sec 2.1, 2.2] — Goal: a histogram shows the shape of data, and bin width changes the story. Demo: fixed dataset; drag the bin-width slider; watch the same data look smooth, ragged, or misleading; frequency polygon overlay toggle.
**2.2 Center and location** [Sec 2.3, 2.5] — Goal: mean, median, and mode answer different questions. Demo: draggable points on a number line; mean (balance point) and median (splitter) markers update live; drag one point far away and watch the mean chase it while the median holds.
**2.3 Box plots and skewness** [Sec 2.4, 2.6] — Goal: quartiles summarize position; skew separates mean from median. Demo: histogram and box plot of the same data linked; drag a skew control to reshape the data; watch quartiles, whiskers, and the mean–median gap respond. *Data model (D-004): two-component normal mixture on a fixed axis range; the skew slider moves the second component's weight and offset, so axes never rescale (per D7).*
**2.4 Spread** [Sec 2.7] — Goal: standard deviation is a typical distance from the mean. Demo: deviations drawn as horizontal sticks from the mean; squares option shows why we square; sample SD readout; drag points to grow/shrink spread.

## Chapter 3 — Probability Topics  (`probability-topics`)  [book Ch 3]

**3.1 Chance and long-run frequency** [Sec 3.1] — Goal: probability is long-run relative frequency. Demo: flip a (biased) coin one at a time or 100 at a time; running empirical frequency line converges toward the true p line; slider sets p.
**3.2 Events, unions, intersections** [Sec 3.2, 3.3, 3.5] — Goal: union, intersection, complement as regions of the sample space; mutually exclusive vs independent are different ideas. Demo: drag two event circles over a field of random points; live probabilities of A, B, A∩B, A∪B from point counts; separating the circles shows mutual exclusivity. *Point count capped at 400 to stay within SVG (D-007).*
**3.3 Conditional probability and contingency tables** [Sec 3.4, 3.5] — Goal: conditioning restricts the sample space. Demo: drop balls through a branching board; P(A|B) shown by filtering to the B-branch; linked 2×2 contingency table fills with the same counts.

## Chapter 4 — Discrete Random Variables  (`discrete-random-variables`)  [book Ch 4]

**4.1 Expectation** [Sec 4.1, 4.2] — Goal: expected value is the long-run average of outcomes. Demo: roll a die with editable face probabilities; running sample mean approaches the computed expectation marker.
**4.2 Variance of a random variable** [Sec 4.2] — Goal: variance measures spread around the expectation. Demo: same die; deviations from the mean visualized; sample variance readout converges to theoretical value.
**4.3 The named discrete distributions** [Sec 4.3 to 4.6] — Goal: binomial, geometric, hypergeometric, and Poisson each model a recognizable situation. Demo: distribution picker with parameter sliders; sample and pile up draws under the theoretical PMF; one-line "when to use this" scenario per distribution.

## Chapter 5 — Continuous Random Variables  (`continuous-random-variables`)  [book Ch 5]

**5.1 Density and area** [Sec 5.1] — Goal: densities give probability as area; P(X = x) is zero. Demo: uniform/exponential with sliders; drag an interval to shade area = probability; sampled points accumulate into a histogram over the curve; shrink the interval to a point and watch the probability go to zero.
**5.2 The exponential distribution** [Sec 5.3] — Goal: exponential models waiting times; it is memoryless. Demo: arrival ticks on a timeline; waiting-time histogram builds under the exponential curve; "given we've waited t already" control re-shades the conditional distribution to show memorylessness.

## Chapter 6 — The Normal Distribution  (`normal-distribution`)  [book Ch 6]

**6.1 Z-scores** [Sec 6.1] — Goal: standardizing puts every normal on one common scale. Demo: two normal curves with different μ, σ side by side; drag a value on either; its z-score and position on the standard normal shown; sliders for μ and σ.
**6.2 Normal areas and the empirical rule** [Sec 6.2] — Goal: probabilities are areas; 68–95–99.7 is worth memorizing. Demo: drag interval edges on a normal curve; live shaded area; snap buttons for ±1σ, ±2σ, ±3σ.

## Chapter 7 — The Central Limit Theorem  (`central-limit-theorem`)  [book Ch 7]

**7.1 CLT for sample means** [Sec 7.1] — Goal: means of many draws are approximately normal regardless of the source distribution. Demo: choose an odd parent distribution; animate repeated sample means of size n dropping into a histogram; n slider; normal overlay appears as n grows.
**7.2 The standard error** [Sec 7.1, 7.3] — Goal: the spread of sample means shrinks like σ/√n. Demo: same machine; lock the parent, sweep n; the sampling distribution visibly narrows; SE readout tracks σ/√n curve.
**7.3 CLT for sums** [Sec 7.2] — Goal: sums, like means, become normal. Demo: sums of n draws accumulate into a histogram; normal overlay with mean nμ and SD σ√n.

## Chapter 8 — Confidence Intervals  (`confidence-intervals`)  [book Ch 8]

**8.1 What "95% confident" means** [Sec 8.1] — Goal: "95%" describes the procedure, not one interval. Demo: generate many CIs as horizontal segments; those missing the true mean colored with `--warn`; running capture-rate readout; confidence-level and n sliders.
**8.2 The t distribution** [Sec 8.2] — Goal: unknown σ costs us certainty; t has heavier tails that fade as n grows. Demo: t curve over a normal curve; df slider morphs t into the normal; CI width readout compares z-interval vs t-interval for the same data.
**8.3 Intervals for proportions** [Sec 8.3] — Goal: the same logic covers proportions. Demo: poll simulator; true p slider; draw a sample of n voters, show the interval; repeat-to-capture-rate view as in 8.1.

## Chapter 9 — Hypothesis Testing (One Sample)  (`hypothesis-testing`)  [book Ch 9]

**9.1 Hypotheses and error types** [Sec 9.1, 9.2] — Goal: Type I and Type II errors trade off through α. Demo: H₀ and true-effect sampling distributions drawn together; drag the decision cutoff; α and β regions re-shade live; effect-size and n sliders move the curves.
**9.2 The p-value** [Sec 9.3, 9.4] — Goal: a p-value is the probability, under H₀, of data at least this extreme. Demo: set H₀, draw a sample, shade the tail area; repeat under a true/false H₀ toggle to see the p-value distribution and Type I error rate.
**9.3 The full test, honestly run** [Sec 9.5] — Goal: the mechanical steps of a test, and why "fail to reject" is not "H₀ is true." Demo: guided single test on simulated data: state H₀, draw, compute test statistic, shade, decide; a counter of repeated runs shows how often each decision occurs under a chosen truth.

## Chapter 10 — Hypothesis Testing (Two Samples)  (`two-sample-tests`)  [book Ch 10]

**10.1 Comparing two means** [Sec 10.1, 10.2] — Goal: the test statistic asks whether the observed gap is large relative to its noise. Demo: two population curves with draggable means; sample both groups; difference-of-means drops onto its own sampling distribution; overlap vs significance made visible.
**10.2 Comparing two proportions** [Sec 10.3] — Goal: same logic for counts. Demo: two conversion-rate style bars; sample both; difference and its p-value; n slider shows small real differences becoming detectable.
**10.3 Paired samples** [Sec 10.4] — Goal: pairing removes between-subject noise. Demo: before/after points connected by lines; toggle "treat as independent" vs "paired"; watch the variance of the difference collapse and the p-value drop for the same data.

## Chapter 11 — The Chi-Square Distribution  (`chi-square`)  [book Ch 11]

**11.1 Goodness of fit** [Sec 11.1, 11.2] — Goal: χ² measures total mismatch between observed and expected counts. Demo: a die with editable claimed probabilities; roll many times; observed vs expected bars; per-category contributions stack into the χ² statistic; repeat under a fair die to build the null distribution.
**11.2 Test of independence** [Sec 11.3 to 11.5] — Goal: independence means the table's rows tell the same story. Demo: 2×3 contingency table fed by a simulator with an association-strength slider; expected counts overlay; χ² and p-value respond as association grows from zero. *Data model (D-005): cell probabilities are a linear interpolation between the exact independence table and a fixed target associated table; every slider position yields a valid probability table.*

## Chapter 12 — Linear Regression and Correlation  (`linear-regression`)  [book Ch 12]

**12.1 Least squares** [Sec 12.1 to 12.3] — Goal: the fitted line minimizes squared residuals. Demo: draggable points; residual squares drawn literally as squares; line updates; try to beat OLS by dragging a manual line, with SSE scoreboard. *Interaction (D-006): an explicit two-state toggle — "move points" / "your line vs best line" — so point-dragging and line-dragging never collide, especially on touch.*
**12.2 Correlation** [Sec 12.2, 12.4] — Goal: r measures linear association, not causation or slope. Demo: drag points or pick presets (including a nonlinear pattern with r ≈ 0); live r and r².
**12.3 The line is an estimate** [Sec 12.4] — Goal: the regression line is an estimate with sampling variability. Demo: resample from a population cloud; each fitted line drawn faintly; band of lines shows uncertainty; n slider.
**12.4 Prediction and outliers** [Sec 12.5, 12.6] — Goal: prediction is safest inside the data; influential points can steer the whole line. Demo: fitted line with a draggable "new point"; drag it far in x and watch slope, r, and predictions swing; extrapolation region shaded as a caution zone.

## Chapter 13 — F Distribution and One-Way ANOVA  (`anova`)  [book Ch 13]

**13.1 The idea of ANOVA** [Sec 13.1, 13.2] — Goal: F compares variation between groups to variation within groups. Demo: three group strips with draggable group means and a common spread slider; between/within variation shown as two shaded quantities; F readout; drag means together and apart.
**13.2 The F distribution and the decision** [Sec 13.2, 13.3] — Goal: under H₀ the F-ratio has a known distribution. Demo: simulate many datasets under equal means; F values pile into the F distribution; observed F from 13.1 marked with its tail area.

---

# ADVANCED CONCEPTS (build phase 2)

Concepts the book does not cover but the course direction requires. Same quality bar; each Advanced Concepts chapter gets its own build phase after Core Concepts is complete. On the landing page each one branches off the core chapter it depends on (D-040).

## Chapter 14 — Counting  (`counting`)

**14.1 The multiplication rule** — Goal: independent choices multiply; most counting is repeated multiplication. Demo: build a small decision tree (e.g., 3 shirts × 2 trousers × 2 shoes); each added stage visibly multiplies the leaf count; leaves light up as the total readout updates.
**14.2 Permutations and combinations** — Goal: permutations vs. combinations. Demo: pick k items from n; visual tree/grid of arrangements; toggle "order matters."

## Chapter 15 — Bayesian Inference  (`bayesian-inference`)

**15.1 Bayes' theorem** — Goal: posterior odds = prior odds × likelihood ratio. Demo: disease-test scenario with prevalence and sensitivity/specificity sliders; population icon array shows why positive tests can still mean low probability. *Icon array renders on Canvas (D-007).*
**15.2 Likelihood** — Goal: likelihood scores parameters by the data. Demo: observed coin flips fixed; slide candidate p; likelihood curve traces out; MLE marked.
**15.3 Prior to posterior** — Goal: data updates belief. Demo: Beta prior sliders; feed Bernoulli data one observation at a time; posterior curve reshapes live; prior/likelihood/posterior shown together.

## Chapter 16 — Resampling  (`resampling`)

**16.1 The bootstrap** — Goal: resampling the sample approximates the sampling distribution when formulas are out of reach. Demo: one observed sample of dots; resample with replacement (animated picks); bootstrap means pile into a histogram; percentile interval marked; compare against the formula CI from Chapter 8.
**16.2 Permutation tests** — Goal: if labels don't matter, shuffling them shows what chance alone produces. Demo: two labeled groups with an observed mean difference; shuffle labels repeatedly; shuffled differences build the null distribution; observed difference marked with its tail proportion.

## Chapter 17 — Beyond One Variable  (`beyond-one-variable`)

**17.1 Simpson's paradox** — Goal: a third variable can reverse a conclusion. Demo: scatter with two colored subgroups; toggle "ignore groups" to see the pooled trend flip sign against the within-group trends; slider controls group imbalance.
**17.2 Two predictors** — Goal: adding a predictor changes what a coefficient means. Demo: dataset where x₁ and x₂ are correlated; fit y on x₁ alone vs on both; watch the x₁ coefficient shrink/flip; plain-English readout of "holding x₂ fixed."

---

## Site-wide content conventions
- Quantiles: Weibull method, position `(n+1)p` (footnote on first use per chapter).
- Sample variance: divide by n−1; call it "sample variance" and footnote why.
- Notation: capital letters for random variables, lowercase for realizations; P(·) for probability, E[·], Var(·).
- Reading level: plain English, sentences ≤ 20 words where possible, no idioms.
- Core Concepts text sections cite the book as: OpenStax *Introductory Statistics*, Section x.y (free at openstax.org); Advanced Concepts sections cite Blitzstein & Hwang (probabilitybook.net) or *Computational and Inferential Thinking* (inferentialthinking.com) as appropriate.
- Sentences carry their own weight. A colon or semicolon inside a sentence is nearly always a sentence that wants splitting, so section text uses neither, and `tools/check-prose.mjs` reports any that appear (D-046). A colon is still right for a genuine label, such as the "Reading:" line or a chart legend that reads "Orange curve: ...".
- The "§" glyph is never used in site copy. Cite sections in words: "Section 3.1", "Sections 11.3 to 11.5" (D-044). This file writes them as `[Sec x.y]`; `tools/check-content.mjs` fails any page that prints the glyph.
