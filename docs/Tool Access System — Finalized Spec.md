# Tool Access System — Finalized Spec (Booking + Checkout)

Finalized specification for Tinker's Lab machine booking and tool checkout system. This branch documents the agreed design as of July 1, 2026 — ready to build.

---

## Core design decision: calendar vs. checkout

Two different mechanisms, matched to how each tier actually gets used.

| Tier | Mechanism | Why |
| --- | --- | --- |
| Digital Fabrication (3D printers x3, Laser Cutter) | Calendar-based time-slot booking | Single unit per machine, exclusive use, jobs run for hours. A calendar prevents double-booking and lets students see availability before booking. |
| Power Tools | Checkout / Return log | Multiple units per item, short usage bursts. Calendar-booking would flood the calendar with short entries daily. |
| Hand Tools | Checkout / Return log | Same reasoning as Power Tools — multi-unit, short-use items. |

---

## The key architectural decision: email as universal lookup key

Users should never re-enter their name, university ID, or department more than once. Email is the join key across every form.

**How it works:**

- Student registers a project once in Form 1 (Project Registration)
- On every later form (Book a Machine, Checkout a Tool), they enter only their email
- Apps Script looks up that email against the Form 1 responses and auto-populates name, university ID, and registered projects
- If the email isn't found, the submission is rejected with a message asking them to register a project first

This also sets up the database backend needed for future analytics (who uses the lab most, consumables trends, tool location history) without any additional data entry burden on students.

---

## System architecture (data flow)

| Step | Component | What happens |
| --- | --- | --- |
| 1 | Form 1 — Project Registration | One-time signup. Already live, collecting real responses. |
| 2 | User &amp; Project Database | Form 1 responses, keyed by email. Looked up (not re-entered) by every later form. |
| 3a | Form 2A — Book a Machine | Email auto-fills user details. Books a time slot for a digital fabrication machine. |
| 3b | Form 2B — Checkout a Tool | Email auto-fills user details. Logs a power/hand tool checkout. |
| 4a | Machine booking log | Creates a Google Calendar event + logs consumables (filament/material) used. |
| 4b | Tool checkout log | Logs the checkout with location tracking (In Lab / Taking Outside Lab). |
| 5 | Gmail notifications | Confirmations on submit, 24-hour booking reminders, overdue tool alerts, conflict rejections. |
| 6 | Future analytics dashboard | Not built yet — architecture is ready for it. Usage patterns, consumption trends, tool location history. |

---

## Form 2A: Book a Machine

