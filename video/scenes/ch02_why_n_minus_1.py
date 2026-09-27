"""
ch02_why_n_minus_1.py — V02, Chapter 2. The one idea: why sample variance divides
by n − 1. Deviations from the sample mean sum to zero, so one deviation is fixed
by the others; dividing by n therefore underestimates on average; n − 1 counts the
free deviations. The demo shows deviation sticks and squares; it cannot show this.

Seed 20260927. Population N(50, 10) so the reference variance is 100.
SciPy cross-checks:
  scipy.stats.norm(50, 10).var() = 100.0
  E[sum d² / n] for n = 3 is (n−1)/n · 100 = 66.66666666666667
  E[sum d² / (n−1)] = 100.0
Render (from video/): manim -qh -r 1920,1080 --fps 30 scenes/ch02_why_n_minus_1.py WhyNMinusOne
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from statlab_theme import *  # noqa: F401,F403
import numpy as np

SCENE_ID = "ch02-why-n-minus-1"
SEED = 20260927
MU, SIGMA, N = 50.0, 10.0, 3
TRIALS = 20000


def simulate(seed=SEED):
    rng = np.random.default_rng(seed)
    x = np.round(rng.normal(MU, SIGMA, size=N), 1)          # the tiny example, shown to 1 dp
    d = x - x.mean()
    many = rng.normal(MU, SIGMA, size=(TRIALS, N))
    dev = many - many.mean(axis=1, keepdims=True)
    ss = (dev ** 2).sum(axis=1)
    return {
        "x": x, "mean": float(x.mean()), "d": d, "dsum": float(d.sum()),
        "avg_over_n": float((ss / N).mean()),          # ≈ 66.7
        "avg_over_n1": float((ss / (N - 1)).mean()),   # ≈ 100
        "true_var": SIGMA ** 2,                        # 100, the reference
    }


class WhyNMinusOne(Captioned, Scene):
    def construct(self):
        r = simulate()
        x, d = r["x"], r["d"]
        t = fit(title("Why sample variance divides by n − 1")).to_edge(UP, buff=0.5)
        self.cue("Why sample variance divides by n − 1.")
        self.go(FadeIn(t), rt=FAST); self.hold(1.6)

        # 1. three values and their mean
        s = sentence(["Three values from one population.", f"Their mean is {r['mean']:.1f}."]).next_to(t, DOWN, buff=0.5)
        m = fit(MathTex(rf"x_1 = {x[0]:.1f},\quad x_2 = {x[1]:.1f},\quad x_3 = {x[2]:.1f}\qquad \bar x = {r['mean']:.1f}")).move_to(ORIGIN)
        self.cue(f"Three values from one population. Their mean is {r['mean']:.1f}.")
        self.go(FadeIn(s), FadeIn(m), rt=FAST); self.hold(3.6)

        # 2. deviations sum to zero
        s2 = sentence(["Deviations from the sample mean", "always add up to zero."]).move_to(s)
        sign = lambda v: f"{v:+.1f}"
        m2 = fit(MathTex(rf"({sign(d[0])}) + ({sign(d[1])}) + ({sign(d[2])}) = {r['dsum']:.1f}")).move_to(ORIGIN)
        self.cue("Deviations from the sample mean always add up to zero.")
        self.go(FadeOut(s), FadeIn(s2), ReplacementTransform(m, m2)); self.hold(3.4)

        # 3. so one deviation is fixed by the others
        s3 = sentence(["So the third deviation is fixed by the other two.", "Only two are free."]).move_to(s)
        m3 = fit(MathTex(rf"d_3 = -\,(d_1 + d_2) = -\,({sign(d[0])} {sign(d[1])}) = {sign(d[2])}")).move_to(ORIGIN)
        self.cue("So the third deviation is fixed by the other two. Only two are free.")
        self.go(FadeOut(s2), FadeIn(s3), ReplacementTransform(m2, m3)); self.hold(3.6)

        # 4. dividing by n leans low
        s4 = sentence(["The sample mean sits closer to its own data than μ does.", "Dividing by n underestimates."]).move_to(s)
        self.cue("The sample mean sits closer to its own data than μ does. Dividing by n underestimates.")
        self.go(FadeOut(s3), FadeIn(s4), FadeOut(m3)); self.hold(3.0)

        # 5. the simulation: two averages against the true variance
        s5 = sentence([f"{TRIALS:,} samples of three from a population with variance 100.", "Average of each formula:"]).move_to(s)
        self.cue(f"{TRIALS:,} samples of three from a population with variance 100. Average of each formula.")
        self.go(FadeOut(s4), FadeIn(s5), rt=FAST)
        ymax = 120.0
        h = 2.8 if is_portrait() else 3.4
        scale = h / ymax
        def bar(value, label, color):
            rect = Rectangle(width=1.8, height=value * scale, fill_color=color, fill_opacity=1, stroke_width=0)
            cap = small(label)
            num = body(f"{value:.1f}")
            grp = VGroup(rect, num.next_to(rect, UP, buff=0.12), cap.next_to(rect, DOWN, buff=0.15))
            return grp
        b1 = bar(r["avg_over_n"], "sum d² / n", STATLAB_WARN)
        b2 = bar(r["avg_over_n1"], "sum d² / (n − 1)", STATLAB_ACCENT)
        bars = VGroup(b1, b2).arrange(RIGHT, buff=1.8, aligned_edge=DOWN)
        base_y = bars[0][0].get_bottom()[1]
        ref = DashedLine(bars.get_left() + LEFT * 0.9, bars.get_right() + RIGHT * 0.9, color=STATLAB_INK_SOFT, dash_length=0.12)
        ref.move_to([bars.get_center()[0], base_y + r["true_var"] * scale, 0])
        ref_label = small(f"true variance {r['true_var']:.0f}").next_to(ref, RIGHT, buff=0.15)
        if is_portrait():
            ref_label.next_to(ref, UP, buff=0.08).align_to(ref, RIGHT)
        pic = VGroup(bars, ref, ref_label)
        pic.next_to(s5, DOWN, buff=0.45)
        if pic.width > config.frame_width * 0.9:
            pic.scale_to_fit_width(config.frame_width * 0.9)
        self.go(FadeIn(b1[0]), FadeIn(b1[2]), rt=FAST); self.go(FadeIn(b1[1]), rt=FAST); self.hold(1.2)
        self.go(FadeIn(b2[0]), FadeIn(b2[2]), rt=FAST); self.go(FadeIn(b2[1]), rt=FAST); self.hold(0.8)
        self.go(Create(ref), FadeIn(ref_label), rt=NORMAL_T); self.hold(3.4)

        # 6. the correction, named
        s6 = sentence(["n − 1 counts the free deviations.", "That is the whole correction."]).move_to(s5)
        self.cue("n − 1 counts the free deviations. That is the whole correction.")
        self.go(FadeOut(s5), FadeIn(s6), rt=FAST); self.hold(4.0)
        self.save_captions(SCENE_ID)
        print(f"STATLAB-NUMBERS seed={SEED} x={x.tolist()} mean={r['mean']:.4f} dsum={r['dsum']:.6f} "
              f"avg_over_n={r['avg_over_n']:.4f} avg_over_n1={r['avg_over_n1']:.4f}")
