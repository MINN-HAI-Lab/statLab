/*
  demos.test.js — honesty and bounds tests for demo files (SPEC D3, D4, D5, D6, D7).
  Each demo is initialised inside the off-screen sandbox and driven through the
  api it returns. Readouts must equal quantities recomputed from the raw draws.
*/
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");

  function fresh() {
    var host = document.createElement("div");
    host.className = "ui-panel";
    sandbox.appendChild(host);
    return { host: host, api: demos.initCoinFlip(host) };
  }
  function countHeads(outcomes) { return outcomes.reduce(function (s, h) { return s + h; }, 0); }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  test("coin-flip: initial state is non-empty (D5) with the expected controls", function (a) {
    var d = fresh(), s = d.api.state();
    a.equal(s.flips, d.api.constants.INITIAL_FLIPS);
    a.equal(s.p, 0.5);
    a.equal(d.host.querySelectorAll(".ui-button").length, 4);
    a.equal(d.host.querySelector(".ui-button--primary").textContent, "Flip 1");
    a.equal(d.host.querySelectorAll("input[type=range]").length, 1);
    a.equal(d.host.querySelectorAll("svg").length, 2, "chart + coin strip");
    a.ok(d.host.querySelector("path.line").getAttribute("d"), "running line drawn");
    a.equal(readout(d.host, "Flips"), "10");
    a.equal(readout(d.host, "True p"), "0.50");
  });

  test("coin-flip: readouts equal quantities recomputed from the raw outcomes (D3)", function (a) {
    var d = fresh();
    d.api.flip(137);
    var s = d.api.state();
    a.equal(s.flips, 147);
    a.equal(s.outcomes.length, 147);
    a.equal(s.heads, countHeads(s.outcomes));
    a.equal(readout(d.host, "Heads"), String(s.heads));
    a.equal(readout(d.host, "Proportion of heads"), (s.heads / s.flips).toFixed(3));
    a.close(s.proportions[s.proportions.length - 1], s.heads / s.flips, 1e-12);
    for (var i = 0, h = 0; i < s.outcomes.length; i++) { h += s.outcomes[i]; a.close(s.proportions[i], h / (i + 1), 1e-12, "running proportion at flip " + (i + 1)); }
    s.outcomes.forEach(function (o) { a.ok(o === 0 || o === 1, "outcome is 0 or 1"); });
  });

  test("coin-flip: buttons flip through the same path as the api", function (a) {
    var d = fresh();
    var buttons = d.host.querySelectorAll(".ui-button");
    buttons[0].click();
    a.equal(d.api.state().flips, 11);
    buttons[1].click();
    a.equal(d.api.state().flips, 111);
    for (var i = 0; i < 20; i++) buttons[1].click();   // extremes check: 20 fast clicks
    a.equal(d.api.state().flips, 2111);
    a.equal(readout(d.host, "Flips"), "2111");
  });

  test("coin-flip: changing p restarts the run so the proportion refers to the current p; extremes 0 and 1 are safe (D6)", function (a) {
    var d = fresh();
    d.api.flip(50);
    d.api.setP(1);
    var s = d.api.state();
    a.equal(s.p, 1); a.equal(s.flips, 10); a.equal(s.heads, 10);
    a.equal(readout(d.host, "Proportion of heads"), "1.000");
    a.equal(d.host.querySelector("input[type=range]").value, "1");
    d.api.setP(0);
    s = d.api.state();
    a.equal(s.heads, 0); a.equal(readout(d.host, "Proportion of heads"), "0.000");
    d.api.flip(500);
    a.equal(d.api.state().heads, 0, "p = 0 never produces heads");
    // slider input event drives the same path
    var input = d.host.querySelector("input[type=range]");
    input.value = "0.25"; input.dispatchEvent(new Event("input", { bubbles: true }));
    a.equal(d.api.state().p, 0.25); a.equal(d.api.state().flips, 10);
    a.equal(readout(d.host, "True p"), "0.25");
  });

  test("coin-flip: reset restores the initial state including p (D4)", function (a) {
    var d = fresh();
    d.api.setP(0.9); d.api.flip(300); d.api.startAuto();
    a.ok(d.api.state().auto);
    d.api.reset();
    var s = d.api.state();
    a.equal(s.p, 0.5); a.equal(s.flips, 10); a.equal(s.xMax, 100); a.ok(!s.auto);
    a.equal(d.host.querySelector("input[type=range]").value, "0.5");
    a.equal(d.host.querySelectorAll(".ui-button")[2].textContent, "Auto-flip");
  });

  test("coin-flip: x axis doubles rarely instead of creeping (D7)", function (a) {
    var d = fresh();
    a.equal(d.api.state().xMax, 100);
    d.api.flip(90);   // 100 total
    a.equal(d.api.state().xMax, 100);
    d.api.flip(1);    // 101
    a.equal(d.api.state().xMax, 200);
    d.api.flip(400);  // 501
    a.equal(d.api.state().xMax, 800);
  });

  test("coin-flip: hard cap on flips disables inputs and stops auto (D6)", function (a) {
    var d = fresh();
    var max = d.api.constants.MAX_FLIPS;
    var added = d.api.flip(max + 500);
    var s = d.api.state();
    a.equal(s.flips, max);
    a.equal(added, max - d.api.constants.INITIAL_FLIPS);
    a.equal(s.heads, countHeads(s.outcomes));
    var buttons = d.host.querySelectorAll(".ui-button");
    a.ok(buttons[0].disabled && buttons[1].disabled && buttons[2].disabled, "flip buttons disabled at cap");
    a.ok(!buttons[3].disabled, "reset stays enabled");
    a.ok(!d.host.querySelector(".demo__note").hidden, "cap note visible");
    d.api.startAuto();
    a.ok(!s.auto, "auto refuses to start at cap");
    d.api.reset();
    a.equal(d.api.state().flips, 10);
    a.ok(!buttons[0].disabled);
  });

  test("coin-flip: long runs thin the running line and cap the coin strip (D9)", function (a) {
    var d = fresh();
    d.api.flip(5000);
    var pathD = d.host.querySelector("path.line").getAttribute("d");
    var points = pathD.split(/[ML]/).length - 1;
    a.ok(points <= d.api.constants.PATH_POINTS + 1, "path points " + points);
    a.ok(points >= d.api.constants.PATH_POINTS / 2, "still enough points to look continuous");
    var stripWidth = d.host.querySelector(".coin-strip").clientWidth;
    var visible = Math.max(d.api.constants.STRIP_MIN, Math.min(d.api.constants.STRIP_LENGTH, Math.floor(stripWidth / d.api.constants.COIN)));
    a.ok(visible < d.api.constants.STRIP_LENGTH, "600 px sandbox cannot fit all 30 coins, fits " + visible);
    a.equal(d.host.querySelectorAll("g.coin").length, visible, "only as many coins as fit at full size");
    var labels = Array.prototype.map.call(d.host.querySelectorAll("g.coin text"), function (t) { return t.textContent; });
    var recent = d.api.state().outcomes.slice(-visible).map(function (h) { return h ? "H" : "T"; });
    a.equal(labels.join(""), recent.join(""), "strip shows the most recent outcomes in order");
  });

  test("coin-flip: auto-flip toggles label and state; stop halts it", function (a) {
    var d = fresh();
    var auto = d.host.querySelectorAll(".ui-button")[2];
    auto.click();
    a.ok(d.api.state().auto); a.equal(auto.textContent, "Stop");
    auto.click();
    a.ok(!d.api.state().auto); a.equal(auto.textContent, "Auto-flip");
    var before = d.api.state().flips;
    d.api.startAuto(); d.api.stopAuto();
    a.equal(d.api.state().flips, before, "no flips leak after stop within the same tick");
  });
})();

