/*
  linear-regression__least-squares.js — SYLLABUS §12.1 "Least squares".

  Teaches: the fitted line is the one that makes the residual squares smallest.
  Each point's residual is drawn literally as a square whose side is the
  vertical gap between the point and the line; the sum of their areas is SSE.

  Public:  demos.initLeastSquares(containerEl) → api { setMode(mode), setPoint(i, x, y),
           setLine(intercept, slope), setHandle(k, y), reset(), state() }
           mode ∈ "points" | "line"   (D-006: an explicit two-state toggle)
  Uses:    stats.linearRegression, stats.sumSquaredResiduals;  ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 drag/scale.

  Pattern per D-019 / D-020 / D-022. In "points" mode the dots are draggable
  (pointer or arrow keys, both axes) and the squares belong to the best line.
  In "line" mode the dots are inert, two handles on the student's own line are
  draggable, its squares are drawn in orange, and the scoreboard compares the
  student's SSE with the least-squares minimum. Squares are true pixel squares,
  so their areas are proportional to the squared residuals on the y scale.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var X_MIN = 0, X_MAX = 10, Y_MIN = 0, Y_MAX = 10;
  var DEFAULT_POINTS = [[1, 2.6], [2, 2.0], [3, 4.6], [4, 3.7], [5, 6.3], [6, 5.1], [7, 7.8], [8, 6.9], [9, 9.2]];
  var HANDLE_X = [1.5, 8.5];             // the student's line passes through two handles at these x
  var DEFAULT_HANDLES = [2, 9];          // a plausible but too-steep guess the student must improve
  var MODES = [{ key: "points", label: "Move points" }, { key: "line", label: "Your line vs best line" }];
  var DEFAULT_MODE = "points";
  var KEY_STEP = 0.25, HIT_R = 22, DOT_R = 6;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function copy(pts) { return pts.map(function (p) { return [p[0], p[1]]; }); }

  window.demos.initLeastSquares = function (container) {
    var state = { mode: DEFAULT_MODE, points: copy(DEFAULT_POINTS), handles: DEFAULT_HANDLES.slice() };

    /* ---- controls ---------------------------------------------------- */
    var modeGroup = document.createElement("div"); modeGroup.className = "ui-controls"; modeGroup.setAttribute("role", "group"); modeGroup.setAttribute("aria-label", "What the pointer moves");
    var modeButtons = {};
    MODES.forEach(function (m) { var b = ui.button({ label: m.label, onClick: function () { setMode(m.key); } }); b.setAttribute("aria-pressed", "false"); modeButtons[m.key] = b; modeGroup.appendChild(b); });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    modeGroup.appendChild(resetButton);

    var slopeOut = ui.readout({ label: "Best slope b", decimals: 3 });
    var interceptOut = ui.readout({ label: "Best intercept a", decimals: 3 });
    var rOut = ui.readout({ label: "r", decimals: 3 });
    var bestSseOut = ui.readout({ label: "Best SSE", decimals: 3, accent: true });
    var yourSseOut = ui.readout({ label: "Your SSE", decimals: 3, accent: true });
    var gapOut = ui.readout({ label: "Yours above best by", decimals: 1, format: function (v) { return isFinite(v) ? v.toFixed(1) + " %" : "—"; } });
    var equation = document.createElement("p"); equation.className = "demo__status"; equation.setAttribute("data-eq", "");
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var hint = document.createElement("p"); hint.className = "demo__status";

    container.appendChild(modeGroup);

    /* ---- chart ----------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.7, minHeight: 300, maxHeight: 420, margin: { top: 16, right: 20, bottom: 44, left: 48 }, ariaLabel: "Scatter plot with draggable points, the least-squares line, and residual squares" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear().domain([Y_MIN, Y_MAX]);
    var squaresLayer = frame.plot.append("g");
    var bestLine = frame.plot.append("line").attr("class", "line line--strong");
    var yourLine = frame.plot.append("line").attr("class", "line line--overlay line--dashed");
    var pointsLayer = frame.plot.append("g");
    var handlesLayer = frame.plot.append("g");

    container.appendChild(ui.readoutRow([slopeOut, interceptOut, rOut]));
    container.appendChild(ui.readoutRow([bestSseOut, yourSseOut, gapOut]));
    container.appendChild(equation);
    container.appendChild(status);
    container.appendChild(hint);

    var pointSel = pointsLayer.selectAll("g.point").data(state.points.map(function (p, i) { return i; })).enter().append("g")
      .attr("class", "point draggable").attr("tabindex", 0).attr("role", "button");
    pointSel.append("circle").attr("class", "hit").attr("r", HIT_R);
    pointSel.append("circle").attr("class", "dot").attr("r", DOT_R);
    pointSel.call(d3.drag().on("drag", function (event, i) { if (state.mode === "points") setPoint(i, x.invert(event.x), y.invert(event.y)); }));
    pointSel.on("keydown", function (event, i) {
      if (state.mode !== "points") return;
      var dx = event.key === "ArrowLeft" ? -KEY_STEP : event.key === "ArrowRight" ? KEY_STEP : 0;
      var dy = event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowUp" ? KEY_STEP : 0;
      if (!dx && !dy) return;
      event.preventDefault();
      setPoint(i, state.points[i][0] + dx, state.points[i][1] + dy);
    });

    var handleSel = handlesLayer.selectAll("g.handle").data([0, 1]).enter().append("g")
      .attr("class", "handle draggable").attr("tabindex", -1).attr("role", "slider")
      .attr("aria-valuemin", Y_MIN).attr("aria-valuemax", Y_MAX)
      .attr("aria-valuenow", function (k) { return state.handles[k]; })
      .attr("aria-label", function (k) { return (k ? "Right" : "Left") + " end of your line: drag up or down, or use the arrow keys"; });
    handleSel.append("circle").attr("class", "hit").attr("r", HIT_R);
    handleSel.append("path").attr("class", "mark").attr("d", "M-9,0L0,-9L9,0L0,9Z");
    handleSel.call(d3.drag().on("drag", function (event, k) { if (state.mode === "line") setHandle(k, y.invert(event.y)); }));
    handleSel.on("keydown", function (event, k) {
      if (state.mode !== "line") return;
      var dv = event.key === "ArrowDown" || event.key === "ArrowLeft" ? -KEY_STEP : event.key === "ArrowUp" || event.key === "ArrowRight" ? KEY_STEP : 0;
      if (!dv) return;
      event.preventDefault();
      setHandle(k, state.handles[k] + dv);
    });

    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.yGrid(y, 5); f.xAxis(x, { label: "x", ticks: 10 }); f.yAxis(y, { label: "y", ticks: 5 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function setMode(m) { if (!modeButtons[m]) return; state.mode = m; render(); }
    function setPoint(i, px, py) {
      if (i < 0 || i >= state.points.length) return;
      state.points[i] = [clamp(px, X_MIN, X_MAX), clamp(py, Y_MIN, Y_MAX)];
      render();
    }
    function setHandle(k, v) { state.handles[k] = clamp(v, Y_MIN, Y_MAX); render(); }
    function setLine(intercept, slope) { state.handles = HANDLE_X.map(function (hx) { return clamp(intercept + slope * hx, Y_MIN, Y_MAX); }); render(); }
    function reset() { state.points = copy(DEFAULT_POINTS); state.handles = DEFAULT_HANDLES.slice(); state.mode = DEFAULT_MODE; render(); }

    function xs() { return state.points.map(function (p) { return p[0]; }); }
    function ys() { return state.points.map(function (p) { return p[1]; }); }
    function yourLineParams() {
      var slope = (state.handles[1] - state.handles[0]) / (HANDLE_X[1] - HANDLE_X[0]);
      return { slope: slope, intercept: state.handles[0] - slope * HANDLE_X[0] };
    }
    function fit() { try { return stats.linearRegression(xs(), ys()); } catch (e) { return null; } }   // null when every x coincides
    function results() {
      var best = fit(), yours = yourLineParams();
      yours.sse = stats.sumSquaredResiduals(xs(), ys(), yours.intercept, yours.slope);
      return { best: best, yours: yours, gap: best ? 100 * (yours.sse - best.sse) / best.sse : NaN };
    }
    /** Segment of y = a + b x inside the plot rectangle, in data units, or null. */
    function clipLine(a, b) {
      var pts = [];
      [X_MIN, X_MAX].forEach(function (cx) { var cy = a + b * cx; if (cy >= Y_MIN && cy <= Y_MAX) pts.push([cx, cy]); });
      if (b !== 0) [Y_MIN, Y_MAX].forEach(function (cy) { var cx = (cy - a) / b; if (cx > X_MIN && cx < X_MAX) pts.push([cx, cy]); });
      if (pts.length < 2) return null;
      pts.sort(function (p, q) { return p[0] - q[0]; });
      return [pts[0], pts[pts.length - 1]];
    }
    function eq(a, b) { return "ŷ = " + ui.formatNumber(a, 2) + (b < 0 ? " − " : " + ") + ui.formatNumber(Math.abs(b), 2) + " x"; }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var r = results(), lineMode = state.mode === "line", best = r.best;
      MODES.forEach(function (m) { modeButtons[m.key].setAttribute("aria-pressed", String(m.key === state.mode)); });
      slopeOut.set(best ? best.slope : NaN); interceptOut.set(best ? best.intercept : NaN); rOut.set(best ? best.r : NaN);
      bestSseOut.set(best ? best.sse : NaN); yourSseOut.set(r.yours.sse); gapOut.set(r.gap);
      equation.textContent = (best ? "Best line: " + eq(best.intercept, best.slope) : "Best line: undefined while every point shares one x") + (lineMode ? ". Your line: " + eq(r.yours.intercept, r.yours.slope) : "");
      if (!best) status.textContent = "Spread the points out in x to fit a line.";
      else if (!lineMode) status.textContent = "The blue squares are the residuals of the best line. Their total area, SSE = " + best.sse.toFixed(2) + ", is the smallest any straight line can reach for these points.";
      else if (r.gap < 0.5) status.textContent = "You matched the least-squares line, with SSE = " + r.yours.sse.toFixed(2) + " against a minimum of " + best.sse.toFixed(2) + ". No straight line does better.";
      else status.textContent = "Your orange squares total " + r.yours.sse.toFixed(2) + ", and the best line reaches " + best.sse.toFixed(2) + ". Drag the diamonds to shrink the squares.";
      hint.textContent = lineMode ? "Drag a diamond up or down, or focus it and use the arrow keys. Dots are locked in this mode." : "Drag any dot in either direction, or focus it and use the arrow keys. Switch modes to draw your own line.";

      pointSel.classed("is-inert", lineMode).attr("tabindex", lineMode ? -1 : 0)
        .attr("transform", function (i) { return "translate(" + x(state.points[i][0]) + "," + y(state.points[i][1]) + ")"; })
        .attr("aria-label", function (i) { return "Point " + (i + 1) + " at x " + state.points[i][0].toFixed(2) + ", y " + state.points[i][1].toFixed(2) + (lineMode ? " (locked)" : ": drag, or use the arrow keys"); });
      handleSel.style("display", lineMode ? null : "none").attr("tabindex", lineMode ? 0 : -1)
        .attr("transform", function (k) { return "translate(" + x(HANDLE_X[k]) + "," + y(state.handles[k]) + ")"; })
        .attr("aria-valuenow", function (k) { return state.handles[k]; })
        .attr("aria-valuetext", function (k) { return (k ? "right" : "left") + " end at y " + state.handles[k].toFixed(2); });

      var seg = best ? clipLine(best.intercept, best.slope) : null;
      bestLine.style("display", seg ? null : "none");
      if (seg) bestLine.attr("x1", x(seg[0][0])).attr("y1", y(seg[0][1])).attr("x2", x(seg[1][0])).attr("y2", y(seg[1][1]));
      var yseg = clipLine(r.yours.intercept, r.yours.slope);
      yourLine.style("display", lineMode && yseg ? null : "none");
      if (yseg) yourLine.attr("x1", x(yseg[0][0])).attr("y1", y(yseg[0][1])).attr("x2", x(yseg[1][0])).attr("y2", y(yseg[1][1]));

      var line = lineMode ? r.yours : best;
      var sq = squaresLayer.selectAll("rect.square").data(line ? state.points.map(function (p, i) { return i; }) : []);
      sq.exit().remove();
      sq.enter().append("rect").attr("class", "square").merge(sq)
        .classed("square--manual", lineMode)
        .each(function (i) {
          var px = x(state.points[i][0]), py = y(state.points[i][1]), ly = y(line.intercept + line.slope * state.points[i][0]);
          var side = Math.abs(py - ly), left = px > frame.width / 2 ? px - side : px;
          d3.select(this).attr("x", left).attr("y", Math.min(py, ly)).attr("width", side).attr("height", side);
        });
    }

    /* ---- initial state (D5) ------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setMode: setMode, setPoint: setPoint, setHandle: setHandle, setLine: setLine, reset: reset,
      state: function () { var r = results(); return { mode: state.mode, points: copy(state.points), handles: state.handles.slice(), best: r.best, yours: r.yours, gap: r.gap }; },
      constants: { X_MIN: X_MIN, X_MAX: X_MAX, Y_MIN: Y_MIN, Y_MAX: Y_MAX, DEFAULT_POINTS: copy(DEFAULT_POINTS), HANDLE_X: HANDLE_X.slice(), DEFAULT_HANDLES: DEFAULT_HANDLES.slice(), DEFAULT_MODE: DEFAULT_MODE, KEY_STEP: KEY_STEP }
    };
  };
})();
