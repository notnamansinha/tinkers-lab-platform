# Codex Task: Visual Design System Replication — Tinkerers Lab Equipment Booking App

## 0. Read this whole file before writing any code

You are doing a **visual replication task**, not a feature-build task. The success criterion is
pixel-level fidelity to the reference screenshots described below, correctly translated into
this codebase's existing component architecture, tokens, and state (booking flow, safety
agreement, terms agreement). If any instruction below is ambiguous or the reference doesn't give
you enough information to make a decision confidently, **stop and ask — do not silently guess
and proceed.** A wrong guess that compiles is a worse outcome than a blocked task.

## 1. Context you must load before starting

1. Run `git log --oneline 2b02852585b5ed4c717b652702b3db1d3f841aa9` to see the full history up to
   and including that commit. Read the diffs (`git show <hash>`) for any commits touching
   `components/`, `styles/`, `tokens*`, or design-system files, so you understand the visual
   language that already existed at that point.
2. Run `git log --oneline 2b02852585b5ed4c717b652702b3db1d3f841aa9..HEAD` to see everything that
   has changed since, including the current state of the repo. Reconcile: if later commits already
   moved the design system in a direction consistent with the reference below, extend that work
   rather than reverting it. If they moved it in a conflicting direction, flag the conflict instead
   of silently overwriting.
3. Locate the current design-token source of truth (Tailwind config, CSS variables file, theme
   object — whatever this repo uses) and the current Safety Agreement / Terms Agreement / booking
   confirmation screens. These are the actual pages the new visual language applies to.
4. Do not invent a parallel token system. Extend the existing one.

## 2. Reference material

Four reference screenshots (attached to this prompt as images) show a moodboard of a bold,
high-contrast fintech-style UI ("mathical") used purely as **stylistic inspiration** — same
saturated color-blocking, same oversized rounded shapes, same chunky bar-chart language — not a
literal copy of that product's content. Content stays booking/lab-equipment specific (safety
agreement, terms agreement, equipment availability, coordinator approval). Only the visual
system transfers.

## 3. Design tokens — measured from the reference (not estimated)

These hex values were sampled directly from the reference screenshots via pixel/dominant-color
extraction, so treat them as ground truth, not a starting guess:

```css
:root {
  /* Brand */
  --color-brand-indigo:        #504BEF; /* primary — question/hero screens, primary CTA fills */
  --color-brand-indigo-light:  #6D69F2; /* hover/pressed tint, secondary card fill */

  /* Neutral / dark surfaces */
  --color-ink:                 #000000; /* true-black backgrounds behind logo/hero blocks */
  --color-surface-dark:        #0A0A0A; /* elevated dark card background */
  --color-surface-dark-alt:    #191919; /* secondary dark card / chart background */
  --color-line-dark:           #272727; /* dividers, subtle borders on dark surfaces */
  --color-neutral-mid:         #767676; /* secondary text on dark surfaces */

  /* Accents */
  --color-accent-pink:         #F67ADF; /* full-bleed accent screens, active states */
  --color-accent-pink-deep:    #D96DC5; /* pressed/shadow variant of pink */
  --color-accent-lime:         #E0EF4A; /* bar-chart segments, positive/highlight badges */
  --color-accent-orange:       #FFB249; /* bar-chart segments, warm accent badges */
  --color-plum-dark:           #3E1B37; /* dark-mode card variant, deep magenta-black */

  /* Light surfaces */
  --color-cream:                #FFF4C4; /* light-mode background block */
  --color-tan:                  #9F8B71; /* secondary light card, "steps" panels */
}
```

**Before you use these**, open the actual reference images at 2–3x zoom and eyedropper-verify
the exact fill on whichever element you're building — the sampling above hit representative
background regions but may have missed small text/icon colors (the yellow dot, small pink label
text, etc.). Extract those individually rather than reusing a neighboring background value.

## 4. Shape and typography language to replicate

- **Corner radius**: large, consistent rounding on every container — cards, buttons, phone-mockup
  frames, bar-chart segments all share one radius scale (do not mix sharp and rounded elements).
  Establish a `--radius-sm/md/lg/full` scale from the reference proportions and use it everywhere,
  including on individual bar-chart segments (bars are pill-shaped, not rectangular).
- **Buttons / pills**: fully rounded (radius = half height), solid single-color fill, no gradients
  on primary buttons.
- **Wordmark/logo lockup**: bold, tightly-tracked geometric sans, sits on pure black with a small
  flower/blob decorative glyph beside it. Treat this as a one-off brand asset, not a reusable
  component pattern.
- **Headline type** (question/hero screens): oversized, high-contrast weight, tight line-height,
  white or near-white on the indigo/black fields.
- **Body/label type** (dashboard, chart labels): much smaller, medium weight, muted neutral color
  on dark surfaces — establish clear hierarchy between headline and label scale (at least a 3:1
  size ratio).
