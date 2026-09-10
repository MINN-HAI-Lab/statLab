/*
  central-limit-theorem__clt-sums.js — SYLLABUS §7.3 "CLT for sums".

  Teaches: sums of n draws, like means, become approximately normal, with
  mean nμ and standard deviation σ√n.

  Public:  demos.initCltSums(containerEl) → api { setParent(key), setN(n), draw(k), reset(),
           startAuto(), stopAuto(), state() }
  Uses:    stats.sampleUniform, stats.sampleExponential, stats.sampleNormal, stats.sampleBernoulli,
           stats.randomInt, stats.normalPdf, stats.welford;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart, ui.prefersReducedMotion;  d3 scales/line.

  Pattern per D-019 / D-024. Same parents as §7.1. The sum axis is centred on
  nμ ± 5σ√n (clipped to the possible range) and only changes with n or the
  parent, never as sums accumulate (D7).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var PARENTS = {
    uniform: { label: "Flat", mu: 5, sigma: Math.sqrt(100 / 12), min: 0, max: 10, sample: function () { return stats.sampleUniform(0, 10); } },
    exponential: { label: "Skewed", mu: 2, sigma: 2, min: 0, max: Infinity, sample: function () { return stats.sampleExponential(0.5); } },
    bimodal: { label: "Two humps", mu: 5, sigma: Math.sqrt(10), min: -Infinity, max: Infinity, sample: function () { return stats.sampleBernoulli(0.5) ? stats.sampleNormal(8, 1) : stats.sampleNormal(2, 1); } },
    ushaped: { label: "U-shaped", mu: 5, sigma: Math.sqrt(12.5), min: 0, max: 10, sample: function () { var s = Math.sin(Math.PI * stats.sampleUniform(0, 1) / 2); return 10 * s * s; } },
    dice: { label: "Die", mu: 3.5, sigma: Math.sqrt(35 / 12), min: 1, max: 6, sample: function () { return stats.randomInt(1, 6); } }
  };
  var ORDER = ["uniform", "exponential", "bimodal", "ushaped", "dice"], DEFAULT_PARENT = "dice";
  var MIN_N = 1, MAX_N = 100, DEFAULT_N = 10;
  var N_BINS = 50, INITIAL_SAMPLES = 25, MAX_SAMPLES = 20000;   // D5: a small pile, not one bar
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_SAMPLES = 15;

  window.demos.initCltSums = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = { parent: DEFAULT_PARENT, n: DEFAULT_N, sums: [], bins: [], beyond: 0, lo: 0, hi: 1, bin: 1, acc: stats.welford(), auto: false };
    var timer = null;

    /* ---- controls ---------------------------------------------------- */
    var picker = document.createElement("div"); picker.className = "ui-controls"; picker.setAttribute("role", "group"); picker.setAttribute("aria-label", "Parent distribution");
    var pickButtons = {};
    ORDER.forEach(function (key) { var b = ui.button({ label: PARENTS[key].label, onClick: function () { setParent(key); } }); b.setAttribute("aria-pressed", "false"); pickButtons[key] = b; picker.appendChild(b); });
    var drawOne = ui.button({ label: "Draw 1 sum", kind: "primary", onClick: function () { draw(1); } });
    var drawMany = ui.button({ label: "Draw 100", onClick: function () { draw(100); } });
    var autoButton = ui.button({ label: "Auto-draw", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [drawOne, drawMany, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var nSlider = ui.slider({ label: "Number of draws added, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var samplesOut = ui.readout({ label: "Sums", decimals: 0 });
    var meanOut = ui.readout({ label: "Mean of sums", decimals: 2, accent: true });
    var nmuOut = ui.readout({ label: "nμ", decimals: 2 });
    var sdOut = ui.readout({ label: "SD of sums", decimals: 2, accent: true });
    var sigmaOut = ui.readout({ label: "σ√n", decimals: 2 });
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_SAMPLES.toLocaleString() + " sums reached. Press Reset to start again.";

    container.appendChild(picker);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- chart ------------------------------------------------------------ */
    var histHost = document.createElement("div"); container.appendChild(histHost);
    var hist = ui.chart(histHost, { aspect: 0.5, minHeight: 240, margin: { top: 18 }, ariaLabel: "Histogram of sums of n draws with the normal curve the central limit theorem predicts" });
    var x = d3.scaleLinear(), y = d3.scaleLinear();
    var bars = hist.plot.append("g");
    var overlay = hist.plot.append("path").attr("class", "line line--overlay");
    var muLine = hist.plot.append("line").attr("class", "line line--reference");
    var lastMark = hist.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-6,0L6,0L0,-10Z");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Bars: sums so far. Orange curve: N(nμ, σ√n). Triangle: the latest sum. Dashed line: nμ.";

    container.appendChild(ui.readoutRow([samplesOut, meanOut, nmuOut, sdOut, sigmaOut]));
    container.appendChild(legend);
    container.appendChild(note);

    hist.onResize(function (f) { x.range([0, f.width]); y.range([f.height, 0]); render(); });

    /* ---- updates ------------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    /** Axis for the current parent and n: nμ ± 5σ√n, clipped to what a sum can be. */
    function setAxis() {
      var P = PARENTS[state.parent], n = state.n, sd = P.sigma * Math.sqrt(n);
      state.lo = Math.max(P.min * n, n * P.mu - 5 * sd);
      state.hi = Math.min(P.max * n, n * P.mu + 5 * sd);
      state.bin = (state.hi - state.lo) / N_BINS;
    }
    function clearRun() { setAxis(); state.sums = []; state.beyond = 0; state.acc = stats.welford(); state.bins = []; for (var i = 0; i < N_BINS; i++) state.bins.push(0); }

    function draw(k) {
      var P = PARENTS[state.parent], added = 0;
      while (added < k && state.sums.length < MAX_SAMPLES) {
        var total = 0;
        for (var i = 0; i < state.n; i++) total += P.sample();
        state.sums.push(total);
        state.acc.push(total);
        if (total < state.lo || total > state.hi) state.beyond += 1; else state.bins[clamp(Math.floor((total - state.lo) / state.bin), 0, N_BINS - 1)] += 1;
        added += 1;
      }
      if (state.sums.length >= MAX_SAMPLES) stopAuto();
      render();
      return added;
    }
    function setParent(key) { if (!PARENTS[key]) return; stopAuto(); state.parent = key; clearRun(); draw(INITIAL_SAMPLES); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); clearRun(); draw(INITIAL_SAMPLES); }
    function reset() { stopAuto(); nSlider.set(DEFAULT_N, true); state.n = DEFAULT_N; setParent(DEFAULT_PARENT); }

    /* ---- render ---------------------------------------------------------------- */
    function render() {
      if (!state.bins.length) return;
      var P = PARENTS[state.parent], n = state.n, count = state.sums.length, capped = count >= MAX_SAMPLES;
      var mean = n * P.mu, sd = P.sigma * Math.sqrt(n);
      ORDER.forEach(function (k) { pickButtons[k].setAttribute("aria-pressed", String(k === state.parent)); });
      samplesOut.set(count); meanOut.set(state.acc.mean); nmuOut.set(mean); sdOut.set(count > 1 ? state.acc.sd : NaN); sigmaOut.set(sd);
      drawOne.disabled = capped; drawMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-draw";
      note.hidden = !capped;

      x.domain([state.lo, state.hi]);
      hist.xAxis(x, { label: "sum of " + n + " draws", ticks: 8 });
      var peak = stats.normalPdf(mean, mean, sd), yMax = peak * 1.25;
      y.domain([0, yMax]);
      hist.yGrid(y, 4);
      hist.yAxis(y, { label: "density", ticks: 4, format: d3.format(".2~g") });
      var w = Math.max(1, x(state.lo + state.bin) - x(state.lo) - 0.5);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar bar--density").merge(sel)
        .attr("x", function (c, j) { return x(state.lo + j * state.bin) + 0.25; }).attr("width", w)
        .attr("y", function (c) { return y(Math.min(yMax, count ? c / (count * state.bin) : 0)); })
        .attr("height", function (c) { return hist.height - y(Math.min(yMax, count ? c / (count * state.bin) : 0)); });
      var opts = [];
      for (var i = 0; i <= 400; i++) { var xx = state.lo + (state.hi - state.lo) * i / 400; opts.push([xx, Math.min(yMax, stats.normalPdf(xx, mean, sd))]); }
      overlay.attr("d", d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })(opts));
      muLine.attr("x1", x(mean)).attr("x2", x(mean)).attr("y1", 0).attr("y2", hist.height);
      var last = count ? state.sums[count - 1] : NaN;
      lastMark.style("display", isFinite(last) && last >= state.lo && last <= state.hi ? null : "none");
      if (isFinite(last)) lastMark.attr("transform", "translate(" + x(clamp(last, state.lo, state.hi)) + "," + hist.height + ")");
    }

    /* ---- auto loop --------------------------------------------------------------- */
    function startAuto() {
      if (state.auto || state.sums.length >= MAX_SAMPLES) return;
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

    /* ---- initial state (D5) ------------------------------------------------------- */
    setParent(DEFAULT_PARENT);

    /* ---- api --------------------------------------------------------------------------- */
    return {
      el: container,
      setParent: setParent,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      draw: draw, reset: reset, startAuto: startAuto, stopAuto: stopAuto,
      state: function () {
        var P = PARENTS[state.parent];
        return { parent: state.parent, n: state.n, samples: state.sums.length, sums: state.sums.slice(), bins: state.bins.slice(), beyond: state.beyond, lo: state.lo, hi: state.hi, meanOfSums: state.acc.mean, sdOfSums: state.acc.sd, mu: P.mu, sigma: P.sigma, auto: state.auto };
      },
      constants: { ORDER: ORDER.slice(), DEFAULT_PARENT: DEFAULT_PARENT, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, INITIAL_SAMPLES: INITIAL_SAMPLES, MAX_SAMPLES: MAX_SAMPLES, N_BINS: N_BINS }
    };
  };
})();
