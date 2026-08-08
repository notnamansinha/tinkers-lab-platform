# Codex Task: Full Visual & UX Restructure — Tinkerers Lab Equipment Booking Platform

## 0. THINK BEFORE YOU CODE — This Section Is Critical

**You are a design-engineering hybrid.** Before writing a single line of code, you must reason
through the full UX and visual architecture of this app. The current implementation looks
nothing like the reference screenshots — it has the right tokens and color values but applies
them flatly, without the bold spatial composition, panel-beside-graph layouts, multi-zone
color blocking, or data-dense dashboard architecture visible in the reference.

**Your first deliverable is a thinking block** (write it out as comments or a markdown section
at the top of your first changed file) where you articulate:

1. **What the reference designs actually do** — not "it uses indigo" but the specific spatial
   patterns: left sidebar (dark, narrow, icon+label nav), top brand bar (centered wordmark,
   avatar pill right), then a content zone split into a form/input panel (indigo/purple fill,
   left ~55%) and a visualization panel (cream/pink fill, right ~45%) with real charts. The
   dashboard has a horizontal KPI strip (cream bg, 6 stat cells), then a row of large chart
   panels (bar chart left, bubble/donut chart right, with a horizontally-scrollable third panel).

2. **What the current implementation gets wrong** — the dashboard is a vertical stack of
   stat cards → single bar chart → attention card. There's no side-by-side panel+chart layout.
   The stat cards are dark standalone boxes, not a unified KPI strip. The bar chart floats alone
   in a cream section. There's no per-section visualization panel. The booking form, equipment
   pages, inventory, etc. are standard form-only layouts with no accompanying data
   visualization.

3. **Your restructuring plan** — for EVERY page that renders inside AppLayout, describe:
   - What the new layout grid looks like (sidebar stays, content splits how?)
   - What visualization/graph/chart accompanies the content
   - What color zone each panel gets
   - What new features or data displays make the page feel like a real dashboard, not a form

**Do not skip this thinking step. Write it out. The thinking IS the deliverable as much as
the code is.**

---

## 1. Context — Read Before Starting

### Codebase structure you must understand:

```
src/
├── components/
│   ├── layout/        → AppLayout.tsx (sidebar + top bar + outlet), AppSidebar.tsx, TopBar.tsx
│   ├── visual/        → BrandMark, DarkStatCard, RoundedBarChart, StepsPanel, AgreementCard, FullBleedQuestionCard
│   ├── ui/            → shadcn components (Button, Dialog, etc.)
│   └── common/        → LoadingSpinner
├── features/
│   ├── dashboard/     → DashboardPage.tsx (the main "/" route)
│   ├── bookings/      → BookingCalendarPage, BookingFormPage, BookingDetailPage
│   ├── equipment/     → EquipmentListPage, EquipmentDetailPage, EquipmentFormPage
│   ├── inventory/     → InventoryListPage, InventoryDetailPage, InventoryFormPage
│   ├── checkout/      → ToolCheckoutPage, ToolCheckoutListPage
│   ├── projects/      → ProjectListPage, ProjectDetailPage, ProjectFormPage
│   ├── maintenance/   → MaintenanceListPage, MaintenanceDetailPage, MaintenanceFormPage
│   ├── workshops/     → WorkshopListPage, WorkshopDetailPage, WorkshopFormPage
│   ├── admin/         → AdminDashboard + 6 admin sub-pages
│   ├── auth/          → LoginPage, OnboardingPage
│   ├── reports/       → ReportsPage
│   ├── notifications/ → NotificationsPage
│   └── issues/        → IssueFormPage
├── styles/globals.css → Design tokens, base styles, utility classes
├── routes/index.tsx   → All routes, guards
└── contexts/, hooks/, services/, types/, lib/
```

### Existing design tokens (in globals.css + tailwind.config.ts):
- Colors: `--color-brand-indigo`, `--color-accent-pink`, `--color-accent-lime`, `--color-accent-orange`, `--color-cream`, `--color-tan`, `--color-plum-dark`, plus all dark surface colors
- Tailwind aliases: `bg-indigo`, `bg-pink`, `bg-lime`, `bg-orange`, `bg-cream`, `bg-near-black`, `bg-charcoal`
- Radius: `rounded-card` (24px), `rounded-chip` (full), `rounded-panel` (16px)
- Font: Outfit (brand/display), Inter (fallback)
- Spacing: 8px grid (`1u` through `12u`)

