# Tinker's Lab — Device Management System

A digital platform for managing equipment booking, tool checkout, and project tracking at the Innovation and Tinkering Lab, Ahmedabad University. Built entirely using free Google tools — Google Forms, Google Sheets, Google Calendar, Google Apps Script, and Gmail.

---

## Goals

- Track who uses which equipment and when
- Register projects and link them to equipment usage
- Automate confirmation and reminder emails
- Prevent double-booking of machines
- Maintain separate logs per machine for easy tracking
- Support four user types: Students, Professors, Venture Studio Startups, External Visitors

---

## User Types

| Type | Description |
| --- | --- |
| Student | University students working on coursework or personal projects |
| Professor / Faculty | Faculty members using the lab for research or teaching |
| Venture Studio Startup | External startups partnered with the university |
| External Visitor | Outside individuals or organizations visiting the lab |

---

## Equipment Inventory (from Quotation)

### Tier 1 — Bookable Machines (Calendar Booking Required)

These are expensive, time-slotted machines where only one user can operate at a time.

| SRN | Item | Make | Model | Qty |
| --- | --- | --- | --- | --- |
| 1 | 3D Printer | Bambu Labs | X-1C MultiColour | 1 |
| 2 | Ender 3V3 + | Creality | V3 Scanner / Dual Nozzle | 1 |
| 3 | Laser Cutter | SUCCESS | — | 1 |
| 4 | Muffle Furnace | Surya | S-900 | 1 |
| 5 | Lathe Machine | ESSKAY | KL-2 | 1 |
| 6 | Manual Sheet Bending | ESSKAY | — | 1 |
| 7 | Acrylic Banding Machine |  |  | 1 |
| 8 | Pillar Drill | Panchavati | 2HP | 1 |
| 9 | Table Saw | BOSCH | GTS 10J | 1 |
| 10 | Mitre Saw | BOSCH | GCM 254 | 1 |
| 11 | Metal Cut-off Saw | BOSCH | GCO 220 | 1 |
| 12 | ESD Workstation | Shrang | AWS 12060SP | 1 |
| 13 | Digital Oscilloscope | OWON | SDS1022 | 1 |
| 14 | Function Generator | GW INSTEK | SFG1003 | 1 |
| 15 | Soldering Station | Weller | WE1010 | 1 |

### Tier 2 — Checkout Items (Borrow & Return)

Hand tools, smaller power tools, measurement instruments. Simple checkout log.

**Power Tools:** Angle Grinder, Bench Grinder, Jig Saw, Cordless Drilling Machine, Air Blower, Heat Gun, Random Orbit Sander, Impact Drill, Planner

**Hand Tools:** Hacksaws, Hammers, Mallets, Spanners, Pliers, Circlip tools, Cutters, Wrenches, Clamps, Knives, Screwdrivers, Snip Cutters, Pipe Cutters, Glue Guns, File Sets, Chisels, Punch Sets, Drill Bit Sets, Stapler Guns

**Measurement Tools:** Digital Vernier Caliper, Micrometer, Steel Rules, Degree Protector, Inside/Outside Calipers, Engineering Square, Measuring Tapes, Spirit Level, Weighing Scale

**Electronics:** Power Supply 60V 10A, Digital Multimeter (Fluke 15B+), Vaccum Cleaner

### Tier 3 — Freely Available (No Booking Needed)

Safety gear and infrastructure. Track inventory only.

**Safety:** Goggles, Ear Protection, Gloves, First Aid Kit, Aprons, Masks

**Infrastructure:** Mechanical Workbench, Storage, Component Organizer, Portable White Board, Cutting Mat, Pegboard

---

## System Architecture

### Forms (4 Total)

**Form 1: Project Registration** — One-time registration per project

**Form 2: Book a Machine** — For Tier 1 bookable machines

**Form 3: Checkout a Tool** — For Tier 2 borrow/return items

**Form 4: Report an Issue / Suggestion** — For problems or feedback

