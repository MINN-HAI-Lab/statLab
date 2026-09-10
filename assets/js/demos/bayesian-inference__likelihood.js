/*
  bayesian-inference__likelihood.js — SYLLABUS §15.2 "Likelihood".

  Teaches: the data are fixed and the parameter varies. The likelihood scores
  each candidate p by how probable it makes the flips you actually got, and the
  score peaks at the sample proportion.

  Public:  demos.initLikelihood(containerEl) → api { setP(p), setN(n), newFlips(),
           snapToMle(), reset(), state() }
  Uses:    stats.sampleBernoulli, stats.binomialPmf;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 scales/line/area.

  Pattern per D-019. The observed flips are drawn once and stay put while the
  slider moves; only the candidate p changes, which is the whole distinction the
  section is about. The curve is L(p) = C(n, k) p^k (1 − p)^(n − k) evaluated by
  stats.binomialPmf, and the vertical axis rescales to the peak so a long run of
  flips does not flatten the curve into the floor (D7 exception, stated in the
  legend because the y-axis is a likelihood, not a probability anyone reads off).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var TRUE_P = 0.65;
  var MIN_N = 4, MAX_N = 60, DEFAULT_N = 10;
  var MIN_P = 0.01, MAX_P = 0.99, DEFAULT_P = 0.5;
  var STRIP_MAX = 60;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initLikelihood = function (container) {
    var state = { p: DEFAULT_P, n: DEFAULT_N, flips: [] };

    /* ---- controls ---------------------------------------------------- */
    var newButton = ui.button({ label: "New flips", kind: "primary", onClick: newFlips });
    var mleButton = ui.button({ label: "Snap to the best p", onClick: snapToMle });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(newButton); controls.appendChild(mleButton); controls.appendChild(resetButton);
    var nSlider = ui.slider({ label: "Flips observed, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });
    var pSlider = ui.slider({ label: "Candidate p", min: MIN_P, max: MAX_P, step: 0.01, value: DEFAULT_P, decimals: 2, onChange: setP });

    var headsOut = ui.readout({ label: "Heads", decimals: 0 });
    var mleOut = ui.readout({ label: "Best-supported p", decimals: 3, accent: true });
    var likeOut = ui.readout({ label: "Likelihood at your p", decimals: 5, accent: true });
    var bestOut = ui.readout({ label: "Likelihood at the best p", decimals: 5 });
    // A candidate far from k/n is worse by an astronomical factor at large n, and 56
    // digits of it tell a reader nothing; past a thousand the magnitude is the message.
    function times(v) { return !isFinite(v) ? "—" : v < 1000 ? v.toFixed(2) : v.toExponential(1); }
    var ratioOut = ui.readout({ label: "Times worse than the best", decimals: 2, format: function (v) { return isFinite(v) ? times(v) + " ×" : "—"; } });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");

    container.appendChild(nSlider.el);
    container.appendChild(pSlider.el);
    container.appendChild(controls);

    /* ---- chart 1: the flips that actually happened ----------------------- */
    var stripHost = document.createElement("div"); container.appendChild(stripHost);
    var stripFrame = ui.chart(stripHost, { aspect: 0.14, minHeight: 62, maxHeight: 62, margin: { top: 18, right: 8, bottom: 8, left: 8 }, ariaLabel: "The observed flips in order, heads filled and tails hollow" });
    var stripMarks = stripFrame.plot.append("g");
    var stripTitle = stripFrame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -6);

    /* ---- chart 2: the likelihood curve ----------------------------------- */
    var curveHost = document.createElement("div"); container.appendChild(curveHost);
    var frame = ui.chart(curveHost, { aspect: 0.5, minHeight: 240, maxHeight: 320, margin: { top: 26, right: 20, bottom: 44, left: 62 }, ariaLabel: "The likelihood of the observed flips plotted against every candidate value of p" });
    var x = d3.scaleLinear().domain([0, 1]), y = d3.scaleLinear();
    var curve = frame.plot.append("path").attr("class", "line line--strong");
    var mleLine = frame.plot.append("line").attr("class", "line line--reference");
    var mleLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -12);
    var stem = frame.plot.append("line").attr("class", "handle__line");
    var dot = frame.plot.append("circle").attr("class", "mark mark--strong").attr("r", 6);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Top: the flips, filled for heads and hollow for tails. They do not change while you move the slider. Bottom: how probable each candidate p makes exactly that sequence of flips. The vertical scale is rescaled to the peak, because likelihoods shrink as n grows and only their ratios matter.";

    container.appendChild(ui.readoutRow([headsOut, mleOut, likeOut, bestOut, ratioOut]));
    container.appendChild(status);
    container.appendChild(legend);

    stripFrame.onResize(function () { render(); });
    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.xAxis(x, { label: "candidate p", ticks: 10 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function newFlips() {
      state.flips = [];
      for (var i = 0; i < state.n; i++) state.flips.push(stats.sampleBernoulli(TRUE_P));
      render();
    }
    function heads() { return state.flips.reduce(function (a, b) { return a + b; }, 0); }
    function setP(v) { state.p = clamp(v, MIN_P, MAX_P); render(); }
    function setN(v) { state.n = clamp(Math.round(v), MIN_N, MAX_N); newFlips(); }
    function mle() { return state.flips.length ? heads() / state.flips.length : NaN; }
    function snapToMle() { var m = mle(); if (!isFinite(m)) return; var v = clamp(Math.round(m * 100) / 100, MIN_P, MAX_P); pSlider.set(v, true); setP(v); }
    function reset() {
      nSlider.set(DEFAULT_N, true); pSlider.set(DEFAULT_P, true);
      state.n = DEFAULT_N; state.p = DEFAULT_P;
      newFlips();
    }
    function likelihood(p) { return stats.binomialPmf(heads(), state.flips.length, p); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.flips.length) return;
      var k = heads(), n = state.flips.length, m = mle();
      var best = likelihood(clamp(m, MIN_P, MAX_P)), here = likelihood(state.p);
      headsOut.set(k); mleOut.set(m); likeOut.set(here); bestOut.set(best);
      ratioOut.set(here > 0 ? best / here : NaN);
      status.textContent = "You flipped " + k + " heads in " + n + ". Those flips are now fixed, and the slider moves p rather than the data. p = " + state.p.toFixed(2) + " makes that result " + (here > 0 ? times(best / here) : "infinitely many") + " times less probable than p = " + m.toFixed(2) + " does, which is why " + m.toFixed(2) + " is the best-supported value.";

      // the observed flips
      var sw = stripFrame.width, step = Math.min(16, sw / Math.max(1, Math.min(n, STRIP_MAX)));
      var marks = stripMarks.selectAll("circle").data(state.flips.slice(0, STRIP_MAX));
      marks.exit().remove();
      marks.enter().append("circle").attr("r", 4).merge(marks)
        .attr("class", function (d) { return d ? "mark mark--strong" : "mark mark--hollow"; })
        .attr("cx", function (d, i) { return step * (i + 0.5); })
        .attr("cy", stripFrame.height / 2);
      stripTitle.text("The flips: " + k + " heads, " + (n - k) + " tails" + (n > STRIP_MAX ? " (first " + STRIP_MAX + " drawn)" : ""));

      // the likelihood curve, rescaled to its own peak
      var pts = [], steps = 220, peak = 0, i, v;
      for (i = 0; i <= steps; i++) { v = i / steps; peak = Math.max(peak, likelihood(v)); }
      y.domain([0, peak > 0 ? peak * 1.12 : 1]);
      frame.yGrid(y, 4); frame.yAxis(y, { label: "likelihood", ticks: 4, format: function (d) { return d === 0 ? "0" : d.toPrecision(2); } });
      for (i = 0; i <= steps; i++) { v = i / steps; pts.push([v, likelihood(v)]); }
      var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
      curve.attr("d", line(pts));
      mleLine.attr("x1", x(m)).attr("x2", x(m)).attr("y1", 0).attr("y2", frame.height);
      mleLabel.attr("x", x(m)).text("best p = " + m.toFixed(2));
      stem.attr("x1", x(state.p)).attr("x2", x(state.p)).attr("y1", frame.height).attr("y2", y(here));
      dot.attr("cx", x(state.p)).attr("cy", y(here));
    }

    /* ---- initial state (D5) ------------------------------------------- */
    newFlips();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setP: function (v) { pSlider.set(v, true); setP(v); },
      setN: function (v) { nSlider.set(v, true); setN(v); },
      newFlips: newFlips, snapToMle: snapToMle, reset: reset,
      likelihood: likelihood,
      state: function () { var k = heads(); return { p: state.p, n: state.flips.length, flips: state.flips.slice(), heads: k, mle: mle(), likelihood: likelihood(state.p), bestLikelihood: likelihood(clamp(mle(), MIN_P, MAX_P)) }; },
      constants: { TRUE_P: TRUE_P, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, MIN_P: MIN_P, MAX_P: MAX_P, DEFAULT_P: DEFAULT_P, STRIP_MAX: STRIP_MAX }
    };
  };
})();
