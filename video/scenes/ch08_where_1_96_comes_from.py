"""
ch08_where_1_96_comes_from.py — V08, Chapter 8. The one idea: 95% and 1.96 are
the same fact about the standard normal. Shade the middle 95%, see 2.5% in each
tail, read off the z that cuts them, then watch the interval assemble from x̄, z
and σ/√n. The demo draws intervals and counts captures; it cannot show where the
constant comes from.

Seed 20260927. z is computed by bisection on the erfc-based CDF (statlab_theme),
never typed. The demo's setting: μ = 50, σ = 10 known, n = 20, level 95%.
SciPy cross-checks:
  scipy.stats.norm.ppf(0.975) = 1.959963984540054
  scipy.stats.norm.cdf(1.96) - scipy.stats.norm.cdf(-1.96) = 0.950004209703559
  se = 10 / sqrt(20) = 2.23606797749979
Render (from video/): manim -qh -r 1920,1080 --fps 30 scenes/ch08_where_1_96_comes_from.py Where196ComesFrom
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from statlab_theme import *  # noqa: F401,F403
import numpy as np

SCENE_ID = "ch08-where-1-96-comes-from"
SEED = 20260927
MU, SIGMA, N, LEVEL = 50.0, 10.0, 20, 0.95


def simulate(seed=SEED):
    rng = np.random.default_rng(seed)
    z = normal_quantile(1 - (1 - LEVEL) / 2)            # 1.959964, computed
    middle = normal_cdf(z) - normal_cdf(-z)             # 0.95
    tail = 1 - normal_cdf(z)                            # 0.025
    x = rng.normal(MU, SIGMA, size=N)
    xbar = float(x.mean())
    se = SIGMA / np.sqrt(N)
    half = z * se
    return {"z": float(z), "middle": float(middle), "tail": float(tail), "xbar": xbar,
            "se": float(se), "half": float(half), "lo": xbar - half, "hi": xbar + half}


def pdf(v):
    return np.exp(-0.5 * v * v) / np.sqrt(2 * np.pi)


class Where196ComesFrom(Captioned, Scene):
    def construct(self):
        r = simulate()
        z = r["z"]
        t = fit(title("Where 1.96 comes from")).to_edge(UP, buff=0.5)
        self.cue("Where 1.96 comes from.")
        self.go(FadeIn(t), rt=FAST); self.hold(1.6)

        # the standard normal, the middle 95% shaded
        s = sentence(["Shade the middle 95% of the standard normal."]).next_to(t, DOWN, buff=0.45)
        x_len = min(config.frame_width * 0.88, 10.5)
        y_len = 3.0 if is_portrait() else 3.8
        ax = Axes(x_range=[-4, 4, 1], y_range=[0, 0.45, 0.45], x_length=x_len, y_length=y_len,
                  axis_config={"color": STATLAB_LINE, "include_ticks": False, "stroke_width": 2}, tips=False)
        curve = ax.plot(pdf, x_range=[-4, 4], color=STATLAB_INK, stroke_width=3)
        mid = ax.get_area(curve, x_range=[-z, z], color=STATLAB_ACCENT_SOFT, opacity=1.0)
        pic = VGroup(ax, mid, curve)
        room_top = s.get_bottom()[1] - 0.3
        room_bottom = -config.frame_height / 2 + 0.7
        pic.move_to([0, (room_top + room_bottom) / 2, 0])
        mid_label = body(f"{100 * r['middle']:.0f}%").move_to(ax.c2p(0, 0.16))
        self.cue("Shade the middle 95% of the standard normal.")
        self.go(FadeIn(s), Create(ax), Create(curve), rt=NORMAL_T)
        self.go(FadeIn(mid), FadeIn(mid_label), rt=NORMAL_T); self.hold(2.6)

        # the two tails
        s2 = sentence(["That leaves 2.5% in each tail."]).move_to(s)
        left = ax.get_area(curve, x_range=[-4, -z], color=STATLAB_WARN, opacity=0.55)
        right = ax.get_area(curve, x_range=[z, 4], color=STATLAB_WARN, opacity=0.55)
        tl = small(f"{100 * r['tail']:.1f}%").next_to(ax.c2p(-2.6, 0.02), UP, buff=0.35)
        tr = small(f"{100 * r['tail']:.1f}%").next_to(ax.c2p(2.6, 0.02), UP, buff=0.35)
        self.cue("That leaves 2.5% in each tail.")
        self.go(FadeOut(s), FadeIn(s2), FadeIn(left), FadeIn(right), FadeIn(tl), FadeIn(tr)); self.hold(2.8)

        # the z that cuts them
        s3 = sentence([f"The z that cuts off 2.5% is {z:.2f}.", "Read it off the curve, not a table."]).move_to(s)
        lz = DashedLine(ax.c2p(-z, 0), ax.c2p(-z, pdf(-z)), color=STATLAB_INK_SOFT, dash_length=0.1)
        rz = DashedLine(ax.c2p(z, 0), ax.c2p(z, pdf(z)), color=STATLAB_INK_SOFT, dash_length=0.1)
        lzl = small(f"−{z:.2f}").next_to(ax.c2p(-z, 0), DOWN, buff=0.12)
        rzl = small(f"+{z:.2f}").next_to(ax.c2p(z, 0), DOWN, buff=0.12)
        self.cue(f"The z that cuts off 2.5% is {z:.2f}. Read it off the curve, not a table.")
        self.go(FadeOut(s2), FadeIn(s3), Create(lz), Create(rz), FadeIn(lzl), FadeIn(rzl)); self.hold(3.4)

        # the interval assembles
        self.go(FadeOut(VGroup(pic, mid_label, left, right, tl, tr, lz, rz, lzl, rzl)), FadeOut(s3), rt=FAST)
        s4 = sentence(["A 95% interval reaches 1.96 standard errors", "either side of the sample mean."]).next_to(t, DOWN, buff=0.5)
        f1 = fit(MathTex(r"\bar x \;\pm\; z \cdot \frac{\sigma}{\sqrt{n}}")).move_to(ORIGIN)
        self.cue("A 95% interval reaches 1.96 standard errors either side of the sample mean.")
        self.go(FadeIn(s4), FadeIn(f1), rt=FAST); self.hold(1.8)
        f2 = fit(MathTex(rf"\bar x \;\pm\; {z:.2f} \cdot \frac{{\sigma}}{{\sqrt{{n}}}}")).move_to(ORIGIN)
        self.go(ReplacementTransform(f1, f2)); self.hold(2.0)

        # one real sample
        s5 = sentence([f"One sample of {N} from a population with σ = {SIGMA:.0f}.", f"Its mean is {r['xbar']:.1f}."]).move_to(s4)
        f3 = fit(MathTex(rf"{r['xbar']:.1f} \;\pm\; {z:.2f} \cdot \frac{{{SIGMA:.0f}}}{{\sqrt{{{N}}}}}")).move_to(ORIGIN)
        self.cue(f"One sample of {N} from a population with σ = {SIGMA:.0f}. Its mean is {r['xbar']:.1f}.")
        self.go(FadeOut(s4), FadeIn(s5), ReplacementTransform(f2, f3)); self.hold(2.2)
        f4 = fit(MathTex(rf"{r['xbar']:.1f} \;\pm\; {r['half']:.2f} \;=\; [\,{r['lo']:.1f},\; {r['hi']:.1f}\,]")).move_to(ORIGIN)
        self.cue(f"{r['xbar']:.1f} plus or minus {r['half']:.2f}, so {r['lo']:.1f} to {r['hi']:.1f}.")
        self.go(ReplacementTransform(f3, f4)); self.hold(3.0)

        # the constant is the curve's, not the data's
        s6 = sentence(["Change 95% and the 1.96 changes with it.", "The shape of the curve decides, not the data."]).move_to(s5)
        self.cue("Change 95% and the 1.96 changes with it. The shape of the curve decides, not the data.")
        self.go(FadeOut(s5), FadeIn(s6), rt=FAST); self.hold(4.0)
        self.save_captions(SCENE_ID)
        print(f"STATLAB-NUMBERS seed={SEED} z={z:.9f} middle={r['middle']:.9f} tail={r['tail']:.9f} "
              f"xbar={r['xbar']:.6f} se={r['se']:.6f} half={r['half']:.6f} lo={r['lo']:.4f} hi={r['hi']:.4f}")
