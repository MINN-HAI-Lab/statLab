/*
  stats.js — StatLab core statistics library. Hand-written, no dependencies.
  Exposes exactly one global, `stats` (HANDBOOK Amendment H1).

  Every public function is verified in tests/stats.test.js against NumPy/SciPy
  reference values (HANDBOOK §7.1). Site-wide conventions (SYLLABUS):
    - "variance" and "sd" are SAMPLE versions (divide by n − 1);
      populationVariance / populationSd divide by n.
    - quantile uses the Weibull method: position (n + 1)·p.
  Invalid arguments throw RangeError so demo bugs surface in tests, not silently.
*/
(function () {
  "use strict";

  var stats = {};

  function check(cond, message) {
    if (!cond) throw new RangeError("stats: " + message);
  }
  function isInt(x) { return typeof x === "number" && isFinite(x) && Math.floor(x) === x; }

  /* ================================================================
     1. Random numbers
     ================================================================ */

  // mulberry32 — Tommy Ettinger (2017), public domain. 32-bit state, period 2^32,
  // passes PractRand to 2^32. Chosen for being ~5 lines and good enough for demos.
  var state = 0;
  var seeded = false;
  var normalSpare = null;  // Box–Muller produces pairs; keep the unused one.

  function mulberry32() {
    state = (state + 0x6D2B79F5) | 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Seed the RNG for reproducible runs (tests). Any integer. */
  stats.seed = function (s) {
    check(isInt(s), "seed must be an integer");
    state = s | 0;
    seeded = true;
    normalSpare = null;
  };

  /** Return to Math.random() (the default for live demos). */
  stats.unseed = function () {
    seeded = false;
    normalSpare = null;
  };

  /** Uniform on [0, 1). All randomness in the site flows through here. */
  stats.random = function () {
    return seeded ? mulberry32() : Math.random();
  };

  /** Integer uniform on {lo, …, hi} inclusive. */
  stats.randomInt = function (lo, hi) {
    check(isInt(lo) && isInt(hi) && hi >= lo, "randomInt needs integers lo <= hi");
    return lo + Math.floor(stats.random() * (hi - lo + 1));
  };

  /** Returns a shuffled COPY. Fisher–Yates (Durstenfeld 1964, CACM 7(7)). */
  stats.shuffle = function (array) {
    var a = array.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(stats.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };

  /** k distinct elements of array, in random order (partial Fisher–Yates). */
  stats.sampleWithoutReplacement = function (array, k) {
    check(isInt(k) && k >= 0 && k <= array.length, "sample size k must be 0 <= k <= array length");
    var a = array.slice();
    for (var i = 0; i < k; i++) {
      var j = i + Math.floor(stats.random() * (a.length - i));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a.slice(0, k);
  };

  /* ================================================================
     2. Samplers (one draw each; demos loop as needed)
     ================================================================ */

  stats.sampleUniform = function (a, b) {
    if (a === undefined) { a = 0; b = 1; }
    check(b > a, "sampleUniform needs a < b");
    return a + (b - a) * stats.random();
  };

  stats.sampleBernoulli = function (p) {
    check(p >= 0 && p <= 1, "p must be in [0, 1]");
    return stats.random() < p ? 1 : 0;
  };

  /** Binomial(n, p) as a count of n Bernoulli trials — the definition itself. */
  stats.sampleBinomial = function (n, p) {
    check(isInt(n) && n >= 0, "n must be a non-negative integer");
    check(p >= 0 && p <= 1, "p must be in [0, 1]");
    var count = 0;
    for (var i = 0; i < n; i++) if (stats.random() < p) count++;
    return count;
  };

  // Knuth's multiplication method — TAOCP vol. 2 §3.4.1 algorithm Q. Exact, but
  // exp(−λ) underflows for large λ, so λ is split into chunks of ≤ 30: a sum of
  // independent Poissons is Poisson with the summed rate (Casella & Berger §4.3).
  function poissonKnuth(lambda) {
    var L = Math.exp(-lambda), k = 0, prod = 1;
    do { k++; prod *= stats.random(); } while (prod > L);
    return k - 1;
  }
  stats.samplePoisson = function (lambda) {
    check(lambda >= 0 && isFinite(lambda), "lambda must be >= 0");
    var total = 0;
    while (lambda > 30) { total += poissonKnuth(30); lambda -= 30; }
    return total + (lambda > 0 ? poissonKnuth(lambda) : 0);
  };

  /** Exponential with rate λ (mean 1/λ) by inverse CDF: −ln(U)/λ. */
  stats.sampleExponential = function (rate) {
    check(rate > 0, "rate must be > 0");
    return -Math.log(1 - stats.random()) / rate;  // 1 − U avoids log(0)
  };

  /** Normal(μ, σ). Box & Muller (1958), Ann. Math. Statist. 29(2):610–611. */
  stats.sampleNormal = function (mu, sigma) {
    if (mu === undefined) mu = 0;
    if (sigma === undefined) sigma = 1;
    check(sigma >= 0, "sigma must be >= 0");
    var z;
    if (normalSpare !== null) {
      z = normalSpare; normalSpare = null;
    } else {
      var u1 = 1 - stats.random();  // (0, 1] so log is finite
      var u2 = stats.random();
      var radius = Math.sqrt(-2 * Math.log(u1));
      z = radius * Math.cos(2 * Math.PI * u2);
      normalSpare = radius * Math.sin(2 * Math.PI * u2);
    }
    return mu + sigma * z;
  };

  /** Geometric: number of Bernoulli(p) trials up to and including the first success (OpenStax §4.4). */
  stats.sampleGeometric = function (p) {
    check(p > 0 && p <= 1, "p must be in (0, 1]");
    var k = 1;
    while (stats.random() >= p) k += 1;
    return k;
  };

  /** Hypergeometric: successes when drawing n from N items of which K are successes, without replacement — simulated draw by draw (OpenStax §4.5). */
  stats.sampleHypergeometric = function (N, K, n) {
    check(isInt(N) && isInt(K) && isInt(n) && N >= 0 && K >= 0 && K <= N && n >= 0 && n <= N, "need integers 0 <= K <= N and 0 <= n <= N");
    var successes = 0, left = K, total = N;
    for (var i = 0; i < n; i++) {
      if (stats.random() < left / total) { successes += 1; left -= 1; }
      total -= 1;
    }
    return successes;
  };

  function checkTable(values, probs) {
    check(values.length === probs.length && values.length > 0, "values and probs must be same non-empty length");
    var total = 0;
    for (var i = 0; i < probs.length; i++) {
      check(probs[i] >= 0, "probabilities must be >= 0");
      total += probs[i];
    }
    check(Math.abs(total - 1) < 1e-9, "probabilities must sum to 1");
  }

  /** One draw from a finite table {values, probs} by inverse CDF (e.g., a loaded die). */
  stats.sampleDiscrete = function (values, probs) {
    checkTable(values, probs);
    var u = stats.random(), cumulative = 0;
    for (var i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (u < cumulative) return values[i];
    }
    return values[values.length - 1];  // rounding guard: cumulative may end at 1 − ε
  };

  /* ================================================================
     3. Combinatorics (log-space so binomial PMFs never overflow)
     ================================================================ */

  var logFactorialCache = [0];  // ln(0!) = 0

  /** ln(n!) — cumulative sum of logs, cached. Exact enough to 1e-12 for n ≤ 1e6. */
  stats.logFactorial = function (n) {
    check(isInt(n) && n >= 0, "n must be a non-negative integer");
    for (var i = logFactorialCache.length; i <= n; i++) {
      logFactorialCache[i] = logFactorialCache[i - 1] + Math.log(i);
    }
    return logFactorialCache[n];
  };

  /** n! as a plain product (exact below 2^53, i.e. n ≤ 18; Infinity past 170). */
  stats.factorial = function (n) {
    check(isInt(n) && n >= 0, "n must be a non-negative integer");
    var f = 1;
    for (var i = 2; i <= n; i++) f *= i;
    return f;
  };

  /** ln C(n, k); −Infinity outside 0 ≤ k ≤ n. */
  stats.logChoose = function (n, k) {
    check(isInt(n) && isInt(k) && n >= 0, "n, k must be integers with n >= 0");
    if (k < 0 || k > n) return -Infinity;
    return stats.logFactorial(n) - stats.logFactorial(k) - stats.logFactorial(n - k);
  };

  /** C(n, k) by the multiplicative formula — exact in doubles while C(n,k) < 2^53. */
  stats.choose = function (n, k) {
    check(isInt(n) && isInt(k) && n >= 0, "n, k must be integers with n >= 0");
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    var result = 1;
    for (var i = 1; i <= k; i++) result = result * (n - k + i) / i;
    return Math.round(result);
  };

  /* ================================================================
     4. Distributions: PMF / PDF / CDF
     ================================================================ */

  // erf via two textbook expansions (Abramowitz & Stegun, Handbook of Mathematical
  // Functions, 1964):
  //   |x| ≤ 1.5 : 7.1.6, erf x = (2/√π) e^{−x²} Σ 2ⁿ x^{2n+1} / (1·3·5⋯(2n+1)) — all
  //               terms positive, so no cancellation.
  //   |x| > 1.5 : 7.1.14, the continued fraction for erfc, evaluated bottom-up with
  //               120 terms (machine precision for x ≥ 1.5; tested to 1e-12 relative).
  // The switch sits at 1.5 so erfc never comes from 1 − erf where that would lose
  // relative precision in the tail.
  var SQRT_PI = Math.sqrt(Math.PI);

  function erfSeries(x) {
    var term = x, sum = x, x2 = 2 * x * x;
    for (var n = 1; n < 200; n++) {
      term *= x2 / (2 * n + 1);
      sum += term;
      if (term < sum * 1e-17) break;
    }
    return 2 / SQRT_PI * Math.exp(-x * x) * sum;
  }

  function erfcContinuedFraction(x) {  // x > 0
    var f = x;
    for (var k = 120; k >= 1; k--) f = x + (k / 2) / f;
    return Math.exp(-x * x) / (SQRT_PI * f);
  }

  stats.erfc = function (x) {
    if (x < 0) return 2 - stats.erfc(-x);
    if (x <= 1.5) return 1 - erfSeries(x);
    return erfcContinuedFraction(x);
  };

  stats.erf = function (x) {
    if (x < 0) return -stats.erf(-x);
    if (x <= 1.5) return erfSeries(x);
    return 1 - erfcContinuedFraction(x);
  };

  stats.normalPdf = function (x, mu, sigma) {
    if (mu === undefined) mu = 0;
    if (sigma === undefined) sigma = 1;
    check(sigma > 0, "sigma must be > 0");
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  };

  /** Φ(x) = ½·erfc(−z/√2): using erfc keeps tiny lower-tail probabilities accurate. */
  stats.normalCdf = function (x, mu, sigma) {
    if (mu === undefined) mu = 0;
    if (sigma === undefined) sigma = 1;
    check(sigma > 0, "sigma must be > 0");
    return 0.5 * stats.erfc(-(x - mu) / (sigma * Math.SQRT2));
  };

  stats.uniformPdf = function (x, a, b) {
    check(b > a, "uniform needs a < b");
    return x >= a && x <= b ? 1 / (b - a) : 0;
  };

  stats.uniformCdf = function (x, a, b) {
    check(b > a, "uniform needs a < b");
    if (x <= a) return 0;
    if (x >= b) return 1;
    return (x - a) / (b - a);
  };

  stats.exponentialPdf = function (x, rate) {
    check(rate > 0, "rate must be > 0");
    return x < 0 ? 0 : rate * Math.exp(-rate * x);
  };

  stats.exponentialCdf = function (x, rate) {
    check(rate > 0, "rate must be > 0");
    return x < 0 ? 0 : 1 - Math.exp(-rate * x);
  };

  stats.bernoulliPmf = function (k, p) {
    check(p >= 0 && p <= 1, "p must be in [0, 1]");
    if (k === 1) return p;
    if (k === 0) return 1 - p;
    return 0;
  };

  /** C(n,k) p^k (1−p)^{n−k}, computed in log space; p = 0 or 1 handled exactly. */
  stats.binomialPmf = function (k, n, p) {
    check(isInt(n) && n >= 0, "n must be a non-negative integer");
    check(p >= 0 && p <= 1, "p must be in [0, 1]");
    if (!isInt(k) || k < 0 || k > n) return 0;
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return Math.exp(stats.logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  };

  stats.binomialCdf = function (k, n, p) {
    check(isInt(n) && n >= 0, "n must be a non-negative integer");
    if (k < 0) return 0;
    if (k >= n) return 1;
    var top = Math.floor(k), total = 0;
    for (var i = 0; i <= top; i++) total += stats.binomialPmf(i, n, p);
    return Math.min(total, 1);
  };

  /** P(X = k) = (1 − p)^{k−1} p for k = 1, 2, … (trials until the first success). */
  stats.geometricPmf = function (k, p) {
    check(p > 0 && p <= 1, "p must be in (0, 1]");
    if (!isInt(k) || k < 1) return 0;
    return Math.pow(1 - p, k - 1) * p;
  };

  /** P(X ≤ k) = 1 − (1 − p)^k. */
  stats.geometricCdf = function (k, p) {
    check(p > 0 && p <= 1, "p must be in (0, 1]");
    if (k < 1) return 0;
    return 1 - Math.pow(1 - p, Math.floor(k));
  };

  /** P(X = k) = C(K,k) C(N−K, n−k) / C(N, n), computed in log space. */
  stats.hypergeometricPmf = function (k, N, K, n) {
    check(isInt(N) && isInt(K) && isInt(n) && N >= 0 && K >= 0 && K <= N && n >= 0 && n <= N, "need integers 0 <= K <= N and 0 <= n <= N");
    if (!isInt(k) || k < Math.max(0, n - (N - K)) || k > Math.min(n, K)) return 0;
    return Math.exp(stats.logChoose(K, k) + stats.logChoose(N - K, n - k) - stats.logChoose(N, n));
  };

  stats.hypergeometricCdf = function (k, N, K, n) {
    check(isInt(N) && isInt(K) && isInt(n) && N >= 0 && K >= 0 && K <= N && n >= 0 && n <= N, "need integers 0 <= K <= N and 0 <= n <= N");
    var top = Math.floor(k), total = 0;
    for (var i = 0; i <= top && i <= n; i++) total += stats.hypergeometricPmf(i, N, K, n);
    return Math.min(total, 1);
  };

  /** λ^k e^{−λ} / k! in log space. */
  stats.poissonPmf = function (k, lambda) {
    check(lambda >= 0 && isFinite(lambda), "lambda must be >= 0");
    if (!isInt(k) || k < 0) return 0;
    if (lambda === 0) return k === 0 ? 1 : 0;
    return Math.exp(k * Math.log(lambda) - lambda - stats.logFactorial(k));
  };

  stats.poissonCdf = function (k, lambda) {
    check(lambda >= 0 && isFinite(lambda), "lambda must be >= 0");
    if (k < 0) return 0;
    var top = Math.floor(k), total = 0;
    for (var i = 0; i <= top; i++) total += stats.poissonPmf(i, lambda);
    return Math.min(total, 1);
  };

  /* ================================================================
     4b. Special functions and the t distribution (Phase 12, D-003)
     ================================================================ */

  // Lanczos approximation, g = 7, n = 9 — coefficients from Godfrey (2001), as used
  // in Numerical Recipes 3rd ed. §6.1; accurate to ~1e-15 for x > 0.
  var LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  var LOG_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);

  /** ln Γ(x) for x > 0. */
  stats.logGamma = function (x) {
    check(x > 0, "logGamma needs x > 0");
    if (x < 0.5) {   // reflection: Γ(x) Γ(1 − x) = π / sin(πx)
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - stats.logGamma(1 - x);
    }
    x -= 1;
    var a = LANCZOS[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
    return LOG_SQRT_2PI + (x + 0.5) * Math.log(t) - t + Math.log(a);
  };

  /** ln B(a, b). */
  stats.logBeta = function (a, b) {
    return stats.logGamma(a) + stats.logGamma(b) - stats.logGamma(a + b);
  };

  // Continued fraction for the incomplete beta function, modified Lentz's method —
  // Numerical Recipes 3rd ed. §6.4 (betacf).
  function betaContinuedFraction(a, b, x) {
    var EPS = 1e-15, FPMIN = 1e-300, MAXIT = 1000;
    var qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    var h = d;
    for (var m = 1; m <= MAXIT; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  /** Regularised incomplete beta I_x(a, b) = P(Beta(a, b) ≤ x). NR3 §6.4 (betai). */
  stats.incompleteBeta = function (x, a, b) {
    check(a > 0 && b > 0, "incompleteBeta needs a, b > 0");
    check(x >= 0 && x <= 1, "incompleteBeta needs x in [0, 1]");
    if (x === 0 || x === 1) return x;
    var bt = Math.exp(-stats.logBeta(a, b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betaContinuedFraction(a, b, x) / a;
    return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
  };

  /** Student t density with ν degrees of freedom. */
  stats.tPdf = function (t, df) {
    check(df > 0, "df must be > 0");
    var c = stats.logGamma((df + 1) / 2) - stats.logGamma(df / 2) - 0.5 * Math.log(df * Math.PI);
    return Math.exp(c - (df + 1) / 2 * Math.log(1 + t * t / df));
  };

  /** Student t CDF via the incomplete beta: P(T ≤ t) = 1 − ½ I_{ν/(ν+t²)}(ν/2, ½) for t ≥ 0. */
  stats.tCdf = function (t, df) {
    check(df > 0, "df must be > 0");
    if (t === 0) return 0.5;
    var ib = stats.incompleteBeta(df / (df + t * t), df / 2, 0.5);
    return t > 0 ? 1 - ib / 2 : ib / 2;
  };

  /** Bisection on a monotone CDF: expands the bracket, then halves it 100 times (D-027). */
  function invertCdf(cdf, p, lo, hi) {
    while (cdf(lo) > p) lo *= 2;
    while (cdf(hi) < p) hi *= 2;
    for (var i = 0; i < 100; i++) {
      var mid = (lo + hi) / 2;
      if (cdf(mid) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /** Inverse t: the t with P(T ≤ t) = p. */
  stats.tQuantile = function (p, df) {
    check(p > 0 && p < 1, "p must be in (0, 1)");
    check(df > 0, "df must be > 0");
    if (p === 0.5) return 0;
    return invertCdf(function (t) { return stats.tCdf(t, df); }, p, -1, 1);
  };

  /** Inverse normal: the x with P(X ≤ x) = p for N(μ, σ). */
  stats.normalQuantile = function (p, mu, sigma) {
    if (mu === undefined) mu = 0;
    if (sigma === undefined) sigma = 1;
    check(p > 0 && p < 1, "p must be in (0, 1)");
    check(sigma > 0, "sigma must be > 0");
    if (p === 0.5) return mu;
    var z = invertCdf(function (v) { return stats.normalCdf(v); }, p, -1, 1);
    return mu + sigma * z;
  };

  /* ================================================================
     4d. Incomplete gamma, the χ² distribution, and χ² tests (Phase 16, D-003)
     ================================================================ */

  // Regularised lower incomplete gamma P(a, x) — Numerical Recipes 3rd ed. §6.2:
  // series (gser) when x < a + 1, continued fraction (gcf, modified Lentz) otherwise.
  stats.incompleteGamma = function (a, x) {
    check(a > 0, "incompleteGamma needs a > 0");
    check(x >= 0, "incompleteGamma needs x >= 0");
    if (x === 0) return 0;
    var lg = stats.logGamma(a), EPS = 1e-15, FPMIN = 1e-300, MAXIT = 1000, n;
    if (x < a + 1) {
      var ap = a, sum = 1 / a, del = sum;
      for (n = 1; n <= MAXIT; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * EPS) break; }
      return sum * Math.exp(-x + a * Math.log(x) - lg);
    }
    var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (n = 1; n <= MAXIT; n++) {
      var an = -n * (n - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < EPS) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - lg) * h;
  };

  /** χ² density with df degrees of freedom. */
  stats.chiSquarePdf = function (x, df) {
    check(df > 0, "df must be > 0");
    if (x < 0) return 0;
    if (x === 0) return df === 2 ? 0.5 : (df < 2 ? Infinity : 0);
    var k = df / 2;
    return Math.exp((k - 1) * Math.log(x) - x / 2 - k * Math.log(2) - stats.logGamma(k));
  };

  /** χ² CDF: P(df/2, x/2). */
  stats.chiSquareCdf = function (x, df) {
    check(df > 0, "df must be > 0");
    if (x <= 0) return 0;
    return stats.incompleteGamma(df / 2, x / 2);
  };

  /** Inverse χ² by bisection (D-027). */
  stats.chiSquareQuantile = function (p, df) {
    check(p > 0 && p < 1, "p must be in (0, 1)");
    check(df > 0, "df must be > 0");
    return invertCdf(function (x) { return stats.chiSquareCdf(x, df); }, p, 0, Math.max(1, df));
  };

  /**
   * Goodness-of-fit test — OpenStax §11.2. observed: counts per category;
   * probs: the claimed probabilities. Returns { chi2, df, p, expected, contributions }.
   */
  stats.chiSquareGof = function (observed, probs) {
    check(observed.length === probs.length && observed.length >= 2, "need ≥ 2 categories with matching lengths");
    var n = 0, total = 0, i;
    for (i = 0; i < observed.length; i++) { check(observed[i] >= 0, "counts must be >= 0"); check(probs[i] > 0, "claimed probabilities must be > 0"); n += observed[i]; total += probs[i]; }
    check(Math.abs(total - 1) < 1e-9, "claimed probabilities must sum to 1");
    var expected = [], contributions = [], chi2 = 0;
    for (i = 0; i < observed.length; i++) {
      var e = n * probs[i], c = e > 0 ? (observed[i] - e) * (observed[i] - e) / e : 0;
      expected.push(e); contributions.push(c); chi2 += c;
    }
    var df = observed.length - 1;
    return { chi2: chi2, df: df, p: 1 - stats.chiSquareCdf(chi2, df), expected: expected, contributions: contributions };
  };

  /**
   * Test of independence on an r × c table of counts — OpenStax §11.3 (no continuity
   * correction). Returns { chi2, df, p, expected, contributions, rowTotals, colTotals, n }.
   */
  stats.chiSquareIndependence = function (table) {
    check(table.length >= 2 && table[0].length >= 2, "need at least a 2 × 2 table");
    var r = table.length, c = table[0].length, rows = [], cols = [], n = 0, i, j;
    for (i = 0; i < r; i++) { check(table[i].length === c, "ragged table"); rows.push(0); }
    for (j = 0; j < c; j++) cols.push(0);
    for (i = 0; i < r; i++) for (j = 0; j < c; j++) { check(table[i][j] >= 0, "counts must be >= 0"); rows[i] += table[i][j]; cols[j] += table[i][j]; n += table[i][j]; }
    check(n > 0, "empty table");
    var expected = [], contributions = [], chi2 = 0;
    for (i = 0; i < r; i++) {
      expected.push([]); contributions.push([]);
      for (j = 0; j < c; j++) {
        var e = rows[i] * cols[j] / n, k = e > 0 ? (table[i][j] - e) * (table[i][j] - e) / e : 0;
        expected[i].push(e); contributions[i].push(k); chi2 += k;
      }
    }
    var df = (r - 1) * (c - 1);
    return { chi2: chi2, df: df, p: 1 - stats.chiSquareCdf(chi2, df), expected: expected, contributions: contributions, rowTotals: rows, colTotals: cols, n: n };
  };

  /* ================================================================
     4c. Two-sample tests (Phase 15, D-003). All two-sided.
     ================================================================ */

  /**
   * Welch's two-sample t-test (unequal variances) — OpenStax §10.1–10.2
   * (the "Aspin-Welch" t with the Welch–Satterthwaite df). Returns { t, df, p }.
   */
  stats.welchTest = function (x, y) {
    check(x.length >= 2 && y.length >= 2, "each sample needs at least 2 values");
    var a = stats.variance(x) / x.length, b = stats.variance(y) / y.length;
    check(a + b > 0, "samples cannot both be constant");
    var t = (stats.mean(x) - stats.mean(y)) / Math.sqrt(a + b);
    var df = (a + b) * (a + b) / (a * a / (x.length - 1) + b * b / (y.length - 1));
    return { t: t, df: df, p: 2 * (1 - stats.tCdf(Math.abs(t), df)) };
  };

  /** Paired t-test on d = after − before — OpenStax §10.4. Returns { t, df, p, meanDiff, sdDiff }. */
  stats.pairedTest = function (before, after) {
    check(before.length === after.length && before.length >= 2, "paired samples need equal length ≥ 2");
    var d = [];
    for (var i = 0; i < before.length; i++) d.push(after[i] - before[i]);
    var m = stats.mean(d), sd = stats.sd(d), n = d.length;
    check(sd > 0, "differences cannot all be equal");
    var t = m / (sd / Math.sqrt(n));
    return { t: t, df: n - 1, p: 2 * (1 - stats.tCdf(Math.abs(t), n - 1)), meanDiff: m, sdDiff: sd };
  };

  /** Two-proportion z-test with the pooled proportion — OpenStax §10.3. Returns { z, p, pooled, diff }. */
  stats.twoProportionTest = function (x1, n1, x2, n2) {
    check(isInt(x1) && isInt(x2) && isInt(n1) && isInt(n2) && n1 > 0 && n2 > 0 && x1 >= 0 && x1 <= n1 && x2 >= 0 && x2 <= n2, "need integer counts 0 <= x <= n");
    var p1 = x1 / n1, p2 = x2 / n2, pooled = (x1 + x2) / (n1 + n2);
    var se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
    if (se === 0) return { z: 0, p: 1, pooled: pooled, diff: p1 - p2 };   // all successes or all failures: no evidence either way
    var z = (p1 - p2) / se;
    return { z: z, p: 2 * (1 - stats.normalCdf(Math.abs(z))), pooled: pooled, diff: p1 - p2 };
  };

  /* ================================================================
     5. Descriptive statistics (arrays of numbers)
     Empty input returns NaN rather than throwing, so a demo with no
     data yet can still render a blank readout.
     ================================================================ */

  stats.sum = function (xs) {
    var total = 0;
    for (var i = 0; i < xs.length; i++) total += xs[i];
    return total;
  };

  stats.mean = function (xs) {
    return xs.length ? stats.sum(xs) / xs.length : NaN;
  };

  // Two-pass sum of squared deviations — numerically safer than E[x²] − E[x]².
  function sumSquaredDeviations(xs) {
    var m = stats.mean(xs), total = 0;
    for (var i = 0; i < xs.length; i++) total += (xs[i] - m) * (xs[i] - m);
    return total;
  }

  /** Sample variance, divisor n − 1 (site-wide convention). NaN if n < 2. */
  stats.variance = function (xs) {
    return xs.length > 1 ? sumSquaredDeviations(xs) / (xs.length - 1) : NaN;
  };

  /** Population variance, divisor n. NaN if empty. */
  stats.populationVariance = function (xs) {
    return xs.length ? sumSquaredDeviations(xs) / xs.length : NaN;
  };

  /** Σ (xᵢ − x̄)² — the quantity both variances divide. NaN if empty. */
  stats.sumSquaredDeviations = function (xs) {
    return xs.length ? sumSquaredDeviations(xs) : NaN;
  };

  stats.sd = function (xs) { return Math.sqrt(stats.variance(xs)); };
  stats.populationSd = function (xs) { return Math.sqrt(stats.populationVariance(xs)); };

  /**
   * Histogram counts over equal-width bins [start, start + width), …, with the
   * last bin closed on the right, exactly like numpy.histogram with explicit
   * edges. Values outside [start, end] are ignored. (end − start) / width must
   * be a whole number. Returns { edges, counts }.
   */
  stats.histogram = function (xs, start, end, width) {
    check(width > 0 && end > start, "histogram needs end > start and width > 0");
    var nBins = Math.round((end - start) / width);
    check(Math.abs(nBins * width - (end - start)) < 1e-9 * Math.max(1, end - start), "(end − start) must be a multiple of width");
    var counts = [], edges = [];
    for (var b = 0; b <= nBins; b++) edges.push(start + b * width);
    for (b = 0; b < nBins; b++) counts.push(0);
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i];
      if (!(x >= start && x <= end)) continue;
      var k = Math.floor((x - start) / width + 1e-9);
      if (k >= nBins) k = nBins - 1;     // x === end belongs to the last (closed) bin
      counts[k] += 1;
    }
    return { edges: edges, counts: counts };
  };

  /**
   * Quantile by the Weibull method (Hyndman & Fan 1996 type 6): position
   * h = (n + 1)·p in the sorted data, linear interpolation, clamped to the range.
   * Matches numpy.quantile(x, p, method="weibull"). NaN if empty.
   */
  stats.quantile = function (xs, p) {
    check(p >= 0 && p <= 1, "p must be in [0, 1]");
    var n = xs.length;
    if (n === 0) return NaN;
    var sorted = xs.slice().sort(function (a, b) { return a - b; });
    var h = (n + 1) * p;
    if (h <= 1) return sorted[0];
    if (h >= n) return sorted[n - 1];
    var lo = Math.floor(h), frac = h - lo;
    return sorted[lo - 1] + frac * (sorted[lo] - sorted[lo - 1]);
  };

  stats.median = function (xs) { return stats.quantile(xs, 0.5); };

  stats.quartiles = function (xs) {
    return { q1: stats.quantile(xs, 0.25), median: stats.quantile(xs, 0.5), q3: stats.quantile(xs, 0.75) };
  };

  stats.iqr = function (xs) { return stats.quantile(xs, 0.75) - stats.quantile(xs, 0.25); };

  stats.fiveNumberSummary = function (xs) {
    var q = stats.quartiles(xs);
    return { min: xs.length ? Math.min.apply(null, xs) : NaN, q1: q.q1, median: q.median, q3: q.q3, max: xs.length ? Math.max.apply(null, xs) : NaN };
  };

  /**
   * Mode(s): the most frequent value(s), ascending. Follows OpenStax §2.5:
   * a data set where every value occurs once has NO mode → returns [].
   */
  stats.mode = function (xs) {
    var counts = new Map(), best = 0;
    xs.forEach(function (x) { counts.set(x, (counts.get(x) || 0) + 1); });
    counts.forEach(function (c) { if (c > best) best = c; });
    if (best < 2) return [];
    var modes = [];
    counts.forEach(function (c, x) { if (c === best) modes.push(x); });
    return modes.sort(function (a, b) { return a - b; });
  };

  stats.zScore = function (x, mu, sigma) {
    check(sigma > 0, "sigma must be > 0");
    return (x - mu) / sigma;
  };

  /**
   * Online mean/variance accumulator — Welford (1962), Technometrics 4(3);
   * Knuth TAOCP vol. 2 §4.2.2. Lets a demo update readouts per draw in O(1).
   */
  stats.welford = function () {
    var n = 0, mean = 0, m2 = 0;
    return {
      push: function (x) {
        n++;
        var delta = x - mean;
        mean += delta / n;
        m2 += delta * (x - mean);
      },
      get n() { return n; },
      get mean() { return n ? mean : NaN; },
      get variance() { return n > 1 ? m2 / (n - 1) : NaN; },
      get populationVariance() { return n ? m2 / n : NaN; },
      get sd() { return n > 1 ? Math.sqrt(m2 / (n - 1)) : NaN; }
    };
  };

  /** E[X] = Σ x·P(X = x) for a finite table (OpenStax §4.2). */
  stats.expectation = function (values, probs) {
    checkTable(values, probs);
    var total = 0;
    for (var i = 0; i < values.length; i++) total += values[i] * probs[i];
    return total;
  };

  /** Var(X) = Σ (x − μ)²·P(X = x). */
  stats.discreteVariance = function (values, probs) {
    var mu = stats.expectation(values, probs), total = 0;
    for (var i = 0; i < values.length; i++) total += (values[i] - mu) * (values[i] - mu) * probs[i];
    return total;
  };

  /* ---- Simple linear regression and correlation (OpenStax Ch 12; D-014) ---- */

  function checkPairs(xs, ys) {
    check(Array.isArray(xs) && Array.isArray(ys) && xs.length === ys.length, "x and y must have the same length");
    check(xs.length >= 2, "need at least two points");
  }

  /**
   * Pearson correlation r = Σ(x − x̄)(y − ȳ) / √(Σ(x − x̄)² Σ(y − ȳ)²) (OpenStax §12.3).
   * NaN when either variable is constant, as numpy.corrcoef.
   */
  stats.correlation = function (xs, ys) {
    checkPairs(xs, ys);
    var xm = stats.mean(xs), ym = stats.mean(ys), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < xs.length; i++) {
      var dx = xs[i] - xm, dy = ys[i] - ym;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    if (sxx === 0 || syy === 0) return NaN;
    return sxy / Math.sqrt(sxx * syy);
  };

  /** SSE = Σ (y − (a + b x))² for any line, not only the fitted one (OpenStax §12.3). */
  stats.sumSquaredResiduals = function (xs, ys, intercept, slope) {
    checkPairs(xs, ys);
    var total = 0;
    for (var i = 0; i < xs.length; i++) { var e = ys[i] - (intercept + slope * xs[i]); total += e * e; }
    return total;
  };

  /**
   * Least-squares line ŷ = a + b x (OpenStax §12.3): b = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)², a = ȳ − b x̄.
   * Returns { slope, intercept, r, r2, sse, n, xMean, yMean, predict(x) }.
   * Throws when every x is identical (scipy.stats.linregress does the same); a constant y
   * gives slope 0 with r = NaN.
   */
  stats.linearRegression = function (xs, ys) {
    checkPairs(xs, ys);
    var xm = stats.mean(xs), ym = stats.mean(ys), sxy = 0, sxx = 0, i;
    for (i = 0; i < xs.length; i++) { sxy += (xs[i] - xm) * (ys[i] - ym); sxx += (xs[i] - xm) * (xs[i] - xm); }
    check(sxx > 0, "all x values are identical");
    var slope = sxy / sxx, intercept = ym - slope * xm, r = stats.correlation(xs, ys);
    return {
      slope: slope, intercept: intercept, r: r, r2: r * r,
      sse: stats.sumSquaredResiduals(xs, ys, intercept, slope),
      n: xs.length, xMean: xm, yMean: ym,
      predict: function (x) { return intercept + slope * x; }
    };
  };

  /* ================================================================
     4e. The F distribution and one-way ANOVA (Phase 18, D-003)
     ================================================================ */

  /** F density with d1, d2 degrees of freedom (OpenStax §13.2), computed in logs. */
  stats.fPdf = function (x, df1, df2) {
    check(df1 > 0 && df2 > 0, "fPdf needs df1, df2 > 0");
    if (x < 0) return 0;
    if (x === 0) return df1 > 2 ? 0 : df1 === 2 ? 1 : Infinity;
    var logf = (df1 / 2) * Math.log(df1 / df2) + (df1 / 2 - 1) * Math.log(x)
      - ((df1 + df2) / 2) * Math.log(1 + df1 * x / df2) - stats.logBeta(df1 / 2, df2 / 2);
    return Math.exp(logf);
  };

  /** P(F <= x) = I_{d1 x / (d1 x + d2)}(d1/2, d2/2) — the regularised incomplete beta. */
  stats.fCdf = function (x, df1, df2) {
    check(df1 > 0 && df2 > 0, "fCdf needs df1, df2 > 0");
    if (x <= 0) return 0;
    return stats.incompleteBeta(df1 * x / (df1 * x + df2), df1 / 2, df2 / 2);
  };

  /** Inverse F: the value with P(F <= x) = p, by bisection on fCdf (D-027). */
  stats.fQuantile = function (p, df1, df2) {
    check(p > 0 && p < 1, "p must be in (0, 1)");
    check(df1 > 0 && df2 > 0, "fQuantile needs df1, df2 > 0");
    return invertCdf(function (x) { return stats.fCdf(x, df1, df2); }, p, 0, 2);
  };

  /**
   * One-way ANOVA (OpenStax §13.3). groups: an array of >= 2 numeric arrays.
   * F = MS_between / MS_within with df1 = k - 1, df2 = n - k; p is the upper tail.
   * Identical values everywhere give MS_within = 0 and F = NaN, as scipy.stats.f_oneway.
   * Returns { f, df1, df2, p, ssBetween, ssWithin, msBetween, msWithin, groupMeans, grandMean, n, k }.
   */
  stats.anovaTest = function (groups) {
    check(groups.length >= 2, "need at least two groups");
    var k = groups.length, n = 0, total = 0, i, j;
    for (i = 0; i < k; i++) {
      check(groups[i].length >= 1, "every group needs at least one value");
      n += groups[i].length;
      for (j = 0; j < groups[i].length; j++) total += groups[i][j];
    }
    check(n > k, "need more observations than groups");
    var grandMean = total / n, means = [], ssBetween = 0, ssWithin = 0;
    for (i = 0; i < k; i++) {
      var m = stats.mean(groups[i]);
      means.push(m);
      ssBetween += groups[i].length * (m - grandMean) * (m - grandMean);
      for (j = 0; j < groups[i].length; j++) ssWithin += (groups[i][j] - m) * (groups[i][j] - m);
    }
    var df1 = k - 1, df2 = n - k, msBetween = ssBetween / df1, msWithin = ssWithin / df2;
    var f = msWithin > 0 ? msBetween / msWithin : NaN;
    return {
      f: f, df1: df1, df2: df2, p: isFinite(f) ? 1 - stats.fCdf(f, df1, df2) : NaN,
      ssBetween: ssBetween, ssWithin: ssWithin, msBetween: msBetween, msWithin: msWithin,
      groupMeans: means, grandMean: grandMean, n: n, k: k
    };
  };

  /**
   * P(n, k) = n!/(n − k)! — the number of ordered arrangements of k items from n
   * (OpenStax counting, SYLLABUS §14.2). Built as a falling product, so it is exact
   * in doubles while the answer stays below 2^53; 0 outside 0 ≤ k ≤ n.
   */
  stats.permutations = function (n, k) {
    check(isInt(n) && isInt(k) && n >= 0, "n, k must be integers with n >= 0");
    if (k < 0 || k > n) return 0;
    var result = 1;
    for (var i = 0; i < k; i++) result *= n - i;
    return result;
  };

  /* ================================================================
     4g. The Beta density and Bayes' rule (Phase 21, D-003)
     ================================================================ */

  /**
   * Beta(a, b) density on [0, 1] (SYLLABUS §15.3), computed through logBeta.
   * The endpoints follow scipy.stats.beta: a shape parameter below 1 gives an
   * infinite density at its end, exactly 1 for the uniform Beta(1, 1).
   */
  stats.betaPdf = function (x, a, b) {
    check(a > 0 && b > 0, "betaPdf needs a, b > 0");
    if (x < 0 || x > 1) return 0;
    if (x === 0) return a < 1 ? Infinity : a === 1 ? Math.exp(-stats.logBeta(a, b)) : 0;
    if (x === 1) return b < 1 ? Infinity : b === 1 ? Math.exp(-stats.logBeta(a, b)) : 0;
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - stats.logBeta(a, b));
  };

  /**
   * Bayes' rule for a diagnostic test (SYLLABUS §15.1). Given the prevalence and
   * the test's sensitivity P(+ | disease) and specificity P(− | no disease),
   * returns the four joint probabilities and the two predictive values:
   *   ppv = P(disease | +) = sens·prev / (sens·prev + (1 − spec)(1 − prev))
   *   npv = P(no disease | −)
   * A predictive value whose denominator is zero (no positives can occur, say)
   * comes back NaN rather than as a divide-by-zero (D-015 §2).
   */
  stats.diagnosticTest = function (prevalence, sensitivity, specificity) {
    check(prevalence >= 0 && prevalence <= 1, "prevalence must be in [0, 1]");
    check(sensitivity >= 0 && sensitivity <= 1, "sensitivity must be in [0, 1]");
    check(specificity >= 0 && specificity <= 1, "specificity must be in [0, 1]");
    var tp = prevalence * sensitivity;
    var fn = prevalence * (1 - sensitivity);
    var fp = (1 - prevalence) * (1 - specificity);
    var tn = (1 - prevalence) * specificity;
    var pos = tp + fp, neg = tn + fn;
    return {
      truePositive: tp, falseNegative: fn, falsePositive: fp, trueNegative: tn,
      pPositive: pos, pNegative: neg,
      ppv: pos > 0 ? tp / pos : NaN,
      npv: neg > 0 ? tn / neg : NaN
    };
  };

  /* ================================================================
     4i. Resampling helpers (Phase 22, D-003)
     ================================================================ */

  /** A sample of k values drawn WITH replacement (SYLLABUS §16.1). Returns a new array. */
  stats.resample = function (array, k) {
    check(array.length > 0, "resample needs a non-empty array");
    if (k === undefined) k = array.length;
    check(isInt(k) && k >= 0, "sample size k must be a non-negative integer");
    var out = [];
    for (var i = 0; i < k; i++) out.push(array[stats.randomInt(0, array.length - 1)]);
    return out;
  };

  /**
   * Percentile interval: the middle `level` of a set of values (SYLLABUS §16.1),
   * cut at the (1 − level)/2 and (1 + level)/2 quantiles by the same Weibull rule
   * the rest of the site uses (D-015 §4). Empty input gives NaN endpoints.
   */
  stats.percentileInterval = function (values, level) {
    if (level === undefined) level = 0.95;
    check(level > 0 && level < 1, "level must be in (0, 1)");
    var lo = (1 - level) / 2;
    return { lo: stats.quantile(values, lo), hi: stats.quantile(values, 1 - lo), level: level };
  };

  /* ================================================================
     4k. Two-predictor least squares (Phase 23, D-003)
     ================================================================ */

  /**
   * Least-squares fit of y on two predictors (SYLLABUS §17.2):
   *   ŷ = b0 + b1·x1 + b2·x2
   * The three normal equations are solved by Cramer's rule on the 3 × 3 system,
   * written out by hand rather than pulled in from a library (PLAN A1 §1).
   * Perfectly collinear predictors make the determinant vanish; that returns
   * null rather than dividing by nearly zero, and the caller renders blanks (D6).
   * Returns { b0, b1, b2, r2, sse, n } or null.
   */
  stats.twoPredictorFit = function (x1, x2, ys) {
    check(Array.isArray(x1) && Array.isArray(x2) && Array.isArray(ys), "x1, x2 and y must be arrays");
    check(x1.length === x2.length && x1.length === ys.length, "x1, x2 and y must have the same length");
    var n = x1.length;
    check(n >= 3, "need at least three points to fit two predictors and an intercept");
    var s1 = 0, s2 = 0, sy = 0, s11 = 0, s22 = 0, s12 = 0, s1y = 0, s2y = 0, i;
    for (i = 0; i < n; i++) {
      s1 += x1[i]; s2 += x2[i]; sy += ys[i];
      s11 += x1[i] * x1[i]; s22 += x2[i] * x2[i]; s12 += x1[i] * x2[i];
      s1y += x1[i] * ys[i]; s2y += x2[i] * ys[i];
    }
    // [ n    s1   s2  ] [b0]   [sy ]
    // [ s1   s11  s12 ] [b1] = [s1y]
    // [ s2   s12  s22 ] [b2]   [s2y]
    var m = [[n, s1, s2], [s1, s11, s12], [s2, s12, s22]], rhs = [sy, s1y, s2y];
    function det3(a) {
      return a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
        - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
        + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
    }
    function replaceColumn(a, col, v) {
      return a.map(function (row, r) { return row.map(function (value, c) { return c === col ? v[r] : value; }); });
    }
    var d = det3(m);
    var scale = Math.max(1, Math.abs(n), Math.abs(s11), Math.abs(s22));
    if (!isFinite(d) || Math.abs(d) < 1e-9 * scale * scale * scale) return null;
    var b0 = det3(replaceColumn(m, 0, rhs)) / d;
    var b1 = det3(replaceColumn(m, 1, rhs)) / d;
    var b2 = det3(replaceColumn(m, 2, rhs)) / d;
    var yMean = sy / n, sse = 0, sst = 0;
    for (i = 0; i < n; i++) {
      var e = ys[i] - (b0 + b1 * x1[i] + b2 * x2[i]);
      sse += e * e;
      sst += (ys[i] - yMean) * (ys[i] - yMean);
    }
    return { b0: b0, b1: b1, b2: b2, sse: sse, r2: sst > 0 ? 1 - sse / sst : NaN, n: n };
  };

  window.stats = stats;
})();
