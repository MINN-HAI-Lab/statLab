/*
  confidence-intervals__proportion-ci.js — SYLLABUS §8.3 "Intervals for proportions".

  Teaches: the same logic covers proportions — poll n voters, compute p̂, and
  the interval p̂ ± z*√(p̂(1−p̂)/n) captures the true p about level % of the time.

  Public:  demos.initProportionCi(containerEl) → api { setP(p), setN(n), setLevel(pct), poll(k),
           reset(), startAuto(), stopAuto(), state() }
  Uses:    stats.sampleBinomial, stats.normalQuantile;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart, ui.prefersReducedMotion;  d3 scales.

  Pattern per D-019 / D-024, the stacked-interval view of §8.1. The interval is
  OpenStax §8.3's normal approximation, shown as computed (it can poke past 0 or
  1 when n p̂ is small — the status line says when that happens).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MIN_P = 0.05, MAX_P = 0.95, DEFAULT_P = 0.4;
  var MIN_N = 10, MAX_N = 500, DEFAULT_N = 100;
  var MIN_LEVEL = 80, MAX_LEVEL = 99, DEFAULT_LEVEL = 95;
  var SHOWN = 40, INITIAL = 10, MAX_TOTAL = 100000;
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_POLLS = 15;

  window.demos.initProportionCi = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = { p: DEFAULT_P, n: DEFAULT_N, level: DEFAULT_LEVEL, recent: [], total: 0, captured: 0, auto: false };
    var timer = null;

    /* ---- controls ---------------------------------------------------- */
    var pollOne = ui.button({ label: "Poll " + DEFAULT_N + " voters", kind: "primary", onClick: function () { poll(1); } });
    var pollMany = ui.button({ label: "Poll 50 times", onClick: function () { poll(50); } });
    var autoButton = ui.button({ label: "Auto-poll", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [pollOne, pollMany, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var pSlider = ui.slider({ label: "True support p", min: MIN_P, max: MAX_P, step: 0.01, value: DEFAULT_P, onChange: setP });
    var nSlider = ui.slider({ label: "Voters per poll, n", min: MIN_N, max: MAX_N, step: 10, value: DEFAULT_N, onChange: setN });
    var levelSlider = ui.slider({ label: "Confidence level (%)", min: MIN_LEVEL, max: MAX_LEVEL, step: 1, value: DEFAULT_LEVEL, onChange: setLevel });

    var latestOut = ui.readout({ label: "Latest poll p̂ = x/n", format: function (v) { return v ? v.x + "/" + v.n + " = " + (v.x / v.n).toFixed(3) : "—"; } });
    var marginOut = ui.readout({ label: "Latest margin z*√(p̂(1−p̂)/n)", decimals: 3 });
    var totalOut = ui.readout({ label: "Polls", decimals: 0 });
    var capturedOut = ui.readout({ label: "Captured p", decimals: 0 });
    var rateOut = ui.readout({ label: "Capture rate", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var nominalOut = ui.readout({ label: "Nominal", format: function (v) { return v + " %"; }, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_TOTAL.toLocaleString() + " polls reached. Press Reset to start again.";

    container.appendChild(controls);
    container.appendChild(pSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(levelSlider.el);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.7, minHeight: 320, maxHeight: 520, margin: { top: 18 }, ariaLabel: "The most recent poll intervals stacked as segments on a 0 to 1 axis; a dashed line marks the true support" });
    var x = d3.scaleLinear().domain([0, 1]);
    var rows = frame.plot.append("g");
    var pLine = frame.plot.append("line").attr("class", "line line--reference");
    var pLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -6);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Each segment is one poll's interval, newest at the top, and the dot is that poll's p̂. Segments that miss the true p are orange and dashed.";

    container.appendChild(ui.readoutRow([latestOut, marginOut, totalOut, capturedOut, rateOut, nominalOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(note);

    frame.onResize(function (f) { x.range([0, f.width]); f.xAxis(x, { label: "proportion", ticks: 10 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function zStar() { return stats.normalQuantile(0.5 + state.level / 200); }

    function poll(k) {
      var added = 0, z = zStar();
      while (added < k && state.total < MAX_TOTAL) {
        var xs = stats.sampleBinomial(state.n, state.p), phat = xs / state.n;
        var m = z * Math.sqrt(phat * (1 - phat) / state.n);
        var iv = { x: xs, n: state.n, phat: phat, margin: m, lo: phat - m, hi: phat + m };
        iv.hit = iv.lo <= state.p && state.p <= iv.hi;
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
    function setP(v) { state.p = clamp(Math.round(v * 100) / 100, MIN_P, MAX_P); clearRun(); poll(INITIAL); }
    function setN(v) { state.n = clamp(Math.round(v / 10) * 10, MIN_N, MAX_N); pollOne.textContent = "Poll " + state.n + " voters"; clearRun(); poll(INITIAL); }
    function setLevel(v) { state.level = clamp(Math.round(v), MIN_LEVEL, MAX_LEVEL); clearRun(); poll(INITIAL); }
    function reset() { stopAuto(); pSlider.set(DEFAULT_P, true); nSlider.set(DEFAULT_N, true); levelSlider.set(DEFAULT_LEVEL, true); state.p = DEFAULT_P; state.n = DEFAULT_N; state.level = DEFAULT_LEVEL; pollOne.textContent = "Poll " + DEFAULT_N + " voters"; clearRun(); poll(INITIAL); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var capped = state.total >= MAX_TOTAL, rate = state.total ? state.captured / state.total : NaN;
      var latest = state.recent.length ? state.recent[state.recent.length - 1] : null;
      latestOut.set(latest); marginOut.set(latest ? latest.margin : NaN);
      totalOut.set(state.total); capturedOut.set(state.captured); rateOut.set(rate); nominalOut.set(state.level);
      pollOne.disabled = capped; pollMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-poll";
      note.hidden = !capped;
      var small = state.n * state.p < 5 || state.n * (1 - state.p) < 5;
      status.textContent = (small ? "Warning: n·p or n·(1 − p) is below 5, so the normal approximation behind this interval is shaky. Watch the capture rate fall short. " : "")
        + (state.total < 50 ? "Keep polling, because the capture rate settles only in the long run." : "After " + state.total + " polls, " + (rate * 100).toFixed(1) + " % captured the true p against the promised " + state.level + " %.");

      var rowH = frame.height / SHOWN;
      var items = state.recent.slice().reverse();
      var sel = rows.selectAll("g.ci-row").data(items, function (d, i) { return i; });
      sel.exit().remove();
      var enter = sel.enter().append("g").attr("class", "ci-row");
      enter.append("line").attr("class", "ci-line");
      enter.append("circle").attr("class", "ci-dot").attr("r", 3);
      var all = enter.merge(sel).attr("transform", function (d, i) { return "translate(0," + ((i + 0.5) * rowH) + ")"; });
      all.select("line").attr("class", function (d) { return "ci-line" + (d.hit ? "" : " ci-line--miss"); })
        .attr("x1", function (d) { return x(clamp(d.lo, 0, 1)); }).attr("x2", function (d) { return x(clamp(d.hi, 0, 1)); });
      all.select("circle").attr("class", function (d) { return "ci-dot" + (d.hit ? "" : " ci-dot--miss"); }).attr("cx", function (d) { return x(d.phat); });
      pLine.attr("x1", x(state.p)).attr("x2", x(state.p)).attr("y1", 0).attr("y2", frame.height);
      pLabel.attr("x", x(state.p)).text("p = " + state.p.toFixed(2));
    }

    /* ---- auto loop ------------------------------------------------------- */
    function startAuto() {
      if (state.auto || state.total >= MAX_TOTAL) return;
      state.auto = true;
      if (reduced) timer = window.setInterval(function () { poll(STEP_POLLS); }, STEP_INTERVAL);
      else { var step = function () { if (!state.auto) return; poll(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); }; timer = window.requestAnimationFrame(step); }
      render();
    }
    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null; render();
    }

    /* ---- initial state (D5) ------------------------------------------- */
    poll(INITIAL);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setP: function (v) { pSlider.set(v, true); setP(v); },
      setN: function (v) { nSlider.set(v, true); setN(v); },
      setLevel: function (v) { levelSlider.set(v, true); setLevel(v); },
      poll: poll, reset: reset, startAuto: startAuto, stopAuto: stopAuto,
      state: function () { return { p: state.p, n: state.n, level: state.level, total: state.total, captured: state.captured, recent: state.recent.map(function (d) { return Object.assign({}, d); }), z: zStar(), auto: state.auto }; },
      constants: { MIN_P: MIN_P, MAX_P: MAX_P, DEFAULT_P: DEFAULT_P, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, MIN_LEVEL: MIN_LEVEL, MAX_LEVEL: MAX_LEVEL, DEFAULT_LEVEL: DEFAULT_LEVEL, SHOWN: SHOWN, INITIAL: INITIAL, MAX_TOTAL: MAX_TOTAL }
    };
  };
})();
