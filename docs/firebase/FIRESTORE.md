# 🔥 Firestore Reference — Tinkers' Lab Platform

> **Authoritative reference for Cloud Firestore in this project**: collection layout, document schemas, security-rule behavior, and composite indexes.
>
> - **Source of truth:** [`firestore.rules`](../../firestore.rules) · [`firestore.indexes.json`](../../firestore.indexes.json) · [`src/types/index.ts`](../../src/types/index.ts) · [`src/services/firebase/firestore.ts`](../../src/services/firebase/firestore.ts)
> - **Companion:** [`../architecture/data-architecture.md`](../architecture/data-architecture.md) (design rationale, walkthroughs, ID generation) · [`../architecture/overview.md`](../architecture/overview.md) (system overview)
> - **Deployment:** [`DEPLOYMENT.md`](DEPLOYMENT.md)

---

## 1. Storage Layout

| Service | Purpose | Scope in this app |
|---|---|---|
| **Firebase Auth** | Identity | Google sign-in (popup + redirect fallback) → produces the `uid` that keys everything |
| **Cloud Firestore** | Primary database | 18 collections/subcollections (see §2) |
| **Firebase Storage** | Binary files | Equipment images only — see [`STORAGE.md`](STORAGE.md) |

Cloud Functions enforce the transactional write paths and invariants that clients cannot safely enforce: project creation, booking conflict checks, tool checkout creation, feedback rate limiting, notifications, and overdue sweeps. Firestore Security Rules remain the defense-in-depth boundary.

### Initialization (`src/lib/firebase.ts`)

- Firestore uses `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` → offline support + cached reads (free-tier friendly).
- Dev emulators (`VITE_USE_EMULATORS=true`): Auth `:9099`, Firestore `:8080`, Storage `:9199`.
- Config comes from `VITE_FIREBASE_*` env vars; the API key may be supplied Base64-encoded via `VITE_FIREBASE_API_KEY_B64` and is decoded at runtime.
- Fails fast with a clear error if the app is initialized without a key/project/App ID (or emulator mode).

---

## 2. Collection Map

| # | Collection | Path | Doc ID | Who creates |
|---|---|---|---|---|
| 1 | `users` | `users/{uid}` | Firebase Auth `uid` | Self on first sign-in |
| 2 | `projects` | `projects/{docId}` | Auto random + `projectCode` (`TL-XXX`) | **Cloud Function** (`createProject`) |
| 3 | Project bookings | `projects/{projectId}/bookings/{bookingId}` | Auto | **Cloud Function** (`createBooking`) |
| 4 | Project checkouts | `projects/{projectId}/checkouts/{checkoutId}` | Auto | **Cloud Function** (`createToolCheckout`) |
| 5 | Project activity log | `projects/{projectId}/activityLog/{logId}` | Auto | Owner/staff appends + Cloud Functions |
| 5b | Project members | `projects/{projectId}/projectMembers/{memberId}` | Auto | **Cloud Function** (seed) / owner / staff |
| 6 | `counters` | `counters/projects` | Fixed: `projects` | **Cloud Function only** |
| 7 | `equipment` | `equipment/{docId}` | Auto | Staff (seeded) |
| 8 | `inventory` | `inventory/{docId}` | Auto | Staff |
| 9 | `inventoryTransactions` | `inventoryTransactions/{txId}` | Auto | Staff |
| 10 | `maintenance` | `maintenance/{recordId}` | Auto | Staff |
| 11 | `workshops` | `workshops/{workshopId}` | Auto | Staff |
| 12 | `workshopRegistrations` | `workshopRegistrations/{regId}` | Auto | User |
| 13 | `notifications` | `notifications/{notifId}` | Auto | Staff / **functions** |
| 14 | `announcements` | `announcements/{announcementId}` | Auto | Staff |
| 15 | `issues` | `issues/{issueId}` | Auto | User |
| 16 | `auditLogs` | `auditLogs/{logId}` | Auto | Staff |
| 17 | `settings` | `settings/{settingId}` | Auto | Admin |
| 18 | `feedback` | `feedback/{autoId}` | Auto | **Cloud Function** (`submitFeedback`) |
| 18b | `feedbackWindows` | `feedbackWindows/{uid}` | Fixed: uid | **Cloud Function** (rate-limit tracker) |