**Do NOT create a parallel token system. Extend the existing one.**

### Existing component patterns:
- `DarkStatCard` — dark bg, accent icon pill, label/value/detail
- `RoundedBarChart` — SVG bars with pill shapes, lime/orange/pink cycling, track bg
- `StepsPanel` — cream bg, numbered steps with titles/descriptions
- `AppLayout` — sidebar nav (dark, icon+label, 240px), top brand bar (centered wordmark + avatar), main content area with Outlet

---

## 2. Reference Material — What You're Targeting

11 reference screenshots in `png/` folder show the "mathical" fintech app. **You are NOT
copying mathical's content** (finance, euros, savings). You are replicating its **spatial
architecture, panel composition, color-blocking strategy, chart treatment, and UX density**
and applying them to this lab equipment booking platform.

### Key design patterns from the reference (study ALL 11 screenshots):

#### A. Dashboard Layout (Board 6 — the primary target)
```
┌─────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░  tinkerers lab  ░░░░░░░░░░░░░░ [avatar]   │  ← top brand bar (black bg)
├──────────┬──────────────────────────────────────────────────┤
│          │  ┌──── INDIGO PANEL ─────┐┌── INDIGO PANEL ────┐ │
│ DASHBOARD│  │ STRATEGY SELECTOR     ││ AI QUERY INPUT     │ │  ← two indigo action bars
│ EARNINGS │  │ [dropdown] [EDIT btn] ││ [text input] [✿]   │ │
│ SPENDING │  └───────────────────────┘└────────────────────┘ │
│ INVEST.. │  ┌────────────── CREAM KPI STRIP ──────────────┐ │
│ FUTURE.. │  │ NET WORTH│ DEBT │ SAVINGS│ ASSETS│ INCOME│EXP│ │  ← 6-cell stat strip
│          │  │  €536K   │  €0  │  €17K  │ €515K │  €5K │€3K│ │
│          │  └─────────────────────────────────────────────┘ │
│          │  ┌─── CREAM CHART ──┐┌── CREAM CHART ──┐┌──────┐│
│          │  │ NET WORTH PROJ.  ││ CASHFLOW DISTRIB ││ PINK ││  ← chart panels row
│          │  │ [pill bar chart] ││ [bubble/shapes]  ││INVEST││
│          │  │ (lime/orange/    ││ (lime/orange/    ││[bars]││
│          │  │  pink bars)      ││  indigo shapes)  ││      ││
│          │  └──────────────────┘└──────────────────┘└──────┘│
└──────────┴──────────────────────────────────────────────────┘
```

#### B. Form + Chart Split Layout (Board 7 — Future Plans, Board 9 — Investments)
```
┌──────────┬────────────────────┬───────────────────────────┐
│          │  INDIGO FORM PANEL  │  CREAM CHART PANEL        │
│ SIDEBAR  │  Title + SAVE btn   │  Chart title + legend     │
│          │  [form fields...]   │  [horizontal bar chart]   │
│          │  [dropdowns...]     │  (pink/orange/cream bars) │
│          │  [sliders...]       │                           │
│          │                     │  CREAM CHART PANEL #2     │
│          │                     │  [second chart below]     │
└──────────┴────────────────────┴───────────────────────────┘
```

#### C. AI Response + Chart Layout (Board 8 — "Can I afford...")
```
┌──────────┬────────────────────┬───────────────────────────┐
│          │  PINK TEXT PANEL    │  PINK CHART PANEL         │
│ SIDEBAR  │  [AI response text]│  [savings visualization]  │
│          │  "You can afford   │  (large rounded shapes,   │
│          │   the laptop..."   │   orange/purple blobs)    │
│          │                    │                           │
│          │  [CLEAR] [PIN BTN] │  [progress bar below]     │
│          ├────────────────────┴───────────────────────────┤
│          │  CREAM KPI STRIP (same as dashboard)           │
└──────────┴────────────────────────────────────────────────┘
```

#### D. Modal Overlay (Board 2 — Custom Strategy, Board 10 — Pin to Dashboard)
```
┌───────────────────────────────────────────┐
│  INDIGO MODAL with rounded corners        │
│  Title in bold white                      │
│  Subtitle/description                     │
│  [slider controls with labels + %]        │
│  [APPLY] (pink pill)  [CANCEL] (dark pill)│
└───────────────────────────────────────────┘
```

