/*
  two-sample-tests__two-means.js — SYLLABUS §10.1 "Comparing two means".

  Teaches: the test statistic asks whether the observed gap between two sample
  means is large relative to its noise. Overlapping populations can still give
  a significant difference; separated ones can fail to with tiny samples.

  Public:  demos.initTwoMeans(containerEl) → api { setMu(group, v), setN(n), sample(k), reset(), state() }
  Uses:    stats.sampleNormal, stats.mean, stats.welchTest, stats.normalPdf, stats.normalCdf;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 scales/line/area/drag.

  Pattern per D-019 / D-024 / D-028. Both populations have σ = 10. Top: the two
  population curves with draggable means and the latest samples as dots.
  Bottom: where the difference of means would land if the populations were
  equal — N(0, σ√(2/n)) — with every observed difference piled underneath.
  The p-value shown comes from Welch's t-test on the actual samples.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var SIGMA = 10, X_MIN = 20, X_MAX = 80;
  var MU = { A: { min: 30, max: 70, value: 48 }, B: { min: 30, max: 70, value: 55 } };
  var MIN_N = 5, MAX_N = 100, DEFAULT_N = 15;
  var D_MIN = -30, D_MAX = 30, BIN = 1;
  var ALPHA = 0.05, INITIAL = 1, MAX_TESTS = 100000;
  var KEY_STEP = 0.5, HANDLE_R = 22;

  window.demos.initTwoMeans = function (container) {
    var nBins = Math.round((D_MAX - D_MIN) / BIN);
    var state = { mu: { A: MU.A.value, B: MU.B.value }, n: DEFAULT_N, samples: { A: [], B: [] }, result: null, tests: 0, small: 0, bins: [], beyond: 0 };

    /* ---- controls ---------------------------------------------------- */
    var sampleButton = ui.button({ label: "Sample both groups", kind: "primary", onClick: function () { sample(1); } });
    var manyButton = ui.button({ label: "Repeat 100 times", onClick: function () { sample(100); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [sampleButton, manyButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var nSlider = ui.slider({ label: "Sample size per group, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var xaOut = ui.readout({ label: "x̄ group A", decimals: 2 });
    var xbOut = ui.readout({ label: "x̄ group B", decimals: 2 });
    var diffOut = ui.readout({ label: "Difference A − B", decimals: 2, accent: true });
    var tOut = ui.readout({ label: "Welch t", decimals: 3 });
    var dfOut = ui.readout({ label: "df", decimals: 1 });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var testsOut = ui.readout({ label: "Tests run", decimals: 0 });
    var shareOut = ui.readout({ label: "Share with p < 0.05", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_TESTS.toLocaleString() + " tests reached. Press Reset to start again.";

    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- top: populations with draggable means -------------------------- */
    var topHost = document.createElement("div"); container.appendChild(topHost);
    var top = ui.chart(topHost, { aspect: 0.4, minHeight: 210, margin: { top: 34, bottom: 44 }, ariaLabel: "Two population curves with draggable means; the latest sample from each group is shown as dots below the axis" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear().domain([0, stats.normalPdf(0, 0, SIGMA) * 1.15]);
    var curveA = top.plot.append("path").attr("class", "line line--strong");
    var curveB = top.plot.append("path").attr("class", "line line--overlay line--dashed");
    var dotsA = top.plot.append("g"), dotsB = top.plot.append("g");
    var laneA = top.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "end").text("A");
    var laneB = top.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "end").text("B");
    var handles = { A: makeHandle("A"), B: makeHandle("B") };
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
    var hint = document.createElement("p"); hint.className = "demo__status";
    hint.textContent = "Solid blue: group A. Dashed orange: group B. Drag a triangle to move that group's mean, or focus it and use the arrow keys. Dots: the latest samples.";

    /* ---- bottom: difference of means under H₀ ---------------------------- */
    var botHost = document.createElement("div"); container.appendChild(botHost);
    var bot = ui.chart(botHost, { aspect: 0.4, minHeight: 210, margin: { top: 22 }, ariaLabel: "Sampling distribution of the difference of means if the two populations were equal, with the observed differences piled underneath and the latest one marked" });
    var dx = d3.scaleLinear().domain([D_MIN, D_MAX]), dy = d3.scaleLinear();
    var bars = bot.plot.append("g");
    var tails = bot.plot.append("path").attr("class", "area area--alpha");
    var h0Curve = bot.plot.append("path").attr("class", "line line--strong");
    var zeroLine = bot.plot.append("line").attr("class", "line line--reference");
    var diffMark = bot.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-7,0L7,0L0,-11Z");
    var diffLabel = bot.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -8);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Curve: where x̄A − x̄B would land if the groups were really equal (σ = 10 known). Bars: the differences observed so far. Shaded: the tails beyond the latest difference. The p-value readout uses Welch's t on the actual samples.";

    container.appendChild(hint);
    container.appendChild(ui.readoutRow([xaOut, xbOut, diffOut, tOut, dfOut, pOut, testsOut, shareOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(note);

    function makeHandle(key) {
      var g = top.plot.append("g").attr("class", "handle draggable").attr("tabindex", 0).attr("role", "slider")
        .attr("aria-valuemin", MU[key].min).attr("aria-valuemax", MU[key].max).attr("aria-valuenow", MU[key].value).attr("aria-label", "Mean of group " + key + ": drag, or use the arrow keys");
      g.append("circle").attr("class", "hit").attr("r", HANDLE_R);
      g.append("line").attr("class", "handle__line");
      g.append("path").attr("class", "mark " + (key === "A" ? "mark--strong" : "mark--hollow")).attr("d", "M-8,0L8,0L0,-12Z");
      g.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -36).text("μ" + key);   // above the sample rows
      g.call(d3.drag().on("drag", function (event) { setMu(key, x.invert(event.x)); }));
      g.on("keydown", function (event) {
        var dv = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowRight" || event.key === "ArrowUp" ? KEY_STEP : 0;
        if (!dv) return; event.preventDefault(); setMu(key, state.mu[key] + dv);
      });
      return g;
    }

    top.onResize(function (f) { x.range([0, f.width]); y.range([f.height, 0]); f.xAxis(x, { label: "value", ticks: 10 }); render(); });
    bot.onResize(function (f) { dx.range([0, f.width]); dy.range([f.height, 0]); f.xAxis(dx, { label: "difference of sample means, x̄A − x̄B", ticks: 10 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function se0() { return SIGMA * Math.sqrt(2 / state.n); }
    function clearRun() { state.tests = 0; state.small = 0; state.beyond = 0; state.result = null; state.bins = []; for (var i = 0; i < nBins; i++) state.bins.push(0); }

    function sample(k) {
      var added = 0;
      while (added < k && state.tests < MAX_TESTS) {
        var a = [], b = [];
        for (var i = 0; i < state.n; i++) { a.push(stats.sampleNormal(state.mu.A, SIGMA)); b.push(stats.sampleNormal(state.mu.B, SIGMA)); }
        state.samples = { A: a, B: b };
        var r = stats.welchTest(a, b);
        state.result = { xa: stats.mean(a), xb: stats.mean(b), t: r.t, df: r.df, p: r.p };
        state.result.diff = state.result.xa - state.result.xb;
        if (state.result.diff < D_MIN || state.result.diff > D_MAX) state.beyond += 1; else state.bins[clamp(Math.floor((state.result.diff - D_MIN) / BIN), 0, nBins - 1)] += 1;
        if (r.p < ALPHA) state.small += 1;
        state.tests += 1; added += 1;
      }
      render();
      return added;
    }
    function setMu(key, v) { state.mu[key] = clamp(Math.round(v * 2) / 2, MU[key].min, MU[key].max); clearRun(); sample(INITIAL); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); clearRun(); sample(INITIAL); }
    function reset() { nSlider.set(DEFAULT_N, true); state.n = DEFAULT_N; state.mu = { A: MU.A.value, B: MU.B.value }; clearRun(); sample(INITIAL); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.result) return;
      var r = state.result, capped = state.tests >= MAX_TESTS, gap = state.mu.A - state.mu.B;
      xaOut.set(r.xa); xbOut.set(r.xb); diffOut.set(r.diff); tOut.set(r.t); dfOut.set(r.df); pOut.set(r.p);
      testsOut.set(state.tests); shareOut.set(state.tests ? state.small / state.tests : NaN);
      sampleButton.disabled = capped; manyButton.disabled = capped; note.hidden = !capped;
      status.textContent = (gap === 0 ? "The populations are identical here, so every p < 0.05 is a false alarm, and the share should settle near 5 %. "
        : "The true gap is " + gap.toFixed(1) + ". ") + (r.p < ALPHA ? "This sample's difference of " + r.diff.toFixed(2) + " is significant at 5 %." : "This sample's difference of " + r.diff.toFixed(2) + " is not significant at 5 %: it could easily be noise with n = " + state.n + ".");

      var pa = [], pb = [];
      for (var i = 0; i <= 300; i++) { var v = X_MIN + (X_MAX - X_MIN) * i / 300; pa.push([v, stats.normalPdf(v, state.mu.A, SIGMA)]); pb.push([v, stats.normalPdf(v, state.mu.B, SIGMA)]); }
      curveA.attr("d", lineGen(pa)); curveB.attr("d", lineGen(pb));
      ["A", "B"].forEach(function (key) {
        var m = state.mu[key];
        handles[key].attr("transform", "translate(" + x(m) + "," + top.height + ")").attr("aria-valuenow", m).attr("aria-valuetext", "mean of group " + key + " " + m.toFixed(1));
        handles[key].select("line.handle__line").attr("x1", 0).attr("x2", 0).attr("y1", -top.height).attr("y2", 0);
      });
      var yA = top.height - 6, yB = top.height - 26;   // sample rows sit just above the axis, far enough apart for their A/B labels not to collide
      laneA.attr("x", -4).attr("y", yA + 4); laneB.attr("x", -4).attr("y", yB + 4);
      var da = dotsA.selectAll("circle").data(state.samples.A);
      da.exit().remove(); da.enter().append("circle").attr("class", "dot--sample").attr("r", 3).merge(da).attr("cx", function (v) { return x(clamp(v, X_MIN, X_MAX)); }).attr("cy", yA);
      var db = dotsB.selectAll("circle").data(state.samples.B);
      db.exit().remove(); db.enter().append("circle").attr("class", "mark--hollow").attr("r", 3).merge(db).attr("cx", function (v) { return x(clamp(v, X_MIN, X_MAX)); }).attr("cy", yB);

      var s0 = se0(), peak = stats.normalPdf(0, 0, SIGMA * Math.sqrt(2 / MAX_N));
      dy.domain([0, peak * 1.1]);
      bot.yGrid(dy, 4); bot.yAxis(dy, { label: "density", ticks: 4 });
      var pts = [], tl = [], tr = [], ad = Math.abs(r.diff);
      for (i = 0; i <= 400; i++) { v = D_MIN + (D_MAX - D_MIN) * i / 400; var dens = stats.normalPdf(v, 0, s0); pts.push([v, dens]); if (v <= -ad) tl.push([v, dens]); if (v >= ad) tr.push([v, dens]); }
      if (ad < D_MAX) { tl.push([-ad, stats.normalPdf(-ad, 0, s0)]); tr.unshift([ad, stats.normalPdf(ad, 0, s0)]); }
      var dline = d3.line().x(function (d) { return dx(d[0]); }).y(function (d) { return dy(Math.min(dy.domain()[1], d[1])); });
      var darea = d3.area().x(function (d) { return dx(d[0]); }).y0(function () { return bot.height; }).y1(function (d) { return dy(Math.min(dy.domain()[1], d[1])); });
      h0Curve.attr("d", dline(pts));
      tails.attr("d", (tl.length > 1 ? darea(tl) : "") + (tr.length > 1 ? darea(tr) : ""));
      zeroLine.attr("x1", dx(0)).attr("x2", dx(0)).attr("y1", 0).attr("y2", bot.height);
      var count = state.tests, w = Math.max(1, dx(D_MIN + BIN) - dx(D_MIN) - 0.5);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar bar--density").merge(sel)
        .attr("x", function (c, j) { return dx(D_MIN + j * BIN) + 0.25; }).attr("width", w)
        .attr("y", function (c) { return dy(Math.min(dy.domain()[1], count ? c / (count * BIN) : 0)); })
        .attr("height", function (c) { return bot.height - dy(Math.min(dy.domain()[1], count ? c / (count * BIN) : 0)); });
      var dc = clamp(r.diff, D_MIN, D_MAX);
      diffMark.attr("transform", "translate(" + dx(dc) + "," + bot.height + ")");
      diffLabel.attr("x", dx(dc)).text("x̄A − x̄B = " + r.diff.toFixed(2));
    }

    /* ---- initial state (D5) ------------------------------------------- */
    clearRun();
    sample(INITIAL);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setMu: setMu,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      sample: sample, reset: reset,
      state: function () { var r = state.result || {}; return { mu: Object.assign({}, state.mu), n: state.n, sampleA: state.samples.A.slice(), sampleB: state.samples.B.slice(), xa: r.xa, xb: r.xb, diff: r.diff, t: r.t, df: r.df, p: r.p, tests: state.tests, small: state.small, bins: state.bins.slice(), beyond: state.beyond, se0: se0() }; },
      constants: { SIGMA: SIGMA, MU: JSON.parse(JSON.stringify(MU)), MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, ALPHA: ALPHA, INITIAL: INITIAL, MAX_TESTS: MAX_TESTS, D_MIN: D_MIN, D_MAX: D_MAX, KEY_STEP: KEY_STEP }
    };
  };
})();
