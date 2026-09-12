/*
  counting__permutations-combinations.js — SYLLABUS §14.2 "Permutations and combinations".

  Teaches: choosing is not the same as arranging. Every combination of k items
  can be written in k! orders, so P(n, k) = C(n, k) × k!. The toggle switches
  between listing the choices and listing every order of each choice.

  Public:  demos.initPermutationsCombinations(containerEl) → api { setN(n), setK(k),
           setOrdered(flag), reset(), state() }
  Uses:    stats.choose, stats.permutations, stats.factorial;  ui.optionGroup, ui.button,
           ui.readout, ui.readoutRow;  no chart — the arrangements ARE the picture.

  Pattern per D-019 / D-020 §3 (two-state toggle with aria-pressed). The list is
  built from real enumeration, so the number of rows drawn always equals the
  formula's answer until the cap, past which the count is stated instead (D6).
  Rows are HTML, not SVG: they are text in a grid and must wrap on a phone.
*/
(function () {
  "use strict";

  window.demos = window.demos || {};

  var LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];
  var MIN_N = 2, MAX_N = 8, DEFAULT_N = 4;
  var MIN_K = 1, DEFAULT_K = 2;
  var MAX_ROWS = 120;                 // rows drawn before the list is truncated with a note
  var DEFAULT_ORDERED = false;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rangeOf(lo, hi) { var out = []; for (var i = lo; i <= hi; i++) out.push(i); return out; }

  window.demos.initPermutationsCombinations = function (container) {
    var state = { n: DEFAULT_N, k: DEFAULT_K, ordered: DEFAULT_ORDERED };

    /* ---- controls ---------------------------------------------------- */
    var modeGroup = document.createElement("div"); modeGroup.className = "ui-controls"; modeGroup.setAttribute("role", "group"); modeGroup.setAttribute("aria-label", "Whether order matters");
    var chooseButton = ui.button({ label: "Order does not matter", onClick: function () { setOrdered(false); } });
    var arrangeButton = ui.button({ label: "Order matters", onClick: function () { setOrdered(true); } });
    chooseButton.setAttribute("aria-pressed", "false"); arrangeButton.setAttribute("aria-pressed", "false");
    modeGroup.appendChild(chooseButton); modeGroup.appendChild(arrangeButton);
    var resetButton = ui.button({ label: "Reset", onClick: reset });
    modeGroup.appendChild(resetButton);
    /* Pickers rather than sliders (D-051). Seven and fewer values sit too far apart
       on a range track to drag, and k's range depends on n, which a range input
       could not show honestly: its painted fill was computed from the max it was
       built with, so the thumb and the fill disagreed whenever n was below 8. */
    var nPicker = ui.optionGroup({ label: "Items to choose from, n", values: rangeOf(MIN_N, MAX_N), value: DEFAULT_N, onChange: setN });
    var kPicker = ui.optionGroup({ label: "Items chosen, k", values: rangeOf(MIN_K, DEFAULT_N), value: DEFAULT_K, onChange: setK });

    var cOut = ui.readout({ label: "Combinations C(n, k)", decimals: 0, accent: true });
    var pOut = ui.readout({ label: "Permutations P(n, k)", decimals: 0, accent: true });
    var factOut = ui.readout({ label: "Orders per choice, k!", decimals: 0 });
    var shownOut = ui.readout({ label: "Rows listed", decimals: 0 });
    var equation = document.createElement("p"); equation.className = "demo__status"; equation.setAttribute("data-eq", "");
    var status = document.createElement("p"); status.className = "demo__status"; status.setAttribute("role", "status");
    var note = document.createElement("p"); note.className = "demo__status demo__note"; note.hidden = true;

    container.appendChild(nPicker.el);
    container.appendChild(kPicker.el);
    container.appendChild(modeGroup);
    container.appendChild(ui.readoutRow([cOut, pOut, factOut, shownOut]));
    container.appendChild(equation);
    container.appendChild(status);
    container.appendChild(note);

    var listWrap = document.createElement("div"); listWrap.className = "arrangement-list";
    listWrap.setAttribute("role", "list");
    listWrap.setAttribute("aria-label", "Every way to pick the items");
    container.appendChild(listWrap);
    var legend = document.createElement("p"); legend.className = "demo__status";
    container.appendChild(legend);

    /* ---- updates ------------------------------------------------------- */
    function setN(v) {
      state.n = clamp(Math.round(v), MIN_N, MAX_N);
      nPicker.set(state.n, true);
      // k can only ever be 1..n, so the choices themselves change with n and
      // k drops to the largest one that survives.
      state.k = kPicker.setValues(rangeOf(MIN_K, state.n), true);
      render();
    }
    function setK(v) {
      state.k = clamp(Math.round(v), MIN_K, state.n);
      kPicker.set(state.k, true);
      render();
    }
    function setOrdered(flag) { state.ordered = !!flag; render(); }
    function reset() {
      state.n = DEFAULT_N; state.k = DEFAULT_K; state.ordered = DEFAULT_ORDERED;
      nPicker.set(DEFAULT_N, true);
      kPicker.setValues(rangeOf(MIN_K, DEFAULT_N), true);
      kPicker.set(DEFAULT_K, true);
      render();
    }

    /** Every k-subset of the first n labels, in lexicographic order. */
    function combinations(n, k) {
      var out = [];
      (function build(start, picked) {
        if (picked.length === k) { out.push(picked.slice()); return; }
        for (var i = start; i < n; i++) { picked.push(i); build(i + 1, picked); picked.pop(); }
      })(0, []);
      return out;
    }
    /** Every ordering of one subset. */
    function orderings(items) {
      if (items.length <= 1) return [items.slice()];
      var out = [];
      items.forEach(function (v, i) {
        var rest = items.slice(0, i).concat(items.slice(i + 1));
        orderings(rest).forEach(function (tail) { out.push([v].concat(tail)); });
      });
      return out;
    }
    /** The rows the list shows: choices, or every order of every choice. */
    function rows() {
      var combos = combinations(state.n, state.k), out = [];
      for (var i = 0; i < combos.length && out.length < MAX_ROWS; i++) {
        if (!state.ordered) { out.push(combos[i]); continue; }
        var orders = orderings(combos[i]);
        for (var j = 0; j < orders.length && out.length < MAX_ROWS; j++) out.push(orders[j]);
      }
      return out;
    }

    /* ---- render ---------------------------------------------------------- */
    function render() {
      var c = stats.choose(state.n, state.k), p = stats.permutations(state.n, state.k), f = stats.factorial(state.k);
      var totalRows = state.ordered ? p : c, list = rows();
      chooseButton.setAttribute("aria-pressed", String(!state.ordered));
      arrangeButton.setAttribute("aria-pressed", String(state.ordered));
      cOut.set(c); pOut.set(p); factOut.set(f); shownOut.set(list.length);
      equation.textContent = state.ordered
        ? "P(" + state.n + ", " + state.k + ") = C(" + state.n + ", " + state.k + ") × " + state.k + "! = " + c + " × " + f + " = " + p
        : "C(" + state.n + ", " + state.k + ") = P(" + state.n + ", " + state.k + ") ÷ " + state.k + "! = " + p + " ÷ " + f + " = " + c;
      var choices = c === 1 ? "the single choice" : "each of the " + c + " choices";
      status.textContent = state.ordered
        ? "Order matters, so " + choices + " below is written out in all " + f + " of its orders, giving " + p + " arrangements."
        : "Order does not matter, so ABC and CAB are the same row. There " + (c === 1 ? "is 1 choice" : "are " + c + " choices") + ". Turn on “Order matters” and each one fans out into " + f + ".";
      note.hidden = list.length >= totalRows;
      note.textContent = "Showing the first " + list.length + " of " + totalRows + " rows. The count above is exact, and the list is cut so the page stays readable.";
      legend.textContent = "Each row is one way to pick " + state.k + " of the " + state.n + " letters" + (state.ordered ? ", read left to right." : ". A row is listed in alphabetical order but counted once however you shuffle it.");

      var sel = listWrap.querySelectorAll(".arrangement");
      for (var i = listWrap.childElementCount - 1; i >= list.length; i--) listWrap.removeChild(listWrap.lastChild);
      for (var j = listWrap.childElementCount; j < list.length; j++) {
        var row = document.createElement("div"); row.className = "arrangement"; row.setAttribute("role", "listitem");
        listWrap.appendChild(row);
      }
      list.forEach(function (r, idx) {
        var row = listWrap.children[idx], text = r.map(function (i2) { return LABELS[i2]; }).join(" ");
        if (row.textContent !== text) row.textContent = text;
      });
    }

    /* ---- initial state (D5) ------------------------------------------- */
    render();

    /* ---- api ------------------------------------------------------------ */
    return {
      el: container,
      setN: setN,
      setK: setK,
      setOrdered: setOrdered, reset: reset,
      rows: rows,
      state: function () {
        return { n: state.n, k: state.k, ordered: state.ordered, combinations: stats.choose(state.n, state.k),
          permutations: stats.permutations(state.n, state.k), factorial: stats.factorial(state.k), rows: rows() };
      },
      constants: { LABELS: LABELS.slice(), MIN_N: MIN_N, MAX_N: MAX_N, MIN_K: MIN_K, DEFAULT_N: DEFAULT_N, DEFAULT_K: DEFAULT_K, MAX_ROWS: MAX_ROWS, DEFAULT_ORDERED: DEFAULT_ORDERED }
    };
  };
})();
