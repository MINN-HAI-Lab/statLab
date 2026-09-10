/*
  descriptive-statistics__boxplot-skew.js — SYLLABUS §2.3 "Box plots and skewness".

  Teaches: quartiles summarise position; skew pulls the mean away from the median.

  Data model (D-004): a two-component normal mixture on a FIXED axis 0–100. The
  skew slider s ∈ [−1, 1] moves the second component's weight and offset:
      σ = 9,  μ₁ = 50 − 10 s,  μ₂ = 50 + 25 s,  w₂ = 0.35 |s|
  Each point keeps its own pre-drawn z ~ N(0,1) and u ~ U(0,1), so dragging the
  slider morphs the same 300 points instead of re-rolling them (smooth, D7).

  Public:  demos.initBoxplotSkew(containerEl) → api { setSkew(s), redraw(), reset(), state() }
  Uses:    stats.sampleNormal, stats.sampleUniform, stats.histogram, stats.mean,
           stats.fiveNumberSummary, stats.iqr;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 scales.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var N = 300;
  var X_MIN = 0, X_MAX = 100, BIN = 5;
  var Y_MAX = 100;                            // fixed (D7): the tallest 5-wide bin of 300 N(50, 9) values averages ≈ 66, sd ≈ 7 — 100 is 5 sd clear
  var SIGMA = 9;
  var MIN_S = -1, MAX_S = 1, STEP_S = 0.05, DEFAULT_S = 0;
  var BOX_SHARE = 0.28;                       // bottom share of the plot for the box plot

  window.demos.initBoxplotSkew = function (container) {
    var state = { skew: DEFAULT_S, z: [], u: [], values: [], counts: [], edges: [], summary: null, mean: NaN };

    /* ---- controls ---------------------------------------------------- */
    var redrawButton = ui.button({ label: "New draw", onClick: redraw });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    controls.appendChild(redrawButton);
    controls.appendChild(resetButton);
    var sSlider = ui.slider({ label: "Skew (left ← 0 → right)", min: MIN_S, max: MAX_S, step: STEP_S, value: DEFAULT_S, decimals: 2, onChange: setSkew });

    var meanOut = ui.readout({ label: "Mean", decimals: 1, accent: true });
    var medianOut = ui.readout({ label: "Median", decimals: 1, accent: true });
    var gapOut = ui.readout({ label: "Mean − median", decimals: 1 });
    var q1Out = ui.readout({ label: "Q1", decimals: 1 });
    var q3Out = ui.readout({ label: "Q3", decimals: 1 });
    var iqrOut = ui.readout({ label: "IQR", decimals: 1 });
    var status = document.createElement("p");
    status.className = "demo__status";
    status.setAttribute("role", "status");

    container.appendChild(sSlider.el);
    container.appendChild(controls);

    /* ---- chart: histogram above, box plot below, one x axis ------------ */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.6, minHeight: 280, margin: { top: 44 }, ariaLabel: "Histogram and box plot of the same 300 values, reshaped by the skew slider" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]);
    var y = d3.scaleLinear().domain([0, Y_MAX]);
    var bars = frame.plot.append("g");
    var boxGroup = frame.plot.append("g");
    var whiskerLow = boxGroup.append("line").attr("class", "whisker");
    var whiskerHigh = boxGroup.append("line").attr("class", "whisker");
    var capLow = boxGroup.append("line").attr("class", "whisker");
    var capHigh = boxGroup.append("line").attr("class", "whisker");
    var box = boxGroup.append("rect").attr("class", "box");
    var boxMedian = boxGroup.append("line").attr("class", "median-line");
    var medianLine = frame.plot.append("line").attr("class", "line line--reference");
    var medianLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("dy", "-0.3em");
    var meanMark = frame.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-7,0L7,0L0,-11Z");
    var meanLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle");
    var histHeight = 0, boxTop = 0, boxH = 0;

    container.appendChild(ui.readoutRow([meanOut, medianOut, gapOut, q1Out, q3Out, iqrOut]));
    container.appendChild(status);

    frame.onResize(function (f) {
      x.range([0, f.width]);
      histHeight = f.height * (1 - BOX_SHARE);
      boxTop = histHeight + 14;
      boxH = f.height - boxTop - 6;
      y.range([histHeight, 0]);
      f.xAxis(x, { label: "value", ticks: 10 });
      f.yAxis(y, { label: "count", ticks: 4 });
      render();
    });

    /* ---- data ------------------------------------------------------------ */
    function redraw() {
      state.z = []; state.u = [];
      for (var i = 0; i < N; i++) { state.z.push(stats.sampleNormal(0, 1)); state.u.push(stats.sampleUniform(0, 1)); }
      render();
    }

    /** D-004 mixture, applied to the stored (z, u) pairs. */
    function values(s) {
      var mu1 = 50 - 10 * s, mu2 = 50 + 25 * s, w2 = 0.35 * Math.abs(s);
      return state.z.map(function (z, i) {
        var v = (state.u[i] < w2 ? mu2 : mu1) + SIGMA * z;
        return Math.max(X_MIN + 0.5, Math.min(X_MAX - 0.5, v));
      });
    }

    function setSkew(s) {
      state.skew = Math.max(MIN_S, Math.min(MAX_S, s));
      render();
    }

    function reset() {
      sSlider.set(DEFAULT_S, true);
      state.skew = DEFAULT_S;
      redraw();
    }

    /* ---- render ------------------------------------------------------------ */
    function render() {
      if (!state.z.length) return;
      state.values = values(state.skew);
      var h = stats.histogram(state.values, X_MIN, X_MAX, BIN);
      state.counts = h.counts; state.edges = h.edges;
      state.summary = stats.fiveNumberSummary(state.values);
      state.mean = stats.mean(state.values);
      var sm = state.summary;
      meanOut.set(state.mean); medianOut.set(sm.median); gapOut.set(state.mean - sm.median);
      q1Out.set(sm.q1); q3Out.set(sm.q3); iqrOut.set(sm.q3 - sm.q1);
      var gap = state.mean - sm.median;
      status.textContent = Math.abs(gap) < 1
        ? "Roughly symmetric, so mean and median sit together, and the box is centred between its whiskers."
        : gap > 0 ? "Skewed right, so a long tail of large values pulls the mean above the median. The upper whisker stretches."
                  : "Skewed left, so a long tail of small values pulls the mean below the median. The lower whisker stretches.";

      var sel = bars.selectAll("rect.bar").data(state.counts);
      sel.enter().append("rect").attr("class", "bar").merge(sel)
        .attr("x", function (d, i) { return x(state.edges[i]); })
        .attr("width", Math.max(0, x(BIN) - x(0)))
        .attr("y", function (d) { return y(Math.min(d, Y_MAX)); })
        .attr("height", function (d) { return histHeight - y(Math.min(d, Y_MAX)); });

      var mid = boxTop + boxH / 2;
      whiskerLow.attr("x1", x(sm.min)).attr("x2", x(sm.q1)).attr("y1", mid).attr("y2", mid);
      whiskerHigh.attr("x1", x(sm.q3)).attr("x2", x(sm.max)).attr("y1", mid).attr("y2", mid);
      capLow.attr("x1", x(sm.min)).attr("x2", x(sm.min)).attr("y1", mid - boxH / 4).attr("y2", mid + boxH / 4);
      capHigh.attr("x1", x(sm.max)).attr("x2", x(sm.max)).attr("y1", mid - boxH / 4).attr("y2", mid + boxH / 4);
      box.attr("x", x(sm.q1)).attr("y", boxTop).attr("width", Math.max(0, x(sm.q3) - x(sm.q1))).attr("height", boxH);
      boxMedian.attr("x1", x(sm.median)).attr("x2", x(sm.median)).attr("y1", boxTop).attr("y2", boxTop + boxH);
      medianLine.attr("x1", x(sm.median)).attr("x2", x(sm.median)).attr("y1", 0).attr("y2", histHeight);
      medianLabel.attr("x", x(sm.median)).attr("y", -2).text("median");
      meanMark.attr("transform", "translate(" + x(state.mean) + "," + histHeight + ")");
      meanLabel.attr("x", x(state.mean)).attr("y", -26).text("mean ▲");   // second label row above the bars
    }

    /* ---- initial state (D5) --------------------------------------------- */
    redraw();

    /* ---- api ---------------------------------------------------------------- */
    return {
      el: container,
      setSkew: function (s) { sSlider.set(s, true); setSkew(s); },
      redraw: redraw,
      reset: reset,
      state: function () { return { skew: state.skew, values: state.values.slice(), counts: state.counts.slice(), summary: Object.assign({}, state.summary), mean: state.mean }; },
      constants: { N: N, X_MIN: X_MIN, X_MAX: X_MAX, BIN: BIN, Y_MAX: Y_MAX, MIN_S: MIN_S, MAX_S: MAX_S, DEFAULT_S: DEFAULT_S, SIGMA: SIGMA }
    };
  };
})();