> **Bookings / checkouts / activityLog are subcollections of `projects`.** Cross-project views (admin lists, user history, conflict checks) use **collection-group queries** on the subcollection ids — backed by the collection-group indexes in §6.

### Denormalization rule

Firestore has no joins. Whenever a child document must display parent info (user name/email, project title, machine name), that data is **copied onto the child at write time**:

- `bookings` store `userId`, `userEmail`, `userName`, `projectId`, `projectTitle`, `machineId`, `machineName`
- `checkouts` store `userId`, `userEmail`, `userName`, `universityId`, `projectId`, `projectTitle`
- `issues` store `userId`, `userName`, `userEmail`
- `maintenance` stores `equipmentId`, `machineId`, `machineName`
- `inventoryTransactions` store `itemId`, `itemName`, `userId`, `userName`, `userEmail`

Renames only propagate on future writes — acceptable for this app.

---

## 3. Collection Schemas

> `Timestamp` = Firestore server timestamp. `"YYYY-MM-DD"` and `"HH:MM"` are **strings** (kept for cheap range comparisons / indexable queries), not `Date` values.
> Optional fields are marked `?`. Field lists below mirror `src/types/index.ts`.

### 3.1 `users/{uid}`

| Field | Type | Notes |
|---|---|---|
| `uid` | string | = document ID |
| `email` | string | From Google account |
| `displayName` | string | |
| `role` | enum | `student` (default) · `faculty` · `lab_assistant` · `super_admin` |
| `userType` | enum | `Student` · `Professor or Faculty` · `Venture Studio Startup` · `External Visitor` |
| `isActive` | boolean | `false` **revokes all access** (checked in rules) |
| `createdAt` / `updatedAt` | Timestamp | |
| `contact`?, `department`? | string | Common fields |
| `universityId`?, `courseName`?, `facultyAdvisor`?, `teamName`?, `teamMembers`? | string | Student-specific |
| `researchArea`?, `associatedCourse`?, `studentsInvolved`? | string | Faculty-specific |
| `startupName`?, `industryDomain`?, `startupBrief`?, `labTeamMembers`? | string | Venture-Studio-specific |
| `organization`?, `designation`?, `purposeOfVisit`?, `referral`? | string | External-Visitor-specific |
| `safetyAgreementAccepted`?, `termsAccepted`? | boolean | Acknowledgements |

**Rule highlights:** self-create allowed with `role = 'student'` only; self-update cannot change `role` / `isActive` / `email`; deletes and role changes are `super_admin`-only.

### 3.2 `projects/{docId}`

> Two IDs: the **document ID** (Firestore auto, used in URLs/refs) and the **`projectCode` field** (`TL-001`, `TL-002`, …) — the sequential business code users see.

| Field | Type | Notes |
|---|---|---|
| `projectCode` | string | Sequential `TL-XXX` from `counters/projects` (atomic transaction) |
| `title` | string | ≥ 5 chars (Zod) |
| `abstract` | string | ≥ 50 chars (Zod) |
| `userId` / `userName` / `userEmail` | string | Owner (denormalized) |
| `userType` | enum | Copied from profile at registration |
| `contact` | string | Phone or email |
| `department`?, `universityId`? | string | |
| `teamMembers`?, `facultyMentor`? | string | Defaults to `''` |
| `startDate` / `endDate`? | string `"YYYY-MM-DD"` | |
| `expectedEquipmentNeeds` | array of enum | 16 options incl. `Other` |
| `equipmentNeedsOther`? | string | Only when `Other` checked |
| `resourceLink`? | string | http(s) URL, optional |
| `safetyAgreementAccepted` / `termsAccepted` | boolean | **Must be `true`** (rules enforce) |
| `status` | enum | `pending` (default) → `active` / `rejected` / `on_hold` / `completed` |
| `rejectionReason`? | string | Set by admin on reject |
| `imageUrls` / `documentUrls` | string[] | Always `[]` on create (no upload UI yet) |
| `createdAt` / `updatedAt` | Timestamp | |

