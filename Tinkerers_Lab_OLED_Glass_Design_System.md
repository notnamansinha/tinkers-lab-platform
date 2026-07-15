# Tinkerers Lab — OLED Glass Design System

This document defines the visual language to apply across the webapp so the interface feels like the reference images: soft, premium, frosted, airy, and deeply ambient. The goal is a **high-fidelity visual match** in mood, material, lighting, and hierarchy, while still fitting the product’s own structure and information architecture.

---

## 1) Core visual direction

The interface should feel like a **luxury glass object floating in space**.

The reference style is defined by:
- **Soft glassmorphism** instead of hard borders
- **Large blurred light fields** instead of obvious gradients
- **Rounded, pill-like cards** with generous curvature
- **High contrast text on pale frosted surfaces**
- **Dark outer environment** that makes the content glow
- **Minimal chrome** and very little decoration
- **Subtle depth cues** using blur, opacity, and shadow rather than heavy outlines

The dashboard should stop feeling like a flat admin panel and instead feel like a **premium consumer product UI**.

---

## 2) Palette

### Base canvas
- App background: near-black charcoal / ink
- Secondary background: deep graphite
- Surface white: soft milky white, never pure white
- Surface blue: pale ice blue
- Surface purple: muted violet
- Accent green: desaturated lime
- Accent yellow: warm lemon
- Accent orange: soft amber
- Accent pink: saturated but softened magenta

### Recommended tone values
- `#050505` — main canvas
- `#111111` — sidebar / secondary shell
- `#181818` — dark card surface
- `#F8F1B7` — creamy panel
- `#D8EA38` — lime status card
- `#FFB23E` — amber status card
- `#5A55F3` — vivid violet status card
- `#F06AD9` — pink attention panel
- `#D7E8F6` — icy glass blue
- `#FFFFFF` — text highlights only

### Color behavior
- Avoid neon saturation that looks gamified.
- Prefer **slightly muted but luminous** colors.
- Use a **small number of bold accent cards** against a mostly dark base.
- Reserve the brightest pink / lime / amber blocks for summary metrics only.

---

## 3) Lighting and gradients

The look depends heavily on lighting.

### What to use
- **Very large soft gradients** with no visible center point
- **Multi-stop blur diffusion** that melts into the background
- **Foggy bloom** around bright panels
- **Translucent overlays** on light cards
- **Ambient glow** behind hero content

### What to avoid
- Visible radial gradient circles
- Hard linear gradient edges
- Loud neon outlines
- Flat monochrome cards without depth
- Dense shadows that make elements feel heavy

### Gradient style
Use gradients that feel like:
- frosted acrylic
- light passing through milky glass
- soft atmospheric diffusion
- underwater reflections

Recommended gradient language:
- `radial-gradient(...)` only when heavily blurred and diffused
- layered `linear-gradient(...)` with low opacity overlays
- `backdrop-filter: blur(...)` to soften everything behind glass panels

---

## 4) Surface and card styling

### Standard card model
Every card should follow this structure:
- Large radius: **24px to 36px**
- Soft shadow: wide, low-opacity, blurred
- Border: very subtle or nearly invisible
- Fill: semi-opaque glass or dense solid color depending on card type
- Padding: generous, never cramped

### Card types

#### A. Frosted glass card
Use for charts, summaries, modal-like content, and controls.
- Background: white / pale blue / pale gray at 70–92% opacity
- Blur: strong
- Shadow: soft and spread out
- Border: 1px subtle white overlay at low opacity

#### B. Solid accent card
Use for KPI tiles, alerts, and quick stats.
- Background: a single bold hue
- Text: dark or white depending on contrast
- No heavy decoration
- Slight elevation only

#### C. Dark utility card
Use for controls, action clusters, and nav-adjacent blocks.
- Background: deep charcoal
- Border: faint low-contrast stroke
- Shadow: minimal, enough to lift from background

### Corner treatment
- Primary cards: 28px to 34px radius
- Small buttons: 16px to 20px radius
- Pills: 999px radius
- Input fields: 18px to 24px radius

---

## 5) Typography

Typography in the references is extremely light, clean, and modern.

### Style
- Headings: elegant sans serif, medium weight
- Body: clean sans serif, regular to medium
- Numeric values: larger, lighter, and spacious
- Labels: small, all-caps or near-caps, low emphasis

### Rules
- Keep labels tiny and restrained
- Let metric values dominate visually
- Use tracking slightly wider on labels
- Avoid overly bold headlines
- Avoid chunky UI fonts

### Hierarchy
1. Primary metric number
2. Section title
3. Supporting descriptor
4. Tiny metadata / status label

---

## 6) Layout rules

### Overall structure
- Use a **dark full-viewport shell**
- Left sidebar should be slim and quiet
- Main dashboard should be centered with strong vertical rhythm
- Content should float in a calm, spacious grid

### Spacing
- Use generous outer margins
- Avoid dense tables unless absolutely necessary
- Leave air between sections
- Treat every cluster as a self-contained island

### Grid behavior
- Main dashboard: 12-column or 2-region layout
- KPI tiles: horizontal strip with compact gaps
- Lower content: 2-column balance
- Action blocks: clustered, not scattered

### Density
The current dashboard is too packed and too “admin app”.
Move toward:
- fewer visible borders
- fewer competing colors on one screen
- more breathing room
- stronger visual center