### Data Flow

```
User fills Project Registration Form
        ↓
Data lands in Google Sheet (Project Registry tab)
        ↓
User gets confirmation email with Project details
        ↓
User fills Book a Machine form (selects their project)
        ↓
Data lands in Google Sheet (Machine Bookings tab)
        ↓
Apps Script creates Google Calendar event
        ↓
Apps Script sends confirmation email
        ↓
Apps Script routes booking to machine-specific sheet
        ↓
Apps Script sends reminder email 24hrs before booking
```

---

## Form Structures

### Form 1: Project Registration

**Title:** Tinker's Lab — Project Registration

**Description:** Welcome to the Innovation and Tinkering Lab, Ahmedabad University. Please fill this form to register your project.

**Section 1: Who Are You?**

- User Type — Dropdown, Required
    - Options: Student / Professor or Faculty / Venture Studio Startup / External Visitor
    - This field controls conditional branching (Go to section based on answer)

**Section 2: Student Details** (appears if Student selected)

1. University ID — Short answer, Required
2. Full Name — Short answer, Required
3. Email ID — Short answer, Required, Email validation
4. Contact Number — Short answer, Required
5. Department — Short answer, Required
6. Course or Curriculum Name — Short answer, Optional
7. Faculty Advisor — Short answer, Optional (helper: "Leave blank if not applicable")
8. Team Name — Short answer, Optional
9. Team Members — Paragraph, Optional (helper: "Names and IDs of teammates")

**Section 3: Professor or Faculty Details** (appears if Professor selected)

1. Full Name — Short answer, Required
2. Email ID — Short answer, Required, Email validation
3. Contact Number — Short answer, Required
4. Department — Short answer, Required
5. Research Area or Subject — Short answer, Required
6. Associated Course — Short answer, Optional
7. Students Involved — Paragraph, Optional

**Section 4: Venture Studio Startup Details** (appears if Venture Studio selected)

1. Founder / Contact Person Name — Short answer, Required
2. Email ID — Short answer, Required, Email validation
3. Contact Number — Short answer, Required
4. Startup Name — Short answer, Required
5. Industry / Domain — Short answer, Required
6. Brief About Your Startup — Paragraph, Required
7. Team Members Using the Lab — Paragraph, Optional

**Section 5: External Visitor Details** (appears if External selected)

1. Full Name — Short answer, Required
2. Email ID — Short answer, Required, Email validation
3. Contact Number — Short answer, Required
4. Organization / Institution — Short answer, Required
5. Designation / Role — Short answer, Required
6. Purpose of Visit — Paragraph, Required
7. Referral — Short answer, Optional

**Section 6: Project Details** (appears for ALL user types)

1. Project Title — Short answer, Required
2. Project Abstract — Paragraph, Required
3. Expected Equipment Needs — Checkboxes, Optional
    - Options: 3D Printer, Laser Cutter, Muffle Furnace, Lathe Machine, Sheet Bender, Pillar Drill, Table Saw, Mitre Saw, Cut-off Saw, ESD Workstation, Oscilloscope, Function Generator, Soldering Station, Hand Tools, Power Tools, Other
4. If Other, please specify — Short answer, Optional
5. Project Start Date — Date, Required
6. Estimated End Date — Date, Required
7. Project Resource — File Upload, Optional
8. Project Resource — Link, Optional

**Section 7: Acknowledgement**

1. Safety Agreement — Checkbox, Required: "I agree to follow lab safety guidelines and return all tools and equipment after use."
2. Terms Agreement — Checkbox, Required: "I understand that equipment booking is subject to availability and coordinator approval."

**Confirmation Message:** Thank you for registering! A lab coordinator will review your submission.

---

### Form 2: Book a Machine

**Title:** Tinker's Lab — Book a Machine

**Fields (current build):**

