/*
  central-limit-theorem__standard-error.js — SYLLABUS §7.2 "The standard error".

  Teaches: the spread of sample means shrinks like σ/√n. Sweep n with the
  parent locked; the simulated SD of sample means tracks the σ/√n curve.

  Public:  demos.initStandardError(containerEl) → api { setParent(key), setN(n), simulate(),
           sweep(), reset(), state() }
  Uses:    stats.sampleUniform, stats.sampleExponential, stats.sampleNormal, stats.sampleBernoulli,
           stats.randomInt, stats.normalPdf, stats.mean, stats.sd;  ui.slider, ui.button,
           ui.readout, ui.readoutRow, ui.chart;  d3 scales/line.

  Pattern per D-019 / D-024. Same parents as §7.1 (closed-form μ, σ). Each
  simulation draws SAMPLES_PER_N samples of size n and records the SD of their
  means as one point on the n axis; the curve σ/√n is theory.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var X_MIN = 0, X_MAX = 10, BIN = 0.1;
  var PARENTS = {
    uniform: { label: "Flat", mu: 5, sigma: Math.sqrt(100 / 12), sample: function () { return stats.sampleUniform(0, 10); } },
    exponential: { label: "Skewed", mu: 2, sigma: 2, sample: function () { return stats.sampleExponential(0.5); } },
    bimodal: { label: "Two humps", mu: 5, sigma: Math.sqrt(10), sample: function () { return stats.sampleBernoulli(0.5) ? stats.sampleNormal(8, 1) : stats.sampleNormal(2, 1); } },
    ushaped: { label: "U-shaped", mu: 5, sigma: Math.sqrt(12.5), sample: function () { var s = Math.sin(Math.PI * stats.sampleUniform(0, 1) / 2); return 10 * s * s; } },
    dice: { label: "Die", mu: 3.5, sigma: Math.sqrt(35 / 12), sample: function () { return stats.randomInt(1, 6); } }
  };
  var ORDER = ["uniform", "exponential", "bimodal", "ushaped", "dice"], DEFAULT_PARENT = "uniform";
  var MIN_N = 1, MAX_N = 100, DEFAULT_N = 4;
  var SAMPLES_PER_N = 2000;
  var SWEEP = [1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 70, 100];

  window.demos.initStandardError = function (container) {
    var nBins = Math.round((X_MAX - X_MIN) / BIN);
    var state = { parent: DEFAULT_PARENT, n: DEFAULT_N, points: {}, means: [], bins: [] };

    /* ---- controls ---------------------------------------------------- */
    var picker = document.createElement("div"); picker.className = "ui-controls"; picker.setAttribute("role", "group"); picker.setAttribute("aria-label", "Parent distribution");
    var pickButtons = {};
    ORDER.forEach(function (key) { var b = ui.button({ label: PARENTS[key].label, onClick: function () { setParent(key); } }); b.setAttribute("aria-pressed", "false"); pickButtons[key] = b; picker.appendChild(b); });
    var simButton = ui.button({ label: "Simulate at this n", kind: "primary", onClick: simulate });
    var sweepButton = ui.button({ label: "Sweep all n", onClick: sweep });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [simButton, sweepButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var nOut = ui.readout({ label: "n", decimals: 0 });
    var sdOut = ui.readout({ label: "SD of " + SAMPLES_PER_N + " sample means", decimals: 3, accent: true });
    var seOut = ui.readout({ label: "Standard error σ/√n", decimals: 3, accent: true });
    var sigmaOut = ui.readout({ label: "Parent σ", decimals: 3 });
    var pointsOut = ui.readout({ label: "Values of n simulated", decimals: 0 });

    container.appendChild(picker);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- top: SD of sample means against n --------------------------------- */
    var curveHost = document.createElement("div"); container.appendChild(curveHost);
    var cf = ui.chart(curveHost, { aspect: 0.45, minHeight: 220, margin: { top: 18 }, ariaLabel: "Standard deviation of sample means against sample size, with the curve sigma over root n" });
    var nx = d3.scaleLinear().domain([MIN_N, MAX_N]), ny = d3.scaleLinear();
    var seCurve = cf.plot.append("path").attr("class", "line line--overlay");
    var seDots = cf.plot.append("g");
    var nMark = cf.plot.append("line").attr("class", "line line--reference");
    var cfTitle = cf.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -6).text("SD of sample means against n");

    /* ---- bottom: the sampling distribution at the current n --------------- */
    var histHost = document.createElement("div"); container.appendChild(histHost);
    var hist = ui.chart(histHost, { aspect: 0.36, minHeight: 180, margin: { top: 18 }, ariaLabel: "Histogram of the simulated sample means at the current n with the predicted normal curve" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear();
    var bars = hist.plot.append("g");
    var overlay = hist.plot.append("path").attr("class", "line line--overlay");
    var histTitle = hist.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -6);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Top: each dot is the SD of " + SAMPLES_PER_N + " simulated sample means at one n, and the orange curve is σ/√n. Bottom: those means at the current n under N(μ, σ/√n). “Sweep all n” simulates " + SWEEP.length + " values of n at once.";

    container.appendChild(ui.readoutRow([nOut, sdOut, seOut, sigmaOut, pointsOut]));
    container.appendChild(legend);

    cf.onResize(function (f) { nx.range([0, f.width]); ny.range([f.height, 0]); f.xAxis(nx, { label: "sample size n", ticks: 10 }); render(); });
    hist.onResize(function (f) { x.range([0, f.width]); y.range([f.height, 0]); f.xAxis(x, { label: "sample mean", ticks: 10 }); render(); });

    /* ---- updates ------------------------------------------------------------ */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    /** Draw SAMPLES_PER_N samples of size n; keep their means and the SD as this n's point. */
    function simulateAt(n) {
      var P = PARENTS[state.parent], means = [];
      for (var s = 0; s < SAMPLES_PER_N; s++) {
        var total = 0;
        for (var i = 0; i < n; i++) total += P.sample();
        means.push(total / n);
      }
      state.points[n] = stats.sd(means);
      return means;
    }
    function simulate() {
      state.means = simulateAt(state.n);
      state.bins = []; for (var i = 0; i < nBins; i++) state.bins.push(0);
      state.means.forEach(function (m) { if (m >= X_MIN && m <= X_MAX) state.bins[clamp(Math.floor((m - X_MIN) / BIN), 0, nBins - 1)] += 1; });
      render();
    }
    function sweep() { SWEEP.forEach(function (n) { if (n !== state.n) simulateAt(n); }); simulate(); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); simulate(); }
    function setParent(key) { if (!PARENTS[key]) return; state.parent = key; state.points = {}; simulate(); }
    function reset() { nSlider.set(DEFAULT_N, true); state.n = DEFAULT_N; setParent(DEFAULT_PARENT); }

    /* ---- render ------------------------------------------------------------- */
    function render() {
      if (!state.means.length) return;
      var P = PARENTS[state.parent], n = state.n, se = P.sigma / Math.sqrt(n);
      ORDER.forEach(function (k) { pickButtons[k].setAttribute("aria-pressed", String(k === state.parent)); });
      nOut.set(n); sdOut.set(state.points[n]); seOut.set(se); sigmaOut.set(P.sigma); pointsOut.set(Object.keys(state.points).length);

      ny.domain([0, Math.ceil(P.sigma * 1.1 * 2) / 2]);
      cf.yGrid(ny, 4);
      cf.yAxis(ny, { label: "SD of sample means", ticks: 4 });
      var curve = [];
      for (var k = MIN_N; k <= MAX_N; k++) curve.push([k, P.sigma / Math.sqrt(k)]);
      seCurve.attr("d", d3.line().x(function (d) { return nx(d[0]); }).y(function (d) { return ny(d[1]); })(curve));
      var keys = Object.keys(state.points).map(Number).sort(function (a, b) { return a - b; });
      var dots = seDots.selectAll("circle.se-dot").data(keys, function (d) { return d; });
      dots.exit().remove();
      dots.enter().append("circle").attr("class", "se-dot mark mark--strong").attr("r", 5).merge(dots)
        .attr("cx", function (d) { return nx(d); }).attr("cy", function (d) { return ny(Math.min(ny.domain()[1], state.points[d])); });
      nMark.attr("x1", nx(n)).attr("x2", nx(n)).attr("y1", 0).attr("y2", cf.height);

      var peak = stats.normalPdf(P.mu, P.mu, se), yMax = Math.max(0.5, Math.ceil(peak * 1.15 * 4) / 4);
      y.domain([0, yMax]);
      hist.yAxis(y, { label: "density", ticks: 3 });
      histTitle.text("Means at n = " + n + ", " + SAMPLES_PER_N + " samples");
      var w = Math.max(1, x(X_MIN + BIN) - x(X_MIN) - 0.5), count = state.means.length;
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar bar--density").merge(sel)
        .attr("x", function (c, j) { return x(X_MIN + j * BIN) + 0.25; }).attr("width", w)
        .attr("y", function (c) { return y(Math.min(yMax, c / (count * BIN))); })
        .attr("height", function (c) { return hist.height - y(Math.min(yMax, c / (count * BIN))); });
      var opts = [];
      for (var i = 0; i <= 400; i++) { var xx = X_MIN + (X_MAX - X_MIN) * i / 400; opts.push([xx, Math.min(yMax, stats.normalPdf(xx, P.mu, se))]); }
      overlay.attr("d", d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })(opts));
    }

    /* ---- initial state (D5): one simulation at the default n ------------------ */
    setParent(DEFAULT_PARENT);

    /* ---- api ---------------------------------------------------------------------- */
    return {
      el: container,
      setParent: setParent,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      simulate: simulate, sweep: sweep, reset: reset,
      state: function () {
        var P = PARENTS[state.parent];
        return { parent: state.parent, n: state.n, points: Object.assign({}, state.points), means: state.means.slice(), mu: P.mu, sigma: P.sigma, se: P.sigma / Math.sqrt(state.n) };
      },
      constants: { ORDER: ORDER.slice(), DEFAULT_PARENT: DEFAULT_PARENT, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, SAMPLES_PER_N: SAMPLES_PER_N, SWEEP: SWEEP.slice() }
    };
  };
})();
