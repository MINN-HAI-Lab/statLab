/*
  linear-regression__line-estimate.js — SYLLABUS §12.3 "The line is an estimate".

  Teaches: a fitted line depends on which points happened to be sampled. Each
  sample from the population cloud gives its own line; drawn faintly on top of
  one another they form a band, which narrows as n grows.

  Public:  demos.initLineEstimate(containerEl) → api { draw(k), setN(n), reset(), newPopulation(), state() }
  Uses:    stats.sampleUniform, stats.sampleNormal, stats.sampleWithoutReplacement, stats.linearRegression, stats.sd;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart, ui.canvas, ui.token;  d3 scales.

  Pattern per D-019 / D-021. The population (400 points, y = 2 + 0.8 x + noise)
  is drawn once on Canvas; the "population line" is its own least-squares line,
  so the target is exact for the cloud on screen. Faint sample lines accumulate
  to a cap of MAX_DRAWS, after which the draw buttons disable (D6).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var POP_N = 400, TRUE_A = 2, TRUE_B = 0.8, NOISE_SD = 1.8;
  var X_MIN = 0, X_MAX = 10, Y_MIN = 0, Y_MAX = 14;
  var MIN_N = 5, MAX_N = 100, DEFAULT_N = 15;
  var MAX_DRAWS = 200, BATCH = 25;
  var POP_R = 2.2, SAMPLE_R = 4.5;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initLineEstimate = function (container) {
    var state = { n: DEFAULT_N, pop: null, popFit: null, lines: [], sample: [], lastFit: null };

    /* ---- controls ---------------------------------------------------- */
    var drawButton = ui.button({ label: "Draw a sample", kind: "primary", onClick: function () { draw(1); } });
    var batchButton = ui.button({ label: "Draw " + BATCH, onClick: function () { draw(BATCH); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var popButton = ui.button({ label: "New population", onClick: newPopulation });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(drawButton); controls.appendChild(batchButton); controls.appendChild(resetButton); controls.appendChild(popButton);
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var slopeOut = ui.readout({ label: "This sample's slope", decimals: 3, accent: true });
    var interceptOut = ui.readout({ label: "This sample's intercept", decimals: 3 });
    var popSlopeOut = ui.readout({ label: "Population slope", decimals: 3 });
    var countOut = ui.readout({ label: "Lines drawn", decimals: 0 });
    var sdOut = ui.readout({ label: "SD of the slopes", decimals: 3, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "demo__status demo__note"; note.hidden = true;
    note.textContent = "Cap reached: " + MAX_DRAWS + " lines drawn. Reset to draw more.";

    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- chart ----------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.62, minHeight: 280, maxHeight: 420, margin: { top: 16, right: 20, bottom: 44, left: 48 }, ariaLabel: "Population cloud with the current sample highlighted, its fitted line, and faint lines from earlier samples" });
    var layer = ui.canvas(frame);
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear().domain([Y_MIN, Y_MAX]);
    var linesLayer = frame.plot.append("g");
    var popLine = frame.plot.append("line").attr("class", "line line--overlay line--dashed");
    var lastLine = frame.plot.append("line").attr("class", "line line--strong");
    var dotsLayer = frame.plot.append("g");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Grey cloud: the population. Dark dots: the current sample, with its fitted line in blue. Faint blue lines: fits from earlier samples. Dashed orange: the population's own line.";

    container.appendChild(ui.readoutRow([slopeOut, interceptOut, popSlopeOut]));
    container.appendChild(ui.readoutRow([countOut, sdOut]));
    container.appendChild(status);
    container.appendChild(note);
    container.appendChild(legend);

    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.yGrid(y, 7); f.xAxis(x, { label: "x", ticks: 10 }); f.yAxis(y, { label: "y", ticks: 7 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function makePopulation() {
      var xs = [], ys = [];
      for (var i = 0; i < POP_N; i++) {
        var px = stats.sampleUniform(X_MIN + 0.3, X_MAX - 0.3);
        xs.push(px); ys.push(clamp(TRUE_A + TRUE_B * px + stats.sampleNormal(0, NOISE_SD), Y_MIN + 0.2, Y_MAX - 0.2));
      }
      state.pop = { xs: xs, ys: ys, index: xs.map(function (v, i) { return i; }) };
      state.popFit = stats.linearRegression(xs, ys);
    }
    function draw(k) {
      var added = 0;
      while (added < k && state.lines.length < MAX_DRAWS) {
        var idx = stats.sampleWithoutReplacement(state.pop.index, state.n);
        var f = stats.linearRegression(idx.map(function (i) { return state.pop.xs[i]; }), idx.map(function (i) { return state.pop.ys[i]; }));
        state.sample = idx; state.lastFit = f;
        state.lines.push({ intercept: f.intercept, slope: f.slope });
        added++;
      }
      render();
      return added;
    }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); state.lines = []; draw(1); }
    function reset() { nSlider.set(DEFAULT_N, true); state.n = DEFAULT_N; state.lines = []; draw(1); }
    function newPopulation() { makePopulation(); state.lines = []; draw(1); }
    function clipLine(a, b) {
      var pts = [];
      [X_MIN, X_MAX].forEach(function (cx) { var cy = a + b * cx; if (cy >= Y_MIN && cy <= Y_MAX) pts.push([cx, cy]); });
      if (b !== 0) [Y_MIN, Y_MAX].forEach(function (cy) { var cx = (cy - a) / b; if (cx > X_MIN && cx < X_MAX) pts.push([cx, cy]); });
      if (pts.length < 2) return null;
      pts.sort(function (p, q) { return p[0] - q[0]; });
      return [pts[0], pts[pts.length - 1]];
    }
    function place(sel, l) {
      var seg = clipLine(l.intercept, l.slope);
      sel.style("display", seg ? null : "none");
      if (seg) sel.attr("x1", x(seg[0][0])).attr("y1", y(seg[0][1])).attr("x2", x(seg[1][0])).attr("y2", y(seg[1][1]));
    }
    function slopeSd() { return state.lines.length > 1 ? stats.sd(state.lines.map(function (l) { return l.slope; })) : NaN; }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.pop || !state.lastFit) return;
      var ctx = layer.ctx; layer.clear();
      ctx.fillStyle = ui.token("--line");
      for (var i = 0; i < POP_N; i++) { ctx.beginPath(); ctx.arc(x(state.pop.xs[i]), y(state.pop.ys[i]), POP_R, 0, 2 * Math.PI); ctx.fill(); }

      var atCap = state.lines.length >= MAX_DRAWS, sd = slopeSd();
      drawButton.disabled = atCap; batchButton.disabled = atCap; note.hidden = !atCap;
      slopeOut.set(state.lastFit.slope); interceptOut.set(state.lastFit.intercept); popSlopeOut.set(state.popFit.slope);
      countOut.set(state.lines.length); sdOut.set(sd);
      status.textContent = state.lines.length < 2
        ? "One sample of " + state.n + " gives slope " + state.lastFit.slope.toFixed(2) + ", and the population's slope is " + state.popFit.slope.toFixed(2) + ". Draw again and the line moves."
        : state.lines.length + " samples of n = " + state.n + ": slopes ran from " + d3.min(state.lines, function (l) { return l.slope; }).toFixed(2) + " to " + d3.max(state.lines, function (l) { return l.slope; }).toFixed(2) + " (SD " + sd.toFixed(3) + ") around the population's " + state.popFit.slope.toFixed(2) + ". A bigger n makes the band narrower.";

      var ls = linesLayer.selectAll("line.line--faint").data(state.lines);
      ls.exit().remove();
      ls.enter().append("line").attr("class", "line line--faint").merge(ls).each(function (l) { place(d3.select(this), l); });
      place(popLine, state.popFit); place(lastLine, state.lastFit);
      var ds = dotsLayer.selectAll("circle").data(state.sample);
      ds.exit().remove();
      ds.enter().append("circle").attr("class", "dot--sample").attr("r", SAMPLE_R).merge(ds)
        .attr("cx", function (i) { return x(state.pop.xs[i]); }).attr("cy", function (i) { return y(state.pop.ys[i]); });
    }

    /* ---- initial state (D5) ------------------------------------------- */
    makePopulation();
    draw(1);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      draw: draw,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      reset: reset, newPopulation: newPopulation,
      state: function () { return { n: state.n, draws: state.lines.length, lines: state.lines.slice(), sample: state.sample.slice(), lastFit: state.lastFit, population: { xs: state.pop.xs.slice(), ys: state.pop.ys.slice(), slope: state.popFit.slope, intercept: state.popFit.intercept }, slopeSd: slopeSd() }; },
      constants: { POP_N: POP_N, TRUE_A: TRUE_A, TRUE_B: TRUE_B, NOISE_SD: NOISE_SD, X_MIN: X_MIN, X_MAX: X_MAX, Y_MIN: Y_MIN, Y_MAX: Y_MAX, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, MAX_DRAWS: MAX_DRAWS, BATCH: BATCH }
    };
  };
})();
