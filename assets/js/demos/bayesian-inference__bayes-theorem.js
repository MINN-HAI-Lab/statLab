/*
  bayesian-inference__bayes-theorem.js — SYLLABUS §15.1 "Bayes' theorem".

  Teaches: a positive result from an accurate test can still mean the disease is
  unlikely, because the healthy group is so much larger that its small error rate
  produces more positives than the sick group's large one.

  Public:  demos.initBayesTheorem(containerEl) → api { setPrevalence(p), setSensitivity(s),
           setSpecificity(s), setPositivesOnly(flag), reset(), state() }
  Uses:    stats.diagnosticTest;  ui.slider, ui.button, ui.readout, ui.readoutRow,
           ui.chart, ui.canvas, ui.token.

  Pattern per D-019 / D-021. The icon array is 1 000 people on Canvas (D-007),
  laid out in reading order as four contiguous blocks — sick and positive, sick
  and negative, healthy and positive, healthy and negative — so the groups are
  told apart by position and by the legend's counts, never by colour alone.
  Readouts give both the exact probability and the array's own head count.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var N = 1000;
  var MIN_PREV = 0.1, MAX_PREV = 20, DEFAULT_PREV = 1;              // per cent
  var MIN_SENS = 50, MAX_SENS = 100, DEFAULT_SENS = 99;
  var MIN_SPEC = 50, MAX_SPEC = 100, DEFAULT_SPEC = 95;
  var MIN_CELL = 4, MAX_CELL = 16;
  var GROUPS = [
    { key: "tp", label: "Has it, tests positive", token: "--accent-strong" },
    { key: "fn", label: "Has it, tests negative", token: "--cat-2" },
    { key: "fp", label: "Healthy, tests positive", token: "--warn" },
    { key: "tn", label: "Healthy, tests negative", token: "--line" }
  ];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initBayesTheorem = function (container) {
    var state = { prev: DEFAULT_PREV, sens: DEFAULT_SENS, spec: DEFAULT_SPEC, positivesOnly: false };

    /* ---- controls ---------------------------------------------------- */
    var prevSlider = ui.slider({ label: "People who have it, per 100", min: MIN_PREV, max: MAX_PREV, step: 0.1, value: DEFAULT_PREV, decimals: 1, onChange: setPrevalence });
    var sensSlider = ui.slider({ label: "Sensitivity: caught when present, %", min: MIN_SENS, max: MAX_SENS, step: 1, value: DEFAULT_SENS, onChange: setSensitivity });
    var specSlider = ui.slider({ label: "Specificity: cleared when absent, %", min: MIN_SPEC, max: MAX_SPEC, step: 1, value: DEFAULT_SPEC, onChange: setSpecificity });
    var onlyButton = ui.button({ label: "Show only the positives", onClick: function () { setPositivesOnly(!state.positivesOnly); } });
    onlyButton.setAttribute("aria-pressed", "false");
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(onlyButton); controls.appendChild(resetButton);

    var ppvOut = ui.readout({ label: "P(has it | tested positive)", decimals: 3, accent: true });
    var npvOut = ui.readout({ label: "P(healthy | tested negative)", decimals: 4 });
    var posOut = ui.readout({ label: "Positives per 1 000", decimals: 0 });
    var truePosOut = ui.readout({ label: "…of whom really have it", decimals: 0, accent: true });
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");

    container.appendChild(prevSlider.el);
    container.appendChild(sensSlider.el);
    container.appendChild(specSlider.el);
    container.appendChild(controls);

    /* ---- chart: the icon array ------------------------------------------ */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.62, minHeight: 260, maxHeight: 400, margin: { top: 8, right: 8, bottom: 8, left: 8 }, ariaLabel: "One thousand people drawn as dots, grouped by whether they have the condition and by what the test said" });
    var layer = ui.canvas(frame);
    var cover = frame.plot.append("rect").attr("class", "space--open").attr("x", 0).attr("y", 0);

    var table = document.createElement("table"); table.className = "ui-table";
    var thead = document.createElement("thead");
    thead.innerHTML = "<tr><th scope=\"col\">Group</th><th scope=\"col\">People per 1 000</th></tr>";
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    var cells = {};
    GROUPS.forEach(function (g) {
      var tr = document.createElement("tr");
      var th = document.createElement("th"); th.scope = "row"; th.textContent = g.label;
      var td = document.createElement("td"); td.setAttribute("data-count", g.key);
      cells[g.key] = td; tr.appendChild(th); tr.appendChild(td); tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "The dots run in reading order, one block per row of the table above. The people who have it come first, then the healthy ones. Position, not colour, says which group a dot is in.";

    container.appendChild(ui.readoutRow([ppvOut, npvOut, posOut, truePosOut]));
    container.appendChild(status);
    container.appendChild(table);
    container.appendChild(legend);

    frame.onResize(function (f) { cover.attr("width", f.width).attr("height", f.height); render(); });

    /* ---- updates ------------------------------------------------------- */
    function setPrevalence(v) { state.prev = clamp(v, MIN_PREV, MAX_PREV); render(); }
    function setSensitivity(v) { state.sens = clamp(v, MIN_SENS, MAX_SENS); render(); }
    function setSpecificity(v) { state.spec = clamp(v, MIN_SPEC, MAX_SPEC); render(); }
    function setPositivesOnly(flag) { state.positivesOnly = !!flag; render(); }
    function reset() {
      prevSlider.set(DEFAULT_PREV, true); sensSlider.set(DEFAULT_SENS, true); specSlider.set(DEFAULT_SPEC, true);
      state.prev = DEFAULT_PREV; state.sens = DEFAULT_SENS; state.spec = DEFAULT_SPEC; state.positivesOnly = false;
      render();
    }
    function exact() { return stats.diagnosticTest(state.prev / 100, state.sens / 100, state.spec / 100); }
    /** Cell size and column count that fit exactly N dots into a width × height box. */
    function layout(width, height) {
      if (!(width > 0) || !(height > 0)) return { cell: MIN_CELL, cols: 1 };
      var cell = clamp(Math.floor(Math.sqrt(width * height / N)), MIN_CELL, MAX_CELL);
      var cols = Math.max(1, Math.floor(width / cell));
      var rows = Math.ceil(N / cols);
      cell = Math.min(cell, width / cols, height / rows);
      return { cell: cell, cols: cols, rows: rows };
    }

    /** The array's own head count: whole people, summing to exactly N. */
    function counts() {
      var sick = Math.round(N * state.prev / 100), healthy = N - sick;
      var tp = Math.round(sick * state.sens / 100), fn = sick - tp;
      var tn = Math.round(healthy * state.spec / 100), fp = healthy - tn;
      return { tp: tp, fn: fn, fp: fp, tn: tn, sick: sick, healthy: healthy, positives: tp + fp, negatives: tn + fn };
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var r = exact(), c = counts();
      onlyButton.setAttribute("aria-pressed", String(state.positivesOnly));
      onlyButton.textContent = state.positivesOnly ? "Show everyone again" : "Show only the positives";
      ppvOut.set(r.ppv); npvOut.set(r.npv); posOut.set(c.positives); truePosOut.set(c.tp);
      GROUPS.forEach(function (g) { cells[g.key].textContent = String(c[g.key]); });
      status.textContent = c.positives === 0
        ? "Nobody tests positive at these settings, so there is no positive result to interpret."
        : "Of the " + c.positives + " people per 1 000 who test positive, " + c.tp + " really have it and " + c.fp + " do not. That is the whole of Bayes' theorem. A test this accurate still leaves P(has it | positive) at " + (100 * r.ppv).toFixed(1) + " %, because the healthy group is " + (c.sick ? Math.round(c.healthy / c.sick) : c.healthy) + " times larger and its mistakes outnumber the true catches.";

      var ctx = layer.ctx; layer.clear();
      // Fit all 1 000 dots to the frame at whatever size it is: start from the cell that
      // would tile the area exactly, then shrink it until the rows it implies also fit.
      var grid = layout(layer.width, layer.height);
      var order = [], i;
      GROUPS.forEach(function (g) { for (i = 0; i < c[g.key]; i++) order.push(g); });
      var dim = ui.token("--line"), r = Math.max(1.5, grid.cell * 0.33);
      for (i = 0; i < order.length; i++) {
        var g = order[i], positive = g.key === "tp" || g.key === "fp";
        ctx.fillStyle = state.positivesOnly && !positive ? dim : ui.token(g.token);
        var cx = (i % grid.cols) * grid.cell + grid.cell / 2, cy = Math.floor(i / grid.cols) * grid.cell + grid.cell / 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
      }
    }

    /* ---- initial state (D5) ------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setPrevalence: function (v) { prevSlider.set(v, true); setPrevalence(v); },
      setSensitivity: function (v) { sensSlider.set(v, true); setSensitivity(v); },
      setSpecificity: function (v) { specSlider.set(v, true); setSpecificity(v); },
      setPositivesOnly: setPositivesOnly, reset: reset,
      counts: counts,
      state: function () { return { prev: state.prev, sens: state.sens, spec: state.spec, positivesOnly: state.positivesOnly, exact: exact(), counts: counts(), n: N }; },
      layout: layout,
      constants: { N: N, MIN_CELL: MIN_CELL, MAX_CELL: MAX_CELL, MIN_PREV: MIN_PREV, MAX_PREV: MAX_PREV, DEFAULT_PREV: DEFAULT_PREV, MIN_SENS: MIN_SENS, MAX_SENS: MAX_SENS, DEFAULT_SENS: DEFAULT_SENS, MIN_SPEC: MIN_SPEC, MAX_SPEC: MAX_SPEC, DEFAULT_SPEC: DEFAULT_SPEC, GROUPS: GROUPS.map(function (g) { return g.key; }) }
    };
  };
})();
