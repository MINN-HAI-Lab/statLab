/*
  discrete-random-variables__expectation.js — SYLLABUS §4.1 "Expectation".

  Teaches: the expected value μ = Σ x·P(x) is the long-run average of the
  outcomes; the running sample mean of a (loaded) die approaches it.

  Public:  demos.initExpectation(containerEl) → api { setWeight(face, w), roll(n), reset(),
           startAuto(), stopAuto(), state() }
  Uses:    stats.sampleDiscrete, stats.expectation, stats.welford;  ui.slider, ui.button,
           ui.readout, ui.readoutRow, ui.chart, ui.prefersReducedMotion;  d3 scales.

  Pattern per D-019. Face weights (0–10) are normalised to probabilities; changing
  a weight is a new experiment and restarts the run (D-019 §3).
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

  window.demos.initExpectation = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = { weights: DEFAULT_WEIGHTS.slice(), probs: [], counts: [0, 0, 0, 0, 0, 0], rolls: 0, acc: stats.welford(), auto: false };
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
    var meanOut = ui.readout({ label: "Sample mean", decimals: 3, accent: true });
    var muOut = ui.readout({ label: "Expected value μ", decimals: 3, accent: true });
    var note = document.createElement("p");
    note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_ROLLS.toLocaleString() + " rolls reached. Press Reset to start again.";

    container.appendChild(controls);
    container.appendChild(weightsBox);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.5, minHeight: 240, margin: { top: 36 }, ariaLabel: "Probability of each die face (light bars) beside the proportion rolled so far (dark bars); triangle marks the expected value, solid line the sample mean" });
    var x = d3.scaleLinear().domain([0.5, 6.5]);
    var y = d3.scaleLinear().domain([0, 1]);
    var theory = frame.plot.append("g");
    var empirical = frame.plot.append("g");
    var meanLine = frame.plot.append("line").attr("class", "line line--strong");
    var meanLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle");
    var muMark = frame.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L8,0L0,-12Z");
    var muLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle");
    var legend = document.createElement("p");
    legend.className = "demo__status";
    legend.textContent = "Light bars: probability P(x). Dark bars: share of rolls so far. Triangle: μ. Solid line: sample mean.";

    var table = document.createElement("table");
    table.className = "ui-table";
    table.innerHTML = "<caption>Face probabilities and counts</caption><thead><tr><th scope=\"col\">Face x</th><th scope=\"col\">P(x)</th><th scope=\"col\">x · P(x)</th><th scope=\"col\">Rolled</th></tr></thead><tbody>" +
      FACES.map(function (f, i) { return "<tr><th scope=\"row\">" + f + "</th><td data-p=\"" + i + "\"></td><td data-xp=\"" + i + "\"></td><td data-c=\"" + i + "\"></td></tr>"; }).join("") +
      "<tr><th scope=\"row\">Sum</th><td>1.000</td><td data-mu></td><td data-n></td></tr></tbody>";

    container.appendChild(ui.readoutRow([rollsOut, meanOut, muOut]));
    container.appendChild(legend);
    container.appendChild(table);
    container.appendChild(note);

    frame.onResize(function (f) {
      x.range([0, f.width]);
      y.range([f.height, 0]);
      f.xAxis(x, { label: "face", ticks: 6, format: d3.format("d") });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function normalise() {
      var total = state.weights.reduce(function (s, w) { return s + w; }, 0);
      state.probs = state.weights.map(function (w) { return w / total; });
    }

    function roll(n) {
      var added = 0;
      while (added < n && state.rolls < MAX_ROLLS) {
        var face = stats.sampleDiscrete(FACES, state.probs);
        state.counts[face - 1] += 1;
        state.acc.push(face);
        state.rolls += 1;
        added += 1;
      }
      if (state.rolls >= MAX_ROLLS) stopAuto();
      render();
      return added;
    }

    function clearRun() { state.counts = [0, 0, 0, 0, 0, 0]; state.rolls = 0; state.acc = stats.welford(); }

    /** A weight of zero is fine, but at least one face must be possible. */
    function setWeight(i, w) {
      w = Math.max(0, Math.min(MAX_W, Math.round(w)));
      var others = state.weights.reduce(function (s, v, j) { return s + (j === i ? 0 : v); }, 0);
      if (w === 0 && others === 0) { w = 1; weightSliders[i].set(1, true); }
      state.weights[i] = w;
      normalise();
      clearRun();
      roll(INITIAL_ROLLS);
    }

    function reset() {
      stopAuto();
      state.weights = DEFAULT_WEIGHTS.slice();
      weightSliders.forEach(function (s, i) { s.set(DEFAULT_WEIGHTS[i], true); });
      normalise();
      clearRun();
      roll(INITIAL_ROLLS);
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.probs.length) return;
      var mu = stats.expectation(FACES, state.probs);
      var mean = state.acc.mean;
      var capped = state.rolls >= MAX_ROLLS;
      rollsOut.set(state.rolls); meanOut.set(mean); muOut.set(mu);
      rollOne.disabled = capped; rollMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-roll";
      note.hidden = !capped;
      FACES.forEach(function (f, i) {
        table.querySelector("[data-p=\"" + i + "\"]").textContent = ui.formatNumber(state.probs[i], 3);
        table.querySelector("[data-xp=\"" + i + "\"]").textContent = ui.formatNumber(f * state.probs[i], 3);
        table.querySelector("[data-c=\"" + i + "\"]").textContent = state.counts[i];
      });
      table.querySelector("[data-mu]").textContent = ui.formatNumber(mu, 3);
      table.querySelector("[data-n]").textContent = state.rolls;

      y.domain([0, Math.max(Y_FLOOR, Math.ceil(Math.max.apply(null, state.probs) * 10) / 10)]);
      frame.yGrid(y, 4);
      frame.yAxis(y, { label: "probability / proportion", ticks: 4 });
      var half = (x(1) - x(0)) * 0.42;
      var t = theory.selectAll("rect.bar--theory").data(state.probs);
      t.enter().append("rect").attr("class", "bar bar--theory").merge(t)
        .attr("x", function (d, i) { return x(FACES[i]) - half; }).attr("width", half)
        .attr("y", function (d) { return y(d); }).attr("height", function (d) { return frame.height - y(d); });
      var e = empirical.selectAll("rect.bar--empirical").data(state.counts);
      e.enter().append("rect").attr("class", "bar bar--empirical").merge(e)
        .attr("x", function (d, i) { return x(FACES[i]); }).attr("width", half)
        .attr("y", function (d) { return y(Math.min(y.domain()[1], state.rolls ? d / state.rolls : 0)); }).attr("height", function (d) { return frame.height - y(Math.min(y.domain()[1], state.rolls ? d / state.rolls : 0)); });
      muMark.attr("transform", "translate(" + x(mu) + "," + frame.height + ")");
      muLabel.attr("x", x(mu)).attr("y", -20).text("μ = " + ui.formatNumber(mu, 2));
      var show = isFinite(mean);
      meanLine.style("display", show ? null : "none");
      meanLabel.style("display", show ? null : "none");
      if (show) {
        meanLine.attr("x1", x(mean)).attr("x2", x(mean)).attr("y1", 0).attr("y2", frame.height);
        meanLabel.attr("x", x(mean)).attr("y", -5).text("x̄ = " + ui.formatNumber(mean, 2));
      }
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
        return { weights: state.weights.slice(), probs: state.probs.slice(), counts: state.counts.slice(), rolls: state.rolls, sampleMean: state.acc.mean, expectation: stats.expectation(FACES, state.probs), auto: state.auto };
      },
      constants: { FACES: FACES.slice(), DEFAULT_WEIGHTS: DEFAULT_WEIGHTS.slice(), MAX_W: MAX_W, INITIAL_ROLLS: INITIAL_ROLLS, MAX_ROLLS: MAX_ROLLS }
    };
  };
})();
