"""
ch07_standard_error.py — SYLLABUS 7.2 "The standard error". The pilot scene.

Teaches the step an interactive demo cannot: the reasoning from "variances of
independent draws add" to "the mean's variance is sigma squared over n" to "so
the spread shrinks like root n", as morphing algebra, then shows it happening
to real simulated sample means.

Nothing on screen is typed in (SPEC D3 applied to video). Every number is
computed here with NumPy from a SEEDED generator, and the claim is cross-checked
against SciPy in the comments beside it, the same convention tests/index.html
uses. The scene prints its timeline and its numbers when rendered; the captions
file and the transcript in chapters.js are written from that output, so the
three cannot drift.

Render (from video/, see README):
  manim -qh -r 1920,1080 --fps 30 scenes/ch07_standard_error.py StandardError
  manim -qh -r 1080,1920 --fps 30 scenes/ch07_standard_error.py StandardError
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from statlab_theme import *  # noqa: F401,F403
import numpy as np

SEED = 20260925          # the one seed; change it and every number on screen changes together
N_MEANS = 2000           # sample means per n, matching SAMPLES_PER_N in the 7.2 demo
NS = [1, 4, 16, 64]      # quadrupling n each step, so the spread halves each step
LO, HI = 0.0, 10.0       # the demo's default parent: Uniform(0, 10)
BINS = 40


def simulate(seed=SEED):
    """Every number the scene shows comes from here."""
    rng = np.random.default_rng(seed)
    # Var(Uniform(a, b)) = (b - a)^2 / 12, computed rather than typed.
    sigma = float(np.sqrt((HI - LO) ** 2 / 12.0))
    # scipy.stats.uniform(loc=0, scale=10).std()  ->  2.886751345948129
    # scipy.stats.uniform(loc=0, scale=10).var()  ->  8.333333333333334
    panels = []
    for n in NS:
        means = rng.uniform(LO, HI, size=(N_MEANS, n)).mean(axis=1)
        panels.append({
            "n": n,
            "means": means,
            "sd": float(means.std(ddof=1)),   # sample SD of the means, n-1 (SYLLABUS conventions)
            "se": sigma / np.sqrt(n),         # the claim: sigma / sqrt(n)
            # scipy check for each n: scipy.stats.uniform(0, 10).std() / np.sqrt(n)
            #   n=1 -> 2.886751345948129   n=4 -> 1.4433756729740645
            #   n=16 -> 0.7216878364870323 n=64 -> 0.36084391824351615
        })
    return {"sigma": sigma, "panels": panels}


# On-screen sentences, each under 20 words (SYLLABUS reading level). Kept as
# lines so portrait can stack them; landscape joins them with a space.
BEATS = {
    "title": "Why the standard error is σ/√n",
    "setup": ["Take n independent draws from one population.", "Each draw has variance σ²."],
    "add":   ["Variances of independent draws add."],
    "mean":  ["The mean is the sum divided by n.", "Dividing by n divides the variance by n²."],
    "root":  ["Take the square root.", "The spread of the mean is σ over root n."],
    "sim":   ["Here are 2000 sample means at each n,", "drawn from a flat population. The pile narrows."],
    "close": ["Quadruple n and the spread halves.", "The square root is why."],
}


class StandardError(Scene):
    def setup(self):
        self.clock = 0.0
        self.marks = []

    # ---- a clock the captions can trust ----------------------------------------
    def go(self, *anims, rt=NORMAL_T):
        self.play(*anims, run_time=rt, rate_func=EASE)
        self.clock += rt

    def hold(self, t):
        self.wait(t)
        self.clock += t

    def mark(self, label):
        self.marks.append((label, self.clock))

    # ---- helpers ---------------------------------------------------------------
    def sentence(self, key):
        lines = BEATS[key]
        text = "\n".join(lines) if is_portrait() else " ".join(lines)
        return fit(body(text))

    def panel(self, p, x_len, y_len):
        counts, edges = np.histogram(p["means"], bins=BINS, range=(LO, HI), density=True)
        ymax = float(counts.max()) * 1.1
        ax = Axes(x_range=[LO, HI, 5], y_range=[0, ymax, ymax], x_length=x_len, y_length=y_len,
                  axis_config={"color": STATLAB_LINE, "include_ticks": False, "stroke_width": 2}, tips=False)
        bars = VGroup()
        for c, a, b in zip(counts, edges[:-1], edges[1:]):
            if c <= 0:
                continue
            w = ax.c2p(b, 0)[0] - ax.c2p(a, 0)[0]
            h = ax.c2p(0, c)[1] - ax.c2p(0, 0)[1]
            bars.add(Rectangle(width=w, height=h, fill_color=STATLAB_ACCENT, fill_opacity=1, stroke_width=0)
                     .move_to(ax.c2p((a + b) / 2, c / 2)))
        ends = VGroup(small("0").next_to(ax.c2p(LO, 0), DOWN, buff=0.08),
                      small("10").next_to(ax.c2p(HI, 0), DOWN, buff=0.08))
        head = small(f"n = {p['n']}")
        read = small(f"SD of means {p['sd']:.2f}   σ/√n {p['se']:.2f}")
        labels = VGroup(head, read).arrange(DOWN, buff=0.06).next_to(ends, DOWN, buff=0.12)
        if labels.width > x_len:
            labels.scale_to_fit_width(x_len)
        return VGroup(ax, bars, ends, labels)

    # ---- the scene --------------------------------------------------------------
    def construct(self):
        data = simulate()
        top = config.frame_height / 2

        # 1. title
        t = fit(title(BEATS["title"])).to_edge(UP, buff=0.5)
        self.mark("title")
        self.go(FadeIn(t), rt=FAST)
        self.hold(1.6)

        # 2. setup: n draws, each with variance sigma^2
        s = self.sentence("setup").next_to(t, DOWN, buff=0.5)
        m = fit(MathTex(r"X_1,\ X_2,\ \ldots,\ X_n \qquad \mathrm{Var}(X_i) = \sigma^2")).move_to(ORIGIN)
        self.mark("setup")
        self.go(FadeIn(s), FadeIn(m), rt=FAST)
        self.hold(3.0)

        # 3. variances add
        s2 = self.sentence("add").move_to(s)
        m1 = fit(MathTex(r"\mathrm{Var}(X_1 + \cdots + X_n) = \sigma^2 + \cdots + \sigma^2")).move_to(ORIGIN)
        self.mark("add")
        self.go(FadeOut(s), FadeIn(s2), ReplacementTransform(m, m1))
        self.hold(1.8)
        m2 = fit(MathTex(r"\mathrm{Var}(X_1 + \cdots + X_n) = n\sigma^2")).move_to(ORIGIN)
        self.go(ReplacementTransform(m1, m2))
        self.hold(2.0)

        # 4. the mean divides by n, so the variance divides by n^2
        s3 = self.sentence("mean").move_to(s)
        m3 = fit(MathTex(r"\mathrm{Var}(\bar X) = \mathrm{Var}\!\left(\frac{X_1 + \cdots + X_n}{n}\right) = \frac{n\sigma^2}{n^2}")).move_to(ORIGIN)
        self.mark("mean")
        self.go(FadeOut(s2), FadeIn(s3), ReplacementTransform(m2, m3))
        self.hold(2.2)
        m4 = fit(MathTex(r"\mathrm{Var}(\bar X) = \frac{\sigma^2}{n}")).move_to(ORIGIN)
        self.go(ReplacementTransform(m3, m4))
        self.hold(2.0)

        # 5. square root
        s4 = self.sentence("root").move_to(s)
        m5 = fit(MathTex(r"\mathrm{SD}(\bar X) = \frac{\sigma}{\sqrt{n}}")).move_to(ORIGIN)
        self.mark("root")
        self.go(FadeOut(s3), FadeIn(s4), ReplacementTransform(m4, m5))
        self.hold(2.4)

        # 6. the simulation: the formula moves up to make room, then four piles
        s5 = self.sentence("sim")
        m5_small = m5.copy().scale(0.8).next_to(t, DOWN, buff=0.35)
        s5.next_to(m5_small, DOWN, buff=0.35)
        self.mark("sim")
        self.go(FadeOut(s4), ReplacementTransform(m5, m5_small), FadeIn(s5))

        if is_portrait():
            x_len, y_len = 1.75, 1.45
            panels = VGroup(*[self.panel(p, x_len, y_len) for p in data["panels"]])
            panels.arrange_in_grid(rows=2, cols=2, buff=0.35)
        else:
            x_len, y_len = 2.7, 1.9
            panels = VGroup(*[self.panel(p, x_len, y_len) for p in data["panels"]])
            panels.arrange(RIGHT, buff=0.35)
        available = (s5.get_bottom()[1] - 0.35) - (-top + 0.45)
        if panels.height > available:
            panels.scale_to_fit_height(available)
        if panels.width > config.frame_width * 0.92:
            panels.scale_to_fit_width(config.frame_width * 0.92)
        panels.next_to(s5, DOWN, buff=0.35)
        for pnl in panels:
            self.go(FadeIn(pnl), rt=FAST)
            self.hold(0.9)
        self.hold(2.6)

        # 7. close
        s6 = self.sentence("close").move_to(s5)
        self.mark("close")
        self.go(FadeOut(s5), FadeIn(s6), rt=FAST)
        self.hold(3.4)
        self.mark("end")

        # ---- printed for the captions file and the transcript ---------------------
        print("STATLAB-TIMELINE")
        for label, at in self.marks:
            print(f"  {at:6.2f}s  {label}")
        print(f"STATLAB-NUMBERS  seed={SEED}  sigma={data['sigma']:.6f}")
        for p in data["panels"]:
            print(f"  n={p['n']:3d}  sd_of_means={p['sd']:.6f}  sigma_over_sqrt_n={p['se']:.6f}")
