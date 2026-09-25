# /video — StatLab's Manim render pipeline (development only)

This folder renders the short reinforcement videos that a chapter page may carry
(SPEC Amendment S2). It is a **development tool, not part of the site**.

**The site never depends on anything in here.** No page, script or stylesheet
imports or references `/video/`. Delete the whole folder and the site still
builds, deploys and passes every gate. That quarantine is a rule, recorded in
HANDBOOK Amendment H4, and is re-verified whenever this folder changes.

## What is in here

| Path | Role |
|---|---|
| `statlab_theme.py` | StatLab's visual language for Manim: the light-theme palette read from `assets/css/theme.css`, the type hierarchy, the motion rules, and the two render presets. Every scene imports it and hard-codes nothing. |
| `scenes/` | One Python file per scene. Pilot: `ch07_standard_error.py`. |
| `requirements.txt` | Exact pins. |
| `.gitignore` | `media/`, `*.mp4`, `.venv/`, `__pycache__/` — rendered output is never committed. |

## Prerequisites (Apple Silicon)

Manim needs FFmpeg for encoding and a LaTeX distribution for `MathTex`.

```sh
brew install ffmpeg
brew install --cask basictex        # or mactex-no-gui; then open a new shell
brew install webp                    # cwebp, for the poster image
```

## Set up (a venv, never a global install)

```sh
cd video
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Render

Two presets, both 30 fps. Run from `video/`.

```sh
# landscape 1920x1080
.venv/bin/manim -qh -r 1920,1080 --fps 30 scenes/ch07_standard_error.py StandardError -o ch07-standard-error-landscape.mp4

# vertical 1080x1920
.venv/bin/manim -qh -r 1080,1920 --fps 30 scenes/ch07_standard_error.py StandardError -o ch07-standard-error-vertical.mp4
```

Output lands under `media/videos/…` (ignored by git). The scene prints its
timeline and every number it drew to the terminal; those feed the captions
file and the transcript in `chapters.js`.

Report the delivered size at H.264 CRF 23, which is what the site expects:

```sh
ffmpeg -i media/videos/ch07_standard_error/1080p30/ch07-standard-error-landscape.mp4 \
  -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart -an \
  ch07-standard-error-landscape.crf23.mp4
```

Poster (a frame from the finished render, under 60 KB as WebP):

```sh
ffmpeg -ss 00:00:27 -i ch07-standard-error-landscape.crf23.mp4 -frames:v 1 poster.png
cwebp -q 78 -resize 1280 0 poster.png -o ../assets/video/ch07/poster.webp
```

## Publishing a finished video

1. Upload the CRF-23 mp4 as an asset on a GitHub Release of this repository.
2. Paste the asset URL into the chapter's `video.url` in `assets/js/chapters.js`,
   replacing the placeholder. Until then the page shows the poster and the
   transcript and makes no request.
3. Commit only the poster, the captions file and the transcript text. **Never
   commit an mp4** — `.gitignore` refuses it for a reason.

## Rules the scenes follow

- StatLab's palette only, never Manim's dark default (DESIGN Section 8).
- Every number on screen is computed with NumPy from a seeded generator, and
  cross-checked against SciPy in a comment — SPEC D3 applied to video.
- No narration, no music, no logo sting, no countdown. On-screen sentences under
  20 words.
