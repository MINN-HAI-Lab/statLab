/*
  chi-square__goodness-of-fit.js — SYLLABUS §11.1 "Goodness of fit".

  Teaches: χ² measures the total mismatch between observed and expected counts,
  one (O − E)²/E contribution per category; repeated under a true claim the
  statistic follows the χ² distribution with k − 1 degrees of freedom.

  Public:  demos.initGoodnessOfFit(containerEl) → api { setClaim(face, w), setN(n), roll(k), reset(), state() }
  Uses:    stats.randomInt, stats.chiSquareGof, stats.chiSquarePdf, stats.chiSquareCdf,
           stats.chiSquareQuantile;  ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;
           d3 scales/line/area.

  Pattern per D-019 / D-023 / D-030. The die actually rolled is fair; the
  CLAIM is what the sliders set. When the claim is fair, H₀ is true and the
  pile of χ² values follows χ²(5); a wrong claim pushes the pile right.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var FACES = [1, 2, 3, 4, 5, 6];
  var DEFAULT_WEIGHTS = [1, 1, 1, 1, 1, 1], MIN_W = 1, MAX_W = 10;
  var MIN_N = 30, MAX_N = 600, STEP_N = 30, DEFAULT_N = 120;
  var X_MAX = 25, BIN = 0.5, ALPHA = 0.05, INITIAL = 1, MAX_TESTS = 100000;

  window.demos.initGoodnessOfFit = function (container) {
    var nBins = Math.round(X_MAX / BIN);
    var state = { weights: DEFAULT_WEIGHTS.slice(), probs: [], n: DEFAULT_N, observed: [], result: null, tests: 0, small: 0, bins: [], beyond: 0 };

    /* ---- controls ---------------------------------------------------- */
    var rollButton = ui.button({ label: "Roll " + DEFAULT_N + " times and test", kind: "primary", onClick: function () { roll(1); } });
    var manyButton = ui.button({ label: "Repeat 100 times", onClick: function () { roll(100); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [rollButton, manyButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var weightSliders = FACES.map(function (f, i) { return ui.slider({ label: "Claimed weight of face " + f, min: MIN_W, max: MAX_W, step: 1, value: DEFAULT_WEIGHTS[i], onChange: function (v) { setClaim(i, v); } }); });
    var weightsBox = document.createElement("div"); weightsBox.className = "weights";
    weightSliders.forEach(function (s) { weightsBox.appendChild(s.el); });
    var nSlider = ui.slider({ label: "Rolls per test, n", min: MIN_N, max: MAX_N, step: STEP_N, value: DEFAULT_N, onChange: setN });

    var chiOut = ui.readout({ label: "χ²", decimals: 3, accent: true });
    var dfOut = ui.readout({ label: "df", decimals: 0 });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var critOut = ui.readout({ label: "Critical χ² at 5 %", decimals: 3 });
    var testsOut = ui.readout({ label: "Tests run", decimals: 0 });
    var shareOut = ui.readout({ label: "Share with p < 0.05", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_TESTS.toLocaleString() + " tests reached. Press Reset to start again.";

    var table = document.createElement("table"); table.className = "ui-table";
    table.innerHTML = "<caption>Latest test: observed vs expected</caption><thead><tr><th scope=\"col\">Face</th><th scope=\"col\">Claimed P</th><th scope=\"col\">Expected E</th><th scope=\"col\">Observed O</th><th scope=\"col\">(O − E)²/E</th></tr></thead><tbody>" +
      FACES.map(function (f, i) { return "<tr><th scope=\"row\">" + f + "</th><td data-p=\"" + i + "\"></td><td data-e=\"" + i + "\"></td><td data-o=\"" + i + "\"></td><td data-c=\"" + i + "\"></td></tr>"; }).join("") +
      "<tr><th scope=\"row\">Sum</th><td>1.000</td><td data-esum></td><td data-osum></td><td data-chi></td></tr></tbody>";

    container.appendChild(weightsBox);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- chart 1: observed vs expected counts ----------------------------- */
    var barHost = document.createElement("div"); container.appendChild(barHost);
    var bc = ui.chart(barHost, { aspect: 0.36, minHeight: 190, margin: { top: 22 }, ariaLabel: "Observed count of each face (dark bars) beside the count the claim expects (light bars)" });
    var bx = d3.scaleLinear().domain([0.5, 6.5]), by = d3.scaleLinear();
    var expBars = bc.plot.append("g"), obsBars = bc.plot.append("g");
    var bcTitle = bc.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -8).text("Expected (light) vs observed (dark)");

    /* ---- chart 2: χ² pile under χ²(5) ------------------------------------- */
    var histHost = document.createElement("div"); container.appendChild(histHost);
    var hc = ui.chart(histHost, { aspect: 0.4, minHeight: 210, margin: { top: 40 }, ariaLabel: "The chi-square distribution with five degrees of freedom, with every chi-square statistic so far piled underneath and the latest one marked" });
    var hx = d3.scaleLinear().domain([0, X_MAX]), hy = d3.scaleLinear();
    var bars = hc.plot.append("g");
    var tail = hc.plot.append("path").attr("class", "area area--alpha");
    var curve = hc.plot.append("path").attr("class", "line line--overlay");
    var critLine = hc.plot.append("line").attr("class", "line line--reference");
    var critLabel = hc.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -24);
    var chiMark = hc.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-7,0L7,0L0,-11Z");
    var chiLabel = hc.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -8);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Orange curve: χ² with 5 degrees of freedom, where the statistic lands when the claim is true. Bars: every χ² so far. Shaded: the tail beyond the latest χ², which is its p-value. Dashed: the 5 % critical value.";

    container.appendChild(ui.readoutRow([chiOut, dfOut, pOut, critOut, testsOut, shareOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(table);
    container.appendChild(note);

    bc.onResize(function (f) { bx.range([0, f.width]); by.range([f.height, 0]); f.xAxis(bx, { label: "face", ticks: 6, format: d3.format("d") }); render(); });
    hc.onResize(function (f) { hx.range([0, f.width]); hy.range([f.height, 0]); f.xAxis(hx, { label: "χ² statistic", ticks: 10 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function normalise() { var total = state.weights.reduce(function (s, w) { return s + w; }, 0); state.probs = state.weights.map(function (w) { return w / total; }); }
    function clearRun() { state.tests = 0; state.small = 0; state.beyond = 0; state.result = null; state.bins = []; for (var i = 0; i < nBins; i++) state.bins.push(0); }

    function roll(k) {
      var added = 0;
      while (added < k && state.tests < MAX_TESTS) {
        var counts = [0, 0, 0, 0, 0, 0];
        for (var i = 0; i < state.n; i++) counts[stats.randomInt(1, 6) - 1] += 1;   // the real die is fair
        state.observed = counts;
        var r = stats.chiSquareGof(counts, state.probs);
        state.result = r;
        if (r.chi2 > X_MAX) state.beyond += 1; else state.bins[clamp(Math.floor(r.chi2 / BIN), 0, nBins - 1)] += 1;
        if (r.p < ALPHA) state.small += 1;
        state.tests += 1; added += 1;
      }
      render();
      return added;
    }
    function setClaim(i, w) { state.weights[i] = clamp(Math.round(w), MIN_W, MAX_W); normalise(); clearRun(); roll(INITIAL); }
    function setN(n) { state.n = clamp(Math.round(n / STEP_N) * STEP_N, MIN_N, MAX_N); rollButton.textContent = "Roll " + state.n + " times and test"; clearRun(); roll(INITIAL); }
    function reset() { state.weights = DEFAULT_WEIGHTS.slice(); weightSliders.forEach(function (s, i) { s.set(DEFAULT_WEIGHTS[i], true); }); nSlider.set(DEFAULT_N, true); state.n = DEFAULT_N; rollButton.textContent = "Roll " + DEFAULT_N + " times and test"; normalise(); clearRun(); roll(INITIAL); }
    function claimIsFair() { return state.probs.every(function (p) { return Math.abs(p - 1 / 6) < 1e-12; }); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.result) return;
      var r = state.result, capped = state.tests >= MAX_TESTS, crit = stats.chiSquareQuantile(1 - ALPHA, r.df);
      chiOut.set(r.chi2); dfOut.set(r.df); pOut.set(r.p); critOut.set(crit); testsOut.set(state.tests); shareOut.set(state.tests ? state.small / state.tests : NaN);
      rollButton.disabled = capped; manyButton.disabled = capped; note.hidden = !capped;
      var lowE = r.expected.some(function (e) { return e < 5; });
      status.textContent = (claimIsFair() ? "The claim is a fair die, and the die really is fair, so H₀ is true and p < 0.05 happens about 5 % of the time. "
        : "The claim is not a fair die, but the die really is fair, so H₀ is false. With n = " + state.n + " the test rejects it in the share of runs shown. ")
        + (lowE ? "Warning: an expected count is below 5, so the χ² approximation is shaky here." : "");
      FACES.forEach(function (f, i) {
        table.querySelector("[data-p=\"" + i + "\"]").textContent = ui.formatNumber(state.probs[i], 3);
        table.querySelector("[data-e=\"" + i + "\"]").textContent = ui.formatNumber(r.expected[i], 1);
        table.querySelector("[data-o=\"" + i + "\"]").textContent = state.observed[i];
        table.querySelector("[data-c=\"" + i + "\"]").textContent = ui.formatNumber(r.contributions[i], 2);
      });
      table.querySelector("[data-esum]").textContent = ui.formatNumber(state.n, 1);
      table.querySelector("[data-osum]").textContent = state.n;
      table.querySelector("[data-chi]").textContent = ui.formatNumber(r.chi2, 2);

      var top = Math.max.apply(null, r.expected.concat(state.observed)) * 1.15;
      by.domain([0, Math.ceil(top / 10) * 10]);
      bc.yGrid(by, 4); bc.yAxis(by, { label: "count", ticks: 4 });
      var half = (bx(1) - bx(0)) * 0.42;
      var e = expBars.selectAll("rect").data(r.expected);
      e.enter().append("rect").attr("class", "bar bar--theory").merge(e).attr("x", function (d, i) { return bx(FACES[i]) - half; }).attr("width", half).attr("y", function (d) { return by(d); }).attr("height", function (d) { return bc.height - by(d); });
      var o = obsBars.selectAll("rect").data(state.observed);
      o.enter().append("rect").attr("class", "bar bar--empirical").merge(o).attr("x", function (d, i) { return bx(FACES[i]); }).attr("width", half).attr("y", function (d) { return by(d); }).attr("height", function (d) { return bc.height - by(d); });

      hy.domain([0, 0.2]);
      hc.yGrid(hy, 4); hc.yAxis(hy, { label: "density", ticks: 4 });
      var pts = [], tl = [];
      for (var i = 0; i <= 400; i++) { var v = X_MAX * i / 400, dens = Math.min(0.2, stats.chiSquarePdf(v, r.df)); pts.push([v, dens]); if (v >= r.chi2) tl.push([v, dens]); }
      if (r.chi2 < X_MAX) tl.unshift([r.chi2, Math.min(0.2, stats.chiSquarePdf(r.chi2, r.df))]);
      var line = d3.line().x(function (d) { return hx(d[0]); }).y(function (d) { return hy(d[1]); });
      var area = d3.area().x(function (d) { return hx(d[0]); }).y0(function () { return hc.height; }).y1(function (d) { return hy(d[1]); });
      curve.attr("d", line(pts)); tail.attr("d", tl.length > 1 ? area(tl) : null);
      var count = state.tests, w = Math.max(1, hx(BIN) - hx(0) - 0.5);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar bar--density").merge(sel)
        .attr("x", function (c, j) { return hx(j * BIN) + 0.25; }).attr("width", w)
        .attr("y", function (c) { return hy(Math.min(0.2, count ? c / (count * BIN) : 0)); }).attr("height", function (c) { return hc.height - hy(Math.min(0.2, count ? c / (count * BIN) : 0)); });
      critLine.attr("x1", hx(crit)).attr("x2", hx(crit)).attr("y1", 0).attr("y2", hc.height);
      critLabel.attr("x", hx(crit)).text("5 % critical value " + crit.toFixed(2));
      var cx = clamp(r.chi2, 0, X_MAX);
      chiMark.attr("transform", "translate(" + hx(cx) + "," + hc.height + ")");
      chiLabel.attr("x", hx(cx)).attr("y", -8).text("χ² = " + r.chi2.toFixed(2) + (r.chi2 > X_MAX ? " (off the axis)" : ""));
    }

    /* ---- initial state (D5) ------------------------------------------- */
    normalise(); clearRun(); roll(INITIAL);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setClaim: function (i, w) { weightSliders[i].set(w, true); setClaim(i, w); },
      setN: function (n) { nSlider.set(n, true); setN(n); },
      roll: roll, reset: reset,
      state: function () { var r = state.result || {}; return { weights: state.weights.slice(), probs: state.probs.slice(), n: state.n, observed: state.observed.slice(), expected: (r.expected || []).slice(), contributions: (r.contributions || []).slice(), chi2: r.chi2, df: r.df, p: r.p, tests: state.tests, small: state.small, bins: state.bins.slice(), beyond: state.beyond }; },
      constants: { FACES: FACES.slice(), DEFAULT_WEIGHTS: DEFAULT_WEIGHTS.slice(), MIN_W: MIN_W, MAX_W: MAX_W, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, X_MAX: X_MAX, BIN: BIN, ALPHA: ALPHA, INITIAL: INITIAL, MAX_TESTS: MAX_TESTS }
    };
  };
})();