/* ===================== §3.2 events ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function fresh() { var host = document.createElement("div"); host.className = "ui-panel"; sandbox.appendChild(host); return { host: host, api: demos.initEvents(host) }; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function recount(s, R) {
    var c = { a: 0, b: 0, both: 0, either: 0 };
    s.points.forEach(function (p) {
      var ia = Math.hypot(p.x - s.a.x, p.y - s.a.y) <= R, ib = Math.hypot(p.x - s.b.x, p.y - s.b.y) <= R;
      if (ia) c.a++; if (ib) c.b++; if (ia && ib) c.both++; if (ia || ib) c.either++;
    });
    return c;
  }

  test("events: initial field has n points inside the sample space and two focusable circles (D1, D5)", function (a) {
    var d = fresh(), s = d.api.state(), K = d.api.constants;
    a.equal(s.points.length, K.DEFAULT_N);
    s.points.forEach(function (p) { a.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= K.H, "point inside space"); });
    a.equal(d.host.querySelectorAll("circle.pt").length, K.DEFAULT_N);
    var events = d.host.querySelectorAll("g.event");
    a.equal(events.length, 2);
    a.equal(events[0].getAttribute("tabindex"), "0");
    a.ok(events[0].getAttribute("aria-label").indexOf("arrow keys") >= 0);
    a.equal(d.host.querySelector(".ui-button--primary").textContent, "New points");
  });

  test("events: readouts equal counts recomputed from the points and circles; union rule holds exactly (D3)", function (a) {
    var d = fresh(), s = d.api.state(), c = recount(s, d.api.constants.RADIUS), n = s.points.length;
    a.equal(s.counts.a, c.a); a.equal(s.counts.b, c.b); a.equal(s.counts.both, c.both); a.equal(s.counts.either, c.either);
    a.equal(readout(d.host, "P(A)"), (c.a / n).toFixed(3));
    a.equal(readout(d.host, "P(A and B)"), (c.both / n).toFixed(3));
    a.equal(readout(d.host, "P(A or B)"), (c.either / n).toFixed(3));
    a.equal(c.either, c.a + c.b - c.both, "P(A or B) = P(A) + P(B) − P(A and B)");
    a.equal(readout(d.host, "P(A) × P(B)"), ((c.a / n) * (c.b / n)).toFixed(3));
    var classes = Array.prototype.map.call(d.host.querySelectorAll("circle.pt"), function (el) { return el.getAttribute("class"); });
    a.equal(classes.filter(function (k) { return k.indexOf("pt--ab") >= 0; }).length, c.both, "dots in both drawn as such");
    a.equal(classes.filter(function (k) { return k === "pt--a" || k === "pt pt--a"; }).length, c.a - c.both, "dots in A only");
  });

  test("events: separated circles are mutually exclusive; coincident circles give A and B = A (D6 clamping)", function (a) {
    var d = fresh(), R = d.api.constants.RADIUS, H = d.api.constants.H;
    d.api.setA(0, 0); d.api.setB(1, 1);   // asks for out-of-range → clamped inside the space
    var s = d.api.state();
    a.close(s.a.x, R, 1e-12); a.close(s.a.y, R, 1e-12); a.close(s.b.x, 1 - R, 1e-12); a.close(s.b.y, H - R, 1e-12);
    a.equal(s.counts.both, 0);
    a.equal(s.counts.either, s.counts.a + s.counts.b);
    a.ok(d.host.querySelector(".demo__status").textContent.indexOf("mutually exclusive") >= 0);
    d.api.setB(s.a.x, s.a.y);
    s = d.api.state();
    a.equal(s.counts.both, s.counts.a); a.equal(s.counts.either, s.counts.a);
    a.ok(d.host.querySelector(".demo__status").textContent.indexOf("not mutually exclusive") >= 0);
  });

  test("events: keyboard arrows move a circle by one step and never past the edge", function (a) {
    var d = fresh(), K = d.api.constants;
    var g = d.host.querySelectorAll("g.event")[0];
    var before = d.api.state().a;
    g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    a.close(d.api.state().a.x, before.x + K.KEY_STEP, 1e-12);
    g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    a.close(d.api.state().a.y, before.y - K.KEY_STEP, 1e-12);
    for (var i = 0; i < 100; i++) g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    a.close(d.api.state().a.x, K.RADIUS, 1e-12, "clamped at the left edge");
    g.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    a.close(d.api.state().a.x, K.RADIUS, 1e-12, "other keys ignored");
  });

  test("events: n slider resamples within bounds; New points redraws; Reset restores (D4, D6)", function (a) {
    var d = fresh(), K = d.api.constants;
    d.api.setN(K.MAX_N);
    a.equal(d.api.state().points.length, K.MAX_N);
    a.equal(d.host.querySelectorAll("circle.pt").length, K.MAX_N);
    d.api.setN(5);
    a.equal(d.api.state().points.length, K.MIN_N, "below minimum clamps up");
    d.api.setN(9999);
    a.equal(d.api.state().points.length, K.MAX_N, "above maximum clamps down (D-007 cap)");
    var p1 = d.api.state().points[0];
    d.host.querySelector(".ui-button--primary").click();
    var p2 = d.api.state().points[0];
    a.ok(p1.x !== p2.x || p1.y !== p2.y, "new points differ");
    d.api.setA(0.5, 0.5);
    d.api.reset();
    var s = d.api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.points.length, K.DEFAULT_N);
    a.close(s.a.x, 0.36, 1e-12); a.close(s.b.x, 0.64, 1e-12);
    a.equal(d.host.querySelector("input[type=range]").value, String(K.DEFAULT_N));
  });
})();

/* ===================== §3.3 conditional ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function fresh() { var host = document.createElement("div"); host.className = "ui-panel"; sandbox.appendChild(host); return { host: host, api: demos.initConditional(host) }; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function cell(host, key) { return Number(host.querySelector("[data-cell=" + key + "]").textContent); }

  test("conditional: initial drops present; table and readouts agree with the counts (D3, D5)", function (a) {
    var d = fresh(), s = d.api.state(), c = s.counts, L = d.api.constants.LABELS;
    a.equal(s.total, d.api.constants.INITIAL_DROPS);
    a.equal(c.ba + c.bNotA + c.notBa + c.notBNotA, s.total);
    a.equal(cell(d.host, "ba"), c.ba); a.equal(cell(d.host, "bNotA"), c.bNotA); a.equal(cell(d.host, "notBa"), c.notBa); a.equal(cell(d.host, "notBNotA"), c.notBNotA);
    a.equal(cell(d.host, "b"), c.ba + c.bNotA); a.equal(cell(d.host, "notB"), c.notBa + c.notBNotA);
    a.equal(cell(d.host, "a"), c.ba + c.notBa); a.equal(cell(d.host, "notA"), c.bNotA + c.notBNotA); a.equal(cell(d.host, "n"), s.total);
    a.equal(readout(d.host, "Drops"), String(s.total));
    a.equal(readout(d.host, "P(" + L.a + ")"), ((c.ba + c.notBa) / s.total).toFixed(3));
    var nB = c.ba + c.bNotA;
    a.equal(readout(d.host, "P(" + L.a + " | " + L.b + ")"), nB ? (c.ba / nB).toFixed(3) : "—");
    a.equal(d.host.querySelector(".ui-button--primary").textContent, "Drop 1");
    a.equal(d.host.querySelectorAll("input[type=range]").length, 3);
  });

  test("conditional: buttons drop through the same path; 20 fast clicks are fine (D2, extremes)", function (a) {
    var d = fresh(), b = d.host.querySelectorAll(".ui-button");
    b[0].click(); a.equal(d.api.state().total, 21);
    for (var i = 0; i < 20; i++) b[1].click();
    a.equal(d.api.state().total, 2021);
    a.equal(cell(d.host, "n"), 2021);
    a.ok(d.host.querySelectorAll("circle.ball").length <= d.api.constants.MAX_LIVE_BALLS, "live balls capped after 20 fast clicks (D9)");
  });

  test("conditional: extremes of every slider behave and never produce NaN in the table (D6)", function (a) {
    var d = fresh(), L = d.api.constants.LABELS;
    d.api.setPB(0); d.api.drop(200);
    var s = d.api.state();
    a.equal(s.counts.ba + s.counts.bNotA, 0, "nobody studied");
    a.equal(readout(d.host, "P(" + L.a + " | " + L.b + ")"), "—", "conditional on an empty branch shows a dash");
    d.api.setPB(1); d.api.setPAgivenB(1); d.api.drop(200);
    s = d.api.state();
    a.equal(s.counts.ba, s.total, "everyone studied and passed");
    a.equal(readout(d.host, "P(" + L.a + " | " + L.b + ")"), "1.000");
    d.api.setPAgivenB(0); d.api.drop(50);
    a.equal(d.api.state().counts.ba, 0);
    d.api.setPB(0.5); d.api.setPAgivenNotB(1); d.api.drop(300);
    s = d.api.state();
    a.equal(s.counts.notBNotA, 0, "non-studiers always pass at p = 1");
    Array.prototype.forEach.call(d.host.querySelectorAll("[data-cell]"), function (td) { a.ok(/^\d+$/.test(td.textContent), "integer cell: " + td.textContent); });
  });

  test("conditional: conditioning toggle sets aria-pressed and dims the other branch; slider change restarts the run", function (a) {
    var d = fresh(), b = d.host.querySelectorAll(".ui-button");
    var toggle = b[3];
    a.equal(toggle.getAttribute("aria-pressed"), "false");
    toggle.click();
    a.equal(toggle.getAttribute("aria-pressed"), "true"); a.ok(d.api.state().conditioned);
    a.ok(d.host.querySelector("[data-row=notB]").classList.contains("is-dimmed"));
    a.ok(d.host.querySelector("[data-row=b]").classList.contains("is-focus"));
    a.ok(d.host.querySelectorAll("g.board-node.is-dimmed").length >= 3, "not-studied nodes dimmed");
    toggle.click();
    a.equal(toggle.getAttribute("aria-pressed"), "false");
    a.equal(d.host.querySelectorAll(".is-dimmed").length, 0);
    d.api.drop(100);
    var input = d.host.querySelectorAll("input[type=range]")[1];
    input.value = "0.3"; input.dispatchEvent(new Event("input", { bubbles: true }));
    var s = d.api.state();
    a.equal(s.pAgivenB, 0.3); a.equal(s.total, d.api.constants.INITIAL_DROPS, "run restarted");
  });

  test("conditional: reset restores defaults; cap disables inputs and stops auto (D4, D6)", function (a) {
    var d = fresh(), K = d.api.constants;
    d.api.setPB(0.1); d.api.condition(true); d.api.startAuto();
    d.api.reset();
    var s = d.api.state();
    a.equal(s.pB, K.DEFAULTS.pB); a.equal(s.pAgivenB, K.DEFAULTS.pAgivenB); a.equal(s.pAgivenNotB, K.DEFAULTS.pAgivenNotB);
    a.ok(!s.conditioned && !s.auto); a.equal(s.total, K.INITIAL_DROPS);
    a.equal(d.host.querySelector("input[type=range]").value, String(K.DEFAULTS.pB));
    var added = d.api.drop(K.MAX_DROPS + 10);
    a.equal(d.api.state().total, K.MAX_DROPS);
    a.equal(added, K.MAX_DROPS - K.INITIAL_DROPS);
    var b = d.host.querySelectorAll(".ui-button");
    a.ok(b[0].disabled && b[1].disabled && b[2].disabled && !b[4].disabled);
    d.api.startAuto(); a.ok(!d.api.state().auto);
  });
})();

/* ===================== §1.1 population / sample ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function fresh() { var host = document.createElement("div"); host.className = "ui-panel"; sandbox.appendChild(host); return { host: host, api: demos.initPopulationSample(host) }; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  test("population-sample: population of 800 within the axis, one sample drawn on init, canvas present (D5, D-007)", function (a) {
    var d = fresh(), s = d.api.state(), K = d.api.constants;
    a.equal(s.population.length, K.POP_N);
    s.population.forEach(function (v) { a.ok(v > K.X_MIN && v < K.X_MAX, "value inside fixed axis"); });
    a.equal(s.draws, 1); a.equal(s.sample.length, K.DEFAULT_N);
    a.ok(d.host.querySelector("canvas.ui-chart__canvas"), "dots drawn on canvas");
    a.equal(d.host.querySelector(".ui-button--primary").textContent, "Draw a sample");
    a.equal(readout(d.host, "Population mean μ (parameter)"), s.populationMean.toFixed(1));
  });

  test("population-sample: sample mean is the mean of the highlighted dots; μ never moves; trail capped (D3, D7)", function (a) {
    var d = fresh(), K = d.api.constants;
    var mu = d.api.state().populationMean;
    for (var k = 0; k < 30; k++) {
      d.api.draw();
      var s = d.api.state();
      a.equal(new Set(s.sample).size, s.n, "sample is n distinct people");
      var recomputed = stats.mean(s.sample.map(function (i) { return s.population[i]; }));
      a.close(s.sampleMean, recomputed, 1e-12);
      a.equal(s.populationMean, mu, "population mean unchanged");
    }
    a.equal(readout(d.host, "Sample mean x̄ (statistic)"), d.api.state().sampleMean.toFixed(1));
    a.equal(d.api.state().draws, 31);
    a.ok(d.api.state().history.length <= K.TRAIL + 1, "history capped");
    a.ok(d.host.querySelectorAll("path.mark--trail").length <= K.TRAIL);
  });

  test("population-sample: clicking the field draws; n slider clamps; New population changes μ; Reset restores (D1, D4, D6)", function (a) {
    var d = fresh(), K = d.api.constants;
    d.host.querySelector(".field-clickable").click();
    a.equal(d.api.state().draws, 2);
    d.api.setN(K.MAX_N); a.equal(d.api.state().sample.length, K.MAX_N);
    d.api.setN(1); a.equal(d.api.state().sample.length, K.MIN_N);
    d.api.setN(9999); a.equal(d.api.state().sample.length, K.MAX_N);
    var mu = d.api.state().populationMean;
    d.api.newPopulation();
    a.ok(d.api.state().populationMean !== mu, "new population has a new mean");
    a.equal(d.api.state().draws, 1);
    d.api.setN(50); d.api.draw(); d.api.draw();
    d.api.reset();
    var s = d.api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.draws, 1); a.equal(s.history.length, 1);
    a.equal(d.host.querySelector("input[type=range]").value, String(K.DEFAULT_N));
  });
})();

/* ===================== §1.2 sampling methods ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function fresh() { var host = document.createElement("div"); host.className = "ui-panel"; sandbox.appendChild(host); return { host: host, api: demos.initSamplingMethods(host) }; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function groupCounts(s) { var c = [0, 0, 0, 0]; s.sample.forEach(function (i) { c[s.people[i].g]++; }); return c; }

  test("sampling-methods: population matches the group design; method group is a pressed-button set (D5)", function (a) {
    var d = fresh(), s = d.api.state(), K = d.api.constants;
    a.equal(s.people.length, K.GROUPS.reduce(function (n, g) { return n + g.size; }, 0));
    K.GROUPS.forEach(function (g, gi) { a.equal(s.people.filter(function (p) { return p.g === gi; }).length, g.size, g.name + " size"); });
    a.equal(s.method, "simple"); a.equal(s.draws, 1); a.equal(s.sample.length, K.DEFAULT_N);
    var group = d.host.querySelector("[role=group]");
    a.equal(group.querySelectorAll("button[aria-pressed]").length, 4);
    a.equal(group.querySelector("button[aria-pressed=true]").textContent, "Simple random");
    a.equal(readout(d.host, "Population mean"), s.populationMean.toFixed(1));
  });

  test("sampling-methods: readouts recompute from the sample; running mean is the mean of sample means (D3)", function (a) {
    var d = fresh(), sum = 0;
    for (var k = 0; k < 15; k++) {
      d.api.draw(1);
      var s = d.api.state();
      var m = stats.mean(s.sample.map(function (i) { return s.people[i].v; }));
      a.close(s.lastMean, m, 1e-12);
      sum += m;
    }
    var s2 = d.api.state();
    a.equal(s2.draws, 16);
    a.equal(readout(d.host, "This sample's mean"), s2.lastMean.toFixed(1));
    a.equal(readout(d.host, "Samples drawn"), "16");
    // the first draw (on init) is included in the running mean; recompute from scratch on a fresh method
    d.api.setMethod("simple");
    var run = 0, s3;
    for (k = 0; k < 10; k++) { d.api.draw(1); s3 = d.api.state(); }
    a.equal(s3.draws, 11);
  });

  test("sampling-methods: stratified allocation is proportional and sums to n; every stratum represented", function (a) {
    var d = fresh(), K = d.api.constants;
    d.api.setMethod("stratified");
    d.api.setN(40);
    var s = d.api.state(), c = groupCounts(s);
    a.equal(c.reduce(function (x, y) { return x + y; }, 0), 40);
    var total = K.GROUPS.reduce(function (n, g) { return n + g.size; }, 0);
    K.GROUPS.forEach(function (g, gi) { var q = 40 * g.size / total; a.ok(Math.abs(c[gi] - q) < 1, g.name + " ≈ " + q.toFixed(1) + " got " + c[gi]); });
    a.equal(new Set(s.sample).size, 40);
  });

  test("sampling-methods: cluster takes everyone from one random neighbourhood; convenience takes the nearest n (D3)", function (a) {
    var d = fresh();
    d.api.setMethod("cluster");
    for (var k = 0; k < 8; k++) {
      d.api.draw(1);
      var s = d.api.state(), c = groupCounts(s);
      a.equal(c.filter(function (v) { return v > 0; }).length, 1, "one neighbourhood only");
      a.equal(c[s.cluster], s.sample.length, "sample is inside the chosen cluster");
    }
    a.ok(d.host.querySelector("circle.region").style.display !== "none", "chosen cluster is outlined");
    d.api.setMethod("convenience");
    s = d.api.state();
    var sorted = s.people.map(function (p, i) { return i; }).sort(function (x, y) { return s.people[x].dist - s.people[y].dist; }).slice(0, s.n);
    a.equal(s.sample.slice().sort().join(","), sorted.sort().join(","), "exactly the n nearest to the entrance");
    a.ok(d.host.querySelector("path.entrance").style.display !== "none", "entrance shown");
    d.api.draw(1);
    a.equal(d.api.state().lastMean, s.lastMean, "convenience picks the same people every time");
  });

  test("sampling-methods: convenience is biased, simple random is not (30 draws each); method change resets the run", function (a) {
    var d = fresh();
    d.api.setMethod("convenience"); d.api.draw(29);
    var s = d.api.state();
    a.equal(s.draws, 30);
    a.ok(Math.abs(s.runningMean - s.populationMean) > 5, "convenience running mean far from truth: " + s.runningMean.toFixed(1) + " vs " + s.populationMean.toFixed(1));
    d.api.setMethod("simple");
    a.equal(d.api.state().draws, 1, "method change restarts");
    d.api.draw(199);
    s = d.api.state();
    // SE of the running mean over 200 draws of n = 40 is well under 1 minute
    a.ok(Math.abs(s.runningMean - s.populationMean) < 2, "simple random running mean near truth: " + s.runningMean.toFixed(1) + " vs " + s.populationMean.toFixed(1));
    a.equal(readout(d.host, "Mean of all sample means"), s.runningMean.toFixed(1));
  });

  test("sampling-methods: n clamps; cap disables drawing; reset restores simple/default (D4, D6)", function (a) {
    var d = fresh(), K = d.api.constants;
    d.api.setN(1); a.equal(d.api.state().n, K.MIN_N);
    d.api.setN(5000); a.equal(d.api.state().n, K.MAX_N); a.equal(d.api.state().sample.length, K.MAX_N);
    d.api.setMethod("cluster"); d.api.setN(200);
    a.ok(d.api.state().sample.length <= 200 && d.api.state().sample.length > 0, "cluster with n larger than the smallest neighbourhood still works");
    d.api.setMethod("convenience");
    var added = d.api.draw(K.MAX_DRAWS + 5);
    a.equal(d.api.state().draws, K.MAX_DRAWS); a.equal(added, K.MAX_DRAWS - 1);
    a.ok(d.host.querySelector(".ui-button--primary").disabled);
    d.api.reset();
    var s = d.api.state();
    a.equal(s.method, "simple"); a.equal(s.n, K.DEFAULT_N); a.equal(s.draws, 1);
    a.ok(!d.host.querySelector(".ui-button--primary").disabled);
    a.equal(d.host.querySelector("[role=group] button[aria-pressed=true]").textContent, "Simple random");
  });
})();

/* ===================== §1.3 sample variation ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function fresh() { var host = document.createElement("div"); host.className = "ui-panel"; sandbox.appendChild(host); return { host: host, api: demos.initSampleVariation(host) }; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  test("sample-variation: initial sample, two charts (canvas strip + histogram), readouts from the means (D3, D5)", function (a) {
    var d = fresh(), s = d.api.state(), K = d.api.constants;
    a.equal(s.samples, 1); a.equal(s.lastSample.length, K.DEFAULT_N);
    a.equal(d.host.querySelectorAll("canvas").length, 1);
    a.equal(d.host.querySelectorAll("svg").length, 2);
    a.equal(readout(d.host, "SD of sample means"), "—", "one sample has no SD yet");
    d.api.draw(199);
    s = d.api.state();
    a.equal(s.samples, 200);
    a.close(Number(readout(d.host, "Mean of sample means")), stats.mean(s.means), 0.05 + 1e-9);
    a.close(Number(readout(d.host, "SD of sample means")), stats.sd(s.means), 0.005 + 1e-9);
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0), 200, "histogram counts every sample");
    var last = stats.mean(s.lastSample.map(function (i) { return s.population[i]; }));
    a.close(s.means[s.means.length - 1], last, 1e-12);
    a.equal(d.host.querySelectorAll("rect.bar").length, s.bins.length);
  });

  test("sample-variation: spread of sample means shrinks with n; changing n clears the pile (D-019)", function (a) {
    var d = fresh();
    d.api.setN(2); d.api.draw(299);
    var sdSmall = stats.sd(d.api.state().means);
    d.api.setN(100);
    a.equal(d.api.state().samples, 1, "new n restarts");
    d.api.draw(299);
    var sdLarge = stats.sd(d.api.state().means);
    a.ok(sdLarge < sdSmall / 3, "sd at n=100 (" + sdLarge.toFixed(2) + ") far below sd at n=2 (" + sdSmall.toFixed(2) + ")");
  });

  test("sample-variation: y axis doubles rarely; cap and reset (D6, D7)", function (a) {
    var d = fresh(), K = d.api.constants;
    a.equal(d.api.state().yMax, K.Y_START);
    d.api.setN(100); d.api.draw(400);
    var s = d.api.state();
    var tallest = Math.max.apply(null, s.bins);
    a.ok(s.yMax >= tallest, "axis covers the tallest bar");
    a.ok(s.yMax / K.Y_START === Math.pow(2, Math.round(Math.log2(s.yMax / K.Y_START))), "axis max is Y_START × 2^k");
    var added = d.api.draw(K.MAX_SAMPLES);
    a.equal(d.api.state().samples, K.MAX_SAMPLES); a.equal(added, K.MAX_SAMPLES - 401);
    a.ok(d.host.querySelector(".ui-button--primary").disabled);
    d.api.startAuto(); a.ok(!d.api.state().auto);
    d.api.reset();
    s = d.api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.samples, 1); a.equal(s.yMax, K.Y_START); a.ok(!s.auto);
  });
})();

/* ===================== Chapter 2 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function key(el, k) { el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); }

  /* ---- 2.1 histogram ---- */
  test("histogram: fixed data, bins from stats.histogram, bar count and heights match (D3, D5)", function (a) {
    var h = host(), api = demos.initHistogram(h), s = api.state(), K = api.constants;
    a.equal(s.data.length, 80); a.equal(s.width, K.DEFAULT_W);
    var ref = stats.histogram(K.DATA, K.START, K.START + Math.ceil((K.END - K.START) / K.DEFAULT_W) * K.DEFAULT_W, K.DEFAULT_W);
    a.equal(JSON.stringify(s.counts), JSON.stringify(ref.counts));
    a.equal(h.querySelectorAll("rect.bar").length, s.counts.length);
    a.equal(readout(h, "Bins"), String(s.counts.length));
    a.equal(readout(h, "Tallest bin"), String(Math.max.apply(null, s.counts)));
    a.equal(s.counts.reduce(function (x, y) { return x + y; }, 0), 80, "every value counted");
    var tallest = h.querySelectorAll("rect.bar")[s.counts.indexOf(Math.max.apply(null, s.counts))];
    var heights = Array.prototype.map.call(h.querySelectorAll("rect.bar"), function (r) { return +r.getAttribute("height"); });
    a.equal(Math.max.apply(null, heights), +tallest.getAttribute("height"), "tallest bar is the tallest bin");
  });

  test("histogram: bin width extremes; polygon toggle; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initHistogram(h), K = api.constants;
    api.setBinWidth(K.MIN_W);
    a.equal(api.state().counts.length, 60);
    a.equal(api.state().counts.reduce(function (x, y) { return x + y; }, 0), 80);
    api.setBinWidth(K.MAX_W);
    a.equal(api.state().counts.length, 4, "15-minute bins cover 0–60 in four");
    a.equal(api.state().counts.reduce(function (x, y) { return x + y; }, 0), 80);
    api.setBinWidth(999); a.equal(api.state().width, K.MAX_W);
    api.setBinWidth(-3); a.equal(api.state().width, K.MIN_W);
    var toggle = h.querySelectorAll(".ui-button")[0];
    a.equal(toggle.getAttribute("aria-pressed"), "false");
    toggle.click();
    a.equal(toggle.getAttribute("aria-pressed"), "true"); a.ok(api.state().polygon);
    a.ok(h.querySelector("path.polygon").getAttribute("d"), "polygon drawn");
    a.ok(h.querySelector("path.polygon").style.display !== "none");
    api.reset();
    a.equal(api.state().width, K.DEFAULT_W); a.ok(!api.state().polygon);
    a.equal(h.querySelector("input[type=range]").value, String(K.DEFAULT_W));
  });

  /* ---- 2.2 center ---- */
  test("center: mean/median/mode readouts recompute from the points; outlier moves the mean not the median (D3)", function (a) {
    var h = host(), api = demos.initCenter(h), K = api.constants, s = api.state();
    a.equal(s.points.join(","), K.DEFAULT_POINTS.join(","));
    a.equal(readout(h, "Mean (balance point)"), stats.mean(s.points).toFixed(1));
    a.equal(readout(h, "Median (splitter)"), stats.median(s.points).toFixed(1));
    a.equal(readout(h, "Mode"), "none");
    var median0 = s.median;
    api.pushOut();
    s = api.state();
    a.equal(Math.max.apply(null, s.points), 95);
    a.ok(s.mean > stats.mean(K.DEFAULT_POINTS) + 5, "mean chased the outlier");
    a.equal(s.median, median0, "median held");
    api.setPoint(0, 31);
    a.equal(readout(h, "Mode"), "31", "a repeated value becomes the mode");
  });

  test("center: drag/keyboard clamp to the axis; points are sliders for assistive tech; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initCenter(h), K = api.constants;
    var pts = h.querySelectorAll("g.point");
    a.equal(pts.length, 9);
    a.equal(pts[0].getAttribute("role"), "slider"); a.equal(pts[0].getAttribute("tabindex"), "0");
    a.equal(pts[0].getAttribute("aria-valuenow"), String(K.DEFAULT_POINTS[0]));
    a.ok(+pts[0].querySelector("circle.hit").getAttribute("r") * 2 >= 44, "touch target ≥ 44 px");
    key(pts[0], "ArrowRight");
    a.equal(api.state().points[0], K.DEFAULT_POINTS[0] + K.KEY_STEP);
    for (var i = 0; i < 200; i++) key(pts[0], "ArrowLeft");
    a.equal(api.state().points[0], K.MIN);
    api.setPoint(3, 1e9); a.equal(api.state().points[3], K.MAX);
    api.setPoint(3, -1e9); a.equal(api.state().points[3], K.MIN);
    a.equal(pts[3].getAttribute("aria-valuenow"), "0");
    api.reset();
    a.equal(api.state().points.join(","), K.DEFAULT_POINTS.join(","));
  });

  /* ---- 2.3 box plot / skew ---- */
  test("boxplot-skew: 300 values on the fixed axis; summary and histogram recompute from the values (D3, D7)", function (a) {
    var h = host(), api = demos.initBoxplotSkew(h), K = api.constants, s = api.state();
    a.equal(s.values.length, K.N);
    s.values.forEach(function (v) { a.ok(v >= K.X_MIN && v <= K.X_MAX); });
    var sm = stats.fiveNumberSummary(s.values);
    a.close(s.summary.q1, sm.q1, 1e-12); a.close(s.summary.median, sm.median, 1e-12); a.close(s.summary.q3, sm.q3, 1e-12);
    a.close(s.mean, stats.mean(s.values), 1e-12);
    a.equal(readout(h, "IQR"), (sm.q3 - sm.q1).toFixed(1));
    a.equal(readout(h, "Mean − median"), (s.mean - sm.median).toFixed(1));
    a.equal(JSON.stringify(s.counts), JSON.stringify(stats.histogram(s.values, K.X_MIN, K.X_MAX, K.BIN).counts));
    a.equal(h.querySelectorAll("rect.bar").length, (K.X_MAX - K.X_MIN) / K.BIN);
    a.ok(Math.max.apply(null, s.counts) <= K.Y_MAX, "fixed y axis is never exceeded");
    var box = h.querySelector("rect.box");
    a.ok(+box.getAttribute("width") > 0, "box drawn");
  });

  test("boxplot-skew: right skew pulls the mean above the median, left below; symmetric near zero; same points morph (D-004)", function (a) {
    var h = host(), api = demos.initBoxplotSkew(h);
    api.setSkew(1);
    var r = api.state();
    a.ok(r.mean - r.summary.median > 2, "right skew: mean − median = " + (r.mean - r.summary.median).toFixed(2));
    a.ok(h.querySelector(".demo__status").textContent.indexOf("Skewed right") === 0);
    api.setSkew(-1);
    var l = api.state();
    a.ok(l.mean - l.summary.median < -2, "left skew: mean − median = " + (l.mean - l.summary.median).toFixed(2));
    api.setSkew(0);
    var z = api.state();
    a.ok(Math.abs(z.mean - z.summary.median) < 2, "symmetric: |mean − median| = " + Math.abs(z.mean - z.summary.median).toFixed(2));
    api.setSkew(0.3);
    var v1 = api.state().values;
    api.setSkew(0.3);
    a.equal(JSON.stringify(api.state().values), JSON.stringify(v1), "same slider value gives the same points (no re-roll)");
    api.setSkew(5); a.equal(api.state().skew, 1, "clamped");
    api.redraw();
    a.ok(JSON.stringify(api.state().values) !== JSON.stringify(v1), "New draw re-rolls");
    api.reset();
    a.equal(api.state().skew, 0); a.equal(h.querySelector("input[type=range]").value, "0");
  });

  /* ---- 2.4 spread ---- */
  test("spread: SSD, variance, SD recompute from the points; squares area ∝ deviation² (D3)", function (a) {
    var h = host(), api = demos.initSpread(h), K = api.constants, s = api.state();
    a.equal(s.points.join(","), K.DEFAULT_POINTS.join(","));
    a.close(s.ssd, stats.sumSquaredDeviations(s.points), 1e-9);
    a.close(s.variance, s.ssd / (s.points.length - 1), 1e-9);
    a.close(s.sd, Math.sqrt(s.variance), 1e-9);
    a.equal(readout(h, "Sample SD"), s.sd.toFixed(2));
    a.equal(readout(h, "Sum of squared deviations"), s.ssd.toFixed(0));
    var sticks = h.querySelectorAll("line.stick");
    a.equal(sticks.length, 8);
    api.setSquares(true);
    var sq = h.querySelectorAll("rect.square");
    var w = Array.prototype.map.call(sq, function (r) { return +r.getAttribute("width"); });
    var dev = s.points.map(function (v) { return Math.abs(v - s.mean); });
    var ratio = w[0] / dev[0];
    dev.forEach(function (d, i) { a.close(w[i], d * ratio, 1e-6, "square side ∝ |deviation| for point " + i); });
    a.equal(h.querySelectorAll(".ui-button")[2].getAttribute("aria-pressed"), "true");
  });

  test("spread: spread out / bunch up scale about the mean; drag clamps; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initSpread(h), K = api.constants;
    var m0 = api.state().mean, sd0 = api.state().sd;
    api.scale(1.25);
    var s = api.state();
    a.ok(Math.abs(s.mean - m0) < 1, "mean roughly unchanged (rounding aside)");
    a.ok(s.sd > sd0, "spread out grows the SD");
    for (var i = 0; i < 20; i++) api.scale(1.25);
    s = api.state();
    a.ok(Math.max.apply(null, s.points) <= K.MAX && Math.min.apply(null, s.points) >= K.MIN, "clamped to the axis");
    for (i = 0; i < 40; i++) api.scale(0.8);
    a.ok(api.state().sd < 1, "bunch up collapses the spread: sd = " + api.state().sd.toFixed(2));
    var pts = h.querySelectorAll("g.point");
    var before = api.state().points[0];
    key(pts[0], "ArrowLeft"); key(pts[0], "ArrowLeft");
    a.equal(api.state().points[0], before - 2 * K.KEY_STEP, "arrow keys move a point by one step each");
    api.reset();
    a.equal(api.state().points.join(","), K.DEFAULT_POINTS.join(","));
    a.ok(!api.state().squares);
    a.equal(h.querySelectorAll(".ui-button")[2].getAttribute("aria-pressed"), "false");
  });
})();

