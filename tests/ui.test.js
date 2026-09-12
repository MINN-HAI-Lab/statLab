/*
  ui.test.js — DOM behaviour tests for assets/js/ui.js. Runs in tests/index.html.
  Components are built inside an off-screen sandbox 600 px wide so layout
  measurements (chart frame) are real. No reference library applies here; the
  expectations are the contract documented in ui.js.
*/
(function () {
  "use strict";
  var test = StatLabTests.test;

  var sandbox = document.createElement("div");
  sandbox.id = "ui-sandbox";
  sandbox.style.position = "absolute";
  sandbox.style.left = "-9999px";
  sandbox.style.top = "0";
  sandbox.style.width = "600px";
  sandbox.inert = true;  // out of the tab order and accessibility tree, but still laid out
  document.body.appendChild(sandbox);

  function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true })); }

  test("ui.formatNumber: fixed decimals, dash for NaN/Infinity/non-numbers", function (a) {
    a.equal(ui.formatNumber(3.14159, 2), "3.14");
    a.equal(ui.formatNumber(2, 0), "2");
    a.equal(ui.formatNumber(0.5), "0.50");
    a.equal(ui.formatNumber(NaN), "—");
    a.equal(ui.formatNumber(Infinity), "—");
    a.equal(ui.formatNumber("7"), "—");
  });

  test("ui.prefersReducedMotion returns a boolean", function (a) {
    a.equal(typeof ui.prefersReducedMotion(), "boolean");
  });

  test("ui.slider: label linked to input, value shown, decimals from step", function (a) {
    var s = ui.slider({ label: "p", min: 0, max: 1, step: 0.05, value: 0.3 });
    sandbox.appendChild(s.el);
    var input = s.el.querySelector("input[type=range]");
    var label = s.el.querySelector("label");
    a.ok(input && label, "has input and label");
    a.equal(label.htmlFor, input.id);
    a.equal(input.min, "0"); a.equal(input.max, "1"); a.equal(input.step, "0.05");
    a.equal(s.value, 0.3);
    a.equal(s.el.querySelector("output").textContent, "0.30");
    a.equal(input.style.getPropertyValue("--ui-fill").trim(), "30%");
    a.equal(input.labels[0], label, "label association resolves");
  });

  test("ui.slider: input event fires onChange with a number; set() respects silent", function (a) {
    var seen = [];
    var s = ui.slider({ label: "n", min: 1, max: 100, step: 1, value: 10, onChange: function (v) { seen.push(v); } });
    sandbox.appendChild(s.el);
    s.input.value = "42"; fire(s.input, "input");
    a.equal(seen.length, 1); a.equal(seen[0], 42); a.equal(typeof seen[0], "number");
    a.equal(s.el.querySelector("output").textContent, "42");
    s.set(7, true);
    a.equal(seen.length, 1, "silent set does not fire");
    a.equal(s.value, 7);
    s.set(9);
    a.equal(seen.length, 2); a.equal(seen[1], 9);
    s.disable(); a.ok(s.input.disabled); s.enable(); a.ok(!s.input.disabled);
  });

  test("ui.slider: custom format and clamping to range", function (a) {
    var s = ui.slider({ label: "λ", min: 0.5, max: 5, step: 0.5, value: 2, format: function (v) { return v + "/min"; } });
    sandbox.appendChild(s.el);
    a.equal(s.el.querySelector("output").textContent, "2/min");
    s.set(99, true);
    a.equal(s.value, 5, "native range clamps to max");
    s.set(-3, true);
    a.equal(s.value, 0.5, "native range clamps to min");
  });

  test("ui.button: type=button, kind class, click handler", function (a) {
    var hits = 0;
    var b = ui.button({ label: "Go", kind: "primary", onClick: function () { hits++; } });
    var c = ui.button({ label: "Other" });
    sandbox.appendChild(b); sandbox.appendChild(c);
    a.equal(b.type, "button"); a.equal(b.textContent, "Go");
    a.ok(b.classList.contains("ui-button--primary"));
    a.ok(c.classList.contains("ui-button--secondary"), "default kind is secondary");
    b.click(); b.click();
    a.equal(hits, 2);
  });

  test("ui.controls: play/pause toggle relabels; reset pauses then resets", function (a) {
    var log = [];
    var extra = ui.button({ label: "Step" });
    var c = ui.controls({
      onPlay: function () { log.push("play"); },
      onPause: function () { log.push("pause"); },
      onReset: function () { log.push("reset"); },
      extra: [extra]
    });
    sandbox.appendChild(c.el);
    a.equal(c.el.querySelectorAll("button").length, 3);
    a.equal(c.playButton.textContent, "Play"); a.ok(!c.playing);
    c.playButton.click();
    a.ok(c.playing); a.equal(c.playButton.textContent, "Pause");
    c.playButton.click();
    a.ok(!c.playing); a.equal(c.playButton.textContent, "Play");
    c.play(); c.resetButton.click();
    a.ok(!c.playing);
    a.equal(log.join(","), "play,pause,play,pause,reset");
    c.pause();
    a.equal(log.length, 5, "pause when already paused is a no-op");
  });

  test("ui.controls: custom labels", function (a) {
    var c = ui.controls({ labels: { play: "Flip", pause: "Stop", reset: "Clear" } });
    a.equal(c.playButton.textContent, "Flip"); a.equal(c.resetButton.textContent, "Clear");
    c.play(); a.equal(c.playButton.textContent, "Stop");
  });

  test("ui.readout: label, formatted value, NaN dash, set()", function (a) {
    var r = ui.readout({ label: "Mean", value: 2.5, decimals: 1 });
    sandbox.appendChild(r.el);
    a.equal(r.el.querySelector(".ui-readout__label").textContent, "Mean");
    a.equal(r.el.querySelector(".ui-readout__value").textContent, "2.5");
    r.set(NaN); a.equal(r.el.querySelector(".ui-readout__value").textContent, "—");
    r.set(3); a.equal(r.value, 3); a.equal(r.el.querySelector(".ui-readout__value").textContent, "3.0");
    var e = ui.readout({ label: "Empty" });
    a.equal(e.el.querySelector(".ui-readout__value").textContent, "—");
    var row = ui.readoutRow([r, e]);
    a.equal(row.children.length, 2);
  });

  test("ui.chart: measures container, applies margins, onResize fires immediately", function (a) {
    var host = document.createElement("div");
    sandbox.appendChild(host);
    var calls = 0;
    var f = ui.chart(host, { ariaLabel: "test chart" });
    f.onResize(function (frame) { calls++; a.equal(frame, f); });
    a.equal(calls, 1);
    a.equal(f.outerWidth, 600);
    a.equal(f.outerHeight, 360, "600 × 0.6 aspect");
    a.equal(f.width, 600 - 48 - 16);
    a.equal(f.height, 360 - 16 - 40);
    var svg = host.querySelector("svg");
    a.equal(svg.getAttribute("width"), "600");
    a.equal(svg.getAttribute("aria-label"), "test chart");
    a.equal(host.querySelector("g.ui-chart__plot").getAttribute("transform"), "translate(48,16)");
    f.destroy();
    a.equal(host.querySelector("svg"), null, "destroy removes the frame");
  });

  test("ui.chart: height clamps to min/max and honours custom margin", function (a) {
    var host = document.createElement("div");
    sandbox.appendChild(host);
    var f = ui.chart(host, { aspect: 2, maxHeight: 400, margin: { left: 60 } });
    f.onResize(function () {});
    a.equal(f.outerHeight, 400);
    a.equal(f.width, 600 - 60 - 16);
    a.equal(f.margin.bottom, 40, "unspecified margins keep site defaults");
    f.destroy();
  });

  test("ui.chart: axes are created once and updated in place; labels and grid attach", function (a) {
    var host = document.createElement("div");
    sandbox.appendChild(host);
    var f = ui.chart(host);
    var x = d3.scaleLinear().domain([0, 10]).range([0, f.width]);
    var y = d3.scaleLinear().domain([0, 1]).range([f.height, 0]);
    f.onResize(function (fr) {
      fr.xAxis(x, { label: "x label" });
      fr.yAxis(y, { label: "y label", ticks: 4 });
      fr.yGrid(y);
    });
    f.xAxis(x, { label: "x label 2" });
    f.yAxis(y);
    a.equal(host.querySelectorAll("g.ui-chart__axis--x").length, 1);
    a.equal(host.querySelectorAll("g.ui-chart__axis--y").length, 1);
    a.equal(host.querySelectorAll("g.ui-chart__grid").length, 1);
    a.ok(host.querySelectorAll("g.ui-chart__axis--x .tick").length > 2, "x ticks rendered");
    a.equal(host.querySelector("g.ui-chart__axis--x text.ui-chart__axis-label").textContent, "x label 2");
    a.equal(host.querySelector("g.ui-chart__axis--y text.ui-chart__axis-label"), null, "label removed when omitted");
    a.equal(host.querySelector("g.ui-chart__axis--x").getAttribute("transform"), "translate(0," + f.height + ")");
    a.ok(host.querySelector("g.ui-chart__grid line"), "grid lines exist");
    f.destroy();
  });

  test("ui.token: reads theme custom properties, trimmed, and re-reads them on a theme switch (H2)", function (a) {
    function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    // token values belong to whichever theme is running, so compare against the CSS itself
    a.equal(ui.token("--accent"), css("--accent"));
    a.equal(ui.token("--bg"), css("--bg"));
    a.equal(ui.token("--accent-2"), css("--accent-2"), "the advanced-tier accent exists in both themes");
    a.equal(ui.token("--path-line"), css("--path-line"), "the journey connector colour exists in both themes");
    a.ok(/^#[0-9a-f]{6}$/i.test(ui.token("--accent")), "a six-digit hex: " + ui.token("--accent"));
    a.equal(ui.token("--touch"), "44px");
    a.equal(ui.token("--no-such-token"), "");

    // the cache must not outlive the theme it was filled from
    var started = site.theme.get();
    var before = ui.token("--bg");
    site.theme.set(started === "dark" ? "light" : "dark");
    var after = ui.token("--bg");
    a.ok(after !== before, "--bg differs between the themes: " + before + " then " + after);
    a.equal(after, css("--bg"), "ui.token re-read the switched theme rather than serving a stale cache");
    site.theme.set(started);
    a.equal(ui.token("--bg"), before, "and switching back restores the original value");
  });

  test("ui.chart: a live frame redraws itself on a theme switch, so canvas colours follow (H2)", function (a) {
    var host = document.createElement("div");
    sandbox.appendChild(host);
    var f = ui.chart(host, { aspect: 0.5, minHeight: 120 });
    var drawn = [];
    f.onResize(function () { drawn.push(ui.token("--accent")); });
    a.equal(drawn.length, 1, "onResize draws once immediately");
    var started = site.theme.get();
    site.theme.set(started === "dark" ? "light" : "dark");
    a.equal(drawn.length, 2, "the theme switch triggered a redraw");
    a.ok(drawn[1] !== drawn[0], "and the redraw saw the new accent: " + drawn[0] + " then " + drawn[1]);
    site.theme.set(started);
    a.equal(drawn.length, 3);
    a.equal(drawn[2], drawn[0], "switching back restores the original colour");
    f.destroy();
    var afterDestroy = drawn.length;
    site.theme.set(started === "dark" ? "light" : "dark");
    site.theme.set(started);
    a.equal(drawn.length, afterDestroy, "a destroyed frame is not redrawn");
  });

  test("ui.canvas: layer under the SVG matches the plot area and device pixel ratio", function (a) {
    var host = document.createElement("div");
    sandbox.appendChild(host);
    var f = ui.chart(host, { margin: { left: 40, top: 10 } });
    var layer = ui.canvas(f);
    var dpr = window.devicePixelRatio || 1;
    a.equal(layer.width, f.width); a.equal(layer.height, f.height);
    a.equal(layer.canvas.width, Math.round(f.width * dpr));
    a.equal(layer.canvas.style.left, "40px"); a.equal(layer.canvas.style.top, "10px");
    a.equal(layer.canvas.getAttribute("aria-hidden"), "true");
    a.equal(host.querySelector(".ui-chart").firstChild, layer.canvas, "canvas sits below the svg");
    a.ok(host.querySelector(".ui-chart").classList.contains("ui-chart--layered"));
    layer.ctx.fillStyle = ui.token("--accent");
    a.equal(layer.ctx.fillStyle, ui.token("--accent").toLowerCase(), "token value is a colour the canvas accepts");
    layer.ctx.fillRect(0, 0, 4, 4);
    layer.clear();
    var t = layer.ctx.getTransform();
    a.equal(t.a, dpr, "drawing transform is scaled by the device pixel ratio");
    f.destroy();
  });

  test("keyboard: every control is natively focusable and none is a div/span", function (a) {
    var controls = sandbox.querySelectorAll(".ui-slider__input, .ui-button");
    a.ok(controls.length >= 8, "sandbox has controls, found " + controls.length);
    controls.forEach(function (c) {
      a.ok(c.tagName === "INPUT" || c.tagName === "BUTTON", "native element: " + c.tagName);
      a.ok(c.tabIndex >= 0, "in tab order: " + c.className);
    });
  });
  test("ui.optionGroup: picks one value, keyboard-operable, and re-ranges without drifting (D-051)", function (a) {
    var picked = [];
    var g = ui.optionGroup({ label: "Items chosen, k", values: [1, 2, 3, 4], value: 2, onChange: function (v) { picked.push(v); } });
    sandbox.appendChild(g.el);

    var opts = g.el.querySelector(".ui-optiongroup__options");
    a.equal(opts.getAttribute("role"), "radiogroup", "a mutually exclusive set is a radio group, not toggles");
    a.equal(g.buttons().length, 4);
    a.equal(g.value, 2);
    a.equal(g.buttons()[1].getAttribute("aria-checked"), "true", "the current value is the checked one");
    a.equal(g.buttons()[0].getAttribute("aria-checked"), "false");

    // exactly one tab stop, on the current value
    a.equal(g.buttons().filter(function (b) { return b.tabIndex === 0; }).length, 1, "roving tabindex: one stop");
    a.equal(g.buttons()[1].tabIndex, 0);

    g.buttons()[3].click();
    a.equal(g.value, 4); a.equal(picked.join(","), "4", "clicking reports once");
    a.equal(g.buttons()[3].getAttribute("aria-checked"), "true");
    a.equal(g.buttons()[1].getAttribute("aria-checked"), "false", "the old value is released");

    // arrows move, and stop at the ends rather than wrapping
    g.buttons()[3].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    a.equal(g.value, 3);
    g.buttons()[2].dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    a.equal(g.value, 1);
    g.buttons()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    a.equal(g.value, 1, "the first option does not wrap to the last");
    g.buttons()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    a.equal(g.value, 4);

    // every button is a real touch target (SPEC section 6)
    g.buttons().forEach(function (b) { a.ok(b.getBoundingClientRect().height >= 44, "44 px tall"); });

    // re-ranging: the value survives when it still exists, else falls to the nearest below
    picked = [];
    a.equal(g.setValues([1, 2, 3, 4, 5], true), 4, "a surviving value is kept");
    a.equal(g.buttons().length, 5);
    a.equal(g.setValues([1, 2], true), 2, "a value that fell off drops to the largest that remains");
    a.equal(g.value, 2);
    a.equal(picked.length, 0, "a silent re-range reports nothing");
    a.equal(g.setValues([1, 2, 3]), 2, "still 2, so nothing is announced");
    a.equal(picked.length, 0);

    a.equal(g.set(99), 2, "a value outside the list is refused");
    a.equal(g.set(2), 2); a.equal(picked.length, 0, "setting the value it already has announces nothing");
    a.equal(g.set(3), 3); a.equal(picked.join(","), "3");
  });

})();
