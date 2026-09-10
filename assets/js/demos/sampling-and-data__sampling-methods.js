/*
  sampling-and-data__sampling-methods.js — SYLLABUS §1.2 "Sampling methods and bias".

  Teaches: how you sample decides what you can conclude. Simple random,
  stratified, and cluster samples all centre on the truth (with different
  swings); a convenience sample keeps picking the nearest neighbourhood and its
  running mean settles away from the population mean.

  Scenario: 800 residents in four neighbourhoods; the value is daily commute
  time in minutes, which differs by neighbourhood.

  Public:  demos.initSamplingMethods(containerEl) → api { setMethod(m), draw(k),
           setN(n), reset(), state() }   m ∈ "simple" | "stratified" | "cluster" | "convenience"
  Uses:    stats.sampleNormal, stats.sampleWithoutReplacement, stats.randomInt,
           stats.mean;  ui.slider, ui.button, ui.readout, ui.readoutRow, ui.chart,
           ui.canvas, ui.token;  d3 selection.

  Pattern per D-019 / D-020. Dots on Canvas (D-007); markers in SVG.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var W = 1, H = 0.7;                  // field in data units
  var GROUPS = [                       // neighbourhoods: centre, spread, size, commute mean
    { name: "Riverside", cx: 0.25, cy: 0.5, sd: 0.085, size: 300, mean: 20 },
    { name: "Eastgate", cx: 0.75, cy: 0.5, sd: 0.085, size: 250, mean: 35 },
    { name: "Hillcrest", cx: 0.25, cy: 0.18, sd: 0.075, size: 150, mean: 50 },
    { name: "Northfield", cx: 0.75, cy: 0.18, sd: 0.07, size: 100, mean: 65 }
  ];
  var WITHIN_SD = 6;
  var ENTRANCE = { x: 0, y: H };       // bottom-left corner: where a convenience sampler stands
  var METHODS = [
    { key: "simple", label: "Simple random" },
    { key: "stratified", label: "Stratified" },
    { key: "cluster", label: "Cluster" },
    { key: "convenience", label: "Convenience" }
  ];
  var MIN_N = 10, MAX_N = 200, STEP_N = 10, DEFAULT_N = 40;
  var MAX_DRAWS = 5000;
  var DOT_R = 2.5, SAMPLE_R = 4;

  window.demos.initSamplingMethods = function (container) {
    // Declared first: frame.onResize renders synchronously during setup (D-021).
    var SAMPLERS = { simple: simple, stratified: stratified, cluster: cluster, convenience: convenience };
    var MESSAGES = {
      simple: "Every resident is equally likely to be picked. Sample means scatter around the truth and their average settles on it.",
      stratified: "Each neighbourhood is sampled in proportion to its size, so every draw is balanced. The swings are smaller than a simple random sample's.",
      cluster: "One whole neighbourhood is chosen at random and sampled inside. Cheap to do, but each draw swings a long way.",
      convenience: "The nearest residents to the entrance are picked every time. They live in one neighbourhood, so the running mean settles far from the truth: sampling bias."
    };

    var state = { method: "simple", n: DEFAULT_N, people: [], sample: [], draws: 0, sumOfMeans: 0, lastMean: NaN, cluster: -1, populationMean: NaN };
    var geom = { k: 1, ox: 0, oy: 0 };

    /* ---- controls ---------------------------------------------------- */
    var methodGroup = document.createElement("div");
    methodGroup.className = "ui-controls";
    methodGroup.setAttribute("role", "group");
    methodGroup.setAttribute("aria-label", "Sampling method");
    var methodButtons = {};
    METHODS.forEach(function (m) {
      var b = ui.button({ label: m.label, onClick: function () { setMethod(m.key); } });
      b.setAttribute("aria-pressed", "false");
      methodButtons[m.key] = b;
      methodGroup.appendChild(b);
    });
    var drawButton = ui.button({ label: "Draw a sample", kind: "primary", onClick: function () { draw(1); } });
    var drawMany = ui.button({ label: "Draw 20", onClick: function () { draw(20); } });
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    var controls = document.createElement("div");
    controls.className = "ui-controls";
    [drawButton, drawMany, resetButton].forEach(function (b) { controls.appendChild(b); });
    var nSlider = ui.slider({ label: "Sample size, n", min: MIN_N, max: MAX_N, step: STEP_N, value: DEFAULT_N, onChange: setN });

    var muOut = ui.readout({ label: "Population mean", decimals: 1 });
    var xbarOut = ui.readout({ label: "This sample's mean", decimals: 1, accent: true });
    var runOut = ui.readout({ label: "Mean of all sample means", decimals: 1, accent: true });
    var drawsOut = ui.readout({ label: "Samples drawn", decimals: 0 });
    var status = document.createElement("p");
    status.className = "demo__status";
    status.setAttribute("role", "status");

    container.appendChild(methodGroup);
    container.appendChild(controls);
    container.appendChild(nSlider.el);

    /* ---- chart --------------------------------------------------------- */
    var chartHost = document.createElement("div");
    container.appendChild(chartHost);
    var frame = ui.chart(chartHost, { aspect: H + 0.04, minHeight: 240, margin: { top: 8, right: 8, bottom: 8, left: 8 }, ariaLabel: "Map of 800 residents in four neighbourhoods; the current sample is highlighted" });
    var layer = ui.canvas(frame);
    var space = frame.plot.append("rect").attr("class", "space space--open");   // canvas dots sit underneath
    var region = frame.plot.append("circle").attr("class", "region");
    var groupLabels = frame.plot.selectAll("text.marker-label--soft").data(GROUPS).enter().append("text").attr("class", "marker-label marker-label--soft").attr("text-anchor", "middle");
    var entrance = frame.plot.append("path").attr("class", "entrance").attr("d", "M0,0L14,-8L14,8Z");
    var entranceLabel = frame.plot.append("text").attr("class", "entrance-label").text("Entrance");

    var table = document.createElement("table");
    table.className = "ui-table";
    table.innerHTML = "<caption>Neighbourhoods</caption><thead><tr><th scope=\"col\"></th><th scope=\"col\">Residents</th><th scope=\"col\">Mean commute</th><th scope=\"col\">In this sample</th></tr></thead><tbody>" +
      GROUPS.map(function (g, i) { return "<tr><th scope=\"row\">" + g.name + "</th><td>" + g.size + "</td><td data-mean=\"" + i + "\"></td><td data-count=\"" + i + "\"></td></tr>"; }).join("") + "</tbody>";

    container.appendChild(ui.readoutRow([muOut, xbarOut, runOut, drawsOut]));
    container.appendChild(status);
    container.appendChild(table);

    frame.onResize(function (f) {
      geom.k = Math.min(f.width / W, f.height / H);
      geom.ox = (f.width - geom.k * W) / 2;
      geom.oy = (f.height - geom.k * H) / 2;
      space.attr("x", geom.ox).attr("y", geom.oy).attr("width", geom.k * W).attr("height", geom.k * H);
      groupLabels.attr("x", function (g) { return px(g.cx); }).attr("y", function (g) { return py(g.cy - g.sd * 2.6); }).text(function (g) { return g.name; });
      entrance.attr("transform", "translate(" + (px(ENTRANCE.x) + 4) + "," + (py(ENTRANCE.y) - 10) + ")");
      entranceLabel.attr("x", px(ENTRANCE.x) + 22).attr("y", py(ENTRANCE.y) - 6);
      render();
    });
    function px(x) { return geom.ox + geom.k * x; }
    function py(y) { return geom.oy + geom.k * y; }

    /* ---- population ------------------------------------------------------ */
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function buildPopulation() {
      state.people = [];
      GROUPS.forEach(function (g, gi) {
        for (var i = 0; i < g.size; i++) {
          state.people.push({
            g: gi,
            x: clamp(stats.sampleNormal(g.cx, g.sd), 0.02, W - 0.02),
            y: clamp(stats.sampleNormal(g.cy, g.sd), 0.02, H - 0.02),
            v: Math.max(1, stats.sampleNormal(g.mean, WITHIN_SD))
          });
        }
      });
      state.populationMean = stats.mean(state.people.map(function (p) { return p.v; }));
      state.people.forEach(function (p) { var dx = p.x - ENTRANCE.x, dy = p.y - ENTRANCE.y; p.dist = Math.sqrt(dx * dx + dy * dy); });
      state.byDistance = state.people.map(function (p, i) { return i; }).sort(function (a, b) { return state.people[a].dist - state.people[b].dist; });
    }

    /* ---- the four sampling methods (each returns an array of indices) ---- */
    function indicesOfGroup(gi) { var out = []; state.people.forEach(function (p, i) { if (p.g === gi) out.push(i); }); return out; }

    function simple(n) {
      return stats.sampleWithoutReplacement(state.people.map(function (p, i) { return i; }), n);
    }

    /** Proportional allocation, largest-remainder rounding so the sizes sum to n (OpenStax §1.2). */
    function stratified(n) {
      var total = state.people.length;
      var quotas = GROUPS.map(function (g) { return n * g.size / total; });
      var sizes = quotas.map(Math.floor);
      var left = n - sizes.reduce(function (s, v) { return s + v; }, 0);
      var order = quotas.map(function (q, i) { return { i: i, r: q - Math.floor(q) }; }).sort(function (a, b) { return b.r - a.r; });
      for (var k = 0; k < left; k++) sizes[order[k].i] += 1;
      var out = [];
      GROUPS.forEach(function (g, gi) { out = out.concat(stats.sampleWithoutReplacement(indicesOfGroup(gi), Math.min(sizes[gi], g.size))); });
      return out;
    }

    /** One randomly chosen neighbourhood, then n residents from within it. */
    function cluster(n) {
      state.cluster = stats.randomInt(0, GROUPS.length - 1);
      var members = indicesOfGroup(state.cluster);
      return stats.sampleWithoutReplacement(members, Math.min(n, members.length));
    }

    /** The n residents closest to the entrance — whoever is easiest to reach. */
    function convenience(n) {
      return state.byDistance.slice(0, n);
    }

    /* ---- updates ----------------------------------------------------------- */
    function draw(k) {
      var added = 0;
      while (added < k && state.draws < MAX_DRAWS) {
        if (state.method !== "cluster") state.cluster = -1;
        state.sample = SAMPLERS[state.method](state.n);
        state.lastMean = stats.mean(state.sample.map(function (i) { return state.people[i].v; }));
        state.sumOfMeans += state.lastMean;
        state.draws += 1;
        added += 1;
      }
      render();
      return added;
    }

    function clearRun() { state.draws = 0; state.sumOfMeans = 0; state.lastMean = NaN; state.sample = []; state.cluster = -1; }

    function setMethod(m) {
      if (!SAMPLERS[m]) return;
      state.method = m;
      clearRun();
      draw(1);
    }

    function setN(n) {
      state.n = clamp(Math.round(n / STEP_N) * STEP_N, MIN_N, MAX_N);
      clearRun();
      draw(1);
    }

    function reset() {
      nSlider.set(DEFAULT_N, true);
      state.n = DEFAULT_N;
      state.method = "simple";
      clearRun();
      draw(1);
    }

    /* ---- render ------------------------------------------------------------- */
    function render() {
      if (!state.people.length) return;   // frame.onResize fires before the population is built
      var capped = state.draws >= MAX_DRAWS;
      METHODS.forEach(function (m) { methodButtons[m.key].setAttribute("aria-pressed", String(state.method === m.key)); });
      drawButton.disabled = capped; drawMany.disabled = capped;
      muOut.set(state.populationMean);
      xbarOut.set(state.lastMean);
      runOut.set(state.draws ? state.sumOfMeans / state.draws : NaN);
      drawsOut.set(state.draws);
      status.textContent = MESSAGES[state.method];

      var ctx = layer.ctx;
      layer.clear();
      var inSample = {};
      state.sample.forEach(function (i) { inSample[i] = true; });
      var colours = [ui.token("--cat-1"), ui.token("--cat-2"), ui.token("--cat-3"), ui.token("--cat-4")];
      ctx.globalAlpha = 0.35;
      state.people.forEach(function (p, i) {
        if (inSample[i]) return;
        ctx.fillStyle = colours[p.g];
        ctx.beginPath(); ctx.arc(px(p.x), py(p.y), DOT_R, 0, 2 * Math.PI); ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ui.token("--ink");
      ctx.lineWidth = 1.5;
      state.sample.forEach(function (i) {
        var p = state.people[i];
        ctx.fillStyle = colours[p.g];
        ctx.beginPath(); ctx.arc(px(p.x), py(p.y), SAMPLE_R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      });

      var showCluster = state.method === "cluster" && state.cluster >= 0;
      var g = showCluster ? GROUPS[state.cluster] : null;
      region.style("display", showCluster ? null : "none");
      if (showCluster) region.attr("cx", px(g.cx)).attr("cy", py(g.cy)).attr("r", geom.k * g.sd * 2.8);
      var showEntrance = state.method === "convenience";
      entrance.style("display", showEntrance ? null : "none");
      entranceLabel.style("display", showEntrance ? null : "none");

      var counts = [0, 0, 0, 0];
      state.sample.forEach(function (i) { counts[state.people[i].g] += 1; });
      GROUPS.forEach(function (grp, gi) {
        var members = state.people.filter(function (p) { return p.g === gi; });
        table.querySelector("[data-mean=\"" + gi + "\"]").textContent = ui.formatNumber(stats.mean(members.map(function (p) { return p.v; })), 1);
        table.querySelector("[data-count=\"" + gi + "\"]").textContent = counts[gi];
      });
    }

    /* ---- initial state (D5) ------------------------------------------------ */
    buildPopulation();
    draw(1);

    /* ---- api ------------------------------------------------------------------- */
    return {
      el: container,
      setMethod: setMethod,
      draw: draw,
      setN: function (n) { nSlider.set(n, true); setN(n); },
      reset: reset,
      state: function () {
        return {
          method: state.method, n: state.n, draws: state.draws, lastMean: state.lastMean,
          runningMean: state.draws ? state.sumOfMeans / state.draws : NaN, populationMean: state.populationMean,
          sample: state.sample.slice(), cluster: state.cluster,
          people: state.people.map(function (p) { return { g: p.g, v: p.v, dist: p.dist }; })
        };
      },
      constants: { GROUPS: GROUPS.map(function (g) { return { name: g.name, size: g.size, mean: g.mean }; }), MIN_N: MIN_N, MAX_N: MAX_N, DEFAULT_N: DEFAULT_N, MAX_DRAWS: MAX_DRAWS, METHODS: METHODS.map(function (m) { return m.key; }) }
    };
  };
})();
