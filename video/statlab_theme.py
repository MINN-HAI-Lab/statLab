"""
statlab_theme.py — StatLab's visual language for Manim.

Every scene imports this and hard-codes nothing. It exists so a video reads as
the same object as the site: same paper, same ink, same teal, same type
hierarchy, same restraint in motion (docs/DESIGN.md).

Values below were READ FROM assets/css/theme.css, the `:root` (light) block, on
2026-09-25. They are copied rather than parsed on purpose: a render must not
depend on the site tree. Diff the two by hand whenever theme.css changes.
"""
import math
import os

from manim import *  # noqa: F401,F403  (scenes expect the Manim namespace through here)
from manim import config, Text, MathTex, Tex, smooth, linear, SEMIBOLD, NORMAL

# ---- Palette: light theme tokens, verbatim from theme.css :root ----------------
STATLAB_BG            = "#FAF8F4"   # --bg          warm off-white page background
STATLAB_SURFACE       = "#FFFFFF"   # --surface     cards, demo panels
STATLAB_INK           = "#282725"   # --ink         body text, axis text
STATLAB_INK_SOFT      = "#6B6560"   # --ink-soft    secondary text, captions
STATLAB_LINE          = "#E4E0DA"   # --line        borders, gridlines
STATLAB_ACCENT        = "#2E7D6B"   # --accent      primary data, interactive
STATLAB_ACCENT_STRONG = "#1F5A4D"   # --accent-strong
STATLAB_ACCENT_SOFT   = "#D9EBE5"   # --accent-soft fills
STATLAB_ACCENT_2      = "#7555A5"   # --accent-2    advanced tier
STATLAB_ACCENT_2_SOFT = "#E7DFF2"   # --accent-2-soft
CAT_1 = "#2E7D6B"                   # --cat-1 … --cat-5, categorical series
CAT_2 = "#B5763F"
CAT_3 = "#4E7DA6"
CAT_4 = "#9A5D8F"
CAT_5 = "#8A8F3C"
STATLAB_OK            = "#4C8B57"   # --ok          genuine "captured" outcome only
STATLAB_WARN          = "#C06A2E"   # --warn        genuine "missed" outcome only

# The background is the page, never Manim's default dark (DESIGN Section 8).
config.background_color = STATLAB_BG

# Text and formulas default to ink so no scene has to remember to say so.
Text.set_default(color=STATLAB_INK)
MathTex.set_default(color=STATLAB_INK)
Tex.set_default(color=STATLAB_INK)

# ---- Type: the site's hierarchy, DESIGN Section 4 ------------------------------
# theme.css: --fs-4 2.1rem title, --fs-3 1.6rem section, --fs-2 1.25rem sub,
# --fs-1 1rem body, --fs-0 0.875rem small. Manim sizes are in its own units; the
# ratios below are the site's (2.1 : 1.6 : 1.25 : 1 : 0.875), scaled to read at
# 1080p. Weight 600 max, never 800/900.
FONT = "Helvetica Neue"   # nearest local face to the site's system stack
_BASE = 30
FS = {"title": _BASE * 2.1, "section": _BASE * 1.6, "sub": _BASE * 1.25, "body": _BASE, "small": _BASE * 0.875}

def title(s):   return Text(s, font=FONT, font_size=FS["title"],   weight=SEMIBOLD)
def section(s): return Text(s, font=FONT, font_size=FS["section"], weight=SEMIBOLD)
def body(s):    return Text(s, font=FONT, font_size=FS["body"])
def small(s):   return Text(s, font=FONT, font_size=FS["small"], color=STATLAB_INK_SOFT)

def fit(m, fraction=0.88):
    """Shrink a mobject to the frame's width if it is wider; never enlarge."""
    limit = config.frame_width * fraction
    if m.width > limit:
        m.scale_to_fit_width(limit)
    return m

# ---- Motion: DESIGN Section 6 in spirit ----------------------------------------
# State changes ease out with no overshoot; nothing bounces; nothing moves that
# is not carrying information. `smooth` is Manim's smoothstep, monotone in [0, 1].
EASE = smooth
FAST, NORMAL_T, SLOW = 0.4, 0.8, 1.2   # seconds; a fade is FAST, a morph NORMAL_T

# ---- Render presets -------------------------------------------------------------
# Passed on the command line (README): -r W,H --fps 30. Kept here so the numbers
# have one home. Manim keeps frame_height at 8 and derives frame_width from the
# pixel aspect, so a portrait render is 4.5 units wide against 14.2 for landscape.
PRESETS = {
    "landscape": {"pixel_width": 1920, "pixel_height": 1080, "frame_rate": 30},
    "portrait":  {"pixel_width": 1080, "pixel_height": 1920, "frame_rate": 30},
}

def is_portrait():
    return config.frame_width < config.frame_height

# ---- Numbers that NumPy does not provide ---------------------------------------
# The standard normal CDF and its inverse, so a scene can compute 1.96 or a p-value
# rather than type it (SPEC D3). erfc is the closed form; the quantile is a
# bisection on it. Cross-checks: scipy.stats.norm.cdf(1.96) = 0.9750021048517795,
# scipy.stats.norm.ppf(0.975) = 1.959963984540054.
def normal_cdf(z):
    return 0.5 * math.erfc(-z / math.sqrt(2.0))

def normal_quantile(p, lo=-12.0, hi=12.0):
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if normal_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)

# ---- Captions generated from the scene, never hand-typed -----------------------
# A scene mixes this in. `go` and `hold` keep a clock the captions can trust; `cue`
# opens a caption at the current clock and closes the previous one; `caption` is
# the explicit primitive. `save_captions` writes video/assets/<id>/captions.vtt and
# transcript.txt from the same list, so the two cannot drift, and the site's inline
# transcript is checked against that .txt by tools/check-content.mjs.
ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")

class Captioned:
    def setup(self):
        self.clock = 0.0
        self.cues = []
        self._open = None

    def go(self, *anims, rt=NORMAL_T):
        self.play(*anims, run_time=rt, rate_func=EASE)
        self.clock += rt

    def hold(self, t):
        self.wait(t)
        self.clock += t

    def caption(self, text, start, end):
        self.cues.append((float(start), float(end), text))

    def cue(self, text):
        self.end_cues()
        self._open = (self.clock, text)

    def end_cues(self):
        if self._open is not None:
            start, text = self._open
            if self.clock > start:
                self.caption(text, start, self.clock)
            self._open = None

    def save_captions(self, scene_id):
        self.end_cues()
        out = os.path.join(ASSETS_DIR, scene_id)
        os.makedirs(out, exist_ok=True)
        def ts(t):
            m = int(t // 60)
            return f"{m:02d}:{t - 60 * m:06.3f}"
        with open(os.path.join(out, "captions.vtt"), "w", encoding="utf-8") as f:
            f.write("WEBVTT\nNOTE Generated by the scene from its caption calls. Do not hand-edit.\n\n")
            for i, (a, b, text) in enumerate(self.cues, 1):
                f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{text}\n\n")
        with open(os.path.join(out, "transcript.txt"), "w", encoding="utf-8") as f:
            for _, _, text in self.cues:
                f.write(text + "\n")
        print(f"STATLAB-CAPTIONS {len(self.cues)} cues, {self.clock:.2f}s -> {out}")

def sentence(lines):
    """Body text that stacks in portrait and runs on in landscape, fitted to the frame."""
    text = "\n".join(lines) if is_portrait() else " ".join(lines)
    return fit(body(text))