#### E. Onboarding / Question Flow (Board 0 — "How much do you expect...")
- Full-bleed indigo card, oversized bold white headline
- Progress bar (lime fill on dark track) at top
- Input fields at bottom of the card (indigo-light bg)
- BACK button (dark pill with arrow) at bottom-left

#### F. Auth / Signup (Board 1)
- Split layout: left = indigo hero image panel with bold tagline overlaid on tinted image
- Right = dark form panel with inputs, checkboxes, pink CTA button

#### G. Mobile (Board 5)
- Bottom tab bar (rounded pill, dark bg, icon-only with active state)
- Stacked card layout, same component patterns compressed vertically
- Same color zones (indigo panels, cream charts, pink accents)

---

## 3. Page-by-Page Restructuring Requirements

For EVERY page below, you must restructure the layout to match the reference's spatial
architecture. **Think about what visualization or graph makes sense for that page's data,
then build it.**

### 3.1 Dashboard (`/` — DashboardPage.tsx) — COMPLETE REBUILD

**Current state:** Vertical stack — StepsPanel → stat cards grid → cream bar chart + attention card.
**Target state:** Reference Board 6 layout.

Build:
1. **Action Bar Row** — Two indigo panels side by side:
   - Left: "Quick Booking" — dropdown to select equipment category + "BOOK" button
   - Right: "Search Equipment" — text input with decorative flower/brand mark button
2. **KPI Strip** — Single cream/tan row with 6 stat cells, each showing a label + large value:
   - MACHINES READY | BOOKED TODAY | TOOLS OUT | OVERDUE | ACTIVE PROJECTS | PENDING APPROVAL
   - Each cell separated by a 1px vertical divider, no individual card borders
   - Cream/tan background, black text, small green/red change badges where relevant
3. **Chart Panels Row** — Two or three large panels side by side:
   - **Left (cream bg):** "Equipment Utilization" — pill-shaped stacked bar chart (SVG) showing
     machines by status over the past 7 days. Bars use lime (available), orange (reserved), pink
     (maintenance). Y-axis: machine count. X-axis: days. Title + subtitle eyebrow.
   - **Center (cream bg):** "Booking Distribution" — a treemap or bubble visualization showing
     which equipment categories get the most bookings. Use oversized rounded shapes (not circles —
     rounded rectangles/pills) in orange, indigo, lime, pink.
   - **Right (pink bg, horizontally scrollable):** "Upcoming Sessions" — a compact vertical list
     of today's + tomorrow's bookings, each as a small card with equipment name, time, status
     badge. Closeable with an X button. Arrow button to scroll to more.

### 3.2 Equipment List (`/equipment` — EquipmentListPage.tsx)

**Target:** Reference Board 7 form+chart split.

Build:
1. Content area splits into two columns:
   - **Left (indigo bg):** Equipment list/grid — cards showing equipment name, status dot, category tag
   - **Right (cream bg):** "Equipment Status Overview" — horizontal bar chart showing count of
     available/reserved/maintenance machines per category (3D Printers, CNC, Laser Cutters, etc.)
     Bars are pill-shaped, pink/orange/cream colored. Second chart below: "Most Booked This Week"
     — a small ranked bar chart.

### 3.3 Booking Form (`/bookings/new` — BookingFormPage.tsx)

**Target:** Reference Board 7 / Board 9 form+chart layout.

Build:
1. **Left panel (indigo bg):** The existing booking form — equipment selector, date picker, time
   slot selector, project linker, safety agreement checkbox. Title "NEW BOOKING" + "SUBMIT"
   pill button. Style all inputs with `tl-input` class (indigo-light bg, pink focus ring).
2. **Right panel (cream bg):** Two stacked chart cards:
   - **Top:** "Slot Availability" — a heatmap-style or bar chart showing how many slots are
     available vs. booked for the selected equipment over the next 7 days.
   - **Bottom:** "Your Booking History" — pill bar chart showing user's bookings per month
     for the last 6 months (lime/orange/pink bars).

### 3.4 Booking Calendar (`/bookings` — BookingCalendarPage.tsx)

**Target:** Calendar on left, stats on right.

Build:
1. **Left (indigo bg):** The calendar grid (keep existing calendar logic, restyle with indigo bg,
   white text, pink/lime/orange dots for booking status).
2. **Right (cream bg):** "Bookings This Month" — summary stats + a small pie/donut chart showing
   approved vs. pending vs. rejected bookings.

### 3.5 Inventory (`/inventory` — InventoryListPage.tsx)

**Target:** List + chart split.

