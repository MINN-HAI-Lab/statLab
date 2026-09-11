# DESIGN.md — StatLab Visual Language

Binding for all UI work. Subordinate to SPEC.md and HANDBOOK.md; where this file adds
detail they leave open, follow it. Claude Code: read this before any styling, layout, or
motion work, and audit your output against §7 before reporting done.

---

## 1. The one-line brief

A quiet university reading room that happens to compute. Confident, warm, unhurried —
closer to a well-set textbook or a Tufte page than to a SaaS dashboard or a landing page.

## 2. Aesthetic family

**Warm editorial minimalism.** Reference points for *feeling*, never for copying:
the typographic calm of a good print statistics text; the restraint of Seeing Theory's
white space; the information density of a well-made field guide.

Explicitly NOT: startup landing page, glassmorphism, neon, brutalism, neumorphism,
dark-mode-as-aesthetic, gradient meshes, 3D anything, dashboard chrome.

## 3. Anti-slop list (reject on sight)

These are the default fingerprints of AI-generated UI. None may appear in StatLab:

- Purple-to-blue or any decorative gradient; gradient text
- Glassmorphism, backdrop blur, stacked drop shadows, glowing borders
- Emoji as iconography or section markers
- Hero sections with oversized centered headlines and a "Get started" CTA
- Card grids where every card is identical and nothing earns emphasis
- Rounded-everything (pill buttons on rectangular cards on rounded panels)
- Animation on page load, scroll-triggered reveals, parallax, marquees
- Generic geometric sans at 16px/1.5 with no typographic hierarchy
- Centered body text; text columns wider than --measure
- Saturated "success green / danger red" semantic colors from a UI framework palette
- Decorative SVG blobs, dot grids, or noise textures

## 4. Typography

- One family: the system stack in --font. No webfonts (HANDBOOK §2).
- Hierarchy comes from size, weight, and space — never from color or ALL CAPS.
- Body at --fs-1, line-height 1.6, max width --measure (68ch). Never wider.
- Headings: --fs-4 page title, --fs-3 section, --fs-2 sub-section. Weight 600 max; no
  800/900. The scale itself is locked in HANDBOOK Section 5 and this file does not
  redefine it (D-049).
- Numbers in demos use --font-mono so digits don't jump while animating.
- Section text sits left of or above its demo — the demo is the focal point, not the prose.

## 5. Color discipline

- Tokens only (HANDBOOK §5 as amended). Never a literal hex outside theme.css.
- Default state of a page is near-monochrome. Color is a *signal*, not decoration.
- --accent marks exactly one thing: what the student can touch, plus the primary data mark.
- --accent-2 marks the advanced tier only. --ok / --warn only for genuine outcome states
  (interval captured / missed). Never for general emphasis.
- Every chart must survive grayscale: encode meaning in position, shape, or label first,
  color second (SPEC §6).
- Both themes are first-class. Dark mode is not a filter — verify each chart separately.

## 6. Motion

Motion exists to show causation (this input changed that mark), never to delight.

- 150–250ms ease-out for state changes; nothing animates on page load.
- Simulation animations may run longer but must start within 100ms of input (SPEC D2).
- Axes and scales hold still while data accumulates (SPEC D7). Rescale rarely, smoothly.
- `prefers-reduced-motion` replaces continuous animation with stepped updates. Test it.
- No hover-lift, no scale-on-hover, no shimmer, no skeleton loaders (nothing loads).

## 7. Self-audit before reporting done

Answer each in the delivery report, honestly:

1. Screenshot the page in both themes at 360px and 1280px. Look at all four.
2. Does anything on the anti-slop list (§3) appear? Remove it.
3. Squint test: is the single most important element the most visually prominent one?
4. Grayscale test: is every chart still readable?
5. Is there any color, border, shadow, or animation that carries no information?
   Delete it. Reduction is the default move.
6. Does the page look like it belongs in the same book as the other pages?

## 8. When in doubt

Remove something. StatLab's differentiator is clarity under pressure — a student on a
phone, in a lecture, with 40 seconds. Every decorative element spends attention that
belongs to the mathematics.