**Applies to:** Bambu Lab X1 Carbon, Creality Ender 3 V3, Phrozen Sonic Mighty 12K, Laser Cutter — the 4 machines confirmed in the actual TL inventory (the longer "Tier 1" list from the original plan, e.g. lathe, table saw, muffle furnace, was from a quotation and isn't confirmed as physically present yet).

| Field | Type | Notes |
| --- | --- | --- |
| Email | Short answer, validated | Universal key — triggers auto-lookup of user details from Form 1 |
| Machine | Dropdown | Bambu Lab X1 Carbon / Creality Ender 3 V3 / Phrozen Sonic Mighty 12K / Laser Cutter |
| Booking Date, Start Time, End Time | Date/Time pickers | Required |
| Purpose of Use | Paragraph | Required |
| Filament Type / Color / Quantity | Conditional section | Shows only if a 3D printer is selected |
| Material Type / Size | Conditional section | Shows only if Laser Cutter is selected — Acrylic / MDF / Plywood / Other |
| Safety Agreement | Checkbox | Required |

**On submission:** creates a Google Calendar event (title format: Machine — Name — Project), checks for time conflicts on the same machine (rejects + emails if conflict found), logs booking + consumables, sends confirmation email with calendar attachment.

**Consumables tracking rationale:** by logging filament/material used per booking, monthly usage data feeds directly into procurement decisions (e.g. "used 10kg PLA+, 20 acrylic sheets this month").

---

## Form 2B: Checkout a Tool

**Applies to:** all Power Tools and Hand Tools in the TL inventory.

| Field | Type | Notes |
| --- | --- | --- |
| Email | Short answer, validated | Universal key — same auto-lookup as Form 2A |
| Action | Multiple choice | Checking Out / Returning |
| Tool Category | Dropdown | Power Tools / Hand Tools |
| Specific Tool | Short answer | Matched against TL inventory sheet on the Viewer side |
| Quantity | Short answer | Required |
| Location of Use | Dropdown | In Lab / Taking Outside Lab |
| If Taking Outside, Where? | Short answer | Conditional — tracks off-premises location for accountability |
| Expected Return Date &amp; Time | Date + Time | Required for Checking Out |
| Condition at Checkout | Multiple choice | Good / Fair / Damaged |

**On submission:** logs to Tool Checkouts sheet, flags off-premises checkouts for tracking, sends confirmation email. No calendar event — tools are logged, not scheduled. Daily trigger flags anything overdue (past Expected Return Time with no matching Return entry).

---

## Gmail notification system

| Notification | Trigger | Applies to |
| --- | --- | --- |
| Booking / checkout confirmation | Immediately on submit | Both forms |
| 24-hour booking reminder | Daily trigger, scans upcoming bookings | Form 2A only |
| Overdue tool alert | Daily trigger, checks past-due checkouts | Form 2B only |
| Conflict rejection notice | Immediately if overlap detected | Form 2A only |

All sent via MailApp.sendEmail() inside Apps Script — no third-party service needed.

---

## Decisions confirmed so far

| Decision | Choice |
| --- | --- |
| Machine list scope | Only the 4 confirmed machines (no aspirational Tier 1 list added yet) |
| Booking confirmation model | Auto-confirm instantly, with conflict-check rejection as the safety net |
| Project linkage | Required — every booking/checkout must reference a registered project, self-reported and soft-enforced in v1 via the Viewer sheet |
| Consumables tracking | Yes — filament (3D printers) and material type/size (laser cutter) logged per booking |
| Tool location tracking | Yes — In Lab vs. Taking Outside Lab, with optional "where" field |
| User re-entry | Eliminated — email is the universal lookup key across all forms |

---

## Open items still needing a decision

1. Is Ahmedabad University a Google Workspace domain? (affects Gmail sending limits and calendar-sharing permissions)
2. Should the shared Machine Booking calendar be public, or restricted to @[ahduni.edu.in](http://ahduni.edu.in) accounts?
3. Should tool checkout automatically decrement the inventory sheet's Available Qty, or just log without touching stock numbers (v1 = log only, recommended)?

---

## Special case: January two-person booking

Two specific people start using the system in January. They use Form 2A like everyone else — no special code path needed. If isolation from the general calendar is wanted later, a second "Reserved" calendar can be added with a simple email-based routing condition in the Apps Script.

---

## Explicitly out of scope for this build

- **Attendance system integration** — flagged as a future phase. The architecture stays compatible with it because every form captures University ID and Email consistently, and Google Forms timestamps every submission natively. No changes needed now to support this later.
- **Live inventory stock decrement** — v1 logs consumables and checkouts without automatically adjusting stock counts. Can be added once the base system is stable.
- **Double-booking conflict prevention beyond same-machine time overlap** — v1 checks the same machine for overlapping times only; more complex resource conflicts are not handled.

---

## Build order

1. Form 2A (Book a Machine) + email-lookup Apps Script + conditional consumables fields + calendar creation + conflict checking + notifications
2. Form 2B (Checkout a Tool) + email-lookup Apps Script + location tracking + overdue alerts + notifications
3. Consolidated Viewer sheet(s) for both forms, same pattern as the existing Project Registration Viewer
4. End-to-end test: register a test project, book a machine, checkout a tool, verify email lookup and notifications work correctly