Build:
1. **Left (indigo bg):** Inventory item list with search, filter by category
2. **Right (cream bg):** "Stock Levels" — horizontal bar chart showing current stock vs. minimum
   threshold for top 10 items. Bars in lime (healthy) vs. pink (low stock).

### 3.6 Projects (`/projects` — ProjectListPage.tsx)

**Target:** Project cards + activity chart.

Build:
1. **Left (indigo bg):** Project cards in a vertical scrollable list
2. **Right (pink bg):** "Project Activity" — a timeline or stacked bar chart showing bookings
   per project over the last 30 days.

### 3.7 Tool Checkout (`/checkout` — ToolCheckoutPage.tsx)

**Target:** Checkout form + status viz.

Build:
1. **Left (indigo bg):** Checkout form (tool selector, expected return date)
2. **Right (cream bg):** "Your Active Checkouts" — visual showing checked-out tools with
   time-remaining bars (green → yellow → red as due date approaches).

### 3.8 Admin Dashboard (`/admin` — AdminDashboard.tsx) — COMPLETE REBUILD

**Target:** Dense data dashboard like Board 6 but with admin-specific KPIs.

Build:
1. **KPI Strip (cream):** TOTAL USERS | PENDING APPROVALS | TODAY'S BOOKINGS | ACTIVE ISSUES | OVERDUE TOOLS | EQUIPMENT UTILIZATION %
2. **Chart Row:**
   - Left (cream): "Bookings Over Time" — 30-day line/bar chart
   - Center (cream): "Equipment Utilization" — stacked horizontal bars per machine
   - Right (pink): "Pending Actions" — list of items needing approval with action buttons

### 3.9 Auth Pages (LoginPage, OnboardingPage)

**LoginPage Target:** Reference Board 1 (signup screen).
- Split layout: Left = indigo hero panel with brand tagline overlaid on tinted image.
  Right = dark form panel with email/password inputs and pink "SIGN IN" pill button.

**OnboardingPage Target:** Reference Board 0 (question flow).
- Full-bleed indigo card with progress bar, oversized question text, input at bottom.
- Step-by-step flow through profile completion.

---

## 4. New Components to Build

### 4.1 `KPIStrip` — Horizontal stat strip
```tsx
// props: cells: Array<{ label: string; value: string | number; badge?: string; badgeColor?: 'lime' | 'pink' }>
// Renders a single cream/tan bar with cells separated by 1px dividers
// Each cell: small uppercase label (11px, bold) + large value (24-28px, extrabold)
// Optional badge (small pill with % change)
```

### 4.2 `SplitPanelLayout` — Form + Chart container
```tsx
// props: left: ReactNode; right: ReactNode; leftBg?: 'indigo' | 'pink'; rightBg?: 'cream' | 'pink'
// Renders a two-column layout that fills the content area
// Left panel: ~55% width, colored bg, scrollable content
// Right panel: ~45% width, colored bg, chart content
// On mobile: stacks vertically (form first, chart second)
```

### 4.3 `HorizontalBarChart` — For category/comparison charts
```tsx
// Like RoundedBarChart but horizontal bars
// Each bar: pill-shaped (fully rounded ends), color from accent palette
// Labels on the left, values on the right
// Used for: equipment status by category, stock levels, mortgage-style comparisons
```

### 4.4 `BubbleTreemap` — For distribution visualizations
```tsx
// Renders large rounded-rectangle "bubbles" in different sizes based on data values
// Colors cycle through lime, orange, pink, indigo
// Used for: cashflow distribution style viz, booking distribution by category
// NOT circles — use rounded rectangles/pills like the reference
```

### 4.5 `ActionBarRow` — Top action panels
```tsx
// Two indigo-bg panels side by side above the KPI strip
// Each can contain: a label, a dropdown/input, and an action button
// Fully rounded controls inside indigo panel
```

### 4.6 `ChartPanel` — Wrapper for chart sections
```tsx
// props: eyebrow, title, legend, bg: 'cream' | 'pink', closeable, children
// Renders a rounded card with proper header (eyebrow label, bold title, legend dots)
// Optional close button (X) and 3-dot menu
// Children slot for any chart component
```

### 4.7 `StrategyModal` — For slider-based configuration (replaces simple dialogs)
```tsx
// Indigo modal with rounded corners, bold white title
// Contains labeled slider controls with % values
// Two pill buttons: pink "APPLY" + dark "CANCEL"
// Used for: booking preferences, notification settings, filter configurations
```

