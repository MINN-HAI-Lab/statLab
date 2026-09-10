/*
  confidence-intervals__ci-meaning.js — SYLLABUS §8.1 "What “95% confident” means".

  Teaches: "95 %" describes the procedure, not one interval — in the long run
  about 95 % of the intervals built this way capture the true mean.

  Public:  demos.initCiMeaning(containerEl) → api { setLevel(pct), setN(n), draw(k), reset(),
           startAuto(), stopAuto(), state() }
  Uses:    stats.sampleNormal, stats.mean, stats.normalQuantile;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart, ui.prefersReducedMotion;  d3 scales.

  Pattern per D-019 / D-024. Population N(μ = 50, σ = 10) with σ known, so each
  interval is x̄ ± z* σ/√n (OpenStax §8.1). The last SHOWN intervals are drawn as
  stacked segments; the totals count every interval ever drawn.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MU = 50, SIGMA = 10;
  var X_MIN = 30, X_MAX = 70;
  var MIN_LEVEL = 80, MAX_LEVEL = 99, DEFAULT_LEVEL = 95;
  var MIN_N = 2, MAX_N = 100, DEFAULT_N = 20;
  var SHOWN = 40, INITIAL = 10, MAX_TOTAL = 100000;
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_DRAWS = 15;

  window.demos.initCiMeaning = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = { level: DEFAULT_LEVEL, n: DEFAULT_N, recent: [], total: 0, captured: 0, auto: false };
    var timer = null;

    /* ---- controls ---------------------------------------------------- */
    var drawOne = ui.button({ label: "Draw 1 sample", kind: "primary", onClick: function () { draw(1); } });
    var drawMany = ui.button({ label: "Draw 50", onClick: function () { draw(50); } });
    var autoButton = ui.button({ label: "Auto-draw", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [drawOne, drawMany, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var levelSlider = ui.slider({ label: "Confidence level (%)", min: MIN_LEVEL, max: MAX_LEVEL, step: 1, value: DEFAULT_LEVEL, onChange: setLevel });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var totalOut = ui.readout({ label: "Intervals", decimals: 0 });
    var capturedOut = ui.readout({ label: "Captured μ", decimals: 0 });
    var rateOut = ui.readout({ label: "Capture rate", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var nominalOut = ui.readout({ label: "Nominal", format: function (v) { return v + " %"; }, accent: true });
    var marginOut = ui.readout({ label: "Margin of error z*σ/√n", decimals: 2 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_TOTAL.toLocaleString() + " intervals reached. Press Reset to start again.";

    container.appendChild(controls);
    container.appendChild(levelSlider.el);
    container.appendChild(nSlider.el);

    /* ---- chart: stacked intervals ---------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.7, minHeight: 320, maxHeight: 520, margin: { top: 18 }, ariaLabel: "The most recent confidence intervals stacked as horizontal segments; a dashed vertical line marks the true mean; intervals that miss it are orange and dashed" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]);
    var rows = frame.plot.append("g");
    var muLine = frame.plot.append("line").attr("class", "line line--reference");
    var muLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -6).text("μ = " + MU);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Each segment is one sample's interval, newest at the top, and the dot is that sample's mean. Segments that miss μ are orange and dashed.";

    container.appendChild(ui.readoutRow([totalOut, capturedOut, rateOut, nominalOut, marginOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(note);

    frame.onResize(function (f) { x.range([0, f.width]); f.xAxis(x, { label: "value", ticks: 8 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function zStar() { return stats.normalQuantile(0.5 + state.level / 200); }
    function margin() { return zStar() * SIGMA / Math.sqrt(state.n); }

    function draw(k) {
      var added = 0, m = margin();
      while (added < k && state.total < MAX_TOTAL) {
        var sample = [];
        for (var i = 0; i < state.n; i++) sample.push(stats.sampleNormal(MU, SIGMA));
        var xbar = stats.mean(sample);
        var iv = { xbar: xbar, lo: xbar - m, hi: xbar + m };
        iv.hit = iv.lo <= MU && MU <= iv.hi;
        state.recent.push(iv);
        if (state.recent.length > SHOWN) state.recent.shift();
        state.total += 1;
        if (iv.hit) state.captured += 1;
        added += 1;
      }
      if (state.total >= MAX_TOTAL) stopAuto();
      render();
      return added;
    }
    function clearRun() { state.recent = []; state.total = 0; state.captured = 0; }
    function setLevel(v) { state.level = clamp(Math.round(v), MIN_LEVEL, MAX_LEVEL); clearRun(); draw(INITIAL); }
    function setN(v) { state.n = clamp(Math.round(v), MIN_N, MAX_N); clearRun(); draw(INITIAL); }
    function reset() { stopAuto(); levelSlider.set(DEFAULT_LEVEL, true); nSlider.set(DEFAULT_N, true); state.level = DEFAULT_LEVEL; state.n = DEFAULT_N; clearRun(); draw(INITIAL); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var capped = state.total >= MAX_TOTAL, rate = state.total ? state.captured / state.total : NaN;
      totalOut.set(state.total); capturedOut.set(state.captured); rateOut.set(rate); nominalOut.set(state.level); marginOut.set(margin());
      drawOne.disabled = capped; drawMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-draw";
      note.hidden = !capped;
      status.textContent = state.total < 50 ? "Keep drawing. With only " + state.total + " intervals the capture rate still swings, and the " + state.level + " % promise is about the long run."
        : "After " + state.total + " intervals the capture rate is " + (rate * 100).toFixed(1) + " %, against the promised " + state.level + " %. Each interval either contains μ or it does not. The percentage belongs to the method.";

      var rowH = frame.height / SHOWN;
      var items = state.recent.slice().reverse();
      var sel = rows.selectAll("g.ci-row").data(items, function (d, i) { return i; });
      sel.exit().remove();
      var enter = sel.enter().append("g").attr("class", "ci-row");
      enter.append("line").attr("class", "ci-line");
      enter.append("circle").attr("class", "ci-dot").attr("r", 3);
      var all = enter.merge(sel).attr("transform", function (d, i) { return "translate(0," + ((i + 0.5) * rowH) + ")"; });
      all.select("line").attr("class", function (d) { return "ci-line" + (d.hit ? "" : " ci-line--miss"); })
        .attr("x1", function (d) { return x(clamp(d.lo, X_MIN, X_MAX)); }).attr("x2", function (d) { return x(clamp(d.hi, X_MIN, X_MAX)); });
      all.select("circle").attr("class", function (d) { return "ci-dot" + (d.hit ? "" : " ci-dot--miss"); }).attr("cx", function (d) { return x(clamp(d.xbar, X_MIN, X_MAX)); });
      muLine.attr("x1", x(MU)).attr("x2", x(MU)).attr("y1", 0).attr("y2", frame.height);
      muLabel.attr("x", x(MU));
    }

    /* ---- auto loop ------------------------------------------------------- */
    function startAuto() {
      if (state.auto || state.total >= MAX_TOTAL) return;
      state.auto = true;
      if (reduced) timer = window.setInterval(function () { draw(STEP_DRAWS); }, STEP_INTERVAL);
      else { var step = function () { if (!state.auto) return; draw(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); }; timer = window.requestAnimationFrame(step); }
      render();
    }
    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null; render();
    }

    /* ---- initial state (D5) ------------------------------------------- */
    draw(INITIAL);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setLevel: function (v) { levelSlider.set(v, true); setLevel(v); },
      setN: function (v) { nSlider.set(v, true); setN(v); },
      draw: draw, reset: reset, startAuto: startAuto, stopAuto: stopAuto,
      state: function () { return { level: state.level, n: state.n, total: state.total, captured: state.captured, recent: state.recent.map(function (d) { return Object.assign({}, d); }), z: zStar(), margin: margin(), auto: state.auto }; },
      constants: { MU: MU, SIGMA: SIGMA, SHOWN: SHOWN, INITIAL: INITIAL, MAX_TOTAL: MAX_TOTAL, MIN_LEVEL: MIN_LEVEL, MAX_LEVEL: MAX_LEVEL, DEFAULT_LEVEL: DEFAULT_LEVEL, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N }
    };
  };
})();