---

## 7) Sidebar treatment

The sidebar should be understated and elegant.

### Sidebar style
- Very dark background
- Narrow width
- Soft active pill state
- Minimal icons
- Small labels
- No heavy lines

### Active state
- Rounded pill with a calm violet or blue accent
- Soft glow, not a harsh neon highlight
- Icon and text aligned tightly

### Inactive state
- Low-contrast text
- Faded icon strokes
- No extra outlines

---

## 8) KPI cards

KPI cards are the strongest visual language in the reference UI.

### Design rules
- One bold color per tile
- Large number
- Tiny label above
- Rounded rectangle shape
- Minimal icon in the top-right or corner

### Example roles
- Availability: lime
- Active projects: cream
- Booking: amber
- Checked out tools: violet
- Overdue items: dark neutral

### KPI card behavior
- Keep the cards visually simple
- Make them feel like tactile status chips blown up into panels
- Numbers should have the most visual weight

---

## 9) Charts and data displays

Charts should feel like soft analytics, not enterprise BI.

### Chart rules
- Thick rounded bars or smooth filled shapes
- Very soft background grid or none at all
- Minimal axis lines
- No harsh data labels
- Low-opacity legends

### Preferred chart style
- Simple bar visualization
- Soft gradient fill
- Rounded ends
- Floating legend dots

### Avoid
- Hard axes
- Overdrawn grid lines
- Dense tick labels
- Technical clutter

---

## 10) Buttons and actions

### Primary button
- Dark or saturated accent fill
- Rounded pill shape
- Soft shadow
- Strong but not aggressive contrast

### Secondary button
- Frosted glass fill or low-contrast dark fill
- Simple icon + label
- No borders unless very subtle

### Quick action tiles
- Use mini cards with icons
- Keep them tactile and chunky
- Allow one strong accent color among otherwise muted blocks

---

## 11) Opacity rules

Opacity is a key part of the visual identity.

### Suggested ranges
- Background glass overlays: 55%–85%
- Text on glass: 70%–100%
- Ghost labels: 30%–55%
- Dividers: 8%–18%
- Shadows: soft, diffuse, low alpha

### Rule of thumb
If a surface starts feeling flat, increase blur and reduce border emphasis before increasing shadow strength.

---

## 12) Shadow rules

Shadows should feel like soft lift, not strong elevation.

### Good shadow behavior
- Large blur radius
- Low opacity
- Wide spread
- Slight ambient warmth or coolness depending on card color

### Avoid
- Hard black shadows
- Sharp drop shadows
- Multiple stacked shadows that look synthetic

---

## 13) Material language

The visual system should imply these materials:
- frosted glass
- soft rubberized matte surface
- translucent acrylic
- liquid gel light
- polished dark ceramic

Nothing should feel like a standard bootstrap admin panel.

---

## 14) Motion behavior

Motion should be smooth and restrained.

### Animation style
- Slow ease-in-out transitions
- Gentle hover lift
- Soft opacity fades
- Slight scale-up on focus
- No bouncy or playful motion

### Suggested interaction feeling
- Calm
- Premium
- Confident
- Quietly responsive

---

## 15) Application rules for the existing webapp

### Replace the current feel
The current dashboard should be refactored from:
- “bright colorful admin board”
into:
- “premium ambient glass dashboard”

### Apply across all pages
Use the same language on:
- Dashboard
- Machines
- Bookings
- Inventory
- Projects
- Profile
- Admin views

### Consistency rules
- Same card curvature everywhere
- Same shadow softness everywhere
- Same label scale everywhere
- Same glass opacity family everywhere
- Same icon stroke style everywhere

### Admin-specific rule
Admins may have more data, but the interface should still feel elegant.
Add complexity through structure, not visual noise.

---

## 16) Recommended page composition

### Top shell
- left sidebar
- top status bar or header strip
- main canvas in the center

### Main dashboard
- row 1: compact KPI tiles
- row 2: one main chart + one attention panel
- row 3: utility / quick actions / secondary overview

### Side panel behavior
- Use a tall accent panel for urgent actions or schedule status
- Keep it visually bold but structurally simple

---

## 17) Do / Don’t

### Do
- Use big rounded surfaces
- Use blur and opacity generously
- Use a few saturated accent tiles
- Keep typography light and refined
- Keep layout spacious and balanced

### Don’t
- Don’t use childish rainbow colors
- Don’t use hard grid borders
- Don’t overload the page with boxes
- Don’t make icons oversized or cartoonish
- Don’t use aggressive shadows or glowing outlines

---

## 18) Implementation checklist

- [ ] Replace flat cards with glass or premium solid panels
- [ ] Standardize radius across all components
- [ ] Rebuild KPI tiles with bold single-color blocks
- [ ] Convert charts to soft, rounded visualizations
- [ ] Reduce sidebar visual noise
- [ ] Introduce ambient background lighting
- [ ] Harmonize button shapes and opacity
- [ ] Unify all pages under one visual system
- [ ] Remove childish color clashes
- [ ] Make the UI feel calm, polished, and tactile

---

## 19) One-line design brief

**Build a dark, frosted-glass, OLED-inspired interface with soft ambient gradients, rounded tactile cards, minimal chrome, and premium calm visual hierarchy across the entire app.**
