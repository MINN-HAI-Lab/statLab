/*
  resampling__bootstrap.js — SYLLABUS §16.1 "The bootstrap".

  Teaches: when you cannot write down the sampling distribution, you can build
  one. Treat the sample as a stand-in for the population, draw from it with
  replacement, and the spread of the resampled means estimates the standard
  error. The percentile interval that comes out lands close to the t-interval
  of Chapter 8 without ever using its formula.

  Public:  demos.initBootstrap(containerEl) → api { draw(k), setN(n), newSample(),
           reset(), state() }
  Uses:    stats.sampleNormal, stats.resample, stats.mean, stats.sd, stats.percentileInterval,
           stats.tQuantile, stats.histogram;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart.

  Pattern per D-019 / D-024. The observed sample is drawn once and never changes
  while resampling; each resample's picks are shown on the strip so the
  duplicates are visible, which is the part students disbelieve. Density-scaled
  histogram, fixed axes, cap with a note (D6, D7).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MU = 11.5, SIGMA = 1.8;
  var MIN_N = 5, MAX_N = 40, DEFAULT_N = 10;
  var X_MIN = 6, X_MAX = 17;
  var BIN = 0.1, MAX_DRAWS = 4000, BATCH = 200, LEVEL = 0.95;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initBootstrap = function (container) {
    var state = { n: DEFAULT_N, sample: [], means: [], lastPicks: [] };

    /* ---- controls ---------------------------------------------------- */
    var oneButton = ui.button({ label: "Resample once", kind: "primary", onClick: function () { draw(1); } });
    var batchButton = ui.button({ label: "Resample " + BATCH, onClick: function () { draw(BATCH); } });
    var newButton = ui.button({ label: "New sample", onClick: newSample });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(oneButton); controls.appendChild(batchButton); controls.appendChild(newButton); controls.appendChild(resetButton);
    var nSlider = ui.slider({ label: "Size of the one sample you have, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var meanOut = ui.readout({ label: "Your sample's mean", decimals: 3, accent: true });
    var drawsOut = ui.readout({ label: "Resamples", decimals: 0 });
    var seOut = ui.readout({ label: "Bootstrap standard error", decimals: 3, accent: true });
    var formulaSeOut = ui.readout({ label: "Formula standard error", decimals: 3 });
    var bootCiOut = ui.readout({ label: "Bootstrap 95 % interval", decimals: 3, format: function () { return ciText(bootInterval()); } });
    var tCiOut = ui.readout({ label: "t interval from Chapter 8", decimals: 3, format: function () { return ciText(tInterval()); } });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "demo__status demo__note"; note.hidden = true;
    note.textContent = "Cap reached: " + MAX_DRAWS + " resamples. Reset to start again.";

    function ciText(ci) { return ci && isFinite(ci.lo) ? "(" + ci.lo.toFixed(2) + ", " + ci.hi.toFixed(2) + ")" : "—"; }

    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- chart 1: the one sample, and the picks of the last resample ------ */
    var stripHost = document.createElement("div"); container.appendChild(stripHost);
    var stripFrame = ui.chart(stripHost, { aspect: 0.22, minHeight: 108, maxHeight: 108, margin: { top: 24, right: 20, bottom: 40, left: 20 }, ariaLabel: "The one observed sample as dots, with the values picked by the latest resample stacked above them" });
    var sx = d3.scaleLinear().domain([X_MIN, X_MAX]);
    var sampleDots = stripFrame.plot.append("g");
    var pickDots = stripFrame.plot.append("g");
    var stripTitle = stripFrame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -10);

    /* ---- chart 2: the pile of resampled means ---------------------------- */
    var pileHost = document.createElement("div"); container.appendChild(pileHost);
    var frame = ui.chart(pileHost, { aspect: 0.5, minHeight: 240, maxHeight: 330, margin: { top: 30, right: 20, bottom: 44, left: 54 }, ariaLabel: "Histogram of the resampled means, with the bootstrap percentile interval and the t interval drawn beneath it" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear();
    var bars = frame.plot.append("g");
    var bootBar = frame.plot.append("line").attr("class", "ci-line");
    var tBar = frame.plot.append("line").attr("class", "ci-line ci-line--formula");
    var bootLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "start");
    var tLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "start");
    var meanMark = frame.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-7,0L7,0L0,-11Z");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Top: your one sample in dark dots, with the latest resample's picks stacked above each value. A tall stack means that value was drawn several times, and a gap means it was missed. Bottom: the mean of every resample. The solid bar is the middle 95 % of that pile, and the dashed bar is the t interval, which never sees the pile at all.";

    container.appendChild(ui.readoutRow([meanOut, drawsOut, seOut, formulaSeOut]));
    container.appendChild(ui.readoutRow([bootCiOut, tCiOut]));
    container.appendChild(status);
    container.appendChild(note);
    container.appendChild(legend);

    stripFrame.onResize(function (f) { sx.range([0, f.width]); f.xAxis(sx, { label: "value", ticks: 8 }); render(); });
    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.xAxis(x, { label: "mean of a resample", ticks: 8 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function newSample() {
      state.sample = [];
      for (var i = 0; i < state.n; i++) state.sample.push(clamp(stats.sampleNormal(MU, SIGMA), X_MIN + 0.2, X_MAX - 0.2));
      state.means = []; state.lastPicks = [];
      draw(1);
    }
    function draw(k) {
      var added = 0;
      while (added < k && state.means.length < MAX_DRAWS) {
        var picks = stats.resample(state.sample, state.sample.length);
        state.lastPicks = picks;
        state.means.push(stats.mean(picks));
        added++;
      }
      render();
      return added;
    }
    function setN(v) { state.n = clamp(Math.round(v), MIN_N, MAX_N); newSample(); }
    function reset() { nSlider.set(DEFAULT_N, true); state.n = DEFAULT_N; newSample(); }
    function bootInterval() { return state.means.length > 1 ? stats.percentileInterval(state.means, LEVEL) : null; }
    function tInterval() {
      if (state.sample.length < 2) return null;
      var m = stats.mean(state.sample), se = stats.sd(state.sample) / Math.sqrt(state.sample.length);
      var t = stats.tQuantile(1 - (1 - LEVEL) / 2, state.sample.length - 1);
      return { lo: m - t * se, hi: m + t * se, level: LEVEL };
    }
    function formulaSe() { return state.sample.length > 1 ? stats.sd(state.sample) / Math.sqrt(state.sample.length) : NaN; }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.sample.length || !state.means.length) return;
      var m = stats.mean(state.sample), boot = bootInterval(), tci = tInterval(), atCap = state.means.length >= MAX_DRAWS;
      oneButton.disabled = atCap; batchButton.disabled = atCap; note.hidden = !atCap;
      var bootSe = state.means.length > 1 ? stats.sd(state.means) : NaN;
      meanOut.set(m); drawsOut.set(state.means.length); seOut.set(bootSe); formulaSeOut.set(formulaSe());
      bootCiOut.set(0); tCiOut.set(0);
      status.textContent = state.means.length < 20
        ? "Your one sample has mean " + m.toFixed(2) + ". Each resample draws " + state.sample.length + " values from it with replacement, so some come up twice and some not at all. Keep going until the pile has a shape."
        : "From " + state.means.length + " resamples the bootstrap standard error is " + bootSe.toFixed(3) + ", against " + formulaSe().toFixed(3) + " from the formula s/√n. The percentile interval " + ciText(boot) + " sits close to the t interval " + ciText(tci) + ", and no formula was used to get it.";

      // the sample and the latest picks
      var sd = sampleDots.selectAll("circle").data(state.sample);
      sd.exit().remove();
      sd.enter().append("circle").attr("class", "dot--sample").attr("r", 4).merge(sd)
        .attr("cx", function (v) { return sx(v); }).attr("cy", stripFrame.height - 6);
      var stacks = {}, picks = state.lastPicks.map(function (v) {
        var key = v.toFixed(6);
        stacks[key] = (stacks[key] || 0) + 1;
        return { v: v, level: stacks[key] };
      });
      var maxLevel = Math.max(1, Math.floor((stripFrame.height - 20) / 9));
      var pd = pickDots.selectAll("circle").data(picks);
      pd.exit().remove();
      pd.enter().append("circle").attr("class", "mark--hollow").attr("r", 3.5).merge(pd)
        .attr("cx", function (d) { return sx(d.v); })
        // a value drawn more times than the strip is tall stacks on the top row rather
        // than climbing out of the plot; the mean still uses every pick (D6)
        .attr("cy", function (d) { return stripFrame.height - 18 - (Math.min(d.level, maxLevel) - 1) * 9; });
      stripTitle.text("Your sample (filled) and the latest resample's picks stacked above it (hollow)");

      // the pile of means
      var hist = stats.histogram(state.means, X_MIN, X_MAX, BIN), peak = 0;
      hist.counts.forEach(function (c) { peak = Math.max(peak, c / (state.means.length * BIN)); });
      y.domain([0, (peak > 0 ? peak : 1) * 1.15]);
      frame.yGrid(y, 4); frame.yAxis(y, { label: "density", ticks: 4 });
      var bs = bars.selectAll("rect").data(hist.counts);
      bs.exit().remove();
      bs.enter().append("rect").attr("class", "bar bar--density").merge(bs)
        .attr("x", function (c, i) { return x(hist.edges[i]); })
        .attr("width", Math.max(1, x(X_MIN + BIN) - x(X_MIN)))
        .attr("y", function (c) { return y(c / (state.means.length * BIN)); })
        .attr("height", function (c) { return frame.height - y(c / (state.means.length * BIN)); });

      var showBoot = boot && isFinite(boot.lo);
      bootBar.style("display", showBoot ? null : "none");
      bootLabel.style("display", showBoot ? null : "none");
      if (showBoot) {
        bootBar.attr("x1", x(boot.lo)).attr("x2", x(boot.hi)).attr("y1", 14).attr("y2", 14);
        bootLabel.attr("x", x(boot.hi) + 8).attr("y", 18).text("bootstrap");
      }
      tBar.style("display", tci ? null : "none");
      tLabel.style("display", tci ? null : "none");
      if (tci) {
        tBar.attr("x1", x(clamp(tci.lo, X_MIN, X_MAX))).attr("x2", x(clamp(tci.hi, X_MIN, X_MAX))).attr("y1", 32).attr("y2", 32);
        tLabel.attr("x", x(clamp(tci.hi, X_MIN, X_MAX)) + 8).attr("y", 36).text("t formula");
      }
      meanMark.attr("transform", "translate(" + x(m) + "," + frame.height + ")");
    }

    /* ---- initial state (D5) ------------------------------------------- */
    newSample();
    draw(BATCH);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      draw: draw,
      setN: function (v) { nSlider.set(v, true); setN(v); },
      newSample: newSample, reset: reset,
      state: function () {
        return { n: state.n, sample: state.sample.slice(), means: state.means.slice(), draws: state.means.length,
          lastPicks: state.lastPicks.slice(), sampleMean: stats.mean(state.sample),
          bootstrapSe: state.means.length > 1 ? stats.sd(state.means) : NaN, formulaSe: formulaSe(),
          bootstrapInterval: bootInterval(), tInterval: tInterval() };
      },
      constants: { MU: MU, SIGMA: SIGMA, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, X_MIN: X_MIN, X_MAX: X_MAX, BIN: BIN, MAX_DRAWS: MAX_DRAWS, BATCH: BATCH, LEVEL: LEVEL }
    };
  };
})();
