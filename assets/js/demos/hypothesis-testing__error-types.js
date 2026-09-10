/*
  hypothesis-testing__error-types.js — SYLLABUS §9.1 "Hypotheses and error types".

  Teaches: Type I and Type II errors trade off through the decision cutoff.
  Moving the cutoff lowers one error and raises the other; more data or a
  bigger effect shrinks both.

  Public:  demos.initErrorTypes(containerEl) → api { setCutoff(c), setEffect(d), setN(n),
           setAlpha(pct), reset(), state() }
  Uses:    stats.normalPdf, stats.normalCdf, stats.normalQuantile;  ui.slider, ui.button,
           ui.readout, ui.readoutRow, ui.chart;  d3 scales/line/area/drag.

  Pattern per D-019 / D-024. One-sided test of H₀: μ = 50 against μ > 50 with
  σ = 10 known, so x̄ ~ N(μ, σ/√n) under either hypothesis (OpenStax §9.1–9.2).
  The cutoff is a draggable, keyboard-movable handle.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var MU0 = 50, SIGMA = 10;
  var X_MIN = 40, X_MAX = 70;
  var MIN_EFFECT = 0, MAX_EFFECT = 15, DEFAULT_EFFECT = 5;
  var MIN_N = 2, MAX_N = 100, DEFAULT_N = 16;
  var DEFAULT_ALPHA = 5;
  var KEY_STEP = 0.1, HANDLE_R = 22;

  window.demos.initErrorTypes = function (container) {
    var state = { effect: DEFAULT_EFFECT, n: DEFAULT_N, cutoff: NaN };

    /* ---- controls ---------------------------------------------------- */
    var alphaButtons = [1, 5, 10].map(function (pct) { return ui.button({ label: "Cutoff for α = " + pct + " %", kind: pct === DEFAULT_ALPHA ? "primary" : "secondary", onClick: function () { setAlpha(pct); } }); });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    alphaButtons.forEach(function (b) { controls.appendChild(b); }); controls.appendChild(resetButton);
    var effectSlider = ui.slider({ label: "True effect: μ − μ₀", min: MIN_EFFECT, max: MAX_EFFECT, step: 0.5, value: DEFAULT_EFFECT, onChange: setEffect });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: 1, value: DEFAULT_N, onChange: setN });

    var cutOut = ui.readout({ label: "Cutoff c", decimals: 2 });
    var alphaOut = ui.readout({ label: "α = P(reject | H₀ true)", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var betaOut = ui.readout({ label: "β = P(miss | effect real)", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; }, accent: true });
    var powerOut = ui.readout({ label: "Power = 1 − β", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; } });
    var seOut = ui.readout({ label: "σ/√n", decimals: 2 });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");

    container.appendChild(effectSlider.el);
    container.appendChild(nSlider.el);
    container.appendChild(controls);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.5, minHeight: 250, margin: { top: 34, bottom: 48 }, ariaLabel: "Two sampling distributions of the sample mean, under the null hypothesis and under a real effect, with a draggable decision cutoff; the alpha and beta regions are shaded" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear();
    var betaShade = frame.plot.append("path").attr("class", "area area--beta");
    var alphaShade = frame.plot.append("path").attr("class", "area area--alpha");
    var h0Curve = frame.plot.append("path").attr("class", "line line--strong");
    var h1Curve = frame.plot.append("path").attr("class", "line line--overlay line--dashed");
    var h0Label = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -18);
    var h1Label = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -4);
    var alphaLabel = frame.plot.append("text").attr("class", "marker-label region-label--alpha").attr("text-anchor", "start");
    var betaLabel = frame.plot.append("text").attr("class", "marker-label region-label--beta").attr("text-anchor", "end");
    var handle = frame.plot.append("g").attr("class", "handle draggable").attr("tabindex", 0).attr("role", "slider")
      .attr("aria-valuemin", X_MIN).attr("aria-valuemax", X_MAX).attr("aria-valuenow", MU0).attr("aria-label", "Decision cutoff: drag, or use the arrow keys");
    handle.append("circle").attr("class", "hit").attr("r", HANDLE_R);
    handle.append("line").attr("class", "handle__line");
    handle.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L8,0L0,-12Z");
    handle.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -36).text("cutoff");   // above the triangle and the α/β region labels
    handle.call(d3.drag().on("drag", function (event) { setCutoff(x.invert(event.x)); }));
    handle.on("keydown", function (event) {
      var dv = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -KEY_STEP : event.key === "ArrowRight" || event.key === "ArrowUp" ? KEY_STEP : 0;
      if (!dv) return; event.preventDefault(); setCutoff(state.cutoff + dv);
    });
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
    var areaGen = d3.area().x(function (d) { return x(d[0]); }).y0(function () { return frame.height; }).y1(function (d) { return y(d[1]); });
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Blue, solid curve: sample means if H₀ is true (μ = 50). Orange, dashed curve: sample means if the effect is real. Means to the right of the cutoff reject H₀. Orange-shaded α: rejecting when H₀ is true. Blue-shaded β: failing to reject when the effect is real.";

    container.appendChild(ui.readoutRow([cutOut, alphaOut, betaOut, powerOut, seOut]));
    container.appendChild(status);
    container.appendChild(legend);

    frame.onResize(function (f) { x.range([0, f.width]); y.range([f.height, 0]); f.xAxis(x, { label: "sample mean x̄", ticks: 10 }); render(); });

    /* ---- updates ------------------------------------------------------- */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function se() { return SIGMA / Math.sqrt(state.n); }
    function mu1() { return MU0 + state.effect; }
    function alpha() { return 1 - stats.normalCdf(state.cutoff, MU0, se()); }
    function beta() { return stats.normalCdf(state.cutoff, mu1(), se()); }
    function setCutoff(c) { state.cutoff = clamp(c, X_MIN, X_MAX); render(); }   // full precision; readouts round
    function setAlpha(pct) { setCutoff(stats.normalQuantile(1 - pct / 100, MU0, se())); }
    function setEffect(d) { state.effect = clamp(d, MIN_EFFECT, MAX_EFFECT); render(); }
    function setN(n) { state.n = clamp(Math.round(n), MIN_N, MAX_N); render(); }
    function reset() { effectSlider.set(DEFAULT_EFFECT, true); nSlider.set(DEFAULT_N, true); state.effect = DEFAULT_EFFECT; state.n = DEFAULT_N; setAlpha(DEFAULT_ALPHA); }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!isFinite(state.cutoff)) return;
      var s = se(), a = alpha(), b = beta(), m1 = mu1(), c = state.cutoff;
      cutOut.set(c); alphaOut.set(a); betaOut.set(b); powerOut.set(1 - b); seOut.set(s);
      status.textContent = state.effect === 0
        ? "With no real effect the two curves coincide, so power equals α. Whatever you reject here is a false alarm."
        : "Drag the cutoff right and α falls while β rises. Drag it left and the reverse happens. Only more data (larger n) or a larger effect shrinks both at once.";

      var peak = stats.normalPdf(0, 0, SIGMA / Math.sqrt(MAX_N));
      y.domain([0, peak * 1.1]);
      var h0 = [], h1 = [], aRegion = [], bRegion = [];
      for (var i = 0; i <= 400; i++) {
        var v = X_MIN + (X_MAX - X_MIN) * i / 400;
        var p0 = stats.normalPdf(v, MU0, s), p1 = stats.normalPdf(v, m1, s);
        h0.push([v, p0]); h1.push([v, p1]);
        if (v >= c) aRegion.push([v, p0]);
        if (v <= c) bRegion.push([v, p1]);
      }
      aRegion.unshift([c, stats.normalPdf(c, MU0, s)]); bRegion.push([c, stats.normalPdf(c, m1, s)]);
      h0Curve.attr("d", lineGen(h0)); h1Curve.attr("d", lineGen(h1));
      alphaShade.attr("d", areaGen(aRegion)); betaShade.attr("d", areaGen(bRegion));
      h0Label.attr("x", x(MU0)).text("H₀: μ = " + MU0);
      h1Label.attr("x", x(m1)).text("real effect: μ = " + m1);
      alphaLabel.attr("x", x(c) + 6).attr("y", frame.height - 6).text("α");
      betaLabel.attr("x", x(c) - 6).attr("y", frame.height - 6).text("β");
      handle.attr("transform", "translate(" + x(c) + "," + frame.height + ")").attr("aria-valuenow", c.toFixed(2)).attr("aria-valuetext", "cutoff " + c.toFixed(2) + ", alpha " + (a * 100).toFixed(1) + " percent, beta " + (b * 100).toFixed(1) + " percent");
      handle.select("line.handle__line").attr("x1", 0).attr("x2", 0).attr("y1", -frame.height).attr("y2", 0);
    }

    /* ---- initial state (D5) ------------------------------------------- */
    setAlpha(DEFAULT_ALPHA);

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setCutoff: setCutoff,
      setEffect: function (d) { effectSlider.set(d, true); setEffect(d); },
      setN: function (n) { nSlider.set(n, true); setN(n); },
      setAlpha: setAlpha, reset: reset,
      state: function () { return { effect: state.effect, n: state.n, cutoff: state.cutoff, se: se(), alpha: alpha(), beta: beta(), power: 1 - beta() }; },
      constants: { MU0: MU0, SIGMA: SIGMA, X_MIN: X_MIN, X_MAX: X_MAX, MIN_EFFECT: MIN_EFFECT, MAX_EFFECT: MAX_EFFECT, DEFAULT_EFFECT: DEFAULT_EFFECT, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, DEFAULT_ALPHA: DEFAULT_ALPHA, KEY_STEP: KEY_STEP }
    };
  };
})();
