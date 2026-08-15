# 🧪 Testing & Quality Gates — Tinkers' Lab Platform

> How to verify the app is healthy before committing, opening a PR, or deploying.

---

## 1. Available commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (default `http://localhost:5173`) |
| `npm run build` | Type-check (`tsc -b`) + production build (`vite build` → `dist/`) |
| `npm run lint` | `oxlint` — fast Rust-based linter (covers `src/`, `functions/`, `tests/`) |
| `npm test` | Unit tests (vitest — pure logic: team parsing, utils, overdue) |
| `npm run test:rules` | **Security-rule tests** inside Firebase emulators (requires Java) |
| `npm run emulators` | Start the full emulator suite (auth/functions/firestore/storage/ui) |
| `npm run preview` | Serve the production build locally |

## 2. Minimum gate before any PR

```bash
npm run lint
npm run build
npm test
```

All must pass. CI runs the same checks plus `npm --prefix functions run build` and the emulator-based rules tests (`.github/workflows/ci.yml`).

## 3. Unit tests (vitest)

Located next to the code (`src/**/__tests__/*.test.ts`):

- `parseTeamRoster` — free-text roster → structured members (`src/lib/__tests__/teamMembers.test.ts`)
- `cleanFirestoreData`, `formatDate`, `formatRelativeTime`, `todayStr`, `cn` (`src/lib/__tests__/utils.test.ts`)
- `isCheckoutOverdue` — overdue logic incl. the empty-date guard (`src/services/firebase/__tests__/overdue.test.ts`)

## 4. Security-rule tests (@firebase/rules-unit-testing)

Located in [`tests/`](../../tests) — **run inside the Firebase emulators, which require Java**:

```bash
npm run test:rules
```

Covers: RBAC (role self-escalation blocked, deactivation, staff access), project visibility (owner/staff only), **function-only creation** (projects, bookings, counters, feedback), booking cancellation rules, immutable activity log, and Storage access by path/role/content-type. CI runs these on `ubuntu-latest` (Java preinstalled).

## 5. Manual QA checklist (core flows)

1. **Auth**: Google sign-in (popup + redirect fallback) → profile auto-created → `/onboarding` for missing `contact`.
2. **Project registration**: form validation (title ≥ 5, abstract ≥ 50), both agreements required, `TL-XXX` code generated **server-side**, timeline starts with `created` entry, team roster seeded.
3. **Booking**: only confirmed Tier-1 machines selectable, **server-side conflict check** (needs functions/emulator), auto-approved, activity-log entry appended.
4. **Tool checkout**: Tier-2 flow, `outsideLocation` required when taking outside, return flips `action`/`conditionAtReturn`/`returnedAt`.
5. **Admin**: role gating (`AdminRoute`), status changes, inventory transactions, issue resolution — and notifications arrive for approved/rejected projects & bookings.
6. **Feedback**: 1-per-5-minutes enforced **server-side** via `feedbackWindows/{uid}`.
7. **Uploads**: project images/documents and workshop materials upload to Storage and persist URLs on save.
8. **Offline**: reload with `persistentLocalCache` — previously viewed data still renders.

## 6. Emulator-based development

```bash
# Terminal 1 — start emulators (Auth:9099, Functions:5001, Firestore:8080, Storage:9199)
npm run emulators

# Terminal 2 — run the app against them (no real credentials needed)
VITE_USE_EMULATORS=true npm run dev
```

## 7. Performance notes

- The production bundle splits Firebase into core/auth/firestore/storage chunks and sets `chunkSizeWarningLimit: 600` — no oversized-chunk warning remains.
- Firestore reads are optimized by design (persistent cache, narrow queries, React Query caching, denormalized fields) — see [`../architecture/data-architecture.md`](../architecture/data-architecture.md).
