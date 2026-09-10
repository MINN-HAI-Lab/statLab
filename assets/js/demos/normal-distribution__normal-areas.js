/*
  normal-distribution__normal-areas.js — SYLLABUS §6.2 "Normal areas and the empirical rule".

  Teaches: normal probabilities are areas under the curve, and about 68 %,
  95 %, and 99.7 % of the area lies within 1, 2, and 3 standard deviations
  of the mean.

  Public:  demos.initNormalAreas(containerEl) → api { setParam(name, v), setInterval(lo, hi),
           snap(k), reset(), state() }
  Uses:    stats.normalPdf, stats.normalCdf, stats.zScore;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 scales/line/area/drag.

  Pattern per D-019 / D-020 / D-024. Fixed axis 0–100; μ ∈ [30, 70] and
  σ ∈ [3, 10] keep μ ± 3σ inside it (D6/D7). Interval handles as in §5.1.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var X_MIN = 0, X_MAX = 100;
  var MU = { min: 30, max: 70, step: 1, value: 50 }, SIGMA = { min: 3, max: 10, step: 0.5, value: 10 };
  var DEFAULT_K = 1;                 // start at μ ± 1σ (D5: the 68 % picture)
  var KEY_STEP = 0.5, HANDLE_R = 22;

  window.demos.initNormalAreas = function (container) {
    var state = { mu: MU.value, sigma: SIGMA.value, lo: MU.value - DEFAULT_K * SIGMA.value, hi: MU.value + DEFAULT_K * SIGMA.value };

    /* ---- controls ---------------------------------------------------- */
    var snapButtons = [1, 2, 3].map(function (k) { return ui.button({ label: "μ ± " + k + "σ", kind: k === 1 ? "primary" : "secondary", onClick: function () { snap(k); } }); });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    snapButtons.forEach(function (b) { controls.appendChild(b); }); controls.appendChild(resetButton);
    var muSlider = ui.slider({ label: "Mean μ", min: MU.min, max: MU.max, step: MU.step, value: MU.value, onChange: function (v) { setParam("mu", v); } });
    var sigmaSlider = ui.slider({ label: "Standard deviation σ", min: SIGMA.min, max: SIGMA.max, step: SIGMA.step, value: SIGMA.value, onChange: function (v) { setParam("sigma", v); } });

    var fromOut = ui.readout({ label: "From", decimals: 1 });
    var toOut = ui.readout({ label: "To", decimals: 1 });
    var zFromOut = ui.readout({ label: "z of from", decimals: 2 });
    var zToOut = ui.readout({ label: "z of to", decimals: 2 });
    var areaOut = ui.readout({ label: "Area inside", format: function (v) { return isFinite(v) ? (v * 100).toFixed(2) + " %" : "—"; }, accent: true });
    var outsideOut = ui.readout({ label: "Area outside", format: function (v) { return isFinite(v) ? (v * 100).toFixed(2) + " %" : "—"; } });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var hint = document.createElement("p"); hint.className = "demo__status";
    hint.textContent = "Drag the two triangles, or focus one and use the arrow keys. The buttons snap the edges to whole standard deviations.";

    container.appendChild(controls);
    container.appendChild(muSlider.el);
    container.appendChild(sigmaSlider.el);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.5, minHeight: 240, margin: { top: 30, bottom: 62 }, ariaLabel: "Normal curve with a shaded interval between two draggable edges" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear().domain([0, stats.normalPdf(0, 0, SIGMA.min) * 1.1]);
    var shade = frame.plot.append("path").attr("class", "area");
    var curve = frame.plot.append("path").attr("class", "line line--strong");
    var muLine = frame.plot.append("line").attr("class", "line line--reference");
    var muLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("dy", "-0.4em");
    var sigmaTicks = frame.plot.append("g");
    var handles = frame.plot.append("g");
    var handleLo = makeHandle("lo", "Interval start"), handleHi = makeHandle("hi", "Interval end");
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
    var areaGen = d3.area().x(function (d) { return x(d[0]); }).y0(function () { return frame.height; }).y1(function (d) { return y(d[1]); });

    container.appendChild(ui.readoutRow([fromOut, toOut, zFromOut, zToOut, areaOut, outsideOut]));
    container.appendChild(status);
    container.appendChild(hint);

    function makeHandle(key, label) {
      var g = handles.append("g").attr("class", "handle draggable").attr("tabindex", 0).attr("role", "slider")
        .attr("aria-valuemin", X_MIN).attr("aria-valuemax", X_MAX).attr("aria-valuenow", state[key]).attr("aria-label", label + ": drag, or use the arrow keys");
      g.append("circle").attr("class", "hit").attr("r", HANDLE_R);
      g.append("line").attr("class", "handle__line");
      g.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L8,0L0,-12Z");
      g.call(d3.drag().on("drag", function (event) { moveHandle(key, x.invert(event.x)); }));
      g.on("keydown", function (event) {
        var dv = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowRight" || event.key === "ArrowUp" ? KEY_STEP : 0;
        if (!dv) return; event.preventDefault(); moveHandle(key, state[key] + dv);
      });
      return g;
    }

    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.xAxis(x, { label: "value", ticks: 10 });
      render();
    });

    /* ---- updates ------------------------------------------------------------ */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function round1(v) { return Math.round(v * 10) / 10; }
    function moveHandle(key, v) {
      v = round1(clamp(v, X_MIN, X_MAX));
      if (key === "lo") { state.lo = v; if (state.hi < v) state.hi = v; } else { state.hi = v; if (state.lo > v) state.lo = v; }
      render();
    }
    function setInterval(lo, hi) { state.lo = round1(clamp(Math.min(lo, hi), X_MIN, X_MAX)); state.hi = round1(clamp(Math.max(lo, hi), X_MIN, X_MAX)); render(); }
    function snap(k) { setInterval(state.mu - k * state.sigma, state.mu + k * state.sigma); }
    function setParam(name, v) {
      var spec = name === "mu" ? MU : SIGMA;
      state[name] = clamp(v, spec.min, spec.max);
      render();
    }
    function reset() { muSlider.set(MU.value, true); sigmaSlider.set(SIGMA.value, true); state.mu = MU.value; state.sigma = SIGMA.value; snap(DEFAULT_K); }
    function area() { return stats.normalCdf(state.hi, state.mu, state.sigma) - stats.normalCdf(state.lo, state.mu, state.sigma); }

    /* ---- render ---------------------------------------------------------------- */
    function render() {
      var a = area(), zLo = stats.zScore(state.lo, state.mu, state.sigma), zHi = stats.zScore(state.hi, state.mu, state.sigma);
      fromOut.set(state.lo); toOut.set(state.hi); zFromOut.set(zLo); zToOut.set(zHi); areaOut.set(a); outsideOut.set(1 - a);
      var symmetric = Math.abs(zLo + zHi) < 0.01 ? Math.round(zHi * 100) / 100 : null;
      status.textContent = symmetric === 1 ? "μ ± 1σ holds about 68 % of the area. Roughly two thirds of values land within one standard deviation of the mean."
        : symmetric === 2 ? "μ ± 2σ holds about 95 % of the area. Only one value in twenty is more than two standard deviations from the mean."
        : symmetric === 3 ? "μ ± 3σ holds about 99.7 % of the area. Values beyond three standard deviations are rare, about three in a thousand."
        : "The shaded area is P(" + ui.formatNumber(state.lo, 1) + " ≤ X ≤ " + ui.formatNumber(state.hi, 1) + ") = Φ(" + ui.formatNumber(zHi, 2) + ") − Φ(" + ui.formatNumber(zLo, 2) + ").";

      var pts = [];
      for (var i = 0; i <= 400; i++) { var xx = X_MIN + (X_MAX - X_MIN) * i / 400; pts.push([xx, stats.normalPdf(xx, state.mu, state.sigma)]); }
      curve.attr("d", lineGen(pts));
      var inside = [[state.lo, stats.normalPdf(state.lo, state.mu, state.sigma)]].concat(pts.filter(function (p) { return p[0] > state.lo && p[0] < state.hi; }), [[state.hi, stats.normalPdf(state.hi, state.mu, state.sigma)]]);
      shade.attr("d", state.hi > state.lo ? areaGen(inside) : null);
      var peak = stats.normalPdf(state.mu, state.mu, state.sigma);
      muLine.attr("x1", x(state.mu)).attr("x2", x(state.mu)).attr("y1", y(peak)).attr("y2", frame.height);
      muLabel.attr("x", x(state.mu)).attr("y", y(peak)).text("μ = " + state.mu);
      var ticks = sigmaTicks.selectAll("text.sigma-tick").data([-3, -2, -1, 1, 2, 3]);
      ticks.enter().append("text").attr("class", "marker-label marker-label--soft sigma-tick").attr("text-anchor", "middle").merge(ticks)
        .attr("x", function (k) { return x(state.mu + k * state.sigma); }).attr("y", frame.height + 34)
        .style("display", x(state.sigma) - x(0) >= 28 ? null : "none")   // hide when σ ticks would crowd (narrow screens, small σ)
        .text(function (k) { return (k > 0 ? "+" : "") + k + "σ"; });
      [["lo", handleLo], ["hi", handleHi]].forEach(function (pair) {
        var v = state[pair[0]];
        pair[1].attr("transform", "translate(" + x(v) + "," + frame.height + ")").attr("aria-valuenow", v).attr("aria-valuetext", (pair[0] === "lo" ? "from " : "to ") + v);
        pair[1].select("line.handle__line").attr("x1", 0).attr("x2", 0).attr("y1", -frame.height).attr("y2", 0);
      });
    }

    /* ---- initial state (D5) --------------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------------- */
    return {
      el: container,
      setParam: function (name, v) { (name === "mu" ? muSlider : sigmaSlider).set(v, true); setParam(name, v); },
      setInterval: setInterval, snap: snap, reset: reset,
      state: function () { return { mu: state.mu, sigma: state.sigma, lo: state.lo, hi: state.hi, area: area(), zLo: stats.zScore(state.lo, state.mu, state.sigma), zHi: stats.zScore(state.hi, state.mu, state.sigma) }; },
      constants: { X_MIN: X_MIN, X_MAX: X_MAX, MU: Object.assign({}, MU), SIGMA: Object.assign({}, SIGMA), DEFAULT_K: DEFAULT_K, KEY_STEP: KEY_STEP }
    };
  };
})();
