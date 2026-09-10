/*
  beyond-one-variable__two-predictors.js — SYLLABUS §17.2 "Two predictors".

  Teaches: a coefficient means "holding the other predictors fixed", and that
  changes what it is. When two predictors are correlated, the one fitted alone
  carries the other's effect as well, and can shrink or even flip sign once the
  partner joins the model.

  Public:  demos.initTwoPredictors(containerEl) → api { setCorrelation(r), setBeta1(b),
           setBeta2(b), newData(), reset(), state() }
  Uses:    stats.sampleNormal, stats.linearRegression, stats.correlation, stats.twoPredictorFit;
           ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart.

  Pattern per D-019. The truth is set by the sliders: y = 2 + β₁x₁ + β₂x₂ + noise,
  with x₂ built to correlate with x₁ by a chosen amount. Both fits are shown side
  by side so the gap between them is the lesson, and a plain-English line spells
  out what each coefficient claims.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var N = 60, INTERCEPT = 2, NOISE = 1.2;
  var MIN_R = 0, MAX_R = 0.95, DEFAULT_R = 0.85;
  var MIN_BETA = -2, MAX_BETA = 2, DEFAULT_B1 = -0.5, DEFAULT_B2 = 1.5;
  var X_MIN = -3, X_MAX = 3;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initTwoPredictors = function (container) {
    var state = { r: DEFAULT_R, b1: DEFAULT_B1, b2: DEFAULT_B2, x1: [], x2: [], y: [] };

    /* ---- controls ---------------------------------------------------- */
    var newButton = ui.button({ label: "New data", kind: "primary", onClick: newData });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(newButton); controls.appendChild(resetButton);
    var rSlider = ui.slider({ label: "How strongly x₁ and x₂ move together", min: MIN_R, max: MAX_R, step: 0.05, value: DEFAULT_R, decimals: 2, onChange: setCorrelation });
    var b1Slider = ui.slider({ label: "True effect of x₁, β₁", min: MIN_BETA, max: MAX_BETA, step: 0.1, value: DEFAULT_B1, decimals: 1, onChange: setBeta1 });
    var b2Slider = ui.slider({ label: "True effect of x₂, β₂", min: MIN_BETA, max: MAX_BETA, step: 0.1, value: DEFAULT_B2, decimals: 1, onChange: setBeta2 });

    var aloneOut = ui.readout({ label: "x₁ alone: slope", decimals: 3, accent: true });
    var bothOut = ui.readout({ label: "x₁ with x₂ in: b₁", decimals: 3, accent: true });
    var b2Out = ui.readout({ label: "x₂ with x₁ in: b₂", decimals: 3 });
    var trueOut = ui.readout({ label: "True β₁", decimals: 3 });
    var corrOut = ui.readout({ label: "Correlation of x₁ and x₂", decimals: 3 });
    var r2Out = ui.readout({ label: "r² with both", decimals: 3 });
    var meaning = document.createElement("p"); meaning.className = "demo__status"; meaning.setAttribute("data-meaning", "");
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "demo__status demo__note"; note.hidden = true;
    note.textContent = "x₁ and x₂ move together too closely to separate here, so the two-predictor fit is undefined and its readouts are blank.";

    container.appendChild(rSlider.el);
    container.appendChild(b1Slider.el);
    container.appendChild(b2Slider.el);
    container.appendChild(controls);

    /* ---- chart: y against x1, with the two claims drawn over it ---------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.6, minHeight: 280, maxHeight: 380, margin: { top: 28, right: 20, bottom: 44, left: 52 }, ariaLabel: "y plotted against x1, with the line fitted to x1 alone and the slope x1 claims once x2 is in the model" });
    var x = d3.scaleLinear().domain([X_MIN, X_MAX]), y = d3.scaleLinear();
    var dots = frame.plot.append("g");
    var aloneLine = frame.plot.append("line").attr("class", "line line--strong");
    var bothLine = frame.plot.append("line").attr("class", "line line--overlay line--dashed");
    var aloneLabel = frame.plot.append("text").attr("class", "marker-label").attr("text-anchor", "start").attr("y", -14);
    var bothLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "end").attr("y", -14);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Dots: the data, plotted against x₁ only. Solid blue: the line you get fitting x₁ by itself. Dashed orange: the slope x₁ is credited with once x₂ is in the model, drawn through the same centre so the two claims can be compared.";

    container.appendChild(ui.readoutRow([aloneOut, bothOut, b2Out, trueOut]));
    container.appendChild(ui.readoutRow([corrOut, r2Out]));
    container.appendChild(meaning);
    container.appendChild(status);
    container.appendChild(note);
    container.appendChild(legend);

    frame.onResize(function (f) {
      x.range([0, f.width]); y.range([f.height, 0]);
      f.xAxis(x, { label: "x₁", ticks: 8 });
      render();
    });

    /* ---- updates ------------------------------------------------------- */
    /** x₂ = r·x₁ + √(1 − r²)·noise, so the pair's correlation is the slider value. */
    function newData() {
      state.x1 = []; state.x2 = []; state.y = [];
      var tail = Math.sqrt(Math.max(0, 1 - state.r * state.r));
      for (var i = 0; i < N; i++) {
        var a = stats.sampleNormal(0, 1);
        var b = state.r * a + tail * stats.sampleNormal(0, 1);
        state.x1.push(a); state.x2.push(b);
        state.y.push(INTERCEPT + state.b1 * a + state.b2 * b + stats.sampleNormal(0, NOISE));
      }
      render();
    }
    function setCorrelation(v) { state.r = clamp(v, MIN_R, MAX_R); newData(); }
    function setBeta1(v) { state.b1 = clamp(v, MIN_BETA, MAX_BETA); newData(); }
    function setBeta2(v) { state.b2 = clamp(v, MIN_BETA, MAX_BETA); newData(); }
    function reset() {
      rSlider.set(DEFAULT_R, true); b1Slider.set(DEFAULT_B1, true); b2Slider.set(DEFAULT_B2, true);
      state.r = DEFAULT_R; state.b1 = DEFAULT_B1; state.b2 = DEFAULT_B2;
      newData();
    }
    function alone() { try { return stats.linearRegression(state.x1, state.y); } catch (e) { return null; } }
    function both() { return stats.twoPredictorFit(state.x1, state.x2, state.y); }
    function describe(b) {
      if (!isFinite(b)) return "";
      var dir = b > 0 ? "up" : "down";
      return "Holding x₂ fixed, a one-unit rise in x₁ goes with y moving " + dir + " by " + Math.abs(b).toFixed(2) + ".";
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      if (!state.x1.length) return;
      var one = alone(), two = both(), corr = stats.correlation(state.x1, state.x2);
      aloneOut.set(one ? one.slope : NaN);
      bothOut.set(two ? two.b1 : NaN);
      b2Out.set(two ? two.b2 : NaN);
      trueOut.set(state.b1);
      corrOut.set(corr);
      r2Out.set(two ? two.r2 : NaN);
      note.hidden = !!two;
      meaning.textContent = two
        ? describe(two.b1) + " Fitted on its own, x₁ instead claims " + (one ? one.slope.toFixed(2) : "—") + ", because it is also standing in for x₂."
        : "";
      status.textContent = !one || !two
        ? "The two predictors move together too closely to tell apart."
        : Math.abs(one.slope - two.b1) < 0.15
          ? "With x₁ and x₂ barely related (r = " + corr.toFixed(2) + "), fitting x₁ alone gives almost the same slope as fitting both, " + one.slope.toFixed(2) + " against " + two.b1.toFixed(2) + ". Raise the correlation and the two answers part company."
          : (one.slope * two.b1 < 0
            ? "Fitted alone x₁ looks " + (one.slope > 0 ? "positive" : "negative") + " at " + one.slope.toFixed(2) + ", but with x₂ in the model it is " + two.b1.toFixed(2) + ", matching its true effect of " + state.b1.toFixed(1) + ". The sign flipped. Alone, x₁ was carrying x₂'s effect as well as its own."
            : "Alone, x₁ gets a slope of " + one.slope.toFixed(2) + ", and with x₂ in the model it gets " + two.b1.toFixed(2) + ", near its true " + state.b1.toFixed(1) + ". The difference is x₂'s effect, which x₁ was picking up through their correlation of " + corr.toFixed(2) + ".");

      var lo = d3.min(state.y), hi = d3.max(state.y), pad = (hi - lo) * 0.1 || 1;
      y.domain([lo - pad, hi + pad]);
      frame.yGrid(y, 5); frame.yAxis(y, { label: "y", ticks: 5 });
      var idx = state.x1.map(function (v, i) { return i; });
      var ds = dots.selectAll("circle").data(idx);
      ds.exit().remove();
      ds.enter().append("circle").attr("class", "dot--sample").attr("r", 3.5).merge(ds)
        .attr("cx", function (i) { return x(clamp(state.x1[i], X_MIN, X_MAX)); })
        .attr("cy", function (i) { return y(state.y[i]); });

      aloneLine.style("display", one ? null : "none");
      aloneLabel.style("display", one ? null : "none");
      if (one) {
        aloneLine.attr("x1", x(X_MIN)).attr("y1", y(one.predict(X_MIN))).attr("x2", x(X_MAX)).attr("y2", y(one.predict(X_MAX)));
        aloneLabel.attr("x", 0).text("x₁ alone: " + one.slope.toFixed(2));
      }
      // the same centre, so only the slope differs between the two claims
      var showBoth = !!(one && two);
      bothLine.style("display", showBoth ? null : "none");
      bothLabel.style("display", showBoth ? null : "none");
      if (showBoth) {
        var cx = stats.mean(state.x1), cy = stats.mean(state.y);
        bothLine.attr("x1", x(X_MIN)).attr("y1", y(cy + two.b1 * (X_MIN - cx)))
          .attr("x2", x(X_MAX)).attr("y2", y(cy + two.b1 * (X_MAX - cx)));
        bothLabel.attr("x", frame.width).text("with x₂ in: " + two.b1.toFixed(2));
      }
    }

    /* ---- initial state (D5) ------------------------------------------- */
    newData();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setCorrelation: function (v) { rSlider.set(v, true); setCorrelation(v); },
      setBeta1: function (v) { b1Slider.set(v, true); setBeta1(v); },
      setBeta2: function (v) { b2Slider.set(v, true); setBeta2(v); },
      newData: newData, reset: reset,
      state: function () {
        return { r: state.r, b1: state.b1, b2: state.b2, x1: state.x1.slice(), x2: state.x2.slice(), y: state.y.slice(),
          alone: alone(), both: both(), correlation: stats.correlation(state.x1, state.x2) };
      },
      constants: { N: N, INTERCEPT: INTERCEPT, NOISE: NOISE, MIN_R: MIN_R, MAX_R: MAX_R, DEFAULT_R: DEFAULT_R, MIN_BETA: MIN_BETA, MAX_BETA: MAX_BETA, DEFAULT_B1: DEFAULT_B1, DEFAULT_B2: DEFAULT_B2, X_MIN: X_MIN, X_MAX: X_MAX }
    };
  };
})();
