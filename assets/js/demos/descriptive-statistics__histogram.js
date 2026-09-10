/*
  descriptive-statistics__histogram.js — SYLLABUS §2.1 "Histograms".

  Teaches: a histogram shows the shape of data, and the bin width changes the
  story — the same numbers look smooth, ragged, or misleading.

  Public:  demos.initHistogram(containerEl) → api { setBinWidth(w), setPolygon(on),
           reset(), state() }
  Uses:    stats.histogram;  ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;
           d3 scales/line.

  Pattern per D-019. The dataset is fixed (80 daily commute times in minutes,
  generated once and pasted here) so every student sees the same shapes.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var DATA = [9, 15, 51, 12, 31, 37, 41, 12, 43, 32, 46, 45, 34, 38, 13, 35, 37, 16, 50, 11, 37, 37, 31, 14, 12, 15, 45, 40, 14, 17, 13, 14, 48, 15, 29, 49, 14, 36, 13, 35, 27, 13, 36, 12, 37, 16, 15, 11, 46, 43, 42, 15, 30, 14, 47, 41, 13, 17, 40, 39, 13, 23, 30, 42, 36, 13, 10, 21, 22, 18, 36, 28, 39, 9, 50, 45, 56, 12, 50, 8];
  var START = 0, END = 60;                 // fixed x axis (D7)
  var MIN_W = 1, MAX_W = 15, DEFAULT_W = 5;

  window.demos.initHistogram = function (container) {
    // Declared first: frame.onResize renders synchronously during setup (D-021 §2).
    var MESSAGES = [
      [1, "One-minute bins: every little bump shows, and the shape is hard to read."],
      [4, "Narrow bins: ragged, but the two groups of commuters are visible."],
      [8, "Medium bins: two clear humps — walkers around 14 minutes, drivers around 38."],
      [16, "Wide bins: smooth, but the two groups have merged into one blob. The data did not change; the picture did."]
    ];

    var state = { width: DEFAULT_W, polygon: false, edges: [], counts: [] };

    /* ---- controls ---------------------------------------------------- */
    var polygonButton = ui.button({ label: "Frequency polygon", onClick: function () { setPolygon(!state.polygon); } });
    polygonButton.setAttribute("aria-pressed", "false");
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    controls.appendChild(polygonButton);
    controls.appendChild(resetButton);
    var wSlider = ui.slider({ label: "Bin width (minutes)", min: MIN_W, max: MAX_W, step: 1, value: DEFAULT_W, onChange: setBinWidth });

    var binsOut = ui.readout({ label: "Bins", decimals: 0 });
    var tallestOut = ui.readout({ label: "Tallest bin", decimals: 0 });
    var nOut = ui.readout({ label: "Data points", value: DATA.length, decimals: 0 });
    var status = document.createElement("p");
    status.className = "demo__status";
    status.setAttribute("role", "status");

    container.appendChild(wSlider.el);
    container.appendChild(controls);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.55, minHeight: 240, ariaLabel: "Histogram of 80 commute times; bin width set by the slider" });
    var x = d3.scaleLinear().domain([START, END]);
    var y = d3.scaleLinear();
    var bars = frame.plot.append("g");
    var polygon = frame.plot.append("path").attr("class", "polygon");
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });

    container.appendChild(ui.readoutRow([binsOut, tallestOut, nOut]));
    container.appendChild(status);

    frame.onResize(function (f) {
      x.range([0, f.width]);
      y.range([f.height, 0]);
      f.xAxis(x, { label: "commute time (minutes)", ticks: 6 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function compute() {
      var end = START + Math.ceil((END - START) / state.width) * state.width;   // cover the axis with whole bins
      var h = stats.histogram(DATA, START, end, state.width);
      state.edges = h.edges;
      state.counts = h.counts;
    }

    function setBinWidth(w) {
      state.width = Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));
      render();
    }

    function setPolygon(on) {
      state.polygon = !!on;
      polygonButton.setAttribute("aria-pressed", String(state.polygon));
      render();
    }

    function reset() {
      wSlider.set(DEFAULT_W, true);
      state.width = DEFAULT_W;
      setPolygon(false);
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      compute();
      var tallest = Math.max.apply(null, state.counts);
      y.domain([0, Math.max(5, Math.ceil(tallest / 5) * 5)]);
      frame.yGrid(y, 4);
      frame.yAxis(y, { label: "number of people", ticks: 4 });
      binsOut.set(state.counts.length);
      tallestOut.set(tallest);
      for (var m = 0; m < MESSAGES.length; m++) if (state.width < MESSAGES[m][0]) { status.textContent = MESSAGES[m][1]; break; }

      var sel = bars.selectAll("rect.bar").data(state.counts);
      sel.exit().remove();
      sel.enter().append("rect").attr("class", "bar").merge(sel)
        .attr("x", function (d, i) { return x(state.edges[i]); })
        .attr("width", function (d, i) { return Math.max(0, x(Math.min(state.edges[i + 1], END)) - x(state.edges[i])); })
        .attr("y", function (d) { return y(d); })
        .attr("height", function (d) { return frame.height - y(d); });

      polygon.style("display", state.polygon ? null : "none");
      if (state.polygon) {
        var pts = state.counts.map(function (c, i) { return [(state.edges[i] + state.edges[i + 1]) / 2, c]; });
        pts.unshift([state.edges[0] - state.width / 2, 0]);
        pts.push([state.edges[state.edges.length - 1] + state.width / 2, 0]);
        polygon.attr("d", lineGen(pts.filter(function (p) { return p[0] >= START && p[0] <= END + state.width; })));
      }
    }

    /* ---- initial state (D5) ------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setBinWidth: function (w) { wSlider.set(w, true); setBinWidth(w); },
      setPolygon: setPolygon,
      reset: reset,
      state: function () { return { width: state.width, polygon: state.polygon, edges: state.edges.slice(), counts: state.counts.slice(), data: DATA.slice() }; },
      constants: { DATA: DATA.slice(), START: START, END: END, MIN_W: MIN_W, MAX_W: MAX_W, DEFAULT_W: DEFAULT_W }
    };
  };
})();
