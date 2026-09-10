/*
  continuous-random-variables__density-area.js — SYLLABUS §5.1 "Density and area".

  Teaches: a density gives probability as area under the curve, so
  P(a ≤ X ≤ b) = F(b) − F(a) and P(X = x) is zero.

  Public:  demos.initDensityArea(containerEl) → api { setDistribution(key), setParam(name, v),
           setInterval(lo, hi), shrink(), draw(n), reset(), startAuto(), stopAuto(), state() }
  Uses:    stats.uniformPdf, stats.uniformCdf, stats.exponentialPdf, stats.exponentialCdf,
           stats.sampleUniform, stats.sampleExponential, stats.histogram;  ui.slider, ui.button,
           ui.readout, ui.readoutRow, ui.chart, ui.prefersReducedMotion;  d3 scales/area/drag.

  Pattern per D-019 / D-020. Fixed x axis 0–10 (D7); the interval handles are
  draggable, keyboard-movable SVG groups; draws pile into a density-scaled
  histogram (count / (n · bin width)) so it approaches the curve.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var X_MIN = 0, X_MAX = 10, BIN = 0.25;
  var MIN_WIDTH = 0.5;                       // uniform: b − a ≥ 0.5 so the density stays ≤ 2
  var DISTS = {
    uniform: {
      label: "Uniform", params: [{ key: "a", label: "Lower end a", min: 0, max: 8, step: 0.1, value: 2 }, { key: "b", label: "Upper end b", min: 1, max: 10, step: 0.1, value: 6 }],
      pdf: function (x, q) { return stats.uniformPdf(x, q.a, q.b); }, cdf: function (x, q) { return stats.uniformCdf(x, q.a, q.b); },
      sample: function (q) { return stats.sampleUniform(q.a, q.b); },
      peak: function (q) { return 1 / (q.b - q.a); }
    },
    exponential: {
      label: "Exponential", params: [{ key: "rate", label: "Rate λ", min: 0.2, max: 3, step: 0.1, value: 0.5 }],
      pdf: function (x, q) { return stats.exponentialPdf(x, q.rate); }, cdf: function (x, q) { return stats.exponentialCdf(x, q.rate); },
      sample: function (q) { return stats.sampleExponential(q.rate); },
      peak: function (q) { return q.rate; }
    }
  };
  var ORDER = ["uniform", "exponential"], DEFAULT_DIST = "uniform";
  var DEFAULT_INTERVAL = [3, 5];
  var KEY_STEP = 0.1, HANDLE_R = 22;
  var INITIAL_DRAWS = 0, MAX_DRAWS = 100000;
  var AUTO_PER_FRAME = 2, STEP_INTERVAL = 250, STEP_DRAWS = 30;

  window.demos.initDensityArea = function (container) {
    var reduced = ui.prefersReducedMotion();
    var nBins = Math.round((X_MAX - X_MIN) / BIN);
    var state = { dist: DEFAULT_DIST, params: {}, lo: DEFAULT_INTERVAL[0], hi: DEFAULT_INTERVAL[1], draws: 0, inside: 0, beyond: 0, bins: [], auto: false };
    var timer = null, sliders = {};
    var MESSAGE_POINT = "The interval has zero width, so the shaded area, and the probability, is exactly zero. A continuous variable never lands exactly on one value.";

    /* ---- controls ---------------------------------------------------- */
    var picker = document.createElement("div");
    picker.className = "ui-controls"; picker.setAttribute("role", "group"); picker.setAttribute("aria-label", "Distribution");
    var pickButtons = {};
    ORDER.forEach(function (key) { var b = ui.button({ label: DISTS[key].label, onClick: function () { setDistribution(key); } }); b.setAttribute("aria-pressed", "false"); pickButtons[key] = b; picker.appendChild(b); });
    var paramBox = document.createElement("div"); paramBox.className = "params";
    var drawOne = ui.button({ label: "Draw 1", kind: "primary", onClick: function () { draw(1); } });
    var drawMany = ui.button({ label: "Draw 100", onClick: function () { draw(100); } });
    var autoButton = ui.button({ label: "Auto-draw", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var shrinkButton = ui.button({ label: "Shrink interval to a point", onClick: shrink });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [drawOne, drawMany, autoButton, shrinkButton, resetButton].forEach(function (b) { controls.appendChild(b); });

    var fromOut = ui.readout({ label: "From", decimals: 2 });
    var toOut = ui.readout({ label: "To", decimals: 2 });
    var probOut = ui.readout({ label: "P(from ≤ X ≤ to) = area", decimals: 3, accent: true });
    var shareOut = ui.readout({ label: "Share of draws inside", decimals: 3, accent: true });
    var drawsOut = ui.readout({ label: "Draws", decimals: 0 });
    var beyondOut = ui.readout({ label: "Draws beyond the axis", decimals: 0 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_DRAWS.toLocaleString() + " draws reached. Press Reset to start again.";

    container.appendChild(picker);
    container.appendChild(paramBox);
    container.appendChild(controls);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.5, minHeight: 240, margin: { bottom: 48 }, ariaLabel: "Density curve with a shaded interval; the histogram of draws builds up underneath" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]);
    var y = d3.scaleLinear();
    var bars = frame.plot.append("g");
    var shade = frame.plot.append("path").attr("class", "area");
    var curve = frame.plot.append("path").attr("class", "line line--strong");
    var handles = frame.plot.append("g");
    var handleLo = makeHandle("lo", "Interval start"), handleHi = makeHandle("hi", "Interval end");
    var areaGen = d3.area().x(function (d) { return x(d[0]); }).y0(function () { return frame.height; }).y1(function (d) { return y(d[1]); });
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Curve: probability density f(x). Shaded: area = probability. Bars: draws so far, scaled as a density. Drag the handles or focus one and use the arrow keys.";

    container.appendChild(ui.readoutRow([fromOut, toOut, probOut, shareOut, drawsOut, beyondOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(note);

    function makeHandle(key, label) {
      var g = handles.append("g").attr("class", "handle draggable").attr("tabindex", 0).attr("role", "slider")
        .attr("aria-valuemin", X_MIN).attr("aria-valuemax", X_MAX).attr("aria-valuenow", state[key]).attr("aria-label", label + ": drag, or use the arrow keys");
      g.append("circle").attr("class", "hit").attr("r", HANDLE_R);
      g.append("line").attr("class", "handle__line");
      g.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L8,0L0,-12Z");
      g.call(d3.drag().on("drag", function (event) { moveHandle(key, x.invert(event.x)); }));
      g.on("keydown", function (event) {
        var dv = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowRight" || event.key === "ArrowUp" ? KEY_STEP : 0;
        if (!dv) return;
        event.preventDefault();
        moveHandle(key, state[key] + dv);
      });
      return g;
    }

    frame.onResize(function (f) {
      x.range([0, f.width]);
      y.range([f.height, 0]);
      f.xAxis(x, { label: "x", ticks: 10 });
      render();
    });

    /* ---- parameters ------------------------------------------------------ */
    function defaultParams(key) { var q = {}; DISTS[key].params.forEach(function (p) { q[p.key] = p.value; }); return q; }
    function buildSliders() {
      paramBox.textContent = ""; sliders = {};
      DISTS[state.dist].params.forEach(function (p) {
        var s = ui.slider({ label: p.label, min: p.min, max: p.max, step: p.step, value: state.params[p.key], onChange: function (v) { setParam(p.key, v); } });
        sliders[p.key] = s; paramBox.appendChild(s.el);
      });
    }
    /** Uniform: keep b − a ≥ MIN_WIDTH by pushing the other end. */
    function constrain(changed) {
      if (state.dist !== "uniform") return;
      var q = state.params;
      if (q.b - q.a < MIN_WIDTH) {
        if (changed === "a") { q.b = Math.min(X_MAX, q.a + MIN_WIDTH); if (q.b - q.a < MIN_WIDTH) q.a = q.b - MIN_WIDTH; }
        else { q.a = Math.max(X_MIN, q.b - MIN_WIDTH); if (q.b - q.a < MIN_WIDTH) q.b = q.a + MIN_WIDTH; }
        if (sliders.a) sliders.a.set(q.a, true);
        if (sliders.b) sliders.b.set(q.b, true);
      }
    }

    /* ---- updates ----------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function round1(v) { return Math.round(v * 100) / 100; }
    function clearRun() { state.draws = 0; state.inside = 0; state.beyond = 0; state.bins = []; for (var i = 0; i < nBins; i++) state.bins.push(0); }

    function draw(n) {
      var d = DISTS[state.dist], added = 0;
      while (added < n && state.draws < MAX_DRAWS) {
        var v = d.sample(state.params);
        state.draws += 1; added += 1;
        if (v >= state.lo && v <= state.hi) state.inside += 1;
        if (v > X_MAX) { state.beyond += 1; continue; }
        var b = clamp(Math.floor((v - X_MIN) / BIN), 0, nBins - 1);
        state.bins[b] += 1;
      }
      if (state.draws >= MAX_DRAWS) stopAuto();
      render();
      return added;
    }

    function moveHandle(key, v) {
      v = round1(clamp(v, X_MIN, X_MAX));
      if (key === "lo") { state.lo = v; if (state.hi < v) state.hi = v; }
      else { state.hi = v; if (state.lo > v) state.lo = v; }
      // The interval only changes what we measure, not the experiment: recount inside share from the bins is
      // impossible for values beyond the axis, so the inside count restarts with the draws (D3 honesty).
      clearRun();
      render();
    }

    function setInterval(lo, hi) { state.lo = round1(clamp(Math.min(lo, hi), X_MIN, X_MAX)); state.hi = round1(clamp(Math.max(lo, hi), X_MIN, X_MAX)); clearRun(); render(); }
    function shrink() { var mid = round1((state.lo + state.hi) / 2); setInterval(mid, mid); }

    function setDistribution(key) {
      if (!DISTS[key]) return;
      stopAuto();
      state.dist = key; state.params = defaultParams(key);
      buildSliders(); clearRun(); render();
    }
    function setParam(name, v) {
      var spec = null; DISTS[state.dist].params.forEach(function (p) { if (p.key === name) spec = p; });
      if (!spec) return;
      state.params[name] = clamp(v, spec.min, spec.max);
      constrain(name);
      clearRun(); render();
    }
    function reset() { stopAuto(); state.lo = DEFAULT_INTERVAL[0]; state.hi = DEFAULT_INTERVAL[1]; setDistribution(DEFAULT_DIST); }

    /* ---- render -------------------------------------------------------------- */
    function render() {
      if (!state.params || !Object.keys(state.params).length) return;
      var d = DISTS[state.dist], q = state.params;
      var prob = d.cdf(state.hi, q) - d.cdf(state.lo, q);
      var capped = state.draws >= MAX_DRAWS;
      ORDER.forEach(function (k) { pickButtons[k].setAttribute("aria-pressed", String(k === state.dist)); });
      fromOut.set(state.lo); toOut.set(state.hi); probOut.set(prob);
      shareOut.set(state.draws ? state.inside / state.draws : NaN);
      drawsOut.set(state.draws); beyondOut.set(state.beyond);
      drawOne.disabled = capped; drawMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-draw";
      note.hidden = !capped;
      status.textContent = state.hi === state.lo ? MESSAGE_POINT
        : "Width " + ui.formatNumber(state.hi - state.lo, 2) + ". The shaded area is " + ui.formatNumber(prob, 3) + " of the total area 1 under the curve.";

      var yMax = Math.max(0.5, Math.ceil(d.peak(q) * 4) / 4);
      y.domain([0, yMax]);
      frame.yGrid(y, 4);
      frame.yAxis(y, { label: "density", ticks: 4 });
      var pts = [];
      for (var i = 0; i <= 400; i++) { var xx = X_MIN + (X_MAX - X_MIN) * i / 400; pts.push([xx, d.pdf(xx, q)]); }
      if (state.dist === "uniform") {   // sharp edges: add the jump points exactly
        pts = [[X_MIN, 0], [q.a, 0], [q.a, 1 / (q.b - q.a)], [q.b, 1 / (q.b - q.a)], [q.b, 0], [X_MAX, 0]];
      }
      curve.attr("d", lineGen(pts));
      var inside = pts.filter(function (p) { return p[0] > state.lo && p[0] < state.hi; });
      inside.unshift([state.lo, d.pdf(state.lo, q)]);
      inside.push([state.hi, d.pdf(state.hi, q)]);
      if (state.dist === "uniform") inside = [[state.lo, d.pdf(state.lo, q)], [Math.max(state.lo, Math.min(state.hi, q.a)), 0], [Math.max(state.lo, Math.min(state.hi, q.a)), q.a >= state.lo && q.a <= state.hi ? 1 / (q.b - q.a) : d.pdf(state.lo, q)], [Math.max(state.lo, Math.min(state.hi, q.b)), q.b >= state.lo && q.b <= state.hi ? 1 / (q.b - q.a) : d.pdf(state.hi, q)], [Math.max(state.lo, Math.min(state.hi, q.b)), 0], [state.hi, d.pdf(state.hi, q)]].filter(function (p) { return p[0] >= state.lo && p[0] <= state.hi; });
      shade.attr("d", state.hi > state.lo ? areaGen(inside) : null);

      var w = Math.max(1, x(X_MIN + BIN) - x(X_MIN) - 1);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar bar--density").merge(sel)
        .attr("x", function (c, i) { return x(X_MIN + i * BIN) + 0.5; }).attr("width", w)
        .attr("y", function (c) { return y(Math.min(yMax, state.draws ? c / (state.draws * BIN) : 0)); })
        .attr("height", function (c) { return frame.height - y(Math.min(yMax, state.draws ? c / (state.draws * BIN) : 0)); });

      [["lo", handleLo], ["hi", handleHi]].forEach(function (pair) {
        var v = state[pair[0]];
        pair[1].attr("transform", "translate(" + x(v) + "," + frame.height + ")").attr("aria-valuenow", v).attr("aria-valuetext", pair[0] === "lo" ? "from " + v : "to " + v);
        pair[1].select("line.handle__line").attr("x1", 0).attr("x2", 0).attr("y1", -frame.height).attr("y2", 0);
      });
    }

    /* ---- auto loop ----------------------------------------------------------- */
    function startAuto() {
      if (state.auto || state.draws >= MAX_DRAWS) return;
      state.auto = true;
      if (reduced) timer = window.setInterval(function () { draw(STEP_DRAWS); }, STEP_INTERVAL);
      else { var step = function () { if (!state.auto) return; draw(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); }; timer = window.requestAnimationFrame(step); }
      render();
    }
    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null; render();
    }

    /* ---- initial state (D5): curve and shaded interval, no draws yet --------- */
    setDistribution(DEFAULT_DIST);

    /* ---- api ------------------------------------------------------------------- */
    return {
      el: container,
      setDistribution: setDistribution,
      setParam: function (name, v) { if (sliders[name]) sliders[name].set(v, true); setParam(name, v); },
      setInterval: setInterval,
      shrink: shrink,
      draw: draw, reset: reset, startAuto: startAuto, stopAuto: stopAuto,
      state: function () {
        var d = DISTS[state.dist];
        return { dist: state.dist, params: Object.assign({}, state.params), lo: state.lo, hi: state.hi, probability: d.cdf(state.hi, state.params) - d.cdf(state.lo, state.params), draws: state.draws, inside: state.inside, beyond: state.beyond, bins: state.bins.slice(), auto: state.auto };
      },
      constants: { X_MIN: X_MIN, X_MAX: X_MAX, BIN: BIN, MIN_WIDTH: MIN_WIDTH, DEFAULT_INTERVAL: DEFAULT_INTERVAL.slice(), KEY_STEP: KEY_STEP, MAX_DRAWS: MAX_DRAWS, DEFAULT_DIST: DEFAULT_DIST }
    };
  };
})();
