# Tinkerer Lab Design System

This document outlines the core design language, typography, colors, and UI patterns extracted from the FigJam nodes and local UI references.

## 1. Core Aesthetic
- **Vibe:** High-contrast, loud, friendly educational-tech energy.
- **Backgrounds:** Ink black canvas (`#000000` or `#101010`), providing a dark mode default.
- **Shapes:** Oversized pill geometry, blob panels, flower marks, and stacked rounded rectangles.
- **Shadows/Glows:** Minimal shadows. UI relies on flat color fields. Drop shadows are reserved for product mockup layering and modals.
- **Depth/Overlays:** Deep black overlays (`rgba(0,0,0,0.72)`) for modals and dialogs.

## 2. Color Palette
- **Ink Black:** `#000000` (Main backgrounds)
- **Near Black UI:** `#101010` (Outer chrome, sidebar rails)
- **Charcoal Fields:** `#191919` (Cards, secondary fields)
- **Hot Pink:** `#EC68D8` (Primary brand color, primary buttons, accents)
- **Indigo:** `#514AF1` (Work surfaces, forms, top action bars)
- **Electric Blue:** `#4C48F2` (Highlights)
- **Modal Blue:** `#5A53F4` (Dialog windows)
- **Disabled Purple:** `#746EF8` (Disabled states, track backgrounds)
- **Acid Lime:** `#DDF237` (Success, available states, chart accents)
- **Warm Orange:** `#FFB13F` (Pending, warning states)
- **Soft Cream:** `#FFF4BE` (Data panels, analytic cards, light text areas)
- **Muted Sand:** `#A9957A` (Secondary typography on light backgrounds)
- **Graph Beige:** `#E1D7A8` (Graph lines, subtle borders on cream)
- **White:** `#FFFFFF` (Primary text on dark backgrounds)

## 3. Typography
- **Display Typeface:** PP Mori SemiBold (or Arial Black fallback). Used for chunky, compressed, extra bold hero typography.
- **Body Typeface:** Compact modern sans-serif (Inter or similar). Medium weight, small labels.
- **Line Heights:**
  - Headlines: Very tight (`0.82` - `0.95`).
  - Body: Normal (`1.5`).
- **Letter Spacing:** `0` for headlines. Do not use negative tracking.
- **Labels:** Uppercase, small, medium/bold weight.

## 4. Geometry & Border Radii
- **Pills & Badges:** `999px` radius (fully rounded). Used for primary buttons, nav chips, and large color bars.
- **Cards & Modals:** `8px` to `14px` radius. Avoid oversized "SaaS" corner rounding (`20px+`) for functional UI.
- **Forms & Inputs:** Square-ish corners (`4px` to `8px`), dense spacing.
- **Charts:** Vertical rounded bars, capsule treemaps, stacked columns.

## 5. UI Layout Rules
- **Application Shell:** Narrow black left rail (sidebar), top indigo query/action bar, cream stat strips, and dark work panels.
- **Forms:** Indigo panels, stacked blue-violet input fields, small uppercase labels, hot-pink primary actions.
- **Modals:** Centered, radius `8px-12px`, placed over a dimmed deep black background. Primary action is pink, secondary is charcoal.
- **Data Visualization:** Use rounded bars, capsule rows, and stat strips instead of generic grid cards.

## 6. Strokes & Lines
- Fills dominate over strokes.
- When strokes are used, keep them black or low-contrast cream at `2px` to `4px`.
- Icons use `1.5px` to `2px` stroke widths with rounded caps.
- Avoid hairline (`1px`) decorative borders.

## 7. Assets & Iconography
- Reusable SVGs are located in `/assets`.
- Illustrations include hero blobs, flower marks (radial 8-petal shapes), and chunky tech metaphors.
- Icons should feel compact, rounded, and dense to match the bold typography.
