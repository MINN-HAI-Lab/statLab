/*
  hypothesis-testing__p-value.js — SYLLABUS §9.2 "The p-value".

  Teaches: a p-value is the probability, if H₀ were true, of data at least this
  extreme. Under a true H₀ p-values are spread evenly, so 5 % of them fall
  below 0.05 — that is the Type I error rate.

  Public:  demos.initPValue(containerEl) → api { setTruth(key), setEffect(d), setN(n), draw(k),
           reset(), startAuto(), stopAuto(), state() }   key ∈ "null" | "effect"
  Uses:    stats.sampleNormal, stats.mean, stats.normalPdf, stats.normalCdf;  ui.slider, ui.button,
           ui.readout, ui.readoutRow, ui.chart, ui.prefersReducedMotion;  d3 scales/line/area.

  Pattern per D-019 / D-024. Two-sided z-test of H₀: μ = 50 with σ = 10 known
  (OpenStax §9.3–9.4): z = (x̄ − 50)/(σ/√n), p = 2·P(Z ≥ |z|). Top: the H₀
  sampling distribution with the latest x̄ and its two shaded tails. Bottom: the
  histogram of p-values from every test run so far.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MU0 = 50, SIGMA = 10;
  var X_MIN = 40, X_MAX = 60;
  var MIN_EFFECT = 0.5, MAX_EFFECT = 10, DEFAULT_EFFECT = 5;
  var MIN_N = 2, MAX_N = 100, DEFAULT_N = 25;
  var ALPHA = 0.05, P_BINS = 20;
  var INITIAL = 1, MAX_TESTS = 100000;
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_DRAWS = 15;

  window.demos.initPValue = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = { truth: "null", effect: DEFAULT_EFFECT, n: DEFAULT_N, xbar: NaN, tests: 0, small: 0, bins: [], auto: false };
    var timer = null;

    /* ---- controls ---------------------------------------------------- */
    var truthGroup = document.createElement("div"); truthGroup.className = "ui-controls"; truthGroup.setAttribute("role", "group"); truthGroup.setAttribute("aria-label", "What is actually true");
    var truthButtons = {
      "null": ui.button({ label: "H₀ is true (μ = 50)", onClick: function () { setTruth("null"); } }),
      effect: ui.button({ label: "H₀ is false (μ = 50 + effect)", onClick: function () { setTruth("effect"); } })
    };
    Object.keys(truthButtons).forEach(function (k) { truthButtons[k].setAttribute("aria-pressed", "false"); truthGroup.appendChild(truthButtons[k]); });
    var drawOne = ui.button({ label: "Draw a sample", kind: "primary", onClick: function () { draw(1); } });
    var drawMany = ui.button({ label: "Run 100 tests", onClick: function () { draw(100); } });
    var autoButton = ui.button({ label: "Auto", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    [drawOne, drawMany, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });
    var effectSlider = ui.slider({ label: "Effect when H₀ is false: μ − 50", min: MIN_EFFECT, max: MAX_EFFECT, step: 0.5, value: DEFAULT_EFFECT, onChange: setEffect });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var xbarOut = ui.readout({ label: "Latest x̄", decimals: 2 });
    var zOut = ui.readout({ label: "z", decimals: 2 });
    var pOut = ui.readout({ label: "p-value", decimals: 4, accent: true });
    var testsOut = ui.readout({ label: "Tests run", decimals: 0 });
    var shareOut = ui.readout({ label: "Share with p < 0.05", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "muted demo__note"; note.hidden = true;
    note.textContent = "Maximum of " + MAX_TESTS.toLocaleString() + " tests reached. Press Reset to start again.";

    container.appendChild(truthGroup);
    container.appendChild(effectSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- top: H₀ sampling distribution with the latest x̄ ---------------- */
    var topHost = document.createElement("div"); container.appendChild(topHost);
    var top = ui.chart(topHost, { aspect: 0.36, minHeight: 190, margin: { top: 22, bottom: 44 }, ariaLabel: "Sampling distribution of the mean if the null hypothesis is true, with the latest sample mean marked and the tail areas beyond it shaded" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear();
    var tails = top.plot.append("path").attr("class", "area area--alpha");
    var curve = top.plot.append("path").attr("class", "line line--strong");
    var muLine = top.plot.append("line").attr("class", "line line--reference");
    var xbarMark = top.plot.append("path").attr("class", "mark mark--strong").attr("d", "M-7,0L7,0L0,-11Z");
    var xbarLabel = top.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -8);
    var mirrorMark = top.plot.append("path").attr("class", "mark mark--hollow").attr("d", "M-7,0L7,0L0,-11Z");
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
    var areaGen = d3.area().x(function (d) { return x(d[0]); }).y0(function () { return top.height; }).y1(function (d) { return y(d[1]); });

    /* ---- bottom: histogram of p-values ---------------------------------- */
    var botHost = document.createElement("div"); container.appendChild(botHost);
    var bot = ui.chart(botHost, { aspect: 0.36, minHeight: 190, margin: { top: 18 }, ariaLabel: "Histogram of the p-values from every test run so far, with 0.05 marked" });
    var px = d3.scaleLinear().domain([0, 1]), py = d3.scaleLinear();
    var bars = bot.plot.append("g");
    var alphaLine = bot.plot.append("line").attr("class", "line line--reference");
    var alphaLabel = bot.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "start").attr("y", -4).text("0.05");
    var uniformLine = bot.plot.append("line").attr("class", "line line--overlay");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Top: where x̄ would land if H₀ were true, and the shaded tails beyond ±|x̄ − 50| add up to the p-value. Bottom: every p-value so far, with the orange line showing the flat shape they take when H₀ is true.";

    container.appendChild(ui.readoutRow([xbarOut, zOut, pOut, testsOut, shareOut]));
    container.appendChild(status);
    container.appendChild(legend);
    container.appendChild(note);

    top.onResize(function (f) { x.range([0, f.width]); y.range([f.height, 0]); f.xAxis(x, { label: "sample mean x̄", ticks: 10 }); render(); });
    bot.onResize(function (f) { px.range([0, f.width]); py.range([f.height, 0]); f.xAxis(px, { label: "p-value", ticks: 10 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function se() { return SIGMA / Math.sqrt(state.n); }
    function trueMean() { return state.truth === "effect" ? MU0 + state.effect : MU0; }
    function zOf(xbar) { return (xbar - MU0) / se(); }
    function pOf(xbar) { return 2 * (1 - stats.normalCdf(Math.abs(zOf(xbar)))); }

    function draw(k) {
      var added = 0, mu = trueMean();
      while (added < k && state.tests < MAX_TESTS) {
        var sample = [];
        for (var i = 0; i < state.n; i++) sample.push(stats.sampleNormal(mu, SIGMA));
        state.xbar = stats.mean(sample);
        var p = pOf(state.xbar);
        state.bins[clamp(Math.floor(p * P_BINS), 0, P_BINS - 1)] += 1;
        if (p < ALPHA) state.small += 1;
        state.tests += 1; added += 1;
      }
      if (state.tests >= MAX_TESTS) stopAuto();
      render();
      return added;
    }
    function clearRun() { state.tests = 0; state.small = 0; state.xbar = NaN; state.bins = []; for (var i = 0; i < P_BINS; i++) state.bins.push(0); }
    function setTruth(key) { if (!truthButtons[key]) return; stopAuto(); state.truth = key; clearRun(); draw(INITIAL); }
    function setEffect(d) { state.effect = clamp(d, MIN_EFFECT, MAX_EFFECT); if (state.truth === "effect") { clearRun(); draw(INITIAL); } else render(); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); clearRun(); draw(INITIAL); }
    function reset() { stopAuto(); effectSlider.set(DEFAULT_EFFECT, true); nSlider.set(DEFAULT_N, true); state.effect = DEFAULT_EFFECT; state.n = DEFAULT_N; setTruth("null"); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.bins.length) return;
      var s = se(), capped = state.tests >= MAX_TESTS, share = state.tests ? state.small / state.tests : NaN;
      Object.keys(truthButtons).forEach(function (k) { truthButtons[k].setAttribute("aria-pressed", String(k === state.truth)); });
      var have = isFinite(state.xbar), z = have ? zOf(state.xbar) : NaN, p = have ? pOf(state.xbar) : NaN;
      xbarOut.set(state.xbar); zOut.set(z); pOut.set(p); testsOut.set(state.tests); shareOut.set(share);
      drawOne.disabled = capped; drawMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto";
      note.hidden = !capped;
      status.textContent = state.truth === "null"
        ? "H₀ is true here, so every p < 0.05 is a false alarm. Run many tests and about 5 % of them cross the line. That is the Type I error rate, by design."
        : "H₀ is false here (μ = " + trueMean() + "), so p < 0.05 is a correct rejection. The share crossing the line is the test's power. Raise n or the effect and watch it climb.";

      y.domain([0, stats.normalPdf(0, 0, SIGMA / Math.sqrt(MAX_N)) * 1.1]);
      var pts = [], tl = [], tr = [];
      var d = have ? Math.abs(state.xbar - MU0) : 0;
      for (var i = 0; i <= 400; i++) {
        var v = X_MIN + (X_MAX - X_MIN) * i / 400, dens = stats.normalPdf(v, MU0, s);
        pts.push([v, dens]);
        if (have && v <= MU0 - d) tl.push([v, dens]);
        if (have && v >= MU0 + d) tr.push([v, dens]);
      }
      curve.attr("d", lineGen(pts));
      if (have) { tl.push([MU0 - d, stats.normalPdf(MU0 - d, MU0, s)]); tr.unshift([MU0 + d, stats.normalPdf(MU0 + d, MU0, s)]); }
      tails.attr("d", have ? areaGen(tl) + areaGen(tr) : null);
      muLine.attr("x1", x(MU0)).attr("x2", x(MU0)).attr("y1", 0).attr("y2", top.height);
      xbarMark.style("display", have ? null : "none"); xbarLabel.style("display", have ? null : "none"); mirrorMark.style("display", have ? null : "none");
      if (have) {
        var cx = clamp(state.xbar, X_MIN, X_MAX), mx = clamp(2 * MU0 - state.xbar, X_MIN, X_MAX);
        xbarMark.attr("transform", "translate(" + x(cx) + "," + top.height + ")");
        xbarLabel.attr("x", x(cx)).text("x̄ = " + state.xbar.toFixed(2));
        mirrorMark.attr("transform", "translate(" + x(mx) + "," + top.height + ")");
      }

      var count = state.tests || 1;
      py.domain([0, Math.max(0.15, Math.ceil(Math.max.apply(null, state.bins) / count * 20) / 20)]);
      bot.yGrid(py, 4);
      bot.yAxis(py, { label: "share of tests", ticks: 4 });
      var w = Math.max(1, px(1 / P_BINS) - px(0) - 1);
      var sel = bars.selectAll("rect.bar").data(state.bins);
      sel.enter().append("rect").attr("class", "bar").merge(sel)
        .attr("x", function (c, j) { return px(j / P_BINS) + 0.5; }).attr("width", w)
        .attr("y", function (c) { return py(c / count); }).attr("height", function (c) { return bot.height - py(c / count); });
      alphaLine.attr("x1", px(ALPHA)).attr("x2", px(ALPHA)).attr("y1", 0).attr("y2", bot.height);
      alphaLabel.attr("x", px(ALPHA) + 4);
      uniformLine.attr("x1", 0).attr("x2", bot.width).attr("y1", py(1 / P_BINS)).attr("y2", py(1 / P_BINS));
    }

    /* ---- auto loop ------------------------------------------------------- */
    function startAuto() {
      if (state.auto || state.tests >= MAX_TESTS) return;
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
    setTruth("null");

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setTruth: setTruth,
      setEffect: function (d) { effectSlider.set(d, true); setEffect(d); },
      setN: function (n) { nSlider.set(n, true); setN(n); },
      draw: draw, reset: reset, startAuto: startAuto, stopAuto: stopAuto,
      state: function () { return { truth: state.truth, effect: state.effect, n: state.n, trueMean: trueMean(), xbar: state.xbar, z: isFinite(state.xbar) ? zOf(state.xbar) : NaN, p: isFinite(state.xbar) ? pOf(state.xbar) : NaN, tests: state.tests, small: state.small, bins: state.bins.slice(), auto: state.auto }; },
      constants: { MU0: MU0, SIGMA: SIGMA, ALPHA: ALPHA, P_BINS: P_BINS, INITIAL: INITIAL, MAX_TESTS: MAX_TESTS, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, MIN_EFFECT: MIN_EFFECT, MAX_EFFECT: MAX_EFFECT, DEFAULT_EFFECT: DEFAULT_EFFECT }
    };
  };
})();