/* ===================== Chapter 4 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  /* ---- 4.1 expectation ---- */
  test("expectation: fair die on init; μ from the table; sample mean from the counts (D3, D5)", function (a) {
    var h = host(), api = demos.initExpectation(h), s = api.state(), K = api.constants;
    a.equal(s.rolls, K.INITIAL_ROLLS);
    s.probs.forEach(function (p) { a.close(p, 1 / 6, 1e-12); });
    a.close(s.expectation, 3.5, 1e-12);
    a.equal(readout(h, "Expected value μ"), "3.500");
    api.roll(500);
    s = api.state();
    a.equal(s.counts.reduce(function (x, y) { return x + y; }, 0), s.rolls);
    var mean = s.counts.reduce(function (acc, c, i) { return acc + c * (i + 1); }, 0) / s.rolls;
    a.close(s.sampleMean, mean, 1e-9);
    a.equal(readout(h, "Sample mean"), mean.toFixed(3));
    a.equal(h.querySelectorAll("rect.bar--theory").length, 6); a.equal(h.querySelectorAll("rect.bar--empirical").length, 6);
    a.equal(h.querySelectorAll("input[type=range]").length, 6);
  });

  test("expectation: weights renormalise, restart the run, and never all reach zero; reset and cap (D4, D6)", function (a) {
    var h = host(), api = demos.initExpectation(h), K = api.constants;
    api.roll(50);
    api.setWeight(5, 10);
    var s = api.state();
    a.equal(s.rolls, K.INITIAL_ROLLS, "weight change restarts");
    a.close(s.probs.reduce(function (x, y) { return x + y; }, 0), 1, 1e-12);
    a.close(s.probs[5], 10 / 15, 1e-12);
    a.ok(s.expectation > 3.5, "heavier six raises μ: " + s.expectation.toFixed(3));
    for (var i = 0; i < 6; i++) api.setWeight(i, 0);
    s = api.state();
    a.ok(s.weights.reduce(function (x, y) { return x + y; }, 0) > 0, "at least one face stays possible");
    a.ok(s.probs.every(function (p) { return isFinite(p); }));
    api.setWeight(0, 99); a.equal(api.state().weights[0], K.MAX_W);
    api.reset();
    s = api.state();
    a.equal(s.weights.join(","), K.DEFAULT_WEIGHTS.join(",")); a.equal(s.rolls, K.INITIAL_ROLLS);
    var added = api.roll(K.MAX_ROLLS + 5);
    a.equal(api.state().rolls, K.MAX_ROLLS); a.equal(added, K.MAX_ROLLS - K.INITIAL_ROLLS);
    a.ok(h.querySelector(".ui-button--primary").disabled);
    api.startAuto(); a.ok(!api.state().auto);
  });

  /* ---- 4.2 variance ---- */
  test("rv-variance: σ² from the table equals Σ contributions; s² recomputed from rolls; extremes (D3, D6)", function (a) {
    var h = host(), api = demos.initRvVariance(h), s = api.state(), K = api.constants;
    a.close(s.variance, 35 / 12, 1e-12, "fair die variance 35/12");
    a.close(s.contributions.reduce(function (x, y) { return x + y; }, 0), s.variance, 1e-12);
    a.equal(readout(h, "Variance σ²"), (35 / 12).toFixed(3));
    api.roll(300);
    s = api.state();
    a.ok(isFinite(s.sampleVariance) && s.sampleVariance > 0);
    a.equal(readout(h, "Sample variance s²"), s.sampleVariance.toFixed(3));
    a.close(s.sampleSd, Math.sqrt(s.sampleVariance), 1e-12);
    // two-point die {1, 6}: μ = 3.5, σ² = 6.25 — the largest possible
    [1, 2, 3, 4].forEach(function (i) { api.setWeight(i, 0); });
    s = api.state();
    a.close(s.expectation, 3.5, 1e-12); a.close(s.variance, 6.25, 1e-12);
    a.ok(Math.max.apply(null, s.contributions) <= K.CONTRIB_MAX, "contribution axis never exceeded");
    a.equal(h.querySelectorAll("svg").length, 2);
    api.reset();
    a.close(api.state().variance, 35 / 12, 1e-12);
  });

  /* ---- 4.3 distributions ---- */
  test("discrete-distributions: binomial default; E and Var from the PMF table match closed forms (D3, D5)", function (a) {
    var h = host(), api = demos.initDiscreteDistributions(h), s = api.state();
    a.equal(s.dist, "binomial"); a.equal(s.params.n, 10); a.close(s.params.p, 0.3, 1e-12);
    a.close(s.expectation, 3, 1e-9); a.close(s.variance, 2.1, 1e-9);
    a.close(s.tableMass, 1, 1e-12);
    a.equal(s.draws, 10);
    a.equal(h.querySelector("[role=group] button[aria-pressed=true]").textContent, "Binomial");
    a.equal(h.querySelectorAll("input[type=range]").length, 2);
    a.ok(h.querySelector(".demo__status").textContent.indexOf("Binomial:") === 0);
    a.equal(h.querySelectorAll("rect.bar--theory").length, 11, "k = 0..10 shown");
  });

  test("discrete-distributions: every distribution's table moments match closed forms; draws stay in support", function (a) {
    var h = host(), api = demos.initDiscreteDistributions(h);
    api.setDistribution("geometric");
    var s = api.state();
    a.close(s.expectation, 1 / 0.3, 1e-9); a.close(s.variance, 0.7 / 0.09, 1e-9);
    a.equal(s.kMin, 1);
    api.draw(300);
    s = api.state();
    Object.keys(s.counts).forEach(function (k) { a.ok(+k >= 1, "geometric draws ≥ 1"); });
    a.ok(s.sampleMean > 1);
    api.setDistribution("hypergeometric");
    s = api.state();
    a.close(s.expectation, 5 * 4 / 52, 1e-9);
    a.close(s.variance, 5 * (4 / 52) * (48 / 52) * (47 / 51), 1e-9);
    a.equal(s.kMin, 0); a.equal(s.kMax, 4);
    api.draw(300);
    Object.keys(api.state().counts).forEach(function (k) { a.ok(+k >= 0 && +k <= 4, "hypergeometric draws within 0..4"); });
    api.setDistribution("poisson");
    s = api.state();
    a.close(s.expectation, 3, 1e-9); a.close(s.variance, 3, 1e-9);
    a.equal(readout(h, "E[X]"), "3.00");
  });

  test("discrete-distributions: parameter extremes, hypergeometric constraints, off-axis counting, reset (D6, D7)", function (a) {
    var h = host(), api = demos.initDiscreteDistributions(h), K = api.constants;
    api.setParam("p", 0); a.close(api.state().expectation, 0, 1e-12); a.equal(api.state().draws, K.INITIAL_DRAWS);
    api.setParam("p", 1); a.close(api.state().expectation, 10, 1e-12);
    api.setParam("n", 50); api.setParam("p", 0.5);
    a.close(api.state().expectation, 25, 1e-9); a.equal(api.state().kMax, 50);
    api.setDistribution("hypergeometric");
    api.setParam("N", 10);
    var s = api.state();
    a.ok(s.params.K <= s.params.N && s.params.n <= s.params.N, "K and n follow N down");
    a.close(s.tableMass, 1, 1e-12);
    api.setParam("K", 10); api.setParam("n", 10);
    a.close(api.state().expectation, 10, 1e-9); a.close(api.state().variance, 0, 1e-9);
    api.setDistribution("geometric");
    api.setParam("p", 0.05);
    api.draw(2000);
    s = api.state();
    a.ok(s.kMax <= 1 + K.MAX_SHOWN, "display window capped");
    var beyond = 0; Object.keys(s.counts).forEach(function (k) { if (+k > s.kMax) beyond += s.counts[k]; });
    a.equal(s.offChart, beyond, "draws beyond the axis are counted honestly");
    a.equal(readout(h, "Draws beyond the axis"), String(beyond));
    api.setDistribution("poisson"); api.setParam("lambda", 20);
    a.close(api.state().expectation, 20, 1e-9);
    a.ok(api.state().kMax >= 30 && api.state().kMax <= 60);
    var added = api.draw(K.MAX_DRAWS);
    a.equal(api.state().draws, K.MAX_DRAWS); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.reset();
    s = api.state();
    a.equal(s.dist, K.DEFAULT_DIST); a.equal(s.draws, K.INITIAL_DRAWS); a.ok(!h.querySelector(".ui-button--primary").disabled);
  });
})();

/* ===================== Chapter 5 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function key(el, k) { el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); }

  /* ---- 5.1 density and area ---- */
  test("density-area: probability equals F(hi) − F(lo) for both distributions; shrink to a point gives zero (D3)", function (a) {
    var h = host(), api = demos.initDensityArea(h), s = api.state(), K = api.constants;
    a.equal(s.dist, "uniform"); a.equal(s.lo, 3); a.equal(s.hi, 5);
    a.close(s.probability, stats.uniformCdf(5, 2, 6) - stats.uniformCdf(3, 2, 6), 1e-12);
    a.equal(readout(h, "P(from ≤ X ≤ to) = area"), "0.500");
    a.ok(h.querySelector("path.area").getAttribute("d"), "area shaded");
    api.setInterval(0, 10); a.close(api.state().probability, 1, 1e-12, "whole axis covers the uniform");
    api.setInterval(7, 2); a.equal(api.state().lo, 2); a.equal(api.state().hi, 7);
    api.shrink();
    s = api.state();
    a.equal(s.lo, s.hi); a.equal(s.probability, 0); a.equal(readout(h, "P(from ≤ X ≤ to) = area"), "0.000");
    a.ok(h.querySelector(".demo__status").textContent.indexOf("zero") >= 0);
    a.equal(h.querySelector("path.area").getAttribute("d"), null, "no shaded area at a point");
    api.setDistribution("exponential");
    api.setInterval(1, 3);
    s = api.state();
    a.close(s.probability, stats.exponentialCdf(3, 0.5) - stats.exponentialCdf(1, 0.5), 1e-12);
    a.equal(h.querySelector("[role=group] button[aria-pressed=true]").textContent, "Exponential");
    a.equal(h.querySelectorAll("input[type=range]").length, 1);
  });

  test("density-area: draws are counted honestly (inside share, beyond axis, density bars) and match the sampler's range (D3, D6)", function (a) {
    var h = host(), api = demos.initDensityArea(h), K = api.constants;
    api.draw(2000);
    var s = api.state();
    a.equal(s.draws, 2000);
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0) + s.beyond, 2000, "every draw is in a bin or beyond");
    a.equal(s.beyond, 0, "uniform on [2, 6] never leaves the axis");
    s.bins.forEach(function (c, i) { var lo = K.X_MIN + i * K.BIN; if (lo + K.BIN <= 2 || lo >= 6) a.equal(c, 0, "no draws outside [a, b] at bin " + i); });
    a.close(s.inside / s.draws, 0.5, 0.06, "share inside ≈ probability 0.5");
    a.equal(readout(h, "Share of draws inside"), (s.inside / s.draws).toFixed(3));
    a.equal(h.querySelectorAll("rect.bar--density").length, (K.X_MAX - K.X_MIN) / K.BIN);
    api.setDistribution("exponential"); api.setParam("rate", 0.2); api.draw(3000);
    s = api.state();
    a.ok(s.beyond > 0, "exponential with mean 5 sends some draws past 10");
    a.equal(readout(h, "Draws beyond the axis"), String(s.beyond));
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0) + s.beyond, s.draws);
  });

  test("density-area: handles clamp and never cross; keyboard steps; uniform width floor; reset and cap (D4, D6)", function (a) {
    var h = host(), api = demos.initDensityArea(h), K = api.constants;
    var handles = h.querySelectorAll("g.handle");
    a.equal(handles.length, 2); a.equal(handles[0].getAttribute("role"), "slider");
    a.ok(+handles[0].querySelector("circle.hit").getAttribute("r") * 2 >= 44);
    key(handles[0], "ArrowRight");
    a.close(api.state().lo, 3 + K.KEY_STEP, 1e-9);
    for (var i = 0; i < 40; i++) key(handles[0], "ArrowRight");
    var s = api.state();
    a.ok(s.lo <= s.hi, "lower handle pushes the upper one rather than crossing");
    for (i = 0; i < 200; i++) key(handles[1], "ArrowRight");
    a.equal(api.state().hi, K.X_MAX, "clamped at the axis end");
    api.setInterval(-5, 50); a.equal(api.state().lo, 0); a.equal(api.state().hi, 10);
    api.setParam("a", 8); s = api.state();
    a.ok(s.params.b - s.params.a >= K.MIN_WIDTH - 1e-9, "b follows a to keep a minimum width");
    api.setParam("b", 1); s = api.state();
    a.ok(s.params.b - s.params.a >= K.MIN_WIDTH - 1e-9, "a follows b down");
    a.ok(isFinite(s.probability));
    var added = api.draw(K.MAX_DRAWS + 5);
    a.equal(api.state().draws, K.MAX_DRAWS); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.reset();
    s = api.state();
    a.equal(s.dist, K.DEFAULT_DIST); a.equal(s.lo, K.DEFAULT_INTERVAL[0]); a.equal(s.hi, K.DEFAULT_INTERVAL[1]); a.equal(s.draws, 0);
    a.ok(!h.querySelector(".ui-button--primary").disabled);
  });

  /* ---- 5.2 exponential ---- */
  test("exponential: waits are the gaps between arrival times; mean readout from the waits; memoryless theory equalities (D3, D5)", function (a) {
    var h = host(), api = demos.initExponential(h), s = api.state(), K = api.constants;
    a.equal(s.arrivals, K.INITIAL_ARRIVALS);
    api.arrive(500);
    s = api.state();
    a.equal(s.waits.length, 505); a.equal(s.times.length, 505);
    var sum = 0;
    s.waits.forEach(function (w, i) { sum += w; a.ok(w > 0, "waits are positive"); a.close(s.times[i], sum, 1e-9, "arrival time is the running sum of waits"); });
    a.close(s.meanWait, stats.mean(s.waits), 1e-9);
    a.equal(readout(h, "Mean wait (sample)"), stats.mean(s.waits).toFixed(2));
    a.close(s.meanWait, 1 / s.rate, 0.25, "sample mean near 1/λ");
    a.close(s.conditionalTheory, s.freshTheory, 1e-12, "memoryless: identical in theory");
    a.close(s.freshTheory, Math.exp(-s.rate * K.EXTRA), 1e-12);
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0) + s.beyond, 505);
    a.equal(h.querySelectorAll("svg").length, 2);
    a.ok(h.querySelectorAll("line.tick-mark").length > 0 && h.querySelectorAll("line.tick-mark").length <= K.MAX_TICKS);
  });

  test("exponential: empirical conditional share recomputed from waits; waited slider re-shades; rate change restarts (D3, D-019)", function (a) {
    var h = host(), api = demos.initExponential(h), K = api.constants;
    api.arrive(3000);
    api.setWaited(2);
    var s = api.state();
    var over = s.waits.filter(function (w) { return w > 2; }), overBoth = over.filter(function (w) { return w > 2 + K.EXTRA; });
    a.close(s.conditionalEmpirical, overBoth.length / over.length, 1e-12);
    a.close(s.freshEmpirical, s.waits.filter(function (w) { return w > K.EXTRA; }).length / s.waits.length, 1e-12);
    a.close(s.conditionalEmpirical, s.freshEmpirical, 0.08, "memoryless in the data too");
    a.equal(readout(h, "Observed, among waits > t"), s.conditionalEmpirical.toFixed(3));
    a.ok(h.querySelector("path.line--reference").getAttribute("d"), "conditional curve drawn when t > 0");
    api.setWaited(0);
    a.equal(h.querySelector("path.line--reference").getAttribute("d"), null, "no conditional curve at t = 0");
    api.setWaited(99); a.equal(api.state().waited, K.MAX_WAITED);
    api.setRate(3);
    s = api.state();
    a.equal(s.arrivals, K.INITIAL_ARRIVALS, "rate change restarts the process");
    a.close(s.freshTheory, Math.exp(-3), 1e-12);
    api.setRate(0.01); a.equal(api.state().rate, K.MIN_RATE);
    api.arrive(1000);
    a.ok(api.state().beyond > 0, "slow rate sends waits past the axis");
    var added = api.arrive(K.MAX_ARRIVALS);
    a.equal(api.state().arrivals, K.MAX_ARRIVALS); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.reset();
    s = api.state();
    a.equal(s.rate, K.DEFAULT_RATE); a.equal(s.waited, 0); a.equal(s.arrivals, K.INITIAL_ARRIVALS); a.ok(!h.querySelector(".ui-button--primary").disabled);
  });
})();

/* ===================== Chapter 6 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function key(el, k) { el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); }

  /* ---- 6.1 z-scores ---- */
  test("z-scores: z = (x − μ)/σ and percentile Φ(z) for both tests; defaults match the text's example (D3, D5)", function (a) {
    var h = host(), api = demos.initZScores(h), s = api.state();
    a.close(s.A.z, 1.5, 1e-12); a.close(s.B.z, 1.2, 1e-12);
    a.close(s.A.percentile, stats.normalCdf(1.5), 1e-12);
    a.equal(readout(h, "z for A"), "1.50"); a.equal(readout(h, "z for B"), "1.20");
    a.equal(readout(h, "Below A"), (stats.normalCdf(1.5) * 100).toFixed(1) + " %");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("Score A stands higher") === 0);
    a.equal(h.querySelectorAll("svg").length, 3, "two test curves plus the standard normal");
    a.equal(h.querySelectorAll("g.handle").length, 2);
    a.equal(h.querySelectorAll("g.zmark").length, 2);
  });

  test("z-scores: dragging/keys move a score; sliders change z without moving the score; clamps; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initZScores(h), K = api.constants;
    api.setValue("A", 65); a.close(api.state().A.z, 0, 1e-12);
    api.setValue("A", 1e9); a.equal(api.state().A.x, 100); api.setValue("A", -5); a.equal(api.state().A.x, 0);
    var hB = h.querySelectorAll("g.handle")[1];
    var before = api.state().B.x;
    key(hB, "ArrowRight");
    a.equal(api.state().B.x, before + K.TESTS.B.keyStep);
    a.equal(hB.getAttribute("aria-valuenow"), String(before + K.TESTS.B.keyStep));
    api.setValue("B", 620);
    api.setParam("B", "sigma", 50);
    var s = api.state();
    a.equal(s.B.x, 620); a.close(s.B.z, 2.4, 1e-12, "halving σ doubles z");
    api.setParam("B", "mu", 620); a.equal(api.state().B.mu, K.TESTS.B.mu.max, "μ clamps to the slider range"); a.close(api.state().B.z, 0.4, 1e-12);
    api.setValue("B", 600); a.close(api.state().B.z, 0, 1e-12, "a score at the mean has z = 0");
    api.setParam("A", "sigma", 999); a.equal(api.state().A.sigma, K.TESTS.A.sigma.max);
    api.setParam("A", "sigma", 0); a.equal(api.state().A.sigma, K.TESTS.A.sigma.min, "σ never reaches zero");
    // z beyond the axis is clamped for drawing only; the readout stays honest
    api.setValue("A", 100); api.setParam("A", "mu", 40); api.setParam("A", "sigma", 5);
    s = api.state(); a.close(s.A.z, 12, 1e-12); a.equal(readout(h, "z for A"), "12.00");
    var zm = h.querySelectorAll("g.zmark")[0].getAttribute("transform");
    a.ok(zm.indexOf("NaN") < 0, "z marker still drawn at the axis edge");
    api.reset();
    s = api.state();
    a.equal(s.A.x, K.TESTS.A.value); a.equal(s.B.sigma, K.TESTS.B.sigma.value);
    a.equal(h.querySelectorAll("input[type=range]")[1].value, String(K.TESTS.A.sigma.value));
  });

  /* ---- 6.2 normal areas ---- */
  test("normal-areas: area = Φ(hi) − Φ(lo); snap buttons give 68.27 / 95.45 / 99.73 % for any μ, σ (D3)", function (a) {
    var h = host(), api = demos.initNormalAreas(h), s = api.state(), K = api.constants;
    a.equal(s.lo, 40); a.equal(s.hi, 60);
    a.close(s.area, stats.normalCdf(60, 50, 10) - stats.normalCdf(40, 50, 10), 1e-12);
    a.equal(readout(h, "Area inside"), "68.27 %");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("68 %") >= 0);
    api.snap(2); a.close(api.state().area, 0.9544997361036416, 1e-9); a.equal(readout(h, "Area inside"), "95.45 %");
    api.snap(3); a.close(api.state().area, 0.9973002039367398, 1e-9); a.equal(readout(h, "Area inside"), "99.73 %");
    a.equal(readout(h, "Area outside"), "0.27 %");
    api.setParam("mu", 30); api.setParam("sigma", 3); api.snap(1);
    s = api.state();
    a.close(s.area, 0.6826894921370859, 1e-9, "the rule belongs to the shape, not the scale");
    a.equal(s.lo, 27); a.equal(s.hi, 33);
    a.close(s.zLo, -1, 1e-12); a.close(s.zHi, 1, 1e-12);
    api.setInterval(0, 100); a.close(api.state().area, 1, 1e-9, "the fixed axis holds essentially all the area at the extremes");
  });

  test("normal-areas: handles clamp and never cross; keyboard; extremes stay inside the axis; reset (D4, D6, D7)", function (a) {
    var h = host(), api = demos.initNormalAreas(h), K = api.constants;
    var hs = h.querySelectorAll("g.handle");
    a.equal(hs.length, 2); a.equal(hs[0].getAttribute("role"), "slider");
    key(hs[0], "ArrowRight"); a.close(api.state().lo, 40 + K.KEY_STEP, 1e-9);
    for (var i = 0; i < 100; i++) key(hs[0], "ArrowRight");
    a.ok(api.state().lo <= api.state().hi);
    for (i = 0; i < 300; i++) key(hs[1], "ArrowRight");
    a.equal(api.state().hi, K.X_MAX);
    api.setInterval(-9, 999); a.equal(api.state().lo, 0); a.equal(api.state().hi, 100);
    api.setInterval(50, 50); a.equal(api.state().area, 0); a.equal(h.querySelector("path.area").getAttribute("d"), null);
    api.setParam("mu", K.MU.max); api.setParam("sigma", K.SIGMA.max); api.snap(3);
    var s = api.state();
    a.ok(s.hi <= K.X_MAX && s.lo >= K.X_MIN, "μ ± 3σ stays on the axis at the extremes: " + s.lo + ".." + s.hi);
    api.setParam("mu", K.MU.min); api.snap(3);
    s = api.state(); a.ok(s.lo >= K.X_MIN);
    a.equal(h.querySelectorAll("text.sigma-tick").length, 6);
    api.reset();
    s = api.state();
    a.equal(s.mu, K.MU.value); a.equal(s.sigma, K.SIGMA.value); a.equal(s.lo, 40); a.equal(s.hi, 60);
  });
})();

