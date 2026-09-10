/*
  two-sample-tests__two-proportions.js — SYLLABUS §10.2 "Comparing two proportions".

  Teaches: the same logic works for counts — a difference of two proportions is
  judged against its own noise, and small real differences become detectable
  as the sample size grows.

  Public:  demos.initTwoProportions(containerEl) → api { setP(group, v), setN(n), run(k), reset(), state() }
  Uses:    stats.sampleBinomial, stats.twoProportionTest;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 scales.

  Pattern per D-019 / D-028. Scenario: two versions of a sign-up page; p is the
  share of visitors who sign up. Left: this run's two conversion rates as bars
  with the true rates as dashed lines. Right: the pile of p-values from every
  run, so power is visible as the share left of 0.05.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var P = { A: { value: 0.10 }, B: { value: 0.13 } }, MIN_P = 0.05, MAX_P = 0.95;
  var MIN_N = 20, MAX_N = 2000, STEP_N = 20, DEFAULT_N = 200;
  var ALPHA = 0.05, P_BINS = 20, INITIAL = 1, MAX_TESTS = 100000;

  window.demos.initTwoProportions = function (container) {
    var state = { p: { A: P.A.value, B: P.B.value }, n: DEFAULT_N, result: null, tests: 0, small: 0, bins: [] };

    /* ---- controls ---------------------------------------------------- */
    var runButton = ui.button({ label: "Run the test", kind: "primary", onClick: function () { run(1); } });
    var manyButton = ui.button({ label: "Repeat 100 times", onClick: function () { run(100); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [runButton, manyButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var pASlider = ui.slider({ label: "True sign-up rate, version A", min: MIN_P, max: MAX_P, step: 0.01, value: P.A.value, onChange: function (v) { setP("A", v); } });
    var pBSlider = ui.slider({ label: "True sign-up rate, version B", min: MIN_P, max: MAX_P, step: 0.01, value: P.B.value, onChange: function (v) { setP("B", v); } });
    var nSlider = ui.slider({ label: "Visitors per version, n", min: MIN_N, max: MAX_N, step: STEP_N, value: DEFAULT_N, onChange: setN });

    var aOut = ui.readout({ label: "Version A: x/n", format: function (v) { return v ? v.x + "/" + v.n + " = " + (v.x / v.n).toFixed(3) : "—"; } });
    var bOut = ui.readout({ label: "Version B: x/n", format: function (v) { return v ? v.x + "/" + v.n + " = " + (v.x / v.n).toFixed(3) : "—"; } });
    var diffOut = ui.readout({ label: "p̂A − p̂B", decimals: 3, accent: true });
    var zOut = ui.readout({ label: "z", decimals: 3 });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var testsOut = ui.readout({ label: "Tests run", decimals: 0 });
    var shareOut = ui.readout({ label: "Share with p < 0.05", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_TESTS.toLocaleString() + " tests reached. Press Reset to start again.";

    container.appendChild(pASlider.el);
    container.appendChild(pBSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- left: the two rates as bars --------------------------------------- */
    var row = document.createElement("div"); row.className = "chart-pair"; container.appendChild(row);
    var barHost = document.createElement("div"); barHost.className = "chart-pair__item"; row.appendChild(barHost);
    var histHost = document.createElement("div"); histHost.className = "chart-pair__item"; row.appendChild(histHost);
    var bc = ui.chart(barHost, { aspect: 0.8, minHeight: 220, margin: { top: 28, left: 52 }, ariaLabel: "This run's sign-up rate for each version as a bar, with the true rate as a dashed line" });
    var bx = d3.scaleLinear().domain([0, 2]), by = d3.scaleLinear();
    var barsA = bc.plot.append("rect").attr("class", "bar bar--empirical");
    var barsB = bc.plot.append("rect").attr("class", "bar bar--theory");
    var trueA = bc.plot.append("line").attr("class", "line line--reference"), trueB = bc.plot.append("line").attr("class", "line line--reference");
    var labA = bc.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle"), labB = bc.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle");
    var bcTitle = bc.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -10).text("This run: sign-up rates");

    /* ---- right: p-value pile ---------------------------------------------- */
    var hc = ui.chart(histHost, { aspect: 0.8, minHeight: 220, margin: { top: 28 }, ariaLabel: "Histogram of the p-values from every run so far, with 0.05 marked" });
    var px = d3.scaleLinear().domain([0, 1]), py = d3.scaleLinear();
    var bars = hc.plot.append("g");
    var alphaLine = hc.plot.append("line").attr("class", "line line--reference");
    var alphaLabel = hc.plot.append("text").attr("class", "marker-label marker-label--soft").attr("y", -8).text("0.05");
    var hcTitle = hc.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "end").attr("y", -10).text("All runs: p-values");   // right-aligned: 0.05 sits at the left of this axis
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Left: dark bar = version A, light bar = version B. Dashed lines are the true rates the test never sees. Right: every p-value so far, where the share left of 0.05 is how often this test detects the difference.";

    container.appendChild(ui.readoutRow([aOut, bOut, diffOut, zOut, pOut, testsOut, shareOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(note);

    bc.onResize(function (f) { bx.range([0, f.width]); by.range([f.height, 0]); render(); });
    hc.onResize(function (f) { px.range([0, f.width]); py.range([f.height, 0]); f.xAxis(px, { label: "p-value", ticks: 5 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function clearRun() { state.tests = 0; state.small = 0; state.result = null; state.bins = []; for (var i = 0; i < P_BINS; i++) state.bins.push(0); }
    function run(k) {
      var added = 0;
      while (added < k && state.tests < MAX_TESTS) {
        var xa = stats.sampleBinomial(state.n, state.p.A), xb = stats.sampleBinomial(state.n, state.p.B);
        var r = stats.twoProportionTest(xa, state.n, xb, state.n);
        state.result = { xa: xa, xb: xb, z: r.z, p: r.p, diff: r.diff };
        state.bins[clamp(Math.floor(r.p * P_BINS), 0, P_BINS - 1)] += 1;
        if (r.p < ALPHA) state.small += 1;
        state.tests += 1; added += 1;
      }
      render();
      return added;
    }
    function setP(key, v) { state.p[key] = clamp(Math.round(v * 100) / 100, MIN_P, MAX_P); clearRun(); run(INITIAL); }
    function setN(n) { state.n = clamp(Math.round(n / STEP_N) * STEP_N, MIN_N, MAX_N); clearRun(); run(INITIAL); }
    function reset() { pASlider.set(P.A.value, true); pBSlider.set(P.B.value, true); nSlider.set(DEFAULT_N, true); state.p = { A: P.A.value, B: P.B.value }; state.n = DEFAULT_N; clearRun(); run(INITIAL); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.result) return;
      var r = state.result, capped = state.tests >= MAX_TESTS, same = state.p.A === state.p.B;
      aOut.set({ x: r.xa, n: state.n }); bOut.set({ x: r.xb, n: state.n }); diffOut.set(r.diff); zOut.set(r.z); pOut.set(r.p);
      testsOut.set(state.tests); shareOut.set(state.tests ? state.small / state.tests : NaN);
      runButton.disabled = capped; manyButton.disabled = capped; note.hidden = !capped;
      status.textContent = same ? "The two versions are identical here, so p < 0.05 is a false alarm about 5 % of the time."
        : "A real gap of " + ((state.p.B - state.p.A) * 100).toFixed(0) + " points with n = " + state.n + " per version is detected in the share of runs shown at right. Raise n and watch it climb, which is what a bigger experiment buys.";

      var top = Math.max(0.2, Math.ceil(Math.max(state.p.A, state.p.B, r.xa / state.n, r.xb / state.n) * 10 + 1) / 10);
      by.domain([0, Math.min(1, top)]);
      bc.yGrid(by, 4); bc.yAxis(by, { label: "sign-up rate", ticks: 4, format: d3.format(".0%") });
      var w = bx(0.6) - bx(0);
      barsA.attr("x", bx(0.2)).attr("width", w).attr("y", by(r.xa / state.n)).attr("height", bc.height - by(r.xa / state.n));
      barsB.attr("x", bx(1.2)).attr("width", w).attr("y", by(r.xb / state.n)).attr("height", bc.height - by(r.xb / state.n));
      trueA.attr("x1", bx(0.1)).attr("x2", bx(0.9)).attr("y1", by(state.p.A)).attr("y2", by(state.p.A));
      trueB.attr("x1", bx(1.1)).attr("x2", bx(1.9)).attr("y1", by(state.p.B)).attr("y2", by(state.p.B));
      labA.attr("x", bx(0.5)).attr("y", bc.height + 18).text("A"); labB.attr("x", bx(1.5)).attr("y", bc.height + 18).text("B");

      var count = state.tests || 1;
      py.domain([0, Math.max(0.15, Math.ceil(Math.max.apply(null, state.bins) / count * 20) / 20)]);
      hc.yGrid(py, 4); hc.yAxis(py, { label: "share of runs", ticks: 4 });
      var bw = Math.max(1, px(1 / P_BINS) - px(0) - 1);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar").merge(sel)
        .attr("x", function (c, j) { return px(j / P_BINS) + 0.5; }).attr("width", bw)
        .attr("y", function (c) { return py(c / count); }).attr("height", function (c) { return hc.height - py(c / count); });
      alphaLine.attr("x1", px(ALPHA)).attr("x2", px(ALPHA)).attr("y1", 0).attr("y2", hc.height);
      alphaLabel.attr("x", px(ALPHA) + 4);
      hcTitle.attr("x", hc.width);
    }

    /* ---- initial state (D5) ------------------------------------------- */
    clearRun();
    run(INITIAL);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setP: function (key, v) { (key === "A" ? pASlider : pBSlider).set(v, true); setP(key, v); },
      setN: function (n) { nSlider.set(n, true); setN(n); },
      run: run, reset: reset,
      state: function () { var r = state.result || {}; return { p: Object.assign({}, state.p), n: state.n, xa: r.xa, xb: r.xb, diff: r.diff, z: r.z, pValue: r.p, tests: state.tests, small: state.small, bins: state.bins.slice() }; },
      constants: { P: JSON.parse(JSON.stringify(P)), MIN_P: MIN_P, MAX_P: MAX_P, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, ALPHA: ALPHA, P_BINS: P_BINS, INITIAL: INITIAL, MAX_TESTS: MAX_TESTS }
    };
  };
})();
