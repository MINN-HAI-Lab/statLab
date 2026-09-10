/*
  descriptive-statistics__spread.js — SYLLABUS §2.4 "Spread".

  Teaches: the standard deviation is a typical distance from the mean. Each
  deviation is drawn as a stick; squaring turns sticks into squares whose total
  area is the sum of squared deviations.

  Public:  demos.initSpread(containerEl) → api { setPoint(i, v), scale(factor),
           setSquares(on), reset(), state() }
  Uses:    stats.mean, stats.sumSquaredDeviations, stats.variance, stats.sd;
           ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 drag/scale.

  Pattern per D-019 / D-020 and the lane layout of §2.2.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MIN = 0, MAX = 100;
  var DEFAULT_POINTS = [30, 38, 42, 45, 47, 52, 58, 68];
  var KEY_STEP = 1;
  var LANE = 30;
  var DOT_R = 8, HIT_R = 22;
  var SQUARE_SCALE = 0.35;      // square side = deviation length × this; area still ∝ deviation²

  window.demos.initSpread = function (container) {
    var state = { points: DEFAULT_POINTS.slice(), squares: false };

    /* ---- controls ---------------------------------------------------- */
    var spreadButton = ui.button({ label: "Spread out", kind: "primary", onClick: function () { scale(1.25); } });
    var bunchButton = ui.button({ label: "Bunch up", onClick: function () { scale(0.8); } });
    var squaresButton = ui.button({ label: "Show squares", onClick: function () { setSquares(!state.squares); } });
    squaresButton.setAttribute("aria-pressed", "false");
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    [spreadButton, bunchButton, squaresButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var meanOut = ui.readout({ label: "Mean", decimals: 1 });
    var ssdOut = ui.readout({ label: "Sum of squared deviations", decimals: 0 });
    var varOut = ui.readout({ label: "Sample variance", decimals: 1 });
    var sdOut = ui.readout({ label: "Sample SD", decimals: 2, accent: true });
    var hint = document.createElement("p");
    hint.className = "demo__status";
    hint.textContent = "Each stick is one point's distance from the mean. Drag dots, or focus one and use the arrow keys.";

    container.appendChild(controls);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var height = LANE * (DEFAULT_POINTS.length + 1);
    var frame = ui.chart(chartHost, { aspect: 0.5, minHeight: height + 90, maxHeight: height + 90, margin: { top: 12, right: 16, bottom: 56, left: 16 }, ariaLabel: "Eight draggable dots with sticks showing each one's deviation from the mean" });
    var x = d3.scaleLinear().domain([MIN, MAX]);
    var lanes = frame.plot.append("g");
    var squaresLayer = frame.plot.append("g");
    var sticks = frame.plot.append("g");
    var meanLine = frame.plot.append("line").attr("class", "line line--reference");
    var meanLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("dy", "-0.3em");
    var pointsLayer = frame.plot.append("g");

    container.appendChild(ui.readoutRow([meanOut, ssdOut, varOut, sdOut]));
    container.appendChild(hint);

    var idx = state.points.map(function (v, i) { return i; });
    var pointSel = pointsLayer.selectAll("g.point").data(idx).enter().append("g")
      .attr("class", "point draggable").attr("tabindex", 0).attr("role", "slider")
      .attr("aria-valuemin", MIN).attr("aria-valuemax", MAX)
      .attr("aria-label", function (i) { return "Point " + (i + 1) + ": drag, or use the arrow keys"; });
    pointSel.append("circle").attr("class", "hit").attr("r", HIT_R);
    pointSel.append("circle").attr("class", "dot").attr("r", DOT_R);
    pointSel.call(d3.drag().on("drag", function (event, i) { setPoint(i, x.invert(event.x)); }));
    pointSel.on("keydown", function (event, i) {
      var dv = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowRight" || event.key === "ArrowUp" ? KEY_STEP : 0;
      if (!dv) return;
      event.preventDefault();
      setPoint(i, state.points[i] + dv);
    });
    var stickSel = sticks.selectAll("line.stick").data(idx).enter().append("line").attr("class", "stick");
    var squareSel = squaresLayer.selectAll("rect.square").data(idx).enter().append("rect").attr("class", "square");

    frame.onResize(function (f) {
      x.range([0, f.width]);
      f.xAxis(x, { label: "value", ticks: 10 });
      var laneSel = lanes.selectAll("line.lane-line").data(idx);
      laneSel.enter().append("line").attr("class", "lane-line").merge(laneSel).attr("x1", 0).attr("x2", f.width).attr("y1", laneY).attr("y2", laneY);
      render();
    });
    function laneY(i) { return LANE * (i + 1); }

    /* ---- updates ------------------------------------------------------- */
    function clamp(v) { return Math.max(MIN, Math.min(MAX, v)); }   // continuous: bunching can go all the way to zero spread
    function setPoint(i, v) { state.points[i] = clamp(v); render(); }

    /** Stretch or squeeze every point about the mean; the mean stays put, the spread changes. */
    function scale(factor) {
      var m = stats.mean(state.points);
      state.points = state.points.map(function (v) { return clamp(m + (v - m) * factor); });
      render();
    }

    function setSquares(on) {
      state.squares = !!on;
      squaresButton.setAttribute("aria-pressed", String(state.squares));
      render();
    }

    function reset() {
      state.points = DEFAULT_POINTS.slice();
      setSquares(false);
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var m = stats.mean(state.points);
      meanOut.set(m);
      ssdOut.set(stats.sumSquaredDeviations(state.points));
      varOut.set(stats.variance(state.points));
      sdOut.set(stats.sd(state.points));
      pointSel.attr("transform", function (i) { return "translate(" + x(state.points[i]) + "," + laneY(i) + ")"; })
        .attr("aria-valuenow", function (i) { return ui.formatNumber(state.points[i], 1); })
        .attr("aria-valuetext", function (i) { return "Point " + (i + 1) + " at " + ui.formatNumber(state.points[i], 1) + ", deviation " + ui.formatNumber(state.points[i] - m, 1); });
      stickSel.attr("x1", x(m)).attr("x2", function (i) { return x(state.points[i]); }).attr("y1", laneY).attr("y2", laneY);
      meanLine.attr("x1", x(m)).attr("x2", x(m)).attr("y1", 0).attr("y2", frame.height);
      meanLabel.attr("x", x(m)).attr("y", 0).text("mean " + ui.formatNumber(m, 1));
      squareSel.style("display", state.squares ? null : "none");
      if (state.squares) {
        squareSel.attr("width", function (i) { return Math.abs(x(state.points[i]) - x(m)) * SQUARE_SCALE; })
          .attr("height", function (i) { return Math.abs(x(state.points[i]) - x(m)) * SQUARE_SCALE; })
          .attr("x", function (i) { var side = Math.abs(x(state.points[i]) - x(m)) * SQUARE_SCALE; return state.points[i] >= m ? x(m) : x(m) - side; })
          .attr("y", function (i) { return laneY(i) - Math.abs(x(state.points[i]) - x(m)) * SQUARE_SCALE; });
      }
    }

    /* ---- initial state (D5) ------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setPoint: setPoint,
      scale: scale,
      setSquares: setSquares,
      reset: reset,
      state: function () { return { points: state.points.slice(), squares: state.squares, mean: stats.mean(state.points), ssd: stats.sumSquaredDeviations(state.points), variance: stats.variance(state.points), sd: stats.sd(state.points) }; },
      constants: { DEFAULT_POINTS: DEFAULT_POINTS.slice(), MIN: MIN, MAX: MAX, KEY_STEP: KEY_STEP, SQUARE_SCALE: SQUARE_SCALE }
    };
  };
})();
