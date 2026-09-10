/*
  probability-topics__coin-flip.js — SYLLABUS §3.1 "Chance and long-run frequency".

  Teaches: probability is long-run relative frequency — the running proportion of
  heads settles toward the true p as flips accumulate.

  Public:  demos.initCoinFlip(containerEl) → api { flip(n), setP(p), reset(),
           startAuto(), stopAuto(), state() }   (api exists so tests can check honesty)
  Uses:    stats.sampleBernoulli;  ui.slider, ui.button, ui.readout, ui.readoutRow,
           ui.chart, ui.prefersReducedMotion;  d3 scales/line/selection.

  PATTERN (PLAN Phase 4 — later demos copy this shape):
    1. constants   2. state object   3. build controls   4. build chart + marks
    5. pure update functions (flip / setP / reset)   6. render() that redraws
    everything from state   7. animation loop guarded by reduced-motion
    8. initial state that already shows something (D5)   9. return api
  Nothing outside `container` is touched. Every displayed number is computed from
  the actual draws (D3); inputs are bounded (D6); axes rescale rarely (D7).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var DEFAULT_P = 0.5;
  var INITIAL_FLIPS = 10;      // D5: the chart is never empty
  var MAX_FLIPS = 100000;      // D6: hard cap; auto-flip stops, buttons disable
  var STRIP_LENGTH = 30;       // most recent outcomes drawn as coins (fewer when the strip is narrow)
  var STRIP_MIN = 5;
  var PATH_POINTS = 2000;      // D9: thin the running line beyond this many points
  var AUTO_PER_FRAME = 1;      // flips per animation frame in auto mode (~60/s)
  var STEP_INTERVAL = 250;     // reduced motion: stepped updates every 250 ms …
  var STEP_FLIPS = 15;         // … of 15 flips (same throughput, no continuous motion)
  var COIN = 26;               // coin spacing in CSS px and in strip viewBox units (1:1)

  window.demos.initCoinFlip = function (container) {
    var reduced = ui.prefersReducedMotion();

    /* ---- 2. state ---------------------------------------------------- */
    var state = {
      p: DEFAULT_P,
      flips: 0,
      heads: 0,
      outcomes: [],      // 1 = heads, 0 = tails, in order
      proportions: [],   // running heads / flips after each flip
      xMax: 100,         // x-axis extent; doubles when exceeded (D7: rare rescale)
      auto: false
    };
    var timer = null;    // rAF id or interval id while auto-flipping

    /* ---- 3. controls ------------------------------------------------- */
    var flipOne = ui.button({ label: "Flip 1", kind: "primary", onClick: function () { flip(1); } });
    var flipHundred = ui.button({ label: "Flip 100", onClick: function () { flip(100); } });
    var autoButton = ui.button({ label: "Auto-flip", onClick: function () { if (state.auto) stopAuto(); else startAuto(); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    [flipOne, flipHundred, autoButton, resetButton].forEach(function (b) { controls.appendChild(b); });

    var pSlider = ui.slider({
      label: "Probability of heads, p", min: 0, max: 1, step: 0.01, value: DEFAULT_P,
      onChange: function (v) { setP(v); }
    });

    var flipsOut = ui.readout({ label: "Flips", value: 0, decimals: 0 });
    var headsOut = ui.readout({ label: "Heads", value: 0, decimals: 0 });
    var propOut = ui.readout({ label: "Proportion of heads", value: NaN, decimals: 3, accent: true });
    var pOut = ui.readout({ label: "True p", value: DEFAULT_P, decimals: 2 });
    var note = document.createElement("p");
    note.className = "muted demo__note";
    note.hidden = true;
    note.textContent = "Maximum of " + MAX_FLIPS.toLocaleString() + " flips reached. Press Reset to start again.";

    container.appendChild(controls);
    container.appendChild(pSlider.el);

    /* ---- 4. chart + marks -------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: 0.5, ariaLabel: "Running proportion of heads against number of flips, with the true probability as a dashed line" });
    var x = d3.scaleLinear().domain([0, state.xMax]);
    var y = d3.scaleLinear().domain([0, 1]);
    var truthLine = frame.plot.append("line").attr("class", "line line--reference");
    var truthLabel = frame.plot.append("text").attr("class", "ui-chart__axis-label").attr("text-anchor", "end").attr("dy", "-0.4em");
    var runningPath = frame.plot.append("path").attr("class", "line line--strong");
    var lineGen = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });

    // Strip of recent outcomes: filled coin = heads, hollow coin = tails (shape, not only colour).
    var stripHost = document.createElement("div");
    stripHost.className = "coin-strip";
    container.appendChild(stripHost);
    var strip = d3.select(stripHost).append("svg")
      .attr("role", "img").attr("aria-label", "Most recent flips, newest on the right");
    var stripGroup = strip.append("g").attr("transform", "translate(0," + COIN / 2 + ")");

    container.appendChild(ui.readoutRow([flipsOut, headsOut, propOut, pOut]));
    container.appendChild(note);

    frame.onResize(function (f) {
      x.range([0, f.width]);
      y.range([f.height, 0]);
      f.yGrid(y, 4);
      f.xAxis(x, { label: "flips" });
      f.yAxis(y, { label: "proportion of heads", ticks: 4 });
      render();
    });

    /* ---- 5. updates (pure state changes, then render) ---------------- */
    function flip(n) {
      var added = 0;
      while (added < n && state.flips < MAX_FLIPS) {
        var h = stats.sampleBernoulli(state.p);   // the only source of randomness (D3)
        state.flips += 1;
        state.heads += h;
        state.outcomes.push(h);
        state.proportions.push(state.heads / state.flips);
        added += 1;
      }
      while (state.flips > state.xMax) state.xMax *= 2;
      if (state.flips >= MAX_FLIPS) stopAuto();
      render();
      return added;
    }

    function clearFlips() {
      state.flips = 0; state.heads = 0; state.outcomes = []; state.proportions = []; state.xMax = 100;
    }

    /** New p means a new experiment: the running proportion must refer to this p. */
    function setP(p) {
      state.p = p;
      clearFlips();
      flip(INITIAL_FLIPS);
    }

    function reset() {
      stopAuto();
      pSlider.set(DEFAULT_P, true);
      setP(DEFAULT_P);
    }

    /* ---- 6. render: everything from state ---------------------------- */
    function render() {
      var capped = state.flips >= MAX_FLIPS;
      flipsOut.set(state.flips);
      headsOut.set(state.heads);
      propOut.set(state.flips ? state.heads / state.flips : NaN);
      pOut.set(state.p);
      flipOne.disabled = capped;
      flipHundred.disabled = capped;
      autoButton.disabled = capped;
      note.hidden = !capped;
      autoButton.textContent = state.auto ? "Stop" : "Auto-flip";

      // Rescale is instant: it happens only when flips pass 100, 200, 400, … (D7 "rarely"),
      // and interpolating a path whose point count changed draws nonsense frames.
      x.domain([0, state.xMax]);
      frame.xAxis(x, { label: "flips" });

      // Thin the running line for long runs; the last point is always kept.
      var pts = [];
      var n = state.proportions.length;
      var stride = n > PATH_POINTS ? Math.ceil(n / PATH_POINTS) : 1;
      for (var i = 0; i < n; i += stride) pts.push([i + 1, state.proportions[i]]);
      if (n && (n - 1) % stride !== 0) pts.push([n, state.proportions[n - 1]]);
      runningPath.attr("d", n ? lineGen(pts) : null);

      truthLine.attr("x1", 0).attr("x2", frame.width).attr("y1", y(state.p)).attr("y2", y(state.p));
      truthLabel.attr("x", frame.width).attr("y", y(state.p)).text("p = " + ui.formatNumber(state.p, 2));

      // Show as many coins as fit at full size (D9/legibility on phones), newest at the right.
      var visible = Math.max(STRIP_MIN, Math.min(STRIP_LENGTH, Math.floor(stripHost.clientWidth / COIN) || STRIP_LENGTH));
      strip.attr("viewBox", "0 0 " + (visible * COIN) + " " + COIN).attr("width", visible * COIN);
      var recent = state.outcomes.slice(-visible);
      var offset = visible - recent.length;
      var coins = stripGroup.selectAll("g.coin").data(recent.map(function (h, i) { return { h: h, i: i + offset }; }), function (d) { return d.i; });
      coins.exit().remove();
      var enter = coins.enter().append("g").attr("class", "coin");
      enter.append("circle").attr("r", COIN / 2 - 2);
      enter.append("text").attr("text-anchor", "middle").attr("dy", "0.35em");
      var all = enter.merge(coins);
      all.attr("transform", function (d) { return "translate(" + (d.i * COIN + COIN / 2) + ",0)"; });
      all.select("circle").attr("class", function (d) { return d.h ? "mark mark--strong" : "mark mark--hollow"; });
      all.select("text").attr("class", function (d) { return d.h ? "mark-label mark-label--light" : "mark-label"; }).text(function (d) { return d.h ? "H" : "T"; });
    }

    /* ---- 7. auto-flip loop ------------------------------------------- */
    function startAuto() {
      if (state.auto || state.flips >= MAX_FLIPS) return;
      state.auto = true;
      if (reduced) {
        timer = window.setInterval(function () { flip(STEP_FLIPS); }, STEP_INTERVAL);
      } else {
        var step = function () { if (!state.auto) return; flip(AUTO_PER_FRAME); timer = window.requestAnimationFrame(step); };
        timer = window.requestAnimationFrame(step);
      }
      render();
    }

    function stopAuto() {
      if (!state.auto) return;
      state.auto = false;
      if (reduced) window.clearInterval(timer); else window.cancelAnimationFrame(timer);
      timer = null;
      render();
    }

    /* ---- 8. initial state -------------------------------------------- */
    flip(INITIAL_FLIPS);

    /* ---- 9. api ------------------------------------------------------ */
    return {
      el: container,
      flip: flip,
      setP: function (p) { pSlider.set(p, true); setP(p); },
      reset: reset,
      startAuto: startAuto,
      stopAuto: stopAuto,
      state: function () {
        return { p: state.p, flips: state.flips, heads: state.heads, xMax: state.xMax, auto: state.auto, outcomes: state.outcomes.slice(), proportions: state.proportions.slice() };
      },
      constants: { INITIAL_FLIPS: INITIAL_FLIPS, MAX_FLIPS: MAX_FLIPS, STRIP_LENGTH: STRIP_LENGTH, STRIP_MIN: STRIP_MIN, COIN: COIN, PATH_POINTS: PATH_POINTS, DEFAULT_P: DEFAULT_P }
    };
  };
})();