1. Project — Dropdown, Required (only admin-approved/active projects are listed)
2. Machine — Dropdown, Required, appears after a project is selected
    - Bambu Labs 3D Printer (X-1C)
    - Creality Dual Nozzle 3D Printer
    - Success Laser Cutter
    - Muffle Furnace (S-900)
    - Lathe Machine (KL-2)
    - Manual Sheet Bender
    - Pillar Drill (2HP)
    - Table Saw (GTS 10J)
    - Mitre Saw (GCM 254)
    - Metal Cut-off Saw (GCO 220)
    - ESD Workstation
    - Digital Oscilloscope
    - Function Generator
    - Soldering Station
3. Booking Date — Date, Required
4. Start Time — Time, Required
5. End Time — Time, Required
6. Purpose of Use — Paragraph, Required
7. Additional Notes — Paragraph, Optional

> **Flow note:** booking requires a project first. Only active (approved) projects are shown, and a "New Project" shortcut lets users create one without leaving the form.

---

### Form 3: Checkout a Tool

**Title:** Tinker's Lab — Tool Checkout

**Fields:**

1. Full Name — Short answer, Required
2. Email — Short answer, Required
3. Student ID — Short answer, Required
4. Action — Multiple choice: Checking Out / Returning, Required
5. Tool Category — Dropdown: Hand Tools / Power Tools / Measurement Tools / Safety Equipment / Other, Required
6. Specific Tool — Short answer, Required
7. Quantity — Short answer, Required
8. Expected Return Date — Date, Required
9. Condition at Checkout — Multiple choice: Good / Fair / Damaged, Required
10. Notes — Paragraph, Optional

---

### Form 4: Report an Issue / Suggestion

**Title:** Tinker's Lab — Report or Suggest

**Fields:**

1. Your Name — Short answer, Required
2. Email — Short answer, Required
3. Type of Report — Multiple choice: Machine Malfunction / Safety Concern / Missing or Damaged Item / Suggestion / Other, Required
4. Related Machine or Tool — Short answer, Optional
5. Severity — Multiple choice: Low / Medium / High / Urgent, Required
6. Description — Paragraph, Required
7. When did you notice this? — Date, Optional
8. Photo — File upload, Optional

---

## Google Sheets Structure

### Master Spreadsheet: "Tinker's Lab Management"

**Tab 1: Project Registry** (auto-filled from Form 1)

- Timestamp, User Type, Full Name, Email, Contact, Organization/Dept, Project Title, Project Abstract, Equipment Needs, Start Date, End Date, Status

**Tab 2: All Machine Bookings** (auto-filled from Form 2)

- Timestamp, Email, Machine, Date, Start Time, End Time, Purpose, Status (Pending/Approved/Completed/Cancelled)

**Tab 3: Tool Checkouts** (auto-filled from Form 3)

- Timestamp, Name, Email, Action, Tool Category, Tool Name, Qty, Return Date, Condition, Notes

**Tab 4: Issues & Suggestions** (auto-filled from Form 4)

- Timestamp, Name, Email, Type, Machine/Tool, Severity, Description, Date Noticed, Status (Open/In Progress/Resolved)

### Machine-Specific Sheets (auto-routed by Apps Script)

- 3D Printer Bookings
- Laser Cutter Bookings
- Lathe Machine Bookings
- Electronics Workstation Bookings
- Power Tools Bookings
- (one sheet per machine or machine group)

### Dashboard Sheet

- Today's bookings summary
- Currently checked-out tools
- Open issues count
- Usage statistics per machine

---

## Implementation Timeline

### Day 1: Forms & Sheets Setup

- [x]  Create Project Registration Form (Form 1) — IN PROGRESS
- [ ]  Update Form 1 with conditional branching for 4 user types
- [ ]  Create Book a Machine Form (Form 2)
- [ ]  Create Tool Checkout Form (Form 3)
- [ ]  Create Report Issue Form (Form 4)
- [ ]  Link all forms to master Google Sheet
- [ ]  Set up machine-specific sheet tabs
- [ ]  Test all form submissions