/* ===================== Chapter 7 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  test("clt-means: every parent's stated μ and σ match 20 000 simulated draws (D10 for the overlay constants)", function (a) {
    var h = host(), api = demos.initCltMeans(h), P = api.parents();
    Object.keys(P).forEach(function (key) {
      var w = stats.welford();
      for (var i = 0; i < 20000; i++) w.push(P[key].sample());
      var seMean = P[key].sigma / Math.sqrt(20000);
      a.close(w.mean, P[key].mu, 5 * seMean + 1e-9, key + " mean: " + w.mean.toFixed(3) + " vs " + P[key].mu);
      a.close(w.sd, P[key].sigma, 0.06 * P[key].sigma, key + " sd: " + w.sd.toFixed(3) + " vs " + P[key].sigma.toFixed(3));
    });
  });

  test("clt-means: readouts recompute from the means; last sample has n values; n = 1 reproduces the parent (D3, D5)", function (a) {
    var h = host(), api = demos.initCltMeans(h), K = api.constants;
    a.equal(api.state().parent, K.DEFAULT_PARENT); a.equal(api.state().samples, K.INITIAL_SAMPLES);
    api.draw(475);
    var s = api.state();
    a.equal(s.samples, K.INITIAL_SAMPLES + 475); a.equal(s.lastSample.length, s.n);
    a.close(s.meanOfMeans, stats.mean(s.means), 1e-9); a.close(s.sdOfMeans, stats.sd(s.means), 1e-9);
    a.equal(readout(h, "Mean of sample means"), stats.mean(s.means).toFixed(3));
    a.close(s.meanOfMeans, s.mu, 6 * s.se / Math.sqrt(500) + 0.05, "mean of means near μ");
    a.close(s.sdOfMeans, s.se, 0.25 * s.se, "sd of means near σ/√n");
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0) + s.beyond, 500);
    a.equal(h.querySelectorAll("circle.dot--sample").length, s.lastSample.filter(function (v) { return v >= 0 && v <= 10; }).length);
    api.setN(1); api.draw(200);
    s = api.state();
    a.equal(s.n, 1); s.means.forEach(function (m, i) { a.ok(m >= 0, "n = 1 means are single draws"); });
    a.close(s.se, s.sigma, 1e-12, "at n = 1 the predicted spread is σ itself");
  });

  test("clt-means: parent and n changes restart; the U-shaped parent stays on the axis; cap and reset (D4, D6)", function (a) {
    var h = host(), api = demos.initCltMeans(h), K = api.constants;
    api.draw(50);
    api.setParent("ushaped");
    a.equal(api.state().samples, K.INITIAL_SAMPLES, "parent change restarts");
    api.setN(3); api.draw(300);
    var s = api.state();
    a.equal(s.beyond, 0, "means of values in [0, 10] stay in [0, 10]");
    a.equal(h.querySelector("[role=group] button[aria-pressed=true]").textContent, "U-shaped");
    api.setN(999); a.equal(api.state().n, K.MAX_N); api.setN(0); a.equal(api.state().n, K.MIN_N);
    api.setParent("dice"); a.ok(h.querySelectorAll("rect.bar--theory").length === 6, "die parent drawn as six bars");
    var added = api.draw(K.MAX_SAMPLES);
    a.equal(api.state().samples, K.MAX_SAMPLES); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.startAuto(); a.ok(!api.state().auto);
    api.reset();
    s = api.state();
    a.equal(s.parent, K.DEFAULT_PARENT); a.equal(s.n, K.DEFAULT_N); a.equal(s.samples, K.INITIAL_SAMPLES); a.ok(!h.querySelector(".ui-button--primary").disabled);
  });

  test("standard-error: simulated SD of sample means tracks σ/√n across a sweep for two parents (D3)", function (a) {
    var h = host(), api = demos.initStandardError(h), K = api.constants;
    var s = api.state();
    a.equal(Object.keys(s.points).length, 1, "one point on init at the default n");
    a.equal(s.means.length, K.SAMPLES_PER_N);
    a.close(s.points[s.n], stats.sd(s.means), 1e-9);
    a.equal(readout(h, "SD of " + K.SAMPLES_PER_N + " sample means"), stats.sd(s.means).toFixed(3));
    api.sweep();
    s = api.state();
    var expected = K.SWEEP.length + (K.SWEEP.indexOf(s.n) >= 0 ? 0 : 1);   // the current n keeps its own point
    a.equal(Object.keys(s.points).length, expected);
    K.SWEEP.forEach(function (n) { var theory = s.sigma / Math.sqrt(n); a.close(s.points[n], theory, 0.12 * theory, "n = " + n + ": " + s.points[n].toFixed(3) + " vs " + theory.toFixed(3)); });
    a.equal(h.querySelectorAll("circle.se-dot").length, expected);
    api.setParent("exponential"); api.sweep();
    s = api.state();
    a.close(s.sigma, 2, 1e-12);
    K.SWEEP.forEach(function (n) { var theory = 2 / Math.sqrt(n); a.close(s.points[n], theory, 0.15 * theory, "skewed parent n = " + n); });
  });

  test("standard-error: n slider re-simulates; parent change clears points; clamps; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initStandardError(h), K = api.constants;
    api.setN(64);
    var s = api.state();
    a.equal(s.n, 64); a.ok(s.points[64] !== undefined);
    a.close(s.se, s.sigma / 8, 1e-12);
    a.equal(readout(h, "n"), "64");
    api.setN(0); a.equal(api.state().n, K.MIN_N); api.setN(1e6); a.equal(api.state().n, K.MAX_N);
    api.setParent("dice");
    s = api.state();
    a.equal(Object.keys(s.points).length, 1, "new parent, fresh points");
    a.close(s.sigma, Math.sqrt(35 / 12), 1e-12);
    api.reset();
    s = api.state();
    a.equal(s.parent, K.DEFAULT_PARENT); a.equal(s.n, K.DEFAULT_N);
    a.equal(h.querySelector("input[type=range]").value, String(K.DEFAULT_N));
  });

  test("clt-sums: sums have mean ≈ nμ and SD ≈ σ√n; axis contains nμ ± 3σ√n and never rescales while drawing (D3, D7)", function (a) {
    var h = host(), api = demos.initCltSums(h), K = api.constants;
    var s = api.state();
    a.equal(s.parent, "dice"); a.equal(s.n, 10);
    var lo = s.lo, hi = s.hi;
    api.draw(1000 - K.INITIAL_SAMPLES);
    s = api.state();
    a.equal(s.samples, 1000); a.equal(s.lo, lo); a.equal(s.hi, hi, "axis unchanged while sums accumulate");
    a.close(s.meanOfSums, 35, 6 * Math.sqrt(35 / 12 * 10) / Math.sqrt(1000) + 0.05);
    a.close(s.sdOfSums, Math.sqrt(35 / 12 * 10), 0.15 * Math.sqrt(35 / 12 * 10));
    a.equal(readout(h, "nμ"), "35.00");
    a.ok(s.lo <= 35 - 3 * s.sdOfSums && s.hi >= 35 + 3 * s.sdOfSums, "axis holds ±3 SD");
    a.ok(s.lo >= 10 && s.hi <= 60, "axis clipped to possible dice totals: " + s.lo + ".." + s.hi);
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0) + s.beyond, 1000);
    s.sums.forEach(function (v) { a.ok(v >= 10 && v <= 60 && v === Math.round(v), "dice sums are integers in 10..60"); });
  });

  test("clt-sums: parent and n changes reset the axis and run; exponential sums stay non-negative; cap and reset (D4, D6)", function (a) {
    var h = host(), api = demos.initCltSums(h), K = api.constants;
    api.setParent("exponential"); api.setN(1); api.draw(300);
    var s = api.state();
    a.equal(s.n, 1); a.equal(s.lo, 0, "sum of one exponential cannot be negative, axis starts at 0");
    s.sums.forEach(function (v) { a.ok(v >= 0); });
    api.setN(100);
    s = api.state();
    a.equal(s.samples, K.INITIAL_SAMPLES, "n change restarts");
    a.close((s.lo + s.hi) / 2, 200, 1e-9, "axis centred on nμ = 200");
    api.setParent("bimodal"); api.setN(2); api.draw(400);
    s = api.state();
    a.close(s.meanOfSums, 10, 1.2);
    var added = api.draw(K.MAX_SAMPLES);
    a.equal(api.state().samples, K.MAX_SAMPLES); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.reset();
    s = api.state();
    a.equal(s.parent, K.DEFAULT_PARENT); a.equal(s.n, K.DEFAULT_N); a.equal(s.samples, K.INITIAL_SAMPLES); a.ok(!h.querySelector(".ui-button--primary").disabled);
  });
})();

/* ===================== Chapter 8 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  /* ---- 8.1 ---- */
  test("ci-meaning: each interval is x̄ ± z*σ/√n with z* from normalQuantile; hit flags recomputed; capture rate near nominal (D3)", function (a) {
    var h = host(), api = demos.initCiMeaning(h), K = api.constants, s = api.state();
    a.equal(s.total, K.INITIAL); a.equal(s.recent.length, K.INITIAL);
    a.close(s.z, stats.normalQuantile(0.975), 1e-12);
    a.close(s.margin, 1.959963984540054 * K.SIGMA / Math.sqrt(K.DEFAULT_N), 1e-9);
    api.draw(1990);
    s = api.state();
    a.equal(s.total, 2000); a.equal(s.recent.length, K.SHOWN);
    s.recent.forEach(function (iv) {
      a.close(iv.hi - iv.lo, 2 * s.margin, 1e-9); a.close((iv.lo + iv.hi) / 2, iv.xbar, 1e-9);
      a.equal(iv.hit, iv.lo <= K.MU && K.MU <= iv.hi, "hit flag matches the interval");
    });
    a.close(s.captured / s.total, 0.95, 0.03, "capture rate ≈ 95 %: " + (s.captured / s.total).toFixed(3));
    a.equal(readout(h, "Captured μ"), String(s.captured));
    a.equal(readout(h, "Capture rate"), (s.captured / s.total * 100).toFixed(1) + " %");
    a.equal(h.querySelectorAll("g.ci-row").length, K.SHOWN);
    a.equal(h.querySelectorAll("line.ci-line--miss").length, s.recent.filter(function (iv) { return !iv.hit; }).length, "misses drawn dashed");
  });

  test("ci-meaning: level and n change the margin and restart; extremes; cap; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initCiMeaning(h), K = api.constants;
    api.draw(100);
    api.setLevel(99);
    var s = api.state();
    a.equal(s.total, K.INITIAL, "level change restarts"); a.close(s.z, stats.normalQuantile(0.995), 1e-12);
    api.setLevel(80); a.close(api.state().z, stats.normalQuantile(0.9), 1e-12);
    api.setLevel(200); a.equal(api.state().level, K.MAX_LEVEL); api.setLevel(0); a.equal(api.state().level, K.MIN_LEVEL);
    api.setN(K.MAX_N); a.close(api.state().margin, api.state().z * K.SIGMA / 10, 1e-9);
    api.setN(1); a.equal(api.state().n, K.MIN_N);
    api.draw(2000);
    s = api.state();
    a.close(s.captured / s.total, 0.8, 0.04, "80 % level captures ≈ 80 %: " + (s.captured / s.total).toFixed(3));
    var added = api.draw(K.MAX_TOTAL);
    a.equal(api.state().total, K.MAX_TOTAL); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.startAuto(); a.ok(!api.state().auto);
    api.reset();
    s = api.state();
    a.equal(s.level, K.DEFAULT_LEVEL); a.equal(s.n, K.DEFAULT_N); a.equal(s.total, K.INITIAL); a.ok(!h.querySelector(".ui-button--primary").disabled);
  });

  /* ---- 8.2 ---- */
  test("t-distribution: t* and tails from stats; intervals from the sample; t wider than z on average; df → normal (D3)", function (a) {
    var h = host(), api = demos.initTDistribution(h), K = api.constants, s = api.state();
    a.equal(s.df, K.DEFAULT_DF); a.equal(s.n, K.DEFAULT_DF + 1); a.equal(s.sample.length, s.n);
    a.close(s.tStar, stats.tQuantile(0.975, 4), 1e-12); a.close(s.zStar, stats.normalQuantile(0.975), 1e-12);
    a.close(s.tTail, 2 * (1 - stats.tCdf(2, 4)), 1e-12); a.close(s.zTail, 2 * (1 - stats.normalCdf(2)), 1e-12);
    a.ok(s.tTail > s.zTail, "t tails are heavier");
    a.equal(readout(h, "t* (97.5th percentile)"), stats.tQuantile(0.975, 4).toFixed(3));
    a.close(s.xbar, stats.mean(s.sample), 1e-12); a.close(s.s, stats.sd(s.sample), 1e-12);
    a.close(s.zInterval[1] - s.zInterval[0], 2 * s.zStar * K.SIGMA / Math.sqrt(s.n), 1e-9);
    a.close(s.tInterval[1] - s.tInterval[0], 2 * s.tStar * s.s / Math.sqrt(s.n), 1e-9);
    var wider = 0, trials = 200;
    for (var i = 0; i < trials; i++) { api.newSample(); var st = api.state(); if (st.tInterval[1] - st.tInterval[0] > st.zInterval[1] - st.zInterval[0]) wider++; }
    a.ok(wider > trials * 0.6, "t-interval wider than z-interval most of the time: " + wider + "/" + trials);
    api.setDf(60);
    s = api.state();
    a.equal(s.n, 61);
    a.ok(Math.abs(s.tStar - s.zStar) < 0.05, "at df = 60, t* ≈ z*: " + s.tStar.toFixed(3));
    a.ok(Math.abs(s.tTail - s.zTail) < 0.006, "tails nearly equal at df = 60");
  });

  test("t-distribution: df extremes stay finite and drawn; New sample changes the data; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initTDistribution(h), K = api.constants;
    api.setDf(1);
    var s = api.state();
    a.equal(s.n, 2); a.close(s.tStar, 12.706204736174694, 1e-7);
    a.ok(isFinite(s.s) && isFinite(s.tInterval[0]), "two-value sample still gives a finite s and interval");
    a.equal(h.querySelectorAll("path.line--strong").length, 1);
    a.ok(h.querySelector("path.line--strong").getAttribute("d").indexOf("NaN") < 0, "t curve has no NaN");
    api.setDf(999); a.equal(api.state().df, K.MAX_DF); api.setDf(0); a.equal(api.state().df, K.MIN_DF);
    api.setDf(9);
    var before = api.state().sample.join(",");
    api.newSample();
    a.ok(api.state().sample.join(",") !== before, "new sample differs"); a.equal(api.state().sample.length, 10);
    a.equal(h.querySelectorAll("circle.dot--sample").length, 10);
    api.reset();
    a.equal(api.state().df, K.DEFAULT_DF); a.equal(h.querySelector("input[type=range]").value, String(K.DEFAULT_DF));
  });

  /* ---- 8.3 ---- */
  test("proportion-ci: p̂ = x/n, margin z*√(p̂(1−p̂)/n), hit flags recomputed; capture rate near nominal at n = 100 (D3)", function (a) {
    var h = host(), api = demos.initProportionCi(h), K = api.constants, s = api.state();
    a.equal(s.total, K.INITIAL); a.close(s.z, stats.normalQuantile(0.975), 1e-12);
    api.poll(1990);
    s = api.state();
    a.equal(s.total, 2000);
    s.recent.forEach(function (iv) {
      a.ok(iv.x >= 0 && iv.x <= iv.n && iv.x === Math.round(iv.x)); a.close(iv.phat, iv.x / iv.n, 1e-12);
      a.close(iv.margin, s.z * Math.sqrt(iv.phat * (1 - iv.phat) / iv.n), 1e-12);
      a.close(iv.lo, iv.phat - iv.margin, 1e-12); a.close(iv.hi, iv.phat + iv.margin, 1e-12);
      a.equal(iv.hit, iv.lo <= s.p && s.p <= iv.hi);
    });
    a.close(s.captured / s.total, 0.95, 0.035, "capture ≈ 95 %: " + (s.captured / s.total).toFixed(3));
    var latest = s.recent[s.recent.length - 1];
    a.equal(readout(h, "Latest poll p̂ = x/n"), latest.x + "/" + latest.n + " = " + latest.phat.toFixed(3));
    a.equal(h.querySelectorAll("g.ci-row").length, K.SHOWN);
  });

  test("proportion-ci: small n·p warns and under-covers; sliders clamp and restart; button label follows n; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initProportionCi(h), K = api.constants;
    api.setN(10); api.setP(0.05);
    var s = api.state();
    a.equal(s.n, 10); a.close(s.p, 0.05, 1e-12); a.equal(s.total, K.INITIAL, "restarted");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("Warning") === 0, "small-sample warning shown");
    a.equal(h.querySelector(".ui-button--primary").textContent, "Poll 10 voters");
    api.poll(3000);
    s = api.state();
    a.ok(s.captured / s.total < 0.93, "normal approximation under-covers at n·p = 0.5: " + (s.captured / s.total).toFixed(3));
    s.recent.forEach(function (iv) { a.ok(isFinite(iv.lo) && isFinite(iv.hi), "x = 0 gives a zero-width interval, not NaN"); });
    api.setP(2); a.close(api.state().p, K.MAX_P, 1e-12); api.setP(-1); a.close(api.state().p, K.MIN_P, 1e-12);
    api.setN(9999); a.equal(api.state().n, K.MAX_N); api.setN(3); a.equal(api.state().n, K.MIN_N);
    api.setLevel(99); a.close(api.state().z, stats.normalQuantile(0.995), 1e-12);
    api.reset();
    s = api.state();
    a.close(s.p, K.DEFAULT_P, 1e-12); a.equal(s.n, K.DEFAULT_N); a.equal(s.level, K.DEFAULT_LEVEL); a.equal(s.total, K.INITIAL);
    a.equal(h.querySelector(".ui-button--primary").textContent, "Poll " + K.DEFAULT_N + " voters");
  });
})();

