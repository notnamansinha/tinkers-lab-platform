# 🚀 Deployment Guide — Tinkers' Lab Platform

> How to deploy Hosting, Firestore rules, composite indexes, and Storage rules to Firebase.
>
> **Companion docs:** [`ENVIRONMENT.md`](ENVIRONMENT.md) (env vars) · [`FIRESTORE.md`](FIRESTORE.md) (what's deployed)

---

## 1. Prerequisites

- **Node.js** v18+ and **npm** v9+
- **Firebase CLI**: `npm install -g firebase-tools`
- Logged in: `firebase login`
- A Firebase project (this repo is wired to project `ahduni-tinkering-lab` via `.firebaserc` — change it if deploying elsewhere)

## 2. Build the app

```bash
npm install
npm run build        # tsc -b && vite build → outputs to dist/
npm run lint         # oxlint — should pass before shipping
```

`firebase.json` serves `dist/` with:

- SPA rewrites (`**` → `/index.html`)
- Long cache for hashed `js|css` assets (`max-age=31536000`)
- `no-cache` on `index.html`
- Security headers on everything: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` (1 year, includeSubDomains), and a `Content-Security-Policy` tuned for Firebase services.

## 3. Configure environment

```bash
cp .env.example .env.local
# fill in your Firebase web-app values (Firebase Console → Project Settings → Your apps)
```

See [`ENVIRONMENT.md`](ENVIRONMENT.md) for the full variable list. **Never commit `.env.local`** — it is git-ignored.

## 4. Deploy

| Command | Deploys |
|---|---|
| `firebase deploy --only hosting` | Static site (from `dist/`) + headers/rewrites |
| `firebase deploy --only firestore:rules` | Firestore security rules |
| `firebase deploy --only firestore:indexes` | Composite indexes from `firestore.indexes.json` |
| `firebase deploy --only storage` | Storage rules |
| `npm run deploy:functions` | Cloud Functions (`functions/` — build + deploy) |
| `firebase deploy` | Everything |

> ⚠️ **Collection-group indexes are not auto-created** like single-field indexes — you must deploy `firestore:indexes` before collection-group queries (bookings/checkouts/activityLog admin views, conflict checks) will work in a fresh project.

## 5. Order of operations for a fresh project

1. Create the Firebase project (or repoint `.firebaserc`).
2. `firebase use <project-id>`
3. `firebase deploy --only firestore:indexes` — indexes first so queries work.
4. `firebase deploy --only firestore:rules` — rules next so writes are gated.
5. `firebase deploy --only storage`
6. `npm run deploy:functions` — **required**: booking & project creation, feedback, and overdue sweeping are server-enforced; without functions those features fail closed.
7. Seed equipment: `npx tsx scripts/seedEquipment.ts` (or equivalent) with a staff account.
8. `firebase deploy --only hosting` — ship the app.
9. If migrating existing top-level `bookings`/`toolCheckouts` data: run `scripts/migrateToSubcollections.ts` **before** switching over (requires `firebase-admin` + a service account — never commit the service account file).

## 6. Local emulator workflow

```bash
npm run emulators         # Auth:9099, Functions:5001, Firestore:8080, Storage:9199 (+ UI)
VITE_USE_EMULATORS=true npm run dev
```

The app connects to **all four** emulators automatically when `import.meta.env.DEV` and `VITE_USE_EMULATORS === 'true'` — including the functions emulator (`localhost:5001`) so `createProject` / `createBooking` / `submitFeedback` work locally. Firestore uses persistent local cache for offline support & reduced reads.

> ⚠️ The emulator suite needs **Java**. Security-rule tests run under `npm run test:rules` — see [`development/TESTING.md`](../development/TESTING.md).

## 7. Function region

All Cloud Functions run in `asia-south1` (Mumbai) via `setGlobalOptions({ region: 'asia-south1' })` in `functions/src/index.ts` — closest region to the lab (Ahmedabad) and where the daily 02:00 IST overdue sweep lives. The first deploy into a new region recreates the functions with that region; old instances are removed automatically.

## 8. Backups & disaster recovery

Firestore does **not** have a default recurring backup. Enable **Point-in-Time Recovery (PITR)** for the primary dataset:

- Console → Firestore → Backup tab → **Enable PITR** (7-day window, applies to the default database).
- Alternatively schedule **managed exports**: Console → Firestore → Backups → Schedule exports (at least weekly to a `gs://` bucket).
- Document the restore runbook (Export→Import in Console; or `gcloud firestore export/import`) in an ops runbook maintained alongside this repo.
- There is no separate DB to back up — Auth (identity) and Storage (uploads) are covered by Google-managed redundancy.

## 9. Data deletion (GDPR-style right to erasure)

Users can delete their entire account + data from **Profile → Delete Account**. The `deleteMyAccount` Cloud Function (server-enforced, Admin SDK) cascades:

- profile, notifications, feedback, issues, workshop registrations, feedback cooldown window
- owned projects → subcollections (bookings + occupancy slots, checkouts, activity log, roster) → Storage uploads
- the Firebase Auth account (revokes outstanding tokens immediately)

Timeline entries the user left on **other** users' projects are intentionally preserved — deleting them would corrupt another owner's audit trail.

## 10. App Check (recommended hardening)

Platform abuse protection (quota theft via stolen ID tokens) is **not** yet enforced:

- All callables are declared `enforceAppCheck: false`; sign-in has no reCAPTCHA provider.
- To roll out: Firebase Console → App Check → register the app (reCAPTCHA Enterprise),
  set `VITE_FIREBASE_APP_CHECK_KEY` in `.env.*`, then flip `enforceAppCheck: true` on the
  callables and redeploy. Do this as a single coordinated release — functions reject
  unproven clients the moment they enforce.

## 11. User-facing Cloud Functions inventory

| Function | Trigger | Purpose |
|---|---|---|
| createProject | onCall | Atomic TL-XXX counter + project + timeline + roster |
| createBooking | onCall | Transactional conflict detection + booking + occupancy slot |
| createToolCheckout | onCall | Validated checkout creation (open-checkout cap) |
| appendActivityLog | onCall | Server-stamped, forge-proof timeline appends |
| deleteMyAccount | onCall | Full data-erasure cascade |
| submitFeedback | onCall | 5-minute server-side feedback rate limit |
| notifyOnProjectUpdate / notifyOnBookingUpdate | onDocumentUpdated | In-app notifications |
| syncBookingSlot / cleanupBookingSlot | onDocumentUpdated / onDocumentDeleted | Privacy-safe slot occupancy lifecycle |
| sweepOverdueCheckouts | onSchedule 02:00 IST | Overdue flags + notifications |
