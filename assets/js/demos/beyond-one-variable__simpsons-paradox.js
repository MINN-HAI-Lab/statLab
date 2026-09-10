/*
  beyond-one-variable__simpsons-paradox.js — SYLLABUS §17.1 "Simpson's paradox".

  Teaches: a trend that holds inside every group can reverse when the groups are
  pooled. The culprit is a third variable that decides both which group a point
  is in and where it sits along x.

  Public:  demos.initSimpsonsParadox(containerEl) → api { setSeparation(v), setPooled(flag),
           setSlope(v), newData(), reset(), state() }
  Uses:    stats.sampleNormal, stats.linearRegression;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 scales.

  Pattern per D-019 / D-020 §3. Two groups share one within-group slope, which the
  student sets, but sit at different places in x and y. Separating them enough
  makes the pooled line take the opposite sign while neither group's line moves.
  Groups are told apart by filled versus hollow marks, not by colour alone.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var N_PER = 24;
  var X_MIN = 0, X_MAX = 20, Y_MIN = 0, Y_MAX = 20;
  var MIN_SEP = 0, MAX_SEP = 8, DEFAULT_SEP = 6;
  var MIN_SLOPE = -1.2, MAX_SLOPE = 1.2, DEFAULT_SLOPE = 0.5;
  var NOISE = 1.1, SPREAD = 2.6;
  var GROUPS = [{ name: "Group A", cls: "dot--sample" }, { name: "Group B", cls: "mark--hollow" }];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initSimpsonsParadox = function (container) {
    var state = { sep: DEFAULT_SEP, slope: DEFAULT_SLOPE, pooled: false, points: [] };

    /* ---- controls ---------------------------------------------------- */
    var pooledButton = ui.button({ label: "Ignore the groups", onClick: function () { setPooled(!state.pooled); } });
    pooledButton.setAttribute("aria-pressed", "false");
    var newButton = ui.button({ label: "New data", onClick: newData });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(pooledButton); controls.appendChild(newButton); controls.appendChild(resetButton);
    var sepSlider = ui.slider({ label: "How far apart the two groups sit", min: MIN_SEP, max: MAX_SEP, step: 0.5, value: DEFAULT_SEP, decimals: 1, onChange: setSeparation });
    var slopeSlider = ui.slider({ label: "Slope inside each group", min: MIN_SLOPE, max: MAX_SLOPE, step: 0.1, value: DEFAULT_SLOPE, decimals: 1, onChange: setSlope });

    var aOut = ui.readout({ label: "Slope in group A", decimals: 3 });
    var bOut = ui.readout({ label: "Slope in group B", decimals: 3 });
    var pooledOut = ui.readout({ label: "Slope ignoring groups", decimals: 3, accent: true });
    var rOut = ui.readout({ label: "r ignoring groups", decimals: 3 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");

    container.appendChild(sepSlider.el);
    container.appendChild(slopeSlider.el);
    container.appendChild(controls);

    /* ---- chart ----------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.68, minHeight: 300, maxHeight: 420, margin: { top: 16, right: 20, bottom: 44, left: 48 }, ariaLabel: "Two groups of points with a fitted line inside each group and one fitted to all of them together" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear().domain([Y_MIN, Y_MAX]);
    var groupLines = frame.plot.append("g");
    var pooledLine = frame.plot.append("path").attr("class", "line line--overlay line--dashed");
    var dots = frame.plot.append("g");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Filled dots are group A, hollow dots group B. Solid blue lines fit each group on its own. The dashed orange line fits every point together, as if the group were never recorded.";

    container.appendChild(ui.readoutRow([aOut, bOut, pooledOut, rOut]));
    container.appendChild(status);
    container.appendChild(legend);

    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.yGrid(y, 5); f.xAxis(x, { label: "x", ticks: 10 }); f.yAxis(y, { label: "y", ticks: 5 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    /**
     * The lurking variable is the group itself: it pushes A down-right and B up-left
     * by the same amount, so the two clouds slide past each other along a line whose
     * slope is steeply negative while each cloud keeps the slope the student chose.
     */
    function newData() {
      state.points = [];
      for (var g = 0; g < 2; g++) {
        var cx = 10 + (g === 0 ? 1 : -1) * state.sep * 0.75;
        var cy = 10 + (g === 0 ? -1 : 1) * state.sep;
        for (var i = 0; i < N_PER; i++) {
          var dx = stats.sampleNormal(0, SPREAD);
          var px = clamp(cx + dx, X_MIN + 0.4, X_MAX - 0.4);
          var py = clamp(cy + state.slope * dx + stats.sampleNormal(0, NOISE), Y_MIN + 0.4, Y_MAX - 0.4);
          state.points.push({ g: g, x: px, y: py });
        }
      }
      render();
    }
    function setSeparation(v) { state.sep = clamp(v, MIN_SEP, MAX_SEP); newData(); }
    function setSlope(v) { state.slope = clamp(v, MIN_SLOPE, MAX_SLOPE); newData(); }
    function setPooled(flag) { state.pooled = !!flag; render(); }
    function reset() {
      sepSlider.set(DEFAULT_SEP, true); slopeSlider.set(DEFAULT_SLOPE, true);
      state.sep = DEFAULT_SEP; state.slope = DEFAULT_SLOPE; state.pooled = false;
      newData();
    }
    function fitOf(points) {
      if (points.length < 2) return null;
      try { return stats.linearRegression(points.map(function (p) { return p.x; }), points.map(function (p) { return p.y; })); }
      catch (e) { return null; }
    }
    function fits() {
      return {
        a: fitOf(state.points.filter(function (p) { return p.g === 0; })),
        b: fitOf(state.points.filter(function (p) { return p.g === 1; })),
        pooled: fitOf(state.points)
      };
    }
    function clipLine(a, b) {
      var pts = [];
      [X_MIN, X_MAX].forEach(function (cx) { var cy = a + b * cx; if (cy >= Y_MIN && cy <= Y_MAX) pts.push([cx, cy]); });
      if (b !== 0) [Y_MIN, Y_MAX].forEach(function (cy) { var cx = (cy - a) / b; if (cx > X_MIN && cx < X_MAX) pts.push([cx, cy]); });
      if (pts.length < 2) return null;
      pts.sort(function (p, q) { return p[0] - q[0]; });
      return [pts[0], pts[pts.length - 1]];
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.points.length) return;
      var f = fits();
      pooledButton.setAttribute("aria-pressed", String(state.pooled));
      pooledButton.textContent = state.pooled ? "Show the groups again" : "Ignore the groups";
      aOut.set(f.a ? f.a.slope : NaN); bOut.set(f.b ? f.b.slope : NaN);
      pooledOut.set(f.pooled ? f.pooled.slope : NaN); rOut.set(f.pooled ? f.pooled.r : NaN);
      var flipped = f.a && f.b && f.pooled && f.a.slope * f.pooled.slope < 0 && f.b.slope * f.pooled.slope < 0;
      status.textContent = !f.pooled
        ? "Spread the points out in x to fit any line."
        : flipped
          ? "Both groups slope " + (f.a.slope > 0 ? "up" : "down") + " on their own, at " + f.a.slope.toFixed(2) + " and " + f.b.slope.toFixed(2) + ". Pool them and the line slopes the other way, at " + f.pooled.slope.toFixed(2) + ". Nothing about the points changed. The only thing dropped was which group each belonged to."
          : "Within the groups the slopes are " + f.a.slope.toFixed(2) + " and " + f.b.slope.toFixed(2) + ", and ignoring the groups gives " + f.pooled.slope.toFixed(2) + ". Push the groups further apart to make the pooled line change sign.";

      var ds = dots.selectAll("circle").data(state.points);
      ds.exit().remove();
      ds.enter().append("circle").attr("r", 4).merge(ds)
        .attr("class", function (d) { return state.pooled ? "dot--sample is-pooled" : GROUPS[d.g].cls; })
        .attr("cx", function (d) { return x(d.x); }).attr("cy", function (d) { return y(d.y); });

      var lines = [f.a, f.b].filter(Boolean).map(function (fit) { return clipLine(fit.intercept, fit.slope); }).filter(Boolean);
      var ls = groupLines.selectAll("line").data(state.pooled ? [] : lines);
      ls.exit().remove();
      ls.enter().append("line").attr("class", "line line--strong").merge(ls)
        .attr("x1", function (d) { return x(d[0][0]); }).attr("y1", function (d) { return y(d[0][1]); })
        .attr("x2", function (d) { return x(d[1][0]); }).attr("y2", function (d) { return y(d[1][1]); });

      var seg = f.pooled ? clipLine(f.pooled.intercept, f.pooled.slope) : null;
      pooledLine.style("display", seg ? null : "none");
      if (seg) pooledLine.attr("d", "M" + x(seg[0][0]) + "," + y(seg[0][1]) + "L" + x(seg[1][0]) + "," + y(seg[1][1]));
    }

    /* ---- initial state (D5) ------------------------------------------- */
    newData();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setSeparation: function (v) { sepSlider.set(v, true); setSeparation(v); },
      setSlope: function (v) { slopeSlider.set(v, true); setSlope(v); },
      setPooled: setPooled, newData: newData, reset: reset,
      fits: fits,
      state: function () { var f = fits(); return { sep: state.sep, slope: state.slope, pooled: state.pooled, points: state.points.map(function (p) { return { g: p.g, x: p.x, y: p.y }; }), fits: f }; },
      constants: { N_PER: N_PER, X_MIN: X_MIN, X_MAX: X_MAX, Y_MIN: Y_MIN, Y_MAX: Y_MAX, MIN_SEP: MIN_SEP, MAX_SEP: MAX_SEP, DEFAULT_SEP: DEFAULT_SEP, MIN_SLOPE: MIN_SLOPE, MAX_SLOPE: MAX_SLOPE, DEFAULT_SLOPE: DEFAULT_SLOPE }
    };
  };
})();
