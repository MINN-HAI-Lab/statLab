/*
  continuous-random-variables__exponential.js — SYLLABUS §5.2 "The exponential distribution".

  Teaches: the exponential models waiting times between random arrivals, and it
  is memoryless: having already waited t changes nothing about the wait ahead.

  Public:  demos.initExponential(containerEl) → api { setRate(r), setWaited(t), arrive(n), reset(),
           startAuto(), stopAuto(), state() }
  Uses:    stats.sampleExponential, stats.exponentialPdf, stats.exponentialCdf, stats.welford;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart, ui.prefersReducedMotion;
           d3 scales/line/area.

  Pattern per D-019. Arrivals are simulated one wait at a time; the timeline
  shows the most recent stretch, the histogram of waits (density-scaled) builds
  under the curve, and the "already waited" slider draws the conditional density
  of the remaining wait, which is the same curve shifted.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var T_MAX = 10, BIN = 0.25;                 // waiting-time axis, minutes (fixed, D7)
  var WINDOW = 20;                            // minutes of timeline shown
  var MIN_RATE = 0.2, MAX_RATE = 3, DEFAULT_RATE = 1;
  var MAX_WAITED = 5, DEFAULT_WAITED = 0, EXTRA = 1;   // "at least EXTRA more minutes"
  var INITIAL_ARRIVALS = 5, MAX_ARRIVALS = 100000;
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_ARRIVALS = 15;
  var MAX_TICKS = 400;                        // timeline ticks kept in SVG (D9)

  window.demos.initExponential = function (container) {
    var reduced = ui.prefersReducedMotion();
    var nBins = Math.round(T_MAX / BIN);
    var state = { rate: DEFAULT_RATE, waited: DEFAULT_WAITED, waits: [], times: [], clock: 0, bins: [], beyond: 0, acc: stats.welford(), auto: false };
    var timer = null;

    /* ---- controls ---------------------------------------------------- */
    var nextButton = ui.button({ label: "Next arrival", kind: "primary", onClick: function () { arrive(1); } });
    var manyButton = ui.button({ label: "100 arrivals", onClick: function () { arrive(100); } });
    var autoButton = ui.button({ label: "Auto", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [nextButton, manyButton, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var rateSlider = ui.slider({ label: "Arrival rate λ (per minute)", min: MIN_RATE, max: MAX_RATE, step: 0.1, value: DEFAULT_RATE, onChange: setRate });
    var waitedSlider = ui.slider({ label: "Already waited t (minutes)", min: 0, max: MAX_WAITED, step: 0.1, value: DEFAULT_WAITED, onChange: setWaited });

    var arrivalsOut = ui.readout({ label: "Arrivals", decimals: 0 });
    var meanOut = ui.readout({ label: "Mean wait (sample)", decimals: 2, accent: true });
    var muOut = ui.readout({ label: "Mean wait 1/λ", decimals: 2, accent: true });
    var condTheoryOut = ui.readout({ label: "P(wait > t + 1 | waited t)", decimals: 3, accent: true });
    var freshTheoryOut = ui.readout({ label: "P(wait > 1) from scratch", decimals: 3, accent: true });
    var condEmpOut = ui.readout({ label: "Observed, among waits > t", decimals: 3 });
    var freshEmpOut = ui.readout({ label: "Observed, all waits", decimals: 3 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_ARRIVALS.toLocaleString() + " arrivals reached. Press Reset to start again.";

    container.appendChild(controls);
    container.appendChild(rateSlider.el);

    /* ---- timeline ------------------------------------------------------- */
    var lineHost = document.createElement("div");
    container.appendChild(lineHost);
    var tl = ui.chart(lineHost, { aspect: 0.16, minHeight: 84, maxHeight: 100, margin: { top: 10, bottom: 42 }, ariaLabel: "Timeline of the most recent arrivals" });
    var tx = d3.scaleLinear();
    var tickLayer = tl.plot.append("g");
    var baseline = tl.plot.append("line").attr("class", "lane-line");

    /* ---- histogram + curves ---------------------------------------------- */
    var histHost = document.createElement("div");
    container.appendChild(histHost);
    var hist = ui.chart(histHost, { aspect: 0.5, minHeight: 240, ariaLabel: "Histogram of waiting times under the exponential density; a dashed curve shows the distribution of the remaining wait after already waiting t" });
    var x = d3.scaleLinear().domain([0, T_MAX]);
    var y = d3.scaleLinear();
    var bars = hist.plot.append("g");
    var tailShade = hist.plot.append("path").attr("class", "area");
    var curve = hist.plot.append("path").attr("class", "line line--strong");
    var condCurve = hist.plot.append("path").attr("class", "line line--reference");
    var waitedLine = hist.plot.append("line").attr("class", "line line--reference");
    var waitedLabel = hist.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("dy", "-0.3em");
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
    var areaGen = d3.area().x(function (d) { return x(d[0]); }).y0(function () { return hist.height; }).y1(function (d) { return y(d[1]); });
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Solid curve: density of the wait, λe^(−λw). Dashed curve: density of the remaining wait once you have already waited t, which is the same shape simply moved along. Bars: waits observed so far.";

    container.appendChild(waitedSlider.el);
    container.appendChild(ui.readoutRow([arrivalsOut, meanOut, muOut]));
    container.appendChild(ui.readoutRow([condTheoryOut, freshTheoryOut, condEmpOut, freshEmpOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(note);

    tl.onResize(function (f) { tx.range([0, f.width]); render(); });
    hist.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.xAxis(x, { label: "waiting time between arrivals (minutes)", ticks: 10 });
      render();
    });

    /* ---- updates --------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function clearRun() { state.waits = []; state.times = []; state.clock = 0; state.beyond = 0; state.acc = stats.welford(); state.bins = []; for (var i = 0; i < nBins; i++) state.bins.push(0); }

    function arrive(n) {
      var added = 0;
      while (added < n && state.waits.length < MAX_ARRIVALS) {
        var w = stats.sampleExponential(state.rate);
        state.clock += w;
        state.waits.push(w);
        state.times.push(state.clock);
        state.acc.push(w);
        if (w > T_MAX) state.beyond += 1; else state.bins[clamp(Math.floor(w / BIN), 0, nBins - 1)] += 1;
        added += 1;
      }
      if (state.waits.length >= MAX_ARRIVALS) stopAuto();
      render();
      return added;
    }

    /** A new rate is a new process (D-019 §3). */
    function setRate(r) { state.rate = clamp(r, MIN_RATE, MAX_RATE); clearRun(); arrive(INITIAL_ARRIVALS); }
    function setWaited(t) { state.waited = clamp(Math.round(t * 10) / 10, 0, MAX_WAITED); render(); }
    function reset() { stopAuto(); rateSlider.set(DEFAULT_RATE, true); waitedSlider.set(DEFAULT_WAITED, true); state.rate = DEFAULT_RATE; state.waited = DEFAULT_WAITED; clearRun(); arrive(INITIAL_ARRIVALS); }

    /** Empirical P(W > t + EXTRA | W > t) and P(W > EXTRA), from the actual waits. */
    function empirical() {
      var t = state.waited, over = 0, overBoth = 0, fresh = 0;
      for (var i = 0; i < state.waits.length; i++) {
        var w = state.waits[i];
        if (w > t) { over += 1; if (w > t + EXTRA) overBoth += 1; }
        if (w > EXTRA) fresh += 1;
      }
      return { conditional: over ? overBoth / over : NaN, fresh: state.waits.length ? fresh / state.waits.length : NaN, over: over };
    }

    /* ---- render ------------------------------------------------------------ */
    function render() {
      if (!state.bins.length) return;
      var n = state.waits.length, r = state.rate, t = state.waited, capped = n >= MAX_ARRIVALS;
      var e = empirical();
      var pFresh = 1 - stats.exponentialCdf(EXTRA, r);
      var pCond = (1 - stats.exponentialCdf(t + EXTRA, r)) / (1 - stats.exponentialCdf(t, r));
      arrivalsOut.set(n); meanOut.set(state.acc.mean); muOut.set(1 / r);
      condTheoryOut.set(pCond); freshTheoryOut.set(pFresh); condEmpOut.set(e.conditional); freshEmpOut.set(e.fresh);
      nextButton.disabled = capped; manyButton.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto";
      note.hidden = !capped;
      status.textContent = "Given " + ui.formatNumber(t, 1) + " minutes have passed with no arrival, the chance of at least one more minute is e^(−λ·1) = " + ui.formatNumber(pCond, 3) + ", exactly the same as for a fresh wait. " + (e.over ? "So far " + e.over + " waits lasted longer than t." : "No wait has lasted longer than t yet.");

      // Timeline: the last WINDOW minutes.
      var end = Math.max(WINDOW, state.clock);
      tx.domain([end - WINDOW, end]);
      tl.xAxis(tx, { label: "time (minutes)", ticks: 10 });
      baseline.attr("x1", 0).attr("x2", tl.width).attr("y1", tl.height / 2).attr("y2", tl.height / 2);
      var shown = state.times.slice(-MAX_TICKS).filter(function (tm) { return tm >= end - WINDOW; });
      var ticks = tickLayer.selectAll("line.tick-mark").data(shown);
      ticks.exit().remove();
      ticks.enter().append("line").attr("class", "tick-mark").merge(ticks)
        .attr("x1", function (tm) { return tx(tm); }).attr("x2", function (tm) { return tx(tm); }).attr("y1", tl.height * 0.15).attr("y2", tl.height * 0.85);

      // Histogram + curves on a y-axis fixed by the rate (D7).
      var yMax = Math.max(0.5, Math.ceil(r * 4) / 4);
      y.domain([0, yMax]);
      hist.yGrid(y, 4);
      hist.yAxis(y, { label: "density", ticks: 4 });
      var pts = [], cond = [], tail = [];
      for (var i = 0; i <= 400; i++) {
        var w = T_MAX * i / 400;
        pts.push([w, stats.exponentialPdf(w, r)]);
        if (w >= t) { cond.push([w, stats.exponentialPdf(w - t, r)]); tail.push([w, stats.exponentialPdf(w, r)]); }
      }
      curve.attr("d", lineGen(pts));
      condCurve.attr("d", t > 0 ? lineGen(cond) : null);
      tailShade.attr("d", t > 0 ? areaGen(tail) : null);
      waitedLine.style("display", t > 0 ? null : "none").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 0).attr("y2", hist.height);
      waitedLabel.style("display", t > 0 ? null : "none").attr("x", x(t)).attr("y", 0).text("already waited t = " + ui.formatNumber(t, 1));
      var bw = Math.max(1, x(BIN) - x(0) - 1);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar bar--density").merge(sel)
        .attr("x", function (c, i) { return x(i * BIN) + 0.5; }).attr("width", bw)
        .attr("y", function (c) { return y(Math.min(yMax, n ? c / (n * BIN) : 0)); })
        .attr("height", function (c) { return hist.height - y(Math.min(yMax, n ? c / (n * BIN) : 0)); });
    }

    /* ---- auto loop --------------------------------------------------------- */
    function startAuto() {
      if (state.auto || state.waits.length >= MAX_ARRIVALS) return;
      state.auto = true;
      if (reduced) timer = window.setInterval(function () { arrive(STEP_ARRIVALS); }, STEP_INTERVAL);
      else { var step = function () { if (!state.auto) return; arrive(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); }; timer = window.requestAnimationFrame(step); }
      render();
    }
    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null; render();
    }

    /* ---- initial state (D5) ----------------------------------------------- */
    clearRun();
    arrive(INITIAL_ARRIVALS);

    /* ---- api ------------------------------------------------------------------ */
    return {
      el: container,
      setRate: function (r) { rateSlider.set(r, true); setRate(r); },
      setWaited: function (t) { waitedSlider.set(t, true); setWaited(t); },
      arrive: arrive, reset: reset, startAuto: startAuto, stopAuto: stopAuto,
      state: function () {
        var e = empirical();
        return { rate: state.rate, waited: state.waited, arrivals: state.waits.length, waits: state.waits.slice(), times: state.times.slice(), clock: state.clock, meanWait: state.acc.mean, beyond: state.beyond, bins: state.bins.slice(), conditionalEmpirical: e.conditional, freshEmpirical: e.fresh, conditionalTheory: (1 - stats.exponentialCdf(state.waited + EXTRA, state.rate)) / (1 - stats.exponentialCdf(state.waited, state.rate)), freshTheory: 1 - stats.exponentialCdf(EXTRA, state.rate), auto: state.auto };
      },
      constants: { T_MAX: T_MAX, BIN: BIN, WINDOW: WINDOW, MIN_RATE: MIN_RATE, MAX_RATE: MAX_RATE, DEFAULT_RATE: DEFAULT_RATE, MAX_WAITED: MAX_WAITED, EXTRA: EXTRA, INITIAL_ARRIVALS: INITIAL_ARRIVALS, MAX_ARRIVALS: MAX_ARRIVALS, MAX_TICKS: MAX_TICKS }
    };
  };
})();
