/*
  probability-topics__events.js — SYLLABUS §3.2 "Events, unions, intersections".

  Teaches: union, intersection, and complement are regions of the sample space;
  "mutually exclusive" and "independent" are different ideas.

  Public:  demos.initEvents(containerEl) → api { setA(x, y), setB(x, y), resample(),
           setN(n), reset(), state() }
  Uses:    stats.sampleUniform;  ui.slider, ui.button, ui.readout, ui.readoutRow,
           ui.chart;  d3 drag/selection.

  Pattern per D-019. The sample space is the rectangle [0,1] × [0,H]; every
  probability shown is a count of the visible points divided by n (D3).
  Point count is capped at 400 so the field stays in SVG (D-007).
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var H = 0.7;                 // sample-space height in data units (width is 1)
  var RADIUS = 0.2;            // event circle radius, data units
  var MIN_N = 50, MAX_N = 400, STEP_N = 50, DEFAULT_N = 200;
  var DEFAULT_A = { x: 0.36, y: 0.35 };
  var DEFAULT_B = { x: 0.64, y: 0.35 };
  var KEY_STEP = 0.02;         // arrow-key nudge, data units
  var POINT_R = 3.5;           // px

  window.demos.initEvents = function (container) {
    /* ---- state ------------------------------------------------------- */
    var state = {
      n: DEFAULT_N,
      points: [],                           // [{x, y}] in data units
      a: { x: DEFAULT_A.x, y: DEFAULT_A.y },
      b: { x: DEFAULT_B.x, y: DEFAULT_B.y },
      counts: { a: 0, b: 0, both: 0, either: 0 }
    };
    var geom = { k: 1, ox: 0, oy: 0 };      // px per data unit and plot offsets

    /* ---- controls ---------------------------------------------------- */
    var resampleButton = ui.button({ label: "New points", kind: "primary", onClick: resample });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    controls.appendChild(resampleButton);
    controls.appendChild(resetButton);
    var nSlider = ui.slider({ label: "Number of points, n", min: MIN_N, max: MAX_N, step: STEP_N, value: DEFAULT_N, onChange: setN });

    var pA = ui.readout({ label: "P(A)", decimals: 3 });
    var pB = ui.readout({ label: "P(B)", decimals: 3 });
    var pBoth = ui.readout({ label: "P(A and B)", decimals: 3, accent: true });
    var pEither = ui.readout({ label: "P(A or B)", decimals: 3, accent: true });
    var pProduct = ui.readout({ label: "P(A) × P(B)", decimals: 3 });
    var status = document.createElement("p");
    status.className = "demo__status";
    status.setAttribute("role", "status");

    container.appendChild(controls);
    container.appendChild(nSlider.el);

    /* ---- chart + marks ----------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: H + 0.04, margin: { top: 8, right: 8, bottom: 8, left: 8 }, ariaLabel: "Sample space with random points and two draggable event circles A and B" });
    var space = frame.plot.append("rect").attr("class", "space");
    var pointLayer = frame.plot.append("g");
    var eventA = makeEvent("a", "A");
    var eventB = makeEvent("b", "B");

    container.appendChild(ui.readoutRow([pA, pB, pBoth, pEither, pProduct]));
    container.appendChild(status);

    function makeEvent(key, label) {
      var g = frame.plot.append("g")
        .attr("class", "event draggable event--" + key)
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("aria-label", "Event " + label + ": drag with the pointer, or press the arrow keys to move");
      g.append("circle").attr("class", "event__disc");
      g.append("text").attr("class", "event__label").attr("text-anchor", "middle").attr("dy", "0.35em").text(label);
      g.call(d3.drag().on("drag", function (event) {
        move(key, state[key].x + event.dx / geom.k, state[key].y + event.dy / geom.k);
      }));
      g.on("keydown", function (event) {
        var dx = 0, dy = 0;
        if (event.key === "ArrowLeft") dx = -KEY_STEP; else if (event.key === "ArrowRight") dx = KEY_STEP;
        else if (event.key === "ArrowUp") dy = -KEY_STEP; else if (event.key === "ArrowDown") dy = KEY_STEP;
        else return;
        event.preventDefault();
        move(key, state[key].x + dx, state[key].y + dy);
      });
      return g;
    }

    frame.onResize(function (f) {
      // Uniform scale so circles stay circular: fit the 1 × H space into the plot.
      geom.k = Math.min(f.width, f.height / H);
      geom.ox = (f.width - geom.k) / 2;
      geom.oy = (f.height - geom.k * H) / 2;
      space.attr("x", geom.ox).attr("y", geom.oy).attr("width", geom.k).attr("height", geom.k * H);
      render();
    });

    /* ---- updates ------------------------------------------------------ */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function move(key, x, y) {
      state[key].x = clamp(x, RADIUS, 1 - RADIUS);
      state[key].y = clamp(y, RADIUS, H - RADIUS);
      render();
    }

    function resample() {
      state.points = [];
      for (var i = 0; i < state.n; i++) state.points.push({ x: stats.sampleUniform(0, 1), y: stats.sampleUniform(0, H) });
      render();
    }

    function setN(n) {
      state.n = clamp(Math.round(n), MIN_N, MAX_N);
      resample();
    }

    function reset() {
      nSlider.set(DEFAULT_N, true);
      state.n = DEFAULT_N;
      state.a = { x: DEFAULT_A.x, y: DEFAULT_A.y };
      state.b = { x: DEFAULT_B.x, y: DEFAULT_B.y };
      resample();
    }

    function inside(p, c) { var dx = p.x - c.x, dy = p.y - c.y; return dx * dx + dy * dy <= RADIUS * RADIUS; }

    function count() {
      var c = { a: 0, b: 0, both: 0, either: 0 };
      state.points.forEach(function (p) {
        var ia = inside(p, state.a), ib = inside(p, state.b);
        if (ia) c.a++;
        if (ib) c.b++;
        if (ia && ib) c.both++;
        if (ia || ib) c.either++;
      });
      state.counts = c;
      return c;
    }

    /* ---- render -------------------------------------------------------- */
    function px(x) { return geom.ox + geom.k * x; }
    function py(y) { return geom.oy + geom.k * y; }

    function render() {
      var c = count();
      var n = state.points.length;
      pA.set(n ? c.a / n : NaN);
      pB.set(n ? c.b / n : NaN);
      pBoth.set(n ? c.both / n : NaN);
      pEither.set(n ? c.either / n : NaN);
      pProduct.set(n ? (c.a / n) * (c.b / n) : NaN);

      var dx = state.a.x - state.b.x, dy = state.a.y - state.b.y;
      var overlap = Math.sqrt(dx * dx + dy * dy) < 2 * RADIUS;
      status.textContent = overlap
        ? "The circles overlap, so A and B can happen together, so they are not mutually exclusive. Compare P(A and B) with P(A) × P(B)."
        : "The circles are apart, so A and B never happen together, so they are mutually exclusive. P(A or B) is now exactly P(A) + P(B).";

      var dots = pointLayer.selectAll("circle.pt").data(state.points);
      dots.exit().remove();
      dots.enter().append("circle").attr("r", POINT_R).merge(dots)
        .attr("cx", function (p) { return px(p.x); })
        .attr("cy", function (p) { return py(p.y); })
        .attr("class", function (p) {
          var ia = inside(p, state.a), ib = inside(p, state.b);
          return "pt" + (ia && ib ? " pt--ab" : ia ? " pt--a" : ib ? " pt--b" : "");
        });

      [["a", eventA], ["b", eventB]].forEach(function (pair) {
        var e = state[pair[0]];
        pair[1].attr("transform", "translate(" + px(e.x) + "," + py(e.y) + ")");
        pair[1].select("circle").attr("r", geom.k * RADIUS);
        pair[1].select("text").attr("y", -geom.k * RADIUS + 16);
      });
    }

    /* ---- initial state (D5) ------------------------------------------- */
    resample();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setA: function (x, y) { move("a", x, y); },
      setB: function (x, y) { move("b", x, y); },
      resample: resample,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      reset: reset,
      state: function () {
        return { n: state.n, points: state.points.slice(), a: { x: state.a.x, y: state.a.y }, b: { x: state.b.x, y: state.b.y }, counts: Object.assign({}, state.counts) };
      },
      constants: { H: H, RADIUS: RADIUS, MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, KEY_STEP: KEY_STEP }
    };
  };
})();
