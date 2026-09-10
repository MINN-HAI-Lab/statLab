/*
  probability-topics__conditional.js — SYLLABUS §3.3 "Conditional probability and
  contingency tables".

  Teaches: conditioning restricts the sample space. P(A | B) is the share of A
  among the B outcomes only, and the same counts fill a 2 × 2 table.

  Scenario: B = "studied", A = "passed". Balls drop through a two-stage board:
  studied / did not study, then passed / failed.

  Public:  demos.initConditional(containerEl) → api { drop(n), setPB(p), setPAgivenB(p),
           setPAgivenNotB(p), condition(on), reset(), startAuto(), stopAuto(), state() }
  Uses:    stats.sampleBernoulli;  ui.slider, ui.button, ui.readout, ui.readoutRow,
           ui.chart, ui.prefersReducedMotion;  d3 selection/transition.

  Pattern per D-019: counts update immediately on every drop (D2/D3); the ball
  animation is decoration that follows the ball's real outcome, capped in number
  and skipped under reduced motion.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var DEFAULTS = { pB: 0.6, pAgivenB: 0.8, pAgivenNotB: 0.4 };
  var INITIAL_DROPS = 20;
  var MAX_DROPS = 10000;
  var MAX_ANIMATED = 25;        // balls animated per drop call (rest just count)
  var MAX_LIVE_BALLS = 60;      // D9: never more than this many balls in the DOM at once
  var HOP_MS = 220;             // per stage
  var AUTO_PER_FRAME = 1, STEP_INTERVAL = 250, STEP_DROPS = 10;
  var NODE_R = 0.03;            // node radius, data units (width 1, height 1)
  var LABELS = { b: "Studied", notB: "Did not study", a: "Passed", notA: "Failed" };
  // Board geometry in unit coordinates.
  var NODES = {
    root: { x: 0.5, y: 0.08 },
    b: { x: 0.27, y: 0.42 }, notB: { x: 0.73, y: 0.42 },
    ba: { x: 0.14, y: 0.76 }, bNotA: { x: 0.40, y: 0.76 }, notBa: { x: 0.60, y: 0.76 }, notBNotA: { x: 0.86, y: 0.76 }
  };

  window.demos.initConditional = function (container) {
    var reduced = ui.prefersReducedMotion();
    var state = {
      pB: DEFAULTS.pB, pAgivenB: DEFAULTS.pAgivenB, pAgivenNotB: DEFAULTS.pAgivenNotB,
      counts: { ba: 0, bNotA: 0, notBa: 0, notBNotA: 0 },
      conditioned: false,
      auto: false
    };
    var timer = null;
    var geom = { k: 1, ox: 0, oy: 0 };

    /* ---- controls ---------------------------------------------------- */
    var dropOne = ui.button({ label: "Drop 1", kind: "primary", onClick: function () { drop(1); } });
    var dropMany = ui.button({ label: "Drop 100", onClick: function () { drop(100); } });
    var autoButton = ui.button({ label: "Auto-drop", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var conditionButton = ui.button({ label: "Show only " + LABELS.b.toLowerCase(), onClick: function () { condition(!state.conditioned); } });
    conditionButton.setAttribute("aria-pressed", "false");
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    [dropOne, dropMany, autoButton, conditionButton, resetButton].forEach(function (b) { controls.appendChild(b); });

    var sB = ui.slider({ label: "P(" + LABELS.b + ")", min: 0, max: 1, step: 0.01, value: DEFAULTS.pB, onChange: function (v) { restart({ pB: v }); } });
    var sAB = ui.slider({ label: "P(" + LABELS.a + " | " + LABELS.b + ")", min: 0, max: 1, step: 0.01, value: DEFAULTS.pAgivenB, onChange: function (v) { restart({ pAgivenB: v }); } });
    var sANB = ui.slider({ label: "P(" + LABELS.a + " | " + LABELS.notB + ")", min: 0, max: 1, step: 0.01, value: DEFAULTS.pAgivenNotB, onChange: function (v) { restart({ pAgivenNotB: v }); } });

    var dropsOut = ui.readout({ label: "Drops", decimals: 0 });
    var pAOut = ui.readout({ label: "P(" + LABELS.a + ")", decimals: 3 });
    var pABOut = ui.readout({ label: "P(" + LABELS.a + " | " + LABELS.b + ")", decimals: 3, accent: true });
    var pANBOut = ui.readout({ label: "P(" + LABELS.a + " | " + LABELS.notB + ")", decimals: 3 });
    var note = document.createElement("p");
    note.className = "muted demo__note";
    note.hidden = true;
    note.textContent = "Maximum of " + MAX_DROPS.toLocaleString() + " drops reached. Press Reset to start again.";

    container.appendChild(controls);
    container.appendChild(sB.el);
    container.appendChild(sAB.el);
    container.appendChild(sANB.el);

    /* ---- table (built before the board so render() can fill it, D-021 §2) ---------------------------------------------------------- */
    var table = document.createElement("table");
    table.className = "ui-table";
    table.innerHTML =
      "<caption>Counts so far</caption>" +
      "<thead><tr><th scope=\"col\"></th><th scope=\"col\">" + LABELS.a + "</th><th scope=\"col\">" + LABELS.notA + "</th><th scope=\"col\">Total</th></tr></thead>" +
      "<tbody>" +
      "<tr data-row=\"b\"><th scope=\"row\">" + LABELS.b + "</th><td data-cell=\"ba\"></td><td data-cell=\"bNotA\"></td><td data-cell=\"b\"></td></tr>" +
      "<tr data-row=\"notB\"><th scope=\"row\">" + LABELS.notB + "</th><td data-cell=\"notBa\"></td><td data-cell=\"notBNotA\"></td><td data-cell=\"notB\"></td></tr>" +
      "<tr data-row=\"total\"><th scope=\"row\">Total</th><td data-cell=\"a\"></td><td data-cell=\"notA\"></td><td data-cell=\"n\"></td></tr>" +
      "</tbody>";
    var cells = {};
    Array.prototype.forEach.call(table.querySelectorAll("[data-cell]"), function (td) { cells[td.dataset.cell] = td; });

    /* ---- board --------------------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.62, minHeight: 320, margin: { top: 8, right: 8, bottom: 8, left: 8 }, ariaLabel: "Branching board: balls split by studied or not, then passed or failed; counts at the four leaves" });
    var edges = [["root", "b"], ["root", "notB"], ["b", "ba"], ["b", "bNotA"], ["notB", "notBa"], ["notB", "notBNotA"]];
    var edgeSel = frame.plot.selectAll("line.board-edge").data(edges).enter().append("line").attr("class", "board-edge");
    var edgeLabelSel = frame.plot.selectAll("text.board-edge-label").data(edges).enter().append("text").attr("class", "board-label board-edge-label").attr("text-anchor", "middle");
    var nodeKeys = Object.keys(NODES);
    var nodeSel = frame.plot.selectAll("g.board-node").data(nodeKeys).enter().append("g").attr("class", function (k) { return "board-node board-node--" + k; });
    nodeSel.append("circle");
    // Labels sit beside the nodes so balls never pass through text: root above,
    // middle nodes to the outside, leaves below (counts below the leaf labels).
    nodeSel.append("text").attr("class", "board-label").attr("dy", "0.35em")
      .attr("text-anchor", function (k) { return k === "b" ? "end" : k === "notB" ? "start" : "middle"; });
    var countSel = frame.plot.selectAll("text.board-count").data(["ba", "bNotA", "notBa", "notBNotA"]).enter().append("text").attr("class", "board-label board-count").attr("text-anchor", "middle");
    var ballLayer = frame.plot.append("g");

    container.appendChild(ui.readoutRow([dropsOut, pAOut, pABOut, pANBOut]));
    container.appendChild(table);
    container.appendChild(note);

    frame.onResize(function (f) {
      geom.k = Math.min(f.width, f.height / 0.9);
      geom.ox = (f.width - geom.k) / 2;
      geom.oy = 0;
      edgeSel.attr("x1", function (e) { return px(NODES[e[0]].x); }).attr("y1", function (e) { return py(NODES[e[0]].y); })
        .attr("x2", function (e) { return px(NODES[e[1]].x); }).attr("y2", function (e) { return py(NODES[e[1]].y); });
      edgeLabelSel.attr("x", function (e) { return (px(NODES[e[0]].x) + px(NODES[e[1]].x)) / 2 + (NODES[e[1]].x < NODES[e[0]].x ? -14 : 14); })
        .attr("y", function (e) { return (py(NODES[e[0]].y) + py(NODES[e[1]].y)) / 2; });
      nodeSel.attr("transform", function (k) { return "translate(" + px(NODES[k].x) + "," + py(NODES[k].y) + ")"; });
      var r = geom.k * NODE_R;
      nodeSel.select("circle").attr("r", r);
      nodeSel.select("text")
        .attr("x", function (k) { return k === "b" ? -(r + 6) : k === "notB" ? r + 6 : 0; })
        .attr("y", function (k) { return k === "root" ? -(r + 10) : (k === "b" || k === "notB") ? 0 : r + 14; });
      countSel.attr("x", function (k) { return px(NODES[k].x); }).attr("y", function (k) { return py(NODES[k].y) + r + 32; });
      render();
    });
    function px(x) { return geom.ox + geom.k * x; }
    function py(y) { return geom.oy + geom.k * y; }

    /* ---- updates -------------------------------------------------------- */
    function total() { var c = state.counts; return c.ba + c.bNotA + c.notBa + c.notBNotA; }

    /** One ball: B with pB; then A with pA|B or pA|¬B. Returns the leaf key. */
    function dropOnce() {
      var b = stats.sampleBernoulli(state.pB);
      var a = stats.sampleBernoulli(b ? state.pAgivenB : state.pAgivenNotB);
      var leaf = b ? (a ? "ba" : "bNotA") : (a ? "notBa" : "notBNotA");
      state.counts[leaf] += 1;
      return leaf;
    }

    function drop(n) {
      var added = 0, leaves = [];
      while (added < n && total() < MAX_DROPS) { leaves.push(dropOnce()); added += 1; }
      if (total() >= MAX_DROPS) stopAuto();
      render();
      var room = MAX_LIVE_BALLS - ballLayer.selectAll("circle.ball").size();
      animate(leaves.slice(0, Math.max(0, Math.min(MAX_ANIMATED, room))));
      return added;
    }

    function clearCounts() { state.counts = { ba: 0, bNotA: 0, notBa: 0, notBNotA: 0 }; }

    /** A changed probability is a new experiment (D-019 §3). */
    function restart(changes) {
      Object.assign(state, changes);
      clearCounts();
      drop(INITIAL_DROPS);
    }

    function condition(on) {
      state.conditioned = !!on;
      conditionButton.setAttribute("aria-pressed", String(state.conditioned));
      render();
    }

    function reset() {
      stopAuto();
      sB.set(DEFAULTS.pB, true); sAB.set(DEFAULTS.pAgivenB, true); sANB.set(DEFAULTS.pAgivenNotB, true);
      state.conditioned = false;
      conditionButton.setAttribute("aria-pressed", "false");
      restart({ pB: DEFAULTS.pB, pAgivenB: DEFAULTS.pAgivenB, pAgivenNotB: DEFAULTS.pAgivenNotB });
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var c = state.counts, n = total();
      var nB = c.ba + c.bNotA, nNotB = c.notBa + c.notBNotA, nA = c.ba + c.notBa;
      var capped = n >= MAX_DROPS;
      dropsOut.set(n);
      pAOut.set(n ? nA / n : NaN);
      pABOut.set(nB ? c.ba / nB : NaN);
      pANBOut.set(nNotB ? c.notBa / nNotB : NaN);
      dropOne.disabled = capped; dropMany.disabled = capped; autoButton.disabled = capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-drop";
      note.hidden = !capped;

      cells.ba.textContent = c.ba; cells.bNotA.textContent = c.bNotA; cells.b.textContent = nB;
      cells.notBa.textContent = c.notBa; cells.notBNotA.textContent = c.notBNotA; cells.notB.textContent = nNotB;
      cells.a.textContent = nA; cells.notA.textContent = n - nA; cells.n.textContent = n;
      table.querySelector("[data-row=notB]").classList.toggle("is-dimmed", state.conditioned);
      table.querySelector("[data-row=total]").classList.toggle("is-dimmed", state.conditioned);
      table.querySelector("[data-row=b]").classList.toggle("is-focus", state.conditioned);

      var probs = { "root-b": state.pB, "root-notB": 1 - state.pB, "b-ba": state.pAgivenB, "b-bNotA": 1 - state.pAgivenB, "notB-notBa": state.pAgivenNotB, "notB-notBNotA": 1 - state.pAgivenNotB };
      edgeLabelSel.text(function (e) { return ui.formatNumber(probs[e[0] + "-" + e[1]], 2); });
      var dimmed = function (key) { return state.conditioned && key.indexOf("notB") === 0; };
      edgeSel.classed("is-dimmed", function (e) { return dimmed(e[1]); });
      edgeLabelSel.classed("is-dimmed", function (e) { return dimmed(e[1]); });
      nodeSel.classed("is-dimmed", dimmed).classed("is-focus", function (k) { return state.conditioned && (k === "b" || k === "ba" || k === "bNotA"); });
      nodeSel.select("text").text(function (k) {
        return { root: "Start", b: LABELS.b, notB: LABELS.notB, ba: LABELS.a, bNotA: LABELS.notA, notBa: LABELS.a, notBNotA: LABELS.notA }[k];
      });
      countSel.classed("is-dimmed", dimmed).text(function (k) { return c[k]; });
    }

    /* ---- ball animation (decoration; counts already updated) --------- */
    function animate(leaves) {
      if (reduced || !leaves.length) return;
      leaves.forEach(function (leaf, i) {
        var mid = leaf.indexOf("notB") === 0 ? "notB" : "b";
        var ball = ballLayer.append("circle").attr("class", "ball").attr("r", 5)
          .attr("cx", px(NODES.root.x)).attr("cy", py(NODES.root.y));
        ball.transition().delay(i * 30).duration(HOP_MS).ease(d3.easeQuadIn)
          .attr("cx", px(NODES[mid].x)).attr("cy", py(NODES[mid].y))
          .transition().duration(HOP_MS).ease(d3.easeQuadIn)
          .attr("cx", px(NODES[leaf].x)).attr("cy", py(NODES[leaf].y))
          .remove();
      });
    }

    /* ---- auto loop ------------------------------------------------------ */
    function startAuto() {
      if (state.auto || total() >= MAX_DROPS) return;
      state.auto = true;
      if (reduced) timer = window.setInterval(function () { drop(STEP_DROPS); }, STEP_INTERVAL);
      else { var step = function () { if (!state.auto) return; drop(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); }; timer = window.requestAnimationFrame(step); }
      render();
    }
    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null;
      render();
    }

    /* ---- initial state (D5) -------------------------------------------- */
    drop(INITIAL_DROPS);

    /* ---- api -------------------------------------------------------------- */
    return {
      el: container,
      drop: drop,
      setPB: function (p) { sB.set(p, true); restart({ pB: p }); },
      setPAgivenB: function (p) { sAB.set(p, true); restart({ pAgivenB: p }); },
      setPAgivenNotB: function (p) { sANB.set(p, true); restart({ pAgivenNotB: p }); },
      condition: condition,
      reset: reset,
      startAuto: startAuto,
      stopAuto: stopAuto,
      state: function () {
        return { pB: state.pB, pAgivenB: state.pAgivenB, pAgivenNotB: state.pAgivenNotB, counts: Object.assign({}, state.counts), conditioned: state.conditioned, auto: state.auto, total: total() };
      },
      constants: { INITIAL_DROPS: INITIAL_DROPS, MAX_DROPS: MAX_DROPS, MAX_LIVE_BALLS: MAX_LIVE_BALLS, DEFAULTS: DEFAULTS, LABELS: LABELS }
    };
  };
})();
