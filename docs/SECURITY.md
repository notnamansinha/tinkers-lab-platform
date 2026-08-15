# 🛡 Security Model — Tinkers' Lab Platform

> How the platform enforces access control, and where the boundaries are.
>
> **Companion docs:** [`firebase/FIRESTORE.md`](firebase/FIRESTORE.md) (rules matrix) · [`firebase/AUTH.md`](firebase/AUTH.md) (identity) · [`firebase/ENVIRONMENT.md`](firebase/ENVIRONMENT.md) (secrets hygiene) · [`specs/roles_and_permissions.md`](specs/roles_and_permissions.md) (RBAC matrix)

---

## 1. Principles

- **Zero-trust server-side enforcement.** All authorization lives in Firestore Security Rules (`firestore.rules`) and Storage rules (`storage.rules`). The client UI only mirrors those decisions for UX — it is never the enforcement point.
- **Defence in depth.** Client code additionally strips privileged fields (`role`, `isActive`, `email`, `uid`) from any caller-supplied profile data before writing, even though the rules already block them.
- **Least privilege.** New accounts start as `student`. Elevated roles (`faculty`, `lab_assistant`, `super_admin`) are granted only by an existing `super_admin`. No hard-coded owner overrides exist.

## 2. Enforcement layers

| Layer | What it enforces |
|---|---|
| `firestore.rules` | Collection access, role gating (`isAdmin`/`isStaff`/`isActiveUser`), schema validation (field allowlists, enums, regex), cross-doc checks (equipment tier/confirmed/status), immutability (auditLogs, activityLog, feedback) |
| **Cloud Functions** (`functions/`) | **Server-enforced creation** of projects, bookings, and feedback (see §3) — the atomic counter, booking conflict detection, and feedback rate limiting cannot be bypassed by a malicious client |
| `storage.rules` | Staff/owner-only writes, content-type and size validation per path |
| `firebase.json` | Hosting security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy) |
| Client (`auth.ts`, guards, services) | UX mirroring + belt-and-braces field stripping |

## 3. Server-enforced operations (Cloud Functions)

Rules cannot run queries or transactions, so these invariants are enforced in [`functions/`](../functions) with the Admin SDK (which bypasses rules — and the rules therefore **deny** direct client creation for these paths):

| Invariant | Function | Rule backstop |
|---|---|---|
| No double-booking of machine slots | `createBooking` (transactional conflict check) | `projects/{id}/bookings` create denied |
| Atomic, tamper-proof `TL-XXX` codes | `createProject` (server-side counter) | `counters` + `projects` create denied |
| 1 feedback / 5 min (server clock) | `submitFeedback` (`feedbackWindows/{uid}`) | `feedback` create denied |
| Overdue tools flagged daily | `sweepOverdueCheckouts` (02:00 IST) | n/a |
| Approve/reject/overdue notifications | `notifyOnProjectUpdate`, `notifyOnBookingUpdate` | `notifications` client-create staff-only |

## 3. Access-control highlights

- **Users**: self-create `role='student'` only; owners may edit own non-sensitive fields; `role`/`isActive`/`email` are `super_admin`-only.
- **Projects**: visible only to owner or staff (no cross-user PII leak). Status changes are admin-only; users edit their own non-status fields.
- **Bookings/checkouts/activityLog**: project-scoped subcollections; collection-group reads still require project ownership or staff role.
- **Deactivation**: `isActive = false` revokes self-service + elevated access immediately server-side (catalog reads remain available to any authenticated user).
- **Immutable collections**: `auditLogs`, `activityLog`, `feedback` — nobody can update or delete.
- **Rate limiting**: the `submitFeedback` callable caps feedback at 1 per user per 5-minute window using `feedbackWindows/{uid}` and the server clock.

## 4. Known gaps / hardening notes

- **Transactional email** (booking approved/rejected, overdue reminders) — notifications are in-app today; email is a Phase 9 item.
- **`isOverdue` between sweeps** is client-computed for instant UI feedback; the daily sweep is authoritative.
- **Roster/timeline writes by the project owner** are allowed by design (they manage their own project's members and can append log entries); status fields themselves are still admin-gated.
- **No secrets in the repo** — see §5. Service-account keys (needed only for admin/CI tooling and migration scripts) are git-ignored everywhere including `functions/` and `tests/`.

## 5. Secrets hygiene

- **No secrets in the repo.** Git-ignored: `.env`, `.env.local`, `.env.production`, `*.local`, `.firebase/`, service-account files. `.env.example` contains placeholders only.
- Firebase web API keys are **not** secrets (they ship in client bundles); **service-account JSON keys** are the real secret and must never be committed.
- See [`firebase/ENVIRONMENT.md`](firebase/ENVIRONMENT.md) for the full hygiene rules.

## 6. Audit trail

- All admin writes go through role-gated rules; `auditLogs` is append-only and admin-readable.
- The [`audits/audit-report.md`](audits/audit-report.md) contains the latest codebase & security review findings.
