"""
ch09_what_a_p_value_is_not.py — V09, Chapter 9. The one idea: three common
misreadings of a p-value, each struck out, then the one correct sentence built
word by word. The demo shows p as a shaded tail and its long-run behaviour; it
cannot say what the number means and does not mean.

Seed 20260927. The demo's test: H0 μ0 = 50, σ = 10 known, n = 25, two-sided z.
The sample is drawn from N(52.5, 10): a modest real effect, chosen so the seeded
sample gives a p between 0.01 and 0.10, a magnitude worth saying out loud. The
first choice, 54.5, gave p = 0.001 and the sentence "about 0 times in 100".
SciPy cross-checks (for the printed z):
  p = 2 * scipy.stats.norm.sf(abs(z))   — the scene uses erfc, see statlab_theme
  se = 10 / sqrt(25) = 2.0
Render (from video/): manim -qh -r 1920,1080 --fps 30 scenes/ch09_what_a_p_value_is_not.py WhatAPValueIsNot
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from statlab_theme import *  # noqa: F401,F403
import numpy as np

SCENE_ID = "ch09-what-a-p-value-is-not"
SEED = 20260927
MU0, SIGMA, N, TRUE_MU = 50.0, 10.0, 25, 52.5


def simulate(seed=SEED):
    rng = np.random.default_rng(seed)
    x = rng.normal(TRUE_MU, SIGMA, size=N)
    xbar = float(x.mean())
    se = SIGMA / np.sqrt(N)
    z = (xbar - MU0) / se
    p = 2.0 * (1.0 - normal_cdf(abs(z)))        # two-sided, computed
    # The closing sentence says "about k times in 100"; outside this range it would
    # read "0 times" or "40 times" and teach the wrong thing. Fail loudly instead.
    assert 0.01 <= p <= 0.10, f"seed {seed} gives p = {p:.4f}; pick TRUE_MU so p is teachable"
    return {"xbar": xbar, "se": float(se), "z": float(z), "p": float(p), "per100": int(round(100 * p))}


class WhatAPValueIsNot(Captioned, Scene):
    def strike(self, mob):
        line = Line(mob.get_left() + LEFT * 0.1, mob.get_right() + RIGHT * 0.1, color=STATLAB_WARN, stroke_width=5)
        line.move_to(mob.get_center())
        return line

    def construct(self):
        r = simulate()
        t = fit(title("What a p-value is not")).to_edge(UP, buff=0.5)
        self.cue("What a p-value is not.")
        self.go(FadeIn(t), rt=FAST); self.hold(1.6)

        # the test, with its computed p
        s = sentence([f"A sample of {N}. Its mean is {r['xbar']:.1f}.", f"Test μ₀ = {MU0:.0f} with σ = {SIGMA:.0f} known."]).next_to(t, DOWN, buff=0.5)
        m = fit(MathTex(rf"z = \frac{{{r['xbar']:.1f} - {MU0:.0f}}}{{{SIGMA:.0f}/\sqrt{{{N}}}}} = {r['z']:.2f}, \qquad p = {r['p']:.3f}")).move_to(ORIGIN)
        self.cue(f"A sample of {N}. Its mean is {r['xbar']:.1f}. Test μ₀ = {MU0:.0f} with σ = {SIGMA:.0f} known. z = {r['z']:.2f}, p = {r['p']:.3f}.")
        self.go(FadeIn(s), FadeIn(m), rt=FAST); self.hold(3.6)
        p_small = fit(MathTex(rf"p = {r['p']:.3f}")).scale(0.9).next_to(t, DOWN, buff=0.35)
        self.go(FadeOut(s), ReplacementTransform(m, p_small)); self.hold(0.6)

        # three misreadings, each struck out
        wrongs = [
            f"p is the probability that H₀ is true.",
            f"p is the probability the result is due to chance.",
            f"1 − p is the probability of a real effect.",
        ]
        shown = VGroup()
        for w in wrongs:
            line_text = fit(body(w))
            if shown:
                line_text.next_to(shown, DOWN, buff=0.45)
            else:
                line_text.next_to(p_small, DOWN, buff=0.7)
            self.cue(w + " No.")
            self.go(FadeIn(line_text), rt=FAST); self.hold(1.6)
            self.go(Create(self.strike(line_text)), rt=FAST)
            line_text.set_color(STATLAB_INK_SOFT)
            shown.add(line_text)
            self.hold(1.2)

        # the correct sentence, word by word
        self.go(FadeOut(shown), *[FadeOut(mm) for mm in self.mobjects if isinstance(mm, Line)], rt=FAST)
        lead = sentence(["The one correct sentence:"]).next_to(p_small, DOWN, buff=0.6)
        self.cue("The one correct sentence.")
        self.go(FadeIn(lead), rt=FAST); self.hold(0.8)
        words = f"If H₀ were true, a result at least this extreme would occur about {r['per100']} times in 100.".split(" ")
        rows_text = [" ".join(words[:8]), " ".join(words[8:])]
        # One Text per row, revealed a word at a time by glyph range: Manim drops
        # spaces from a Text's glyphs, so a word's glyphs are a contiguous slice.
        rows = VGroup(*[body(rt) for rt in rows_text]).arrange(DOWN, buff=0.25)
        rows.next_to(lead, DOWN, buff=0.5)
        if rows.width > config.frame_width * 0.9:
            rows.scale_to_fit_width(config.frame_width * 0.9)
        groups = []
        for row, rt in zip(rows, rows_text):
            i = 0
            for w in rt.split(" "):
                n = len(w)
                groups.append(row[i:i + n])
                i += n
        for g in groups:
            g.set_opacity(0)
        self.add(rows)
        self.cue(" ".join(words))
        for g in groups:
            self.go(g.animate.set_opacity(1), rt=0.22)
        self.hold(3.8)
        block = rows

        # the reversal, named
        s_end = sentence(["p describes the data, assuming H₀.", "It never describes H₀, given the data."]).next_to(block, DOWN, buff=0.6)
        if s_end.get_bottom()[1] < -config.frame_height / 2 + 0.4:
            s_end.to_edge(DOWN, buff=0.5)
        self.cue("p describes the data, assuming H₀. It never describes H₀, given the data.")
        self.go(FadeIn(s_end), rt=FAST); self.hold(3.6)
        self.save_captions(SCENE_ID)
        print(f"STATLAB-NUMBERS seed={SEED} xbar={r['xbar']:.6f} se={r['se']:.6f} z={r['z']:.6f} p={r['p']:.6f} per100={r['per100']}")