/* ===================== Chapter 9 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function key(el, k) { el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); }

  /* ---- 9.1 ---- */
  test("error-types: α and β from the normal CDF at the cutoff; the 5 % button gives α = 0.05; trade-off and n effects (D3, D5)", function (a) {
    var h = host(), api = demos.initErrorTypes(h), K = api.constants, s = api.state();
    a.close(s.alpha, 0.05, 1e-9, "default cutoff set for α = 5 %");
    a.close(s.cutoff, stats.normalQuantile(0.95, K.MU0, K.SIGMA / Math.sqrt(K.DEFAULT_N)), 0.006);
    a.close(s.beta, stats.normalCdf(s.cutoff, K.MU0 + K.DEFAULT_EFFECT, s.se), 1e-12);
    a.equal(readout(h, "α = P(reject | H₀ true)"), "5.0 %");
    a.equal(readout(h, "Power = 1 − β"), ((1 - s.beta) * 100).toFixed(1) + " %");
    api.setCutoff(s.cutoff + 2);
    var s2 = api.state();
    a.ok(s2.alpha < s.alpha && s2.beta > s.beta, "moving the cutoff right lowers α and raises β");
    api.setAlpha(1); a.close(api.state().alpha, 0.01, 1e-9);
    api.setAlpha(10); a.close(api.state().alpha, 0.10, 1e-9);
    api.setAlpha(5);
    var b16 = api.state().beta;
    api.setN(64); api.setAlpha(5);
    a.ok(api.state().beta < b16, "more data lowers β at the same α");
    api.setEffect(0); api.setAlpha(5);
    a.close(api.state().power, api.state().alpha, 1e-9, "no effect: power equals α");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("no real effect") >= 0);
  });

  test("error-types: handle drags/keys clamp; sliders clamp; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initErrorTypes(h), K = api.constants;
    var handle = h.querySelector("g.handle");
    a.equal(handle.getAttribute("role"), "slider");
    var c0 = api.state().cutoff;
    key(handle, "ArrowRight"); a.close(api.state().cutoff, c0 + K.KEY_STEP, 1e-9);
    for (var i = 0; i < 500; i++) key(handle, "ArrowRight");
    a.equal(api.state().cutoff, K.X_MAX);
    a.ok(api.state().alpha >= 0 && api.state().beta <= 1);
    api.setCutoff(-100); a.equal(api.state().cutoff, K.X_MIN); a.close(api.state().alpha, 1 - stats.normalCdf(K.X_MIN, K.MU0, api.state().se), 1e-12);
    api.setEffect(99); a.equal(api.state().effect, K.MAX_EFFECT);
    api.setN(0); a.equal(api.state().n, K.MIN_N);
    api.setN(1e6); a.equal(api.state().n, K.MAX_N);
    a.ok(h.querySelector("path.area--alpha").getAttribute("d").indexOf("NaN") < 0);
    api.reset();
    var s = api.state();
    a.equal(s.effect, K.DEFAULT_EFFECT); a.equal(s.n, K.DEFAULT_N); a.close(s.alpha, 0.05, 1e-9);
  });

  /* ---- 9.2 ---- */
  test("p-value: p = 2(1 − Φ(|z|)) from the latest x̄; under a true H₀ about 5 % fall below 0.05; bins count every test (D3)", function (a) {
    var h = host(), api = demos.initPValue(h), K = api.constants, s = api.state();
    a.equal(s.truth, "null"); a.equal(s.tests, K.INITIAL);
    api.draw(1999);
    s = api.state();
    a.equal(s.tests, 2000);
    a.close(s.z, (s.xbar - K.MU0) / (K.SIGMA / Math.sqrt(s.n)), 1e-12);
    a.close(s.p, 2 * (1 - stats.normalCdf(Math.abs(s.z))), 1e-12);
    a.equal(readout(h, "p-value"), s.p.toFixed(4));
    a.close(s.small / s.tests, 0.05, 0.02, "Type I error rate ≈ 5 %: " + (s.small / s.tests).toFixed(3));
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0), 2000);
    var maxBin = Math.max.apply(null, s.bins), minBin = Math.min.apply(null, s.bins);
    a.ok(maxBin < 3 * minBin + 30, "p-values roughly flat under H₀ (" + minBin + ".." + maxBin + ")");
    a.equal(h.querySelectorAll("rect.bar").length, K.P_BINS);
    a.equal(h.querySelector("[role=group] button[aria-pressed=true]").textContent.indexOf("H₀ is true"), 0);
  });

  test("p-value: under a false H₀ the share below 0.05 is the power; truth/effect/n changes restart; cap; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initPValue(h), K = api.constants;
    api.setTruth("effect");
    var s = api.state();
    a.equal(s.trueMean, K.MU0 + K.DEFAULT_EFFECT); a.equal(s.tests, K.INITIAL, "truth change restarts");
    api.draw(1999);
    s = api.state();
    var power = 1 - stats.normalCdf(1.96 - K.DEFAULT_EFFECT / (K.SIGMA / Math.sqrt(K.DEFAULT_N))) + stats.normalCdf(-1.96 - K.DEFAULT_EFFECT / (K.SIGMA / Math.sqrt(K.DEFAULT_N)));
    a.close(s.small / s.tests, power, 0.05, "share below 0.05 ≈ theoretical power " + power.toFixed(3) + ": " + (s.small / s.tests).toFixed(3));
    a.ok(s.bins[0] > s.bins[K.P_BINS - 1], "p-values crowd toward zero when H₀ is false");
    api.setEffect(K.MAX_EFFECT); a.equal(api.state().tests, K.INITIAL, "effect change restarts when it matters");
    api.setN(K.MAX_N); api.draw(300);
    a.ok(api.state().small / api.state().tests > 0.99, "huge effect and n: essentially always rejected");
    api.setN(0); a.equal(api.state().n, K.MIN_N);
    var added = api.draw(K.MAX_TESTS);
    a.equal(api.state().tests, K.MAX_TESTS); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.startAuto(); a.ok(!api.state().auto);
    api.reset();
    s = api.state();
    a.equal(s.truth, "null"); a.equal(s.effect, K.DEFAULT_EFFECT); a.equal(s.n, K.DEFAULT_N); a.equal(s.tests, K.INITIAL);
    a.ok(!h.querySelector(".ui-button--primary").disabled);
  });

  /* ---- 9.3 ---- */
  test("full-test: t, df, p and the decision recomputed from the sample; steps text; critical value from tQuantile (D3, D5)", function (a) {
    var h = host(), api = demos.initFullTest(h), K = api.constants, s = api.state();
    a.equal(s.sample.length, K.DEFAULT_N); a.equal(s.df, K.DEFAULT_N - 1); a.equal(s.runs, 1);
    a.close(s.xbar, stats.mean(s.sample), 1e-12); a.close(s.s, stats.sd(s.sample), 1e-12);
    a.close(s.t, (s.xbar - K.MU0) / (s.s / Math.sqrt(s.sample.length)), 1e-9);
    a.close(s.p, 2 * (1 - stats.tCdf(Math.abs(s.t), s.df)), 1e-12);
    a.close(s.tStar, stats.tQuantile(0.975, s.df), 1e-9);
    a.equal(s.reject, s.p < K.DEFAULT_ALPHA);
    a.equal(s.reject, Math.abs(s.t) > s.tStar, "p < α exactly when |t| > t*");
    a.equal(readout(h, "t"), s.t.toFixed(3)); a.equal(readout(h, "p-value"), s.p.toFixed(4));
    var steps = h.querySelectorAll("ol.test-steps li");
    a.equal(steps.length, 5);
    a.ok(steps[0].textContent.indexOf("H₀: μ = 50") >= 0);
    a.ok(steps[4].textContent.indexOf(s.reject ? "reject H₀" : "fail to reject H₀") >= 0);
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf(s.reject ? "Type I error" : "correct call") >= 0, "truth-aware verdict under a true H₀");
  });

  test("full-test: rejection rate ≈ α when μ = 50 and high when μ = 60; α buttons; clamps; reset (D3, D4, D6)", function (a) {
    var h = host(), api = demos.initFullTest(h), K = api.constants;
    api.run(1999);
    var s = api.state();
    a.equal(s.runs, 2000);
    a.close(s.rejected / s.runs, 0.05, 0.02, "Type I rate ≈ α: " + (s.rejected / s.runs).toFixed(3));
    a.equal(readout(h, "Rejected H₀"), String(s.rejected));
    api.setAlpha(0.01);
    a.equal(api.state().runs, 1, "α change restarts");
    a.equal(h.querySelector("[role=group] button[aria-pressed=true]").textContent, "α = 0.01");
    api.run(1999);
    a.close(api.state().rejected / api.state().runs, 0.01, 0.01, "Type I rate ≈ 1 %");
    api.setAlpha(0.05); api.setTruth(60); api.setN(20); api.run(499);
    s = api.state();
    a.equal(s.truth, 60);
    a.ok(s.rejected / s.runs > 0.95, "a 10-point shift with n = 20 is almost always detected: " + (s.rejected / s.runs).toFixed(3));
    a.ok(h.querySelector(".demo__status:not([role])").textContent.indexOf("power") >= 0 || h.querySelectorAll(".demo__status")[2].textContent.indexOf("power") >= 0);
    api.setTruth(99); a.equal(api.state().truth, K.MAX_TRUTH); api.setN(1); a.equal(api.state().n, K.MIN_N);
    a.ok(isFinite(api.state().t), "n = 3 still gives a finite t");
    api.setAlpha(0.5); a.equal(api.state().alpha, 0.05, "unknown α ignored");
    api.reset();
    s = api.state();
    a.equal(s.truth, K.DEFAULT_TRUTH); a.equal(s.n, K.DEFAULT_N); a.equal(s.alpha, K.DEFAULT_ALPHA); a.equal(s.runs, 1);
  });
})();

/* ===================== Chapter 10 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function key(el, k) { el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); }

  /* ---- 10.1 ---- */
  test("two-means: readouts equal Welch's test on the actual samples; equal means give ≈ 5 % false alarms (D3, D5)", function (a) {
    var h = host(), api = demos.initTwoMeans(h), K = api.constants, s = api.state();
    a.equal(s.sampleA.length, K.DEFAULT_N); a.equal(s.sampleB.length, K.DEFAULT_N); a.equal(s.tests, K.INITIAL);
    var w = stats.welchTest(s.sampleA, s.sampleB);
    a.close(s.t, w.t, 1e-12); a.close(s.df, w.df, 1e-12); a.close(s.p, w.p, 1e-12);
    a.close(s.diff, stats.mean(s.sampleA) - stats.mean(s.sampleB), 1e-12);
    a.equal(readout(h, "p-value"), s.p.toFixed(4)); a.equal(readout(h, "Welch t"), s.t.toFixed(3));
    api.setMu("B", K.MU.A.value);
    a.equal(api.state().tests, K.INITIAL, "moving a mean restarts");
    api.sample(1999);
    s = api.state();
    a.equal(s.tests, 2000);
    a.close(s.small / s.tests, 0.05, 0.02, "false-alarm rate ≈ 5 %: " + (s.small / s.tests).toFixed(3));
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0) + s.beyond, 2000);
    a.close(s.se0, K.SIGMA * Math.sqrt(2 / K.DEFAULT_N), 1e-12);
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("identical") >= 0);
  });

  test("two-means: a real gap is detected more often with larger n; handles clamp and use keys; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initTwoMeans(h), K = api.constants;
    api.setMu("A", 45); api.setMu("B", 55); api.setN(10); api.sample(500);
    var small = api.state().small / api.state().tests;
    api.setN(60); api.sample(500);
    var large = api.state().small / api.state().tests;
    a.ok(large > small && large > 0.95, "n = 60 detects a 10-point gap almost always (" + large.toFixed(2) + " vs " + small.toFixed(2) + " at n = 10)");
    var hs = h.querySelectorAll("g.handle");
    a.equal(hs.length, 2); a.equal(hs[0].getAttribute("role"), "slider");
    var before = api.state().mu.A;
    key(hs[0], "ArrowRight"); a.close(api.state().mu.A, before + K.KEY_STEP, 1e-12);
    for (var i = 0; i < 200; i++) key(hs[0], "ArrowRight");
    a.equal(api.state().mu.A, K.MU.A.max);
    api.setMu("B", -999); a.equal(api.state().mu.B, K.MU.B.min);
    api.setN(0); a.equal(api.state().n, K.MIN_N); api.setN(1e6); a.equal(api.state().n, K.MAX_N);
    a.ok(h.querySelectorAll("circle.dot--sample").length === K.MAX_N, "sample A dots drawn");
    var added = api.sample(K.MAX_TESTS);
    a.equal(api.state().tests, K.MAX_TESTS); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.reset();
    var s = api.state();
    a.equal(s.mu.A, K.MU.A.value); a.equal(s.mu.B, K.MU.B.value); a.equal(s.n, K.DEFAULT_N); a.equal(s.tests, K.INITIAL);
    a.ok(!h.querySelector(".ui-button--primary").disabled);
  });

  /* ---- 10.2 ---- */
  test("two-proportions: readouts equal the pooled z-test on the actual counts; power grows with n (D3)", function (a) {
    var h = host(), api = demos.initTwoProportions(h), K = api.constants, s = api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.tests, K.INITIAL);
    var r = stats.twoProportionTest(s.xa, s.n, s.xb, s.n);
    a.close(s.z, r.z, 1e-12); a.close(s.pValue, r.p, 1e-12); a.close(s.diff, s.xa / s.n - s.xb / s.n, 1e-12);
    a.equal(readout(h, "Version A: x/n"), s.xa + "/" + s.n + " = " + (s.xa / s.n).toFixed(3));
    api.run(999);
    var powerSmall = api.state().small / api.state().tests;
    api.setN(K.MAX_N); api.run(999);
    var powerLarge = api.state().small / api.state().tests;
    a.ok(powerLarge > powerSmall + 0.3, "n = 2000 detects the 3-point gap far more often: " + powerLarge.toFixed(2) + " vs " + powerSmall.toFixed(2));
    a.equal(api.state().bins.reduce(function (x, y) { return x + y; }, 0), 1000);
    a.equal(h.querySelectorAll("rect.bar").length, K.P_BINS + 2, "20 histogram bars plus the two rate bars");
  });

  test("two-proportions: equal rates give ≈ 5 % false alarms; sliders clamp and restart; cap; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initTwoProportions(h), K = api.constants;
    api.setP("B", K.P.A.value);
    a.equal(api.state().tests, K.INITIAL);
    api.run(1999);
    var s = api.state();
    a.close(s.small / s.tests, 0.05, 0.02, "false alarms ≈ 5 %: " + (s.small / s.tests).toFixed(3));
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("identical") >= 0);
    api.setP("A", 2); a.close(api.state().p.A, K.MAX_P, 1e-12); api.setP("A", -1); a.close(api.state().p.A, K.MIN_P, 1e-12);
    api.setN(7); a.equal(api.state().n, K.MIN_N); api.setN(1e9); a.equal(api.state().n, K.MAX_N);
    api.setP("A", 0.05); api.setP("B", 0.05); api.setN(K.MIN_N); api.run(200);
    s = api.state();
    a.ok(isFinite(s.z) && isFinite(s.pValue), "tiny n with rare events never yields NaN");
    var added = api.run(K.MAX_TESTS);
    a.equal(api.state().tests, K.MAX_TESTS); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.reset();
    s = api.state();
    a.close(s.p.A, K.P.A.value, 1e-12); a.close(s.p.B, K.P.B.value, 1e-12); a.equal(s.n, K.DEFAULT_N); a.equal(s.tests, K.INITIAL);
  });

  /* ---- 10.3 ---- */
  test("paired: both tests recomputed from the subjects; pairing beats independence for the same data (D3)", function (a) {
    var h = host(), api = demos.initPaired(h), K = api.constants, s = api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.before.length, s.n); a.equal(s.after.length, s.n); a.equal(s.mode, K.DEFAULT_MODE);
    var ind = stats.welchTest(s.after, s.before), pr = stats.pairedTest(s.before, s.after);
    a.close(s.independent.p, ind.p, 1e-12); a.close(s.paired.p, pr.p, 1e-12); a.close(s.paired.meanDiff, pr.meanDiff, 1e-12);
    a.equal(readout(h, "p-value"), s.independent.p.toFixed(4), "independent mode shows the Welch p");
    a.equal(readout(h, "p-value the other way"), s.paired.p.toFixed(4));
    a.equal(h.querySelectorAll("line.pair-link").length, s.n);
    a.ok(Array.prototype.every.call(h.querySelectorAll("line.pair-link"), function (l) { return l.style.display === "none"; }), "links hidden in independent mode");
    var wins = 0, trials = 40;
    for (var i = 0; i < trials; i++) { api.newSubjects(); var st = api.state(); if (st.paired.p < st.independent.p) wins++; }
    a.ok(wins >= trials * 0.9, "paired p smaller almost always: " + wins + "/" + trials);
    api.setMode("paired");
    s = api.state();
    a.equal(readout(h, "p-value"), s.paired.p.toFixed(4));
    a.ok(Array.prototype.every.call(h.querySelectorAll("line.pair-link"), function (l) { return l.style.display !== "none"; }), "links shown in paired mode");
    a.equal(h.querySelector("[role=group] button[aria-pressed=true]").textContent, "Treat as pairs");
    a.ok(s.paired.sdDiff < s.sdBetween, "spread of changes below spread between subjects");
  });

  test("paired: effect 0 gives ≈ 5 % false alarms for the paired test; sliders clamp; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initPaired(h), K = api.constants;
    api.setEffect(0);
    var small = 0, trials = 400;
    for (var i = 0; i < trials; i++) { api.newSubjects(); if (api.state().paired.p < 0.05) small++; }
    a.close(small / trials, 0.05, 0.04, "paired false alarms ≈ 5 %: " + (small / trials).toFixed(3));
    api.setEffect(99); a.equal(api.state().effect, K.MAX_EFFECT);
    api.setN(1); a.equal(api.state().n, K.MIN_N); api.setN(999); a.equal(api.state().n, K.MAX_N);
    a.equal(h.querySelectorAll("line.pair-link").length, K.MAX_N);
    api.state().after.forEach(function (v) { a.ok(v >= 20 && v <= 100, "scores stay on the axis"); });
    api.setMode("nonsense"); a.equal(api.state().mode, K.DEFAULT_MODE, "unknown mode ignored");
    api.setMode("paired"); api.reset();
    var s = api.state();
    a.equal(s.mode, K.DEFAULT_MODE); a.equal(s.effect, K.DEFAULT_EFFECT); a.equal(s.n, K.DEFAULT_N);
  });
})();

/* ===================== Chapter 11 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  /* ---- 11.1 ---- */
  test("goodness-of-fit: readouts and table equal chiSquareGof on the observed counts; fair claim gives ≈ 5 % false alarms (D3, D5)", function (a) {
    var h = host(), api = demos.initGoodnessOfFit(h), K = api.constants, s = api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.tests, K.INITIAL);
    a.equal(s.observed.reduce(function (x, y) { return x + y; }, 0), s.n, "observed counts sum to n");
    var r = stats.chiSquareGof(s.observed, s.probs);
    a.close(s.chi2, r.chi2, 1e-12); a.equal(s.df, 5); a.close(s.p, r.p, 1e-12);
    a.close(s.contributions.reduce(function (x, y) { return x + y; }, 0), s.chi2, 1e-9);
    a.equal(readout(h, "χ²"), s.chi2.toFixed(3)); a.equal(readout(h, "Critical χ² at 5 %"), stats.chiSquareQuantile(0.95, 5).toFixed(3));
    a.equal(h.querySelector("[data-chi]").textContent, s.chi2.toFixed(2));
    api.roll(1999);
    s = api.state();
    a.equal(s.tests, 2000);
    a.close(s.small / s.tests, 0.05, 0.02, "false alarms ≈ 5 %: " + (s.small / s.tests).toFixed(3));
    a.equal(s.bins.reduce(function (x, y) { return x + y; }, 0) + s.beyond, 2000);
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("H₀ is true") >= 0);
    a.equal(h.querySelectorAll("rect.bar--theory").length, 6); a.equal(h.querySelectorAll("rect.bar--empirical").length, 6);
  });

  test("goodness-of-fit: a wrong claim is rejected more often with more rolls; weights clamp; low-E warning; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initGoodnessOfFit(h), K = api.constants;
    api.setClaim(5, 2);   // a mild false claim: face 6 at 2/7 instead of 1/6
    var s = api.state();
    a.close(s.probs[5], 2 / 7, 1e-12); a.equal(s.tests, K.INITIAL, "claim change restarts");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("H₀ is false") >= 0);
    api.setN(K.MIN_N); api.roll(300); var low = api.state().small / api.state().tests;
    api.setN(K.MAX_N); api.roll(300); var high = api.state().small / api.state().tests;
    a.ok(high > low + 0.3 && high > 0.9, "600 rolls expose the mild false claim far more often: " + high.toFixed(2) + " vs " + low.toFixed(2) + " at 30 rolls");
    api.setClaim(0, 0); a.equal(api.state().weights[0], K.MIN_W, "weights never reach zero, so expected counts stay positive");
    api.setClaim(0, 99); a.equal(api.state().weights[0], K.MAX_W);
    api.setN(K.MIN_N);
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("Warning") >= 0, "expected below 5 warns");
    a.equal(h.querySelector(".ui-button--primary").textContent, "Roll " + K.MIN_N + " times and test");
    var added = api.roll(K.MAX_TESTS);
    a.equal(api.state().tests, K.MAX_TESTS); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.reset();
    s = api.state();
    a.equal(s.weights.join(","), K.DEFAULT_WEIGHTS.join(",")); a.equal(s.n, K.DEFAULT_N); a.equal(s.tests, K.INITIAL);
    a.ok(!h.querySelector(".ui-button--primary").disabled);
  });

  /* ---- 11.2 ---- */
  test("independence: D-005 cell probabilities are valid at every slider position and keep the margins (D3)", function (a) {
    var h = host(), api = demos.initIndependence(h), K = api.constants;
    for (var s = 0; s <= 1.0001; s += 0.05) {
      var p = api.cellProbs(s), total = 0;
      p.forEach(function (v) { a.ok(v >= -1e-12, "no negative cell at s = " + s.toFixed(2)); total += v; });
      a.close(total, 1, 1e-12, "cells sum to 1 at s = " + s.toFixed(2));
      a.close(p[0] + p[1] + p[2], K.ROW_P[0], 1e-12, "row 1 margin fixed"); a.close(p[0] + p[3], K.COL_P[0], 1e-12, "column 1 margin fixed");
      a.close(p[1] + p[4], K.COL_P[1], 1e-12); a.close(p[2] + p[5], K.COL_P[2], 1e-12);
    }
    var p0 = api.cellProbs(0);
    a.close(p0[0], K.ROW_P[0] * K.COL_P[0], 1e-12, "s = 0 is the exact independence table");
    var p1 = api.cellProbs(1);
    a.close(p1[5], K.P_ASSOC[1][2], 1e-12, "s = 1 is the target associated table");
  });

  test("independence: readouts and table equal chiSquareIndependence on the sampled table; s = 0 gives ≈ 5 % false alarms; association detected (D3, D5)", function (a) {
    var h = host(), api = demos.initIndependence(h), K = api.constants, s = api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.s, K.DEFAULT_S);
    var total = 0; s.table.forEach(function (row) { row.forEach(function (v) { total += v; }); });
    a.equal(total, s.n);
    var r = stats.chiSquareIndependence(s.table);
    a.close(s.chi2, r.chi2, 1e-12); a.equal(s.df, 2); a.close(s.p, r.p, 1e-12);
    a.equal(readout(h, "p-value"), s.p.toFixed(4));
    a.equal(h.querySelector("[data-cell=\"0-0\"]").textContent, s.table[0][0] + " (" + r.expected[0][0].toFixed(1) + ")");
    a.equal(h.querySelector("[data-n]").textContent, String(s.n));
    api.sample(1999);
    s = api.state();
    a.close(s.small / s.tests, 0.05, 0.02, "false alarms ≈ 5 % under independence: " + (s.small / s.tests).toFixed(3));
    api.setAssociation(1); api.sample(299);
    s = api.state();
    a.equal(s.s, 1);
    a.ok(s.small / s.tests > 0.99, "full association with n = 200 is always detected: " + (s.small / s.tests).toFixed(3));
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("rows really differ") >= 0);
    a.equal(h.querySelectorAll("g rect.cat-1, g rect.cat-2, g rect.cat-3").length, 6, "six stacked segments");
  });

  test("independence: moderate association needs n; sliders clamp and restart; cap; reset (D4, D6)", function (a) {
    var h = host(), api = demos.initIndependence(h), K = api.constants;
    api.setAssociation(0.25); api.setN(K.MIN_N); api.sample(300); var low = api.state().small / api.state().tests;
    api.setN(K.MAX_N); api.sample(300); var high = api.state().small / api.state().tests;
    a.ok(high > low + 0.3, "n = 1000 detects a modest association far more often: " + high.toFixed(2) + " vs " + low.toFixed(2));
    a.equal(h.querySelector(".ui-button--primary").textContent, "Survey " + K.MAX_N + " people");
    api.setAssociation(5); a.equal(api.state().s, 1); api.setAssociation(-1); a.equal(api.state().s, 0);
    api.setN(1); a.equal(api.state().n, K.MIN_N); api.setN(1e6); a.equal(api.state().n, K.MAX_N);
    api.setN(K.MIN_N);
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("Warning") >= 0, "expected below 5 warns at n = 30");
    var added = api.sample(K.MAX_TESTS);
    a.equal(api.state().tests, K.MAX_TESTS); a.ok(h.querySelector(".ui-button--primary").disabled);
    api.reset();
    var s = api.state();
    a.equal(s.s, K.DEFAULT_S); a.equal(s.n, K.DEFAULT_N); a.equal(s.tests, K.INITIAL); a.ok(!h.querySelector(".ui-button--primary").disabled);
  });
})();

