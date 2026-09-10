/*
  resampling__permutation-test.js — SYLLABUS §16.2 "Permutation tests".

  Teaches: if the labels carry no information, shuffling them should change
  nothing. Shuffle them a few thousand times, collect the differences chance
  alone produces, and see where the observed difference falls. That tail
  proportion is a p-value built from the data rather than from a distribution.

  Public:  demos.initPermutationTest(containerEl) → api { shuffle(k), setEffect(d),
           setN(n), newData(), reset(), state() }
  Uses:    stats.sampleNormal, stats.shuffle, stats.mean, stats.welchTest, stats.histogram;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart.

  Pattern per D-019 / D-024 / D-030. The observed data are fixed; only the labels
  move. The p-value is the share of shuffles at least as extreme as the observed
  difference, two-sided, and the Welch p from Chapter 10 is shown beside it so
  the two roads to the same answer can be compared.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var BASE = 50, SD = 8;
  var MIN_EFFECT = 0, MAX_EFFECT = 12, DEFAULT_EFFECT = 6;
  var MIN_N = 5, MAX_N = 40, DEFAULT_N = 12;
  var D_MAX = 20, BIN = 0.5;
  var MAX_SHUFFLES = 5000, BATCH = 500, INITIAL = 200;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initPermutationTest = function (container) {
    var state = { effect: DEFAULT_EFFECT, n: DEFAULT_N, values: [], labels: [], diffs: [], lastLabels: [] };

    /* ---- controls ---------------------------------------------------- */
    var oneButton = ui.button({ label: "Shuffle the labels once", kind: "primary", onClick: function () { shuffle(1); } });
    var batchButton = ui.button({ label: "Shuffle " + BATCH, onClick: function () { shuffle(BATCH); } });
    var newButton = ui.button({ label: "New data", onClick: newData });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(oneButton); controls.appendChild(batchButton); controls.appendChild(newButton); controls.appendChild(resetButton);
    var effectSlider = ui.slider({ label: "True difference between the groups", min: MIN_EFFECT, max: MAX_EFFECT, step: 0.5, value: DEFAULT_EFFECT, decimals: 1, onChange: setEffect });
    var nSlider = ui.slider({ label: "Observations per group, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var obsOut = ui.readout({ label: "Observed difference", decimals: 3, accent: true });
    var shufflesOut = ui.readout({ label: "Shuffles", decimals: 0 });
    var pOut = ui.readout({ label: "Permutation p-value", decimals: 4, accent: true });
    var welchOut = ui.readout({ label: "Welch p-value", decimals: 4 });
    var beyondOut = ui.readout({ label: "As extreme or more", decimals: 0 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "demo__status demo__note"; note.hidden = true;
    note.textContent = "Cap reached: " + MAX_SHUFFLES + " shuffles. Reset to start again.";

    container.appendChild(effectSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- chart 1: the data, under the labels they currently wear ---------- */
    var stripHost = document.createElement("div"); container.appendChild(stripHost);
    var stripFrame = ui.chart(stripHost, { aspect: 0.24, minHeight: 112, maxHeight: 112, margin: { top: 22, right: 20, bottom: 40, left: 26 }, ariaLabel: "The observed values in two rows, one per label, with each group's mean marked" });
    var sx = d3.scaleLinear().domain([BASE - 3.2 * SD, BASE + 3.2 * SD]);
    var stripLanes = stripFrame.plot.append("g");
    var stripDots = stripFrame.plot.append("g");
    var stripMeans = stripFrame.plot.append("g");
    var stripNames = stripFrame.plot.append("g");
    var stripTitle = stripFrame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -8);

    /* ---- chart 2: what shuffling produces --------------------------------- */
    var pileHost = document.createElement("div"); container.appendChild(pileHost);
    var frame = ui.chart(pileHost, { aspect: 0.5, minHeight: 240, maxHeight: 330, margin: { top: 28, right: 20, bottom: 44, left: 54 }, ariaLabel: "Histogram of the differences produced by shuffling the labels, with the observed difference marked" });
    var x = d3.scaleLinear().domain([-D_MAX, D_MAX]), y = d3.scaleLinear();
    var bars = frame.plot.append("g");
    var obsLine = frame.plot.append("line").attr("class", "line line--reference");
    var mirrorLine = frame.plot.append("line").attr("class", "line line--reference line--faint");
    var obsLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -10);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Top: the values with the labels they currently wear. After a shuffle the dots stay put and only their row changes. Bottom: the difference in means each shuffle produced. Dashed lines mark the observed difference and its mirror image, and the p-value is the share of the pile at or beyond them.";

    container.appendChild(ui.readoutRow([obsOut, shufflesOut, pOut, welchOut, beyondOut]));
    container.appendChild(status);
    container.appendChild(note);
    container.appendChild(legend);

    function laneY(g) { return 24 + g * 30; }
    stripNames.selectAll("text").data(["A", "B"]).enter().append("text")
      .attr("class", "marker-label").attr("text-anchor", "end").attr("x", -8).attr("dy", "0.32em")
      .attr("y", function (d, g) { return laneY(g); }).text(function (d) { return d; });

    stripFrame.onResize(function (f) {
      sx.range([0, f.width]);
      f.xAxis(sx, { label: "value", ticks: 8 });
      var ls = stripLanes.selectAll("line.lane-line").data([0, 1]);
      ls.enter().append("line").attr("class", "lane-line").merge(ls)
        .attr("x1", 0).attr("x2", f.width).attr("y1", function (d, g) { return laneY(g); }).attr("y2", function (d, g) { return laneY(g); });
      render();
    });
    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.xAxis(x, { label: "difference in means after shuffling", ticks: 8 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function newData() {
      state.values = []; state.labels = [];
      for (var g = 0; g < 2; g++) {
        for (var i = 0; i < state.n; i++) {
          state.values.push(stats.sampleNormal(BASE + (g === 1 ? state.effect : 0), SD));
          state.labels.push(g);
        }
      }
      state.diffs = []; state.lastLabels = state.labels.slice();
      shuffle(INITIAL);
    }
    function groupsFor(labels) {
      var a = [], b = [];
      state.values.forEach(function (v, i) { (labels[i] ? b : a).push(v); });
      return { a: a, b: b };
    }
    function difference(labels) { var g = groupsFor(labels); return stats.mean(g.b) - stats.mean(g.a); }
    function observed() { return difference(state.labels); }
    function shuffle(k) {
      var added = 0;
      while (added < k && state.diffs.length < MAX_SHUFFLES) {
        var shuffled = stats.shuffle(state.labels);
        state.lastLabels = shuffled;
        state.diffs.push(difference(shuffled));
        added++;
      }
      render();
      return added;
    }
    function setEffect(v) { state.effect = clamp(v, MIN_EFFECT, MAX_EFFECT); newData(); }
    function setN(v) { state.n = clamp(Math.round(v), MIN_N, MAX_N); newData(); }
    function reset() {
      effectSlider.set(DEFAULT_EFFECT, true); nSlider.set(DEFAULT_N, true);
      state.effect = DEFAULT_EFFECT; state.n = DEFAULT_N;
      newData();
    }
    /** Two-sided: the share of shuffles at least as far from zero as the observed gap. */
    function extremeCount() {
      var obs = Math.abs(observed()), c = 0;
      state.diffs.forEach(function (d) { if (Math.abs(d) >= obs - 1e-12) c++; });
      return c;
    }
    /**
     * (1 + extreme) / (1 + shuffles). The observed labelling is itself one of the
     * arrangements the null allows, so it belongs in both counts; without it a finite
     * run could report p = 0, which no number of shuffles can establish (D-037).
     */
    function pValue() { return state.diffs.length ? (1 + extremeCount()) / (1 + state.diffs.length) : NaN; }
    function welch() { var g = groupsFor(state.labels); return stats.welchTest(g.b, g.a); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.values.length || !state.diffs.length) return;
      var obs = observed(), p = pValue(), w = welch(), atCap = state.diffs.length >= MAX_SHUFFLES;
      oneButton.disabled = atCap; batchButton.disabled = atCap; note.hidden = !atCap;
      obsOut.set(obs); shufflesOut.set(state.diffs.length); pOut.set(p); welchOut.set(w.p); beyondOut.set(extremeCount());
      status.textContent = state.effect === 0
        ? "The two groups really are the same here, so the observed gap of " + obs.toFixed(2) + " is itself just one shuffle among many. It sits well inside the pile and p = " + p.toFixed(3) + "."
        : "The observed gap is " + obs.toFixed(2) + ". Of " + state.diffs.length + " shuffles, " + extremeCount() + " produced a gap at least that far from zero. Counting the observed labelling too, p = " + p.toFixed(4) + ". Welch's t-test on the same data says " + w.p.toFixed(4) + ", reached by a formula this demo never used.";

      // the values under their current labels
      var dots = state.values.map(function (v, i) { return { v: v, g: state.lastLabels[i], i: i }; });
      var ds = stripDots.selectAll("circle").data(dots);
      ds.exit().remove();
      ds.enter().append("circle").attr("r", 3.5).merge(ds)
        .attr("class", function (d) { return d.g ? "mark mark--hollow" : "dot--sample"; })
        .attr("cx", function (d) { return sx(clamp(d.v, sx.domain()[0], sx.domain()[1])); })
        .attr("cy", function (d) { return laneY(d.g); });
      var cur = groupsFor(state.lastLabels), means = [stats.mean(cur.a), stats.mean(cur.b)];
      var ms = stripMeans.selectAll("path").data(means);
      ms.enter().append("path").attr("class", "mark mark--strong").attr("d", "M-6,0L0,-7L6,0L0,7Z").merge(ms)
        .attr("transform", function (m, g) { return isFinite(m) ? "translate(" + sx(clamp(m, sx.domain()[0], sx.domain()[1])) + "," + laneY(g) + ")" : null; })
        .style("display", function (m) { return isFinite(m) ? null : "none"; });
      var shuffled = state.lastLabels.join("") !== state.labels.join("");
      stripTitle.text(shuffled ? "Labels after the latest shuffle — the dots have not moved" : "The labels as observed");

      // what shuffling produces
      var hist = stats.histogram(state.diffs, -D_MAX, D_MAX, BIN), peak = 0;
      hist.counts.forEach(function (c) { peak = Math.max(peak, c / (state.diffs.length * BIN)); });
      y.domain([0, (peak > 0 ? peak : 1) * 1.15]);
      frame.yGrid(y, 4); frame.yAxis(y, { label: "density", ticks: 4 });
      var bs = bars.selectAll("rect").data(hist.counts);
      bs.exit().remove();
      bs.enter().append("rect").merge(bs)
        .attr("class", function (c, i) {
          var mid = (hist.edges[i] + hist.edges[i + 1]) / 2;
          return Math.abs(mid) >= Math.abs(obs) ? "bar bar--density bar--extreme" : "bar bar--density";
        })
        .attr("x", function (c, i) { return x(hist.edges[i]); })
        .attr("width", Math.max(1, x(-D_MAX + BIN) - x(-D_MAX)))
        .attr("y", function (c) { return y(c / (state.diffs.length * BIN)); })
        .attr("height", function (c) { return frame.height - y(c / (state.diffs.length * BIN)); });

      var onAxis = Math.abs(obs) <= D_MAX;
      obsLine.style("display", onAxis ? null : "none");
      mirrorLine.style("display", onAxis ? null : "none");
      obsLabel.style("display", onAxis ? null : "none");
      if (onAxis) {
        obsLine.attr("x1", x(obs)).attr("x2", x(obs)).attr("y1", 0).attr("y2", frame.height);
        mirrorLine.attr("x1", x(-obs)).attr("x2", x(-obs)).attr("y1", 0).attr("y2", frame.height);
        obsLabel.attr("x", clamp(x(obs), 40, frame.width - 40)).text("observed " + obs.toFixed(2));
      }
    }

    /* ---- initial state (D5) ------------------------------------------- */
    newData();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      shuffle: shuffle,
      setEffect: function (v) { effectSlider.set(v, true); setEffect(v); },
      setN: function (v) { nSlider.set(v, true); setN(v); },
      newData: newData, reset: reset,
      difference: difference,
      state: function () {
        return { effect: state.effect, n: state.n, values: state.values.slice(), labels: state.labels.slice(),
          lastLabels: state.lastLabels.slice(), diffs: state.diffs.slice(), shuffles: state.diffs.length,
          observed: observed(), p: pValue(), extreme: extremeCount(), welch: welch() };
      },
      constants: { BASE: BASE, SD: SD, MIN_EFFECT: MIN_EFFECT, MAX_EFFECT: MAX_EFFECT, DEFAULT_EFFECT: DEFAULT_EFFECT, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, D_MAX: D_MAX, BIN: BIN, MAX_SHUFFLES: MAX_SHUFFLES, BATCH: BATCH, INITIAL: INITIAL }
    };
  };
})();
