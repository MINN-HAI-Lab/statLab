/*
  insights.test.js — the insight callouts (D-057): wrapped initialisers, rules
  evaluated against real demo state, placeholder filling that refuses a missing
  number, once-per-load, dismissal, and no collision with the selectors the demo
  tests rely on.
*/
(function () {
  "use strict";
  var test = window.StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");

  function host(id) {
    var h = document.createElement("div");
    h.className = "ui-panel section__demo";
    if (id) h.setAttribute("data-demo", id);
    sandbox.appendChild(h);
    return h;
  }
  function button(h, label) {
    var all = h.querySelectorAll(".ui-button");
    for (var i = 0; i < all.length; i++) if (all[i].textContent.trim() === label) return all[i];
    return null;
  }

  test("insights: every demo has rules, every rule has the shape the engine expects", function (a) {
    var rules = window.insights.rules;
    var ids = Object.keys(rules);
    a.equal(ids.length, 46, "one rule list per demo");
    ids.forEach(function (id) {
      a.ok(rules[id].length >= 2, id + " has at least two tips");
      rules[id].forEach(function (r) {
        a.ok(typeof r.id === "string" && typeof r.when === "function" && typeof r.text === "string", id + "/" + r.id + " shape");
        a.ok(/[.!?]$/.test(r.text), id + "/" + r.id + " ends with a full stop");
      });
      var seen = {};
      rules[id].forEach(function (r) { a.ok(!seen[r.id], id + " rule ids are unique"); seen[r.id] = true; });
    });
    a.ok(Object.keys(window.demos).every(function (k) { return window.demos[k].__insights; }), "every initialiser is wrapped");
  });

  test("insights.fill: numbers are formatted, a missing or non-finite value refuses the whole tip", function (a) {
    var f = window.insights.fill;
    a.equal(f("n rose from {a} to {b}", { a: 10, b: 50 }), "n rose from 10 to 50");
    a.equal(f("SE {s}", { s: 0.408248 }), "SE 0.41");
    a.equal(f("p = {p}", { p: 0.023161 }), "p = 0.023");
    a.equal(f("{k}", { k: 4.000000001 }), "4");
    a.equal(f("{x}", {}), null, "missing value");
    a.equal(f("{x}", { x: NaN }), null, "NaN");
    a.equal(f("{x}", { x: Infinity }), null, "Infinity");
    a.equal(f("{x} and {y}", { x: 1 }), null, "one missing among two");
    a.equal(f("the {s}", { s: "Poisson" }), "the Poisson", "strings pass through");
  });

  test("insights: a demo host with data-demo gets a callout driven by its own state; one without gets nothing", function (a) {
    var plain = host(null);
    var apiPlain = demos.initCoinFlip(plain);
    a.ok(!apiPlain.insights, "no data-demo, no callout, so the demo tests are untouched");
    a.equal(plain.querySelectorAll(".ui-insight").length, 0);

    var h = host("probability-topics__coin-flip");
    var api = demos.initCoinFlip(h);
    a.ok(api && api.insights, "the wrapped initialiser attached insights");
    a.ok(h.__demoApi === api, "the host carries its api for the gates");
    a.equal(h.querySelectorAll(".ui-insight").length, 0, "nothing is built until a tip fires");

    button(h, "Flip 100").click();
    var fired = api.insights.check();
    a.equal(fired, "settling", "100 flips trips the settling tip");
    var box = h.querySelector(".ui-insight");
    a.ok(box && !box.hidden && box.classList.contains("ui-insight"), "the callout is shown");
    a.equal(box.getAttribute("role"), "status"); a.equal(box.getAttribute("aria-live"), "polite");
    var text = box.querySelector(".ui-insight__text").textContent;
    a.ok(/^After \d+ flips the proportion of heads is 0\.\d+, settling toward p = 0\.\d+\.$/.test(text), "the tip carries the live numbers: " + text);
    a.ok(!/NaN|undefined|\{|\}/.test(text), "no unfilled placeholder");
    a.equal(api.insights.last(), text);

    // selectors the demo tests rely on are not polluted
    a.ok(!box.classList.contains("demo__status"), "not a demo__status");
    a.equal(box.querySelectorAll(".ui-button").length, 0, "the dismiss control is not a .ui-button");
    a.ok(box.querySelector(".ui-insight__dismiss").getBoundingClientRect().height >= 44, "dismiss is a 44 px target");

    // once per page load
    api.reset();
    button(h, "Flip 100").click();
    a.equal(api.insights.check(), null, "the same tip does not fire twice");
    a.ok(api.insights.shown.settling, "it is remembered in memory only");

    // dismissal
    box.querySelector(".ui-insight__dismiss").click();
    a.ok(box.hidden, "Dismiss hides it");
    api.insights.hide();
    a.ok(box.hidden, "hide is idempotent");
  });

  test("insights: a rule whose numbers are not ready stays silent rather than saying something wrong", function (a) {
    var h = host("hypothesis-testing__p-value");
    var api = demos.initPValue ? demos.initPValue(h) : null;
    if (!api) { a.ok(true, "demo not on this page"); return; }
    // before any sample is drawn x̄ is NaN, so the single-draw tip must not fire with blanks
    var fired = api.insights.check();
    a.ok(fired === null || !/NaN|undefined/.test(api.insights.last() || ""), "no tip with a missing number");
    button(h, "Draw a sample").click();
    var f2 = api.insights.check();
    a.ok(f2 === null || /z = -?\d/.test(api.insights.last()), "once drawn, the tip carries a real z: " + api.insights.last());
  });
})();