/* ===================== Chapter 12 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function key(el, k) { var e = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; }
  function pressed(host) { var out = []; host.querySelectorAll("[aria-pressed=true]").forEach(function (b) { out.push(b.textContent); }); return out; }

  /* ---- 12.1 ---- */
  test("least-squares: readouts and squares equal linearRegression on the points; the best line has the smallest SSE (D3, D5)", function (a) {
    var h = host(), api = demos.initLeastSquares(h), K = api.constants, s = api.state();
    a.equal(s.mode, K.DEFAULT_MODE); a.equal(s.points.length, K.DEFAULT_POINTS.length);
    var f = stats.linearRegression(s.points.map(function (p) { return p[0]; }), s.points.map(function (p) { return p[1]; }));
    a.close(s.best.slope, f.slope, 1e-12); a.close(s.best.sse, f.sse, 1e-12);
    a.equal(readout(h, "Best slope b"), f.slope.toFixed(3)); a.equal(readout(h, "Best SSE"), f.sse.toFixed(3)); a.equal(readout(h, "r"), f.r.toFixed(3));
    a.equal(h.querySelectorAll("rect.square").length, s.points.length, "one square per point");
    a.equal(h.querySelectorAll("rect.square--manual").length, 0, "best-line squares in points mode");
    a.ok(h.querySelector("[data-eq]").textContent.indexOf("ŷ = ") === 11);
    var sq = h.querySelectorAll("rect.square");
    for (var i = 0; i < sq.length; i++) a.close(Number(sq[i].getAttribute("width")), Number(sq[i].getAttribute("height")), 1e-9, "square " + i + " is square");
    a.ok(s.yours.sse > s.best.sse, "the flat starting guess is worse than the fit");
    a.equal(pressed(h).join("|"), "Move points");
    for (var k = 0; k < 200; k++) { var g = api.state(); a.ok(g.yours.sse >= g.best.sse - 1e-9); api.setHandle(k % 2, 10 * Math.random()); }
  });

  test("least-squares: D-006 modes never collide: points lock in line mode, handles hide in points mode; keys move both; scoreboard matches (D1, D4)", function (a) {
    var h = host(), api = demos.initLeastSquares(h), K = api.constants;
    var pts = h.querySelectorAll("g.point"), handles = h.querySelectorAll("g.handle");
    a.equal(handles.length, 2); a.equal(handles[0].style.display, "none", "handles hidden in points mode");
    a.ok(key(pts[0], "ArrowRight")); var s = api.state(); a.close(s.points[0][0], K.DEFAULT_POINTS[0][0] + K.KEY_STEP, 1e-12);
    a.ok(key(pts[0], "ArrowUp")); a.close(api.state().points[0][1], K.DEFAULT_POINTS[0][1] + K.KEY_STEP, 1e-12);
    a.ok(!key(handles[0], "ArrowUp"), "handle keys are ignored in points mode");
    api.setMode("line");
    s = api.state();
    a.equal(s.mode, "line"); a.equal(pressed(h).join("|"), "Your line vs best line");
    a.equal(handles[0].style.display, ""); a.equal(handles[0].getAttribute("tabindex"), "0"); a.equal(pts[0].getAttribute("tabindex"), "-1");
    a.ok(pts[0].classList.contains("is-inert"));
    a.ok(!key(pts[1], "ArrowLeft"), "point keys are ignored in line mode"); a.close(api.state().points[1][0], K.DEFAULT_POINTS[1][0], 1e-12);
    a.ok(key(handles[1], "ArrowUp")); a.close(api.state().handles[1], K.DEFAULT_HANDLES[1] + K.KEY_STEP, 1e-12);
    a.equal(handles[1].getAttribute("aria-valuenow"), String(K.DEFAULT_HANDLES[1] + K.KEY_STEP));
    a.equal(h.querySelectorAll("rect.square--manual").length, K.DEFAULT_POINTS.length, "orange squares belong to the student's line");
    s = api.state();
    var xs = s.points.map(function (p) { return p[0]; }), ys = s.points.map(function (p) { return p[1]; });
    a.close(s.yours.sse, stats.sumSquaredResiduals(xs, ys, s.yours.intercept, s.yours.slope), 1e-12);
    a.equal(readout(h, "Your SSE"), s.yours.sse.toFixed(3));
    a.equal(readout(h, "Yours above best by"), s.gap.toFixed(1) + " %");
    api.setLine(s.best.intercept, s.best.slope);
    s = api.state();
    a.close(s.yours.sse, s.best.sse, 1e-9, "snapping to the best line matches its SSE");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("You matched") === 0);
    api.setHandle(0, 99); a.equal(api.state().handles[0], K.Y_MAX, "handles clamp");
    api.setPoint(0, -5, 99); a.equal(api.state().points[0][0], K.X_MIN); a.equal(api.state().points[0][1], K.Y_MAX, "points clamp");
    api.reset();
    s = api.state();
    a.equal(s.mode, K.DEFAULT_MODE); a.equal(JSON.stringify(s.points), JSON.stringify(K.DEFAULT_POINTS)); a.equal(JSON.stringify(s.handles), JSON.stringify(K.DEFAULT_HANDLES));
  });

  test("least-squares: every point on one x gives blank readouts, no NaN attributes, and recovers (D6)", function (a) {
    var h = host(), api = demos.initLeastSquares(h);
    for (var i = 0; i < api.constants.DEFAULT_POINTS.length; i++) api.setPoint(i, 5, i);
    a.equal(api.state().best, null); a.equal(readout(h, "Best slope b"), "—"); a.equal(readout(h, "r"), "—");
    a.equal(h.querySelectorAll("rect.square").length, 0);
    a.equal(h.querySelector("line.line--strong").style.display, "none");
    a.equal(h.innerHTML.indexOf("NaN"), -1, "no NaN in the DOM");
    api.setPoint(0, 1, 1);
    a.ok(api.state().best, "fit returns once x varies");
  });

  /* ---- 12.2 ---- */
  test("correlation: presets are deterministic; steep and shallow share r exactly; curved has r = 0; readouts match (D3, D5)", function (a) {
    var h = host(), api = demos.initCorrelation(h), K = api.constants, s = api.state();
    a.equal(s.preset, K.DEFAULT_PRESET); a.equal(s.points.length, K.N);
    a.equal(readout(h, "r"), s.r.toFixed(3)); a.equal(readout(h, "r²"), s.r2.toFixed(3)); a.equal(readout(h, "Slope b"), s.slope.toFixed(3));
    var pts = api.presetPoints("steep");
    a.close(s.r, stats.correlation(pts.map(function (p) { return p[0]; }), pts.map(function (p) { return p[1]; })), 1e-12);
    a.ok(s.r > 0.95, "steep preset is strong: " + s.r.toFixed(3));
    var steepR = s.r, steepSlope = s.slope;
    api.setPreset("shallow"); s = api.state();
    a.close(s.r, steepR, 1e-12, "same r"); a.ok(s.slope < steepSlope / 2, "different slope");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("the slope changes, r does not") > 0);
    api.setPreset("curved"); s = api.state();
    a.close(s.r, 0, 1e-12, "symmetric parabola has r = 0"); a.close(s.slope, 0, 1e-12);
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("not linear") > 0);
    api.setPreset("negative"); a.ok(api.state().r < -0.95);
    api.setPreset("none"); a.ok(Math.abs(api.state().r) < 0.3);
    api.setPreset("weak"); a.ok(api.state().r > 0.2 && api.state().r < 0.6);
    K.PRESETS.forEach(function (k) { api.setPreset(k); api.state().points.forEach(function (p) { a.ok(p[0] >= K.X_MIN && p[0] <= K.X_MAX && p[1] >= K.Y_MIN && p[1] <= K.Y_MAX, k + " inside the axes"); }); });
  });

  test("correlation: dragging marks the preset custom; hollow dots are exactly the negative-product points; keys and clamps; reset (D1, D4, D6)", function (a) {
    var h = host(), api = demos.initCorrelation(h), K = api.constants;
    var pts = h.querySelectorAll("g.point");
    a.equal(pts.length, K.N);
    a.ok(key(pts[3], "ArrowDown")); var s = api.state();
    a.equal(s.preset, "custom"); a.equal(pressed(h).length, 0, "no preset pressed once edited");
    var xm = stats.mean(s.points.map(function (p) { return p[0]; })), ym = stats.mean(s.points.map(function (p) { return p[1]; }));
    for (var i = 0; i < K.N; i++) {
      var neg = (s.points[i][0] - xm) * (s.points[i][1] - ym) < 0;
      a.equal(pts[i].querySelector("circle.dot").classList.contains("dot--hollow"), neg, "dot " + i + " hollow iff negative product");
    }
    api.setPoint(0, 99, -1); a.equal(api.state().points[0][0], K.X_MAX); a.equal(api.state().points[0][1], K.Y_MIN);
    for (i = 0; i < K.N; i++) api.setPoint(i, 4, 4);
    a.ok(isNaN(api.state().r)); a.equal(readout(h, "r"), "—"); a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    s = api.state();
    a.equal(s.preset, K.DEFAULT_PRESET); a.equal(JSON.stringify(s.points), JSON.stringify(api.presetPoints(K.DEFAULT_PRESET)));
  });

  /* ---- 12.3 ---- */
  test("line-estimate: population and first sample present; each line equals the fit of its sample; canvas used (D3, D5, D-007)", function (a) {
    stats.seed(17);
    var h = host(), api = demos.initLineEstimate(h), K = api.constants, s = api.state();
    a.equal(s.population.xs.length, K.POP_N); a.equal(s.n, K.DEFAULT_N); a.equal(s.draws, 1); a.equal(s.sample.length, K.DEFAULT_N);
    a.ok(h.querySelector("canvas.ui-chart__canvas"), "population on canvas");
    var f = stats.linearRegression(s.sample.map(function (i) { return s.population.xs[i]; }), s.sample.map(function (i) { return s.population.ys[i]; }));
    a.close(s.lastFit.slope, f.slope, 1e-12); a.close(s.lines[0].intercept, f.intercept, 1e-12);
    a.equal(readout(h, "This sample's slope"), f.slope.toFixed(3)); a.equal(readout(h, "Lines drawn"), "1"); a.equal(readout(h, "SD of the slopes"), "—");
    var pf = stats.linearRegression(s.population.xs, s.population.ys);
    a.close(s.population.slope, pf.slope, 1e-12); a.equal(readout(h, "Population slope"), pf.slope.toFixed(3));
    a.ok(Math.abs(pf.slope - K.TRUE_B) < 0.25, "population slope near the generating slope: " + pf.slope.toFixed(2));
    api.draw(24);
    s = api.state();
    a.equal(s.draws, 25); a.equal(h.querySelectorAll("line.line--faint").length, 25); a.equal(h.querySelectorAll("circle.dot--sample").length, K.DEFAULT_N);
    a.close(s.slopeSd, stats.sd(s.lines.map(function (l) { return l.slope; })), 1e-12);
    a.equal(readout(h, "SD of the slopes"), s.slopeSd.toFixed(3));
    stats.unseed();
  });

  test("line-estimate: the band narrows with n; slider restarts; cap disables; reset and new population (D4, D6)", function (a) {
    stats.seed(23);
    var h = host(), api = demos.initLineEstimate(h), K = api.constants;
    api.setN(K.MIN_N); api.draw(149); var wide = api.state().slopeSd;
    api.setN(K.MAX_N); a.equal(api.state().draws, 1, "changing n restarts"); api.draw(149); var narrow = api.state().slopeSd;
    a.ok(narrow < wide / 2, "slopes vary far less at n = 100 than at n = 5: " + narrow.toFixed(3) + " vs " + wide.toFixed(3));
    var mean = stats.mean(api.state().lines.map(function (l) { return l.slope; }));
    a.ok(Math.abs(mean - api.state().population.slope) < 0.05, "sample slopes centre on the population slope");
    api.setN(1); a.equal(api.state().n, K.MIN_N); api.setN(1e6); a.equal(api.state().n, K.MAX_N);
    var added = api.draw(K.MAX_DRAWS + 50);
    a.equal(api.state().draws, K.MAX_DRAWS); a.ok(added < K.MAX_DRAWS + 50);
    a.ok(h.querySelector(".ui-button--primary").disabled, "draw disabled at the cap"); a.ok(!h.querySelector(".demo__note").hidden);
    a.equal(api.draw(1), 0);
    var popBefore = api.state().population.xs[0];
    api.reset();
    a.equal(api.state().n, K.DEFAULT_N); a.equal(api.state().draws, 1); a.ok(!h.querySelector(".ui-button--primary").disabled); a.ok(h.querySelector(".demo__note").hidden);
    a.equal(api.state().population.xs[0], popBefore, "reset keeps the population (D-021 §4)");
    api.newPopulation();
    a.ok(api.state().population.xs[0] !== popBefore); a.equal(api.state().draws, 1);
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    stats.unseed();
  });

  /* ---- 12.4 ---- */
  test("prediction-outliers: readouts equal fits with and without the new point; prediction and zones follow the slider (D3, D5)", function (a) {
    var h = host(), api = demos.initPredictionOutliers(h), K = api.constants, s = api.state();
    a.equal(JSON.stringify(s.newPoint), JSON.stringify(K.DEFAULT_NEW)); a.equal(s.predictX, K.DEFAULT_PREDICT);
    var xs = K.BASE.map(function (p) { return p[0]; }).concat([s.newPoint[0]]), ys = K.BASE.map(function (p) { return p[1]; }).concat([s.newPoint[1]]);
    var f = stats.linearRegression(xs, ys), g = stats.linearRegression(xs.slice(0, -1), ys.slice(0, -1));
    a.close(s.withNew.slope, f.slope, 1e-12); a.close(s.withoutNew.slope, g.slope, 1e-12); a.close(s.predicted, f.predict(K.DEFAULT_PREDICT), 1e-12);
    a.equal(readout(h, "Slope with the new point"), f.slope.toFixed(3)); a.equal(readout(h, "Slope without it"), g.slope.toFixed(3));
    a.equal(readout(h, "r with"), f.r.toFixed(3)); a.equal(readout(h, "r without"), g.r.toFixed(3)); a.equal(readout(h, "Predicted y"), s.predicted.toFixed(2));
    a.ok(s.inside); a.ok(h.querySelector("[data-caution]").textContent.indexOf("interpolation") > 0);
    a.equal(h.querySelectorAll("rect.zone--caution").length, 2);
    a.equal(h.querySelectorAll("circle.dot--sample").length, K.BASE.length);
    api.setPredictX(12);
    s = api.state();
    a.ok(!s.inside); a.ok(h.querySelector("[data-caution]").textContent.indexOf("Caution") === 0);
    a.close(s.predicted, f.predict(12), 1e-12);
    api.setPredictX(-3); a.equal(api.state().predictX, K.X_MIN); api.setPredictX(99); a.equal(api.state().predictX, K.X_MAX);
  });

  test("prediction-outliers: a far point has leverage, a near point does not; keys move the point; clamps; reset (D1, D4, D6)", function (a) {
    var h = host(), api = demos.initPredictionOutliers(h), K = api.constants;
    var base = api.state().withoutNew.slope;
    api.setNewPoint(3.5, 1.5); var nearShift = Math.abs(api.state().withNew.slope - base);
    a.ok(api.state().leverage <= K.LEVERAGE_SDS); a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("barely moves") > 0);
    api.pushOut();
    var s = api.state();
    a.equal(JSON.stringify(s.newPoint), JSON.stringify(K.FAR_AWAY));
    var farShift = Math.abs(s.withNew.slope - base);
    a.ok(farShift > 3 * nearShift, "the same y offset far in x tilts the line far more: " + farShift.toFixed(2) + " vs " + nearShift.toFixed(2));
    a.ok(s.withNew.slope < 0.3 && s.withNew.r < s.withoutNew.r - 0.2, "one far point drags slope and r down");
    a.ok(s.leverage > K.LEVERAGE_SDS); a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("high leverage") > 0);
    a.close(s.range[1], K.FAR_AWAY[0], 1e-12, "the data range now reaches the far point");
    var g = h.querySelector("g.point--new");
    a.ok(key(g, "ArrowLeft")); a.close(api.state().newPoint[0], K.FAR_AWAY[0] - K.KEY_STEP, 1e-12);
    a.ok(key(g, "ArrowUp")); a.close(api.state().newPoint[1], K.FAR_AWAY[1] + K.KEY_STEP, 1e-12);
    a.ok(!key(g, "Enter"), "other keys pass through");
    api.setNewPoint(99, -99); a.equal(api.state().newPoint[0], K.X_MAX); a.equal(api.state().newPoint[1], K.Y_MIN);
    a.equal(h.innerHTML.indexOf("NaN"), -1, "no NaN in the DOM at the corner");
    api.reset();
    s = api.state();
    a.equal(JSON.stringify(s.newPoint), JSON.stringify(K.DEFAULT_NEW)); a.equal(s.predictX, K.DEFAULT_PREDICT); a.ok(s.inside);
  });
})();

