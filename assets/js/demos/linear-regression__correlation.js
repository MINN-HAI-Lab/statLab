/*
  linear-regression__correlation.js — SYLLABUS §12.2 "Correlation".

  Teaches: r measures how tightly points follow a straight line, not how steep
  the line is and not whether x causes y. Two presets share the same r with
  very different slopes; a curved pattern has r ≈ 0 despite a perfect pattern.

  Public:  demos.initCorrelation(containerEl) → api { setPreset(key), setPoint(i, x, y), reset(), state() }
  Uses:    stats.linearRegression, stats.mean;  ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 drag/scale.

  Pattern per D-019 / D-020 / D-022. Presets are deterministic (a fixed noise
  vector scaled per preset), so "steep" and "shallow" are affine images of one
  another and have exactly equal r. Each dot is filled when its product
  (x − x̄)(y − ȳ) is positive and hollow when negative, so the sign of r can be
  read from the plot without colour.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var X_MIN = 0, X_MAX = 10, Y_MIN = 0, Y_MAX = 10;
  var XS = [0.75, 1.5, 2.25, 3, 3.75, 4.5, 5.25, 6, 6.75, 7.5, 8.25, 9];
  var NOISE = [0.6, -0.5, 0.3, -0.7, 0.2, 0.8, -0.4, 0.1, -0.6, 0.5, -0.2, -0.1];
  var NOISE_2 = [1.2, -0.9, 0.4, -1.3, 0.9, 1.4, -1.1, 0.2, -0.8, 1.0, -0.5, -0.5];
  var X_CENTRE = 4.875;   // mean of XS, so the parabola is symmetric about x̄ and r is exactly 0
  var PRESETS = [
    { key: "steep", label: "Strong, steep", y: function (x, i) { return 0.5 + 0.95 * x + NOISE[i]; } },
    { key: "shallow", label: "Strong, shallow", y: function (x, i) { return 3.5 + 0.3 * x + (0.3 / 0.95) * NOISE[i]; } },
    { key: "weak", label: "Weak", y: function (x, i) { return 2 + 0.5 * x + 2.4 * NOISE_2[i]; } },
    { key: "none", label: "None", y: function (x, i) { return 5 + 2.5 * NOISE_2[i]; } },
    { key: "negative", label: "Negative", y: function (x, i) { return 9.5 - 0.95 * x + NOISE[i]; } },
    { key: "curved", label: "Curved, r ≈ 0", y: function (x) { return 1 + 0.45 * (x - X_CENTRE) * (x - X_CENTRE); } }
  ];
  var DEFAULT_PRESET = "steep";
  var KEY_STEP = 0.25, HIT_R = 22, DOT_R = 6;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function presetPoints(key) {
    var p = null; PRESETS.forEach(function (q) { if (q.key === key) p = q; });
    return XS.map(function (x, i) { return [x, clamp(p.y(x, i), Y_MIN, Y_MAX)]; });
  }
  function copy(pts) { return pts.map(function (p) { return [p[0], p[1]]; }); }

  window.demos.initCorrelation = function (container) {
    var state = { preset: DEFAULT_PRESET, points: presetPoints(DEFAULT_PRESET) };

    /* ---- controls ---------------------------------------------------- */
    var presetGroup = document.createElement("div"); presetGroup.className = "ui-controls"; presetGroup.setAttribute("role", "group"); presetGroup.setAttribute("aria-label", "Preset patterns");
    var presetButtons = {};
    PRESETS.forEach(function (p) { var b = ui.button({ label: p.label, onClick: function () { setPreset(p.key); } }); b.setAttribute("aria-pressed", "false"); presetButtons[p.key] = b; presetGroup.appendChild(b); });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    presetGroup.appendChild(resetButton);

    var rOut = ui.readout({ label: "r", decimals: 3, accent: true });
    var r2Out = ui.readout({ label: "r²", decimals: 3 });
    var slopeOut = ui.readout({ label: "Slope b", decimals: 3 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var hint = document.createElement("p"); hint.className = "demo__status";
    hint.textContent = "Filled dots sit above-right or below-left of the mean cross and pull r up, while hollow dots pull it down. Drag any dot, or focus it and use the arrow keys.";

    container.appendChild(presetGroup);

    /* ---- chart ----------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.7, minHeight: 300, maxHeight: 420, margin: { top: 16, right: 20, bottom: 44, left: 48 }, ariaLabel: "Scatter plot with draggable points, the mean cross, and the fitted line" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear().domain([Y_MIN, Y_MAX]);
    var meanX = frame.plot.append("line").attr("class", "line line--reference");
    var meanY = frame.plot.append("line").attr("class", "line line--reference");
    var fitLine = frame.plot.append("line").attr("class", "line line--strong");
    var pointsLayer = frame.plot.append("g");

    container.appendChild(ui.readoutRow([rOut, r2Out, slopeOut]));
    container.appendChild(status);
    container.appendChild(hint);

    var pointSel = pointsLayer.selectAll("g.point").data(XS.map(function (v, i) { return i; })).enter().append("g")
      .attr("class", "point draggable").attr("tabindex", 0).attr("role", "button");
    pointSel.append("circle").attr("class", "hit").attr("r", HIT_R);
    pointSel.append("circle").attr("class", "dot").attr("r", DOT_R);
    pointSel.call(d3.drag().on("drag", function (event, i) { setPoint(i, x.invert(event.x), y.invert(event.y)); }));
    pointSel.on("keydown", function (event, i) {
      var dx = event.key === "ArrowLeft" ? -KEY_STEP : event.key === "ArrowRight" ? KEY_STEP : 0;
      var dy = event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowUp" ? KEY_STEP : 0;
      if (!dx && !dy) return;
      event.preventDefault();
      setPoint(i, state.points[i][0] + dx, state.points[i][1] + dy);
    });

    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.yGrid(y, 5); f.xAxis(x, { label: "x", ticks: 10 }); f.yAxis(y, { label: "y", ticks: 5 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function setPreset(key) { if (!presetButtons[key]) return; state.preset = key; state.points = presetPoints(key); render(); }
    function setPoint(i, px, py) {
      if (i < 0 || i >= state.points.length) return;
      state.points[i] = [clamp(px, X_MIN, X_MAX), clamp(py, Y_MIN, Y_MAX)];
      state.preset = "custom";
      render();
    }
    function reset() { setPreset(DEFAULT_PRESET); }
    function xs() { return state.points.map(function (p) { return p[0]; }); }
    function ys() { return state.points.map(function (p) { return p[1]; }); }
    function fit() { try { return stats.linearRegression(xs(), ys()); } catch (e) { return null; } }
    function clipLine(a, b) {
      var pts = [];
      [X_MIN, X_MAX].forEach(function (cx) { var cy = a + b * cx; if (cy >= Y_MIN && cy <= Y_MAX) pts.push([cx, cy]); });
      if (b !== 0) [Y_MIN, Y_MAX].forEach(function (cy) { var cx = (cy - a) / b; if (cx > X_MIN && cx < X_MAX) pts.push([cx, cy]); });
      if (pts.length < 2) return null;
      pts.sort(function (p, q) { return p[0] - q[0]; });
      return [pts[0], pts[pts.length - 1]];
    }
    function describe(r) {
      var m = Math.abs(r);
      if (!isFinite(r)) return "undefined: one variable does not vary";
      var strength = m >= 0.8 ? "strong" : m >= 0.5 ? "moderate" : m >= 0.2 ? "weak" : "almost none";
      return strength + (m >= 0.2 ? (r > 0 ? ", positive" : ", negative") : "");
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var f = fit();
      PRESETS.forEach(function (p) { presetButtons[p.key].setAttribute("aria-pressed", String(p.key === state.preset)); });
      rOut.set(f ? f.r : NaN); r2Out.set(f ? f.r2 : NaN); slopeOut.set(f ? f.slope : NaN);
      if (!f) status.textContent = "Spread the points out in x to compute r.";
      else if (state.preset === "curved") status.textContent = "r = " + f.r.toFixed(3) + ": the pattern is perfect but not linear, and r only measures straight-line association. Always look at the plot.";
      else if (state.preset === "steep" || state.preset === "shallow") status.textContent = "Linear association is " + describe(f.r) + " (r = " + f.r.toFixed(3) + "). Compare “Strong, steep” with “Strong, shallow”: the slope changes, r does not.";
      else status.textContent = "Linear association is " + describe(f.r) + " (r = " + ui.formatNumber(f.r, 3) + "). r² = " + ui.formatNumber(f.r2, 3) + " of the variation in y is explained by the line.";

      var xm = stats.mean(xs()), ym = stats.mean(ys());
      meanX.attr("x1", x(xm)).attr("x2", x(xm)).attr("y1", 0).attr("y2", frame.height);
      meanY.attr("x1", 0).attr("x2", frame.width).attr("y1", y(ym)).attr("y2", y(ym));
      var seg = f ? clipLine(f.intercept, f.slope) : null;
      fitLine.style("display", seg ? null : "none");
      if (seg) fitLine.attr("x1", x(seg[0][0])).attr("y1", y(seg[0][1])).attr("x2", x(seg[1][0])).attr("y2", y(seg[1][1]));
      pointSel.attr("transform", function (i) { return "translate(" + x(state.points[i][0]) + "," + y(state.points[i][1]) + ")"; })
        .attr("aria-label", function (i) { return "Point " + (i + 1) + " at x " + state.points[i][0].toFixed(2) + ", y " + state.points[i][1].toFixed(2) + ": drag, or use the arrow keys"; })
        .select("circle.dot").classed("dot--hollow", function (i) { return (state.points[i][0] - xm) * (state.points[i][1] - ym) < 0; });
    }

    /* ---- initial state (D5) ------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setPreset: setPreset, setPoint: setPoint, reset: reset,
      presetPoints: presetPoints,
      state: function () { var f = fit(); return { preset: state.preset, points: copy(state.points), fit: f, r: f ? f.r : NaN, r2: f ? f.r2 : NaN, slope: f ? f.slope : NaN }; },
      constants: { X_MIN: X_MIN, X_MAX: X_MAX, Y_MIN: Y_MIN, Y_MAX: Y_MAX, PRESETS: PRESETS.map(function (p) { return p.key; }), DEFAULT_PRESET: DEFAULT_PRESET, KEY_STEP: KEY_STEP, N: XS.length }
    };
  };
})();