**Status lifecycle:** `pending` → (`active` | `rejected` | `on_hold`) · `active` → (`on_hold` | `completed`) · `on_hold` → `active`.

**Visibility:** readable only by owner or staff — no cross-user PII leak.

### 3.3 `projects/{projectId}/bookings/{bookingId}` (Form 2A — Tier-1 machines)

| Field | Type | Notes |
|---|---|---|
| `equipmentId` | string | FK → `equipment` doc ID (conflict queries) |
| `machineId` | string | Slug e.g. `laser-cutter` |
| `machineName` | string | Denormalized |
| `userId` / `userEmail` / `userName` | string | Denormalized user |
| `projectId` / `projectTitle` | string | **Required** — must reference the parent project |
| `date` | string `"YYYY-MM-DD"` | |
| `startTime` / `endTime` | string `"HH:MM"` | Rules enforce `start < end` |
| `purpose` | string | |
| `consumables`? | object | `filamentType/filamentColor/filamentQuantityGrams` (3D printers) or `materialType/materialSize` (laser cutter) |
| `safetyAgreementAccepted` | boolean | Must be `true` |
| `status` | enum | `approved` (default) · `rejected` · `cancelled` · `completed` |
| `rejectionReason`? | string | On reject |
| `cancelledBy`? | string | On cancel |
| `createdAt` / `updatedAt` | Timestamp | |

**Auto-confirm model:** bookings are written `approved` immediately. The `createBooking` callable verifies the equipment is `confirmed: true` + `tier: 'bookable'` with status `available`/`reserved` and performs overlap detection transactionally.

### 3.4 `projects/{projectId}/checkouts/{checkoutId}` (Form 2B — Tier-2 tools)

| Field | Type | Notes |
|---|---|---|
| `userId` / `userEmail` / `userName` / `universityId`? | string | Denormalized user |
| `projectId` / `projectTitle` | string | **Required** |
| `action` | enum | `checking_out` → `returning` on return |
| `toolCategory` | enum | `Power Tools` · `Hand Tools` · `Measurement Tools` · `Safety Equipment` · `Other` |
| `toolName` | string | Free text |
| `quantity` | number | |
| `locationOfUse` | enum | `in_lab` · `taking_outside` |
| `outsideLocation`? | string | **Required by rules** when `taking_outside` |
| `expectedReturnDate` | string `"YYYY-MM-DD"` | |
| `expectedReturnTime`? | string `"HH:MM"` | |
| `conditionAtCheckout` | enum | `good` · `fair` · `damaged` |
| `conditionAtReturn`? | enum | Set on return |
| `returnedAt`? | Timestamp | Set on return |
| `isOverdue` | boolean | Client-computed today (§7) |
| `notes`? | string | |
| `createdAt` / `updatedAt` | Timestamp | |

### 3.5 `equipment/{docId}`

| Field | Type | Notes |
|---|---|---|
| `machineId` | string | Slug e.g. `bambu-x1c` |
| `name` | string | |
| `tier` | enum | `bookable` (Tier 1) · `checkout` (Tier 2) · `freely_available` (Tier 3) |
| `confirmed` | boolean | **`true` = physically in the lab**; only confirmed Tier-1 machines are bookable |
| `category` | enum | `Digital Fabrication` · `Heavy Duty` · `Tabletop Power` · `Electronics` · `Other` |
| `description` | string | |
| `manufacturer`?, `modelNumber`?, `serialNumber`? | string | |
| `purchaseDate`?, `warrantyInfo`?, `installationDate`? | string | |
| `status` | enum | `available` · `reserved` · `in_use` · `under_maintenance` · `out_of_service` · `retired` |
| `healthStatus` | enum | `good` · `fair` · `poor` |
| `location` | string | Physical zone |
| `requiresTraining` | boolean | |
| `imageUrls` / `manualUrls` / `safetyDocUrls` | string[] | Storage download URLs |
| `createdAt` / `updatedAt` | Timestamp | |

