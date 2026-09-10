/*
  anova__f-distribution.js — SYLLABUS §13.2 "The F distribution and the decision".

  Teaches: when the three true means are equal, the F-ratio has a known shape,
  the F distribution with k − 1 and n − k degrees of freedom. Five per cent of
  studies land beyond the critical value even though nothing is going on. Give
  the groups a real gap and the whole pile slides right past that line.

  Public:  demos.initFDistribution(containerEl) → api { run(k), setGap(g), setN(n), reset(), state() }
  Uses:    stats.sampleNormal, stats.anovaTest, stats.fPdf, stats.fQuantile, stats.histogram;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 scales/line/area.

  Pattern per D-019 / D-024 / D-026 / D-031. Each study draws fresh data, so the
  pile is honest; the orange curve is always what H₀ predicts, and the histogram
  is density-scaled (count / (studies × bin width)) so the two are comparable.
  Changing the gap or n restarts the run. Fixed axes with an off-axis counter.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var K = 3, SIGMA = 2, BASE = 8;
  var MIN_GAP = 0, MAX_GAP = 3, DEFAULT_GAP = 0;
  var MIN_N = 4, MAX_N = 30, DEFAULT_N = 10;
  var STRIP_MIN = 0, STRIP_MAX = 24;
  var F_MAX = 8, BIN = 0.25, Y_MAX = 1.25;
  var MAX_STUDIES = 2000, BATCH = 200, ALPHA = 0.05, INITIAL = 40;
  var LANE = 36, LANE_TOP = 18, DOT_R = 3;
  var GROUP_NAMES = ["A", "B", "C"];
  var JITTER = [-0.35, 0.3, -0.12, 0.4, -0.26, 0.06, 0.36, -0.42, 0.16, -0.04, 0.24, -0.3, 0.1, 0.44, -0.2, 0.02, 0.32, -0.38, 0.14, -0.08, 0.28, -0.24, 0.18, 0.42, -0.16, 0.04, 0.34, -0.44, 0.12, -0.02];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initFDistribution = function (container) {
    var state = { gap: DEFAULT_GAP, n: DEFAULT_N, studies: 0, fs: [], rejected: 0, last: null, lastGroups: [] };

    /* ---- controls ---------------------------------------------------- */
    var runButton = ui.button({ label: "Run one study", kind: "primary", onClick: function () { run(1); } });
    var batchButton = ui.button({ label: "Run " + BATCH, onClick: function () { run(BATCH); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(runButton); controls.appendChild(batchButton); controls.appendChild(resetButton);
    var gapSlider = ui.slider({ label: "True gap between neighbouring means", min: MIN_GAP, max: MAX_GAP, step: 0.25, value: DEFAULT_GAP, decimals: 2, onChange: setGap });
    var nSlider = ui.slider({ label: "Observations per group, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var fOut = ui.readout({ label: "This study's F", decimals: 3, accent: true });
    var dfOut = ui.readout({ label: "df", decimals: 0, format: function (v) { return isFinite(v) ? (K - 1) + ", " + v : "—"; } });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var critOut = ui.readout({ label: "Critical F at 5 %", decimals: 3 });
    var studiesOut = ui.readout({ label: "Studies", decimals: 0 });
    var rejectOut = ui.readout({ label: "Rejected H₀", decimals: 1, format: function (v) { return isFinite(v) ? v.toFixed(1) + " %" : "—"; } });
    var beyondOut = ui.readout({ label: "Past the axis", decimals: 0 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "demo__status demo__note"; note.hidden = true;
    note.textContent = "Cap reached: " + MAX_STUDIES + " studies. Reset to run more.";

    container.appendChild(gapSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- chart 1: this study's three groups ------------------------------ */
    var stripHost = document.createElement("div"); container.appendChild(stripHost);
    var stripHeight = LANE_TOP + LANE * K;
    var stripFrame = ui.chart(stripHost, { aspect: 0.3, minHeight: stripHeight + 50, maxHeight: stripHeight + 50, margin: { top: 8, right: 20, bottom: 40, left: 30 }, ariaLabel: "The three groups of this study, one row each, with their means marked" });
    var sx = d3.scaleLinear().domain([STRIP_MIN, STRIP_MAX]);
    var stripLanes = stripFrame.plot.append("g");
    var stripDots = stripFrame.plot.append("g");
    var stripMeans = stripFrame.plot.append("g");
    var stripNames = stripFrame.plot.append("g");

    /* ---- chart 2: the pile of F values ----------------------------------- */
    var pileHost = document.createElement("div"); container.appendChild(pileHost);
    var pileFrame = ui.chart(pileHost, { aspect: 0.5, minHeight: 250, maxHeight: 340, margin: { top: 26, right: 20, bottom: 44, left: 52 }, ariaLabel: "Histogram of the F values from every study, with the F distribution that the null hypothesis predicts drawn over it" });
    var fx = d3.scaleLinear().domain([0, F_MAX]), fy = d3.scaleLinear().domain([0, Y_MAX]);
    var bars = pileFrame.plot.append("g");
    var tail = pileFrame.plot.append("path").attr("class", "area area--alpha");
    var curve = pileFrame.plot.append("path").attr("class", "line line--overlay");
    var critLine = pileFrame.plot.append("line").attr("class", "line line--reference");
    var critLabel = pileFrame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -12);
    var fMark = pileFrame.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-7,0L7,0L0,-11Z");
    var fLabel = pileFrame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Blue bars: the F values of the studies run so far, scaled to a density. Orange curve: the F distribution the null hypothesis predicts. Dashed line and shaded tail: the top 5 %. Triangle: this study's F.";

    container.appendChild(ui.readoutRow([fOut, dfOut, pOut, critOut]));
    container.appendChild(ui.readoutRow([studiesOut, rejectOut, beyondOut]));
    container.appendChild(status);
    container.appendChild(note);
    container.appendChild(legend);

    function laneY(g) { return LANE_TOP + LANE * g; }
    stripNames.selectAll("text").data([0, 1, 2]).enter().append("text")
      .attr("class", "marker-label").attr("text-anchor", "end").attr("x", -8).attr("dy", "0.32em")
      .attr("y", laneY).text(function (g) { return GROUP_NAMES[g]; });

    stripFrame.onResize(function (f) {
      sx.range([0, f.width]);
      f.xAxis(sx, { label: "value", ticks: 8 });
      var ls = stripLanes.selectAll("line.lane-line").data([0, 1, 2]);
      ls.enter().append("line").attr("class", "lane-line").merge(ls)
        .attr("x1", 0).attr("x2", f.width).attr("y1", laneY).attr("y2", laneY);
      render();
    });
    pileFrame.onResize(function (f) {
      fx.range([0, f.width]); fy.range([f.height, 0]);
      f.yGrid(fy, 5); f.xAxis(fx, { label: "F", ticks: 8 }); f.yAxis(fy, { label: "density", ticks: 5 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function df2() { return K * state.n - K; }
    function critical() { return stats.fQuantile(1 - ALPHA, K - 1, df2()); }
    function oneStudy() {
      var gs = [], g, i;
      for (g = 0; g < K; g++) {
        var vals = [], mu = BASE + g * state.gap;
        for (i = 0; i < state.n; i++) vals.push(stats.sampleNormal(mu, SIGMA));
        gs.push(vals);
      }
      return gs;
    }
    function run(k) {
      var crit = critical(), added = 0;
      while (added < k && state.studies < MAX_STUDIES) {
        var gs = oneStudy(), r = stats.anovaTest(gs);
        state.lastGroups = gs; state.last = r;
        state.fs.push(r.f);
        if (r.f >= crit) state.rejected++;
        state.studies++; added++;
      }
      render();
      return added;
    }
    function restart() { state.studies = 0; state.fs = []; state.rejected = 0; state.last = null; state.lastGroups = []; run(INITIAL); }
    function setGap(g) { state.gap = clamp(g, MIN_GAP, MAX_GAP); restart(); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); restart(); }
    function reset() {
      gapSlider.set(DEFAULT_GAP, true); nSlider.set(DEFAULT_N, true);
      state.gap = DEFAULT_GAP; state.n = DEFAULT_N;
      restart();
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.last) return;
      var d2 = df2(), crit = critical(), r = state.last, atCap = state.studies >= MAX_STUDIES;
      runButton.disabled = atCap; batchButton.disabled = atCap; note.hidden = !atCap;
      fOut.set(r.f); dfOut.set(d2); pOut.set(r.p); critOut.set(crit);
      studiesOut.set(state.studies); rejectOut.set(100 * state.rejected / state.studies);

      var hist = stats.histogram(state.fs, 0, F_MAX, BIN), beyond = state.studies;
      hist.counts.forEach(function (c) { beyond -= c; });
      beyondOut.set(beyond);
      var share = 100 * state.rejected / state.studies, allPast = beyond === state.studies && state.studies > 1;
      status.textContent = allPast
        ? "Every one of the " + state.studies + " studies produced an F past the right edge of the fixed axis, so the histogram is empty here. With the true means " + state.gap.toFixed(2) + " apart and n = " + state.n + ", F is never anywhere near the values H₀ predicts, so this effect is unmissable."
        : state.gap === 0
        ? "H₀ is true, so all three groups come from the same distribution. Any gap you see between the sample means is noise, yet " + share.toFixed(1) + " % of the " + state.studies + " studies so far crossed the critical value. That 5 % is the significance level, not a mistake."
        : "H₀ is false, and the true means really do sit " + state.gap.toFixed(2) + " apart. The pile has slid right of the curve H₀ predicts and " + share.toFixed(1) + " % of the " + state.studies + " studies detected it. Raise n and that share climbs.";

      /* this study's groups */
      var flat = [];
      state.lastGroups.forEach(function (vals, g) { vals.forEach(function (v, i) { flat.push({ g: g, i: i, v: v }); }); });
      var ds = stripDots.selectAll("circle").data(flat);
      ds.exit().remove();
      ds.enter().append("circle").attr("class", "dot--sample").attr("r", DOT_R).merge(ds)
        .style("display", function (d) { return d.v >= STRIP_MIN && d.v <= STRIP_MAX ? null : "none"; })
        .attr("cx", function (d) { return sx(clamp(d.v, STRIP_MIN, STRIP_MAX)); })
        .attr("cy", function (d) { return laneY(d.g) + JITTER[d.i % JITTER.length] * (LANE - 22); });
      var ms = stripMeans.selectAll("path").data(r.groupMeans);
      ms.enter().append("path").attr("class", "mark mark--strong").attr("d", "M-6,0L0,-7L6,0L0,7Z").merge(ms)
        .attr("transform", function (m, g) { return "translate(" + sx(clamp(m, STRIP_MIN, STRIP_MAX)) + "," + laneY(g) + ")"; });

      /* the pile */
      var bs = bars.selectAll("rect").data(hist.counts);
      bs.exit().remove();
      bs.enter().append("rect").attr("class", "bar bar--density").merge(bs)
        .attr("x", function (c, i) { return fx(hist.edges[i]); })
        .attr("width", Math.max(1, fx(BIN) - fx(0) - 1))
        .attr("y", function (c) { return fy(Math.min(Y_MAX, c / (state.studies * BIN))); })
        .attr("height", function (c) { return pileFrame.height - fy(Math.min(Y_MAX, c / (state.studies * BIN))); });

      var pts = [], steps = 160, i;
      for (i = 0; i <= steps; i++) { var xv = F_MAX * i / steps; pts.push([xv, Math.min(Y_MAX, stats.fPdf(xv, K - 1, d2))]); }
      var line = d3.line().x(function (p) { return fx(p[0]); }).y(function (p) { return fy(p[1]); });
      curve.attr("d", line(pts));
      var tailPts = pts.filter(function (p) { return p[0] >= crit; });
      if (tailPts.length) {
        var area = d3.area().x(function (p) { return fx(p[0]); }).y0(pileFrame.height).y1(function (p) { return fy(p[1]); });
        tail.attr("d", area([[crit, stats.fPdf(crit, K - 1, d2)]].concat(tailPts)));
      }
      critLine.attr("x1", fx(crit)).attr("x2", fx(crit)).attr("y1", 0).attr("y2", pileFrame.height);
      critLabel.attr("x", fx(crit)).text("5 % beyond " + crit.toFixed(2));

      var onAxis = isFinite(r.f) && r.f <= F_MAX;
      fMark.style("display", onAxis ? null : "none");
      fLabel.style("display", onAxis ? null : "none");
      if (onAxis) {
        fMark.attr("transform", "translate(" + fx(r.f) + "," + pileFrame.height + ")");
        fLabel.attr("x", fx(r.f)).attr("y", pileFrame.height + 34).text("F = " + r.f.toFixed(2));
      }
    }

    /* ---- initial state (D5): enough studies that the pile is already a shape ---- */
    run(INITIAL);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      run: run,
      setGap: function (g) { gapSlider.set(g, true); setGap(g); },
      setN: function (n) { nSlider.set(n, true); setN(n); },
      reset: reset,
      critical: critical,
      state: function () {
        return { gap: state.gap, n: state.n, studies: state.studies, fs: state.fs.slice(), rejected: state.rejected,
          last: state.last, lastGroups: state.lastGroups.map(function (g) { return g.slice(); }),
          df1: K - 1, df2: df2(), critical: critical() };
      },
      constants: { K: K, SIGMA: SIGMA, BASE: BASE, MIN_GAP: MIN_GAP, MAX_GAP: MAX_GAP, DEFAULT_GAP: DEFAULT_GAP, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, F_MAX: F_MAX, BIN: BIN, Y_MAX: Y_MAX, MAX_STUDIES: MAX_STUDIES, BATCH: BATCH, ALPHA: ALPHA, INITIAL: INITIAL, STRIP_MIN: STRIP_MIN, STRIP_MAX: STRIP_MAX }
    };
  };
})();
