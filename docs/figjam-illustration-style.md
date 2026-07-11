# Tinkerer FigJam Illustration Style

Source: FigJam board `HStb8snmR7asH2KhP8bJUF`, user-provided nodes `47:77`, `47:125`, `47:78`, `47:82`, `47:86`, and `47:117`, plus the supplied composite image `C:\Users\Naman Sinha\Downloads\Tinkerer Lab Board.jpg`.

Note: the MCP plan limit blocked the remaining node reads after these six nodes. The observed board items are exposed as raster `image #` rounded-rectangle nodes, not editable vector children, so the local SVGs in `src/assets/tinkerer-figjam` are clean recreated assets based on the visible style rather than one-to-one vector exports. The MP4 files were present, but local frame extraction was not available because `ffmpeg` is not installed.

## Core Aesthetic

- High-contrast black canvas with loud, friendly educational-tech energy.
- Oversized pill geometry, blob panels, flower marks, and stacked rounded rectangles.
- Chunky, compressed display type with heavy weight and very tight line-height.
- Flat color fields dominate; shadows are minimal except product mockup dropshadows.
- Product UI examples use dense dashboards with black chrome, indigo headers, cream data tiles, and hot pink chart panels.
- Photo treatments use saturated blue/indigo overlays with halftone or screen-dot texture.
- Composition rule: anchor with black, then add two to four large color masses. Avoid subtle gradients except for image overlays or device mockups.
- Interaction states dim the underlying dashboard with a translucent black overlay, then place a centered indigo modal with pink primary actions.

## Color Tokens

Observed and normalized palette:

- Ink black: `#000000`
- Near black UI: `#101010`
- Charcoal fields: `#191919`
- Hot pink: `#EC68D8`
- Indigo: `#514AF1`
- Electric blue: `#4C48F2`
- Acid lime: `#DDF237`
- Warm orange: `#FFB13F`
- Soft cream: `#FFF4BE`
- Muted sand: `#A9957A`
- Graph beige: `#E1D7A8`
- Modal blue: `#5A53F4`
- Disabled/track purple: `#746EF8`
- Deep overlay: `rgba(0, 0, 0, 0.72)`
- White: `#FFFFFF`

## Shapes

- Pills: radius `999px`; used as large color bars, buttons, and nav chips.
- Panels: radius `8px` to `14px`; dashboards and app windows avoid soft SaaS card rounding.
- Hero blobs: large rounded rectangles and circles overlap text blocks.
- Flower mark: radial 8-petal shape in pink, usually on black or cream.
- Charts: vertical rounded bars, capsule treemaps, and stacked columns.
- Forms: stacked indigo controls with short labels, square-ish input corners, and dense spacing.
- Modals: radius `8px` to `12px`, centered, with dimmed product UI visible behind.

## Stroke And Line Rules

- Most illustrations are fill-first with little to no stroke.
- When strokes appear, keep them black or low-contrast cream at `2px` to `4px`.
- Icons and micro UI lines use `1.5px` to `2px`, rounded caps.
- Avoid hairline decorative outlines.

## Typography Rules

- Display: extra bold, rounded, compact. Local substitute: `PP Mori SemiBold`, then `Arial Black`, then system sans.
- Body/UI: compact sans, medium weight, small labels.
- Headlines: line-height `0.82` to `0.95`; letter spacing `0`.
- Labels: uppercase, small, medium/bold.

## Layout Rules

- Black page shell with a centered hot-pink wordmark.
- Hero copy can sit directly on the canvas or over a tinted photo/mockup, never inside a marketing card.
- Forms and dashboards use one strong accent bar at the top, then dark fields.
- Responsive behavior: on desktop, split product art and form/UI side by side; on mobile, stack brand, art preview, and form.
- Buttons are capsule-shaped and usually hot pink; secondary buttons are dark charcoal or indigo.
- Product-screen layouts prefer black outer chrome, a narrow left rail, indigo work panels, and cream analysis panels.

## Crosscheck From Supplied Composite

- The app should not keep the previous Apple/SF dark-blue language. The reference is sharper, flatter, and louder: black chrome, pink identity, indigo work surfaces, cream data panels, and acid-lime/orange chart accents.
- Navigation is a narrow black rail on product screens, not a translucent top-only app bar. A small hot-pink wordmark stays centered or near the top center, with the flower mark as the small left anchor.
- User tasks are expressed as dense boards: left rail, top indigo query/action bar, cream stat strip, and 2-3 large analytic cards.
- Primary content cards should be square-ish with `8px` to `14px` radii. The current app's `20px` to `32px` SaaS cards should be reserved only for large decorative illustration shapes.
- Form pages should use indigo panels with stacked blue-violet input fields, small uppercase labels, and hot-pink primary actions.
- Modal states should dim the full app with a deep black overlay, then use compact indigo modals with pink confirm buttons and charcoal cancel buttons.
- Booking/inventory/equipment data should be visualized with rounded bars, capsule rows, treemap blocks, and stat strips instead of generic cards wherever useful.
- Status colors may remain semantic, but they should be normalized into the reference palette: lime for available/success, orange for pending/warning, pink for destructive/attention, beige/charcoal for disabled.
- Typography should move to `PP Mori` as the default visible brand/UI face, with `Arial Black` fallback for oversized chunky display text. Avoid negative letter spacing.
- The implementation should centralize this as reusable tokens and layout primitives before converting individual pages, otherwise the app will drift page by page.

## Local SVG Asset Set

- `flower-mark.svg`: 8-petal radial logo.
- `brand-lockup.svg`: black wordmark composition with pill shapes.
- `dashboard-clusters.svg`: dense dashboard/chart composition.
- `hero-statement.svg`: beige hero typography block.
- `questionnaire-screen.svg`: blue questionnaire state.
- `future-plans-screen.svg`: indigo form plus cream analysis charts.
- `investment-screen.svg`: investment form and projection charts.
- `strategy-modal.svg`: dimmed dashboard with centered strategy modal.
