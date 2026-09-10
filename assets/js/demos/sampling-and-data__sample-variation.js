/*
  sampling-and-data__sample-variation.js — SYLLABUS §1.3 "Variation in samples".

  Teaches: two honest samples disagree; that variation is normal, not error,
  and it shrinks as the sample size grows.

  Public:  demos.initSampleVariation(containerEl) → api { draw(k), setN(n), reset(),
           startAuto(), stopAuto(), state() }
  Uses:    stats.sampleNormal, stats.sampleUniform, stats.sampleWithoutReplacement,
           stats.mean, stats.sd;  ui.slider, ui.button, ui.readout, ui.readoutRow,
           ui.chart, ui.canvas, ui.token, ui.prefersReducedMotion;  d3 scales.

  Pattern per D-019. Population strip on Canvas (D-007); histogram of sample
  means as ≤ 60 SVG bars with a y-axis that doubles rarely (D7).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var POP_N = 800, MU = 170, SIGMA = 8;
  var X_MIN = 140, X_MAX = 200, BIN = 1;         // 60 bins of 1 cm
  var MIN_N = 2, MAX_N = 100, DEFAULT_N = 10;
  var MAX_SAMPLES = 20000;
  var Y_START = 10;
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_SAMPLES = 15;
  var DOT_R = 2.5, SAMPLE_R = 4;

  window.demos.initSampleVariation = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = { n: DEFAULT_N, population: [], populationMean: NaN, sample: [], means: [], bins: [], yMax: Y_START, auto: false };
    var timer = null;
    var nBins = Math.round((X_MAX - X_MIN) / BIN);

    /* ---- controls ---------------------------------------------------- */
    var drawOne = ui.button({ label: "Draw 1 sample", kind: "primary", onClick: function () { draw(1); } });
    var drawMany = ui.button({ label: "Draw 100", onClick: function () { draw(100); } });
    var autoButton = ui.button({ label: "Auto-draw", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    [drawOne, drawMany, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var samplesOut = ui.readout({ label: "Samples drawn", decimals: 0 });
    var muOut = ui.readout({ label: "Population mean", decimals: 1 });
    var meanOut = ui.readout({ label: "Mean of sample means", decimals: 1, accent: true });
    var sdOut = ui.readout({ label: "SD of sample means", decimals: 2, accent: true });
    var note = document.createElement("p");
    note.className = "muted demo__note";
    note.hidden = true;
    note.textContent = "Maximum of " + MAX_SAMPLES.toLocaleString() + " samples reached. Press Reset to start again.";

    container.appendChild(controls);
    container.appendChild(nSlider.el);

    /* ---- top: population strip (canvas) --------------------------------- */
    var stripHost = document.createElement("div");
    container.appendChild(stripHost);
    var strip = ui.chart(stripHost, { aspect: 0.18, minHeight: 90, maxHeight: 140, margin: { top: 14, right: 16, bottom: 4, left: 16 }, ariaLabel: "The population of 800 heights with the latest sample highlighted" });
    var stripLayer = ui.canvas(strip);
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]);
    var stripMu = strip.plot.append("line").attr("class", "line line--reference");
    var stripLabel = strip.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -3).text("population");
    var sampleMark = strip.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-5,0L5,0L0,-8Z");

    /* ---- bottom: histogram of sample means ------------------------------ */
    var histHost = document.createElement("div");
    container.appendChild(histHost);
    var hist = ui.chart(histHost, { aspect: 0.45, minHeight: 220, margin: { top: 12, right: 16, bottom: 40, left: 48 }, ariaLabel: "Histogram of sample means; the population mean is a dashed vertical line" });
    var y = d3.scaleLinear();
    var bars = hist.plot.append("g");
    var histMu = hist.plot.append("line").attr("class", "line line--reference");

    container.appendChild(ui.readoutRow([samplesOut, muOut, meanOut, sdOut]));
    container.appendChild(note);

    strip.onResize(function (f) { x.range([0, f.width]); render(); });
    hist.onResize(function (f) {
      x.range([0, f.width]);
      y.range([f.height, 0]);
      f.xAxis(x, { label: "sample mean height (cm)", ticks: 6 });
      render();
    });

    /* ---- population ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function buildPopulation() {
      state.population = [];
      for (var i = 0; i < POP_N; i++) state.population.push({ v: clamp(stats.sampleNormal(MU, SIGMA), X_MIN + 0.5, X_MAX - 0.5), y: stats.sampleUniform(0.1, 0.9) });
      state.populationMean = stats.mean(state.population.map(function (d) { return d.v; }));
    }

    /* ---- updates ------------------------------------------------------------ */
    function clearMeans() { state.means = []; state.bins = []; for (var i = 0; i < nBins; i++) state.bins.push(0); state.yMax = Y_START; }

    function draw(k) {
      var indices = state.population.map(function (d, i) { return i; });
      var added = 0;
      while (added < k && state.means.length < MAX_SAMPLES) {
        state.sample = stats.sampleWithoutReplacement(indices, state.n);
        var m = stats.mean(state.sample.map(function (i) { return state.population[i].v; }));
        state.means.push(m);
        var b = clamp(Math.floor((m - X_MIN) / BIN), 0, nBins - 1);
        state.bins[b] += 1;
        while (state.bins[b] > state.yMax) state.yMax *= 2;   // rare rescale (D7)
        added += 1;
      }
      if (state.means.length >= MAX_SAMPLES) stopAuto();
      render();
      return added;
    }

    /** A new n is a new experiment: the pile of means is cleared (D-019 §3). */
    function setN(n) {
      state.n = clamp(Math.round(n), MIN_N, MAX_N);
      clearMeans();
      draw(1);
    }

    function reset() {
      stopAuto();
      nSlider.set(DEFAULT_N, true);
      state.n = DEFAULT_N;
      clearMeans();
      draw(1);
    }

    /* ---- render ---------------------------------------------------------------- */
    function render() {
      if (!state.population.length) return;   // frame.onResize fires before the population exists
      var count = state.means.length, capped = count >= MAX_SAMPLES;
      samplesOut.set(count);
      muOut.set(state.populationMean);
      meanOut.set(count ? stats.mean(state.means) : NaN);
      sdOut.set(count > 1 ? stats.sd(state.means) : NaN);
      drawOne.disabled = capped; drawMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-draw";
      note.hidden = !capped;

      // Strip: population on canvas, latest sample highlighted, its mean as a marker.
      var ctx = stripLayer.ctx, h = stripLayer.height;
      stripLayer.clear();
      var inSample = {};
      state.sample.forEach(function (i) { inSample[i] = true; });
      ctx.fillStyle = ui.token("--line");
      state.population.forEach(function (d, i) { if (inSample[i]) return; ctx.beginPath(); ctx.arc(x(d.v), d.y * h, DOT_R, 0, 2 * Math.PI); ctx.fill(); });
      ctx.fillStyle = ui.token("--accent-strong"); ctx.strokeStyle = ui.token("--surface"); ctx.lineWidth = 1;
      state.sample.forEach(function (i) { var d = state.population[i]; ctx.beginPath(); ctx.arc(x(d.v), d.y * h, SAMPLE_R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); });
      stripMu.attr("x1", x(state.populationMean)).attr("x2", x(state.populationMean)).attr("y1", 0).attr("y2", strip.height);
      stripLabel.attr("x", x(state.populationMean));
      var last = count ? state.means[count - 1] : NaN;
      sampleMark.style("display", isFinite(last) ? null : "none");
      if (isFinite(last)) sampleMark.attr("transform", "translate(" + x(last) + "," + strip.height + ")");

      // Histogram.
      y.domain([0, state.yMax]);
      hist.yGrid(y, 4);
      hist.yAxis(y, { label: "number of samples", ticks: 4 });
      var w = Math.max(1, x(X_MIN + BIN) - x(X_MIN) - 1);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar").merge(sel)
        .attr("x", function (d, i) { return x(X_MIN + i * BIN) + 0.5; })
        .attr("width", w)
        .attr("y", function (d) { return y(d); })
        .attr("height", function (d) { return hist.height - y(d); });
      histMu.attr("x1", x(state.populationMean)).attr("x2", x(state.populationMean)).attr("y1", 0).attr("y2", hist.height);
    }

    /* ---- auto loop ----------------------------------------------------------- */
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
      timer = null;
      render();
    }

    /* ---- initial state (D5) ---------------------------------------------------- */
    buildPopulation();
    clearMeans();
    draw(1);

    /* ---- api ---------------------------------------------------------------------- */
    return {
      el: container,
      draw: draw,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      reset: reset,
      startAuto: startAuto,
      stopAuto: stopAuto,
      state: function () {
        return { n: state.n, samples: state.means.length, means: state.means.slice(), bins: state.bins.slice(), yMax: state.yMax, auto: state.auto, populationMean: state.populationMean, lastSample: state.sample.slice(), population: state.population.map(function (d) { return d.v; }) };
      },
      constants: { POP_N: POP_N, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, MAX_SAMPLES: MAX_SAMPLES, X_MIN: X_MIN, BIN: BIN, Y_START: Y_START }
    };
  };
})();
