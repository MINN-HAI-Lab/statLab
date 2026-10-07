/*
  insights.js — short cause-and-effect callouts inside the demos (D-057).

  When a student moves a slider or presses a button and the picture changes, a
  one- or two-sentence note says what just happened in statistical terms and why,
  with the live numbers in it. It is a reading aid, not a tutorial: each note
  fires once per page load, only when its condition is met, and goes away on its
  own, on Escape, on Dismiss, or when the next note arrives.

  No demo file knows this exists. Every `demos.init*` is wrapped here, after the
  demo scripts have loaded and before the page's init runs, so the only thing a
  demo needs is what it already has, `api.state()`. Rules compare the state as it
  stood when the last interaction settled with the state now, so a note can say
  "n rose from 10 to 50, and the standard error fell from 0.91 to 0.41".

  Nothing is stored (SPEC Section 3): "once" means once per page load, in memory.
  Copy follows the site's sentence rules and tools/check-prose.mjs checks it.
*/
(function () {
  "use strict";

  var CHECK_DELAYS = [80, 1500, 3800];   // after an interaction: once the handler ran, then twice for animations
  var AUTO_HIDE_MS = 9000;

  function num(v) { return typeof v === "number" && isFinite(v); }
  function fmt(v) {
    if (typeof v === "string") return v;
    if (!num(v)) return null;
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    var s = Math.abs(v) < 0.1 ? v.toFixed(3) : v.toFixed(2);
    return s.replace(/\.?0+$/, "");
  }
  /** Resolve {name} placeholders; null if any value is missing or not finite. */
  function fill(text, vars) {
    var ok = true;
    var out = text.replace(/\{(\w+)\}/g, function (_, k) {
      var f = fmt(vars ? vars[k] : undefined);
      if (f === null) ok = false;
      return f === null ? "" : f;
    });
    return ok ? out : null;
  }
  function up(b, n, k) { return num(b[k]) && num(n[k]) && n[k] > b[k] + 1e-9; }
  function down(b, n, k) { return num(b[k]) && num(n[k]) && n[k] < b[k] - 1e-9; }
  function changed(b, n, k, eps) { return num(b[k]) && num(n[k]) && Math.abs(n[k] - b[k]) > (eps || 1e-9); }
  function near(a, b, eps) { return num(a) && num(b) && Math.abs(a - b) <= eps; }
  function pct(x) { return num(x) ? Math.round(100 * x) : NaN; }
  function count(list, pred) { var c = 0; (list || []).forEach(function (x) { if (pred(x)) c++; }); return c; }
  function min(list) { return (list || []).reduce(function (m, x) { return num(x) && x < m ? x : m; }, Infinity); }

  /* ---- the rules, one list per demo ------------------------------------------
     { id, when(before, now) -> boolean, text with {placeholders}, vars(before, now) } */
  var rules = {
    "sampling-and-data__population-sample": [
      { id: "first-draw", when: function (b, n) { return n.draws > b.draws && n.draws === 1; },
        text: "Your sample mean is {sm}. The population mean is {pm}. Draw again and watch it move.",
        vars: function (b, n) { return { sm: n.sampleMean, pm: n.populationMean }; } },
      { id: "bigger-n", when: function (b, n) { return n.n >= b.n + 20 && n.draws > b.draws; },
        text: "With n up to {n}, sample means scatter less around {pm}. Bigger samples disagree less.",
        vars: function (b, n) { return { n: n.n, pm: n.populationMean }; } },
      { id: "ten-draws", when: function (b, n) { return n.draws >= 10 && b.draws < 10 && n.history && n.history.length >= 10; },
        text: "Ten sample means so far. Each one misses {pm} a little, in both directions.",
        vars: function (b, n) { return { pm: n.populationMean }; } }
    ],
    "sampling-and-data__sampling-methods": [
      { id: "convenience", when: function (b, n) { return n.method === "convenience" && b.method !== "convenience"; },
        text: "Convenience sampling takes whoever is nearest. Draw a few times and compare the running mean with {pm}.",
        vars: function (b, n) { return { pm: n.populationMean }; } },
      { id: "running-mean", when: function (b, n) { return n.draws >= 5 && b.draws < 5 && n.method !== "convenience"; },
        text: "After {d} draws the running mean is {rm}, against a population mean of {pm}. Random draws centre on the truth.",
        vars: function (b, n) { return { d: n.draws, rm: n.runningMean, pm: n.populationMean }; } },
      { id: "convenience-bias", when: function (b, n) { return n.draws >= 5 && b.draws < 5 && n.method === "convenience"; },
        text: "Convenience samples average {rm} against a population mean of {pm}. Nearness is not randomness, so the gap stays.",
        vars: function (b, n) { return { rm: n.runningMean, pm: n.populationMean }; } }
    ],
    "sampling-and-data__sample-variation": [
      { id: "pile", when: function (b, n) { return n.samples >= 50 && b.samples < 50; },
        text: "{s} sample means so far. The pile centres near {pm}. Its width is the sampling variation.",
        vars: function (b, n) { return { s: n.samples, pm: n.populationMean }; } },
      { id: "n-up", when: function (b, n) { return up(b, n, "n"); },
        text: "n rose from {n0} to {n1}. Draw more and the pile should narrow, roughly by root n.",
        vars: function (b, n) { return { n0: b.n, n1: n.n }; } },
      { id: "n-down", when: function (b, n) { return down(b, n, "n"); },
        text: "n fell from {n0} to {n1}. Expect a wider pile. Smaller samples disagree more.",
        vars: function (b, n) { return { n0: b.n, n1: n.n }; } }
    ],
    "descriptive-statistics__histogram": [
      { id: "narrow", when: function (b, n) { return down(b, n, "width") && n.width <= 2; },
        text: "Narrow bins show every bump. Some bumps are real and some are noise from only {n} commutes.",
        vars: function (b, n) { return { n: n.data ? n.data.length : NaN }; } },
      { id: "wide", when: function (b, n) { return up(b, n, "width") && n.width >= 10; },
        text: "Wide bins smooth the picture. Two groups of commuters can hide inside one bar.",
        vars: function () { return {}; } },
      { id: "polygon", when: function (b, n) { return n.polygon && !b.polygon; },
        text: "The polygon joins the bar tops. It makes two histograms easier to compare on one axis.",
        vars: function () { return {}; } }
    ],
    "descriptive-statistics__center": [
      { id: "mean-chases", when: function (b, n) { return changed(b, n, "mean", 2) && near(b.median, n.median, 0.5); },
        text: "The mean moved to {mean} while the median stayed near {median}. One far point drags the mean, not the median.",
        vars: function (b, n) { return { mean: n.mean, median: n.median }; } },
      { id: "gap", when: function (b, n) { return changed(b, n, "mean", 0.2); },
        text: "Mean {mean}, median {median}. The gap between them is a quick test for skew.",
        vars: function (b, n) { return { mean: n.mean, median: n.median }; } }
    ],
    "descriptive-statistics__boxplot-skew": [
      { id: "right", when: function (b, n) { return n.skew > 0.3 && b.skew <= 0.3; },
        text: "Right skew. The upper whisker stretches and the mean {mean} is pulled above the median {median}.",
        vars: function (b, n) { return { mean: n.mean, median: n.summary ? n.summary.median : NaN }; } },
      { id: "left", when: function (b, n) { return n.skew < -0.3 && b.skew >= -0.3; },
        text: "Left skew. The lower whisker stretches and the mean {mean} is pulled below the median {median}.",
        vars: function (b, n) { return { mean: n.mean, median: n.summary ? n.summary.median : NaN }; } },
      { id: "symmetric", when: function (b, n) { return Math.abs(n.skew) < 0.05 && Math.abs(b.skew) >= 0.3; },
        text: "Symmetric again. Mean and median agree, {mean} against {median}.",
        vars: function (b, n) { return { mean: n.mean, median: n.summary ? n.summary.median : NaN }; } }
    ],
    "descriptive-statistics__spread": [
      { id: "spread", when: function (b, n) { return num(b.sd) && num(n.sd) && n.sd > b.sd * 1.2; },
        text: "Spreading the points raised the SD from {sd0} to {sd1}. Deviations grew, and their squares grew faster.",
        vars: function (b, n) { return { sd0: b.sd, sd1: n.sd }; } },
      { id: "bunch", when: function (b, n) { return num(b.sd) && num(n.sd) && n.sd < b.sd * 0.8; },
        text: "Bunching the points cut the SD from {sd0} to {sd1}. Every deviation shrank.",
        vars: function (b, n) { return { sd0: b.sd, sd1: n.sd }; } },
      { id: "squares", when: function (b, n) { return n.squares && !b.squares; },
        text: "Each square's area is one squared deviation. Their total is the sum of squares, {ssd}.",
        vars: function (b, n) { return { ssd: n.ssd }; } }
    ],
    "probability-topics__coin-flip": [
      { id: "early", when: function (b, n) { return n.flips > b.flips && n.flips >= 1 && n.flips <= 10 && b.flips === 0; },
        text: "Only {f} flips. The running proportion swings wildly this early. Keep flipping.",
        vars: function (b, n) { return { f: n.flips }; } },
      { id: "settling", when: function (b, n) { return n.flips >= 100 && b.flips < 100; },
        text: "After {f} flips the proportion of heads is {prop}, settling toward p = {p}.",
        vars: function (b, n) { return { f: n.flips, prop: n.flips ? n.heads / n.flips : NaN, p: n.p }; } },
      { id: "p-moved", when: function (b, n) { return changed(b, n, "p", 0.01) && n.flips > 0; },
        text: "p is now {p}, so the dashed line moved. The flips you already have did not.",
        vars: function (b, n) { return { p: n.p }; } }
    ],
    "probability-topics__events": [
      { id: "independence", when: function (b, n) { var c = n.counts || {}; return (n.n !== b.n || JSON.stringify(n.points) !== JSON.stringify(b.points)) && num(c.both) && n.n > 0; },
        text: "P(A and B) is {both} of {n}, so {pab}. P(A)·P(B) is {prod}. Close together means A and B are near independent.",
        vars: function (b, n) { var c = n.counts; return { both: c.both, n: n.n, pab: c.both / n.n, prod: (c.a / n.n) * (c.b / n.n) }; } },
      { id: "exclusive", when: function (b, n) { var c = n.counts || {}; return num(c.both) && c.both === 0 && num(b.counts && b.counts.both) && b.counts.both > 0; },
        text: "No point is in both circles. A and B are mutually exclusive, so P(A or B) = P(A) + P(B) exactly.",
        vars: function () { return {}; } },
      { id: "overlap", when: function (b, n) { var c = n.counts || {}, d = b.counts || {}; return num(c.both) && c.both > 0 && num(d.both) && d.both === 0; },
        text: "Points in the overlap are counted twice by P(A) + P(B). Subtracting P(A and B) fixes that.",
        vars: function () { return {}; } }
    ],
    "probability-topics__conditional": [
      { id: "conditioned", when: function (b, n) { return n.conditioned && !b.conditioned; },
        text: "Only the studied branch remains. The sample space shrank to that row of the table.",
        vars: function () { return {}; } },
      { id: "independent", when: function (b, n) { return near(n.pAgivenB, n.pAgivenNotB, 0.005) && !near(b.pAgivenB, b.pAgivenNotB, 0.005); },
        text: "Both passed probabilities are {v}. Studying tells you nothing about passing. The events are independent.",
        vars: function (b, n) { return { v: n.pAgivenB }; } },
      { id: "many", when: function (b, n) { return n.total >= 100 && b.total < 100; },
        text: "{t} students dropped. The table's share of passed among studied should sit near P(passed | studied) = {p}.",
        vars: function (b, n) { return { t: n.total, p: n.pAgivenB }; } }
    ],
    "discrete-random-variables__expectation": [
      { id: "rolls", when: function (b, n) { return n.rolls >= 100 && b.rolls < 100; },
        text: "After {r} rolls the sample mean is {sm}, near E[X] = {ex}.",
        vars: function (b, n) { return { r: n.rolls, sm: n.sampleMean, ex: n.expectation }; } },
      { id: "weights", when: function (b, n) { return changed(b, n, "expectation", 0.02); },
        text: "E[X] is now {ex}. It is the probability-weighted average of the faces, not the most likely face.",
        vars: function (b, n) { return { ex: n.expectation }; } }
    ],
    "discrete-random-variables__rv-variance": [
      { id: "ends", when: function (b, n) { return up(b, n, "variance") && n.variance > b.variance * 1.15; },
        text: "Pushing weight to the ends raised Var(X) to {v}. Faces far from E[X] = {ex} contribute most.",
        vars: function (b, n) { return { v: n.variance, ex: n.expectation }; } },
      { id: "rolls", when: function (b, n) { return n.rolls >= 100 && b.rolls < 100; },
        text: "{r} rolls. The sample variance {sv} is converging on Var(X) = {v}.",
        vars: function (b, n) { return { r: n.rolls, sv: n.sampleVariance, v: n.variance }; } }
    ],
    "discrete-random-variables__discrete-distributions": [
      { id: "switch", when: function (b, n) { return n.dist !== b.dist; },
        text: "A different distribution. Its expectation {ex} and variance {v} follow from the parameters alone.",
        vars: function (b, n) { return { ex: n.expectation, v: n.variance }; } },
      { id: "draws", when: function (b, n) { return n.draws >= 100 && b.draws < 100; },
        text: "{d} draws. The sample mean {sm} is approaching E[X] = {ex}, and the dark bars are filling in the light ones.",
        vars: function (b, n) { return { d: n.draws, sm: n.sampleMean, ex: n.expectation }; } }
    ],
    "continuous-random-variables__density-area": [
      { id: "point", when: function (b, n) { return (n.hi - n.lo) < 0.05 && (b.hi - b.lo) >= 0.05; },
        text: "The interval is almost a point. Its probability is {p}. A single exact value has probability zero.",
        vars: function (b, n) { return { p: n.probability }; } },
      { id: "draws", when: function (b, n) { return n.draws >= 100 && b.draws < 100; },
        text: "{d} draws, {i} inside the interval. That share is {s}, against the shaded area {p}.",
        vars: function (b, n) { return { d: n.draws, i: n.inside, s: n.draws ? n.inside / n.draws : NaN, p: n.probability }; } }
    ],
    "continuous-random-variables__exponential": [
      { id: "memoryless", when: function (b, n) { return up(b, n, "waited"); },
        text: "You have already waited {w} minutes. The chance of waiting another minute is unchanged. Memoryless.",
        vars: function (b, n) { return { w: n.waited }; } },
      { id: "arrivals", when: function (b, n) { return n.arrivals >= 50 && b.arrivals < 50; },
        text: "{a} arrivals. The mean wait is {mw} minutes, against 1/λ = {inv}.",
        vars: function (b, n) { return { a: n.arrivals, mw: n.meanWait, inv: 1 / n.rate }; } },
      { id: "rate", when: function (b, n) { return up(b, n, "rate"); },
        text: "λ rose to {r} per minute. Arrivals come faster and the mean wait falls to {inv} minutes.",
        vars: function (b, n) { return { r: n.rate, inv: 1 / n.rate }; } }
    ],
    "normal-distribution__z-scores": [
      { id: "compare", when: function (b, n) { return n.A && b.A && changed(b.A, n.A, "z", 0.05); },
        text: "Score A sits {za} standard deviations from its mean, at percentile {pa}. Score B sits at {zb}. Compare the z values, not the raw scores.",
        vars: function (b, n) { return { za: n.A.z, pa: pct(n.A.percentile), zb: n.B.z }; } },
      { id: "sigma", when: function (b, n) { return n.A && b.A && changed(b.A, n.A, "sigma", 0.05) && !changed(b.A, n.A, "score", 0.05); },
        text: "σ changed, so the same raw score is now {za} SDs out. The score stayed, its z did not.",
        vars: function (b, n) { return { za: n.A.z }; } }
    ],
    "normal-distribution__normal-areas": [
      { id: "one-sigma", when: function (b, n) { return near(n.area, 0.6827, 0.004) && !near(b.area, 0.6827, 0.004); },
        text: "μ ± 1σ holds {a} of the area. That is the first number of the 68 95 99.7 rule.",
        vars: function (b, n) { return { a: n.area }; } },
      { id: "two-sigma", when: function (b, n) { return near(n.area, 0.9545, 0.004) && !near(b.area, 0.9545, 0.004); },
        text: "μ ± 2σ holds {a}. Two standard deviations either side cover about 95%.",
        vars: function (b, n) { return { a: n.area }; } },
      { id: "sigma", when: function (b, n) { return changed(b, n, "sigma", 0.05); },
        text: "σ is now {s}. The curve's width changed, but the share inside μ ± kσ never does.",
        vars: function (b, n) { return { s: n.sigma }; } }
    ],
    "central-limit-theorem__clt-means": [
      { id: "sd", when: function (b, n) { return n.samples >= 100 && b.samples < 100; },
        text: "{s} sample means. Their SD is {sd}, against σ/√n = {se}.",
        vars: function (b, n) { return { s: n.samples, sd: n.sdOfMeans, se: n.se }; } },
      { id: "n-up", when: function (b, n) { return up(b, n, "n"); },
        text: "n rose from {n0} to {n1}, so σ/√n fell from {se0} to {se1}. Draw again to see the pile narrow.",
        vars: function (b, n) { return { n0: b.n, n1: n.n, se0: b.se, se1: n.se }; } },
      { id: "parent", when: function (b, n) { return n.parent !== b.parent; },
        text: "A new parent with a different shape. The sample means will still pile into a bell.",
        vars: function () { return {}; } }
    ],
    "central-limit-theorem__standard-error": [
      { id: "n", when: function (b, n) { return changed(b, n, "n", 0.5); },
        text: "At n = {n} the standard error is σ/√n = {se}. Quadruple n and it halves.",
        vars: function (b, n) { return { n: n.n, se: n.se }; } },
      { id: "sweep", when: function (b, n) { var k = Object.keys(n.points || {}).length; return k >= 5 && Object.keys(b.points || {}).length < 5; },
        text: "Each dot is the SD of 2000 simulated means. They sit on the σ/√n curve at every n, whatever the parent's shape.",
        vars: function () { return {}; } }
    ],
    "central-limit-theorem__clt-sums": [
      { id: "sums", when: function (b, n) { return n.samples >= 100 && b.samples < 100; },
        text: "{s} sums. Their mean is {m} against nμ = {nmu}, and their SD is {sd} against σ√n = {ssq}.",
        vars: function (b, n) { return { s: n.samples, m: n.meanOfSums, nmu: n.n * n.mu, sd: n.sdOfSums, ssq: n.sigma * Math.sqrt(n.n) }; } },
      { id: "n-up", when: function (b, n) { return up(b, n, "n"); },
        text: "n rose to {n}. A sum's spread grows like √n while a mean's shrinks. Same root, opposite directions.",
        vars: function (b, n) { return { n: n.n }; } }
    ],
    "confidence-intervals__ci-meaning": [
      { id: "rate", when: function (b, n) { return n.total >= 20 && b.total < 20; },
        text: "{t} intervals, {c} caught μ. That is {r}%, against a promise of {l}%. The promise is about the long run.",
        vars: function (b, n) { return { t: n.total, c: n.captured, r: pct(n.captured / n.total), l: n.level }; } },
      { id: "level", when: function (b, n) { return up(b, n, "level"); },
        text: "The level rose to {l}%. z* is now {z} and every interval widened to ± {m}.",
        vars: function (b, n) { return { l: n.level, z: n.z, m: n.margin }; } },
      { id: "n", when: function (b, n) { return up(b, n, "n"); },
        text: "n rose to {n} and the margin fell to ± {m}. Confidence is bought with width or with data.",
        vars: function (b, n) { return { n: n.n, m: n.margin }; } }
    ],
    "confidence-intervals__t-distribution": [
      { id: "heavy", when: function (b, n) { return n.df <= 5 && b.df > 5; },
        text: "With df = {df}, t* = {t} against z* = {z}. Heavy tails make the t interval wider.",
        vars: function (b, n) { return { df: n.df, t: n.tStar, z: n.zStar }; } },
      { id: "melt", when: function (b, n) { return n.df >= 30 && b.df < 30; },
        text: "At df = {df}, t* = {t} is close to z* = {z}. The t curve has nearly melted into the normal.",
        vars: function (b, n) { return { df: n.df, t: n.tStar, z: n.zStar }; } },
      { id: "sample", when: function (b, n) { return n.sample && b.sample && n.sample.length && n.sample[0] !== b.sample[0]; },
        text: "This sample's t interval is {tw} wide and its z interval {zw}. The t version admits σ was guessed.",
        vars: function (b, n) { return { tw: n.tInterval[1] - n.tInterval[0], zw: n.zInterval[1] - n.zInterval[0] }; } }
    ],
    "confidence-intervals__proportion-ci": [
      { id: "small", when: function (b, n) { var s = Math.min(n.n * n.p, n.n * (1 - n.p)); var t = Math.min(b.n * b.p, b.n * (1 - b.p)); return s < 5 && t >= 5; },
        text: "n·p or n·(1 − p) is now {s}, below 5. The normal approximation fails and the capture rate falls short.",
        vars: function (b, n) { return { s: Math.min(n.n * n.p, n.n * (1 - n.p)) }; } },
      { id: "rate", when: function (b, n) { return n.total >= 20 && b.total < 20; },
        text: "{t} polls, {c} captured the true p. That is {r}% against {l}%.",
        vars: function (b, n) { return { t: n.total, c: n.captured, r: pct(n.captured / n.total), l: n.level }; } }
    ],
    "hypothesis-testing__error-types": [
      { id: "cutoff", when: function (b, n) { return changed(b, n, "cutoff", 0.05); },
        text: "Cutoff at {c}. α = {a} and β = {bta}. Lower one and you raise the other.",
        vars: function (b, n) { return { c: n.cutoff, a: n.alpha, bta: n.beta }; } },
      { id: "n", when: function (b, n) { return up(b, n, "n"); },
        text: "n rose to {n} and power rose to {p}. More data pulls the two curves apart.",
        vars: function (b, n) { return { n: n.n, p: n.power }; } },
      { id: "effect", when: function (b, n) { return up(b, n, "effect"); },
        text: "A bigger true effect, {e}. Power is now {p}. Large effects are easy to detect.",
        vars: function (b, n) { return { e: n.effect, p: n.power }; } }
    ],
    "hypothesis-testing__p-value": [
      { id: "one", when: function (b, n) { return num(n.p) && (!num(b.p) || n.xbar !== b.xbar) && n.tests <= 1; },
        text: "x̄ = {x} gives z = {z} and p = {p}. The shaded tails are that p.",
        vars: function (b, n) { return { x: n.xbar, z: n.z, p: n.p }; } },
      { id: "null", when: function (b, n) { return n.truth === "null" && n.tests >= 50 && b.tests < 50; },
        text: "{t} tests under a true H₀. {s} had p below 0.05. That {r}% is the false-alarm rate, and it should sit near 5%.",
        vars: function (b, n) { return { t: n.tests, s: n.small, r: pct(n.small / n.tests) }; } },
      { id: "effect", when: function (b, n) { return n.truth !== "null" && n.tests >= 50 && b.tests < 50; },
        text: "{t} tests with a real effect. {s} rejected, a share of {r}%. That share is the power.",
        vars: function (b, n) { return { t: n.tests, s: n.small, r: pct(n.small / n.tests) }; } }
    ],
    "hypothesis-testing__full-test": [
      { id: "type1", when: function (b, n) { return n.runs >= 50 && b.runs < 50 && near(n.truth, 50, 0.01); },
        text: "{r} tests with μ really 50. {j} rejected, a Type I rate of {rate}% near α = {a}.",
        vars: function (b, n) { return { r: n.runs, j: n.rejected, rate: pct(n.rejected / n.runs), a: n.alpha }; } },
      { id: "power", when: function (b, n) { return n.runs >= 50 && b.runs < 50 && !near(n.truth, 50, 0.01); },
        text: "{r} tests with μ = {mu}. {j} rejected, a share of {rate}%. That share is the power.",
        vars: function (b, n) { return { r: n.runs, mu: n.truth, j: n.rejected, rate: pct(n.rejected / n.runs) }; } },
      { id: "alpha", when: function (b, n) { return changed(b, n, "alpha", 0.001); },
        text: "α is now {a}. The rejection cutoff moved to t* = {t}.",
        vars: function (b, n) { return { a: n.alpha, t: n.tStar }; } }
    ],
    "two-sample-tests__two-means": [
      { id: "equal", when: function (b, n) { return n.mu && near(n.mu.A, n.mu.B, 0.01) && n.tests >= 50 && b.tests < 50; },
        text: "{t} tests with equal true means. {s} rejected. Near 5% is the false-alarm rate doing its job.",
        vars: function (b, n) { return { t: n.tests, s: n.small }; } },
      { id: "power", when: function (b, n) { return n.mu && !near(n.mu.A, n.mu.B, 0.01) && n.tests >= 50 && b.tests < 50; },
        text: "{t} tests. {s} rejected, a share of {r}%. That is the power at n = {n}.",
        vars: function (b, n) { return { t: n.tests, s: n.small, r: pct(n.small / n.tests), n: n.n }; } },
      { id: "n", when: function (b, n) { return up(b, n, "n"); },
        text: "n rose to {n}. The null spread σ√(2/n) fell to {se}. Smaller differences become detectable.",
        vars: function (b, n) { return { n: n.n, se: n.se0 }; } }
    ],
    "two-sample-tests__two-proportions": [
      { id: "big-n", when: function (b, n) { return n.n >= 1000 && b.n < 1000 && num(n.z); },
        text: "n = {n} per version. A difference of {d} now gives z = {z}. Big samples find small gaps.",
        vars: function (b, n) { return { n: n.n, d: n.diff, z: n.z }; } },
      { id: "tests", when: function (b, n) { return n.tests >= 50 && b.tests < 50 && n.p; },
        text: "{t} tests. {s} rejected, a share of {r}%. The true gap is {g}.",
        vars: function (b, n) { return { t: n.tests, s: n.small, r: pct(n.small / n.tests), g: n.p.B - n.p.A }; } }
    ],
    "two-sample-tests__paired": [
      { id: "paired", when: function (b, n) { return n.mode === "paired" && b.mode !== "paired"; },
        text: "Paired analysis. The between-subject spread of {sd} cancels out, so the p-value falls.",
        vars: function (b, n) { return { sd: n.sdBetween }; } },
      { id: "independent", when: function (b, n) { return n.mode === "independent" && b.mode === "paired"; },
        text: "Treated as independent, the between-subject spread stays in the noise. Compare the two p-values.",
        vars: function () { return {}; } }
    ],
    "chi-square__goodness-of-fit": [
      { id: "small-e", when: function (b, n) { return min(n.expected) < 5 && min(b.expected) >= 5; },
        text: "An expected count fell below 5, to {e}. The χ² approximation gets rough. Raise n.",
        vars: function (b, n) { return { e: min(n.expected) }; } },
      { id: "fair", when: function (b, n) { return n.tests >= 50 && b.tests < 50; },
        text: "{t} tests. {s} rejected. With a fair die and a fair claim, about 5% reject by chance.",
        vars: function (b, n) { return { t: n.tests, s: n.small }; } },
      { id: "unfair-claim", when: function (b, n) { var w = n.weights || []; var same = w.every(function (x) { return x === w[0]; }); var was = (b.weights || []).every(function (x) { return x === b.weights[0]; }); return !same && was && num(n.chi2); },
        text: "The claim is now unfair but the die is fair. χ² = {c} with p = {p}. More rolls sharpen the verdict.",
        vars: function (b, n) { return { c: n.chi2, p: n.p }; } }
    ],
    "chi-square__independence": [
      { id: "null", when: function (b, n) { return n.s === 0 && n.tests >= 50 && b.tests < 50; },
        text: "{t} surveys with no association. {s} rejected. One in twenty rejects by chance alone.",
        vars: function (b, n) { return { t: n.tests, s: n.small }; } },
      { id: "assoc", when: function (b, n) { return n.s > 0 && b.s === 0 && num(n.chi2); },
        text: "Association {s}. χ² = {c} and p = {p}. The row profiles are parting company.",
        vars: function (b, n) { return { s: n.s, c: n.chi2, p: n.p }; } },
      { id: "n", when: function (b, n) { return up(b, n, "n") && n.s > 0 && num(n.chi2); },
        text: "n rose to {n}. The same association now gives χ² = {c}. Evidence scales with data.",
        vars: function (b, n) { return { n: n.n, c: n.chi2 }; } }
    ],
    "linear-regression__least-squares": [
      { id: "line-mode", when: function (b, n) { return n.mode === "line" && b.mode !== "line"; },
        text: "Line mode. Drag the two handles and watch the squares. The best line's total of squares is {best}.",
        vars: function (b, n) { return { best: n.best ? n.best.sse : NaN }; } },
      { id: "close", when: function (b, n) { return num(n.gap) && num(b.gap) && n.gap < 0.5 && b.gap >= 0.5; },
        text: "Your line is within {g}% of the least-squares minimum. No line beats that total of squares.",
        vars: function (b, n) { return { g: n.gap }; } },
      { id: "far", when: function (b, n) { return num(n.gap) && num(b.gap) && n.gap > b.gap * 2 && n.gap > 5; },
        text: "Your total of squares now exceeds the minimum by {g}%. The squares show where the line misses.",
        vars: function (b, n) { return { g: n.gap }; } }
    ],
    "linear-regression__correlation": [
      { id: "preset", when: function (b, n) { return n.preset !== b.preset && num(n.r); },
        text: "r = {r}, so r² = {r2}. That r² is the share of the variation the line explains.",
        vars: function (b, n) { return { r: n.r, r2: n.r2 }; } },
      { id: "curve", when: function (b, n) { return n.preset !== b.preset && near(n.r, 0, 0.02); },
        text: "r = {r} on a clear curve. Correlation measures straight-line association only.",
        vars: function (b, n) { return { r: n.r }; } }
    ],
    "linear-regression__line-estimate": [
      { id: "band", when: function (b, n) { return n.draws >= 20 && b.draws < 20; },
        text: "{d} sample lines. Their slopes have SD {s} around the population slope {ps}.",
        vars: function (b, n) { return { d: n.draws, s: n.slopeSd, ps: n.population ? n.population.slope : NaN }; } },
      { id: "n", when: function (b, n) { return up(b, n, "n"); },
        text: "n rose to {n}. The band of sample lines tightens. Bigger samples pin the slope down.",
        vars: function (b, n) { return { n: n.n }; } }
    ],
    "linear-regression__prediction-outliers": [
      { id: "extrapolate", when: function (b, n) { return n.inside === false && b.inside !== false; },
        text: "x = {x} is outside the data's range. The prediction {y} is an extrapolation, so trust it less.",
        vars: function (b, n) { return { x: n.predictX, y: n.predicted }; } },
      { id: "leverage", when: function (b, n) { return n.withNew && n.withoutNew && num(n.withNew.slope) && Math.abs(n.withNew.slope - n.withoutNew.slope) > 2 * Math.abs((b.withNew ? b.withNew.slope : 0) - (b.withoutNew ? b.withoutNew.slope : 0)) + 0.05; },
        text: "The far point pulled the slope from {s0} to {s1}. Points far from the others have leverage.",
        vars: function (b, n) { return { s0: n.withoutNew.slope, s1: n.withNew.slope }; } }
    ],
    "anova__anova-idea": [
      { id: "means", when: function (b, n) { return n.result && b.result && changed(b.result, n.result, "msBetween", 0.01) && near(b.result.msWithin, n.result.msWithin, 1e-6); },
        text: "Moving the means changed MS between to {mb}. MS within stayed at {mw}. F = {f}.",
        vars: function (b, n) { return { mb: n.result.msBetween, mw: n.result.msWithin, f: n.f }; } },
      { id: "spread", when: function (b, n) { return up(b, n, "spread") && n.result; },
        text: "Within-group spread rose. MS within is now {mw} and F fell to {f}.",
        vars: function (b, n) { return { mw: n.result.msWithin, f: n.f }; } }
    ],
    "anova__f-distribution": [
      { id: "null", when: function (b, n) { return n.gap === 0 && n.studies >= 20 && b.studies < 20; },
        text: "{s} studies with equal means. {r} rejected. F lands beyond {c} about 5% of the time by chance.",
        vars: function (b, n) { return { s: n.studies, r: n.rejected, c: n.critical }; } },
      { id: "power", when: function (b, n) { return n.gap > 0 && n.studies >= 20 && b.studies < 20; },
        text: "{s} studies with a gap of {g}. {r} rejected. That share is the power.",
        vars: function (b, n) { return { s: n.studies, g: n.gap, r: n.rejected }; } },
      { id: "n", when: function (b, n) { return up(b, n, "n"); },
        text: "n rose to {n}, so df₂ = {d} and the critical F fell to {c}.",
        vars: function (b, n) { return { n: n.n, d: n.df2, c: n.critical }; } }
    ],
    "counting__multiplication-rule": [
      { id: "product", when: function (b, n) { return changed(b, n, "total", 0.5); },
        text: "{a} outfits. Raising one stage multiplies the total, it never adds to it.",
        vars: function (b, n) { return { a: n.total }; } },
      { id: "trace", when: function (b, n) { return n.path && !b.path; },
        text: "One traced outfit is one leaf out of {t}.",
        vars: function (b, n) { return { t: n.total }; } }
    ],
    "counting__permutations-combinations": [
      { id: "ordered", when: function (b, n) { return n.ordered && !b.ordered; },
        text: "Order matters now. Each of {c} choices fans into {kf} orders, giving {p}.",
        vars: function (b, n) { return { c: n.combinations, kf: n.factorial, p: n.permutations }; } },
      { id: "nk", when: function (b, n) { return changed(b, n, "n", 0.5) || changed(b, n, "k", 0.5); },
        text: "n = {n}, k = {k}. C = {c} and P = {p}. They differ by exactly k! = {kf}.",
        vars: function (b, n) { return { n: n.n, k: n.k, c: n.combinations, p: n.permutations, kf: n.factorial }; } }
    ],
    "bayesian-inference__bayes-theorem": [
      { id: "rare", when: function (b, n) { return n.prev <= 2 && b.prev > 2; },
        text: "At {p} per 100 the condition is rare. Most positives are false ones, so the posterior stays low.",
        vars: function (b, n) { return { p: n.prev }; } },
      { id: "positives", when: function (b, n) { return n.positivesOnly && !b.positivesOnly; },
        text: "Only the positives remain. The share of them who truly have it is the posterior probability.",
        vars: function () { return {}; } },
      { id: "spec", when: function (b, n) { return up(b, n, "spec"); },
        text: "Specificity {s}%. Fewer false positives, so a positive result now means more.",
        vars: function (b, n) { return { s: n.spec }; } }
    ],
    "bayesian-inference__likelihood": [
      { id: "p-moved", when: function (b, n) { return changed(b, n, "p", 0.005) && n.n === b.n && n.heads === b.heads; },
        text: "Moving p did not change the flips. Only how well p = {p} explains {h} heads in {n} changed.",
        vars: function (b, n) { return { p: n.p, h: n.heads, n: n.n }; } },
      { id: "more-flips", when: function (b, n) { return up(b, n, "n"); },
        text: "{n} flips now. The likelihood curve gets narrower. More data rules out more candidates.",
        vars: function (b, n) { return { n: n.n }; } },
      { id: "ratio", when: function (b, n) { return Math.abs(n.p - n.mle) > 0.2 && Math.abs(b.p - b.mle) <= 0.2 && num(n.likelihood) && n.likelihood > 0; },
        text: "p = {p} explains the flips {r} times worse than the best, {m}. Only such ratios mean anything.",
        vars: function (b, n) { return { p: n.p, r: n.bestLikelihood / n.likelihood, m: n.mle }; } }
    ],
    "bayesian-inference__prior-posterior": [
      { id: "first", when: function (b, n) { return n.n === 1 && b.n === 0; },
        text: "One observation moved exactly one shape parameter by one. Successes feed a, failures feed b.",
        vars: function () { return {}; } },
      { id: "many", when: function (b, n) { return n.n >= 20 && b.n < 20; },
        text: "After {n} observations the posterior mean is {pm}, pulled from the prior's {pr} toward the true {tp}.",
        vars: function (b, n) { return { n: n.n, pm: n.posteriorMean, pr: n.priorMean, tp: n.trueP }; } },
      { id: "stronger", when: function (b, n) { return (up(b, n, "a") || up(b, n, "b")) && n.n === b.n; },
        text: "A stronger prior, Beta({a}, {bb}). The same data now move the mean less. It takes more convincing.",
        vars: function (b, n) { return { a: n.a, bb: n.b }; } }
    ],
    "resampling__bootstrap": [
      { id: "first", when: function (b, n) { return n.draws >= 1 && b.draws === 0; },
        text: "Each resample draws n = {n} values with replacement. Some values repeat and some are missed.",
        vars: function (b, n) { return { n: n.n }; } },
      { id: "se", when: function (b, n) { return n.draws >= 100 && b.draws < 100; },
        text: "{d} resamples. The bootstrap SE is {bse}, against the formula s/√n = {fse}.",
        vars: function (b, n) { return { d: n.draws, bse: n.bootstrapSe, fse: n.formulaSe }; } }
    ],
    "resampling__permutation-test": [
      { id: "p", when: function (b, n) { return n.shuffles >= b.shuffles + 100 && n.effect !== 0; },
        text: "{s} shuffles. {e} shuffled gaps reached the observed {o}, giving p = {p}.",
        vars: function (b, n) { return { s: n.shuffles, e: n.extreme, o: n.observed, p: n.p }; } },
      { id: "no-effect", when: function (b, n) { return n.shuffles >= b.shuffles + 100 && n.effect === 0; },
        text: "No true difference. The observed gap {o} is typical of shuffled labels, so p = {p} is large.",
        vars: function (b, n) { return { o: n.observed, p: n.p }; } }
    ],
    "beyond-one-variable__simpsons-paradox": [
      { id: "pooled", when: function (b, n) { return n.pooled && !b.pooled; },
        text: "Groups ignored. Inside each group the slope is {s}, yet the pooled line can run the other way.",
        vars: function (b, n) { return { s: n.slope }; } },
      { id: "no-sep", when: function (b, n) { return near(n.sep, 0, 0.01) && !near(b.sep, 0, 0.01); },
        text: "No separation. The pooled slope now matches the groups. The paradox needs a lurking variable.",
        vars: function () { return {}; } }
    ],
    "beyond-one-variable__two-predictors": [
      { id: "correlated", when: function (b, n) { return num(n.correlation) && Math.abs(n.correlation) >= 0.7 && Math.abs(b.correlation) < 0.7; },
        text: "x₁ and x₂ correlate at {c}. The lone slope and the joint slope for x₁ now disagree.",
        vars: function (b, n) { return { c: n.correlation }; } },
      { id: "uncorrelated", when: function (b, n) { return num(n.correlation) && Math.abs(n.correlation) < 0.1 && Math.abs(b.correlation) >= 0.1; },
        text: "Uncorrelated predictors. Adding x₂ no longer changes what the x₁ coefficient means.",
        vars: function () { return {}; } }
    ]
  };

  /* ---- the engine --------------------------------------------------------- */
  function attach(container, api, demoId) {
    var list = rules[demoId];
    if (!list || !list.length || !api || typeof api.state !== "function" || !container) return null;
    var shown = {}, timers = [], box = null, textEl = null, hideTimer = null, prev = null, last = null;

    function snapshot() { try { return api.state(); } catch (e) { return null; } }
    function build() {
      box = document.createElement("div");
      box.className = "ui-insight";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      box.hidden = true;
      textEl = document.createElement("p");
      textEl.className = "ui-insight__text";
      var dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.className = "ui-insight__dismiss";
      dismiss.textContent = "Dismiss";
      dismiss.addEventListener("click", hide);
      box.appendChild(textEl);
      box.appendChild(dismiss);
      container.appendChild(box);
    }
    function onKey(e) { if (e.key === "Escape") hide(); }
    function show(text) {
      if (!box) build();
      textEl.textContent = text;
      last = text;
      box.hidden = false;
      // let the hidden -> shown change paint before the fade starts
      window.requestAnimationFrame(function () { box.classList.add("is-open"); });
      document.addEventListener("keydown", onKey);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, AUTO_HIDE_MS);
    }
    function hide() {
      if (!box || box.hidden) return;
      box.classList.remove("is-open");
      box.hidden = true;
      document.removeEventListener("keydown", onKey);
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }
    function check(final) {
      var now = snapshot();
      if (!now) return null;
      var fired = null;
      if (prev) {
        for (var i = 0; i < list.length && !fired; i++) {
          var r = list[i];
          if (shown[r.id]) continue;
          var hit = false;
          try { hit = !!r.when(prev, now); } catch (e) { hit = false; }
          if (!hit) continue;
          var text = null;
          try { text = fill(r.text, r.vars ? r.vars(prev, now) : {}); } catch (e) { text = null; }
          if (text === null) continue;         // a number was missing: say nothing rather than something wrong
          shown[r.id] = true;
          show(text);
          fired = r.id;
        }
      }
      if (fired || final) prev = now;           // the settled state the next interaction is compared against
      return fired;
    }
    function schedule() {
      timers.forEach(clearTimeout);
      timers = CHECK_DELAYS.map(function (d, i) { return setTimeout(function () { check(i === CHECK_DELAYS.length - 1); }, d); });
    }
    prev = snapshot();
    container.addEventListener("input", schedule);
    container.addEventListener("click", function (e) { if (box && box.contains(e.target)) return; schedule(); });
    container.addEventListener("keydown", function (e) { if (/^(Arrow|Home|End|PageUp|PageDown)/.test(e.key) || e.key === " " || e.key === "Enter") schedule(); });
    return { check: function () { return check(true); }, shown: shown, box: function () { return box; }, last: function () { return last; }, hide: hide };
  }

  window.insights = { rules: rules, fmt: fmt, fill: fill, attach: attach };

  // Wrap every demo initialiser once, so no demo file changes and the page's
  // init call is untouched. The host element names its demo in data-demo.
  var demos = window.demos || {};
  Object.keys(demos).forEach(function (name) {
    var init = demos[name];
    if (typeof init !== "function" || init.__insights) return;
    var wrapped = function (container) {
      var api = init.apply(this, arguments);
      var id = container && container.getAttribute ? container.getAttribute("data-demo") : null;
      if (id && api) {
        container.__demoApi = api;   // lets the gates drive a demo through its own api
        var handle = attach(container, api, id);
        if (handle) { try { Object.defineProperty(api, "insights", { value: handle, enumerable: false }); } catch (e) { api.insights = handle; } }
      }
      return api;
    };
    wrapped.__insights = true;
    demos[name] = wrapped;
  });
})();
