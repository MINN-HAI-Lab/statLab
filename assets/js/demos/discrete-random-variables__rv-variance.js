/*
  discrete-random-variables__rv-variance.js — SYLLABUS §4.2 "Variance of a random variable".

  Teaches: the variance σ² = Σ (x − μ)²·P(x) measures spread around the
  expectation; the sample variance of repeated rolls converges to it.

  Public:  demos.initRvVariance(containerEl) → api { setWeight(face, w), roll(n), reset(),
           startAuto(), stopAuto(), state() }
  Uses:    stats.sampleDiscrete, stats.expectation, stats.discreteVariance, stats.welford;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart, ui.prefersReducedMotion;
           d3 scales.

  Pattern per D-019; the die and weight controls mirror §4.1. Two charts: the
  distribution with deviation sticks from μ, and each face's contribution
  (x − μ)²·P(x) to the variance.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var FACES = [1, 2, 3, 4, 5, 6];
  var DEFAULT_WEIGHTS = [1, 1, 1, 1, 1, 1];
  var MAX_W = 10;
  var INITIAL_ROLLS = 10, MAX_ROLLS = 100000;
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_ROLLS = 15;
  var Y_FLOOR = 0.6;             // probability axis: at least 0.6, or the largest P(x) rounded up (D-023 §6)
  var CONTRIB_MAX = 6.5;        // fixed y for contributions: max (x−μ)²P(x) is 6.25 (two-point 1/6 die) (D7)

  window.demos.initRvVariance = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = { weights: DEFAULT_WEIGHTS.slice(), probs: [], rolls: 0, acc: stats.welford(), auto: false };
    var timer = null;

    /* ---- controls ---------------------------------------------------- */
    var rollOne = ui.button({ label: "Roll 1", kind: "primary", onClick: function () { roll(1); } });
    var rollMany = ui.button({ label: "Roll 100", onClick: function () { roll(100); } });
    var autoButton = ui.button({ label: "Auto-roll", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    [rollOne, rollMany, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var weightSliders = FACES.map(function (f, i) {
      return ui.slider({ label: "Weight of face " + f, min: 0, max: MAX_W, step: 1, value: DEFAULT_WEIGHTS[i], onChange: function (v) { setWeight(i, v); } });
    });
    var weightsBox = document.createElement("div");
    weightsBox.className = "weights";
    weightSliders.forEach(function (s) { weightsBox.appendChild(s.el); });

    var rollsOut = ui.readout({ label: "Rolls", decimals: 0 });
    var s2Out = ui.readout({ label: "Sample variance s²", decimals: 3, accent: true });
    var varOut = ui.readout({ label: "Variance σ²", decimals: 3, accent: true });
    var sOut = ui.readout({ label: "Sample SD s", decimals: 3 });
    var sigmaOut = ui.readout({ label: "SD σ", decimals: 3 });
    var note = document.createElement("p");
    note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_ROLLS.toLocaleString() + " rolls reached. Press Reset to start again.";

    container.appendChild(controls);
    container.appendChild(weightsBox);

    /* ---- chart 1: distribution with deviation sticks ------------------- */
    var host1 = document.createElement("div");
    container.appendChild(host1);
    var frame = ui.chart(host1, { aspect: 0.42, minHeight: 200, margin: { top: 30 }, ariaLabel: "Probability of each die face with sticks from the expected value to each face" });
    var x = d3.scaleLinear().domain([0.5, 6.5]);
    var y = d3.scaleLinear().domain([0, 1]);
    var bars = frame.plot.append("g");
    var sticks = frame.plot.append("g");
    var muLine = frame.plot.append("line").attr("class", "line line--reference");
    var muLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("dy", "-0.3em");

    /* ---- chart 2: contributions to the variance ------------------------- */
    var host2 = document.createElement("div");
    container.appendChild(host2);
    var frame2 = ui.chart(host2, { aspect: 0.36, minHeight: 170, margin: { top: 10 }, ariaLabel: "Each face's contribution to the variance: squared deviation times probability" });
    var y2 = d3.scaleLinear().domain([0, CONTRIB_MAX]);
    var contribBars = frame2.plot.append("g");
    var legend = document.createElement("p");
    legend.className = "demo__status";
    legend.textContent = "Top: P(x) with a stick from μ to each face. Bottom: each face's share (x − μ)²·P(x), and the bars add up to σ².";

    container.appendChild(ui.readoutRow([rollsOut, s2Out, varOut, sOut, sigmaOut]));
    container.appendChild(legend);
    container.appendChild(note);

    frame.onResize(function (f) {
      x.range([0, f.width]);
      y.range([f.height, 0]);
      f.xAxis(x, { label: "face", ticks: 6, format: d3.format("d") });
      render();
    });
    frame2.onResize(function (f) {
      x.range([0, f.width]);
      y2.range([f.height, 0]);
      f.xAxis(x, { label: "face", ticks: 6, format: d3.format("d") });
      f.yGrid(y2, 3);
      f.yAxis(y2, { label: "(x − μ)²·P(x)", ticks: 3 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function normalise() {
      var total = state.weights.reduce(function (s, w) { return s + w; }, 0);
      state.probs = state.weights.map(function (w) { return w / total; });
    }
    function roll(n) {
      var added = 0;
      while (added < n && state.rolls < MAX_ROLLS) { state.acc.push(stats.sampleDiscrete(FACES, state.probs)); state.rolls += 1; added += 1; }
      if (state.rolls >= MAX_ROLLS) stopAuto();
      render();
      return added;
    }
    function clearRun() { state.rolls = 0; state.acc = stats.welford(); }
    function setWeight(i, w) {
      w = Math.max(0, Math.min(MAX_W, Math.round(w)));
      var others = state.weights.reduce(function (s, v, j) { return s + (j === i ? 0 : v); }, 0);
      if (w === 0 && others === 0) { w = 1; weightSliders[i].set(1, true); }
      state.weights[i] = w;
      normalise(); clearRun(); roll(INITIAL_ROLLS);
    }
    function reset() {
      stopAuto();
      state.weights = DEFAULT_WEIGHTS.slice();
      weightSliders.forEach(function (s, i) { s.set(DEFAULT_WEIGHTS[i], true); });
      normalise(); clearRun(); roll(INITIAL_ROLLS);
    }
    function contributions(mu) { return FACES.map(function (f, i) { return (f - mu) * (f - mu) * state.probs[i]; }); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.probs.length) return;
      var mu = stats.expectation(FACES, state.probs);
      var variance = stats.discreteVariance(FACES, state.probs);
      var capped = state.rolls >= MAX_ROLLS;
      rollsOut.set(state.rolls); s2Out.set(state.acc.variance); varOut.set(variance); sOut.set(state.acc.sd); sigmaOut.set(Math.sqrt(variance));
      rollOne.disabled = capped; rollMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-roll";
      note.hidden = !capped;

      y.domain([0, Math.max(Y_FLOOR, Math.ceil(Math.max.apply(null, state.probs) * 10) / 10)]);
      frame.yAxis(y, { label: "P(x)", ticks: 4 });
      var w = (x(1) - x(0)) * 0.6;
      var b = bars.selectAll("rect.bar").data(state.probs);
      b.enter().append("rect").attr("class", "bar bar--theory").merge(b)
        .attr("x", function (d, i) { return x(FACES[i]) - w / 2; }).attr("width", w)
        .attr("y", function (d) { return y(d); }).attr("height", function (d) { return frame.height - y(d); });
      var st = sticks.selectAll("line.stick").data(state.probs);
      st.enter().append("line").attr("class", "stick").merge(st)
        .attr("x1", x(mu)).attr("x2", function (d, i) { return x(FACES[i]); })
        .attr("y1", function (d) { return y(d) - 6; }).attr("y2", function (d) { return y(d) - 6; })
        .style("display", function (d) { return d > 0 ? null : "none"; });
      muLine.attr("x1", x(mu)).attr("x2", x(mu)).attr("y1", 0).attr("y2", frame.height);
      muLabel.attr("x", x(mu)).attr("y", 0).text("μ = " + ui.formatNumber(mu, 2));

      var c = contribBars.selectAll("rect.bar").data(contributions(mu));
      c.enter().append("rect").attr("class", "bar").merge(c)
        .attr("x", function (d, i) { return x(FACES[i]) - w / 2; }).attr("width", w)
        .attr("y", function (d) { return y2(Math.min(d, CONTRIB_MAX)); }).attr("height", function (d) { return frame2.height - y2(Math.min(d, CONTRIB_MAX)); });
    }

    /* ---- auto loop ------------------------------------------------------- */
    function startAuto() {
      if (state.auto || state.rolls >= MAX_ROLLS) return;
      state.auto = true;
      if (reduced) timer = window.setInterval(function () { roll(STEP_ROLLS); }, STEP_INTERVAL);
      else { var step = function () { if (!state.auto) return; roll(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); }; timer = window.requestAnimationFrame(step); }
      render();
    }
    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null;
      render();
    }

    /* ---- initial state (D5) ------------------------------------------- */
    normalise();
    roll(INITIAL_ROLLS);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setWeight: function (i, w) { weightSliders[i].set(w, true); setWeight(i, w); },
      roll: roll,
      reset: reset,
      startAuto: startAuto,
      stopAuto: stopAuto,
      state: function () {
        var mu = stats.expectation(FACES, state.probs);
        return { weights: state.weights.slice(), probs: state.probs.slice(), rolls: state.rolls, sampleVariance: state.acc.variance, sampleSd: state.acc.sd, expectation: mu, variance: stats.discreteVariance(FACES, state.probs), contributions: contributions(mu), auto: state.auto };
      },
      constants: { FACES: FACES.slice(), DEFAULT_WEIGHTS: DEFAULT_WEIGHTS.slice(), MAX_W: MAX_W, INITIAL_ROLLS: INITIAL_ROLLS, MAX_ROLLS: MAX_ROLLS, CONTRIB_MAX: CONTRIB_MAX }
    };
  };
})();
