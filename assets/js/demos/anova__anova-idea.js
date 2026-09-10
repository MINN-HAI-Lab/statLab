/*
  anova__anova-idea.js — SYLLABUS §13.1 "The idea of ANOVA".

  Teaches: F weighs the variation BETWEEN the group means against the variation
  WITHIN the groups. Spreading the means apart raises F; widening the groups
  lowers it. Only the ratio decides, never either quantity alone.

  Public:  demos.initAnovaIdea(containerEl) → api { setMean(g, v), setSpread(s), spread(), pull(),
           newData(), reset(), state() }
  Uses:    stats.sampleNormal, stats.mean, stats.anovaTest;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 drag/scale.

  Pattern per D-019 / D-020. Each group's points are its dragged mean plus a
  fixed set of mean-centred standard residuals scaled by the spread slider, so
  the handle a student drags IS the group mean and only the between-group part
  changes while dragging (D-033). The residuals are redrawn by "New data" only.
  Every printed quantity comes from stats.anovaTest on the points on screen.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var K = 3, N_PER = 10;
  var X_MIN = 0, X_MAX = 20;
  var MIN_SPREAD = 0.4, MAX_SPREAD = 5, DEFAULT_SPREAD = 1.6;
  var DEFAULT_MEANS = [8, 10, 12];
  var LANE = 54, LANE_TOP = 30, KEY_STEP = 0.25, HIT_R = 22, DOT_R = 4;
  var GROUP_NAMES = ["A", "B", "C"];
  var NUDGE = 1.2;
  var MS_BASE = 20;        // starting length of the mean-square axis, doubled or halved rarely (D7)
  var JITTER = [-0.42, 0.31, -0.16, 0.45, -0.28, 0.08, 0.38, -0.47, 0.19, -0.06];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initAnovaIdea = function (container) {
    var state = { means: DEFAULT_MEANS.slice(), spread: DEFAULT_SPREAD, residuals: [], msMax: MS_BASE };

    /* ---- controls ---------------------------------------------------- */
    var spreadButton = ui.button({ label: "Spread the means apart", kind: "primary", onClick: spreadOut });
    var pullButton = ui.button({ label: "Pull the means together", onClick: pull });
    var dataButton = ui.button({ label: "New data", onClick: newData });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(spreadButton); controls.appendChild(pullButton); controls.appendChild(dataButton); controls.appendChild(resetButton);
    var spreadSlider = ui.slider({ label: "Spread within each group, s", min: MIN_SPREAD, max: MAX_SPREAD, step: 0.1, value: DEFAULT_SPREAD, decimals: 1, onChange: setSpread });

    var msbOut = ui.readout({ label: "Between groups, MS", decimals: 2 });
    var mswOut = ui.readout({ label: "Within groups, MS", decimals: 2 });
    var fOut = ui.readout({ label: "F", decimals: 3, accent: true });
    var dfOut = ui.readout({ label: "df", decimals: 0, format: function () { return (K - 1) + ", " + (K * N_PER - K); } });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var hint = document.createElement("p"); hint.className = "demo__status";
    hint.textContent = "Drag a diamond along its row to move that group's mean, or focus it and use the arrow keys.";

    container.appendChild(spreadSlider.el);
    container.appendChild(controls);

    /* ---- chart 1: the three groups -------------------------------------- */
    var laneHost = document.createElement("div"); container.appendChild(laneHost);
    var laneHeight = LANE_TOP + LANE * K;
    var laneFrame = ui.chart(laneHost, { aspect: 0.5, minHeight: laneHeight + 56, maxHeight: laneHeight + 56, margin: { top: 12, right: 20, bottom: 44, left: 34 }, ariaLabel: "Three rows of data points, one per group, each with a draggable mean marker and the grand mean" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]);
    var lanes = laneFrame.plot.append("g");
    var betweenBars = laneFrame.plot.append("g");
    var grandLine = laneFrame.plot.append("line").attr("class", "line line--reference");
    var grandLabel = laneFrame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", 10);
    var dotsLayer = laneFrame.plot.append("g");
    var handlesLayer = laneFrame.plot.append("g");
    var nameLayer = laneFrame.plot.append("g");

    /* ---- chart 2: the two mean squares ---------------------------------- */
    var barHost = document.createElement("div"); container.appendChild(barHost);
    var barFrame = ui.chart(barHost, { aspect: 0.28, minHeight: 152, maxHeight: 152, margin: { top: 10, right: 20, bottom: 40, left: 8 }, ariaLabel: "Two bars comparing the between-group and within-group mean squares, whose ratio is F" });
    var bx = d3.scaleLinear().domain([0, MS_BASE]);
    var msBars = barFrame.plot.append("g");
    var msLabels = barFrame.plot.append("g");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "The lower chart compares two average squared distances. The first is how far the three group means sit from the grand mean, and how far the points sit from their own group's mean. F is the first divided by the second.";

    container.appendChild(ui.readoutRow([msbOut, mswOut, fOut, dfOut, pOut]));
    container.appendChild(status);
    container.appendChild(hint);
    container.appendChild(legend);

    function laneY(g) { return LANE_TOP + LANE * g + LANE / 2; }

    var handleSel = handlesLayer.selectAll("g.handle").data([0, 1, 2]).enter().append("g")
      .attr("class", "handle draggable").attr("tabindex", 0).attr("role", "slider")
      .attr("aria-valuemin", X_MIN).attr("aria-valuemax", X_MAX)
      .attr("aria-valuenow", function (g) { return state.means[g]; })
      .attr("aria-label", function (g) { return "Mean of group " + GROUP_NAMES[g] + ": drag, or use the arrow keys"; });
    handleSel.append("circle").attr("class", "hit").attr("r", HIT_R);
    handleSel.append("line").attr("class", "handle__line").attr("y1", -LANE / 2 + 6).attr("y2", LANE / 2 - 6);
    handleSel.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L0,-9L8,0L0,9Z");
    handleSel.call(d3.drag().on("drag", function (event, g) { setMean(g, x.invert(event.x)); }));
    handleSel.on("keydown", function (event, g) {
      var dv = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowRight" || event.key === "ArrowUp" ? KEY_STEP : 0;
      if (!dv) return;
      event.preventDefault();
      setMean(g, state.means[g] + dv);
    });

    nameLayer.selectAll("text").data([0, 1, 2]).enter().append("text")
      .attr("class", "marker-label").attr("text-anchor", "end").attr("x", -8).attr("dy", "0.32em")
      .attr("y", laneY).text(function (g) { return GROUP_NAMES[g]; });

    laneFrame.onResize(function (f) {
      x.range([0, f.width]);
      f.xAxis(x, { label: "value", ticks: 10 });
      var ls = lanes.selectAll("line.lane-line").data([0, 1, 2]);
      ls.enter().append("line").attr("class", "lane-line").merge(ls)
        .attr("x1", 0).attr("x2", f.width).attr("y1", laneY).attr("y2", laneY);
      render();
    });
    barFrame.onResize(function (f) {
      bx.range([0, f.width]);
      f.xAxis(bx, { label: "mean square", ticks: 5 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function newData() {
      state.residuals = [];
      for (var g = 0; g < K; g++) {
        var z = [], i;
        for (i = 0; i < N_PER; i++) z.push(stats.sampleNormal(0, 1));
        var m = stats.mean(z);
        for (i = 0; i < N_PER; i++) z[i] -= m;      // centred, so the handle is exactly the group mean
        state.residuals.push(z);
      }
      render();
    }
    function groups() {
      return state.residuals.map(function (z, g) {
        return z.map(function (v) { return clamp(state.means[g] + state.spread * v, X_MIN, X_MAX); });
      });
    }
    function setMean(g, v) { if (g < 0 || g >= K) return; state.means[g] = clamp(v, X_MIN, X_MAX); render(); }
    function setSpread(s) { state.spread = clamp(s, MIN_SPREAD, MAX_SPREAD); render(); }
    function centre() { return stats.mean(state.means); }
    function scaleMeans(factor) {
      var c = centre();
      for (var g = 0; g < K; g++) state.means[g] = clamp(c + (state.means[g] - c) * factor, X_MIN, X_MAX);
      render();
    }
    function spreadOut() { scaleMeans(NUDGE); }
    function pull() { scaleMeans(1 / NUDGE); }
    function reset() {
      spreadSlider.set(DEFAULT_SPREAD, true);
      state.spread = DEFAULT_SPREAD; state.means = DEFAULT_MEANS.slice(); state.msMax = MS_BASE;
      newData();
    }
    function results() { return stats.anovaTest(groups()); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.residuals.length) return;
      var gs = groups(), r = stats.anovaTest(gs);
      msbOut.set(r.msBetween); mswOut.set(r.msWithin); fOut.set(r.f); dfOut.set(0); pOut.set(r.p);
      status.textContent = !isFinite(r.f)
        ? "Every point sits on its group's mean, so there is no within-group variation to compare against and F is undefined."
        : r.f >= 1
          ? "The means sit " + r.msBetween.toFixed(1) + " apart in mean-square terms while the points scatter " + r.msWithin.toFixed(1) + " within their own groups, so F = " + r.f.toFixed(2) + ". Gaps that big happen by chance " + (r.p < 0.001 ? "less than 0.1 %" : "about " + (100 * r.p).toFixed(1) + " %") + " of the time when the three true means are equal."
          : "The groups overlap more than they separate, so F = " + r.f.toFixed(2) + " is below 1, so the means differ by less than the noise inside the groups already explains (p = " + r.p.toFixed(3) + ").";

      var gm = r.grandMean;
      grandLine.attr("x1", x(gm)).attr("x2", x(gm)).attr("y1", LANE_TOP - 14).attr("y2", LANE_TOP + LANE * K);
      grandLabel.attr("x", x(gm)).text("grand mean " + gm.toFixed(1));

      var bb = betweenBars.selectAll("rect").data([0, 1, 2]);
      bb.enter().append("rect").attr("class", "bar--between").merge(bb)
        .attr("x", function (g) { return Math.min(x(gm), x(r.groupMeans[g])); })
        .attr("y", function (g) { return laneY(g) - 9; })
        .attr("width", function (g) { return Math.abs(x(r.groupMeans[g]) - x(gm)); })
        .attr("height", 18);

      var flat = [];
      gs.forEach(function (vals, g) { vals.forEach(function (v, i) { flat.push({ g: g, i: i, v: v }); }); });
      var ds = dotsLayer.selectAll("circle").data(flat);
      ds.enter().append("circle").attr("class", "dot--sample").attr("r", DOT_R).merge(ds)
        .attr("cx", function (d) { return x(d.v); })
        .attr("cy", function (d) { return laneY(d.g) + JITTER[d.i] * (LANE - 26); });

      handleSel.attr("transform", function (g) { return "translate(" + x(r.groupMeans[g]) + "," + laneY(g) + ")"; })
        .attr("aria-valuenow", function (g) { return r.groupMeans[g]; })
        .attr("aria-valuetext", function (g) { return "mean of group " + GROUP_NAMES[g] + " at " + r.groupMeans[g].toFixed(2); });

      var biggest = Math.max(r.msBetween, r.msWithin);
      // Rare doubling rescale (D7). The 0.85 keeps the comparison clear of the axis
      // value itself: an exact tie there would flip the axis on floating-point noise.
      while (biggest > state.msMax * 0.85) state.msMax *= 2;
      while (state.msMax > MS_BASE && biggest < state.msMax / 4) state.msMax /= 2;
      bx.domain([0, state.msMax]);
      barFrame.xAxis(bx, { label: "mean square", ticks: 5 });
      var rows = [
        { key: "between", label: "Between groups", value: r.msBetween },
        { key: "within", label: "Within groups", value: r.msWithin }
      ];
      var bars = msBars.selectAll("rect").data(rows);
      bars.enter().append("rect").merge(bars)
        .attr("class", function (d) { return "bar bar--" + d.key; })
        .attr("x", 0).attr("y", function (d, i) { return 22 + i * 52; })
        .attr("width", function (d) { return Math.max(0, bx(Math.min(d.value, state.msMax))); })
        .attr("height", 24);
      var labs = msLabels.selectAll("text").data(rows);   // above each bar: fits at 360 px, where a left gutter would not
      labs.enter().append("text").attr("class", "marker-label").attr("text-anchor", "start").merge(labs)
        .attr("x", 0).attr("y", function (d, i) { return 14 + i * 52; })
        .text(function (d) { return d.label + ", MS = " + d.value.toFixed(1); });
    }

    /* ---- initial state (D5) ------------------------------------------- */
    newData();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setMean: setMean,
      setSpread: function (s) { spreadSlider.set(s, true); setSpread(s); },
      spread: spreadOut, pull: pull, newData: newData, reset: reset,
      groups: groups,
      state: function () { var r = results(); return { means: state.means.slice(), spread: state.spread, groups: groups(), result: r, f: r.f, p: r.p, msMax: state.msMax }; },
      constants: { K: K, N_PER: N_PER, X_MIN: X_MIN, X_MAX: X_MAX, MIN_SPREAD: MIN_SPREAD, MAX_SPREAD: MAX_SPREAD, DEFAULT_SPREAD: DEFAULT_SPREAD, DEFAULT_MEANS: DEFAULT_MEANS.slice(), KEY_STEP: KEY_STEP, NUDGE: NUDGE, MS_BASE: MS_BASE, GROUP_NAMES: GROUP_NAMES.slice() }
    };
  };
})();
