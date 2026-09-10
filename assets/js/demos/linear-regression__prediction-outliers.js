/*
  linear-regression__prediction-outliers.js — SYLLABUS §12.4 "Prediction and outliers".

  Teaches: prediction is safe inside the range of the data and a guess outside
  it; one point far out in x can steer the whole line.

  Public:  demos.initPredictionOutliers(containerEl) → api { setNewPoint(x, y), setPredictX(x), pushOut(), reset(), state() }
  Uses:    stats.linearRegression, stats.mean, stats.sd;  ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 drag/scale.

  Pattern per D-019 / D-020 / D-022. Ten fixed points sit between x = 1 and
  x = 6. One orange "new point" is draggable in both axes. The solid line is
  fitted to all eleven points, the dashed grey line to the ten without it. The
  region outside the data's x range is shaded as an extrapolation caution
  zone and the status line says when the prediction slider is inside it.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var X_MIN = 0, X_MAX = 14, Y_MIN = 0, Y_MAX = 14;
  var BASE = [[1, 2.4], [1.5, 2.9], [2, 3.1], [2.5, 3.9], [3, 4.2], [3.5, 4.4], [4, 5.1], [4.5, 5.3], [5, 5.8], [6, 6.6]];
  var DEFAULT_NEW = [4, 5.2], FAR_AWAY = [13, 1.5];
  var DEFAULT_PREDICT = 5;
  var KEY_STEP = 0.25, HIT_R = 22, DOT_R = 7;
  var LEVERAGE_SDS = 2;   // "far from the others" = more than 2 SDs of the base x values from their mean

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  var BASE_XS = BASE.map(function (p) { return p[0]; }), BASE_YS = BASE.map(function (p) { return p[1]; });
  var BASE_FIT = stats.linearRegression(BASE_XS, BASE_YS);
  var BASE_X_MEAN = stats.mean(BASE_XS), BASE_X_SD = stats.sd(BASE_XS);

  window.demos.initPredictionOutliers = function (container) {
    var state = { newPoint: DEFAULT_NEW.slice(), predictX: DEFAULT_PREDICT };

    /* ---- controls ---------------------------------------------------- */
    var pushButton = ui.button({ label: "Send the new point far right", kind: "primary", onClick: pushOut });
    var backButton = ui.button({ label: "Bring it back", onClick: function () { setNewPoint(DEFAULT_NEW[0], DEFAULT_NEW[1]); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(pushButton); controls.appendChild(backButton); controls.appendChild(resetButton);
    var predictSlider = ui.slider({ label: "Predict y at x =", min: X_MIN, max: X_MAX, step: 0.25, value: DEFAULT_PREDICT, decimals: 2, onChange: setPredictX });

    var slopeWithOut = ui.readout({ label: "Slope with the new point", decimals: 3, accent: true });
    var slopeWithoutOut = ui.readout({ label: "Slope without it", decimals: 3 });
    var rWithOut = ui.readout({ label: "r with", decimals: 3 });
    var rWithoutOut = ui.readout({ label: "r without", decimals: 3 });
    var predictOut = ui.readout({ label: "Predicted y", decimals: 2, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var caution = document.createElement("p"); caution.className = "demo__status"; caution.setAttribute("data-caution", "");
    var hint = document.createElement("p"); hint.className = "demo__status";
    hint.textContent = "Drag the orange diamond anywhere, or focus it and use the arrow keys. Grey dots are fixed.";

    container.appendChild(controls);
    container.appendChild(predictSlider.el);

    /* ---- chart ----------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.62, minHeight: 280, maxHeight: 420, margin: { top: 24, right: 20, bottom: 44, left: 48 }, ariaLabel: "Scatter plot with a fitted line, a draggable new point, a prediction marker, and shaded extrapolation zones" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear().domain([Y_MIN, Y_MAX]);
    var zoneLeft = frame.plot.append("rect").attr("class", "zone--caution");
    var zoneRight = frame.plot.append("rect").attr("class", "zone--caution");
    var zoneLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "end").attr("y", -8).text("shaded: outside the data, extrapolation");
    var withoutLine = frame.plot.append("line").attr("class", "line line--reference");
    var withLine = frame.plot.append("line").attr("class", "line line--strong");
    var predictStem = frame.plot.append("line").attr("class", "handle__line");
    var baseLayer = frame.plot.append("g");
    var predictMark = frame.plot.append("circle").attr("class", "mark mark--hollow").attr("r", 6);
    var predictLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("dy", "-0.7em");
    var newG = frame.plot.append("g").attr("class", "point point--new draggable").attr("tabindex", 0).attr("role", "button");
    newG.append("circle").attr("class", "hit").attr("r", HIT_R);
    newG.append("path").attr("class", "dot").attr("d", "M-9,0L0,-9L9,0L0,9Z");
    newG.call(d3.drag().on("drag", function (event) { setNewPoint(x.invert(event.x), y.invert(event.y)); }));
    newG.on("keydown", function (event) {
      var dx = event.key === "ArrowLeft" ? -KEY_STEP : event.key === "ArrowRight" ? KEY_STEP : 0;
      var dy = event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowUp" ? KEY_STEP : 0;
      if (!dx && !dy) return;
      event.preventDefault();
      setNewPoint(state.newPoint[0] + dx, state.newPoint[1] + dy);
    });
    baseLayer.selectAll("circle").data(BASE).enter().append("circle").attr("class", "dot--sample").attr("r", 4);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Solid blue: line fitted to all eleven points. Dashed grey: the line without the orange point. Hollow circle: the prediction at the slider's x.";

    container.appendChild(ui.readoutRow([slopeWithOut, slopeWithoutOut, rWithOut, rWithoutOut, predictOut]));
    container.appendChild(status);
    container.appendChild(caution);
    container.appendChild(hint);
    container.appendChild(legend);

    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.yGrid(y, 7); f.xAxis(x, { label: "x", ticks: 7 }); f.yAxis(y, { label: "y", ticks: 7 });
      baseLayer.selectAll("circle").attr("cx", function (p) { return x(p[0]); }).attr("cy", function (p) { return y(p[1]); });
      zoneLabel.attr("x", f.width);
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function setNewPoint(px, py) { state.newPoint = [clamp(px, X_MIN, X_MAX), clamp(py, Y_MIN, Y_MAX)]; render(); }
    function setPredictX(v) { state.predictX = clamp(v, X_MIN, X_MAX); render(); }
    function pushOut() { setNewPoint(FAR_AWAY[0], FAR_AWAY[1]); }
    function reset() { predictSlider.set(DEFAULT_PREDICT, true); state.predictX = DEFAULT_PREDICT; setNewPoint(DEFAULT_NEW[0], DEFAULT_NEW[1]); }
    function results() {
      var xs = BASE_XS.concat([state.newPoint[0]]), ys = BASE_YS.concat([state.newPoint[1]]);
      var f = stats.linearRegression(xs, ys), lo = d3.min(xs), hi = d3.max(xs);
      return { withNew: f, withoutNew: BASE_FIT, range: [lo, hi], predicted: f.predict(state.predictX), inside: state.predictX >= lo && state.predictX <= hi, leverage: Math.abs(state.newPoint[0] - BASE_X_MEAN) / BASE_X_SD };
    }
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

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var r = results();
      slopeWithOut.set(r.withNew.slope); slopeWithoutOut.set(r.withoutNew.slope); rWithOut.set(r.withNew.r); rWithoutOut.set(r.withoutNew.r); predictOut.set(r.predicted);
      var dSlope = r.withNew.slope - r.withoutNew.slope;
      status.textContent = r.leverage > LEVERAGE_SDS
        ? "The new point sits " + r.leverage.toFixed(1) + " SDs from the other x values, which is high leverage. It tilts the slope from " + r.withoutNew.slope.toFixed(2) + " to " + r.withNew.slope.toFixed(2) + " and r from " + r.withoutNew.r.toFixed(2) + " to " + r.withNew.r.toFixed(2) + ". One point steers the whole line."
        : "The new point sits among the others, so the line barely moves, going from slope " + r.withoutNew.slope.toFixed(2) + " → " + r.withNew.slope.toFixed(2) + " (change " + (dSlope >= 0 ? "+" : "") + dSlope.toFixed(2) + "). Drag it far to the right to see leverage.";
      caution.textContent = r.inside
        ? "x = " + state.predictX.toFixed(2) + " is inside the data (" + r.range[0].toFixed(1) + " to " + r.range[1].toFixed(1) + "): predicted y = " + r.predicted.toFixed(2) + " is an interpolation."
        : "Caution: x = " + state.predictX.toFixed(2) + " is outside the data (" + r.range[0].toFixed(1) + " to " + r.range[1].toFixed(1) + "). The line may not continue there, so y = " + r.predicted.toFixed(2) + " is an extrapolation.";

      zoneLeft.attr("x", 0).attr("y", 0).attr("width", Math.max(0, x(r.range[0]))).attr("height", frame.height);
      zoneRight.attr("x", x(r.range[1])).attr("y", 0).attr("width", Math.max(0, frame.width - x(r.range[1]))).attr("height", frame.height);
      place(withLine, r.withNew); place(withoutLine, r.withoutNew);
      var py = clamp(r.predicted, Y_MIN, Y_MAX), visible = r.predicted >= Y_MIN && r.predicted <= Y_MAX;
      predictStem.attr("x1", x(state.predictX)).attr("x2", x(state.predictX)).attr("y1", frame.height).attr("y2", y(py));
      predictMark.style("display", visible ? null : "none").attr("cx", x(state.predictX)).attr("cy", y(py));
      predictLabel.style("display", visible ? null : "none").attr("x", x(state.predictX)).attr("y", y(py)).text("ŷ = " + r.predicted.toFixed(2));
      newG.attr("transform", "translate(" + x(state.newPoint[0]) + "," + y(state.newPoint[1]) + ")")
        .attr("aria-label", "New point at x " + state.newPoint[0].toFixed(2) + ", y " + state.newPoint[1].toFixed(2) + ": drag, or use the arrow keys");
    }

    /* ---- initial state (D5) ------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setNewPoint: setNewPoint,
      setPredictX: function (v) { predictSlider.set(v, true); setPredictX(v); },
      pushOut: pushOut, reset: reset,
      state: function () { var r = results(); return { newPoint: state.newPoint.slice(), predictX: state.predictX, withNew: r.withNew, withoutNew: r.withoutNew, range: r.range, predicted: r.predicted, inside: r.inside, leverage: r.leverage }; },
      constants: { X_MIN: X_MIN, X_MAX: X_MAX, Y_MIN: Y_MIN, Y_MAX: Y_MAX, BASE: BASE.map(function (p) { return p.slice(); }), DEFAULT_NEW: DEFAULT_NEW.slice(), FAR_AWAY: FAR_AWAY.slice(), DEFAULT_PREDICT: DEFAULT_PREDICT, KEY_STEP: KEY_STEP, LEVERAGE_SDS: LEVERAGE_SDS }
    };
  };
})();
