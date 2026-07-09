# Tinkerer UI Redesign Implementation Plan

## Reference Audit

Inputs checked:

- `C:\Users\Naman Sinha\Downloads\Tinkerer Lab Board.jpg`
- `C:\Users\Naman Sinha\Downloads\vid1.mp4`
- `C:\Users\Naman Sinha\Downloads\video2.mp4`
- `C:\Users\Naman Sinha\Downloads\video3.mp4`
- `C:\Users\Naman Sinha\Downloads\video4.mp4`
- `docs/figjam-illustration-style.md`
- Current app shell and representative pages in `src/components/layout`, `src/features/auth`, `src/features/dashboard`, `src/features/equipment`, and `src/features/bookings`

The four videos are present and readable as files. Frame extraction could not be completed with the local tooling currently available: `ffmpeg` is not installed, bundled Python does not include `cv2` or `imageio`, and the bundled Node runtime is missing `playwright-core`. The supplied JPG composite is therefore the reliable visual reference for this plan.

## Current-State Findings

- The current UI is still mostly Apple-dark/SaaS blue: `#0A84FF`, SF/system font stacks, translucent top bars, rounded cards, and restrained gradients.
- The reference direction is a complete product skin: black outer chrome, hot-pink identity, indigo task panels, cream analytics cards, lime/orange/pink/blue chart accents, chunky `PP Mori` typography, dense dashboards, and dimmed modal states.
- `LoginPage.tsx` has started moving toward the reference, but `RegisterPage.tsx`, `TopBar.tsx`, `AppLayout.tsx`, `DashboardPage.tsx`, `EquipmentListPage.tsx`, booking views, admin views, and shared UI components still need conversion.
- `docs/figjam-illustration-style.md` now matches the composite more closely after crosscheck, but implementation needs shared primitives so individual pages do not diverge.

## Design Contract

- Replace blue primary with hot pink: `#EC68D8`.
- Use indigo for active work panels: `#514AF1`, `#5A53F4`, `#746EF8`.
- Use cream for analytics/data panels: `#FFF4BE`, `#E1D7A8`.
- Use lime and orange for chart emphasis: `#DDF237`, `#FFB13F`.
- Keep black as the dominant shell: `#000000`, `#101010`, `#191919`.
- Default UI font should be `PP Mori`; oversized display should use `PP Mori`/`Arial Black` with tight line-height and no negative letter spacing.
- Prefer `8px` to `14px` radii for functional panels; use full pills for CTAs, stat chips, sliders, and chart marks.
- Avoid nested card-on-card compositions. Use product-screen panels, stat strips, chart tiles, and rail navigation.

## Implementation Phases

### Phase 1: Foundation Tokens And Primitives

- Update `src/styles/globals.css` to expose Tinkerer tokens as CSS variables and Tailwind-compatible aliases.
- Replace `--primary`, `--ring`, status accents, surface colors, and typography stacks with the FigJam palette.
- Add reusable utility classes for:
  - `tl-shell`
  - `tl-rail`
  - `tl-panel-indigo`
  - `tl-panel-cream`
  - `tl-panel-pink`
  - `tl-stat-strip`
  - `tl-pill-button`
  - `tl-input`
  - `tl-modal-overlay`
  - `tl-chart-card`
- Update shared shadcn wrappers where safe: `button`, `input`, `textarea`, `select`, `card`, `badge`, `table`, `dropdown-menu`.

### Phase 2: App Shell

- Replace the translucent top-only shell with a product chrome layout inspired by the reference:
  - black background
  - narrow left rail on desktop
  - hot-pink centered/near-centered wordmark
  - flower mark as compact brand anchor
  - pill nav controls and user actions
- Decide whether to revive `AppSidebar.tsx` as the primary desktop nav or fold its logic into a new `TinkererShell`.
- Keep a compact mobile top bar with a slide-down black nav, but restyle with pink/indigo active states.

### Phase 3: Auth Screens

- Finish `LoginPage.tsx` by removing any oversized decorative overlap that competes with the form on smaller desktops.
- Rebuild `RegisterPage.tsx` in the same art direction:
  - black page
  - indigo form slab
  - hot-pink primary action
  - cream or blue visual panel
  - compact stepped progress like the modal references
- Normalize auth error, loading, Google sign-in, and terms states into the new button/input system.

### Phase 4: Dashboard

- Convert `DashboardPage.tsx` into the main reference layout:
  - left rail/product shell
  - indigo query/action strip
  - cream stat strip
  - cream analytics panels with rounded bars
  - pink “attention” panel for due/overdue/active items
  - lime/orange/blue chart blocks
- Replace current category gradient cards with flat FigJam-style panels.
- Use existing SVG assets only as supporting illustrations, not as substitutes for functional dashboard content.

### Phase 5: Core Operational Pages

- Equipment list/detail/form:
  - equipment list becomes black rail + indigo filter/search panel + cream inventory grid/table.
  - equipment cards use cream panels and chunky status chips.
  - detail pages use stat strips and large functional action pills.
- Bookings:
  - week navigator becomes a blue/purple control strip.
  - schedule becomes a cream grid with pink/orange/lime booking bars.
  - booking form becomes an indigo planning form with step/slot pills.
- Inventory and checkout:
  - list/table views become dense cream panels.
  - checkout actions become hot-pink primary flows with dimmed modal confirmation states.
- Projects, workshops, maintenance, issues, reports:
  - migrate in batches using the same primitives, prioritizing high-traffic pages first.

### Phase 6: Admin Surfaces

- Convert admin dashboards after the user-facing operational pages.
- Use pink panels for exceptions, cream stat panels for counts, indigo forms for controls, and black rails for admin sections.
- Preserve dense scanning and table ergonomics; do not turn admin pages into landing-page layouts.

### Phase 7: Modal And Interaction System

- Replace browser prompts and generic dialogs with FigJam-style dimmed overlays.
- Standard modal recipe:
  - full-screen `rgba(0,0,0,0.72)` overlay
  - compact indigo panel
  - violet input rows
  - hot-pink primary button
  - charcoal cancel button
- Apply to booking approval/rejection, checkout confirmation, delete/archive flows, and settings edits.

### Phase 8: Verification

- Run `npm.cmd run build`.
- Run `npm.cmd run lint`.
- Start a local dev server and visually inspect:
  - `/login`
  - `/register`
  - `/`
  - `/equipment`
  - `/bookings`
  - one form route
  - one admin route if access allows
- Check desktop and mobile widths for:
  - no text overlap
  - no clipped controls
  - accessible contrast
  - clear focus states
  - no accidental return to `#0A84FF` blue except where explicitly justified

## Suggested File Order

1. `docs/figjam-illustration-style.md`
2. `src/styles/globals.css`
3. `src/components/ui/*`
4. `src/components/layout/AppLayout.tsx`
5. `src/components/layout/TopBar.tsx`
6. `src/components/layout/AppSidebar.tsx` or new shell component
7. `src/features/auth/LoginPage.tsx`
8. `src/features/auth/RegisterPage.tsx`
9. `src/features/dashboard/DashboardPage.tsx`
10. `src/features/equipment/*`
11. `src/features/bookings/*`
12. Remaining feature pages
13. Admin pages

## Acceptance Criteria

- The app reads as one coherent Tinkerer interface across auth, dashboard, lists, forms, and admin pages.
- Shared tokens control the palette and typography; pages do not hardcode old Apple-blue styling.
- Layouts match the reference logic: black chrome, indigo work panels, cream analytics, pink actions, and dense product UI.
- Existing Firebase/auth/navigation behavior remains unchanged.
- Build passes and lint has no new warnings from this redesign work.
