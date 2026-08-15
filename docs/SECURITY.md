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
| `firestore.rules` | Collection access, role gating (`isAdmin`/`isStaff`/`isActiveUser`), schema validation (field allowlists, enums, regex), cross-doc checks (equipment tier/confirmed/status), rate limiting (feedback doc-ID window), immutability (auditLogs, activityLog, feedback) |
| `storage.rules` | Staff-only writes, content-type (`image/jpeg\|png\|webp`) and size (≤ 5 MB) validation |
| `firebase.json` | Hosting security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy) |
| Client (`auth.ts`, guards, services) | UX mirroring + belt-and-braces field stripping |

## 3. Access-control highlights

- **Users**: self-create `role='student'` only; owners may edit own non-sensitive fields; `role`/`isActive`/`email` are `super_admin`-only.
- **Projects**: visible only to owner or staff (no cross-user PII leak). Status changes are admin-only; users edit their own non-status fields.
- **Bookings/checkouts/activityLog**: project-scoped subcollections; collection-group reads still require project ownership or staff role.
- **Deactivation**: `isActive = false` revokes self-service + elevated access immediately server-side (catalog reads remain available to any authenticated user).
- **Immutable collections**: `auditLogs`, `activityLog`, `feedback` — nobody can update or delete.
- **Rate limiting**: feedback is capped at 1 per user per 5-minute window via deterministic document IDs (server clock).

## 4. Known gaps (client-side-only enforcement — require Cloud Functions)

These business rules are enforced only in the UI because Security Rules cannot run queries/transactions, and no Cloud Functions layer exists yet:

1. Booking time-slot **overlap detection** and "booking must reference an active project".
2. Tool-checkout `isOverdue` computation (a daily server sweep is planned as Phase 9).
3. The 200-word feedback limit (server enforces a 2000-character cap instead).
4. Server-populated display identity (`userName`/`userEmail`) — currently client-supplied; only `userId` is rule-enforced.
5. Sequential project IDs rely on an atomic counter (safe under concurrency via transactions) — but no Cloud Function is involved.

## 5. Secrets hygiene

- **No secrets in the repo.** Git-ignored: `.env`, `.env.local`, `.env.production`, `*.local`, `.firebase/`, service-account files. `.env.example` contains placeholders only.
- Firebase web API keys are **not** secrets (they ship in client bundles); **service-account JSON keys** are the real secret and must never be committed.
- See [`firebase/ENVIRONMENT.md`](firebase/ENVIRONMENT.md) for the full hygiene rules.

## 6. Audit trail

- All admin writes go through role-gated rules; `auditLogs` is append-only and admin-readable.
- The [`audits/audit-report.md`](audits/audit-report.md) contains the latest codebase & security review findings.
