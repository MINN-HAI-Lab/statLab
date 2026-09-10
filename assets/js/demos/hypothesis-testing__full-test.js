/*
  hypothesis-testing__full-test.js — SYLLABUS §9.3 "The full test, honestly run".

  Teaches: the mechanical steps of a one-sample t-test, and why "fail to
  reject" is not "H₀ is true". Repeated runs under a chosen truth show how
  often each decision happens.

  Public:  demos.initFullTest(containerEl) → api { setTruth(mu), setAlpha(a), setN(n), run(k),
           reset(), state() }
  Uses:    stats.sampleNormal, stats.mean, stats.sd, stats.tPdf, stats.tCdf, stats.tQuantile;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 scales/line/area.

  Pattern per D-019 / D-024. Two-sided one-sample t-test of H₀: μ = 50 with
  σ unknown (OpenStax §9.5): t = (x̄ − 50)/(s/√n), df = n − 1, p = 2·P(T ≥ |t|).
  The population's true mean is set by the slider; the test never sees it.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MU0 = 50, SIGMA = 10;
  var MIN_TRUTH = 40, MAX_TRUTH = 60, DEFAULT_TRUTH = 50;
  var ALPHAS = [0.01, 0.05, 0.10], DEFAULT_ALPHA = 0.05;
  var MIN_N = 3, MAX_N = 100, DEFAULT_N = 12;
  var T_MIN = -5, T_MAX = 5;
  var MAX_RUNS = 100000;

  window.demos.initFullTest = function (container) {
    var state = { truth: DEFAULT_TRUTH, alpha: DEFAULT_ALPHA, n: DEFAULT_N, sample: [], runs: 0, rejected: 0 };

    /* ---- controls ---------------------------------------------------- */
    var runOne = ui.button({ label: "Run one test", kind: "primary", onClick: function () { run(1); } });
    var runMany = ui.button({ label: "Run 100 tests", onClick: function () { run(100); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var alphaGroup = document.createElement("div"); alphaGroup.className = "ui-controls"; alphaGroup.setAttribute("role", "group"); alphaGroup.setAttribute("aria-label", "Significance level");
    var alphaButtons = {};
    ALPHAS.forEach(function (a) { var b = ui.button({ label: "α = " + a.toFixed(2), onClick: function () { setAlpha(a); } }); b.setAttribute("aria-pressed", "false"); alphaButtons[a] = b; alphaGroup.appendChild(b); });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [runOne, runMany, resetButton].forEach(function (b) { controls.appendChild(b); });
    var truthSlider = ui.slider({ label: "True population mean (the test never sees this)", min: MIN_TRUTH, max: MAX_TRUTH, step: 0.5, value: DEFAULT_TRUTH, onChange: setTruth });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    /* ---- the guided steps ---------------------------------------------- */
    var steps = document.createElement("ol"); steps.className = "test-steps";
    var stepEls = {};
    [["hyp", "State the hypotheses"], ["data", "Draw the sample"], ["stat", "Compute the test statistic"], ["p", "Find the p-value"], ["decide", "Decide"]].forEach(function (pair) {
      var li = document.createElement("li");
      var strong = document.createElement("strong"); strong.textContent = pair[1] + ". ";
      var span = document.createElement("span");
      li.appendChild(strong); li.appendChild(span); steps.appendChild(li);
      stepEls[pair[0]] = span;
    });

    var xbarOut = ui.readout({ label: "x̄", decimals: 2 });
    var sOut = ui.readout({ label: "s", decimals: 2 });
    var tOut = ui.readout({ label: "t", decimals: 3, accent: true });
    var dfOut = ui.readout({ label: "df", decimals: 0 });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var runsOut = ui.readout({ label: "Tests run", decimals: 0 });
    var rejOut = ui.readout({ label: "Rejected H₀", decimals: 0 });
    var rateOut = ui.readout({ label: "Rejection rate", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var verdict = document.createElement("p"); verdict.className = "demo__status"; verdict.setAttribute("role", "status");
    var tally = document.createElement("p"); tally.className = "demo__status";
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_RUNS.toLocaleString() + " tests reached. Press Reset to start again.";

    container.appendChild(truthSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(alphaGroup);
    container.appendChild(controls);
    container.appendChild(steps);

    /* ---- chart: t curve with the two tails beyond |t| ---------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.36, minHeight: 190, margin: { top: 40, bottom: 44 }, ariaLabel: "Student t curve for the test's degrees of freedom, with the tails beyond the observed statistic shaded and the critical values marked" });
    var x = d3.scaleLinear().domain([T_MIN, T_MAX]), y = d3.scaleLinear().domain([0, 0.45]);
    var tailShade = frame.plot.append("path").attr("class", "area area--alpha");
    var curve = frame.plot.append("path").attr("class", "line line--strong");
    var critLo = frame.plot.append("line").attr("class", "line line--reference");
    var critHi = frame.plot.append("line").attr("class", "line line--reference");
    var critLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -24);
    var tMark = frame.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-7,0L7,0L0,-11Z");
    var tLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -8);
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
    var areaGen = d3.area().x(function (d) { return x(d[0]); }).y0(function () { return frame.height; }).y1(function (d) { return y(d[1]); });
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "The t curve for df = n − 1. Shaded: the two tails beyond ±|t|, which add up to the p-value. Dashed lines: the critical values ±t* for the chosen α.";

    container.appendChild(ui.readoutRow([xbarOut, sOut, tOut, dfOut, pOut]));
    container.appendChild(verdict);
    container.appendChild(legend);
    container.appendChild(ui.readoutRow([runsOut, rejOut, rateOut]));
    container.appendChild(tally);
    container.appendChild(note);

    frame.onResize(function (f) { x.range([0, f.width]); y.range([f.height, 0]); f.xAxis(x, { label: "t", ticks: 10 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function result() {
      var n = state.sample.length, xbar = stats.mean(state.sample), s = stats.sd(state.sample), df = n - 1;
      var t = (xbar - MU0) / (s / Math.sqrt(n)), p = 2 * (1 - stats.tCdf(Math.abs(t), df));
      return { xbar: xbar, s: s, df: df, t: t, p: p, tStar: stats.tQuantile(1 - state.alpha / 2, df), reject: p < state.alpha };
    }
    function run(k) {
      var added = 0;
      while (added < k && state.runs < MAX_RUNS) {
        state.sample = [];
        for (var i = 0; i < state.n; i++) state.sample.push(stats.sampleNormal(state.truth, SIGMA));
        if (result().reject) state.rejected += 1;
        state.runs += 1; added += 1;
      }
      render();
      return added;
    }
    function clearRun() { state.runs = 0; state.rejected = 0; }
    function setTruth(v) { state.truth = clamp(Math.round(v * 2) / 2, MIN_TRUTH, MAX_TRUTH); clearRun(); run(1); }
    function setAlpha(a) { if (ALPHAS.indexOf(a) < 0) return; state.alpha = a; clearRun(); run(1); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); clearRun(); run(1); }
    function reset() { truthSlider.set(DEFAULT_TRUTH, true); nSlider.set(DEFAULT_N, true); state.truth = DEFAULT_TRUTH; state.n = DEFAULT_N; state.alpha = DEFAULT_ALPHA; clearRun(); run(1); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.sample.length) return;
      var r = result(), capped = state.runs >= MAX_RUNS, nullTrue = state.truth === MU0;
      ALPHAS.forEach(function (a) { alphaButtons[a].setAttribute("aria-pressed", String(a === state.alpha)); });
      xbarOut.set(r.xbar); sOut.set(r.s); tOut.set(r.t); dfOut.set(r.df); pOut.set(r.p);
      runsOut.set(state.runs); rejOut.set(state.rejected); rateOut.set(state.runs ? state.rejected / state.runs : NaN);
      runOne.disabled = capped; runMany.disabled = capped; note.hidden = !capped;
      stepEls.hyp.textContent = "H₀: μ = " + MU0 + " against H₁: μ ≠ " + MU0 + ", at α = " + state.alpha.toFixed(2) + ".";
      stepEls.data.textContent = "n = " + state.n + " values; x̄ = " + r.xbar.toFixed(2) + ", s = " + r.s.toFixed(2) + ".";
      stepEls.stat.textContent = "t = (x̄ − " + MU0 + ") / (s/√n) = " + r.t.toFixed(3) + " with df = " + r.df + ".";
      stepEls.p.textContent = "p = 2·P(T ≥ |t|) = " + r.p.toFixed(4) + " (critical value t* = " + r.tStar.toFixed(3) + ").";
      stepEls.decide.textContent = r.reject
        ? "p < α: reject H₀. The data would be surprising if μ were " + MU0 + "."
        : "p ≥ α: fail to reject H₀. The data are compatible with μ = " + MU0 + " — which is not the same as showing it is true.";
      verdict.textContent = r.reject ? "Decision: reject H₀." : "Decision: fail to reject H₀.";
      verdict.textContent += nullTrue
        ? (r.reject ? " Here μ really is 50, so this rejection is a Type I error." : " Here μ really is 50, so this is the correct call.")
        : (r.reject ? " Here μ is really " + state.truth + ", so this rejection is correct." : " Here μ is really " + state.truth + ", so this is a Type II error: a real difference went undetected.");
      tally.textContent = state.runs < 2 ? "Run many tests to see how often each decision happens under this truth."
        : nullTrue ? "μ really is 50: every rejection is a false alarm. Rejection rate " + (100 * state.rejected / state.runs).toFixed(1) + " % against α = " + (100 * state.alpha).toFixed(0) + " %."
        : "μ is really " + state.truth + ": rejections are correct, failures are Type II errors. Rejection rate " + (100 * state.rejected / state.runs).toFixed(1) + " % is the test's power here.";

      var pts = [], tl = [], tr = [], at = Math.abs(r.t);
      for (var i = 0; i <= 400; i++) {
        var v = T_MIN + (T_MAX - T_MIN) * i / 400, dens = stats.tPdf(v, r.df);
        pts.push([v, dens]);
        if (v <= -at) tl.push([v, dens]);
        if (v >= at) tr.push([v, dens]);
      }
      if (at < T_MAX) { tl.push([-at, stats.tPdf(-at, r.df)]); tr.unshift([at, stats.tPdf(at, r.df)]); }
      curve.attr("d", lineGen(pts));
      tailShade.attr("d", (tl.length > 1 ? areaGen(tl) : "") + (tr.length > 1 ? areaGen(tr) : ""));
      var ts = clamp(r.tStar, 0, T_MAX);
      critLo.attr("x1", x(-ts)).attr("x2", x(-ts)).attr("y1", 0).attr("y2", frame.height);
      critHi.attr("x1", x(ts)).attr("x2", x(ts)).attr("y1", 0).attr("y2", frame.height);
      critLabel.attr("x", x(ts)).text("t* = " + r.tStar.toFixed(2));
      var tc = clamp(r.t, T_MIN, T_MAX);
      tMark.attr("transform", "translate(" + x(tc) + "," + frame.height + ")");
      tLabel.attr("x", x(tc)).text("t = " + r.t.toFixed(2));
    }

    /* ---- initial state (D5) ------------------------------------------- */
    run(1);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setTruth: function (v) { truthSlider.set(v, true); setTruth(v); },
      setAlpha: setAlpha,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      run: run, reset: reset,
      state: function () { var r = result(); return { truth: state.truth, alpha: state.alpha, n: state.n, sample: state.sample.slice(), xbar: r.xbar, s: r.s, t: r.t, df: r.df, p: r.p, tStar: r.tStar, reject: r.reject, runs: state.runs, rejected: state.rejected }; },
      constants: { MU0: MU0, SIGMA: SIGMA, ALPHAS: ALPHAS.slice(), DEFAULT_ALPHA: DEFAULT_ALPHA, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, MIN_TRUTH: MIN_TRUTH, MAX_TRUTH: MAX_TRUTH, DEFAULT_TRUTH: DEFAULT_TRUTH, MAX_RUNS: MAX_RUNS }
    };
  };
})();
