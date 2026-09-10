/*
  normal-distribution__z-scores.js — SYLLABUS §6.1 "Z-scores".

  Teaches: standardising puts every normal distribution on one common scale;
  z = (x − μ)/σ says how many standard deviations a value sits from its mean,
  so scores from different tests can be compared.

  Public:  demos.initZScores(containerEl) → api { setValue(test, x), setParam(test, name, v),
           reset(), state() }   test ∈ "A" | "B"
  Uses:    stats.normalPdf, stats.normalCdf, stats.zScore;  ui.slider, ui.button, ui.readout,
           ui.readoutRow, ui.chart;  d3 scales/line/drag.

  Pattern per D-019 / D-020 / D-024. Three stacked charts on fixed axes: test A
  (0–100), test B (200–800), and the standard normal (−4 … 4). Each test has a
  draggable, keyboard-movable value handle; both values appear on the z axis.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var TESTS = {
    A: { label: "Test A (marks out of 100)", domain: [0, 100], mu: { min: 40, max: 80, step: 1, value: 65 }, sigma: { min: 5, max: 15, step: 1, value: 8 }, value: 77, keyStep: 1 },
    B: { label: "Test B (scale 200–800)", domain: [200, 800], mu: { min: 400, max: 600, step: 10, value: 500 }, sigma: { min: 50, max: 150, step: 10, value: 100 }, value: 620, keyStep: 10 }
  };
  var Z_DOMAIN = [-4, 4];
  var HANDLE_R = 22;

  window.demos.initZScores = function (container) {
    var state = { A: { mu: TESTS.A.mu.value, sigma: TESTS.A.sigma.value, x: TESTS.A.value }, B: { mu: TESTS.B.mu.value, sigma: TESTS.B.sigma.value, x: TESTS.B.value } };
    var charts = {};

    /* ---- controls ---------------------------------------------------- */
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls"; controls.appendChild(resetButton);
    var sliders = {};
    var hint = document.createElement("p"); hint.className = "demo__status";
    hint.textContent = "Drag the triangle on either test, or focus it and use the arrow keys. Both scores land on the same z axis below.";
    container.appendChild(hint);

    /* ---- hosts in reading order: test A, test B, z chart ------------------ */
    var boxes = { A: document.createElement("div"), B: document.createElement("div") };
    var zHost = document.createElement("div");
    container.appendChild(boxes.A); container.appendChild(boxes.B); container.appendChild(zHost);

    /* ---- readouts (declared before any chart renders, D-021 §2) ------------ */
    var readouts = {
      A: { x: ui.readout({ label: "Score A", decimals: 0 }), z: ui.readout({ label: "z for A", decimals: 2, accent: true }), pct: ui.readout({ label: "Below A", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; } }) },
      B: { x: ui.readout({ label: "Score B", decimals: 0 }), z: ui.readout({ label: "z for B", decimals: 2, accent: true }), pct: ui.readout({ label: "Below B", format: function (v) { return isFinite(v) ? (v * 100).toFixed(1) + " %" : "—"; } }) }
    };
    var verdict = document.createElement("p"); verdict.className = "demo__status"; verdict.setAttribute("role", "status");

    /* ---- z chart first (its marks must exist before the test charts render) --- */
    var zFrame = ui.chart(zHost, { aspect: 0.32, minHeight: 170, margin: { top: 30, bottom: 44 }, ariaLabel: "Standard normal curve with both scores placed by their z-scores" });
    var zx = d3.scaleLinear().domain(Z_DOMAIN), zy = d3.scaleLinear().domain([0, 0.42]);
    var zCurve = zFrame.plot.append("path").attr("class", "line line--strong");
    var zMarks = { A: makeZMark("A"), B: makeZMark("B") };
    var zLine = d3.line().x(function (d) { return zx(d[0]); }).y(function (d) { return zy(d[1]); });
    var zTitle = zFrame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("x", 0).attr("y", -12).text("Standard normal: μ = 0, σ = 1");

    /* ---- then one chart per test -------------------------------------------- */
    ["A", "B"].forEach(function (key) { buildTest(key); });

    container.appendChild(ui.readoutRow([readouts.A.x, readouts.A.z, readouts.A.pct, readouts.B.x, readouts.B.z, readouts.B.pct]));
    container.appendChild(verdict);
    container.appendChild(controls);

    zFrame.onResize(function (f) {
      zx.range([0, f.width]); zy.range([f.height, 0]);
      f.xAxis(zx, { label: "z", ticks: 8 });
      render();
    });

    function makeZMark(key) {
      var g = zFrame.plot.append("g").attr("class", "zmark");
      g.append("line").attr("class", "line line--strong");
      g.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("dy", "-0.4em").text(key);
      return g;
    }

    function buildTest(key) {
      var T = TESTS[key];
      var box = boxes[key];
      var title = document.createElement("h3"); title.textContent = T.label; box.appendChild(title);
      sliders[key] = {
        mu: ui.slider({ label: "Mean μ", min: T.mu.min, max: T.mu.max, step: T.mu.step, value: T.mu.value, onChange: function (v) { setParam(key, "mu", v); } }),
        sigma: ui.slider({ label: "Standard deviation σ", min: T.sigma.min, max: T.sigma.max, step: T.sigma.step, value: T.sigma.value, onChange: function (v) { setParam(key, "sigma", v); } })
      };
      box.appendChild(sliders[key].mu.el); box.appendChild(sliders[key].sigma.el);
      var host = document.createElement("div"); box.appendChild(host);
      var frame = ui.chart(host, { aspect: 0.32, minHeight: 170, margin: { top: 30, bottom: 44 }, ariaLabel: T.label + ": normal curve with a draggable score" });
      var x = d3.scaleLinear().domain(T.domain), y = d3.scaleLinear();
      var curve = frame.plot.append("path").attr("class", "line");
      var muLine = frame.plot.append("line").attr("class", "line line--reference");
      var muLabel = frame.plot.append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("dy", "-0.4em");
      var handle = frame.plot.append("g").attr("class", "handle draggable").attr("tabindex", 0).attr("role", "slider")
        .attr("aria-valuemin", T.domain[0]).attr("aria-valuemax", T.domain[1]).attr("aria-valuenow", state[key].x).attr("aria-label", "Score on " + T.label + ": drag, or use the arrow keys");
      handle.append("circle").attr("class", "hit").attr("r", HANDLE_R);
      handle.append("line").attr("class", "handle__line");
      handle.append("path").attr("class", "mark mark--strong").attr("d", "M-8,0L8,0L0,-12Z");
      handle.append("text").attr("class", "marker-label").attr("text-anchor", "middle").attr("y", -16);   // above the triangle, clear of the tick labels
      handle.call(d3.drag().on("drag", function (event) { setValue(key, x.invert(event.x)); }));
      handle.on("keydown", function (event) {
        var dv = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -T.keyStep : event.key === "ArrowRight" || event.key === "ArrowUp" ? T.keyStep : 0;
        if (!dv) return; event.preventDefault(); setValue(key, state[key].x + dv);
      });
      var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
      charts[key] = { frame: frame, x: x, y: y, curve: curve, muLine: muLine, muLabel: muLabel, handle: handle, lineGen: lineGen };
      frame.onResize(function (f) {
        x.range([0, f.width]); y.range([f.height, 0]);
        f.xAxis(x, { label: "score", ticks: 8 });
        render();
      });
    }

    /* ---- updates ------------------------------------------------------------ */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function setValue(key, v) { var T = TESTS[key]; state[key].x = Math.round(clamp(v, T.domain[0], T.domain[1])); render(); }
    function setParam(key, name, v) { var spec = TESTS[key][name]; state[key][name] = clamp(v, spec.min, spec.max); render(); }
    function reset() {
      ["A", "B"].forEach(function (key) {
        var T = TESTS[key];
        state[key] = { mu: T.mu.value, sigma: T.sigma.value, x: T.value };
        sliders[key].mu.set(T.mu.value, true); sliders[key].sigma.set(T.sigma.value, true);
      });
      render();
    }
    function z(key) { return stats.zScore(state[key].x, state[key].mu, state[key].sigma); }

    /* ---- render ---------------------------------------------------------------- */
    function render() {
      if (!charts.A || !charts.B) return;   // test A's chart renders before test B exists (D-021 §2)
      ["A", "B"].forEach(function (key) {
        var c = charts[key], s = state[key], T = TESTS[key];
        var peak = stats.normalPdf(s.mu, s.mu, s.sigma);
        c.y.domain([0, stats.normalPdf(0, 0, T.sigma.min) * 1.1]);   // fixed by the smallest σ (D7)
        var pts = [];
        for (var i = 0; i <= 300; i++) { var xx = T.domain[0] + (T.domain[1] - T.domain[0]) * i / 300; pts.push([xx, stats.normalPdf(xx, s.mu, s.sigma)]); }
        c.curve.attr("d", c.lineGen(pts));
        c.muLine.attr("x1", c.x(s.mu)).attr("x2", c.x(s.mu)).attr("y1", c.y(peak)).attr("y2", c.frame.height);
        c.muLabel.attr("x", c.x(s.mu)).attr("y", c.y(peak)).text("μ = " + s.mu);
        var zz = z(key);
        c.handle.attr("transform", "translate(" + c.x(s.x) + "," + c.frame.height + ")").attr("aria-valuenow", s.x).attr("aria-valuetext", "score " + s.x + ", z = " + ui.formatNumber(zz, 2));
        c.handle.select("line.handle__line").attr("x1", 0).attr("x2", 0).attr("y1", -c.frame.height).attr("y2", 0);
        c.handle.select("text").text(s.x);
        readouts[key].x.set(s.x); readouts[key].z.set(zz); readouts[key].pct.set(stats.normalCdf(zz));
      });
      var zpts = [];
      for (var j = 0; j <= 200; j++) { var zv = Z_DOMAIN[0] + (Z_DOMAIN[1] - Z_DOMAIN[0]) * j / 200; zpts.push([zv, stats.normalPdf(zv)]); }
      zCurve.attr("d", zLine(zpts));
      ["A", "B"].forEach(function (key) {
        var zz = clamp(z(key), Z_DOMAIN[0], Z_DOMAIN[1]);
        zMarks[key].attr("transform", "translate(" + zx(zz) + ",0)");
        zMarks[key].select("line").attr("x1", 0).attr("x2", 0).attr("y1", zy(stats.normalPdf(zz))).attr("y2", zFrame.height);
        zMarks[key].select("text").attr("y", zy(stats.normalPdf(zz)));
      });
      var zA = z("A"), zB = z("B");
      verdict.textContent = Math.abs(zA - zB) < 0.005 ? "The two scores are equally far above their means: the same z, the same standing."
        : (zA > zB ? "Score A stands higher: " : "Score B stands higher: ") + "z = " + ui.formatNumber(Math.max(zA, zB), 2) + " beats z = " + ui.formatNumber(Math.min(zA, zB), 2) + ", whatever the raw numbers say.";
    }

    /* ---- initial state (D5) --------------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------------- */
    return {
      el: container,
      setValue: setValue,
      setParam: function (key, name, v) { sliders[key][name].set(v, true); setParam(key, name, v); },
      reset: reset,
      state: function () {
        return { A: Object.assign({ z: z("A"), percentile: stats.normalCdf(z("A")) }, state.A), B: Object.assign({ z: z("B"), percentile: stats.normalCdf(z("B")) }, state.B) };
      },
      constants: { TESTS: JSON.parse(JSON.stringify(TESTS)), Z_DOMAIN: Z_DOMAIN.slice() }
    };
  };
})();
