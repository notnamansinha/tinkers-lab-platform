# Mathical / Tinkerers Lab Visual System

This note documents the local design language derived from the reference files in `UI/`, the local SVG assets in `src/assets/tinkerer-figjam/`, and the existing PP Mori font files in `public/fonts/`. No Figma or external design source was used.

## Reference Mapping

- `UI/one.jpg`: brand lockup, flower mark, primary palette, rounded chart-bar motifs.
- `UI/six.jpg`: public hero composition, black frame, beige stage, expressive pill typography.
- `UI/seven.jpg`: onboarding/questionnaire panel, indigo slab, progress bar, pill controls.
- `UI/two.jpg`: auth/signup layout, black shell, large visual panel, compact form stack.
- `UI/three.jpg`, `UI/nine.jpg`, `UI/fifteen.jpg`: dashboard layout, left rail, indigo query panels, cream analytics cards, pink result cards.
- `UI/eight.jpg`, `UI/thirteen.jpg`, `UI/fourteen.jpg`: future-plans form, indigo input system, cream chart panels.
- `UI/ten.jpg`, `UI/eleven.jpg`, `UI/twelve.jpg`: modal behavior, dimmed background, indigo modal panels, pink primary action and charcoal cancel action.
- `UI/four.jpg`, `UI/five.jpg`: responsive/device presentation and density expectations.
- `UI/vid1.mp4` through `UI/video4.mp4`: motion references for subtle panel transitions and screen-state changes.

## Palette

- Shell: `#000000`, `#101010`, `#191919`.
- Brand/action: hot pink `#EC68D8`.
- Work panels: indigo `#514AF1`, modal/input blue `#5A53F4`, track purple `#746EF8`.
- Data surfaces: cream `#FFF4BE`, beige `#E1D7A8`, sand `#A9957A`.
- Chart accents: lime `#DDF237`, orange `#FFB13F`, blue-violet `#4C48F2`.

## Typography

- Primary font is local `PP Mori` from `public/fonts/PPMori-Regular.otf` and `public/fonts/PPMori-SemiBold.otf`.
- Display and labels use PP Mori at heavy weights with tight line-height and zero letter spacing.
- Body copy uses PP Mori regular/semibold, never remote font imports.
- Uppercase metadata uses small sizes with modest positive tracking around `0.08em`.

## Shape, Spacing, and Surfaces

- Main app shell is black with a fixed left rail on desktop and compact top chrome on mobile.
- Functional panels use `16px` radius; inputs use `8px`; CTAs, sliders, and status pills use full rounding.
- Layout gaps follow a 16/24/32px rhythm. Dense dashboard sections prefer aligned grids over freeform placement.
- Cream cards are for analytics/data, indigo panels for forms and active work, pink panels for attention/results.

## Borders and Shadows

- Borders are restrained: mostly `1px` white/black alpha lines, not heavy outlines.
- Shadows are soft and structural, used to lift active panels rather than decorate every element.
- Modal backgrounds dim the full interface with black opacity before placing an indigo modal in front.

## Icon and Asset Rules

- Use lucide icons for navigation and operational controls.
- Use local `flower-mark.svg` for brand anchors.
- Use local SVG/JPG/MP4 assets only. Do not fetch from Figma, Google Fonts, or external design libraries.

## Motion

- Motion should be short and purposeful: hover lift, button press scale, fade-in, and active-state transitions.
- Avoid distracting loops except small status pulses.
- Modal transitions should feel like a quick opacity/translate settle, matching the reference overlays.

## Component Rules

- Navigation: black rail, pill active state, local flower mark at the top, hot-pink user/avatar accent.
- Forms: indigo panel, violet inputs, white labels, pink primary button, charcoal secondary button.
- Charts: cream or pink panels with large rounded bars and clear legends.
- Auth: black page, high-contrast form area, one large visual/brand slab, no generic SaaS cards.
- Mobile: stack panels vertically, keep controls full-width when needed, and preserve readable type without viewport-based font scaling.
