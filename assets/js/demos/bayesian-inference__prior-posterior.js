/*
  bayesian-inference__prior-posterior.js — SYLLABUS §15.3 "Prior to posterior".

  Teaches: data update belief. With a Beta prior and Bernoulli data the posterior
  is Beta(a + successes, b + failures), so every observation nudges the curve and
  a confident prior only holds out for so long.

  Public:  demos.initPriorPosterior(containerEl) → api { setA(a), setB(b), setTrueP(p),
           observe(k), reset(), state() }
  Uses:    stats.sampleBernoulli, stats.betaPdf;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 scales/line.

  Pattern per D-019. Three curves share one axis and are told apart by dash
  pattern and by their own labels as well as colour: prior grey dashed,
  likelihood orange dotted (scaled to fit, since it is not a density in p),
  posterior solid blue. Changing the prior or the true p restarts the data.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MIN_SHAPE = 0.5, MAX_SHAPE = 20, DEFAULT_A = 2, DEFAULT_B = 2;
  var MIN_P = 0, MAX_P = 1, DEFAULT_TRUE_P = 0.7;
  var MAX_OBS = 500, BATCH = 10;
  var Y_HEADROOM = 1.12;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initPriorPosterior = function (container) {
    var state = { a: DEFAULT_A, b: DEFAULT_B, trueP: DEFAULT_TRUE_P, obs: [], successes: 0 };

    /* ---- controls ---------------------------------------------------- */
    var oneButton = ui.button({ label: "Observe one", kind: "primary", onClick: function () { observe(1); } });
    var batchButton = ui.button({ label: "Observe " + BATCH, onClick: function () { observe(BATCH); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(oneButton); controls.appendChild(batchButton); controls.appendChild(resetButton);
    var aSlider = ui.slider({ label: "Prior shape a (pull toward 1)", min: MIN_SHAPE, max: MAX_SHAPE, step: 0.5, value: DEFAULT_A, decimals: 1, onChange: setA });
    var bSlider = ui.slider({ label: "Prior shape b (pull toward 0)", min: MIN_SHAPE, max: MAX_SHAPE, step: 0.5, value: DEFAULT_B, decimals: 1, onChange: setB });
    var pSlider = ui.slider({ label: "The coin's true p (hidden from the maths)", min: MIN_P, max: MAX_P, step: 0.05, value: DEFAULT_TRUE_P, decimals: 2, onChange: setTrueP });

    var obsOut = ui.readout({ label: "Observations", decimals: 0 });
    var succOut = ui.readout({ label: "Successes", decimals: 0 });
    var priorMeanOut = ui.readout({ label: "Prior mean", decimals: 3 });
    var postMeanOut = ui.readout({ label: "Posterior mean", decimals: 3, accent: true });
    var postShapeOut = ui.readout({ label: "Posterior", decimals: 0, format: function () { return "Beta(" + fmt(state.a + state.successes) + ", " + fmt(state.b + (state.obs.length - state.successes)) + ")"; } });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "demo__status demo__note"; note.hidden = true;
    note.textContent = "Cap reached: " + MAX_OBS + " observations. Reset to start a new run.";

    function fmt(v) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }

    container.appendChild(aSlider.el);
    container.appendChild(bSlider.el);
    container.appendChild(pSlider.el);
    container.appendChild(controls);

    /* ---- chart ----------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.55, minHeight: 260, maxHeight: 360, margin: { top: 30, right: 20, bottom: 44, left: 54 }, ariaLabel: "The prior, the likelihood and the posterior for p drawn on one axis" });
    var x = d3.scaleLinear().domain([0, 1]), y = d3.scaleLinear();
    var priorPath = frame.plot.append("path").attr("class", "line line--reference");
    var likePath = frame.plot.append("path").attr("class", "line line--overlay line--dotted");
    var postPath = frame.plot.append("path").attr("class", "line line--strong");
    var trueLine = frame.plot.append("line").attr("class", "line line--dashed line--faint");
    var trueLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -14);
    var curveLabels = frame.plot.append("g");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Grey dashed: the prior, what you believed before any data. Orange dotted: the likelihood of the data alone, scaled to fit. Solid blue: the posterior, which is the prior multiplied by the likelihood and is exactly Beta(a + successes, b + failures).";

    container.appendChild(ui.readoutRow([obsOut, succOut, priorMeanOut, postMeanOut, postShapeOut]));
    container.appendChild(status);
    container.appendChild(note);
    container.appendChild(legend);

    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.xAxis(x, { label: "p", ticks: 10 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    function restart() { state.obs = []; state.successes = 0; render(); }
    function setA(v) { state.a = clamp(v, MIN_SHAPE, MAX_SHAPE); restart(); }
    function setB(v) { state.b = clamp(v, MIN_SHAPE, MAX_SHAPE); restart(); }
    function setTrueP(v) { state.trueP = clamp(v, MIN_P, MAX_P); restart(); }
    function observe(k) {
      var added = 0;
      while (added < k && state.obs.length < MAX_OBS) {
        var v = stats.sampleBernoulli(state.trueP);
        state.obs.push(v); state.successes += v; added++;
      }
      render();
      return added;
    }
    function reset() {
      aSlider.set(DEFAULT_A, true); bSlider.set(DEFAULT_B, true); pSlider.set(DEFAULT_TRUE_P, true);
      state.a = DEFAULT_A; state.b = DEFAULT_B; state.trueP = DEFAULT_TRUE_P;
      restart();
    }
    function posterior() { return { a: state.a + state.successes, b: state.b + (state.obs.length - state.successes) }; }
    function priorMean() { return state.a / (state.a + state.b); }
    function posteriorMean() { var q = posterior(); return q.a / (q.a + q.b); }
    /** L(p) ∝ p^s (1−p)^f, the same shape as Beta(s+1, f+1) — used for drawing only. */
    function likelihoodShape(p) {
      var s = state.successes, f = state.obs.length - s;
      if (!state.obs.length) return 0;
      return stats.betaPdf(p, s + 1, f + 1);
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var q = posterior(), n = state.obs.length, atCap = n >= MAX_OBS;
      oneButton.disabled = atCap; batchButton.disabled = atCap; note.hidden = !atCap;
      obsOut.set(n); succOut.set(state.successes); priorMeanOut.set(priorMean()); postMeanOut.set(posteriorMean()); postShapeOut.set(0);
      status.textContent = n === 0
        ? "No data yet, so the posterior is still the prior, Beta(" + fmt(state.a) + ", " + fmt(state.b) + ") with mean " + priorMean().toFixed(3) + ". Observe a few and watch it move."
        : "After " + n + " observation" + (n === 1 ? "" : "s") + " with " + state.successes + " success" + (state.successes === 1 ? "" : "es") + ", the posterior is Beta(" + fmt(q.a) + ", " + fmt(q.b) + "): mean " + posteriorMean().toFixed(3) + ", against a prior mean of " + priorMean().toFixed(3) + " and a true p of " + state.trueP.toFixed(2) + ". Each observation adds 1 to a or to b, so a confident prior takes more data to overturn.";

      var steps = 240, pts = [], i, v, peak = 0;
      var prior = [], like = [], post = [], likePeak = 0;
      for (i = 0; i <= steps; i++) {
        v = i / steps;
        var pr = stats.betaPdf(v, state.a, state.b), po = stats.betaPdf(v, q.a, q.b), li = likelihoodShape(v);
        if (isFinite(pr)) peak = Math.max(peak, pr);
        if (isFinite(po)) peak = Math.max(peak, po);
        if (isFinite(li)) likePeak = Math.max(likePeak, li);
        prior.push([v, pr]); post.push([v, po]); like.push([v, li]);
      }
      if (!(peak > 0)) peak = 1;
      y.domain([0, peak * Y_HEADROOM]);
      frame.yGrid(y, 4); frame.yAxis(y, { label: "density", ticks: 4 });
      var scale = likePeak > 0 ? peak / likePeak : 0;
      var line = d3.line()
        .defined(function (d) { return isFinite(d[1]); })
        .x(function (d) { return x(d[0]); })
        .y(function (d) { return y(Math.min(d[1], peak * Y_HEADROOM)); });
      priorPath.attr("d", line(prior));
      postPath.attr("d", line(post));
      likePath.style("display", n ? null : "none");
      if (n) likePath.attr("d", line(like.map(function (d) { return [d[0], d[1] * scale]; })));
      trueLine.attr("x1", x(state.trueP)).attr("x2", x(state.trueP)).attr("y1", 0).attr("y2", frame.height);
      trueLabel.attr("x", x(state.trueP)).text("true p = " + state.trueP.toFixed(2));

      var labels = [
        { text: "posterior", at: posteriorMean(), cls: "marker-label" },
        { text: "prior", at: priorMean(), cls: "marker-label marker-label--soft" }
      ];
      var ls = curveLabels.selectAll("text").data(labels);
      ls.enter().append("text").attr("text-anchor", "middle").merge(ls)
        .attr("class", function (d) { return d.cls; })
        .attr("x", function (d) { return clamp(x(d.at), 30, frame.width - 30); })
        .attr("y", function (d, i2) { return 12 + i2 * 16; })
        .text(function (d) { return d.text; });
    }

    /* ---- initial state (D5) ------------------------------------------- */
    observe(BATCH);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setA: function (v) { aSlider.set(v, true); setA(v); },
      setB: function (v) { bSlider.set(v, true); setB(v); },
      setTrueP: function (v) { pSlider.set(v, true); setTrueP(v); },
      observe: observe, reset: reset,
      state: function () {
        var q = posterior();
        return { a: state.a, b: state.b, trueP: state.trueP, obs: state.obs.slice(), n: state.obs.length,
          successes: state.successes, failures: state.obs.length - state.successes,
          posterior: q, priorMean: priorMean(), posteriorMean: posteriorMean() };
      },
      constants: { MIN_SHAPE: MIN_SHAPE, MAX_SHAPE: MAX_SHAPE, DEFAULT_A: DEFAULT_A, DEFAULT_B: DEFAULT_B, DEFAULT_TRUE_P: DEFAULT_TRUE_P, MAX_OBS: MAX_OBS, BATCH: BATCH }
    };
  };
})();