Seeded by `scripts/seedEquipment.ts` (49 entries: 14 Tier-1 machines — 4 confirmed — 32 Tier-2 tools, 6 Tier-3 safety items + infrastructure).

### 3.6 `inventory/{docId}` & `inventoryTransactions/{txId}`

**inventory:** `name`, `category` (11 enums), `description?`, `quantity`, `minQuantity`, `unit`, `location`, `barcode?`, `supplierName?`, `supplierContact?`, `unitCost?`, `status` (`in_stock|low_stock|out_of_stock`), timestamps.

**inventoryTransactions:** `itemId`, `itemName`, `type` (`restock|adjustment|damage|write_off`), `quantity` (±), `quantityBefore`, `quantityAfter`, `userId`, `userName`, `userEmail`, `notes?`, `createdAt`. — Admin-only ledger; tool checkouts **do not** decrement inventory in v1.

### 3.7 `maintenance/{recordId}`

`equipmentId`, `machineId`, `machineName`, `type` (`preventive|corrective|calibration|repair|inspection`), `status` (`scheduled|in_progress|completed|cancelled`), `title`, `description`, `scheduledDate`, `completedDate?`, `technician`, `technicianContact?`, `parts?`, `laborCost?`, `partsCost?`, `downtimeHours?`, `notes?`, `reportUrls[]`, timestamps.

### 3.8 `workshops/{workshopId}` & `workshopRegistrations/{regId}`

**workshops:** `title`, `type` (`training|workshop|certification|safety_training`), `description`, `instructor`, `instructorEmail?`, `date`, `startTime`, `endTime`, `capacity`, `registeredCount`, `prerequisites?`, `materials?`, `location`, `isActive`, `certificateIssued`, `materialUrls[]`, timestamps.

**workshopRegistrations:** `workshopId`, `workshopTitle`, `userId`, `userName`, `userEmail`, `status` (`registered|attended|cancelled|no_show`), `feedback?`, `rating?` (1–5), `certificateIssued`, timestamps.

### 3.9 `notifications/{notifId}` & `announcements/{announcementId}`

**notifications:** `userId`, `type` (14 enums incl. `booking_approved`, `booking_rejected`, `checkout_overdue`, `project_approved`, …), `title`, `message`, `link?`, `isRead`, `createdAt`. — Only staff create notifications today.

**announcements:** `title`, `body`, `priority` (`normal|high|urgent`), `isActive`, `authorId`, `authorName`, `expiresAt?`, timestamps.

### 3.10 `issues/{issueId}` (Form 4)

`userId`, `userName`, `userEmail`, `type` (`machine_malfunction|safety_concern|missing_damaged|suggestion|other`), `severity` (`low|medium|high|urgent`), `status` (`open|in_progress|resolved|closed`), `relatedMachine?`, `description` (≥ 20 chars enforced), `dateNoticed?`, `resolution?`, `resolvedBy?`, `resolvedAt?`, timestamps. Users cannot edit after submission.

### 3.11 `auditLogs/{logId}`

`userId`, `userEmail`, `action`, `resource`, `resourceId`, `details?`, `createdAt`. **Append-only & immutable.**

### 3.12 `settings/{settingId}` & `feedback/{feedbackId}`

**settings:** read by staff, write by admin only.

**feedback:** `userId`, `message` (≤ 2000 chars), `createdAt` — rate-limited by document ID (`uid_<5minWindow>`), nobody can edit/delete.

### 3.13 `projects/{projectId}/activityLog/{logId}`

