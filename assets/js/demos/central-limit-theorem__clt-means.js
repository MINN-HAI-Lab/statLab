/*
  central-limit-theorem__clt-means.js — SYLLABUS §7.1 "CLT for sample means".

  Teaches: means of many draws are approximately normal whatever the parent
  distribution looks like, and the approximation improves as n grows.

  Public:  demos.initCltMeans(containerEl) → api { setParent(key), setN(n), draw(k), reset(),
           startAuto(), stopAuto(), state() }
  Uses:    stats.sampleUniform, stats.sampleExponential, stats.sampleNormal, stats.sampleBernoulli,
           stats.randomInt, stats.uniformPdf, stats.exponentialPdf, stats.normalPdf, stats.mean,
           stats.welford;  ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart,
           ui.prefersReducedMotion;  d3 scales/line.

  Pattern per D-019 / D-024. Every parent lives on the 0–10 axis with a
  closed-form μ and σ (cited below and verified by simulation in the tests),
  so the normal overlay N(μ, σ/√n) is theory, not a fit.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var X_MIN = 0, X_MAX = 10, BIN = 0.1;
  // μ and σ² sources: uniform (b−a)²/12; exponential 1/λ²; mixture Var = E[Var] + Var[E];
  // arcsine on [0,10] has mean 5 and variance 100/8; die 35/12 (OpenStax §4.2).
  var PARENTS = {
    uniform: { label: "Flat", mu: 5, sigma: Math.sqrt(100 / 12), sample: function () { return stats.sampleUniform(0, 10); }, pdf: function (x) { return stats.uniformPdf(x, 0, 10); } },
    exponential: { label: "Skewed", mu: 2, sigma: 2, sample: function () { return stats.sampleExponential(0.5); }, pdf: function (x) { return stats.exponentialPdf(x, 0.5); } },
    bimodal: { label: "Two humps", mu: 5, sigma: Math.sqrt(10), sample: function () { return stats.sampleBernoulli(0.5) ? stats.sampleNormal(8, 1) : stats.sampleNormal(2, 1); }, pdf: function (x) { return 0.5 * stats.normalPdf(x, 2, 1) + 0.5 * stats.normalPdf(x, 8, 1); } },
    ushaped: { label: "U-shaped", mu: 5, sigma: Math.sqrt(12.5), sample: function () { var s = Math.sin(Math.PI * stats.sampleUniform(0, 1) / 2); return 10 * s * s; }, pdf: function (x) { return x <= 0 || x >= 10 ? 0 : 1 / (Math.PI * Math.sqrt(x * (10 - x))); } },
    dice: { label: "Die", mu: 3.5, sigma: Math.sqrt(35 / 12), sample: function () { return stats.randomInt(1, 6); }, discrete: [1, 2, 3, 4, 5, 6] }
  };
  var ORDER = ["uniform", "exponential", "bimodal", "ushaped", "dice"], DEFAULT_PARENT = "exponential";
  var MIN_N = 1, MAX_N = 100, DEFAULT_N = 5;
  var INITIAL_SAMPLES = 25, MAX_SAMPLES = 20000;   // D5: a small pile, not one bar
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_SAMPLES = 15;

  window.demos.initCltMeans = function (container) {
    var reduced = ui.prefersReducedMotion();
    var nBins = Math.round((X_MAX - X_MIN) / BIN);
    var state = { parent: DEFAULT_PARENT, n: DEFAULT_N, sample: [], means: [], bins: [], beyond: 0, acc: stats.welford(), auto: false };
    var timer = null;

    /* ---- controls ---------------------------------------------------- */
    var picker = document.createElement("div"); picker.className = "ui-controls"; picker.setAttribute("role", "group"); picker.setAttribute("aria-label", "Parent distribution");
    var pickButtons = {};
    ORDER.forEach(function (key) { var b = ui.button({ label: PARENTS[key].label, onClick: function () { setParent(key); } }); b.setAttribute("aria-pressed", "false"); pickButtons[key] = b; picker.appendChild(b); });
    var drawOne = ui.button({ label: "Draw 1 sample", kind: "primary", onClick: function () { draw(1); } });
    var drawMany = ui.button({ label: "Draw 100", onClick: function () { draw(100); } });
    var autoButton = ui.button({ label: "Auto-draw", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [drawOne, drawMany, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var samplesOut = ui.readout({ label: "Samples", decimals: 0 });
    var meanOut = ui.readout({ label: "Mean of sample means", decimals: 3, accent: true });
    var muOut = ui.readout({ label: "Parent mean μ", decimals: 3 });
    var sdOut = ui.readout({ label: "SD of sample means", decimals: 3, accent: true });
    var seOut = ui.readout({ label: "σ/√n", decimals: 3 });
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_SAMPLES.toLocaleString() + " samples reached. Press Reset to start again.";

    container.appendChild(picker);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- top: parent with the latest sample -------------------------- */
    var parentHost = document.createElement("div"); container.appendChild(parentHost);
    var top = ui.chart(parentHost, { aspect: 0.22, minHeight: 120, maxHeight: 160, margin: { top: 18, bottom: 30 }, ariaLabel: "The parent distribution with the latest sample's values as dots" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]);
    var ty = d3.scaleLinear();
    var parentCurve = top.plot.append("path").attr("class", "line");
    var parentBars = top.plot.append("g");
    var sampleDots = top.plot.append("g");
    var topTitle = top.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -6).text("Parent and the latest sample");

    /* ---- bottom: histogram of sample means + normal overlay ------------ */
    var histHost = document.createElement("div"); container.appendChild(histHost);
    var hist = ui.chart(histHost, { aspect: 0.5, minHeight: 240, margin: { top: 18 }, ariaLabel: "Histogram of sample means with the normal curve the central limit theorem predicts" });
    var y = d3.scaleLinear();
    var bars = hist.plot.append("g");
    var overlay = hist.plot.append("path").attr("class", "line line--overlay");
    var muLine = hist.plot.append("line").attr("class", "line line--reference");
    var lastMark = hist.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-6,0L6,0L0,-10Z");
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Bars: sample means so far. Orange curve: the normal N(μ, σ/√n) the theorem predicts. Triangle: the latest sample mean. Dashed line: μ.";

    container.appendChild(ui.readoutRow([samplesOut, meanOut, muOut, sdOut, seOut]));
    container.appendChild(legend);
    container.appendChild(note);

    top.onResize(function (f) { x.range([0, f.width]); ty.range([f.height, 0]); f.xAxis(x, { ticks: 10 }); render(); });
    hist.onResize(function (f) { x.range([0, f.width]); y.range([f.height, 0]); f.xAxis(x, { label: "sample mean", ticks: 10 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function clearRun() { state.means = []; state.beyond = 0; state.sample = []; state.acc = stats.welford(); state.bins = []; for (var i = 0; i < nBins; i++) state.bins.push(0); }

    function draw(k) {
      var P = PARENTS[state.parent], added = 0;
      while (added < k && state.means.length < MAX_SAMPLES) {
        var sample = [];
        for (var i = 0; i < state.n; i++) sample.push(P.sample());
        var m = stats.mean(sample);
        state.sample = sample;
        state.means.push(m);
        state.acc.push(m);
        if (m < X_MIN || m > X_MAX) state.beyond += 1; else state.bins[clamp(Math.floor((m - X_MIN) / BIN), 0, nBins - 1)] += 1;
        added += 1;
      }
      if (state.means.length >= MAX_SAMPLES) stopAuto();
      render();
      return added;
    }
    function setParent(key) { if (!PARENTS[key]) return; stopAuto(); state.parent = key; clearRun(); draw(INITIAL_SAMPLES); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); clearRun(); draw(INITIAL_SAMPLES); }
    function reset() { stopAuto(); nSlider.set(DEFAULT_N, true); state.n = DEFAULT_N; setParent(DEFAULT_PARENT); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.bins.length) return;
      var P = PARENTS[state.parent], n = state.n, count = state.means.length, capped = count >= MAX_SAMPLES;
      var se = P.sigma / Math.sqrt(n);
      ORDER.forEach(function (k) { pickButtons[k].setAttribute("aria-pressed", String(k === state.parent)); });
      samplesOut.set(count); meanOut.set(state.acc.mean); muOut.set(P.mu); sdOut.set(count > 1 ? state.acc.sd : NaN); seOut.set(se);
      drawOne.disabled = capped; drawMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-draw";
      note.hidden = !capped;

      // Parent panel.
      var pts = [], i, xx;
      if (P.discrete) {
        parentCurve.attr("d", null);
        ty.domain([0, 0.25]);
        var pb = parentBars.selectAll("rect.bar--theory").data(P.discrete);
        pb.enter().append("rect").attr("class", "bar bar--theory").merge(pb)
          .attr("x", function (v) { return x(v - 0.3); }).attr("width", x(0.6) - x(0)).attr("y", ty(1 / 6)).attr("height", top.height - ty(1 / 6));
      } else {
        parentBars.selectAll("rect").remove();
        ty.domain([0, 0.55]);
        for (i = 0; i <= 400; i++) { xx = X_MIN + (X_MAX - X_MIN) * i / 400; pts.push([xx, Math.min(0.55, P.pdf(xx))]); }
        parentCurve.attr("d", d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return ty(d[1]); })(pts));
      }
      var dots = sampleDots.selectAll("circle.dot--sample").data(state.sample.filter(function (v) { return v >= X_MIN && v <= X_MAX; }));
      dots.exit().remove();
      dots.enter().append("circle").attr("class", "dot--sample").attr("r", 3.5).merge(dots)
        .attr("cx", function (v) { return x(v); }).attr("cy", top.height - 5);

      // Means histogram, density-scaled, with the CLT normal.
      var peak = stats.normalPdf(P.mu, P.mu, se);
      var yMax = Math.max(0.5, Math.ceil(peak * 1.15 * 4) / 4);
      y.domain([0, yMax]);
      hist.yGrid(y, 4);
      hist.yAxis(y, { label: "density", ticks: 4 });
      var w = Math.max(1, x(X_MIN + BIN) - x(X_MIN) - 0.5);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar bar--density").merge(sel)
        .attr("x", function (c, j) { return x(X_MIN + j * BIN) + 0.25; }).attr("width", w)
        .attr("y", function (c) { return y(Math.min(yMax, count ? c / (count * BIN) : 0)); })
        .attr("height", function (c) { return hist.height - y(Math.min(yMax, count ? c / (count * BIN) : 0)); });
      var opts = [];
      for (i = 0; i <= 400; i++) { xx = X_MIN + (X_MAX - X_MIN) * i / 400; opts.push([xx, Math.min(yMax, stats.normalPdf(xx, P.mu, se))]); }
      overlay.attr("d", lineGen(opts));
      muLine.attr("x1", x(P.mu)).attr("x2", x(P.mu)).attr("y1", 0).attr("y2", hist.height);
      var last = count ? state.means[count - 1] : NaN;
      lastMark.style("display", isFinite(last) && last >= X_MIN && last <= X_MAX ? null : "none");
      if (isFinite(last)) lastMark.attr("transform", "translate(" + x(clamp(last, X_MIN, X_MAX)) + "," + hist.height + ")");
    }

    /* ---- auto loop ------------------------------------------------------- */
    function startAuto() {
      if (state.auto || state.means.length >= MAX_SAMPLES) return;
      state.auto = true;
      if (reduced) timer = window.setInterval(function () { draw(STEP_SAMPLES); }, STEP_INTERVAL);
      else { var step = function () { if (!state.auto) return; draw(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); }; timer = window.requestAnimationFrame(step); }
      render();
    }
    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null; render();
    }

    /* ---- initial state (D5) ------------------------------------------- */
    setParent(DEFAULT_PARENT);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setParent: setParent,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      draw: draw, reset: reset, startAuto: startAuto, stopAuto: stopAuto,
      state: function () {
        var P = PARENTS[state.parent];
        return { parent: state.parent, n: state.n, samples: state.means.length, means: state.means.slice(), lastSample: state.sample.slice(), bins: state.bins.slice(), beyond: state.beyond, meanOfMeans: state.acc.mean, sdOfMeans: state.acc.sd, mu: P.mu, sigma: P.sigma, se: P.sigma / Math.sqrt(state.n), auto: state.auto };
      },
      parents: function () { var out = {}; ORDER.forEach(function (k) { out[k] = { mu: PARENTS[k].mu, sigma: PARENTS[k].sigma, sample: PARENTS[k].sample }; }); return out; },
      constants: { ORDER: ORDER.slice(), DEFAULT_PARENT: DEFAULT_PARENT, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, INITIAL_SAMPLES: INITIAL_SAMPLES, MAX_SAMPLES: MAX_SAMPLES, X_MIN: X_MIN, X_MAX: X_MAX, BIN: BIN }
    };
  };
})();
