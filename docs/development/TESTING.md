# 🧪 Testing & Quality Gates — Tinkers' Lab Platform

> How to verify the app is healthy before committing, opening a PR, or deploying.

---

## 1. Available commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (default `http://localhost:5173`) |
| `npm run build` | Type-check (`tsc -b`) + production build (`vite build` → `dist/`) |
| `npm run lint` | `oxlint` — fast Rust-based linter |
| `npm run preview` | Serve the production build locally |

## 2. Minimum gate before any PR

```bash
npm run lint
npm run build
```

Both must pass. There is **no automated unit/E2E test suite yet** — verification is type-checking, linting, a clean build, and manual QA.

## 3. Manual QA checklist (core flows)

1. **Auth**: Google sign-in (popup + redirect fallback) → profile auto-created → `/onboarding` for missing `contact`.
2. **Project registration**: form validation (title ≥ 5, abstract ≥ 50), both agreements required, `TL-XXX` code generated atomically, status starts `pending`.
3. **Booking**: only confirmed Tier-1 machines selectable, conflict check blocks overlapping slots, auto-approved, activity-log entry appended.
4. **Tool checkout**: Tier-2 flow, `outsideLocation` required when taking outside, return flips `action`/`conditionAtReturn`/`returnedAt`.
5. **Admin**: role gating (`AdminRoute`), status changes, inventory transactions, issue resolution.
6. **Feedback**: 1-per-5-minutes rate limit enforced via deterministic doc ID.
7. **Offline**: reload with `persistentLocalCache` — previously viewed data still renders.

## 4. Emulator-based testing

```bash
# Terminal 1 — start emulators
firebase emulators:start

# Terminal 2 — run the app against them (no real credentials needed)
VITE_USE_EMULATORS=true npm run dev
```

Emulator ports: Auth `:9099` · Firestore `:8080` · Storage `:9199`.

> ⚠️ The Firestore/Storage rules have not yet been validated with `firebase emulators:exec` (the original dev environment lacked Java). Before trusting them in production, run the rules test suite on a staging project or a Java-enabled machine.

## 5. Performance notes

- The production bundle emits a chunk-size warning for the Firebase vendor chunk (>600 kB). Code-splitting of heavy features (charts, firebase) is a candidate improvement; not a blocker.
- Firestore reads are optimized by design (persistent cache, narrow queries, React Query caching, denormalized fields) — see [`../architecture/data-architecture.md`](../architecture/data-architecture.md).
