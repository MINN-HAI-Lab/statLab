/*
  descriptive-statistics__center.js — SYLLABUS §2.2 "Center and location".

  Teaches: mean, median, and mode answer different questions. The mean is the
  balance point and chases an outlier; the median splits the data and holds.

  Public:  demos.initCenter(containerEl) → api { setPoint(i, v), pushOut(), reset(), state() }
  Uses:    stats.mean, stats.median, stats.mode;  ui.button, ui.readout, ui.readoutRow,
           ui.chart;  d3 drag/scale.

  Pattern per D-019 / D-020: each point is a draggable, keyboard-movable SVG
  group with a 44 px hit area, on its own lane so points never hide each other.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MIN = 0, MAX = 100;
  var DEFAULT_POINTS = [22, 25, 28, 30, 31, 33, 36, 38, 40];
  var KEY_STEP = 1;
  var LANE = 26;                 // px between lanes
  var DOT_R = 8, HIT_R = 22;     // visible dot and invisible 44 px touch target

  window.demos.initCenter = function (container) {
    var state = { points: DEFAULT_POINTS.slice() };

    /* ---- controls ---------------------------------------------------- */
    var pushButton = ui.button({ label: "Push one point far out", kind: "primary", onClick: pushOut });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    controls.appendChild(pushButton);
    controls.appendChild(resetButton);
    var meanOut = ui.readout({ label: "Mean (balance point)", decimals: 1, accent: true });
    var medianOut = ui.readout({ label: "Median (splitter)", decimals: 1, accent: true });
    var modeOut = ui.readout({ label: "Mode", format: function (v) { return v.length ? v.join(", ") : "none"; } });
    var hint = document.createElement("p");
    hint.className = "demo__status";
    hint.textContent = "Drag any dot along its line, or focus it and use the arrow keys.";

    container.appendChild(controls);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var height = LANE * (DEFAULT_POINTS.length + 1);
    var frame = ui.chart(chartHost, { aspect: 0.5, minHeight: height + 90, maxHeight: height + 90, margin: { top: 12, right: 16, bottom: 56, left: 16 }, ariaLabel: "Nine draggable dots on a number line with mean and median markers" });
    var x = d3.scaleLinear().domain([MIN, MAX]);
    var lanes = frame.plot.append("g");
    var medianLine = frame.plot.append("line").attr("class", "line line--reference");
    var medianLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("dy", "-0.3em");
    var meanMark = frame.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L8,0L0,-12Z");
    var meanLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle");
    var pointsLayer = frame.plot.append("g");

    container.appendChild(ui.readoutRow([meanOut, medianOut, modeOut]));
    container.appendChild(hint);

    var pointSel = pointsLayer.selectAll("g.point").data(state.points.map(function (v, i) { return i; })).enter().append("g")
      .attr("class", "point draggable")
      .attr("tabindex", 0)
      .attr("role", "slider")
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

    frame.onResize(function (f) {
      x.range([0, f.width]);
      f.xAxis(x, { label: "value", ticks: 10 });
      var laneSel = lanes.selectAll("line.lane-line").data(state.points);
      laneSel.enter().append("line").attr("class", "lane-line").merge(laneSel)
        .attr("x1", 0).attr("x2", f.width).attr("y1", laneY).attr("y2", laneY);
      render();
    });
    function laneY(d, i) { return LANE * (i + 1); }

    /* ---- updates ------------------------------------------------------- */
    function setPoint(i, v) {
      state.points[i] = Math.round(Math.max(MIN, Math.min(MAX, v)));
      render();
    }

    /** Sends the largest point to the far right: an outlier appears, the mean follows, the median stays. */
    function pushOut() {
      var idx = 0;
      state.points.forEach(function (v, i) { if (v > state.points[idx]) idx = i; });
      setPoint(idx, 95);
    }

    function reset() {
      state.points = DEFAULT_POINTS.slice();
      render();
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var mean = stats.mean(state.points), median = stats.median(state.points), mode = stats.mode(state.points);
      meanOut.set(mean); medianOut.set(median); modeOut.set(mode);
      pointSel.attr("transform", function (i) { return "translate(" + x(state.points[i]) + "," + laneY(null, i) + ")"; })
        .attr("aria-valuenow", function (i) { return state.points[i]; })
        .attr("aria-valuetext", function (i) { return "Point " + (i + 1) + " at " + state.points[i]; });
      medianLine.attr("x1", x(median)).attr("x2", x(median)).attr("y1", 0).attr("y2", frame.height);
      medianLabel.attr("x", x(median)).attr("y", 0).text("median " + ui.formatNumber(median, 1));
      meanMark.attr("transform", "translate(" + x(mean) + "," + frame.height + ")");
      meanLabel.attr("x", x(mean)).attr("y", frame.height + 34).text("mean " + ui.formatNumber(mean, 1));   // between tick labels and the axis title
    }

    /* ---- initial state (D5) ------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setPoint: setPoint,
      pushOut: pushOut,
      reset: reset,
      state: function () { return { points: state.points.slice(), mean: stats.mean(state.points), median: stats.median(state.points), mode: stats.mode(state.points) }; },
      constants: { DEFAULT_POINTS: DEFAULT_POINTS.slice(), MIN: MIN, MAX: MAX, KEY_STEP: KEY_STEP }
    };
  };
})();
