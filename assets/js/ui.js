/*
  ui.js — StatLab shared UI kit. Exposes exactly one global, `ui` (HANDBOOK H1).
  Factories return plain objects holding a DOM element (`el`) plus a tiny API.
  Demos never restyle these; all looks come from components.css tokens.

  Requires: d3 (for ui.chart only). Load order: d3 → stats → ui → demos.
  Verified in tests/ui.test.js (DOM behaviour) and tests/ui.html (visual gallery).
*/
(function () {
  "use strict";

  var ui = {};
  var counter = 0;

  function uid(prefix) { counter += 1; return prefix + "-" + counter; }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** Decimal places implied by a step such as 0.05 → 2; integers → 0. */
  function decimalsOf(step) {
    var s = String(step);
    var dot = s.indexOf(".");
    return dot < 0 ? 0 : s.length - dot - 1;
  }

  /** "—" for anything that is not a finite number, so empty states read cleanly. */
  ui.formatNumber = function (value, decimals) {
    if (typeof value !== "number" || !isFinite(value)) return "—";
    return value.toFixed(decimals === undefined ? 2 : decimals);
  };

  /** True when the viewer asked for reduced motion (SPEC §6: use stepped updates). */
  ui.prefersReducedMotion = function () {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  /* ---- Slider ----------------------------------------------------------
     ui.slider({ label, min, max, step, value, decimals, format, onChange })
     Native <input type="range">, so mouse, touch, and arrow keys all work
     without extra code. `onChange(value)` fires on every input event (D2).
  ---------------------------------------------------------------------- */
  ui.slider = function (options) {
    var id = uid("ui-slider");
    var min = options.min, max = options.max;
    var step = options.step === undefined ? 1 : options.step;
    var decimals = options.decimals === undefined ? decimalsOf(step) : options.decimals;
    var onChange = options.onChange || function () {};

    var wrap = make("div", "ui-slider");
    var label = make("label", "ui-slider__label", options.label);
    label.htmlFor = id;
    var valueEl = make("output", "ui-slider__value");
    valueEl.htmlFor = id;
    var input = make("input", "ui-slider__input");
    input.type = "range";
    input.id = id;
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = options.value === undefined ? min : options.value;
    wrap.appendChild(label);
    wrap.appendChild(valueEl);
    wrap.appendChild(input);

    function current() { return Number(input.value); }
    function format(v) { return options.format ? options.format(v) : ui.formatNumber(v, decimals); }
    function render() {
      var v = current();
      valueEl.textContent = format(v);
      var pct = max > min ? (v - min) / (max - min) * 100 : 0;
      input.style.setProperty("--ui-fill", pct + "%");
    }

    input.addEventListener("input", function () { render(); onChange(current()); });
    render();

    return {
      el: wrap,
      input: input,
      get value() { return current(); },
      /** Programmatic set; pass silent = true to skip onChange (e.g., during reset). */
      set: function (v, silent) { input.value = v; render(); if (!silent) onChange(current()); },
      disable: function () { input.disabled = true; },
      enable: function () { input.disabled = false; }
    };
  };

  /* ---- Button ----------------------------------------------------------
     ui.button({ label, kind: "primary" | "secondary", onClick, ariaLabel })
     Returns the <button> element itself.
  ---------------------------------------------------------------------- */
  ui.button = function (options) {
    var kind = options.kind === "primary" ? "primary" : "secondary";
    var button = make("button", "ui-button ui-button--" + kind, options.label);
    button.type = "button";
    if (options.ariaLabel) button.setAttribute("aria-label", options.ariaLabel);
    if (options.onClick) button.addEventListener("click", options.onClick);
    return button;
  };

  /* ---- Control group ---------------------------------------------------
     ui.controls({ onPlay, onPause, onReset, extra: [buttons], labels })
     One Play/Pause toggle (primary) and one Reset (secondary), plus any
     extra buttons. Reset always pauses first, so "reset" restores a still
     initial state (SPEC D4).
  ---------------------------------------------------------------------- */
  ui.controls = function (options) {
    options = options || {};
    var labels = options.labels || {};
    var playLabel = labels.play || "Play", pauseLabel = labels.pause || "Pause", resetLabel = labels.reset || "Reset";
    var playing = false;
    var group = make("div", "ui-controls");

    var playButton = ui.button({ label: playLabel, kind: "primary", onClick: function () { api.toggle(); } });
    var resetButton = ui.button({ label: resetLabel, kind: "secondary", onClick: function () { api.reset(); } });
    group.appendChild(playButton);
    group.appendChild(resetButton);
    (options.extra || []).forEach(function (b) { group.appendChild(b); });

    var api = {
      el: group,
      playButton: playButton,
      resetButton: resetButton,
      get playing() { return playing; },
      play: function () {
        if (playing) return;
        playing = true;
        playButton.textContent = pauseLabel;
        if (options.onPlay) options.onPlay();
      },
      pause: function () {
        if (!playing) return;
        playing = false;
        playButton.textContent = playLabel;
        if (options.onPause) options.onPause();
      },
      toggle: function () { if (playing) api.pause(); else api.play(); },
      reset: function () { api.pause(); if (options.onReset) options.onReset(); }
    };
    return api;
  };

  /* ---- Readout ---------------------------------------------------------
     ui.readout({ label, value, decimals, format, accent })
     A labelled number. `set(value)` re-renders; NaN shows as "—".
  ---------------------------------------------------------------------- */
  ui.readout = function (options) {
    var box = make("div", "ui-readout" + (options.accent ? " ui-readout--accent" : ""));
    var label = make("span", "ui-readout__label", options.label);
    var valueEl = make("span", "ui-readout__value");
    valueEl.setAttribute("role", "status");
    box.appendChild(label);
    box.appendChild(valueEl);
    var value = NaN;
    function render() {
      valueEl.textContent = options.format ? options.format(value) : ui.formatNumber(value, options.decimals);
    }
    var api = {
      el: box,
      get value() { return value; },
      set: function (v) { value = v; render(); }
    };
    api.set(options.value === undefined ? NaN : options.value);
    return api;
  };

  /** A flex row of readouts: ui.readoutRow([r1, r2]) */
  ui.readoutRow = function (readouts) {
    var row = make("div", "ui-readouts");
    readouts.forEach(function (r) { row.appendChild(r.el); });
    return row;
  };

  /* ---- Chart frame -----------------------------------------------------
     ui.chart(container, { aspect, margin, minHeight, maxHeight, ariaLabel })
     Creates a responsive <svg> with a margin-translated plot group.
     `onResize(fn)` calls fn(frame) now and whenever the container's width
     changes (ResizeObserver, one call per animation frame at most), so a demo
     puts all its scale + draw code in one function. Axes are updated in
     place via frame.xAxis / frame.yAxis, never duplicated.

     Margins are the site-wide chart margins (SPEC §7: identical across demos).
  ---------------------------------------------------------------------- */
  var DEFAULT_MARGIN = { top: 16, right: 16, bottom: 40, left: 48 };

  /** Every live chart frame, so a theme switch can redraw them all (H2). */
  var liveFrames = [];

  ui.chart = function (container, options) {
    if (typeof d3 === "undefined") throw new Error("ui.chart needs d3 loaded first");
    options = options || {};
    var aspect = options.aspect || 0.6;
    var minHeight = options.minHeight || 200;
    var maxHeight = options.maxHeight || 480;
    var margin = Object.assign({}, DEFAULT_MARGIN, options.margin || {});

    var wrap = make("div", "ui-chart");
    container.appendChild(wrap);
    var svg = d3.select(wrap).append("svg").attr("role", "img");
    if (options.ariaLabel) svg.attr("aria-label", options.ariaLabel);
    var plot = svg.append("g").attr("class", "ui-chart__plot")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var listeners = [];
    var lastWidth = -1;
    var pending = false;

    var frame = {
      svg: svg,
      plot: plot,
      margin: margin,
      width: 0,
      height: 0,
      outerWidth: 0,
      outerHeight: 0
    };

    function measure() {
      var w = Math.max(wrap.clientWidth, 0);
      var h = Math.round(Math.min(maxHeight, Math.max(minHeight, w * aspect)));
      frame.outerWidth = w;
      frame.outerHeight = h;
      frame.width = Math.max(w - margin.left - margin.right, 0);
      frame.height = Math.max(h - margin.top - margin.bottom, 0);
      svg.attr("width", w).attr("height", h).attr("viewBox", null);
    }

    function fire() {
      pending = false;
      if (wrap.clientWidth === lastWidth) return;
      lastWidth = wrap.clientWidth;
      measure();
      listeners.forEach(function (fn) { fn(frame); });
    }

    frame.onResize = function (fn) {
      listeners.push(fn);
      if (lastWidth < 0) { lastWidth = wrap.clientWidth; measure(); }
      fn(frame);
    };

    /** Force a re-measure and redraw (e.g., after the container is shown). */
    frame.refresh = function () { lastWidth = -1; fire(); };

    function forget() {
      var i = liveFrames.indexOf(frame);
      if (i >= 0) liveFrames.splice(i, 1);
    }
    liveFrames.push(frame);   // so a theme switch can redraw this chart (H2)

    if (typeof ResizeObserver !== "undefined") {
      var observer = new ResizeObserver(function () {
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(fire);
      });
      observer.observe(wrap);
      frame.destroy = function () { observer.disconnect(); forget(); wrap.remove(); };
    } else {
      window.addEventListener("resize", fire);
      frame.destroy = function () { window.removeEventListener("resize", fire); forget(); wrap.remove(); };
    }

    function axisGroup(name, transform) {
      var g = plot.select("g.ui-chart__axis--" + name);
      if (g.empty()) g = plot.append("g").attr("class", "ui-chart__axis ui-chart__axis--" + name);
      g.attr("transform", transform);
      return g;
    }

    function axisLabel(g, text, x, y, rotate) {
      var t = g.select("text.ui-chart__axis-label");
      if (!text) { t.remove(); return; }
      if (t.empty()) t = g.append("text").attr("class", "ui-chart__axis-label").attr("text-anchor", "middle");
      t.attr("x", x).attr("y", y).attr("transform", rotate ? "rotate(-90)" : null).text(text);
    }

    /** frame.xAxis(scale, { ticks, label, format }) — bottom axis, updated in place. */
    frame.xAxis = function (scale, opts) {
      opts = opts || {};
      var axis = d3.axisBottom(scale);
      if (opts.ticks !== undefined) axis.ticks(opts.ticks);
      if (opts.format) axis.tickFormat(opts.format);
      var g = axisGroup("x", "translate(0," + frame.height + ")").call(axis);
      axisLabel(g, opts.label, frame.width / 2, margin.bottom - 4, false);
      return g;
    };

    /** frame.yAxis(scale, { ticks, label, format }) — left axis, updated in place. */
    frame.yAxis = function (scale, opts) {
      opts = opts || {};
      var axis = d3.axisLeft(scale);
      if (opts.ticks !== undefined) axis.ticks(opts.ticks);
      if (opts.format) axis.tickFormat(opts.format);
      var g = axisGroup("y", "translate(0,0)").call(axis);
      axisLabel(g, opts.label, -frame.height / 2, -margin.left + 12, true);
      return g;
    };

    /** Light horizontal gridlines from a y scale (optional). */
    frame.yGrid = function (scale, ticks) {
      var g = plot.select("g.ui-chart__grid");
      if (g.empty()) g = plot.insert("g", ":first-child").attr("class", "ui-chart__grid");
      g.call(d3.axisLeft(scale).ticks(ticks === undefined ? 5 : ticks).tickSize(-frame.width).tickFormat(""));
      return g;
    };

    return frame;
  };

  /* ---- Theme tokens for Canvas ---------------------------------------
     Canvas cannot read CSS, so demos ask for token values by name and never
     hard-code a colour (HANDBOOK §5). Values are read once per page.
  ---------------------------------------------------------------------- */
  var tokenCache = {};
  ui.token = function (name) {
    if (!(name in tokenCache)) {
      tokenCache[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
    return tokenCache[name];
  };

  /**
   * Live theme switching (H2). CSS-driven marks re-colour themselves because they
   * reference var(--…), but anything painted on Canvas holds the colour it was given,
   * and ui.token caches. So on "themechange" the cache is dropped and every live chart
   * frame is refreshed, which re-runs each demo's own render with the new tokens.
   * Demos need no code of their own for this.
   */
  document.addEventListener("themechange", function () {
    tokenCache = {};
    liveFrames.slice().forEach(function (frame) {
      try { frame.refresh(); } catch (e) { /* a destroyed frame must not stop the rest */ }
    });
  });

  /* ---- Canvas layer under a chart frame --------------------------------
     ui.canvas(frame) → { canvas, ctx, width, height, clear() }
     A <canvas> covering the frame's plot area, below the SVG (which keeps
     axes, markers, and pointer interaction). It follows the frame's size and
     the device pixel ratio; drawing code works in CSS pixels. Use for
     > 500 animated elements (SPEC D9, D-007). Register the demo's own
     onResize AFTER calling ui.canvas so the layer is sized first.
  ---------------------------------------------------------------------- */
  ui.canvas = function (frame) {
    var wrap = frame.svg.node().parentNode;
    wrap.classList.add("ui-chart--layered");
    var canvas = document.createElement("canvas");
    canvas.className = "ui-chart__canvas";
    canvas.setAttribute("aria-hidden", "true");
    wrap.insertBefore(canvas, frame.svg.node());
    var ctx = canvas.getContext("2d");
    var layer = { canvas: canvas, ctx: ctx, width: 0, height: 0 };

    function fit() {
      var dpr = window.devicePixelRatio || 1;
      layer.width = frame.width;
      layer.height = frame.height;
      canvas.width = Math.round(frame.width * dpr);
      canvas.height = Math.round(frame.height * dpr);
      canvas.style.width = frame.width + "px";
      canvas.style.height = frame.height + "px";
      canvas.style.left = frame.margin.left + "px";
      canvas.style.top = frame.margin.top + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    layer.clear = function () { ctx.clearRect(0, 0, layer.width, layer.height); };
    frame.onResize(fit);
    return layer;
  };

  window.ui = ui;
})();
