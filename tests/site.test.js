/*
  site.test.js — tests for assets/js/chapters.js data integrity and assets/js/site.js
  rendering. Rendering happens inside the shared off-screen sandbox (#ui-sandbox).
*/
(function () {
  "use strict";
  var test = StatLabTests.test;
  var sandbox = document.getElementById("ui-sandbox");

  test("chapters.js: 17 chapters, unique kebab-case slugs, 13 on the core trail", function (a) {
    var list = site.chapters();
    a.equal(list.length, 17);
    var slugs = new Set(list.map(function (c) { return c.slug; }));
    a.equal(slugs.size, 17);
    list.forEach(function (c, i) {
      a.ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug), "kebab slug: " + c.slug);
      a.equal(c.number, i + 1, "numbered in order");
      a.ok(c.sections.length >= 2 && c.sections.length <= 4, "2–4 sections: " + c.slug);
      a.ok(typeof c.blurb === "string" && c.blurb.length > 20, "blurb present: " + c.slug);
      a.ok(typeof c.phase === "number", "phase present: " + c.slug);
      c.sections.forEach(function (s, k) {
        a.equal(s.id, "section-" + (k + 1));
        a.equal(s.number, c.number + "." + (k + 1));
        a.ok(s.demo.indexOf(c.slug + "__") === 0, "demo name prefixed with chapter slug: " + s.demo);
      });
    });
    a.equal(list.filter(function (c) { return c.tier === "core"; }).length, 13);
    a.equal(list.filter(function (c) { return c.tier === "advanced"; }).length, 4);
    list.forEach(function (c) {
      a.ok(c.tier === "core" || c.tier === "advanced", "tier set: " + c.slug);
      if (c.tier === "core") a.equal(c.branchOf, null, "a core chapter branches off nothing: " + c.slug);
      else a.ok(site.byNumber(c.branchOf) && site.byNumber(c.branchOf).tier === "core", "advanced chapter branches off a core chapter: " + c.slug);
    });
    // the concept chain the maintainer fixed (D-040)
    a.equal(site.find("counting").branchOf, 3);
    a.equal(site.find("bayesian-inference").branchOf, 3);
    a.equal(site.find("resampling").branchOf, 9);
    a.equal(site.find("beyond-one-variable").branchOf, 12);
    a.equal(list[0].slug, "sampling-and-data");
    a.equal(list[2].slug, "probability-topics");
    a.equal(list[16].slug, "beyond-one-variable");
  });

  test("site.neighbors: follows the trail, and a branch offers the way back (D-040)", function (a) {
    a.equal(site.find("chi-square").number, 11);
    a.equal(site.find("nope"), null);
    a.equal(site.trail().length, 13);
    var first = site.neighbors("sampling-and-data");
    a.equal(first.prev, null); a.equal(first.next.slug, "descriptive-statistics"); a.equal(first.backTo, null);
    var mid = site.neighbors("hypothesis-testing");
    a.equal(mid.prev.slug, "confidence-intervals"); a.equal(mid.next.slug, "two-sample-tests");
    // the trail ends at ANOVA; chapter 14 is a branch, not the next step
    var end = site.neighbors("anova");
    a.equal(end.prev.slug, "linear-regression"); a.equal(end.next, null); a.equal(end.backTo, null);
    var branch = site.neighbors("counting");
    a.equal(branch.prev, null); a.equal(branch.next, null); a.equal(branch.backTo.slug, "probability-topics");
    a.equal(site.neighbors("resampling").backTo.slug, "hypothesis-testing");
    a.equal(site.neighbors("beyond-one-variable").backTo.slug, "linear-regression");
    var none = site.neighbors("nope");
    a.equal(none.prev, null); a.equal(none.next, null); a.equal(none.backTo, null);
    a.equal(site.branchesOf(3).length, 2);
    a.equal(site.branchesOf(1).length, 0);
  });

  test("site.renderJourney: one node per chapter, branches under their prerequisite, no progress state", function (a) {
    var box = document.createElement("div");
    sandbox.appendChild(box);
    site.renderJourney(box, "");
    a.equal(box.querySelectorAll("a.node").length, 17, "every chapter is a node");
    a.equal(box.querySelectorAll("li.journey__step").length, 13, "thirteen steps on the trail");
    a.equal(box.querySelectorAll("a.node--core").length, 13);
    a.equal(box.querySelectorAll("a.node--advanced").length, 4);
    a.equal(box.querySelector("h2").textContent, "Core Concepts");
    a.ok(box.textContent.indexOf("Advanced Concepts") >= 0, "the second tier is named");
    // the third step is Probability Topics and carries two branches
    var third = box.querySelectorAll("li.journey__step")[2];
    a.equal(third.querySelector("a.node").getAttribute("href"), "chapters/probability-topics/");
    a.equal(third.querySelector(".node__title").textContent, "Probability Topics");
    a.equal(third.querySelectorAll(".journey__branches .node--advanced").length, 2);
    a.equal(third.querySelectorAll(".journey__branch .node__title")[0].textContent, "Counting");
    a.equal(third.querySelector(".journey__branches").getAttribute("aria-label"), "Advanced Concepts that branch off Probability Topics");
    // steps that have no branches carry no branch list
    a.equal(box.querySelectorAll("li.journey__step")[0].querySelectorAll(".journey__branches").length, 0);
    // the whole node is the link, and the marker is decorative
    a.equal(third.querySelector("a.node .node__marker").getAttribute("aria-hidden"), "true");
    a.equal(third.querySelector("a.node .node__marker-n").textContent, "3");
    a.ok(third.querySelector(".node__kicker").textContent.indexOf("Chapter 3") === 0);
    // SPEC section 3 non-goal: the path shows order, never progress
    a.ok(!/progress|complete|locked|streak/i.test(box.innerHTML), "no progress state anywhere in the path");
    box.querySelectorAll("a.node").forEach(function (n) { a.ok(!n.hasAttribute("aria-disabled"), "every node is always open"); });
  });

  test("site.renderChapter: header, jump list, prev/next from data-slug and data-root", function (a) {
    var main = document.createElement("main");
    main.className = "chapter";
    main.dataset.slug = "probability-topics";
    main.dataset.root = "../../";
    main.innerHTML = '<header id="chapter-header"></header><nav id="chapter-nav"></nav>';
    sandbox.appendChild(main);
    var saved = document.title;
    var c = site.renderChapter(main);
    a.equal(c.slug, "probability-topics");
    a.equal(main.querySelector("#chapter-header h1").textContent, "Probability Topics");
    a.equal(main.querySelectorAll("#chapter-header ol li").length, 3);
    a.equal(main.querySelector("#chapter-header ol a").getAttribute("href"), "#section-1");
    var links = main.querySelectorAll("#chapter-nav a");
    a.equal(links.length, 2);
    a.equal(links[0].getAttribute("href"), "../../chapters/descriptive-statistics/");
    a.equal(links[1].getAttribute("href"), "../../chapters/discrete-random-variables/");
    a.ok(links[0].textContent.indexOf("← 2.") === 0);
    a.ok(document.title.indexOf("Chapter 3") === 0);
    document.title = saved;

    var first = document.createElement("main");
    first.dataset.slug = "sampling-and-data"; first.dataset.root = "../../";
    first.innerHTML = '<nav id="chapter-nav"></nav>';
    sandbox.appendChild(first);
    site.renderChapter(first);
    a.equal(first.querySelector("#chapter-nav a").getAttribute("href"), "../../index.html", "first chapter's prev goes home");
    document.title = saved;
    var unknown = document.createElement("main");
    unknown.dataset.slug = "no-such-chapter";
    a.equal(site.renderChapter(unknown), null, "unknown slug renders nothing");
  });

  test("site.renderHeader / renderFooter: root-relative links", function (a) {
    var h = document.createElement("div"), f = document.createElement("div");
    sandbox.appendChild(h); sandbox.appendChild(f);
    site.renderHeader(h, "../../");
    var links = h.querySelectorAll("a");
    a.equal(links.length, 3);
    a.equal(links[0].getAttribute("href"), "../../index.html");
    a.equal(links[2].getAttribute("href"), "../../about.html");
    var toggle = h.querySelector("button.theme-toggle");
    a.ok(toggle, "the header carries the theme toggle");
    a.equal(toggle.type, "button");
    a.ok(/Switch to the (light|dark) theme/.test(toggle.getAttribute("aria-label")), "toggle is labelled for screen readers");
    a.equal(toggle.querySelectorAll("svg").length, 2, "a sun and a moon, one shown per theme by CSS");
    site.renderFooter(f, "");
    a.ok(f.textContent.indexOf("CC BY 4.0") >= 0);
    a.ok(f.textContent.indexOf("StatLab by Dr. Sein Minn and Kaung Hein Htet") === 0, "both authors are credited, in order (D-045)");
    a.equal(f.querySelector("a").getAttribute("href"), "about.html");
    var credits = f.querySelectorAll("a")[1];
    a.equal(credits.textContent, "Credits");
    a.equal(credits.getAttribute("href"), "about.html#credits");
  });

  test("site.theme: toggles the attribute, survives blocked storage, and announces the change (D-041, D-042)", function (a) {
    var started = site.theme.get();
    var seen = [];
    function listen(e) { seen.push(e.detail.theme); }
    document.addEventListener("themechange", listen);

    a.equal(site.theme.set("dark"), "dark");
    a.equal(document.documentElement.getAttribute("data-theme"), "dark");
    a.equal(site.theme.get(), "dark");
    a.equal(site.theme.set("light"), "light");
    a.equal(site.theme.get(), "light");
    a.equal(site.theme.toggle(), "dark");
    a.equal(site.theme.toggle(), "light");
    a.equal(seen.join(","), "dark,light,dark,light", "every change is announced once");

    a.equal(site.theme.set("nonsense"), "light", "anything but dark falls back to light");
    a.ok(site.theme.preferred() === "light" || site.theme.preferred() === "dark");

    // the one permitted key, and only that one
    a.equal(window.localStorage.getItem("statlab-theme"), site.theme.get());

    // with storage throwing, the toggle must still work for this page session
    var realStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
    var threw = false;
    try {
      Object.defineProperty(window, "localStorage", { configurable: true, get: function () { throw new Error("blocked"); } });
      a.equal(site.theme.set("dark"), "dark", "set works without storage");
      a.equal(document.documentElement.getAttribute("data-theme"), "dark");
      a.equal(site.theme.stored(), null, "stored() reports nothing rather than throwing");
    } catch (e) { threw = true; }
    finally { if (realStorage) Object.defineProperty(window, "localStorage", realStorage); }
    a.ok(!threw, "no exception escapes when storage is unavailable");

    document.removeEventListener("themechange", listen);
    site.theme.set(started);
  });

  test("site.renderMath: degrades without KaTeX, leaving LaTeX source visible", function (a) {
    var box = document.createElement("div");
    box.innerHTML = "<p>Mean \\(\\bar{x}\\) here</p>";
    sandbox.appendChild(box);
    var had = window.renderMathInElement;
    window.renderMathInElement = undefined;
    var ok = site.renderMath(box);
    a.equal(ok, false);
    a.ok(box.classList.contains("no-katex"));
    a.ok(box.textContent.indexOf("\\bar{x}") >= 0, "raw LaTeX still visible");
    var calls = 0;
    window.renderMathInElement = function (el, opts) { calls++; a.equal(el, box); a.equal(opts.throwOnError, false); a.equal(opts.delimiters.length, 2); };
    a.equal(site.renderMath(box), true);
    a.equal(calls, 1);
    a.ok(box.classList.contains("katex-ready"));
    window.renderMathInElement = had;
  });
})();
