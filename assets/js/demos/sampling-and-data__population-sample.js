/*
  sampling-and-data__population-sample.js — SYLLABUS §1.1 "Population and sample".

  Teaches: a statistic (the sample mean) estimates a parameter (the population
  mean); we only ever see the sample, and the estimate moves while the truth
  stays put.

  Public:  demos.initPopulationSample(containerEl) → api { draw(), setN(n),
           newPopulation(), reset(), state() }
  Uses:    stats.sampleNormal, stats.sampleUniform, stats.sampleWithoutReplacement,
           stats.mean;  ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart,
           ui.canvas, ui.token;  d3 scales/selection.

  Pattern per D-019 / D-020. The 800-dot population is drawn on Canvas (D-007);
  axis, mean markers, and the trail of past sample means stay in SVG.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var POP_N = 800;
  var MU = 170, SIGMA = 8;            // heights in cm; the population is one draw from this
  var X_MIN = 140, X_MAX = 200;        // fixed axis (D7)
  var MIN_N = 5, MAX_N = 200, STEP_N = 5, DEFAULT_N = 25;
  var TRAIL = 20;                      // past sample means kept as ticks
  var DOT_R = 2.5, SAMPLE_R = 4;

  window.demos.initPopulationSample = function (container) {
    var state = { n: DEFAULT_N, population: [], sample: [], history: [], draws: 0, populationMean: NaN };

    /* ---- controls ---------------------------------------------------- */
    var drawButton = ui.button({ label: "Draw a sample", kind: "primary", onClick: draw });
    var newPopButton = ui.button({ label: "New population", onClick: newPopulation });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    [drawButton, newPopButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: STEP_N, value: DEFAULT_N, onChange: setN });

    var muOut = ui.readout({ label: "Population mean μ (parameter)", decimals: 1 });
    var xbarOut = ui.readout({ label: "Sample mean x̄ (statistic)", decimals: 1, accent: true });
    var drawsOut = ui.readout({ label: "Samples drawn", decimals: 0 });
    var hint = document.createElement("p");
    hint.className = "demo__status";
    hint.textContent = "Click the field or press “Draw a sample”. Grey dots are the whole population, and you only get to see the highlighted ones.";

    container.appendChild(controls);
    container.appendChild(nSlider.el);

    /* ---- chart: canvas dots under an SVG axis + markers ---------------- */
    var chartHost = document.createElement("div");
    chartHost.className = "field-clickable";
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.45, minHeight: 220, margin: { top: 40, right: 16, bottom: 40, left: 16 }, ariaLabel: "Population of 800 heights as dots; the current sample is highlighted; vertical lines mark the population mean and the sample mean" });
    var layer = ui.canvas(frame);
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]);
    var muLine = frame.plot.append("line").attr("class", "line line--reference");
    var muLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle");
    var trail = frame.plot.append("g");
    var xbarLine = frame.plot.append("line").attr("class", "line line--strong");
    var xbarLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle");
    chartHost.addEventListener("click", draw);

    container.appendChild(ui.readoutRow([muOut, xbarOut, drawsOut]));
    container.appendChild(hint);

    frame.onResize(function (f) {
      x.range([0, f.width]);
      f.xAxis(x, { label: "height (cm)", ticks: 6 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function newPopulation() {
      state.population = [];
      for (var i = 0; i < POP_N; i++) {
        state.population.push({ v: clamp(stats.sampleNormal(MU, SIGMA), X_MIN + 0.5, X_MAX - 0.5), y: stats.sampleUniform(0.08, 0.92) });
      }
      state.populationMean = stats.mean(state.population.map(function (d) { return d.v; }));
      state.history = [];
      state.draws = 0;
      draw();
    }

    function draw() {
      var indices = [];
      for (var i = 0; i < POP_N; i++) indices.push(i);
      state.sample = stats.sampleWithoutReplacement(indices, state.n);
      var xbar = stats.mean(state.sample.map(function (i) { return state.population[i].v; }));
      state.history.push(xbar);
      if (state.history.length > TRAIL + 1) state.history.shift();
      state.draws += 1;
      render();
    }

    function setN(n) {
      state.n = clamp(Math.round(n / STEP_N) * STEP_N, MIN_N, MAX_N);
      draw();
    }

    function reset() {
      nSlider.set(DEFAULT_N, true);
      state.n = DEFAULT_N;
      state.history = [];
      state.draws = 0;
      draw();
    }

    function sampleMean() { return state.history.length ? state.history[state.history.length - 1] : NaN; }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.population.length) return;   // frame.onResize fires before the population exists
      var xbar = sampleMean();
      muOut.set(state.populationMean);
      xbarOut.set(xbar);
      drawsOut.set(state.draws);

      // Canvas: population dots (dim), then the sample on top.
      var ctx = layer.ctx, h = layer.height;
      layer.clear();
      ctx.fillStyle = ui.token("--line");
      var inSample = {};
      state.sample.forEach(function (i) { inSample[i] = true; });
      state.population.forEach(function (d, i) {
        if (inSample[i]) return;
        ctx.beginPath(); ctx.arc(x(d.v), d.y * h, DOT_R, 0, 2 * Math.PI); ctx.fill();
      });
      ctx.fillStyle = ui.token("--accent-strong");
      ctx.strokeStyle = ui.token("--surface");
      ctx.lineWidth = 1;
      state.sample.forEach(function (i) {
        var d = state.population[i];
        ctx.beginPath(); ctx.arc(x(d.v), d.y * h, SAMPLE_R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      });

      // SVG markers.
      muLine.attr("x1", x(state.populationMean)).attr("x2", x(state.populationMean)).attr("y1", 0).attr("y2", frame.height);
      muLabel.attr("x", x(state.populationMean)).attr("y", -22).text("μ = " + ui.formatNumber(state.populationMean, 1));
      var show = isFinite(xbar);
      xbarLine.style("display", show ? null : "none");
      xbarLabel.style("display", show ? null : "none");
      if (show) {
        xbarLine.attr("x1", x(xbar)).attr("x2", x(xbar)).attr("y1", 0).attr("y2", frame.height);
        xbarLabel.attr("x", x(xbar)).attr("y", -6).text("x̄ = " + ui.formatNumber(xbar, 1));
      }
      var past = state.history.slice(0, -1);
      var ticks = trail.selectAll("path.mark--trail").data(past);
      ticks.exit().remove();
      ticks.enter().append("path").attr("class", "mark mark--trail").attr("d", "M-4,0L4,0L0,-7Z").merge(ticks)
        .attr("transform", function (d) { return "translate(" + x(d) + "," + frame.height + ")"; });
    }

    /* ---- initial state (D5) --------------------------------------------- */
    newPopulation();

    /* ---- api -------------------------------------------------------------- */
    return {
      el: container,
      draw: draw,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      newPopulation: newPopulation,
      reset: reset,
      state: function () {
        return { n: state.n, draws: state.draws, populationMean: state.populationMean, sampleMean: sampleMean(), sample: state.sample.slice(), history: state.history.slice(), population: state.population.map(function (d) { return d.v; }) };
      },
      constants: { POP_N: POP_N, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, TRAIL: TRAIL, X_MIN: X_MIN, X_MAX: X_MAX }
    };
  };
})();
