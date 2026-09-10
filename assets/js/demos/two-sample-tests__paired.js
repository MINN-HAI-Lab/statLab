/*
  two-sample-tests__paired.js — SYLLABUS §10.3 "Paired samples".

  Teaches: pairing removes between-subject noise. The same before/after data
  give a much smaller p-value when each subject is compared with itself.

  Public:  demos.initPaired(containerEl) → api { setMode(mode), setEffect(d), setN(n), newSubjects(),
           reset(), state() }   mode ∈ "independent" | "paired"
  Uses:    stats.sampleNormal, stats.mean, stats.sd, stats.welchTest, stats.pairedTest;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 scales.

  Pattern per D-019 / D-020 / D-028. Subject model: before ~ N(60, 12), after =
  before + δ + N(0, 3), so subjects differ a lot from each other but each one
  changes by roughly δ. The slope chart joins each subject's two values.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MU = 60, BETWEEN_SD = 12, WITHIN_SD = 3;
  var MIN_EFFECT = 0, MAX_EFFECT = 10, DEFAULT_EFFECT = 3;
  var MIN_N = 5, MAX_N = 30, DEFAULT_N = 12;
  var Y_MIN = 20, Y_MAX = 100;
  var MODES = [{ key: "independent", label: "Treat as two independent groups" }, { key: "paired", label: "Treat as pairs" }];
  var DEFAULT_MODE = "independent";

  window.demos.initPaired = function (container) {
    var state = { mode: DEFAULT_MODE, effect: DEFAULT_EFFECT, n: DEFAULT_N, before: [], after: [] };

    /* ---- controls ---------------------------------------------------- */
    var modeGroup = document.createElement("div"); modeGroup.className = "ui-controls"; modeGroup.setAttribute("role", "group"); modeGroup.setAttribute("aria-label", "How to analyse the data");
    var modeButtons = {};
    MODES.forEach(function (m) { var b = ui.button({ label: m.label, onClick: function () { setMode(m.key); } }); b.setAttribute("aria-pressed", "false"); modeButtons[m.key] = b; modeGroup.appendChild(b); });
    var newButton = ui.button({ label: "New subjects", kind: "primary", onClick: newSubjects });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(newButton); controls.appendChild(resetButton);
    var effectSlider = ui.slider({ label: "True improvement per subject", min: MIN_EFFECT, max: MAX_EFFECT, step: 0.5, value: DEFAULT_EFFECT, onChange: setEffect });
    var nSlider = ui.slider({ label: "Subjects, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var beforeOut = ui.readout({ label: "Mean before", decimals: 2 });
    var afterOut = ui.readout({ label: "Mean after", decimals: 2 });
    var changeOut = ui.readout({ label: "Mean change", decimals: 2, accent: true });
    var sdBetweenOut = ui.readout({ label: "SD between subjects", decimals: 2 });
    var sdDiffOut = ui.readout({ label: "SD of the changes", decimals: 2, accent: true });
    var tOut = ui.readout({ label: "t", decimals: 3 });
    var dfOut = ui.readout({ label: "df", decimals: 1 });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var otherOut = ui.readout({ label: "p-value the other way", decimals: 4 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");

    container.appendChild(effectSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(modeGroup);
    container.appendChild(controls);

    /* ---- chart: slope chart ------------------------------------------------ */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.6, minHeight: 280, margin: { top: 22, bottom: 40, left: 52 }, ariaLabel: "Each subject's score before and after, joined by a line when the data are treated as pairs" });
    var x = d3.scaleLinear().domain([0, 1]), y = d3.scaleLinear().domain([Y_MIN, Y_MAX]);
    var links = frame.plot.append("g");
    var meanLink = frame.plot.append("line").attr("class", "line line--overlay");
    var dotsB = frame.plot.append("g"), dotsA = frame.plot.append("g");
    var colB = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").text("Before");
    var colA = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").text("After");
    var meanB = frame.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L0,-6L8,0L0,6Z");
    var meanA = frame.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L0,-6L8,0L0,6Z");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Dots: each subject's score. Diamonds: the two group means, joined in orange. Grey lines join each subject's own before and after, and they appear when the data are treated as pairs.";

    container.appendChild(ui.readoutRow([beforeOut, afterOut, changeOut, sdBetweenOut, sdDiffOut]));
    container.appendChild(ui.readoutRow([tOut, dfOut, pOut, otherOut]));
    container.appendChild(status);
    container.appendChild(legend);

    frame.onResize(function (f) { x.range([f.width * 0.25, f.width * 0.75]); y.range([f.height, 0]); f.yGrid(y, 4); f.yAxis(y, { label: "score", ticks: 4 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function newSubjects() {
      state.before = []; state.after = [];
      for (var i = 0; i < state.n; i++) {
        var b = clamp(stats.sampleNormal(MU, BETWEEN_SD), Y_MIN + 2, Y_MAX - 12);
        state.before.push(b);
        state.after.push(clamp(b + state.effect + stats.sampleNormal(0, WITHIN_SD), Y_MIN, Y_MAX));
      }
      render();
    }
    function setMode(m) { if (!modeButtons[m]) return; state.mode = m; render(); }
    function setEffect(d) { state.effect = clamp(d, MIN_EFFECT, MAX_EFFECT); newSubjects(); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); newSubjects(); }
    function reset() { effectSlider.set(DEFAULT_EFFECT, true); nSlider.set(DEFAULT_N, true); state.effect = DEFAULT_EFFECT; state.n = DEFAULT_N; state.mode = DEFAULT_MODE; newSubjects(); }
    function results() {
      var ind = stats.welchTest(state.after, state.before), pr = stats.pairedTest(state.before, state.after);
      return { independent: ind, paired: pr, sdBetween: stats.sd(state.before) };
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.before.length) return;
      var r = results(), active = state.mode === "paired" ? r.paired : r.independent, other = state.mode === "paired" ? r.independent : r.paired;
      MODES.forEach(function (m) { modeButtons[m.key].setAttribute("aria-pressed", String(m.key === state.mode)); });
      beforeOut.set(stats.mean(state.before)); afterOut.set(stats.mean(state.after)); changeOut.set(r.paired.meanDiff);
      sdBetweenOut.set(r.sdBetween); sdDiffOut.set(r.paired.sdDiff);
      tOut.set(active.t); dfOut.set(active.df); pOut.set(active.p); otherOut.set(other.p);
      status.textContent = state.mode === "paired"
        ? "Paired, so each subject is compared with itself, so the " + r.sdBetween.toFixed(1) + "-point spread between subjects drops out and only the " + r.paired.sdDiff.toFixed(1) + "-point spread of the changes remains. Same data, p = " + r.paired.p.toFixed(4) + " instead of " + r.independent.p.toFixed(4) + "."
        : "Independent, so the test compares two clouds of scores that each spread about " + r.sdBetween.toFixed(1) + " points, so a change of " + r.paired.meanDiff.toFixed(1) + " is hard to see. p = " + r.independent.p.toFixed(4) + ". Now treat the data as pairs.";

      var paired = state.mode === "paired";
      colB.attr("x", x(0)).attr("y", frame.height + 22); colA.attr("x", x(1)).attr("y", frame.height + 22);
      var idx = state.before.map(function (v, i) { return i; });
      var ls = links.selectAll("line.pair-link").data(idx);
      ls.exit().remove();
      ls.enter().append("line").attr("class", "pair-link").merge(ls)
        .style("display", paired ? null : "none")
        .attr("x1", x(0)).attr("x2", x(1)).attr("y1", function (i) { return y(state.before[i]); }).attr("y2", function (i) { return y(state.after[i]); });
      var db = dotsB.selectAll("circle").data(idx);
      db.exit().remove(); db.enter().append("circle").attr("class", "dot--sample").attr("r", 4).merge(db).attr("cx", x(0)).attr("cy", function (i) { return y(state.before[i]); });
      var da = dotsA.selectAll("circle").data(idx);
      da.exit().remove(); da.enter().append("circle").attr("class", "dot--sample").attr("r", 4).merge(da).attr("cx", x(1)).attr("cy", function (i) { return y(state.after[i]); });
      var mb = stats.mean(state.before), ma = stats.mean(state.after);
      meanLink.attr("x1", x(0)).attr("x2", x(1)).attr("y1", y(mb)).attr("y2", y(ma));
      meanB.attr("transform", "translate(" + x(0) + "," + y(mb) + ")"); meanA.attr("transform", "translate(" + x(1) + "," + y(ma) + ")");
    }

    /* ---- initial state (D5) ------------------------------------------- */
    newSubjects();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setMode: setMode,
      setEffect: function (d) { effectSlider.set(d, true); setEffect(d); },
      setN: function (n) { nSlider.set(n, true); setN(n); },
      newSubjects: newSubjects, reset: reset,
      state: function () { var r = results(); return { mode: state.mode, effect: state.effect, n: state.n, before: state.before.slice(), after: state.after.slice(), independent: r.independent, paired: r.paired, sdBetween: r.sdBetween }; },
      constants: { MU: MU, BETWEEN_SD: BETWEEN_SD, WITHIN_SD: WITHIN_SD, MIN_EFFECT: MIN_EFFECT, MAX_EFFECT: MAX_EFFECT, DEFAULT_EFFECT: DEFAULT_EFFECT, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, DEFAULT_MODE: DEFAULT_MODE }
    };
  };
})();
