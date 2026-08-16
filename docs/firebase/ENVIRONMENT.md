# 🔑 Environment Variables — Tinkers' Lab Platform

> Reference for every environment variable the app reads.
>
> ⚠️ **Security note:** this page documents variable *names* and placeholder formats only. **Real values live exclusively in local `.env.local` (git-ignored) and are never committed.** If you see a real-looking key in this repo, report it immediately.

---

## 1. Files

| File | Purpose | Git-tracked? |
|---|---|---|
| `.env.example` | Template with placeholders | ✅ Yes |
| `.env.local` | Your real local values | ❌ No (git-ignored) |
| `.env` | Optional local overrides | ❌ No (git-ignored) |
| `.env.local.backup` | Scratch file | ❌ No (git-ignored) |

Copy the template to get started:

```bash
cp .env.example .env.local
```

## 2. Variable reference

| Variable | Required | Purpose |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ (or `_B64`) | Firebase web API key. May be supplied Base64-encoded via `VITE_FIREBASE_API_KEY_B64` (decoded at runtime). |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | e.g. `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Sender ID from Firebase console |
| `VITE_FIREBASE_APP_ID` | ✅ | Web app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional | Analytics measurement ID |
| `VITE_USE_EMULATORS` | Optional | `"true"` connects to local emulators (dev only) |

> A real `VITE_FIREBASE_API_KEY` for a Firebase web app is **not a secret by itself** — it ships in the client bundle. The values that must never be committed are **service-account JSON keys** (used only by admin/CI tooling like migration scripts).

## 3. What the app does with them (`src/lib/firebase.ts`)

- Reads `VITE_FIREBASE_*` via `import.meta.env`.
- Supports `VITE_FIREBASE_API_KEY_B64` as an alternative to the plain-text key (Base64-decoded at startup).
- In dev, when `VITE_USE_EMULATORS=true`, uses placeholder config and connects to `localhost` emulators — so **no real values are needed for local emulator development**.
- **Fails fast** with a clear error message if the app is built without a key/project/App ID (instead of failing on first request).

## 4. Never do this

- ❌ Commit `.env.local`, `.env`, or any `*-key.json` service-account file (all covered by `.gitignore`).
- ❌ Paste real keys into `README.md`, docs, issues, or PR descriptions.
- ❌ Hardcode keys in source (there are none — `src/lib/firebase.ts` reads env only).