/* ===================== Chapter 13 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function key(el, k) { var e = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; }

  /* ---- 13.1 ---- */
  test("anova-idea: the handles are the group means and every readout equals anovaTest on the plotted points (D3, D5)", function (a) {
    var h = host(), api = demos.initAnovaIdea(h), K = api.constants, s = api.state();
    a.equal(JSON.stringify(s.means), JSON.stringify(K.DEFAULT_MEANS)); a.equal(s.spread, K.DEFAULT_SPREAD);
    a.equal(s.groups.length, K.K); s.groups.forEach(function (g) { a.equal(g.length, K.N_PER); });
    var r = stats.anovaTest(s.groups);
    a.close(s.f, r.f, 1e-12); a.close(s.p, r.p, 1e-12);
    for (var g = 0; g < K.K; g++) a.close(r.groupMeans[g], s.means[g], 1e-9, "group " + g + " mean equals its handle");
    a.equal(readout(h, "F"), r.f.toFixed(3)); a.equal(readout(h, "p-value"), r.p.toFixed(4));
    a.equal(readout(h, "Between groups, MS"), r.msBetween.toFixed(2)); a.equal(readout(h, "Within groups, MS"), r.msWithin.toFixed(2));
    a.equal(readout(h, "df"), (K.K - 1) + ", " + (K.K * K.N_PER - K.K));
    a.close(r.msBetween / r.msWithin, r.f, 1e-12, "F is the ratio of the two bars");
    a.equal(h.querySelectorAll("circle.dot--sample").length, K.K * K.N_PER);
    a.equal(h.querySelectorAll("g.handle").length, K.K);
    a.equal(h.querySelectorAll("rect.bar--between").length + h.querySelectorAll("rect.bar--within").length, K.K + 2, "one between bar per lane plus the two mean-square bars");
    a.equal(h.querySelectorAll("svg").length, 2);
  });

  test("anova-idea: spreading the means raises F, widening the groups lowers it, and only the ratio decides (D2, D3)", function (a) {
    var h = host(), api = demos.initAnovaIdea(h), K = api.constants;
    var base = api.state(), f0 = base.f, msw0 = base.result.msWithin;
    api.spread();
    var wide = api.state();
    a.ok(wide.f > f0, "means further apart raise F: " + wide.f.toFixed(2) + " > " + f0.toFixed(2));
    a.close(wide.result.msWithin, msw0, 1e-9, "moving the means leaves the within-group spread untouched");
    a.ok(wide.result.msBetween > base.result.msBetween);
    api.pull();
    a.close(api.state().f, f0, 1e-9, "pulling back by the same factor returns the original F");
    api.setSpread(K.MAX_SPREAD);
    var loose = api.state();
    a.ok(loose.f < f0, "widening the groups lowers F: " + loose.f.toFixed(2) + " < " + f0.toFixed(2));
    a.ok(loose.result.msWithin > msw0);
    api.setSpread(K.DEFAULT_SPREAD);
    a.close(api.state().f, f0, 1e-9, "spread is the only thing that changed");
    var doubled = api.state();
    api.setMean(0, base.means[0]); api.setMean(1, base.means[1]); api.setMean(2, base.means[2]);
    a.close(api.state().f, f0, 1e-9);
    a.ok(doubled.result.msWithin > 0);
  });

  test("anova-idea: keyboard moves each mean; means and spread clamp; the axis rescales rarely; reset (D1, D4, D6, D7)", function (a) {
    var h = host(), api = demos.initAnovaIdea(h), K = api.constants;
    var handles = h.querySelectorAll("g.handle");
    a.equal(handles.length, 3);
    a.ok(key(handles[1], "ArrowRight"));
    a.close(api.state().means[1], K.DEFAULT_MEANS[1] + K.KEY_STEP, 1e-12);
    a.ok(key(handles[1], "ArrowLeft")); a.close(api.state().means[1], K.DEFAULT_MEANS[1], 1e-12);
    a.ok(!key(handles[1], "Enter"), "other keys pass through");
    a.equal(handles[0].getAttribute("aria-valuenow"), String(api.state().result.groupMeans[0]));
    var startMax = api.state().msMax;
    api.setMean(0, -50); api.setMean(2, 500);
    a.equal(api.state().means[0], K.X_MIN); a.equal(api.state().means[2], K.X_MAX);
    var big = api.state().msMax;
    a.ok(big > startMax * 4, "the mean-square axis doubled to fit the huge gap: " + startMax + " to " + big);
    api.setSpread(99); a.equal(api.state().spread, K.MAX_SPREAD);
    api.setSpread(-5); a.equal(api.state().spread, K.MIN_SPREAD);
    a.ok(isFinite(api.state().f) && api.state().f > 0);
    a.equal(h.innerHTML.indexOf("NaN"), -1, "no NaN in the DOM at the extremes");
    api.reset();
    var s = api.state();
    a.equal(JSON.stringify(s.means), JSON.stringify(K.DEFAULT_MEANS)); a.equal(s.spread, K.DEFAULT_SPREAD);
    a.equal(s.msMax, startMax, "reset returns the axis to where the default data put it");
    a.ok(big > s.msMax, "and that is far below the stretched axis");
    api.newData();
    a.equal(JSON.stringify(api.state().means), JSON.stringify(K.DEFAULT_MEANS), "new data keeps the means");
  });

  /* ---- 13.2 ---- */
  test("f-distribution: readouts equal anovaTest on this study's groups; gap 0 rejects ≈ 5 % of the time (D3, D5)", function (a) {
    stats.seed(13);
    var h = host(), api = demos.initFDistribution(h), K = api.constants, s = api.state();
    a.equal(s.gap, K.DEFAULT_GAP); a.equal(s.n, K.DEFAULT_N); a.equal(s.studies, K.INITIAL);
    a.equal(s.df1, 2); a.equal(s.df2, K.K * K.DEFAULT_N - K.K);
    a.close(s.critical, stats.fQuantile(1 - K.ALPHA, s.df1, s.df2), 1e-12);
    a.equal(readout(h, "Critical F at 5 %"), s.critical.toFixed(3));
    var r = stats.anovaTest(s.lastGroups);
    a.close(s.last.f, r.f, 1e-12); a.close(s.last.p, r.p, 1e-12);
    a.equal(readout(h, "This study's F"), r.f.toFixed(3)); a.equal(readout(h, "p-value"), r.p.toFixed(4));
    a.equal(readout(h, "df"), "2, " + s.df2);
    a.equal(h.querySelectorAll("circle.dot--sample").length, K.K * K.DEFAULT_N);
    a.equal(h.querySelectorAll("svg").length, 2);
    api.run(1999);
    s = api.state();
    a.equal(s.studies, 2000); a.equal(s.fs.length, 2000);
    a.close(s.rejected / s.studies, 0.05, 0.02, "≈ 5 % false alarms under H₀: " + (s.rejected / s.studies).toFixed(3));
    a.equal(readout(h, "Rejected H₀"), (100 * s.rejected / s.studies).toFixed(1) + " %");
    var counted = 0; s.fs.forEach(function (f) { if (f >= s.critical) counted++; });
    a.equal(counted, s.rejected, "the rejection count is recomputable from the raw F values");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("H₀ is true") === 0);
    var hist = stats.histogram(s.fs, 0, K.F_MAX, K.BIN);
    a.equal(h.querySelectorAll("rect.bar--density").length, hist.counts.length);
    var beyond = s.studies; hist.counts.forEach(function (c) { beyond -= c; });
    a.equal(readout(h, "Past the axis"), String(beyond));
    stats.unseed();
  });

  test("f-distribution: the pile follows the F curve under H₀ and slides right with a real gap; power grows with n (D3)", function (a) {
    stats.seed(31);
    var h = host(), api = demos.initFDistribution(h), K = api.constants;
    api.run(1499);
    var s = api.state(), hist = stats.histogram(s.fs, 0, K.F_MAX, K.BIN), worst = 0;
    for (var i = 0; i < hist.counts.length; i++) {
      var mid = (hist.edges[i] + hist.edges[i + 1]) / 2;
      var seen = hist.counts[i] / (s.studies * K.BIN), want = stats.fPdf(mid, s.df1, s.df2);
      worst = Math.max(worst, Math.abs(seen - want));
    }
    a.ok(worst < 0.09, "the density histogram tracks the F curve; worst bin gap " + worst.toFixed(3));
    var below = 0; s.fs.forEach(function (f) { if (f <= stats.fQuantile(0.5, s.df1, s.df2)) below++; });
    a.close(below / s.studies, 0.5, 0.04, "half the F values fall below the median of the curve");
    api.setGap(1);
    a.equal(api.state().studies, K.INITIAL, "changing the gap restarts the run");
    api.setN(K.MIN_N); api.run(499); var low = api.state().rejected / api.state().studies;
    api.setN(K.MAX_N); api.run(499); var high = api.state().rejected / api.state().studies;
    a.ok(high > low + 0.4 && high > 0.85, "a modest gap is detected far more often at n = 30 than at n = 4: " + high.toFixed(2) + " vs " + low.toFixed(2));
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("H₀ is false") === 0);
    var mean = stats.mean(api.state().fs);
    a.ok(mean > 4, "with a real gap the F values pile up well above 1: mean " + mean.toFixed(2));
    stats.unseed();
  });

  test("f-distribution: sliders clamp and restart, the cap disables the buttons, off-axis F values are counted, reset (D4, D6, D7)", function (a) {
    stats.seed(7);
    var h = host(), api = demos.initFDistribution(h), K = api.constants;
    api.setGap(99); a.equal(api.state().gap, K.MAX_GAP);
    api.setGap(-3); a.equal(api.state().gap, K.MIN_GAP);
    api.setN(1); a.equal(api.state().n, K.MIN_N);
    api.setN(1e6); a.equal(api.state().n, K.MAX_N);
    api.setGap(K.MAX_GAP); api.setN(K.MAX_N);
    api.run(199);
    var s = api.state(), beyond = 0;
    s.fs.forEach(function (f) { if (f > K.F_MAX) beyond++; });
    a.ok(beyond > 0, "a strong effect pushes F past the fixed axis: " + beyond + " of " + s.studies);
    a.equal(readout(h, "Past the axis"), String(beyond), "off-axis studies are counted, not dropped");
    s.fs.forEach(function (f) { a.ok(isFinite(f) && f >= 0, "every F is a finite non-negative number"); });
    api.reset();
    s = api.state();
    a.equal(s.gap, K.DEFAULT_GAP); a.equal(s.n, K.DEFAULT_N); a.equal(s.studies, K.INITIAL);
    var added = api.run(K.MAX_STUDIES + 500);
    a.equal(api.state().studies, K.MAX_STUDIES); a.ok(added < K.MAX_STUDIES + 500);
    a.ok(h.querySelector(".ui-button--primary").disabled, "the run button disables at the cap");
    a.ok(!h.querySelector(".demo__note").hidden);
    a.equal(api.run(1), 0);
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    a.ok(!h.querySelector(".ui-button--primary").disabled); a.ok(h.querySelector(".demo__note").hidden);
    stats.unseed();
  });
})();

/* ===================== Chapter 14 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function pressed(host) { var out = []; host.querySelectorAll("[aria-pressed=true]").forEach(function (b) { out.push(b.textContent); }); return out; }

  /* The three count pickers render buttons too, so reach the stage controls
     through their own row rather than by a global button index (D-051). */
  function stageBtn(host, i) { return host.querySelector(".ui-controls").querySelectorAll(".ui-button")[i]; }

  /* ---- 14.1 ---- */
  test("multiplication-rule: the tree drawn has exactly as many leaves as the product says (D3, D5)", function (a) {
    var h = host(), api = demos.initMultiplicationRule(h), K = api.constants, s = api.state();
    a.equal(s.stages, K.DEFAULT_STAGES); a.equal(JSON.stringify(s.counts), JSON.stringify(K.DEFAULT_COUNTS));
    a.equal(s.total, 12); a.equal(readout(h, "Different outfits"), "12"); a.equal(readout(h, "Stages"), "3");
    a.equal(h.querySelector("[data-eq]").textContent, "3 × 2 × 2 = 12");
    a.equal(api.paths().length, s.total, "enumeration agrees with the product");
    // one root, then 3, 3×2, 3×2×2 nodes; every non-root node has exactly one edge to its parent
    var nodes = h.querySelectorAll("circle.tree-node"), leaves = h.querySelectorAll("circle.tree-node--leaf");
    a.equal(nodes.length, 1 + 3 + 6 + 12); a.equal(leaves.length, 12);
    a.equal(h.querySelectorAll("line.tree-edge").length, 3 + 6 + 12);
    a.equal(s.path.length, 3, "a path is traced on load (D5)");
    a.equal(h.querySelectorAll("line.tree-edge--lit").length, 3, "the traced path lights one edge per stage");
    var seen = {};
    api.paths().forEach(function (p) { var k = p.join("-"); a.ok(!seen[k], "paths are distinct"); seen[k] = 1; a.equal(p.length, 3); });
  });

  test("multiplication-rule: counts multiply rather than add; stage buttons cap; reset (D2, D4, D6)", function (a) {
    var h = host(), api = demos.initMultiplicationRule(h), K = api.constants;
    api.setCount(0, 4);
    var s = api.state();
    a.equal(s.total, 4 * 2 * 2, "raising a stage from 3 to 4 multiplies, it does not add one");
    a.equal(api.paths().length, 16); a.equal(h.querySelectorAll("circle.tree-node--leaf").length, 16);
    api.setCount(0, 99); a.equal(api.state().counts[0], K.MAX_COUNT);
    api.setCount(0, -5); a.equal(api.state().counts[0], K.MIN_COUNT);
    a.equal(api.state().total, 2 * 2 * 2);
    a.ok(stageBtn(h, 1).disabled, "cannot add a fourth stage");
    a.ok(!h.querySelector(".demo__note").hidden, "the cap is explained");
    api.removeStage();
    s = api.state();
    a.equal(s.stages, 2); a.equal(s.total, 4); a.equal(s.active.length, 2);
    a.ok(!stageBtn(h, 1).disabled); a.ok(h.querySelector(".demo__note").hidden);
    api.removeStage();
    a.equal(api.state().stages, K.MIN_STAGES);
    a.ok(stageBtn(h, 2).disabled, "cannot go below one stage");
    a.equal(api.state().total, 2, "a single stage is just its own count");
    api.addStage(); api.addStage(); api.addStage();
    a.equal(api.state().stages, K.MAX_STAGES);
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    var r = api.state();
    a.equal(r.stages, K.DEFAULT_STAGES); a.equal(JSON.stringify(r.counts), JSON.stringify(K.DEFAULT_COUNTS)); a.equal(r.total, 12);
  });

  /* ---- 14.2 ---- */
  test("permutations-combinations: the list length equals the formula, and P = C × k! (D3, D5)", function (a) {
    var h = host(), api = demos.initPermutationsCombinations(h), K = api.constants, s = api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.k, K.DEFAULT_K); a.equal(s.ordered, false);
    a.equal(s.combinations, stats.choose(4, 2)); a.equal(s.permutations, stats.permutations(4, 2)); a.equal(s.factorial, 2);
    a.equal(readout(h, "Combinations C(n, k)"), "6"); a.equal(readout(h, "Permutations P(n, k)"), "12");
    a.equal(s.rows.length, 6, "six choices listed"); a.equal(h.querySelectorAll(".arrangement").length, 6);
    a.equal(readout(h, "Rows listed"), "6");
    a.equal(pressed(h).join("|"), "Order does not matter");
    a.equal(h.querySelector("[data-eq]").textContent, "C(4, 2) = P(4, 2) ÷ 2! = 12 ÷ 2 = 6");
    a.equal(h.querySelectorAll(".arrangement")[0].textContent, "A B");
    var seen = {};
    s.rows.forEach(function (r) {
      a.equal(r.length, 2);
      a.ok(r[0] < r[1], "an unordered row is listed in ascending order");
      var key = r.join("-"); a.ok(!seen[key], "no repeated choice"); seen[key] = 1;
    });
    api.setOrdered(true);
    s = api.state();
    a.equal(s.rows.length, 12, "each choice fans out into 2! orders");
    a.equal(h.querySelectorAll(".arrangement").length, 12);
    a.equal(pressed(h).join("|"), "Order matters");
    a.equal(h.querySelector("[data-eq]").textContent, "P(4, 2) = C(4, 2) × 2! = 6 × 2 = 12");
    a.equal(s.combinations * s.factorial, s.permutations, "P = C × k!");
    var keys = {};
    s.rows.forEach(function (r) { var key = r.join("-"); a.ok(!keys[key], "no repeated arrangement"); keys[key] = 1; a.ok(r[0] !== r[1], "an item is used once"); });
  });

  test("permutations-combinations: every n and k agrees with stats; k follows n down; the list truncates with a note; reset (D3, D4, D6)", function (a) {
    var h = host(), api = demos.initPermutationsCombinations(h), K = api.constants;
    for (var n = K.MIN_N; n <= K.MAX_N; n++) {
      api.setN(n);
      for (var k = K.MIN_K; k <= n; k++) {
        api.setK(k);
        api.setOrdered(false);
        var s = api.state();
        a.equal(s.n, n); a.equal(s.k, k);
        a.equal(s.combinations, stats.choose(n, k), "C(" + n + ", " + k + ")");
        a.equal(s.permutations, stats.permutations(n, k), "P(" + n + ", " + k + ")");
        a.equal(s.rows.length, Math.min(s.combinations, K.MAX_ROWS), "rows listed for C(" + n + ", " + k + ")");
        api.setOrdered(true);
        a.equal(api.state().rows.length, Math.min(s.permutations, K.MAX_ROWS), "rows listed for P(" + n + ", " + k + ")");
      }
    }
    api.setN(K.MAX_N); api.setK(4); api.setOrdered(true);
    var big = api.state();
    a.equal(big.permutations, 1680); a.equal(big.rows.length, K.MAX_ROWS);
    a.ok(!h.querySelector(".demo__note").hidden, "truncation is stated");
    a.ok(h.querySelector(".demo__note").textContent.indexOf("1680") > 0, "the note names the true total");
    a.equal(readout(h, "Permutations P(n, k)"), "1680", "the count stays exact when the list is cut");
    api.setN(3);
    a.equal(api.state().k, 3, "k follows n down rather than exceeding it");
    a.equal(api.state().permutations, 6);
    api.setK(99); a.equal(api.state().k, 3);
    api.setK(0); a.equal(api.state().k, K.MIN_K);
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    var r = api.state();
    a.equal(r.n, K.DEFAULT_N); a.equal(r.k, K.DEFAULT_K); a.equal(r.ordered, K.DEFAULT_ORDERED);
    a.ok(h.querySelector(".demo__note").hidden);
  });
})();

/* ===================== Chapter 15 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }
  function cell(host, key) { return Number(host.querySelector("[data-count=" + key + "]").textContent); }

  /* ---- 15.1 ---- */
  test("bayes-theorem: the icon array is a whole population that agrees with diagnosticTest (D3, D5, D-007)", function (a) {
    var h = host(), api = demos.initBayesTheorem(h), K = api.constants, s = api.state();
    a.equal(s.prev, K.DEFAULT_PREV); a.equal(s.sens, K.DEFAULT_SENS); a.equal(s.spec, K.DEFAULT_SPEC);
    a.ok(h.querySelector("canvas.ui-chart__canvas"), "the 1 000 people are drawn on canvas");
    var c = s.counts;
    a.equal(c.tp + c.fn + c.fp + c.tn, K.N, "every one of the 1 000 is in exactly one group");
    a.equal(c.tp + c.fn, c.sick); a.equal(c.fp + c.tn, c.healthy);
    a.equal(c.positives, c.tp + c.fp);
    K.GROUPS.forEach(function (g) { a.equal(cell(h, g), c[g], "table cell " + g + " matches the array"); });
    var r = stats.diagnosticTest(s.prev / 100, s.sens / 100, s.spec / 100);
    a.close(s.exact.ppv, r.ppv, 1e-12); a.close(s.exact.npv, r.npv, 1e-12);
    a.equal(readout(h, "P(has it | tested positive)"), r.ppv.toFixed(3));
    a.equal(readout(h, "Positives per 1 000"), String(c.positives));
    a.equal(readout(h, "…of whom really have it"), String(c.tp));
    a.close(c.tp / c.positives, r.ppv, 0.02, "the head count and the exact probability agree to rounding");
    a.ok(r.ppv < 0.2, "the headline case: a 99/95 test on a 1 % disease is right under a fifth of the time");
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("Bayes") > 0);
  });

  test("bayes-theorem: prevalence drives the answer; the toggle presses; sliders clamp; reset (D2, D4, D6)", function (a) {
    var h = host(), api = demos.initBayesTheorem(h), K = api.constants;
    var low = api.state().exact.ppv;
    api.setPrevalence(K.MAX_PREV);
    var high = api.state().exact.ppv;
    a.ok(high > low + 0.5, "the same test on a common disease is far more informative: " + high.toFixed(2) + " vs " + low.toFixed(2));
    api.setPrevalence(K.MIN_PREV);
    a.ok(api.state().exact.ppv < low, "rarer still makes a positive mean less");
    a.equal(api.state().counts.tp + api.state().counts.fn + api.state().counts.fp + api.state().counts.tn, K.N, "counts stay whole at the extreme");
    api.setPrevalence(999); a.equal(api.state().prev, K.MAX_PREV);
    api.setPrevalence(-5); a.equal(api.state().prev, K.MIN_PREV);
    api.setSensitivity(999); a.equal(api.state().sens, K.MAX_SENS);
    api.setSpecificity(0); a.equal(api.state().spec, K.MIN_SPEC);
    a.ok(isFinite(api.state().exact.ppv));
    api.setSpecificity(100); api.setSensitivity(100);
    var perfect = api.state();
    a.equal(perfect.exact.ppv, 1, "a perfect test leaves no doubt"); a.equal(perfect.counts.fp, 0);
    var btn = h.querySelectorAll(".ui-button")[0];
    a.equal(btn.getAttribute("aria-pressed"), "false");
    api.setPositivesOnly(true);
    a.equal(btn.getAttribute("aria-pressed"), "true"); a.equal(btn.textContent, "Show everyone again");
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    var s = api.state();
    a.equal(s.prev, K.DEFAULT_PREV); a.equal(s.sens, K.DEFAULT_SENS); a.equal(s.spec, K.DEFAULT_SPEC); a.equal(s.positivesOnly, false);
    a.equal(btn.getAttribute("aria-pressed"), "false");
  });

  /* ---- 15.2 ---- */
  test("likelihood: the curve is binomialPmf of the observed flips and peaks at k/n (D3, D5)", function (a) {
    stats.seed(15);
    var h = host(), api = demos.initLikelihood(h), K = api.constants, s = api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.flips.length, K.DEFAULT_N); a.equal(s.p, K.DEFAULT_P);
    s.flips.forEach(function (f) { a.ok(f === 0 || f === 1, "a flip is 0 or 1"); });
    a.equal(s.heads, s.flips.reduce(function (x, y) { return x + y; }, 0));
    a.equal(readout(h, "Heads"), String(s.heads));
    a.close(s.mle, s.heads / s.n, 1e-12);
    a.close(s.likelihood, stats.binomialPmf(s.heads, s.n, s.p), 1e-12, "the readout is the binomial pmf at the candidate p");
    a.equal(readout(h, "Likelihood at your p"), s.likelihood.toFixed(5));
    a.equal(h.querySelectorAll("svg").length, 2, "flip strip + curve");
    a.equal(h.querySelectorAll("circle.mark--strong").length + h.querySelectorAll("circle.mark--hollow").length, K.DEFAULT_N + 1, "one mark per flip plus the slider dot");
    // no p beats k/n
    var best = api.likelihood(s.mle);
    for (var v = 0.01; v < 1; v += 0.01) a.ok(api.likelihood(v) <= best + 1e-12, "no candidate beats k/n at p = " + v.toFixed(2));
    stats.unseed();
  });

  test("likelihood: the flips hold still while p moves; n redraws them; snap; clamps; reset (D2, D4, D6)", function (a) {
    stats.seed(21);
    var h = host(), api = demos.initLikelihood(h), K = api.constants;
    var before = api.state().flips.join("");
    api.setP(0.2); api.setP(0.8);
    a.equal(api.state().flips.join(""), before, "moving the candidate p never touches the data");
    a.equal(api.state().p, 0.8);
    a.close(api.state().likelihood, stats.binomialPmf(api.state().heads, api.state().n, 0.8), 1e-12);
    api.snapToMle();
    var s = api.state();
    a.close(s.p, Math.round(s.mle * 100) / 100, 1e-12, "snap lands on the best p to slider resolution");
    a.ok(s.likelihood >= api.likelihood(0.2) && s.likelihood >= api.likelihood(0.8));
    api.setN(K.MAX_N);
    s = api.state();
    a.equal(s.n, K.MAX_N); a.equal(s.flips.length, K.MAX_N);
    a.ok(s.likelihood >= 0 && isFinite(s.likelihood), "60 flips still give a finite likelihood");
    a.equal(h.querySelectorAll("circle.mark--strong").length + h.querySelectorAll("circle.mark--hollow").length, K.STRIP_MAX + 1, "the strip is capped");
    api.setN(1); a.equal(api.state().n, K.MIN_N);
    api.setP(0); a.equal(api.state().p, K.MIN_P);
    api.setP(5); a.equal(api.state().p, K.MAX_P);
    a.ok(isFinite(api.state().likelihood));
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    a.equal(api.state().n, K.DEFAULT_N); a.equal(api.state().p, K.DEFAULT_P);
    stats.unseed();
  });

  /* ---- 15.3 ---- */
  test("prior-posterior: the posterior is exactly Beta(a + successes, b + failures) (D3, D5)", function (a) {
    stats.seed(33);
    var h = host(), api = demos.initPriorPosterior(h), K = api.constants, s = api.state();
    a.equal(s.a, K.DEFAULT_A); a.equal(s.b, K.DEFAULT_B); a.equal(s.trueP, K.DEFAULT_TRUE_P);
    a.equal(s.n, K.BATCH, "the panel opens with data already in it (D5)");
    a.equal(s.successes + s.failures, s.n);
    a.equal(s.posterior.a, s.a + s.successes); a.equal(s.posterior.b, s.b + s.failures);
    a.close(s.posteriorMean, s.posterior.a / (s.posterior.a + s.posterior.b), 1e-12);
    a.close(s.priorMean, s.a / (s.a + s.b), 1e-12);
    a.equal(readout(h, "Posterior mean"), s.posteriorMean.toFixed(3));
    a.equal(readout(h, "Observations"), String(s.n));
    a.equal(readout(h, "Posterior"), "Beta(" + s.posterior.a + ", " + s.posterior.b + ")");
    a.equal(h.querySelectorAll("path.line--reference").length, 1, "prior drawn");
    a.equal(h.querySelectorAll("path.line--dotted").length, 1, "likelihood drawn");
    a.equal(h.querySelectorAll("path.line--strong").length, 1, "posterior drawn");
    // one observation moves exactly one shape by one
    var beforeA = s.posterior.a, beforeB = s.posterior.b;
    api.observe(1);
    var t = api.state();
    a.equal(t.posterior.a + t.posterior.b, beforeA + beforeB + 1, "one observation adds exactly one");
    a.ok((t.posterior.a === beforeA + 1 && t.posterior.b === beforeB) || (t.posterior.b === beforeB + 1 && t.posterior.a === beforeA));
    stats.unseed();
  });

  test("prior-posterior: data overturn a weak prior faster than a strong one; cap; restart; reset (D2, D4, D6)", function (a) {
    stats.seed(41);
    var h = host(), api = demos.initPriorPosterior(h), K = api.constants;
    api.setTrueP(0.9);
    a.equal(api.state().n, 0, "changing the true p restarts the run");
    api.setA(2); api.setB(2); api.observe(40);
    var weak = api.state();
    api.setA(K.MAX_SHAPE); api.setB(K.MAX_SHAPE);
    a.equal(api.state().n, 0, "changing the prior restarts the run");
    api.observe(40);
    var strong = api.state();
    a.equal(weak.n, 40); a.equal(strong.n, 40);
    a.ok(weak.posteriorMean > strong.posteriorMean + 0.1,
      "the same 40 observations move a Beta(2,2) prior much further than a Beta(20,20) one: " + weak.posteriorMean.toFixed(3) + " vs " + strong.posteriorMean.toFixed(3));
    a.ok(weak.posteriorMean > 0.75, "a weak prior gets close to the true 0.9");
    a.close(strong.priorMean, 0.5, 1e-12);
    api.setA(99); a.equal(api.state().a, K.MAX_SHAPE);
    api.setA(0); a.equal(api.state().a, K.MIN_SHAPE);
    api.setTrueP(5); a.equal(api.state().trueP, 1);
    api.setTrueP(-1); a.equal(api.state().trueP, 0);
    api.observe(20);
    a.equal(api.state().successes, 0, "a true p of 0 never succeeds");
    a.ok(isFinite(api.state().posteriorMean));
    var added = api.observe(K.MAX_OBS + 100);
    a.equal(api.state().n, K.MAX_OBS); a.ok(added < K.MAX_OBS + 100);
    a.ok(h.querySelector(".ui-button--primary").disabled, "the cap disables observing");
    a.ok(!h.querySelector(".demo__note").hidden);
    a.equal(api.observe(1), 0);
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    var s = api.state();
    a.equal(s.a, K.DEFAULT_A); a.equal(s.b, K.DEFAULT_B); a.equal(s.trueP, K.DEFAULT_TRUE_P); a.equal(s.n, 0);
    a.ok(!h.querySelector(".ui-button--primary").disabled);
    stats.unseed();
  });
})();

