/*
  site.js — shared page chrome for StatLab. Exposes one global, `site` (HANDBOOK H1 §2
  as amended by D-018). Reads `chapters` (chapters.js) and renders:
    - the top bar (data-site-header) and footer attribution (data-site-footer)
    - the landing page learning-journey path (main.landing), built from chapters.js
      `tier` and `branchOf` so the concept chain is never hard-coded (D-040)
    - a chapter page's header, section jump list, and trail nav (main.chapter)
    - the day/night theme toggle, which dispatches "themechange" (D-041, D-042)
    - KaTeX math via auto-render, degrading to raw LaTeX if the CDN is unreachable (SPEC D8)
  Load order: d3 → stats → ui → chapters → site (last script in <body>).
*/
(function () {
  "use strict";

  var site = {};

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  site.chapters = function () { return window.chapters || []; };

  site.find = function (slug) {
    var list = site.chapters();
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  };

  /** The core chapters, in trail order. */
  site.trail = function () {
    return site.chapters().filter(function (c) { return c.tier === "core"; });
  };

  /** The advanced chapters that branch off a given core chapter number. */
  site.branchesOf = function (number) {
    return site.chapters().filter(function (c) { return c.tier === "advanced" && c.branchOf === number; });
  };

  /**
   * Neighbours along the learning journey, not along the chapter numbering (D-040).
   * A core chapter has the core chapters either side of it. An advanced chapter is a
   * side branch, so it has no next: it offers a way back to the trail node it hangs
   * off, in `backTo`. `prev`/`next` are null at the ends of the trail.
   */
  site.neighbors = function (slug) {
    var chapter = site.find(slug);
    if (!chapter) return { prev: null, next: null, backTo: null };
    if (chapter.tier === "advanced") {
      return { prev: null, next: null, backTo: site.byNumber(chapter.branchOf) };
    }
    var trail = site.trail();
    var idx = -1;
    for (var i = 0; i < trail.length; i++) if (trail[i].slug === slug) idx = i;
    if (idx < 0) return { prev: null, next: null, backTo: null };
    return {
      prev: idx > 0 ? trail[idx - 1] : null,
      next: idx < trail.length - 1 ? trail[idx + 1] : null,
      backTo: null
    };
  };

  site.byNumber = function (number) {
    var list = site.chapters();
    for (var i = 0; i < list.length; i++) if (list[i].number === number) return list[i];
    return null;
  };

  site.chapterHref = function (root, chapter) { return root + "chapters/" + chapter.slug + "/"; };

  /* ---- Theme --------------------------------------------------------- */
  /**
   * Day/night theme (H2, D-041). The attribute is set by a tiny inline script in
   * every page's <head> so nothing paints in the wrong theme; this module only
   * changes it afterwards. The one storage key the site is permitted to use is
   * "statlab-theme" (D-042), and every access is wrapped: with storage blocked or
   * full, the toggle still works for the rest of the page session.
   */
  var THEME_KEY = "statlab-theme";
  var themeButtons = [];

  site.theme = {
    get: function () {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    },
    /** Preferred theme before any choice was made. */
    preferred: function () {
      return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    },
    stored: function () {
      try {
        var v = window.localStorage.getItem(THEME_KEY);
        return v === "dark" || v === "light" ? v : null;
      } catch (e) { return null; }
    },
    set: function (value) {
      var theme = value === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", theme);
      try { window.localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage unavailable: this session only */ }
      themeButtons.forEach(labelThemeButton);
      document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
      return theme;
    },
    toggle: function () { return site.theme.set(site.theme.get() === "dark" ? "light" : "dark"); }
  };

  function svgIcon(className, shapes) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    shapes.forEach(function (shape) {
      var el = document.createElementNS(NS, shape.tag);
      Object.keys(shape).forEach(function (k) { if (k !== "tag") el.setAttribute(k, shape[k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function labelThemeButton(button) {
    var dark = site.theme.get() === "dark";
    button.setAttribute("aria-label", dark ? "Switch to the light theme" : "Switch to the dark theme");
    button.setAttribute("title", dark ? "Light theme" : "Dark theme");
  }

  /** The sun/moon toggle. Shows the icon for the theme it would switch TO. */
  site.themeToggle = function () {
    var button = make("button", "theme-toggle");
    button.type = "button";
    button.appendChild(svgIcon("theme-toggle__icon theme-toggle__sun", [
      { tag: "circle", cx: "12", cy: "12", r: "4" },
      { tag: "path", d: "M12 2.2v2.1M12 19.7v2.1M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M2.2 12h2.1M19.7 12h2.1M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5" }
    ]));
    button.appendChild(svgIcon("theme-toggle__icon theme-toggle__moon", [
      { tag: "path", d: "M20.4 14.9A8.6 8.6 0 0 1 9.1 3.6a8.6 8.6 0 1 0 11.3 11.3Z" }
    ]));
    labelThemeButton(button);
    button.addEventListener("click", function () { site.theme.toggle(); });
    themeButtons.push(button);
    return button;
  };

  /* ---- Top bar and footer ------------------------------------------- */
  site.renderHeader = function (container, root) {
    container.textContent = "";
    var nav = make("nav", "site-header__nav");
    nav.setAttribute("aria-label", "Site");
    var home = make("a", "site-header__brand", "StatLab");
    home.href = root + "index.html";
    var chaptersLink = make("a", "site-header__link", "Chapters");
    chaptersLink.href = root + "index.html#chapters";
    var about = make("a", "site-header__link", "About");
    about.href = root + "about.html";
    nav.appendChild(home);
    nav.appendChild(chaptersLink);
    nav.appendChild(about);
    nav.appendChild(site.themeToggle());
    container.appendChild(nav);
    return container;
  };

  site.renderFooter = function (container, root) {
    container.textContent = "";
    var p = make("p", "site-footer__text");
    p.appendChild(document.createTextNode("StatLab by Dr. Sein Minn and Kaung Hein Htet. \u00A9 2026. Code MIT, text CC BY 4.0."));
    container.appendChild(p);
    return container;
  };

  /* ---- Landing page journey path -------------------------------------- */
  /**
   * One node of the learning journey. The whole node is a single link so the touch
   * target is the card, not the title (SPEC section 6). Core and advanced nodes differ
   * by shape as well as colour, so the two tiers read in grayscale (S1).
   */
  function node(chapter, root) {
    var link = make("a", "node node--" + chapter.tier);
    link.href = site.chapterHref(root, chapter);
    var marker = make("span", "node__marker");
    marker.setAttribute("aria-hidden", "true");   // the kicker already says "Chapter N"
    marker.appendChild(make("span", "node__marker-n", String(chapter.number)));
    var body = make("span", "node__body");
    body.appendChild(make("span", "node__kicker",
      "Chapter " + chapter.number + " · " + (chapter.tier === "core" ? "Core" : "Advanced")));
    body.appendChild(make("span", "node__title", chapter.title));
    body.appendChild(make("span", "node__blurb", chapter.blurb));
    link.appendChild(marker);
    link.appendChild(body);
    return link;
  }

  /**
   * The journey path: the 13 core chapters as one ordered trail, with each advanced
   * chapter hanging off the core chapter it needs. Order and branching both come from
   * chapters.js (`tier`, `branchOf`), never from markup (D-040). There is deliberately
   * no progress state of any kind — the path shows the order to learn in, not how far
   * anyone has got (SPEC section 3 non-goals, restated in S1).
   */
  site.renderJourney = function (container, root) {
    root = root || "";
    // Static like the chapter chrome, so it ships in index.html and is on screen at
    // first paint (D-039). This stays the fallback for an empty container.
    if (container.firstElementChild) return container;
    container.textContent = "";
    container.appendChild(make("h2", null, "Core Concepts"));
    container.appendChild(make("p", "muted",
      "Thirteen chapters in the order they build on each other. Advanced Concepts branch off the chapter they depend on."));
    var trail = make("ol", "journey");
    site.trail().forEach(function (chapter) {
      var step = make("li", "journey__step");
      step.appendChild(node(chapter, root));
      var branches = site.branchesOf(chapter.number);
      if (branches.length) {
        var list = make("ul", "journey__branches");
        list.setAttribute("aria-label", "Advanced Concepts that branch off " + chapter.title);
        branches.forEach(function (branch) {
          var item = make("li", "journey__branch");
          item.appendChild(node(branch, root));
          list.appendChild(item);
        });
        step.appendChild(list);
      }
      trail.appendChild(step);
    });
    container.appendChild(trail);
    return container;
  };

  /* ---- Chapter page chrome ------------------------------------------- */
  site.renderChapter = function (main) {
    var slug = main.dataset.slug;
    var root = main.dataset.root || "";
    var chapter = site.find(slug);
    if (!chapter) return null;

    // The chapter chrome is static, so each page ships it in the HTML: it is the
    // largest block on screen, and building it after first paint cost a layout shift
    // and pushed the largest-contentful-paint past three seconds (D-039). Rendering
    // here is the fallback for a page that ships an empty header, and check-content.mjs
    // keeps the baked markup and chapters.js from drifting apart.
    var header = main.querySelector("#chapter-header");
    if (header && !header.firstElementChild) {
      header.appendChild(make("p", "chapter__kicker", "Chapter " + chapter.number + (chapter.book ? " · OpenStax " + chapter.book : " · Advanced Concepts")));
      header.appendChild(make("h1", null, chapter.title));
      header.appendChild(make("p", "chapter__blurb", chapter.blurb));
      var jump = make("nav", "chapter__sections");
      jump.setAttribute("aria-label", "Sections in this chapter");
      var ol = make("ol");
      chapter.sections.forEach(function (s) {
        var li = make("li");
        var a = make("a", null, s.number + " " + s.title);
        a.href = "#" + s.id;
        li.appendChild(a);
        ol.appendChild(li);
      });
      jump.appendChild(ol);
      header.appendChild(jump);
    }

    var nav = main.querySelector("#chapter-nav");
    if (nav && !nav.firstElementChild) {
      var n = site.neighbors(slug);
      var prev = make("a", "chapter__nav-link chapter__nav-link--prev");
      var next = make("a", "chapter__nav-link chapter__nav-link--next");
      if (n.backTo) { prev.href = site.chapterHref(root, n.backTo); prev.textContent = "← Back to the trail: " + n.backTo.number + ". " + n.backTo.title; }
      else if (n.prev) { prev.href = site.chapterHref(root, n.prev); prev.textContent = "← " + n.prev.number + ". " + n.prev.title; }
      else { prev.href = root + "index.html"; prev.textContent = "← All chapters"; }
      if (n.next) { next.href = site.chapterHref(root, n.next); next.textContent = n.next.number + ". " + n.next.title + " →"; }
      else { next.href = root + "index.html"; next.textContent = "All chapters →"; }
      nav.appendChild(prev);
      nav.appendChild(next);
    }
    document.title = "Chapter " + chapter.number + " · " + chapter.title + " — StatLab";
    return chapter;
  };

  /* ---- Math --------------------------------------------------------- */
  /**
   * Renders \( … \) and \[ … \] with KaTeX auto-render when it loaded; otherwise
   * marks the root `no-katex` and leaves the LaTeX source visible (SPEC D8).
   * Returns true when KaTeX rendered.
   */
  site.renderMath = function (root) {
    root = root || document.body;
    if (typeof window.renderMathInElement !== "function") {
      root.classList.add("no-katex");
      return false;
    }
    window.renderMathInElement(root, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false
    });
    root.classList.add("katex-ready");
    return true;
  };

  /* ---- Boot --------------------------------------------------------- */
  site.init = function () {
    var main = document.querySelector("main");
    var root = (main && main.dataset.root) || "";
    var header = document.querySelector("[data-site-header]");
    var footer = document.querySelector("[data-site-footer]");
    if (header) site.renderHeader(header, root);
    if (footer) site.renderFooter(footer, root);
    if (main && main.classList.contains("landing")) {
      var path = main.querySelector("#chapters");
      if (path) site.renderJourney(path, root);
    }
    if (main && main.classList.contains("chapter")) site.renderChapter(main);
    // Deferred KaTeX scripts have run (or failed) by window.load.
    if (document.readyState === "complete") site.renderMath(document.body);
    else window.addEventListener("load", function () { site.renderMath(document.body); });
  };

  window.site = site;
  if (document.querySelector("main")) site.init();
})();
