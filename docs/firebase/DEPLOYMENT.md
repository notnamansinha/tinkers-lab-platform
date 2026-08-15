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
