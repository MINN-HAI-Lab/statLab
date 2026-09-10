/*
  counting__multiplication-rule.js — SYLLABUS §14.1 "The multiplication rule".

  Teaches: independent choices multiply. Every option in a new stage is a fresh
  copy of everything that came before, so the leaf count is the product of the
  stage sizes — not their sum.

  Public:  demos.initMultiplicationRule(containerEl) → api { setCount(i, n), addStage(),
           removeStage(), trace(), reset(), state() }
  Uses:    ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart;  d3 selection.

  Pattern per D-019. The tree is drawn left to right: one root, then one column
  of nodes per stage, and the leaves in the last column. Leaf spacing is derived
  from the frame so the tree always fits; "Trace one outfit" lights a single
  root-to-leaf path and names it, which is what makes a leaf an outfit rather
  than a dot. Stages are capped so the leaf count stays legible (D6).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var STAGES = [
    { name: "Shirts", item: "shirt" },
    { name: "Trousers", item: "trousers" },
    { name: "Shoes", item: "shoes" }
  ];
  var MIN_COUNT = 2, MAX_COUNT = 4;
  var MIN_STAGES = 1, MAX_STAGES = 3;
  var DEFAULT_COUNTS = [3, 2, 2];
  var DEFAULT_STAGES = 3;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.demos.initMultiplicationRule = function (container) {
    var state = { stages: DEFAULT_STAGES, counts: DEFAULT_COUNTS.slice(), path: null };

    /* ---- controls ---------------------------------------------------- */
    var traceButton = ui.button({ label: "Trace one outfit", kind: "primary", onClick: trace });
    var addButton = ui.button({ label: "Add a stage", onClick: addStage });
    var removeButton = ui.button({ label: "Remove a stage", onClick: removeStage });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div"); controls.className = "ui-controls";
    controls.appendChild(traceButton); controls.appendChild(addButton); controls.appendChild(removeButton); controls.appendChild(resetButton);
    var sliders = STAGES.map(function (s, i) {
      return ui.slider({ label: s.name + " to choose from", min: MIN_COUNT, max: MAX_COUNT, step: 1, value: DEFAULT_COUNTS[i], onChange: function (v) { setCount(i, v); } });
    });

    var totalOut = ui.readout({ label: "Different outfits", decimals: 0, accent: true });
    var stagesOut = ui.readout({ label: "Stages", decimals: 0 });
    var equation = document.createElement("p"); equation.className = "demo__status"; equation.setAttribute("data-eq", "");
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "demo__status demo__note"; note.hidden = true;
    note.textContent = "Three stages is the most this tree draws. Past that the leaves stop being countable by eye.";

    sliders.forEach(function (s) { container.appendChild(s.el); });
    container.appendChild(controls);

    /* ---- chart ----------------------------------------------------------- */
    var chartHost = document.createElement("div"); container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.85, minHeight: 320, maxHeight: 460, margin: { top: 30, right: 26, bottom: 16, left: 22 }, ariaLabel: "A decision tree: one branch per option at each stage, with one leaf per complete outfit" });
    var edges = frame.plot.append("g");
    var nodes = frame.plot.append("g");
    var headers = frame.plot.append("g");
    var legend = document.createElement("p"); legend.className = "demo__status";
    legend.textContent = "Each column is one stage of the decision. Every node in a column fans out into a full copy of the next stage, which is why the counts multiply instead of adding.";

    container.appendChild(ui.readoutRow([totalOut, stagesOut]));
    container.appendChild(equation);
    container.appendChild(status);
    container.appendChild(note);
    container.appendChild(legend);

    frame.onResize(function () { render(); });

    /* ---- updates ------------------------------------------------------- */
    function active() { return state.counts.slice(0, state.stages); }
    function total() { return active().reduce(function (a, b) { return a * b; }, 1); }
    function setCount(i, v) {
      if (i < 0 || i >= STAGES.length) return;
      state.counts[i] = clamp(Math.round(v), MIN_COUNT, MAX_COUNT);
      state.path = null;
      render();
    }
    function addStage() { if (state.stages >= MAX_STAGES) return; state.stages++; state.path = null; render(); }
    function removeStage() { if (state.stages <= MIN_STAGES) return; state.stages--; state.path = null; render(); }
    function trace() {
      state.path = active().map(function (n) { return stats.randomInt(0, n - 1); });
      render();
    }
    function reset() {
      state.counts = DEFAULT_COUNTS.slice(); state.stages = DEFAULT_STAGES; state.path = null;
      sliders.forEach(function (s, i) { s.set(DEFAULT_COUNTS[i], true); });
      render();
    }
    /** Every root-to-leaf path, as an array of option indices per stage. */
    function paths() {
      var out = [[]];
      active().forEach(function (n) {
        var next = [];
        out.forEach(function (prefix) { for (var i = 0; i < n; i++) next.push(prefix.concat([i])); });
        out = next;
      });
      return out;
    }
    function describe(path) {
      return path.map(function (i, s) { return STAGES[s].item + " " + (i + 1); }).join(" · ");
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var counts = active(), all = paths(), n = all.length;
      sliders.forEach(function (s, i) { s.el.hidden = i >= state.stages; });
      addButton.disabled = state.stages >= MAX_STAGES;
      removeButton.disabled = state.stages <= MIN_STAGES;
      note.hidden = state.stages < MAX_STAGES;
      totalOut.set(n); stagesOut.set(state.stages);
      equation.textContent = counts.join(" × ") + " = " + n;
      status.textContent = state.path
        ? "One outfit: " + describe(state.path) + ". It is one leaf out of " + n + "."
        : "Adding a stage with k options does not add k paths. It makes k copies of every path there already was, so " + counts.join(" × ") + " = " + n + " outfits.";

      var colX = [], w = frame.width;
      for (var s = 0; s <= counts.length; s++) colX.push(counts.length ? w * s / counts.length : 0);

      // Node rows: level 0 is the root; level s holds one node per distinct prefix of length s.
      var levels = [[{ key: "", y: 0.5, prefix: [] }]];
      counts.forEach(function (k, s) {
        var prev = levels[s], row = [];
        prev.forEach(function (parent) {
          for (var i = 0; i < k; i++) {
            var prefix = parent.prefix.concat([i]);
            row.push({ key: prefix.join("-"), prefix: prefix, parent: parent });
          }
        });
        row.forEach(function (d, idx) { d.y = (idx + 0.5) / row.length; });
        levels.push(row);
      });

      var onPath = function (d) { return state.path && d.prefix.every(function (v, i) { return state.path[i] === v; }); };
      var edgeData = [];
      levels.slice(1).forEach(function (row, si) {
        row.forEach(function (d) { edgeData.push({ x1: colX[si], y1: d.parent.y, x2: colX[si + 1], y2: d.y, lit: onPath(d) }); });
      });
      var e = edges.selectAll("line").data(edgeData);
      e.exit().remove();
      e.enter().append("line").merge(e)
        .attr("class", function (d) { return d.lit ? "tree-edge tree-edge--lit" : "tree-edge"; })
        .attr("x1", function (d) { return d.x1; }).attr("x2", function (d) { return d.x2; })
        .attr("y1", function (d) { return d.y1 * frame.height; }).attr("y2", function (d) { return d.y2 * frame.height; });

      var nodeData = [];
      levels.forEach(function (row, si) { row.forEach(function (d) { nodeData.push({ x: colX[si], y: d.y, leaf: si === counts.length, lit: si === 0 ? !!state.path : onPath(d) }); }); });
      var nd = nodes.selectAll("circle").data(nodeData);
      nd.exit().remove();
      nd.enter().append("circle").merge(nd)
        .attr("class", function (d) { return "tree-node" + (d.leaf ? " tree-node--leaf" : "") + (d.lit ? " tree-node--lit" : ""); })
        .attr("r", function (d) { return d.leaf ? (n > 32 ? 3 : 4.5) : 3.5; })
        .attr("cx", function (d) { return d.x; }).attr("cy", function (d) { return d.y * frame.height; });

      var hd = headers.selectAll("text").data(counts);
      hd.exit().remove();
      var colWidth = counts.length ? w / counts.length : w;
      hd.enter().append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle").attr("y", -12).merge(hd)
        .attr("x", function (d, i) { return (colX[i] + colX[i + 1]) / 2; })
        .text(function (d, i) {
          var full = STAGES[i].name + ": " + d;
          // On a phone the columns are ~64 px wide and "Trousers: 2" is ~77 px, so the
          // three headers printed on top of each other until this shortened them (D-034).
          return full.length * 7 + 6 < colWidth ? full : "× " + d;
        });

    }

    /* ---- initial state (D5) ------------------------------------------- */
    trace();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setCount: function (i, v) { if (sliders[i]) sliders[i].set(v, true); setCount(i, v); },
      addStage: addStage, removeStage: removeStage, trace: trace, reset: reset,
      paths: paths,
      state: function () { return { stages: state.stages, counts: state.counts.slice(), active: active(), total: total(), path: state.path ? state.path.slice() : null }; },
      constants: { STAGES: STAGES.map(function (s) { return s.name; }), MIN_COUNT: MIN_COUNT, MAX_COUNT: MAX_COUNT, MIN_STAGES: MIN_STAGES, MAX_STAGES: MAX_STAGES, DEFAULT_COUNTS: DEFAULT_COUNTS.slice(), DEFAULT_STAGES: DEFAULT_STAGES }
    };
  };
})();