### Day 2: Automation & Calendar

- [ ]  Create Google Calendar for lab equipment
- [ ]  Write Apps Script: auto-route bookings to machine sheets
- [ ]  Write Apps Script: create calendar events on booking
- [ ]  Write Apps Script: send confirmation emails
- [ ]  Write Apps Script: send 24hr reminder emails
- [ ]  Write Apps Script: overdue tool checkout alerts
- [ ]  Test full automation flow

### Day 3: Polish & Launch

- [ ]  Test end-to-end with dummy data
- [ ]  Create Google Site landing page (optional)
- [ ]  Add dashboard view in sheets
- [ ]  Final documentation
- [ ]  Share forms with lab users
- [ ]  Go live

---

## Future Improvements (Post-MVP)

- Double-booking prevention (conflict checker in Apps Script)
- Machine Training Tracker sheet
- Multi-user project collaboration
- Gemini integration for smart notifications
- Usage analytics dashboard
- Google Workspace branded emails
- QR codes on machines linking to booking form

---

## Key Links

- Project Registration Form: [To be added]
- Book a Machine Form: [To be added]
- Tool Checkout Form: [To be added]
- Report Issue Form: [To be added]
- Master Google Sheet: [To be added]
- Google Calendar: [To be added]
- Google Site: [To be added]

---

## Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| June 26, 2026 | Use Google Forms + Sheets + Apps Script as core stack | Free, scalable, no coding expertise needed |
| June 26, 2026 | Split equipment into 3 tiers (Book / Checkout / Free) | Different tracking needs per equipment type |
| June 26, 2026 | Separate Project Registration from Machine Booking | Users register once, book machines many times |
| June 26, 2026 | 4 user types with conditional form sections | Students, Professors, Startups, External all have different info needs |
| June 26, 2026 | Machine-specific sheets routed by Apps Script | Easier to track usage history per machine |
| June 26, 2026 | MVP first, scale later | Get system running in 2-3 days, add features incrementally |
| August 10, 2026 | Global `cleanFirestoreData` payload sanitizer | Prevents `undefined` field errors from failing Firestore `addDoc`/`updateDoc` writes |
| August 10, 2026 | Custom Dark OLED Date Picker (`AestheticDatePicker`) | Replaced native browser date pickers with dark popover calendar, presets (Today/Tomorrow/Next Week), and Lime accents |
| August 10, 2026 | Structured Agreement Panel & Neon-Yellow Chips | Harmonized form agreements with `AgreementCard` square checkmark boxes and neon-yellow (`lime`) equipment chips with tick icons |
| August 10, 2026 | Resilient Feedback Submission | Added permission-safe local storage buffering for feedback/issue forms to guarantee smooth user experience |
| August 10, 2026 | Admin Project Status Fix | `AdminProjectsPage` resolves the Firestore doc ID via a fallback lookup by sequential project code (e.g. `TL-001`), surfaces permission-denied errors with actionable guidance, and uses `cleanFirestoreData` before `updateDoc` |
| August 11, 2026 | Firebase Config Fail-Fast | Removed unconditional development credential fallbacks; `lib/firebase.ts` now throws if no `VITE_FIREBASE_API_KEY`/`_B64` is present unless emulator mode (`VITE_USE_EMULATORS=true`) is explicitly enabled |
| August 11, 2026 | Per-User Feedback Cooldown | Feedback rate-limit key is now scoped by UID (`tl_feedback_lastSentAt_{uid}`) so one account's submission never blocks another |
| August 11, 2026 | Dashboard Booking Filter | Upcoming schedule now drops completed same-day sessions (today's bookings require `endTime >= now`) while keeping date + start-time sorting; added the `userId`+`date` composite Firestore index |
| August 11, 2026 | Local-Time Date Utilities | `todayStr()` now constructs the date from local `getFullYear`/`getMonth`/`getDate` instead of UTC `toISOString()` to avoid off-by-one today-highlighting near timezone boundaries; `getWeekDays` and all `new Date(weekDays[...])` call sites parse YYYY-MM-DD as local midnight (`T00:00:00`) |
| August 11, 2026 | FieldValue Sentinel Preservation | `cleanFirestoreData` detects Firestore `FieldValue` sentinels (e.g. `serverTimestamp()`) via `_methodName` and returns them unchanged so `createProject` and `createBooking` writes are not stripped |
| August 11, 2026 | Component Accessibility Pass | Resolved 6 nested-interactive/accessibility issues: (1) `AestheticDatePicker` clear button moved outside trigger `<button>` as a sibling `<button>`, (2) Equipment card "Book" quick-action changed from `<span>` to `<button>` sibling, (3) `ProjectListPage` `EntityCard` receives `as="button"` for focusability, (4) `AgreementCard` tracks local checked state for uncontrolled checkbox registrations, (5) `BookingCalendarPage` My Bookings panel renders a loading state before empty-state, (6) `IssueFormPage` catch block shows error toast and keeps form mounted for retry |
| August 11, 2026 | Staff Tool Checkout Includes Returned | Added `getAllCheckouts()` to `toolCheckouts.ts` returning all checkout records (active + returned); staff view in `ToolCheckoutListPage` now uses this so the "Returned" filter shows actual data |
| August 11, 2026 | Project Edit Preserves Agreements | `ProjectFormPage` edit-flow `updateDoc` payload now includes `safetyAgreementAccepted` and `termsAccepted` so agreement changes are persisted alongside project fields |
| August 11, 2026 | FilterChip API Cleanup | Removed unused `tone` prop from `FilterChipProps` and all `tone="dark"` usages in `AdminProjectsPage` — the prop was silently ignored |
| August 12, 2026 | Service Worker Offline Caching | `sw.js` precaches the app shell (`/`) on install and runtime-caches document responses so recently visited pages still load from cache when offline |
| August 12, 2026 | Hardened Firestore Sanitizer | `cleanFirestoreData` now detects all Firestore sentinel types (`FieldValue`, `Timestamp`, `GeoPoint`, `DocumentReference`, `Bytes`) instead of probing `_methodName`, so server timestamps and document refs survive recursive cleaning |
| August 12, 2026 | Bounded Checkout History Query | `getAllCheckouts()` queries with `orderBy('createdAt', 'desc')` + `limit(500)` instead of loading and sorting the entire collection in memory |
| August 12, 2026 | Centralized Equipment Status Dots | Status dot color/pulse moved into `STATUS_CONFIG` (available/reserved/in_use/maintenance/out_of_service/retired) as a single source of truth for the overlay badge |
| August 12, 2026 | Accessible Search Fields | Search inputs across equipment, bookings, issues, and admin tables gained explicit `aria-label`s |
| August 12, 2026 | Responsive Space Utilization — Shell & Spacing | Single fluid `min-h-svh` shell: sidebar collapses to a compact 64px icon rail at tablet (`md`) and expands to the full labeled rail at `xl`; duplicate desktop top-bar brand chrome removed; page-level `pb-20` and `.container` gutters consolidated into one shell-owned fluid padding; mobile pill nav is safe-area aware and includes an Admin entry for staff |
| August 12, 2026 | Responsive Space Utilization — Grids & Controls | Content-aware grids (`auto-fit`/`minmax`), dashboard columns delayed to `lg`/`xl`, fluid chart heights with aspect-ratio sizing, mobile forms stack with full-width actions and ≥44px touch targets, admin/detail tables hide low-priority columns on phones while keeping actions visible, and shared cards/headers/filters/date-picker use responsive padding. Palette, typography, routes, and data flows unchanged |

[Tool Access System — Finalized Spec (Booking + Checkout)](https://app.notion.com/p/Tool-Access-System-Finalized-Spec-Booking-Checkout-390365156faf8132a648d5be74af5309?pvs=21)