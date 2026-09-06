# Testing & Quality Gates — Tinkers' Lab Platform

> How to verify the app is healthy before committing, opening a PR, or deploying.

---

## 1. Available commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (default `http://localhost:5173`) |
| `npm run build` | Type-check (`tsc -b`) + production build (`vite build` → `dist/`) |
| `npm run lint` | `oxlint` — fast Rust-based linter (covers `src/`, `functions/`, `tests/`) |
| `npm test` | Unit + component tests (vitest: pure logic, service layer, route guards) |
| `npm run test:rules` | Emulator tests: Firestore + Storage rules **and** all Cloud Functions (requires Java) |
| `npm run emulators` | Start the full emulator suite (auth/functions/firestore/storage/ui) |
| `npm run preview` | Serve the production build locally |

## 2. Minimum gate before any PR

```bash
npm run lint
npm run build
npm test
npm --prefix functions run build
```

All must pass. CI runs the same checks plus the emulator suite on a fresh checkout
(`.github/workflows/ci.yml` — two jobs: lint/build/unit, and emulator-tests with Java 21).

## 3. Test inventory

### 3.1 Unit + component tests (vitest, `npm test`) — 182 tests, 16 files

| Area | File | Covers |
|---|---|---|
| Utilities | `src/lib/__tests__/utils.test.ts` | `cleanFirestoreData` (nested undefined, sentinels), `formatDate/formatDateTime`, `isSafeStorageUrl` (XSS/URL injection), `generateId`, `mapDocs`, `debugLog` (DEV-gated) |
| Roster parsing | `src/lib/__tests__/teamMembers.test.ts` | "Name (ID)", "Name, ID", newline/semicolon/comma lists, whitespace, mixed formats |
| Role helpers | `src/lib/__tests__/roles.test.ts` | `normalizeRole`, `isAdminRole`, `isStaffRole` (case/punctuation insensitive) |
| Auth service | `src/services/firebase/__tests__/auth.test.ts` | sign-in popup-blocked fallback, profile field-stripping (role/isActive/email), profile reads |
| Booking service | `src/services/firebase/__tests__/bookings.test.ts` | slot queries, collection-group lookup, status update payloads, activity append |
| Checkout service | `src/services/firebase/__tests__/toolCheckouts.test.ts` | return flow, overdue logic, active/overdue collections, anti-hoarding query shape |
| Overdue (client) | `src/services/firebase/__tests__/overdue.test.ts` | `isCheckoutOverdue` guards |
| Route guards | `src/routes/__tests__/guards.test.tsx` | Protected/Admin/Onboarding/Public redirects and render logic (jsdom) |
| Consumables payload | `src/lib/__tests__/consumables.test.ts` | undefined/null/empty pruning before callable serialization |
| Page interaction (workshops) | `src/features/__tests__/workshops.interactions.test.tsx` | Register button → server-enforced callable, closed/full button states, search, staff authoring form create/edit/validation |
| Page interaction (bookings) | `src/features/__tests__/booking.interactions.test.tsx` | Booking form gating + slot selection + consumables payload; tool checkout in-lab/taking-outside contracts; issue reporting payload |
| Page interaction (admin) | `src/features/__tests__/admin.interactions.test.tsx` | Project approve/reject/hold/complete, role changes + self-downgrade guard, deactivate, booking reject, equipment delete, announcement create |
| Page interaction (profile) | `src/features/__tests__/profile.interactions.test.tsx` | Profile edit validation + filtered save fields, feedback word-limit/cooldown, delete two-step, notifications mark read |
| Page interaction (dashboard) | `src/features/__tests__/dashboard.interactions.test.tsx` | Today's-sessions status filter, overdue alert, seed flow, KPI counts |
| Page interaction (auth) | `src/features/__tests__/auth.interactions.test.tsx` | Google sign-in success/error/loading, onboarding wizard step gating + profile write |
| Panel batch 2 | `src/features/__tests__/panels2.interactions.test.tsx` | Equipment create/edit payloads, project edit cleaned payload, inventory + maintenance authoring, reports tabs, admin issue resolution, calendar render, checkout quick-return |

### 3.2 Emulator suite (`npm run test:rules`) — 391 tests, 5 files

Runs against the Firestore, Storage, Functions and Auth emulators.
Requires Java 21 and a fresh `npm ci` of the `tests/` and `functions/` packages.

| File | Count | Covers |
|---|---|---|
| `tests/firestore.rules.test.ts` | 240 | Every collection + attack vector: IDOR, role self-escalation, deactivation, field injection (status/agreements/URLs), oversized payloads, immutable collections, default deny |
| `tests/storage.rules.test.ts` | 49 | Equipment/project/workshop prefixes, size + MIME limits, owner/staff access, deletes, default deny |
| `tests/functions.test.ts` | 90 | All callables + triggers: input validation, transaction isolation (concurrent TL codes, single-winner slot booking, serialized caps), feedback rate limit, anti-hoarding, notification & slot-sync triggers, account-deletion cascade |
| `tests/fuzz.test.ts` | 13 | Adversarial fuzzing of every callable: NaN/Infinity, __proto__/constructor keys, typed-mismatch scalars, RTL/null-byte strings, oversized fields — asserts no internal/500 escapes |
| `tests/journey.test.ts` | 1 | Full user lifecycle with security rules ENFORCED (client SDK): signup → project → admin approve → book → check out → return → feedback → delete account |

## 4. Manual QA checklist (core flows)

1. **Auth**: Google sign-in (popup + redirect fallback) → profile auto-created → `/onboarding` for missing `contact`.
2. **Project registration**: form validation (title ≥ 5, abstract ≥ 50), both agreements required, `TL-XXX` code generated server-side, timeline starts with `created` entry, team roster seeded. Max 5 registrations per rolling hour (server-side, `resource-exhausted`).
3. **Booking**: only confirmed Tier-1 machines selectable, server-side conflict check (needs functions/emulator), auto-approved, activity-log entry appended. Max 10 bookings per IST day.
4. **Tool checkout**: Tier-2 flow, `outsideLocation` required when taking outside, return flips `action`/`conditionAtReturn`/`returnedAt`; max 20 open checkouts.
5. **Admin**: role gating (`AdminRoute`), status changes, inventory transactions, issue resolution — notifications for approved/rejected projects & bookings.
6. **Feedback**: 1-per-5-minutes enforced server-side via `feedbackWindows/{uid}`.
7. **Uploads**: project images/documents and workshop materials upload to Storage and persist URLs on save; non-Firebase URLs rejected server-side and at render time.
8. **Offline**: reload with `persistentLocalCache` — previously viewed data still renders.

## 5. Emulator-based development

```bash
npm --prefix functions run build   # emulator loads functions from functions/lib
npm run emulators                  # auth:9099, firestore:8080, functions:5001, storage:9199, ui
VITE_USE_EMULATORS=true npm run dev
```

Then `npm run test:rules` executes the full 375-test suite against the same emulator
configuration used by CI. The functions emulator runs the compiled `functions/lib/index.js`,
so rebuild after editing Cloud Functions (`npm --prefix functions run build`).