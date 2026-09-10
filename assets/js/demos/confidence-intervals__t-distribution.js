/*
  confidence-intervals__t-distribution.js — SYLLABUS §8.2 "The t distribution".

  Teaches: when σ is unknown we estimate it with s and pay in certainty — the t
  distribution has heavier tails than the normal, and they fade as n grows.

  Public:  demos.initTDistribution(containerEl) → api { setDf(df), newSample(), reset(), state() }
  Uses:    stats.tPdf, stats.tCdf, stats.tQuantile, stats.normalPdf, stats.normalCdf,
           stats.normalQuantile, stats.sampleNormal, stats.mean, stats.sd;  ui.slider, ui.button,
           ui.readout, ui.readoutRow, ui.chart;  d3 scales/line/area.

  Pattern per D-019 / D-024. Top: t density (df from the slider) over the
  standard normal, with the 97.5th percentiles t* and z* marked and the area
  beyond ±2 shaded. Bottom: one sample of n = df + 1 from N(50, 10), with the
  z-interval (σ known) and the t-interval (σ estimated by s) drawn together.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MU = 50, SIGMA = 10;
  var MIN_DF = 1, MAX_DF = 60, DEFAULT_DF = 4;
  var T_MIN = -5, T_MAX = 5, CUT = 2;
  var LEVEL = 0.95;

  window.demos.initTDistribution = function (container) {
    var state = { df: DEFAULT_DF, sample: [] };

    /* ---- controls ---------------------------------------------------- */
    var newButton = ui.button({ label: "New sample", kind: "primary", onClick: newSample });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(newButton); controls.appendChild(resetButton);
    var dfSlider = ui.slider({ label: "Degrees of freedom, df = n − 1", min: MIN_DF, max: MAX_DF, step: 1, value: DEFAULT_DF, onChange: setDf });

    var tStarOut = ui.readout({ label: "t* (97.5th percentile)", decimals: 3, accent: true });
    var zStarOut = ui.readout({ label: "z* (97.5th percentile)", decimals: 3 });
    var tTailOut = ui.readout({ label: "P(|T| > 2)", decimals: 4, accent: true });
    var zTailOut = ui.readout({ label: "P(|Z| > 2)", decimals: 4 });
    var nOut = ui.readout({ label: "n", decimals: 0 });
    var xbarOut = ui.readout({ label: "x̄", decimals: 2 });
    var sOut = ui.readout({ label: "s", decimals: 2 });
    var zWidthOut = ui.readout({ label: "z-interval width (σ known)", decimals: 2 });
    var tWidthOut = ui.readout({ label: "t-interval width (σ from s)", decimals: 2, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");

    container.appendChild(dfSlider.el);

    /* ---- top: t over normal ------------------------------------------------ */
    var curveHost = document.createElement("div"); container.appendChild(curveHost);
    var cf = ui.chart(curveHost, { aspect: 0.45, minHeight: 220, margin: { top: 30 }, ariaLabel: "Student t density over the standard normal; the tails beyond plus and minus two are shaded" });
    var x = d3.scaleLinear().domain([T_MIN, T_MAX]), y = d3.scaleLinear().domain([0, 0.45]);
    var tailShade = cf.plot.append("path").attr("class", "area");
    var normalCurve = cf.plot.append("path").attr("class", "line line--overlay line--dashed");
    var tCurve = cf.plot.append("path").attr("class", "line line--strong");
    var tStarLine = cf.plot.append("line").attr("class", "line line--reference");
    var tStarLabel = cf.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -18);
    var zStarLine = cf.plot.append("line").attr("class", "line line--reference");
    var zStarLabel = cf.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -4);
    var legend1 = document.createElement("p"); legend1.className = "demo__status";
    legend1.textContent = "Blue, solid: t with the chosen df. Orange, dashed: standard normal. Shaded: the t tails beyond ±2. Dashed lines: t* and z*, the values that leave 2.5 % in the upper tail.";

    /* ---- bottom: the two intervals ------------------------------------------ */
    var ivHost = document.createElement("div"); container.appendChild(ivHost);
    var iv = ui.chart(ivHost, { aspect: 0.22, minHeight: 120, maxHeight: 150, margin: { top: 14, bottom: 40 }, ariaLabel: "The z-interval and the t-interval for the same sample, with the true mean marked" });
    var ix = d3.scaleLinear().domain([MU - 3 * SIGMA, MU + 3 * SIGMA]);
    var muLine = iv.plot.append("line").attr("class", "line line--reference");
    var zSeg = iv.plot.append("line").attr("class", "ci-line ci-line--overlay");
    var tSeg = iv.plot.append("line").attr("class", "ci-line");
    var zText = iv.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "end").text("z");
    var tText = iv.plot.append("text").attr("class", "marker-label").attr("text-anchor", "end").text("t");
    var dots = iv.plot.append("g");
    var legend2 = document.createElement("p"); legend2.className = "demo__status";
    legend2.textContent = "One sample of n = df + 1 values (dots). Orange segment: 95 % z-interval using the known σ = 10. Blue segment: 95 % t-interval using the sample's s. Dashed line: μ = 50.";

    container.appendChild(ui.readoutRow([tStarOut, zStarOut, tTailOut, zTailOut]));
    container.appendChild(legend1);
    container.appendChild(controls);
    container.appendChild(ui.readoutRow([nOut, xbarOut, sOut, zWidthOut, tWidthOut]));
    container.appendChild(status);
    container.appendChild(legend2);

    cf.onResize(function (f) { x.range([0, f.width]); y.range([f.height, 0]); f.xAxis(x, { label: "t", ticks: 10 }); f.yGrid(y, 4); f.yAxis(y, { label: "density", ticks: 4 }); render(); });
    iv.onResize(function (f) { ix.range([0, f.width]); f.xAxis(ix, { label: "value", ticks: 6 }); render(); });

    /* ---- updates ------------------------------------------------------------ */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function n() { return state.df + 1; }
    function newSample() { state.sample = []; for (var i = 0; i < n(); i++) state.sample.push(stats.sampleNormal(MU, SIGMA)); render(); }
    function setDf(v) { state.df = clamp(Math.round(v), MIN_DF, MAX_DF); newSample(); }
    function reset() { dfSlider.set(DEFAULT_DF, true); state.df = DEFAULT_DF; newSample(); }
    function intervals() {
      var xbar = stats.mean(state.sample), s = stats.sd(state.sample), nn = state.sample.length;
      var zs = stats.normalQuantile(0.5 + LEVEL / 2), ts = stats.tQuantile(0.5 + LEVEL / 2, state.df);
      return { xbar: xbar, s: s, zStar: zs, tStar: ts, z: [xbar - zs * SIGMA / Math.sqrt(nn), xbar + zs * SIGMA / Math.sqrt(nn)], t: [xbar - ts * s / Math.sqrt(nn), xbar + ts * s / Math.sqrt(nn)] };
    }

    /* ---- render ---------------------------------------------------------------- */
    function render() {
      if (!state.sample.length) return;
      var df = state.df, r = intervals();
      var tTail = 2 * (1 - stats.tCdf(CUT, df)), zTail = 2 * (1 - stats.normalCdf(CUT));
      tStarOut.set(r.tStar); zStarOut.set(r.zStar); tTailOut.set(tTail); zTailOut.set(zTail);
      nOut.set(n()); xbarOut.set(r.xbar); sOut.set(r.s);
      var zw = r.z[1] - r.z[0], tw = r.t[1] - r.t[0];
      zWidthOut.set(zw); tWidthOut.set(tw);
      status.textContent = "With df = " + df + " the t-interval is " + (tw > zw ? ((tw / zw - 1) * 100).toFixed(0) + " % wider" : ((1 - tw / zw) * 100).toFixed(0) + " % narrower") + " than the z-interval for this sample" + (tw > zw ? ", which is the price of not knowing σ. " : ", because this sample's s happened to fall well below σ. ") + "t* = " + r.tStar.toFixed(3) + " against z* = " + r.zStar.toFixed(3) + ".";

      var pts = [], npts = [], tail = [];
      for (var i = 0; i <= 400; i++) {
        var t = T_MIN + (T_MAX - T_MIN) * i / 400;
        pts.push([t, stats.tPdf(t, df)]); npts.push([t, stats.normalPdf(t)]);
        if (Math.abs(t) >= CUT) tail.push([t, stats.tPdf(t, df)]);
      }
      var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
      var area = d3.area().x(function (d) { return x(d[0]); }).y0(function () { return cf.height; }).y1(function (d) { return y(d[1]); });
      tCurve.attr("d", line(pts)); normalCurve.attr("d", line(npts));
      var left = tail.filter(function (d) { return d[0] <= -CUT; }), right = tail.filter(function (d) { return d[0] >= CUT; });
      tailShade.attr("d", area(left) + area(right));
      var tsx = clamp(r.tStar, T_MIN, T_MAX);
      tStarLine.attr("x1", x(tsx)).attr("x2", x(tsx)).attr("y1", 0).attr("y2", cf.height);
      tStarLabel.attr("x", x(tsx)).text("t* = " + r.tStar.toFixed(2));
      zStarLine.attr("x1", x(r.zStar)).attr("x2", x(r.zStar)).attr("y1", 0).attr("y2", cf.height);
      zStarLabel.attr("x", x(r.zStar)).text("z* = 1.96");

      var h = iv.height, zy = h * 0.3, ty = h * 0.7;
      muLine.attr("x1", ix(MU)).attr("x2", ix(MU)).attr("y1", 0).attr("y2", h);
      zSeg.attr("x1", ix(clamp(r.z[0], ix.domain()[0], ix.domain()[1]))).attr("x2", ix(clamp(r.z[1], ix.domain()[0], ix.domain()[1]))).attr("y1", zy).attr("y2", zy);
      tSeg.attr("x1", ix(clamp(r.t[0], ix.domain()[0], ix.domain()[1]))).attr("x2", ix(clamp(r.t[1], ix.domain()[0], ix.domain()[1]))).attr("y1", ty).attr("y2", ty);
      zText.attr("x", -6).attr("y", zy + 4); tText.attr("x", -6).attr("y", ty + 4);
      var ds = dots.selectAll("circle.dot--sample").data(state.sample);
      ds.exit().remove();
      ds.enter().append("circle").attr("class", "dot--sample").attr("r", 3).merge(ds)
        .attr("cx", function (v) { return ix(clamp(v, ix.domain()[0], ix.domain()[1])); }).attr("cy", h - 4);
    }

    /* ---- initial state (D5) --------------------------------------------------- */
    newSample();

    /* ---- api ------------------------------------------------------------------- */
    return {
      el: container,
      setDf: function (v) { dfSlider.set(v, true); setDf(v); },
      newSample: newSample, reset: reset,
      state: function () { var r = intervals(); return { df: state.df, n: n(), sample: state.sample.slice(), xbar: r.xbar, s: r.s, zStar: r.zStar, tStar: r.tStar, zInterval: r.z.slice(), tInterval: r.t.slice(), tTail: 2 * (1 - stats.tCdf(CUT, state.df)), zTail: 2 * (1 - stats.normalCdf(CUT)) }; },
      constants: { MU: MU, SIGMA: SIGMA, MIN_DF: MIN_DF, MAX_DF: MAX_DF, DEFAULT_DF: DEFAULT_DF, CUT: CUT, LEVEL: LEVEL }
    };
  };
})();