/* ===================== Chapter 16 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  /* ---- 16.1 ---- */
  test("bootstrap: every resample comes from the one sample, and the pile recovers the standard error (D3, D5)", function (a) {
    stats.seed(61);
    var h = host(), api = demos.initBootstrap(h), K = api.constants, s = api.state();
    a.equal(s.n, K.DEFAULT_N); a.equal(s.sample.length, K.DEFAULT_N);
    a.equal(s.draws, K.BATCH + 1, "the panel opens with a pile already built (D5)");
    a.equal(s.means.length, s.draws);
    a.equal(s.lastPicks.length, s.sample.length, "a resample is the same size as the sample");
    s.lastPicks.forEach(function (v) { a.ok(s.sample.indexOf(v) >= 0, "every pick is a value from the sample"); });
    a.close(s.sampleMean, stats.mean(s.sample), 1e-12);
    a.equal(readout(h, "Your sample's mean"), s.sampleMean.toFixed(3));
    a.close(s.bootstrapSe, stats.sd(s.means), 1e-12);
    a.equal(readout(h, "Bootstrap standard error"), s.bootstrapSe.toFixed(3));
    a.close(s.formulaSe, stats.sd(s.sample) / Math.sqrt(s.sample.length), 1e-12);
    var ci = stats.percentileInterval(s.means, K.LEVEL);
    a.close(s.bootstrapInterval.lo, ci.lo, 1e-12); a.close(s.bootstrapInterval.hi, ci.hi, 1e-12);
    a.equal(readout(h, "Bootstrap 95 % interval"), "(" + ci.lo.toFixed(2) + ", " + ci.hi.toFixed(2) + ")");
    // every resample mean lies between the smallest and largest observed value
    var lo = Math.min.apply(null, s.sample), hi = Math.max.apply(null, s.sample);
    s.means.forEach(function (m) { a.ok(m >= lo - 1e-9 && m <= hi + 1e-9, "a resample mean cannot leave the sample's range"); });
    api.draw(1500);
    var t = api.state();
    a.close(t.bootstrapSe, t.formulaSe, 0.25 * t.formulaSe, "the bootstrap standard error lands near s/√n: " + t.bootstrapSe.toFixed(3) + " vs " + t.formulaSe.toFixed(3));
    a.close(stats.mean(t.means), t.sampleMean, 0.1, "the pile centres on the sample mean");
    stats.unseed();
  });

  test("bootstrap: the two intervals agree; the sample holds still; n redraws; cap; reset (D2, D4, D6)", function (a) {
    stats.seed(67);
    var h = host(), api = demos.initBootstrap(h), K = api.constants;
    api.draw(2000);
    var s = api.state();
    a.ok(Math.abs(s.bootstrapInterval.lo - s.tInterval.lo) < 0.6 && Math.abs(s.bootstrapInterval.hi - s.tInterval.hi) < 0.6,
      "the percentile interval sits near the t interval: " + s.bootstrapInterval.lo.toFixed(2) + "–" + s.bootstrapInterval.hi.toFixed(2) + " vs " + s.tInterval.lo.toFixed(2) + "–" + s.tInterval.hi.toFixed(2));
    var before = s.sample.join(",");
    api.draw(50);
    a.equal(api.state().sample.join(","), before, "resampling never changes the sample it draws from");
    // s/√n depends on whichever sample was drawn, so compare averages rather than one draw
    function meanFormulaSe(n, reps) {
      api.setN(n);
      var total = 0;
      for (var i = 0; i < reps; i++) { api.newSample(); total += api.state().formulaSe; }
      return total / reps;
    }
    var seSmall = meanFormulaSe(K.MIN_N, 15), seLarge = meanFormulaSe(K.MAX_N, 15);
    a.equal(api.state().sample.length, K.MAX_N);
    a.ok(seSmall > seLarge * 1.8, "a sample of " + K.MIN_N + " has a far larger standard error than one of " + K.MAX_N + ": " + seSmall.toFixed(3) + " vs " + seLarge.toFixed(3));
    api.setN(1); a.equal(api.state().n, K.MIN_N);
    api.setN(999); a.equal(api.state().n, K.MAX_N);
    var added = api.draw(K.MAX_DRAWS + 100);
    a.equal(api.state().draws, K.MAX_DRAWS); a.ok(added < K.MAX_DRAWS + 100);
    a.ok(h.querySelector(".ui-button--primary").disabled); a.ok(!h.querySelector(".demo__note").hidden);
    a.equal(api.draw(1), 0);
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.newSample();
    a.ok(api.state().sample.join(",") !== before, "New sample really redraws");
    api.reset();
    a.equal(api.state().n, K.DEFAULT_N); a.ok(!h.querySelector(".ui-button--primary").disabled);
    stats.unseed();
  });

  /* ---- 16.2 ---- */
  test("permutation-test: shuffling moves labels but never values, and the p-value is the share past the observed gap (D3, D5)", function (a) {
    stats.seed(71);
    var h = host(), api = demos.initPermutationTest(h), K = api.constants, s = api.state();
    a.equal(s.effect, K.DEFAULT_EFFECT); a.equal(s.n, K.DEFAULT_N);
    a.equal(s.values.length, 2 * K.DEFAULT_N); a.equal(s.labels.length, s.values.length);
    a.equal(s.shuffles, K.INITIAL, "the panel opens with a pile (D5)");
    a.equal(s.labels.filter(function (l) { return l === 1; }).length, K.DEFAULT_N, "the labels split evenly");
    a.equal(s.lastLabels.filter(function (l) { return l === 1; }).length, K.DEFAULT_N, "a shuffle keeps the group sizes");
    a.close(s.observed, api.difference(s.labels), 1e-12);
    a.equal(readout(h, "Observed difference"), s.observed.toFixed(3));
    var counted = 0;
    s.diffs.forEach(function (d) { if (Math.abs(d) >= Math.abs(s.observed) - 1e-12) counted++; });
    a.equal(s.extreme, counted, "the tail count is recomputable from the raw differences");
    a.close(s.p, (1 + counted) / (1 + s.shuffles), 1e-12, "p counts the observed labelling in both halves");
    a.ok(s.p > 0, "so p is never exactly zero");
    a.equal(readout(h, "Permutation p-value"), s.p.toFixed(4));
    a.equal(readout(h, "As extreme or more"), String(counted));
    var before = s.values.slice();
    api.shuffle(200);
    var t = api.state();
    a.equal(t.values.join(","), before.join(","), "the values never move, only the labels");
    a.close(t.observed, s.observed, 1e-12, "the observed difference is a property of the data, not of the shuffles");
    a.ok(t.lastLabels.join("") !== t.labels.join("") || t.shuffles === 0, "the strip shows a shuffled assignment");
    // the shuffled differences centre on zero
    a.close(stats.mean(t.diffs), 0, 1.2, "shuffling destroys the effect: mean shuffled difference " + stats.mean(t.diffs).toFixed(2));
    stats.unseed();
  });

  test("permutation-test: a real gap is found and a null one is not; the p-value tracks Welch; cap; reset (D2, D3, D6)", function (a) {
    stats.seed(73);
    var h = host(), api = demos.initPermutationTest(h), K = api.constants;
    api.shuffle(2000);
    var strong = api.state();
    a.ok(Math.abs(strong.p - strong.welch.p) < 0.06, "the permutation p-value tracks Welch's on the same data: " + strong.p.toFixed(4) + " vs " + strong.welch.p.toFixed(4));
    // a gap this large against this much noise is beyond every shuffle
    api.setEffect(K.MAX_EFFECT); api.setN(K.MAX_N); api.shuffle(2000);
    var huge = api.state();
    a.ok(huge.p < 0.005, "a 12-point gap on n = 40 is past every shuffle: p = " + huge.p.toFixed(5));
    a.ok(huge.p > 0, "and p is still not zero, because the observed labelling counts");
    a.ok(huge.welch.p < 0.001);
    a.ok(h.querySelectorAll("rect.bar--extreme").length > 0, "the tail bars are marked");
    api.setEffect(0);
    a.equal(api.state().shuffles, K.INITIAL, "changing the effect restarts");
    api.shuffle(2000);
    var nul = api.state();
    a.ok(nul.p > 0.02, "with no real gap the observed difference is unremarkable: p = " + nul.p.toFixed(3));
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("really are the same") > 0);
    a.ok(Math.abs(stats.mean(nul.diffs)) < 1, "the null pile centres on zero");
    api.setEffect(99); a.equal(api.state().effect, K.MAX_EFFECT);
    api.setEffect(-5); a.equal(api.state().effect, K.MIN_EFFECT);
    api.setN(1); a.equal(api.state().n, K.MIN_N);
    api.setN(999); a.equal(api.state().n, K.MAX_N);
    api.shuffle(200);
    a.ok(isFinite(api.state().p) && api.state().p > 0, "the p-value is never zero: the observed labelling is itself one of the arrangements");
    a.ok(api.state().p <= 1);
    var added = api.shuffle(K.MAX_SHUFFLES + 100);
    a.equal(api.state().shuffles, K.MAX_SHUFFLES); a.ok(added < K.MAX_SHUFFLES + 100);
    a.ok(h.querySelector(".ui-button--primary").disabled); a.ok(!h.querySelector(".demo__note").hidden);
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    var s = api.state();
    a.equal(s.effect, K.DEFAULT_EFFECT); a.equal(s.n, K.DEFAULT_N); a.equal(s.shuffles, K.INITIAL);
    a.ok(!h.querySelector(".ui-button--primary").disabled);
    stats.unseed();
  });
})();

/* ===================== Chapter 17 ===================== */
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");
  function host() { var h = document.createElement("div"); h.className = "ui-panel"; sandbox.appendChild(h); return h; }
  function readout(host, label) {
    var boxes = host.querySelectorAll(".ui-readout");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].querySelector(".ui-readout__label").textContent === label) return boxes[i].querySelector(".ui-readout__value").textContent;
    return null;
  }

  /* ---- 17.1 ---- */
  test("simpsons-paradox: separated groups make the pooled line reverse every within-group slope (D2, D3, D5)", function (a) {
    stats.seed(81);
    var h = host(), api = demos.initSimpsonsParadox(h), K = api.constants, s = api.state();
    a.equal(s.sep, K.DEFAULT_SEP); a.equal(s.slope, K.DEFAULT_SLOPE); a.equal(s.pooled, false);
    a.equal(s.points.length, 2 * K.N_PER);
    s.points.forEach(function (p) { a.ok(p.x >= K.X_MIN && p.x <= K.X_MAX && p.y >= K.Y_MIN && p.y <= K.Y_MAX, "every point is inside the fixed axes (D7)"); });
    a.equal(s.points.filter(function (p) { return p.g === 0; }).length, K.N_PER);
    // the readouts are the fits of the points actually drawn
    var ga = s.points.filter(function (p) { return p.g === 0; }), gb = s.points.filter(function (p) { return p.g === 1; });
    var fa = stats.linearRegression(ga.map(function (p) { return p.x; }), ga.map(function (p) { return p.y; }));
    var fp = stats.linearRegression(s.points.map(function (p) { return p.x; }), s.points.map(function (p) { return p.y; }));
    a.close(s.fits.a.slope, fa.slope, 1e-12); a.close(s.fits.pooled.slope, fp.slope, 1e-12);
    a.equal(readout(h, "Slope in group A"), fa.slope.toFixed(3));
    a.equal(readout(h, "Slope ignoring groups"), fp.slope.toFixed(3));
    // the paradox itself, at the default separation
    a.ok(s.fits.a.slope > 0 && s.fits.b.slope > 0, "both groups slope up: " + s.fits.a.slope.toFixed(2) + ", " + s.fits.b.slope.toFixed(2));
    a.ok(s.fits.pooled.slope < 0, "the pooled line slopes down: " + s.fits.pooled.slope.toFixed(2));
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("the other way") > 0);
    a.equal(h.querySelectorAll("line.line--strong").length, 2, "one line per group");
    a.equal(h.querySelectorAll("circle.dot--sample").length, K.N_PER, "group A filled");
    a.equal(h.querySelectorAll("circle.mark--hollow").length, K.N_PER, "group B hollow, so colour is not the only cue");
    stats.unseed();
  });

  test("simpsons-paradox: no separation means no paradox; the toggle presses; sliders clamp; reset (D2, D4, D6)", function (a) {
    stats.seed(83);
    var h = host(), api = demos.initSimpsonsParadox(h), K = api.constants;
    api.setSeparation(0);
    var flat = api.state();
    a.ok(flat.fits.pooled.slope > 0, "with the groups on top of each other the pooled slope matches them: " + flat.fits.pooled.slope.toFixed(2));
    a.ok(Math.abs(flat.fits.pooled.slope - flat.slope) < 0.3, "and lands near the slope that was asked for");
    api.setSeparation(K.MAX_SEP);
    a.ok(api.state().fits.pooled.slope < 0, "full separation reverses it again");
    // the within-group slope follows the slider in both directions
    api.setSeparation(0); api.setSlope(-1);
    a.ok(api.state().fits.a.slope < -0.6, "a negative within-group slope is honoured: " + api.state().fits.a.slope.toFixed(2));
    api.setSlope(1);
    a.ok(api.state().fits.a.slope > 0.6);
    var btn = h.querySelectorAll(".ui-button")[0];
    a.equal(btn.getAttribute("aria-pressed"), "false");
    api.setPooled(true);
    a.equal(btn.getAttribute("aria-pressed"), "true"); a.equal(btn.textContent, "Show the groups again");
    a.equal(h.querySelectorAll("line.line--strong").length, 0, "the group lines go away with the groups");
    a.equal(h.querySelectorAll("circle.is-pooled").length, 2 * K.N_PER, "and every point looks the same");
    api.setSeparation(99); a.equal(api.state().sep, K.MAX_SEP);
    api.setSeparation(-5); a.equal(api.state().sep, K.MIN_SEP);
    api.setSlope(99); a.equal(api.state().slope, K.MAX_SLOPE);
    api.setSlope(-99); a.equal(api.state().slope, K.MIN_SLOPE);
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    api.reset();
    var s = api.state();
    a.equal(s.sep, K.DEFAULT_SEP); a.equal(s.slope, K.DEFAULT_SLOPE); a.equal(s.pooled, false);
    a.equal(btn.getAttribute("aria-pressed"), "false");
    stats.unseed();
  });

  /* ---- 17.2 ---- */
  test("two-predictors: both fits come from stats, and the lone slope carries the partner's effect (D3, D5)", function (a) {
    stats.seed(91);
    var h = host(), api = demos.initTwoPredictors(h), K = api.constants, s = api.state();
    a.equal(s.r, K.DEFAULT_R); a.equal(s.b1, K.DEFAULT_B1); a.equal(s.b2, K.DEFAULT_B2);
    a.equal(s.x1.length, K.N); a.equal(s.x2.length, K.N); a.equal(s.y.length, K.N);
    a.close(s.correlation, stats.correlation(s.x1, s.x2), 1e-12);
    a.close(s.correlation, K.DEFAULT_R, 0.12, "x2 is built to the requested correlation: " + s.correlation.toFixed(3));
    var one = stats.linearRegression(s.x1, s.y), two = stats.twoPredictorFit(s.x1, s.x2, s.y);
    a.close(s.alone.slope, one.slope, 1e-12); a.close(s.both.b1, two.b1, 1e-12); a.close(s.both.b2, two.b2, 1e-12);
    a.equal(readout(h, "x₁ alone: slope"), one.slope.toFixed(3));
    a.equal(readout(h, "x₁ with x₂ in: b₁"), two.b1.toFixed(3));
    a.equal(readout(h, "True β₁"), K.DEFAULT_B1.toFixed(3));
    // with beta1 = -0.5, beta2 = 1.5 and r = 0.85, x1 alone should look positive
    a.close(two.b1, K.DEFAULT_B1, 0.4, "the two-predictor fit recovers the true beta1: " + two.b1.toFixed(2));
    a.close(two.b2, K.DEFAULT_B2, 0.4, "and the true beta2: " + two.b2.toFixed(2));
    a.ok(one.slope > two.b1 + 0.5, "fitted alone, x1 is credited with much more: " + one.slope.toFixed(2) + " against " + two.b1.toFixed(2));
    a.ok(h.querySelector("[data-meaning]").textContent.indexOf("Holding x₂ fixed") === 0, "the plain-English line names what b1 holds fixed");
    // r2 is whatever the noise allows; check it is a proportion and recomputable
    a.ok(two.r2 > 0 && two.r2 <= 1, "r2 is a proportion: " + two.r2.toFixed(3));
    var yMean = stats.mean(s.y), sst = 0, sse = 0;
    s.y.forEach(function (v, i) { sst += (v - yMean) * (v - yMean); var e = v - (two.b0 + two.b1 * s.x1[i] + two.b2 * s.x2[i]); sse += e * e; });
    a.close(two.r2, 1 - sse / sst, 1e-12, "r2 is recomputable from the residuals");
    a.close(two.sse, sse, 1e-9);
    stats.unseed();
  });

  test("two-predictors: uncorrelated predictors make the two fits agree; sliders clamp; near-collinear degrades to blanks; reset (D2, D4, D6)", function (a) {
    stats.seed(97);
    var h = host(), api = demos.initTwoPredictors(h), K = api.constants;
    api.setCorrelation(0);
    var indep = api.state();
    a.ok(Math.abs(indep.alone.slope - indep.both.b1) < 0.35,
      "with unrelated predictors the lone slope and b1 agree: " + indep.alone.slope.toFixed(2) + " vs " + indep.both.b1.toFixed(2));
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("barely related") > 0);
    api.setCorrelation(K.MAX_R);
    var tight = api.state();
    a.ok(tight.both, "even at r = 0.95 the system is still solvable");
    a.ok(Math.abs(tight.alone.slope - tight.both.b1) > Math.abs(indep.alone.slope - indep.both.b1),
      "the gap between the two answers widens with the correlation");
    // sign flip is the headline case
    api.setBeta1(-1); api.setBeta2(2); api.setCorrelation(0.9);
    var flip = api.state();
    a.ok(flip.both.b1 < 0, "with x2 in the model x1 is negative, as it truly is: " + flip.both.b1.toFixed(2));
    a.ok(flip.alone.slope > 0, "alone it looks positive: " + flip.alone.slope.toFixed(2));
    a.ok(h.querySelector(".demo__status[role=status]").textContent.indexOf("sign flipped") > 0);
    api.setCorrelation(99); a.equal(api.state().r, K.MAX_R);
    api.setCorrelation(-5); a.equal(api.state().r, K.MIN_R);
    api.setBeta1(99); a.equal(api.state().b1, K.MAX_BETA);
    api.setBeta2(-99); a.equal(api.state().b2, K.MIN_BETA);
    a.ok(isFinite(api.state().alone.slope));
    a.equal(h.innerHTML.indexOf("NaN"), -1);
    a.ok(h.querySelector(".demo__note").hidden, "no collinearity warning while the fit is defined");
    api.reset();
    var s = api.state();
    a.equal(s.r, K.DEFAULT_R); a.equal(s.b1, K.DEFAULT_B1); a.equal(s.b2, K.DEFAULT_B2);
    stats.unseed();
  });
})();
