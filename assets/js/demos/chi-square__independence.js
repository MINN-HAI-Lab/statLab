/*
  chi-square__independence.js — SYLLABUS §11.2 "Test of independence".

  Teaches: independence means the table's rows tell the same story; χ² measures
  how far the observed cells sit from the counts independence would expect.

  Data model (D-005): cell probabilities are a linear interpolation between the
  exact independence table (the outer product of the margins) and a fixed target
  associated table with the SAME margins, so every slider position is a valid
  table and only the association changes.

  Public:  demos.initIndependence(containerEl) → api { setAssociation(s), setN(n), sample(k), reset(), state() }
  Uses:    stats.sampleDiscrete, stats.chiSquareIndependence, stats.chiSquarePdf, stats.chiSquareQuantile;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 scales/line/area.

  Pattern per D-019 / D-030. Rows: exercises regularly or not. Columns: sleep
  quality. Top: each row as a stacked bar of its column shares (identical rows
  = independence). Bottom: χ²(2) with the pile of statistics so far.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var ROWS = ["Exercises", "No exercise"], COLS = ["Poor sleep", "Fair sleep", "Good sleep"];
  var ROW_P = [0.5, 0.5], COL_P = [0.3, 0.45, 0.25];
  var P_ASSOC = [[0.05, 0.20, 0.25], [0.25, 0.25, 0.00]];   // same margins as P_INDEP (D-005)
  var MIN_S = 0, MAX_S = 1, DEFAULT_S = 0;
  var MIN_N = 30, MAX_N = 1000, STEP_N = 10, DEFAULT_N = 200;
  var X_MAX = 20, BIN = 0.4, ALPHA = 0.05, INITIAL = 1, MAX_TESTS = 100000;

  window.demos.initIndependence = function (container) {
    var nBins = Math.round(X_MAX / BIN);
    var CELLS = [];
    for (var i = 0; i < 2; i++) for (var j = 0; j < 3; j++) CELLS.push([i, j]);
    var state = { s: DEFAULT_S, n: DEFAULT_N, table: [[0, 0, 0], [0, 0, 0]], result: null, tests: 0, small: 0, bins: [], beyond: 0 };

    /* ---- controls ---------------------------------------------------- */
    var sampleButton = ui.button({ label: "Survey " + DEFAULT_N + " people", kind: "primary", onClick: function () { sample(1); } });
    var manyButton = ui.button({ label: "Repeat 100 times", onClick: function () { sample(100); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [sampleButton, manyButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var sSlider = ui.slider({ label: "Association strength (0 = independent)", min: MIN_S, max: MAX_S, step: 0.05, value: DEFAULT_S, decimals: 2, onChange: setAssociation });
    var nSlider = ui.slider({ label: "People surveyed, n", min: MIN_N, max: MAX_N, step: STEP_N, value: DEFAULT_N, onChange: setN });

    var chiOut = ui.readout({ label: "χ²", decimals: 3, accent: true });
    var dfOut = ui.readout({ label: "df = (r − 1)(c − 1)", decimals: 0 });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var critOut = ui.readout({ label: "Critical χ² at 5 %", decimals: 3 });
    var testsOut = ui.readout({ label: "Surveys run", decimals: 0 });
    var shareOut = ui.readout({ label: "Share with p < 0.05", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_TESTS.toLocaleString() + " surveys reached. Press Reset to start again.";

    var table = document.createElement("table"); table.className = "ui-table";
    table.innerHTML = "<caption>Latest survey: observed count, with the count independence expects in brackets</caption><thead><tr><th scope=\"col\"></th>" + COLS.map(function (c) { return "<th scope=\"col\">" + c + "</th>"; }).join("") + "<th scope=\"col\">Total</th></tr></thead><tbody>" +
      ROWS.map(function (rname, ri) { return "<tr><th scope=\"row\">" + rname + "</th>" + COLS.map(function (c, ci) { return "<td data-cell=\"" + ri + "-" + ci + "\"></td>"; }).join("") + "<td data-row=\"" + ri + "\"></td></tr>"; }).join("") +
      "<tr><th scope=\"row\">Total</th>" + COLS.map(function (c, ci) { return "<td data-col=\"" + ci + "\"></td>"; }).join("") + "<td data-n></td></tr></tbody>";

    container.appendChild(sSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- chart 1: row profiles as stacked bars ---------------------------- */
    var rowHost = document.createElement("div"); container.appendChild(rowHost);
    var rc = ui.chart(rowHost, { aspect: 0.3, minHeight: 150, maxHeight: 190, margin: { top: 22, left: 96, bottom: 36 }, ariaLabel: "For each row, the share of people in each sleep column as a stacked bar; identical bars mean independence" });
    var rx = d3.scaleLinear().domain([0, 1]);
    var segs = rc.plot.append("g");
    var rowLabels = rc.plot.selectAll("text.row-label").data(ROWS).enter().append("text").attr("class", "marker-label row-label").attr("text-anchor", "end").attr("x", -8).attr("dy", "0.35em").text(function (d) { return d; });
    var segLabels = rc.plot.append("g");
    var rcTitle = rc.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -8).text("Sleep shares by row");

    /* ---- chart 2: χ² pile --------------------------------------------------- */
    var histHost = document.createElement("div"); container.appendChild(histHost);
    var hc = ui.chart(histHost, { aspect: 0.38, minHeight: 200, margin: { top: 40 }, ariaLabel: "The chi-square distribution with two degrees of freedom, with every statistic so far piled underneath and the latest one marked" });
    var hx = d3.scaleLinear().domain([0, X_MAX]), hy = d3.scaleLinear();
    var bars = hc.plot.append("g");
    var tail = hc.plot.append("path").attr("class", "area area--alpha");
    var curve = hc.plot.append("path").attr("class", "line line--overlay");
    var critLine = hc.plot.append("line").attr("class", "line line--reference");
    var critLabel = hc.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -24);
    var chiMark = hc.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-7,0L7,0L0,-11Z");
    var chiLabel = hc.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Top: if sleep is independent of exercise, both rows split the same way, and association makes the rows differ. Bottom: the orange curve is χ²(2), the bars are every χ² so far, the shaded area is the tail beyond the latest χ² and equals its p-value, and the dashed line is the 5 % critical value.";

    container.appendChild(ui.readoutRow([chiOut, dfOut, pOut, critOut, testsOut, shareOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(table);
    container.appendChild(note);

    rc.onResize(function (f) { rx.range([0, f.width]); f.xAxis(rx, { label: "share of the row", ticks: 5, format: d3.format(".0%") }); render(); });
    hc.onResize(function (f) { hx.range([0, f.width]); hy.range([f.height, 0]); f.xAxis(hx, { label: "χ² statistic", ticks: 10 }); render(); });

    /* ---- the D-005 cell probabilities ---------------------------------------- */
    function cellProbs(s) {
      var out = [];
      CELLS.forEach(function (c) { var indep = ROW_P[c[0]] * COL_P[c[1]]; out.push((1 - s) * indep + s * P_ASSOC[c[0]][c[1]]); });
      return out;
    }

    /* ---- updates --------------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function clearRun() { state.tests = 0; state.small = 0; state.beyond = 0; state.result = null; state.bins = []; for (var i = 0; i < nBins; i++) state.bins.push(0); }
    function sample(k) {
      var probs = cellProbs(state.s), idx = CELLS.map(function (c, i) { return i; }), added = 0;
      while (added < k && state.tests < MAX_TESTS) {
        var t = [[0, 0, 0], [0, 0, 0]];
        for (var i = 0; i < state.n; i++) { var c = CELLS[stats.sampleDiscrete(idx, probs)]; t[c[0]][c[1]] += 1; }
        state.table = t;
        var r = stats.chiSquareIndependence(t);
        state.result = r;
        if (r.chi2 > X_MAX) state.beyond += 1; else state.bins[clamp(Math.floor(r.chi2 / BIN), 0, nBins - 1)] += 1;
        if (r.p < ALPHA) state.small += 1;
        state.tests += 1; added += 1;
      }
      render();
      return added;
    }
    function setAssociation(s) { state.s = clamp(Math.round(s * 20) / 20, MIN_S, MAX_S); clearRun(); sample(INITIAL); }
    function setN(n) { state.n = clamp(Math.round(n / STEP_N) * STEP_N, MIN_N, MAX_N); sampleButton.textContent = "Survey " + state.n + " people"; clearRun(); sample(INITIAL); }
    function reset() { sSlider.set(DEFAULT_S, true); nSlider.set(DEFAULT_N, true); state.s = DEFAULT_S; state.n = DEFAULT_N; sampleButton.textContent = "Survey " + DEFAULT_N + " people"; clearRun(); sample(INITIAL); }

    /* ---- render ------------------------------------------------------------------ */
    function render() {
      if (!state.result) return;
      var r = state.result, capped = state.tests >= MAX_TESTS, crit = stats.chiSquareQuantile(1 - ALPHA, r.df);
      chiOut.set(r.chi2); dfOut.set(r.df); pOut.set(r.p); critOut.set(crit); testsOut.set(state.tests); shareOut.set(state.tests ? state.small / state.tests : NaN);
      sampleButton.disabled = capped; manyButton.disabled = capped; note.hidden = !capped;
      var lowE = r.expected.some(function (row) { return row.some(function (e) { return e < 5; }); });
      status.textContent = (state.s === 0 ? "Association is 0, so sleep really is independent of exercise, so p < 0.05 is a false alarm and the share should settle near 5 %. "
        : "Association " + state.s.toFixed(2) + ": the rows really differ. With n = " + state.n + " the test detects it in the share of surveys shown. Raise n or the association and watch it climb. ")
        + (lowE ? "Warning: an expected count is below 5, so the χ² approximation is shaky." : "");
      CELLS.forEach(function (c) { table.querySelector("[data-cell=\"" + c[0] + "-" + c[1] + "\"]").textContent = state.table[c[0]][c[1]] + " (" + r.expected[c[0]][c[1]].toFixed(1) + ")"; });
      ROWS.forEach(function (rn, i) { table.querySelector("[data-row=\"" + i + "\"]").textContent = r.rowTotals[i]; });
      COLS.forEach(function (cn, j) { table.querySelector("[data-col=\"" + j + "\"]").textContent = r.colTotals[j]; });
      table.querySelector("[data-n]").textContent = r.n;

      var rowH = rc.height / 2, barH = rowH * 0.6;
      var data = [];
      ROWS.forEach(function (rn, i) { var start = 0; COLS.forEach(function (cn, j) { var share = r.rowTotals[i] ? state.table[i][j] / r.rowTotals[i] : 0; data.push({ i: i, j: j, start: start, share: share }); start += share; }); });
      var sel = segs.selectAll("rect").data(data);
      sel.enter().append("rect").merge(sel).attr("class", function (d) { return "cat-" + (d.j + 1); })
        .attr("x", function (d) { return rx(d.start); }).attr("width", function (d) { return Math.max(0, rx(d.start + d.share) - rx(d.start)); })
        .attr("y", function (d) { return d.i * rowH + (rowH - barH) / 2; }).attr("height", barH);
      rowLabels.attr("y", function (d, i) { return i * rowH + rowH / 2; });
      var lab = segLabels.selectAll("text").data(data);
      lab.enter().append("text").attr("class", "mark-label mark-label--light").attr("text-anchor", "middle").attr("dy", "0.35em").merge(lab)
        .attr("x", function (d) { return rx(d.start + d.share / 2); }).attr("y", function (d) { return d.i * rowH + rowH / 2; })
        .text(function (d) {
          var text = COLS[d.j].split(" ")[0] + " " + Math.round(d.share * 100) + "%";
          // Only label a segment wide enough to hold the words: at 360 px a 12 % slice is
          // narrower than "Fair 44%" and the labels ran into each other (D-034).
          return rx(d.start + d.share) - rx(d.start) > text.length * 7 + 8 ? text : "";
        });

      hy.domain([0, 0.5]);
      hc.yGrid(hy, 5); hc.yAxis(hy, { label: "density", ticks: 5 });
      var pts = [], tl = [];
      for (var i = 0; i <= 400; i++) { var v = X_MAX * i / 400, dens = Math.min(0.5, stats.chiSquarePdf(v, r.df)); pts.push([v, dens]); if (v >= r.chi2) tl.push([v, dens]); }
      if (r.chi2 < X_MAX) tl.unshift([r.chi2, Math.min(0.5, stats.chiSquarePdf(r.chi2, r.df))]);
      var line = d3.line().x(function (d) { return hx(d[0]); }).y(function (d) { return hy(d[1]); });
      var area = d3.area().x(function (d) { return hx(d[0]); }).y0(function () { return hc.height; }).y1(function (d) { return hy(d[1]); });
      curve.attr("d", line(pts)); tail.attr("d", tl.length > 1 ? area(tl) : null);
      var count = state.tests, w = Math.max(1, hx(BIN) - hx(0) - 0.5);
      var hs = bars.selectAll("rect.bar").data(state.bins);
      hs.enter().append("rect").attr("class", "bar bar--density").merge(hs)
        .attr("x", function (c, j) { return hx(j * BIN) + 0.25; }).attr("width", w)
        .attr("y", function (c) { return hy(Math.min(0.5, count ? c / (count * BIN) : 0)); }).attr("height", function (c) { return hc.height - hy(Math.min(0.5, count ? c / (count * BIN) : 0)); });
      critLine.attr("x1", hx(crit)).attr("x2", hx(crit)).attr("y1", 0).attr("y2", hc.height);
      critLabel.attr("x", hx(crit)).text("5 % critical value " + crit.toFixed(2));
      var cx = clamp(r.chi2, 0, X_MAX);
      chiMark.attr("transform", "translate(" + hx(cx) + "," + hc.height + ")");
      chiLabel.attr("x", hx(cx)).attr("y", -8).text("χ² = " + r.chi2.toFixed(2) + (r.chi2 > X_MAX ? " (off the axis)" : ""));
    }

    /* ---- initial state (D5) ------------------------------------------------- */
    clearRun(); sample(INITIAL);

    /* ---- api ------------------------------------------------------------------- */
    return {
      el: container,
      setAssociation: function (s) { sSlider.set(s, true); setAssociation(s); },
      setN: function (n) { nSlider.set(n, true); setN(n); },
      sample: sample, reset: reset,
      cellProbs: cellProbs,
      state: function () { var r = state.result || {}; return { s: state.s, n: state.n, table: state.table.map(function (row) { return row.slice(); }), expected: r.expected, chi2: r.chi2, df: r.df, p: r.p, tests: state.tests, small: state.small, bins: state.bins.slice(), beyond: state.beyond }; },
      constants: { ROWS: ROWS.slice(), COLS: COLS.slice(), ROW_P: ROW_P.slice(), COL_P: COL_P.slice(), P_ASSOC: P_ASSOC.map(function (r) { return r.slice(); }), MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, DEFAULT_S: DEFAULT_S, X_MAX: X_MAX, ALPHA: ALPHA, INITIAL: INITIAL, MAX_TESTS: MAX_TESTS }
    };
  };
})();