---

## 5. Chart & Visualization Requirements

### All charts must:
- Be **SVG-based** — real `<rect>`, `<path>`, `<circle>` elements, not CSS hacks
- Use **pill-shaped bars** — `rx`/`ry` = half the bar width for fully rounded ends
- Cycle through **accent palette** — lime, orange, pink (+ indigo for 4th color)
- Have **smooth transitions** — `transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1)`
- Be **responsive** — use `viewBox`, no hardcoded pixel dimensions
- Reference **CSS custom properties** for colors — `fill="var(--color-accent-lime)"`, not hex
- Include **proper aria labeling** — `role="img"`, `<title>`, `<desc>`

### The "rounded shapes" visual (from Board 6 center panel — Cashflow Distribution):
This is NOT a standard chart type. It's an **artistic data visualization** with oversized
rounded rectangles and circles arranged to fill a panel. Think of it as a treemap where each
node is a large pill or squircle. The shapes overlap slightly and use opacity to create depth.
Build this as a custom SVG component — don't try to force it into a charting library.

---

## 6. Color Blocking Strategy

The reference uses **panel-level color blocking**, not element-level. Meaning:
- An entire panel/section gets one bg color (indigo, cream, pink, dark)
- Elements INSIDE that panel use complementary/contrasting colors
- Adjacent panels have deliberately different bg colors for visual rhythm