- Do not introduce a new typeface if the codebase already has a defined type stack — map the
  reference's weight/size relationships onto the existing font family.

## 5. Component inventory to build/update

Build each of these as a real, reusable component (not one-off markup), matching the existing
component conventions in this repo (check naming, folder structure, and prop patterns before
creating new files):

1. **Full-bleed hero/question card** — indigo background, oversized headline, small input control
   pinned to bottom.
2. **Dark stat/dashboard card** — near-black background, small muted labels, one or two accent-
   colored data elements.
3. **Rounded bar chart component** — pill-shaped bars, mixed accent colors (lime/orange/pink)
   per-segment or per-series, smooth height transitions on data change (see §6), no visible axis
   lines, minimal/no gridlines.
4. **Agreement/consent card** — this is the actual functional target (Safety Agreement, Terms
   Agreement). Apply the visual system (rounding, color-blocking, type hierarchy) to the existing
   checkbox/consent UI without changing its underlying logic — this is a reskin, not a rebuild of
   the consent flow.
5. **Light "steps" panel** (tan/cream background variant) — for any onboarding or instructional
   copy blocks (e.g., "understand your finances and next steps" pattern → adapt copy to booking
   steps / coordinator approval flow).
6. **Phone-mockup frame** (if this repo has a marketing/landing surface that needs device
   mockups) — dark and light variants as shown in the reference.

## 6. Chart/graph requirements (the part that most needs to be "same-to-same")

- Bars must be pill-shaped (fully rounded top **and** bottom, or rounded top with square bottom —
  check the reference per-screenshot, don't assume one convention applies to all of them).
- Bar color assignment should cycle through the accent palette (lime, orange, pink) rather than
  using one flat color per chart, matching the reference's multi-color bar treatment.
- Height transitions on data change: ease-out cubic, ~300–400ms, no bounce/overshoot — reference
  reads as "smooth," not springy.
- Build this as SVG, not divs-with-border-radius-as-bars — you need real `<rect>`/`<path>` with
  `rx`/`ry` so the shape holds up at any scale, and so it composites cleanly with the rest of the
  SVG-based component set (§7).
- No hardcoded pixel dimensions inside the chart component — it must respond to container width
  via viewBox scaling, since it will render at different sizes across dashboard/mobile contexts.

## 7. SVG/asset optimization requirements

- Every icon, illustration, and chart element ships as optimized SVG: run through SVGO (or
  equivalent) — strip editor metadata, collapse redundant groups, use `viewBox` not fixed
  width/height, no embedded raster unless the source reference itself is a photo (e.g., the
  laptop-photo screenshot — that stays a raster image, don't vectorize a photograph).
- All colors in SVGs reference CSS custom properties from §3 (`fill="var(--color-accent-lime)"`),
  not hardcoded hex — this is what makes future theme/dark-mode changes not require touching
  every asset.
- Decorative SVGs (the flower/blob glyph, dot patterns) get `aria-hidden="true"`; functional/
  informational SVGs (charts) get proper `role` and text alternatives per this repo's existing
  accessibility conventions.
- No inline `<style>` blocks duplicating token values — single source of truth is §3.

## 8. Alignment / QA checklist — run this before calling anything done

For every component you build against a specific reference screenshot region:

- [ ] Screenshot your rendered output at the same aspect ratio as the reference crop and do a
      side-by-side visual diff yourself before presenting it — do not just eyeball the code.
- [ ] Corner radii match the established scale from §4, not ad-hoc values per component.
- [ ] Color values trace back to a token from §3 (or a documented, deliberately-added new token) —
      zero hardcoded hex in component code.
- [ ] Spacing between elements uses the existing spacing scale in this repo; do not introduce a
      second spacing system.
- [ ] Text hierarchy (headline vs. label) matches the ~3:1+ size ratio observed in the reference.
- [ ] Chart bars are true rounded vector shapes, not CSS border-radius approximations.
- [ ] Nothing regresses the existing booking-flow logic — this task changes appearance, not
      behavior, of the Safety Agreement / Terms Agreement / booking screens.

## 9. What to do when something is unclear

If a reference screenshot doesn't give enough resolution to determine an exact spacing, radius,
or color value with confidence, do not fabricate a plausible-looking number. Instead:
1. Pick the closest existing token from §3/the repo's scale, and
2. Flag it explicitly in your output (a short "needs designer confirmation" list), rather than
   presenting an unverified guess as a finished, exact match.

## 10. Deliverable

- Updated/new components per §5, wired into the existing Safety Agreement / Terms Agreement /
  booking screens.
- Updated token file reflecting §3 (merged into the existing token source, not a parallel file).
- A short summary of what was matched with high confidence vs. what's flagged for visual review
  per §9.
