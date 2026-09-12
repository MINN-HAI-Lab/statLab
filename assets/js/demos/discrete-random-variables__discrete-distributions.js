/*
  discrete-random-variables__discrete-distributions.js — SYLLABUS §4.3 "The named
  discrete distributions".

  Teaches: binomial, geometric, hypergeometric, and Poisson each model a
  recognisable situation; draws pile up under the theoretical PMF.

  Public:  demos.initDiscreteDistributions(containerEl) → api { setDistribution(key),
           setParam(name, v), draw(n), reset(), startAuto(), stopAuto(), state() }
  Uses:    stats.sampleBinomial, stats.sampleGeometric, stats.sampleHypergeometric,
           stats.samplePoisson, stats.binomialPmf, stats.geometricPmf,
           stats.hypergeometricPmf, stats.poissonPmf, stats.expectation,
           stats.discreteVariance, stats.welford;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart, ui.prefersReducedMotion;  d3 scales.

  Pattern per D-019 / D-020. E[X] and Var(X) come from the PMF table itself
  (summed until the tail is below 1e-12), through the tested table functions.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var DISTS = {
    binomial: {
      label: "Binomial", scenario: "Count the successes in n independent yes/no trials with the same chance p each time — defective items in a batch of 20, say.",
      params: [{ key: "n", label: "Trials n", min: 1, max: 50, step: 1, value: 10 }, { key: "p", label: "Success chance p", min: 0, max: 1, step: 0.01, value: 0.3 }],
      support: function (q) { return [0, q.n]; },
      pmf: function (k, q) { return stats.binomialPmf(k, q.n, q.p); },
      sample: function (q) { return stats.sampleBinomial(q.n, q.p); }
    },
    geometric: {
      label: "Geometric", scenario: "Count the trials until the first success — how many calls until someone answers.",
      params: [{ key: "p", label: "Success chance p", min: 0.05, max: 1, step: 0.01, value: 0.3 }],
      support: function (q) { return [1, Infinity]; },
      pmf: function (k, q) { return stats.geometricPmf(k, q.p); },
      sample: function (q) { return stats.sampleGeometric(q.p); }
    },
    hypergeometric: {
      label: "Hypergeometric", scenario: "Draw n items without replacement from N, of which K are successes, and count the successes — aces in a five-card hand.",
      params: [{ key: "N", label: "Population N", min: 5, max: 60, step: 1, value: 52 }, { key: "K", label: "Successes in population K", min: 0, max: 60, step: 1, value: 4 }, { key: "n", label: "Draws n", min: 1, max: 60, step: 1, value: 5 }],
      support: function (q) { return [Math.max(0, q.n - (q.N - q.K)), Math.min(q.n, q.K)]; },
      pmf: function (k, q) { return stats.hypergeometricPmf(k, q.N, q.K, q.n); },
      sample: function (q) { return stats.sampleHypergeometric(q.N, q.K, q.n); }
    },
    poisson: {
      label: "Poisson", scenario: "Count rare events in a fixed stretch of time or space when only the average rate λ is known — calls per hour, typos per page.",
      params: [{ key: "lambda", label: "Average rate λ", min: 0.5, max: 20, step: 0.5, value: 3 }],
      support: function (q) { return [0, Infinity]; },
      pmf: function (k, q) { return stats.poissonPmf(k, q.lambda); },
      sample: function (q) { return stats.samplePoisson(q.lambda); }
    }
  };
  var ORDER = ["binomial", "geometric", "hypergeometric", "poisson"];
  var DEFAULT_DIST = "binomial";
  var INITIAL_DRAWS = 10, MAX_DRAWS = 100000;
  var TAIL = 1e-14, MAX_TERMS = 5000, DISPLAY_TAIL = 0.002, MAX_SHOWN = 60;   // table stops when the tail < TAIL (moments then accurate to ~1e-10)
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_DRAWS = 15;

  window.demos.initDiscreteDistributions = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = { dist: DEFAULT_DIST, params: {}, counts: {}, draws: 0, offChart: 0, acc: stats.welford(), auto: false, table: null, kMin: 0, kMax: 0 };
    var timer = null;
    var sliders = {};

    /* ---- controls ---------------------------------------------------- */
    var picker = document.createElement("div");
    picker.className = "ui-controls";
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", "Distribution");
    var pickButtons = {};
    ORDER.forEach(function (key) {
      var b = ui.button({ label: DISTS[key].label, onClick: function () { setDistribution(key); } });
      b.setAttribute("aria-pressed", "false");
      pickButtons[key] = b;
      picker.appendChild(b);
    });
    var drawOne = ui.button({ label: "Draw 1", kind: "primary", onClick: function () { draw(1); } });
    var drawMany = ui.button({ label: "Draw 100", onClick: function () { draw(100); } });
    var autoButton = ui.button({ label: "Auto-draw", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    [drawOne, drawMany, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var paramBox = document.createElement("div");
    paramBox.className = "params";
    var scenario = document.createElement("p");
    scenario.className = "demo__status";
    scenario.setAttribute("role", "status");

    var drawsOut = ui.readout({ label: "Draws", decimals: 0 });
    var meanOut = ui.readout({ label: "Sample mean", decimals: 2, accent: true });
    var muOut = ui.readout({ label: "E[X]", decimals: 2, accent: true });
    var s2Out = ui.readout({ label: "Sample variance", decimals: 2 });
    var varOut = ui.readout({ label: "Var(X)", decimals: 2 });
    var offOut = ui.readout({ label: "Draws beyond the axis", decimals: 0 });
    var note = document.createElement("p");
    note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_DRAWS.toLocaleString() + " draws reached. Press Reset to start again.";

    container.appendChild(picker);
    container.appendChild(scenario);
    container.appendChild(paramBox);
    container.appendChild(controls);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.5, minHeight: 240, ariaLabel: "Theoretical probability of each value (light bars) beside the proportion drawn so far (dark bars)" });
    var x = d3.scaleLinear();
    var y = d3.scaleLinear();
    var theory = frame.plot.append("g");
    var empirical = frame.plot.append("g");
    var legend = document.createElement("p");
    legend.className = "demo__status";
    legend.textContent = "Light bars: P(X = k). Dark bars: share of draws so far.";

    container.appendChild(ui.readoutRow([drawsOut, meanOut, muOut, s2Out, varOut, offOut]));
    container.appendChild(legend);
    container.appendChild(note);

    frame.onResize(function (f) {
      x.range([0, f.width]);
      y.range([f.height, 0]);
      render();
    });

    /* ---- parameters and the PMF table ------------------------------------ */
    function buildSliders() {
      paramBox.textContent = "";
      sliders = {};
      DISTS[state.dist].params.forEach(function (p) {
        var s = ui.slider({ label: p.label, min: p.min, max: p.max, step: p.step, value: state.params[p.key], onChange: function (v) { setParam(p.key, v); } });
        sliders[p.key] = s;
        paramBox.appendChild(s.el);
      });
    }

    function defaultParams(key) {
      var q = {};
      DISTS[key].params.forEach(function (p) { q[p.key] = p.value; });
      return q;
    }

    /** Hypergeometric constraints: K ≤ N and n ≤ N; sliders follow. */
    function constrain() {
      if (state.dist !== "hypergeometric") return;
      var q = state.params;
      if (q.K > q.N) { q.K = q.N; if (sliders.K) sliders.K.set(q.K, true); }
      if (q.n > q.N) { q.n = q.N; if (sliders.n) sliders.n.set(q.n, true); }
    }

    /** PMF over the support until the remaining tail is below TAIL (or MAX_TERMS). */
    function buildTable() {
      var d = DISTS[state.dist], q = state.params, sup = d.support(q);
      var values = [], probs = [], cumulative = 0, k = sup[0];
      while (k <= sup[1] && values.length < MAX_TERMS) {
        var pr = d.pmf(k, q);
        values.push(k); probs.push(pr); cumulative += pr;
        if (isFinite(sup[1]) ? k === sup[1] : (1 - cumulative < TAIL && k >= sup[0])) break;
        k += 1;
      }
      // Display window: a finite support is shown whole (its empty tail bins are part of the
      // lesson); an infinite one stops where the remaining mass is below DISPLAY_TAIL. Both capped.
      var kMax = values[values.length - 1], shownMass = 0;
      if (!isFinite(sup[1])) {
        for (var i = 0; i < values.length; i++) { shownMass += probs[i]; if (1 - shownMass < DISPLAY_TAIL) { kMax = values[i]; break; } }
      }
      kMax = Math.min(kMax, sup[0] + MAX_SHOWN);
      state.table = { values: values, probs: probs, total: cumulative };
      state.kMin = sup[0];
      state.kMax = Math.max(kMax, sup[0]);
    }

    /* ---- updates ----------------------------------------------------------- */
    function clearRun() { state.counts = {}; state.draws = 0; state.offChart = 0; state.acc = stats.welford(); }

    function draw(n) {
      var d = DISTS[state.dist], added = 0;
      while (added < n && state.draws < MAX_DRAWS) {
        var k = d.sample(state.params);
        state.counts[k] = (state.counts[k] || 0) + 1;
        if (k > state.kMax) state.offChart += 1;
        state.acc.push(k);
        state.draws += 1;
        added += 1;
      }
      if (state.draws >= MAX_DRAWS) stopAuto();
      render();
      return added;
    }

    function setDistribution(key) {
      if (!DISTS[key]) return;
      stopAuto();
      state.dist = key;
      state.params = defaultParams(key);
      buildSliders();
      buildTable();
      clearRun();
      draw(INITIAL_DRAWS);
    }

    function setParam(name, v) {
      var spec = null;
      DISTS[state.dist].params.forEach(function (p) { if (p.key === name) spec = p; });
      if (!spec) return;
      state.params[name] = Math.max(spec.min, Math.min(spec.max, v));
      constrain();
      buildTable();
      clearRun();
      draw(INITIAL_DRAWS);
    }

    function reset() { setDistribution(DEFAULT_DIST); }

    /* ---- render -------------------------------------------------------------- */
    function render() {
      if (!state.table) return;
      var t = state.table, capped = state.draws >= MAX_DRAWS;
      var mu = stats.expectation(t.values, t.probs), variance = stats.discreteVariance(t.values, t.probs);
      ORDER.forEach(function (k) { pickButtons[k].setAttribute("aria-pressed", String(k === state.dist)); });
      scenario.textContent = DISTS[state.dist].label + ": " + DISTS[state.dist].scenario;
      drawsOut.set(state.draws); meanOut.set(state.acc.mean); muOut.set(mu); s2Out.set(state.acc.variance); varOut.set(variance); offOut.set(state.offChart);
      drawOne.disabled = capped; drawMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-draw";
      note.hidden = !capped;

      var ks = [];
      for (var k = state.kMin; k <= state.kMax; k++) ks.push(k);
      x.domain([state.kMin - 0.5, state.kMax + 0.5]);
      // The axis has to hold everything this chart draws, not just the theory
      // bars. Early on a handful of draws can put a proportion well above the
      // tallest probability (five of ten draws on one k is 0.5 against a 0.4
      // axis), and the empirical bar was then drawn at a negative y, escaping
      // the frame and painting over the buttons above it (D-053). Quantising to
      // tenths keeps the axis still except when the data genuinely outgrow it.
      var pmax = Math.max.apply(null, t.probs.slice(0, ks.length));
      var emax = 0;
      if (state.draws) {
        for (var ei = 0; ei < ks.length; ei++) {
          var share = (state.counts[ks[ei]] || 0) / state.draws;
          if (share > emax) emax = share;
        }
      }
      y.domain([0, Math.min(1, Math.ceil(Math.max(pmax, emax) * 10 + 0.5) / 10)]);
      frame.xAxis(x, { label: "k", ticks: Math.min(ks.length, 12), format: d3.format("d") });
      frame.yGrid(y, 4);
      frame.yAxis(y, { label: "probability / proportion", ticks: 4 });
      var half = (x(1) - x(0)) * 0.42;
      var th = theory.selectAll("rect.bar--theory").data(ks);
      th.exit().remove();
      th.enter().append("rect").attr("class", "bar bar--theory").merge(th)
        .attr("x", function (kk) { return x(kk) - half; }).attr("width", Math.max(1, half))
        .attr("y", function (kk) { return y(t.probs[kk - state.kMin] || 0); }).attr("height", function (kk) { return frame.height - y(t.probs[kk - state.kMin] || 0); });
      var em = empirical.selectAll("rect.bar--empirical").data(ks);
      em.exit().remove();
      em.enter().append("rect").attr("class", "bar bar--empirical").merge(em)
        .attr("x", function (kk) { return x(kk); }).attr("width", Math.max(1, half))
        .attr("y", function (kk) { return y(state.draws ? (state.counts[kk] || 0) / state.draws : 0); })
        .attr("height", function (kk) { return frame.height - y(state.draws ? (state.counts[kk] || 0) / state.draws : 0); });
    }

    /* ---- auto loop ------------------------------------------------------------ */
    function startAuto() {
      if (state.auto || state.draws >= MAX_DRAWS) return;
      state.auto = true;
      if (reduced) timer = window.setInterval(function () { draw(STEP_DRAWS); }, STEP_INTERVAL);
      else { var step = function () { if (!state.auto) return; draw(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); }; timer = window.requestAnimationFrame(step); }
      render();
    }
    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null;
      render();
    }

    /* ---- initial state (D5) ------------------------------------------------- */
    setDistribution(DEFAULT_DIST);

    /* ---- api ---------------------------------------------------------------------- */
    return {
      el: container,
      setDistribution: setDistribution,
      setParam: function (name, v) { if (sliders[name]) sliders[name].set(v, true); setParam(name, v); },
      draw: draw,
      reset: reset,
      startAuto: startAuto,
      stopAuto: stopAuto,
      state: function () {
        var t = state.table;
        return { dist: state.dist, params: Object.assign({}, state.params), draws: state.draws, offChart: state.offChart, counts: Object.assign({}, state.counts), sampleMean: state.acc.mean, sampleVariance: state.acc.variance, expectation: stats.expectation(t.values, t.probs), variance: stats.discreteVariance(t.values, t.probs), kMin: state.kMin, kMax: state.kMax, tableMass: t.total, auto: state.auto };
      },
      constants: { ORDER: ORDER.slice(), DEFAULT_DIST: DEFAULT_DIST, INITIAL_DRAWS: INITIAL_DRAWS, MAX_DRAWS: MAX_DRAWS, MAX_SHOWN: MAX_SHOWN }
    };
  };
})();