| Field | Type | Notes |
|---|---|---|
| `type` | enum | `booking` · `checkout` · `return` · `status_change` |
| `summary` | string | ≤ 300 chars (rules) |
| `resourceId`? | string | booking/checkout doc ID |
| `userId` / `userName` / `userEmail` | string | Actor |
| `createdAt` | Timestamp | |

Written automatically on booking/checkout/return and project status changes. **Immutable.**

---

## 4. Security Rules — Access Matrix

Defined in [`firestore.rules`](../../firestore.rules) (rules_version 2).

### Helper functions

| Helper | Definition |
|---|---|
| `isAuth()` | `request.auth != null` |
| `isOwner(uid)` | auth uid == uid |
| `isActiveUser()` | authenticated **and** `users/me.isActive != false` — what deactivation enforces |
| `isAdmin()` | active + `role == 'super_admin'` |
| `isStaff()` | active + role ∈ `[super_admin, faculty, lab_assistant]` |

### Matrix

| Collection | read | create | update | delete |
|---|---|---|---|---|
| `users` | owner or admin | self, `role='student'` only | owner (not role/isActive/email) or admin | admin |
| `projects` | owner or staff | **function only** (deny direct) | owner (not `status`) or admin | admin |
| `projects/{id}/bookings` | project owner or staff | **function only** (deny direct — conflict detection can't be bypassed) | owner (cancel only) or staff | admin |
| `projects/{id}/checkouts` | project owner or staff | **function only** (deny direct — validates active project, identity, dates, and writes timeline atomically) | owner (return/overdue-only keys) or staff | admin |
| `projects/{id}/activityLog` | project owner or staff | owner checkout/return or booking-cancel entry; staff status change; functions for created/booking | **nobody** | **nobody** |
| `projects/{id}/projectMembers` | project owner or staff | project owner or staff | project owner or staff | owner or admin |
| `counters` | active user | **function only** (deny direct) | — | — |
| `equipment` | any auth | staff | staff | staff |
| `inventory` | any auth | staff | staff | admin |
| `inventoryTransactions` | any auth | **staff** | admin | admin |
| `maintenance` | any auth | staff | staff | admin |
| `workshops` | any auth | staff | staff | admin |
| `workshopRegistrations` | owner or staff | active, own | staff or owner | admin |
| `notifications` | own only | **staff** | own `isRead` only | admin |
| `announcements` | any auth | staff | staff | staff |
| `issues` | owner or staff | active, own, `status='open'`, valid enums, description ≥ 20, **exhaustive allowlist** | **staff only** | admin |
| `auditLogs` | admin | staff | **nobody** | **nobody** |
| `settings` | staff | admin | admin | admin |
| `feedback` | staff | **function only** (deny direct) | nobody | nobody |
| `{document=**}` (default) | **deny** | **deny** | **deny** | **deny** |

### Security patterns in use

- **Exhaustive key allowlists** (`hasOnly([...])`) on bookings, checkouts, issues, feedback → blocks field injection.
- **Server-side enum checks** on create (status, category, condition, severity…).
- **Schema shape checks** (`is string`, `YYYY-MM-DD` regex, `startTime < endTime`).
- **Cross-doc validation** with `get()` on `equipment` during booking create.
- **Callable feedback rate limiting** → 1-per-5-minute server-enforced window.
- Each `get()` helper costs 1 read — rules are written to minimize calls (free-tier friendly).
- Collection-group rules on `bookings`/`checkouts`/`activityLog` gate admin & per-user cross-project reads.

---

## 5. Document ID Generation

| Collection | Strategy | Mechanism |
|---|---|---|
| `users` | Deterministic | `users/{authUid}` via `setDoc` |
| `feedback` | **Auto (function)** | `submitFeedback` callable adds with a server ID; rate limit via `feedbackWindows/{uid}` |
| `projects` | Hybrid | Random doc ID + sequential `projectCode` via **server-side** atomic counter (`createProject` function) |
| `projects/{id}/bookings` | Random | Auto-ID (written by `createBooking` function) |
| `projects/{id}/checkouts` | Random | `createToolCheckout` callable |
| `projects/{id}/activityLog` · `projectMembers` | Random | Function or authorized app append |
| everything else | Random | `addDoc` auto-ID |

**Atomic counter (`functions/src/createProject.ts`):** the counter lives server-side and is written inside a transaction — clients cannot read-modify-write it. This makes `TL-XXX` generation race-free **and tamper-proof**.

---

## 6. Composite Indexes

Defined in [`firestore.indexes.json`](../../firestore.indexes.json) (20 composite indexes). Bookings/checkouts/activityLog are **collection-group scoped**:

| Collection group | Index fields |
|---|---|
| `bookings` (CG) | `date↑, startTime↑` · `userId↑, createdAt↓` · `date↑, status↑, createdAt↓` · `status↑, date↑, startTime↑` · `equipmentId↑, date↑, status↑` · `machineId↑, date↑, status↑` · `userId↑, date↑` · `userId↑, status↑` |
| `checkouts` (CG) | `userId↑, createdAt↓` · `action↑, createdAt↓` · `isOverdue↑, expectedReturnDate↑` · `userId↑, action↑, createdAt↓` |
| `activityLog` (CG) | `type↑, createdAt↓` · `userId↑, createdAt↓` |
| `notifications` | `userId↑, createdAt↓` |
| `inventory` | `status↑, createdAt↓` |
| `inventoryTransactions` | `itemId↑, createdAt↓` |
| `maintenance` | `equipmentId↑, createdAt↓` |
| `projects` | `status↑, createdAt↓` · `userId↑, status↑, createdAt↓` · `userEmail↑, status↑, createdAt↓` |

Single-field queries need no explicit index. ⚠️ **Deploy via `firebase deploy --only firestore:indexes`** — collection-group indexes are not auto-created like single-field ones. See [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 7. Cloud Functions (server-side enforcement)

Deployed from [`functions/`](../../functions) (firebase-functions v2 + Admin SDK).

| Function | Type | Purpose |
|---|---|---|
| `createProject` | callable | Validates input, increments the atomic counter, writes project + `created` timeline entry + team roster (all in one transaction) |
| `createBooking` | callable | **Server-side conflict detection** (transactional query + overlap check), atomic booking write + timeline entry |
| `createToolCheckout` | callable | Validates active project ownership, identity, dates, quantity, and enums; atomically writes checkout + timeline entry |
| `submitFeedback` | callable | Server-enforced 1-per-5-minute rate limit via `feedbackWindows/{uid}` |
| `sweepOverdueCheckouts` | scheduled (02:00 IST daily) | Flags unreturned past-due checkouts `isOverdue: true` + sends `checkout_overdue` notifications |
| `notifyOnProjectUpdate` | Firestore trigger | `project_approved` / `project_rejected` / hold / completed notifications |
| `notifyOnBookingUpdate` | Firestore trigger | `booking_rejected` / cancelled notifications |

> The Admin SDK bypasses security rules, so rules explicitly **deny** direct client creation of `projects`, `projects/*/bookings`, `projects/*/checkouts`, `counters`, and `feedback` — the functions are the only writers (defence in depth: functions also re-validate everything).

## 8. Remaining Known Gaps / Future Work

1. **Transactional email** (booking approved/rejected, overdue reminders) — notifications are in-app today; email is a Phase 9 item (would extend `notify*` functions with a mail provider).
2. **Migration required before switchover** if production data exists in top-level `bookings`/`toolCheckouts` — run `scripts/migrateToSubcollections.ts` (needs `firebase-admin` + service account) before deploying.
3. **`isOverdue` is still computed client-side between sweeps** for instant UI feedback — the daily sweep is now the authoritative server-side source.
4. **Project team fields remain free-text on the doc** (`teamMembers`, `facultyMentor`) for display — the structured `projectMembers` subcollection is the relational source.
5. **Rules tests require Java** (Firebase emulators) — they run in CI; see [`development/TESTING.md`](../development/TESTING.md).