### Color zone rules:
| Zone | Background | Text | Accent Elements |
|------|-----------|------|-----------------|
| Sidebar | `charcoal` (#191919) | white/55% → white | `indigo` active state |
| Top bar | `black` (#000) | pink brand wordmark | pink avatar pill |
| Form panels | `indigo` (#504BEF) | white | `indigo-light` inputs, pink focus rings |
| Chart panels | `cream` (#FFF4C4) | black | lime/orange/pink chart elements |
| Accent panels | `pink` (#F67ADF) | black | orange/indigo/dark elements |
| KPI strip | `cream`/`tan` | black | lime/pink badges |
| Modals | `indigo` | white | pink + dark buttons |
| Dark cards | `near-black` (#0A0A0A) | white | accent icon pills |

---

## 7. Typography Hierarchy

The reference has exactly **3 type tiers** visible at any time:

| Tier | Size | Weight | Tracking | Use |
|------|------|--------|----------|-----|
| Eyebrow | 11px | 700 (bold) | 0.12em | Section labels, panel headers ("A FAIRLY PRECISE ESTIMATE") |
| Title | 24-32px | 800 (extrabold) | -0.04em | Panel titles, chart names ("NET WORTH PROJECTION") |
| Data/Body | 13-15px | 500-600 | normal | Labels, values, body text, chart axis labels |

**KPI values** break this with 28-42px extrabold tabular numbers.

Do NOT mix more than these 3 tiers on any single screen section.

---

## 8. Interaction Patterns from Reference

### Navigation
- Sidebar: dark background, icon + ALL-CAPS label, active state = indigo bg pill
- Mobile: bottom tab bar, rounded-full pill shape, icon-only, active = indigo

### Inputs (on indigo panels)
- Background: `indigo-light` (#6D69F2) — slightly lighter than panel
- Border: 1px white/10%
- Focus: pink border + pink glow ring
- Placeholder: white/45%
- Dropdowns: same style + chevron icon
- Pill toggle buttons (MONTHLY / YEARLY): two pills side by side, active = indigo, inactive = dark

### Buttons
- Primary: pink fill, black text, fully rounded
- Secondary: dark fill (#191919), white text, fully rounded
- Outline: 1px border, transparent bg, fully rounded
- In-panel: "EDIT" button as a small pill inside indigo panel
- "SAVE" button top-right of form panels

### Cards / Chart panels
- Large border-radius (24px)
- No visible border on light cards — differentiated by bg color only
- Dark cards: 1px `hairline` border
- 3-dot menu icon (top-right) for chart options
- Close X button for dismissible panels

---

## 9. What NOT to Do

- **Do NOT make flat vertical layouts** — every page should have spatial depth from side-by-side panels
- **Do NOT use single-color pages** — always have at least 2 color zones visible
- **Do NOT leave pages without data visualization** — if a page shows data, add a chart/graph panel
- **Do NOT use standard HTML table styling** — tables should be styled as dark panels with the design system
- **Do NOT add borders to cream/light panels** — they sit borderless against the dark page bg
- **Do NOT make charts tiny** — charts should be large, prominent, taking up 40-50% of the content area
- **Do NOT break existing Firebase queries or routing** — this is a visual restructure, not a data layer change
- **Do NOT change the route paths or auth flow logic** — keep routes/index.tsx routing the same
- **Do NOT introduce new npm packages for charts** — build all charts as custom SVG components using the existing RoundedBarChart pattern

---

## 10. Implementation Order

1. **Think & Plan** (write your reasoning — see §0)
2. **Build new layout components** — `SplitPanelLayout`, `KPIStrip`, `ActionBarRow`, `ChartPanel`
3. **Build new chart components** — `HorizontalBarChart`, `BubbleTreemap`
4. **Rebuild DashboardPage** — this is the showcase, get it right
5. **Restructure feature pages** — equipment, bookings, inventory, projects, checkout
6. **Restyle auth pages** — login, onboarding
7. **Restructure admin pages** — admin dashboard + sub-pages
8. **Polish** — transitions, mobile responsiveness, spacing consistency

---

## 11. Mobile Responsive Rules

- `SplitPanelLayout` stacks vertically below `md` breakpoint (768px)
- `KPIStrip` becomes a 2×3 or 3×2 grid below `md`, horizontal scroll below `sm`
- Chart panels become full-width cards in the vertical stack
- Bottom tab bar replaces sidebar on mobile (already implemented)
- Action bar panels stack vertically on mobile
- All charts maintain aspect ratio via SVG viewBox

---

## 12. Files You MUST Modify

### New files to create:
- `src/components/visual/KPIStrip.tsx`
- `src/components/visual/SplitPanelLayout.tsx`
- `src/components/visual/HorizontalBarChart.tsx`
- `src/components/visual/BubbleTreemap.tsx`
- `src/components/visual/ActionBarRow.tsx`
- `src/components/visual/ChartPanel.tsx`
- `src/components/visual/StrategyModal.tsx`

### Files to heavily modify:
- `src/features/dashboard/DashboardPage.tsx` — complete rebuild
- `src/features/equipment/EquipmentListPage.tsx` — add chart panel
- `src/features/bookings/BookingFormPage.tsx` — add chart panel
- `src/features/bookings/BookingCalendarPage.tsx` — add stats panel
- `src/features/inventory/InventoryListPage.tsx` — add chart panel
- `src/features/projects/ProjectListPage.tsx` — add chart panel
- `src/features/checkout/ToolCheckoutPage.tsx` — add chart panel
- `src/features/admin/AdminDashboard.tsx` — complete rebuild
- `src/features/auth/LoginPage.tsx` — split layout reskin
- `src/features/auth/OnboardingPage.tsx` — question flow reskin
- `src/components/visual/index.ts` — export new components

### Files to lightly modify:
- `src/styles/globals.css` — add new utility classes if needed
- `src/components/visual/RoundedBarChart.tsx` — may need enhancements
- `src/components/visual/DarkStatCard.tsx` — may integrate into KPIStrip

---

## 13. Verification Checklist

Before calling anything done, verify:

- [ ] Dashboard has: action bar row + KPI strip + chart panels row (not a vertical stack of cards)
- [ ] At least 5 feature pages use `SplitPanelLayout` with a form/content panel + chart panel
- [ ] Every chart uses SVG with pill-shaped bars, accent palette colors, CSS custom properties
- [ ] Color blocking is visible — adjacent panels have different bg colors (indigo next to cream, cream next to pink)
- [ ] KPI strip renders as a single horizontal row of stat cells, not individual cards
- [ ] Login page has split layout (hero left, form right)
- [ ] Mobile layout stacks properly with bottom tab bar
- [ ] No hardcoded hex values in component code — all reference CSS custom properties
- [ ] Existing Firebase queries, routing, and auth flow are unchanged
- [ ] Typography follows the 3-tier system: eyebrow (11px) → title (24-32px) → data (13-15px)

---

## 14. Deliverable

1. Your **thinking block** (§0) — written reasoning about what changes and why
2. New visual components (§4) — reusable, following existing patterns
3. Restructured pages (§3) — every page with proper panel layout and visualizations
4. Updated exports (visual/index.ts)
5. A short **summary** of what was built, what looks exactly like reference, and what needs
   designer review

**Success means: someone opening the app sees a bold, data-dense, color-blocked dashboard
with charts and panels — not a flat form-only layout.** The app should feel like a premium
fintech dashboard adapted for lab equipment management.
