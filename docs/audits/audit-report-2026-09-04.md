# Tinkers' Lab Platform — Full-Stack Audit Report (2026-09-04)

**Scope:** `webapp-full-audit-prompt.md` (A–Z) against repo HEAD + working tree.
**Stack:** React 19 + TS (strict) + Vite 8 + React Router 7 + TanStack Query + Tailwind 3 + shadcn/Radix; Firebase (Auth, Firestore, Storage, Hosting, Cloud Functions v2, Emulators); PWA (SW + manifest); Vitest; Oxlint; GitHub Actions CI.
**Previous reports:** `docs/audits/audit-report.md` (2026-08-12) — several items there (HTTP headers, tests) were remediated in Aug commits; this is the current state.

---

## 1. Executive Summary — Top 5 Findings

1. **CRITICAL — The repo is mid-conflicted-merge and does not build.** Merge conflict markers are present in `src/lib/firebase.ts` (2 blocks), `.github/workflows/ci.yml` (1), and `tests/storage.rules.test.ts` (9). `npm run build` fails deterministically with TS1185 ("Merge conflict marker encountered"). Nothing can ship until this is resolved. `git status` shows unmerged paths; `main` has diverged from `origin/main` (14 ahead / 1 behind).

2. **CRITICAL — A live Figma personal access token exists in git history.** `figd_[REDACTED]` was committed in `fetch-figma-svgs.js` (first in `f8d2f26`, removed in `eea0ecb` "chore: move figma token to env variable"). It is still reachable in history. Figma PATs grant full account-scope API access. Revoke the token now; scrub history and purge GitHub cached data.

3. **HIGH — Firestore booking read rules break the core student booking UX.** `firestore.rules:82-85` restricts `projects/{projectId}/bookings/{bookingId}` reads to the project owner or staff. The client queries machine-wide availability via collection-group queries (`getBookingsForSlot` in `src/services/firebase/bookings.ts:38-49`, `BookingCalendarPage.tsx:46-55`). A student's query *may* match other students' bookings, so Firestore denies the entire query (PERMISSION_DENIED). Students therefore cannot see occupied slots in the calendar/slot-picker; conflicts only surface as failed submissions from the server-side `createBooking`.

4. **MEDIUM/HIGH — Storage read parity gap vs. the stated zero-trust model.** `storage.rules:46` and `:59` allow *any authenticated user* to read `projects/{id}/images/…` and `projects/{id}/documents/…` (reports, CAD files), while the Firestore project doc itself is owner/staff-only (`firestore.rules:243-246`). Exposure is mitigated by unguessable Firestore doc IDs, but the rule surface is inconsistent with the security model and the Firestore rules.

5. **MEDIUM — Overdue sweep is timezone-misaligned and flags ~1 day late.** `functions/src/overdue.ts:14-20` computes "today" from `new Date()` on the server (UTC), despite the schedule being `Asia/Kolkata`. `createToolCheckout.ts` bounds `expectedReturnDate` in IST (`todayInIndia()`). At 02:00 IST the UTC date is the *previous* day, so a checkout due on day D is not flagged until the 02:00 IST sweep on D+2 — every check-out is flagged ~1 day later than intended, and overdue notifications arrive a day late.

---

## 2. Findings Table

| ID | Severity | Category | File:Line | Issue | Recommendation |
|----|----------|----------|-----------|-------|----------------|
| F-01 | **Critical** | Secrets / SCM | git history: `f8d2f26`, `eea0ecb` (`fetch-figma-svgs.js`) | Live Figma PAT `figd_PXnD…q78` committed and still present in history | Rotate/revoke the Figma token immediately; scrub history (`git filter-repo`), force-push, purge GitHub cache; add a secret scanner to CI |
| F-02 | **Critical** | Build / SCM | `src/lib/firebase.ts:25-30,75-79`; `.github/workflows/ci.yml:48`; `tests/storage.rules.test.ts:19,53,79,88,97,106,117,139,148` | Unresolved merge conflict markers; `tsc -b` fails (TS1185); CI and rules tests broken; repo in half-merged state | Resolve the `fixes`/`main` merge deliberately, pick one `isTestMode`/emulator variant, delete stray 0-byte files, commit |
| F-03 | High | AuthZ / Functional | `firestore.rules:82-85` vs `services/firebase/bookings.ts:38-49`, `BookingCalendarPage.tsx:46-55` | Collection-group booking reads fail for non-owner students; slot availability UI broken | Add a read path for slot availability (dedicated `slots/{machineId}/{date}` occupancy docs written by the Cloud Function) or scope reads to permit `status`, `startTime`, `endTime`, `equipmentId` visibility; align UI with rules |
| F-04 | High | SCM / Hygiene | `git status`; repo root; `.git/config` (`branch "tl-platform"` pushRemote to `AryanPatelOnGIT/TL-Makerspace`) | Diverged half-merged `main`; untracked 0-byte artifacts `**How`, `The`, `execute`, `root.`; ~14 MB of media blobs (`UI/vid1.mp4`, large SVGs) in history; informal commit `0320a72 "fuck no bro"`; cross-repo branch remote | Finish merge; delete artifacts; gitignore/`filter-repo` media; standardize commit hygiene; remove or document the `tl-platform` extra remote |
| F-05 | Medium | Correctness / Timezone | `functions/src/overdue.ts:14-20`; `createToolCheckout.ts:20-27` | Sweep computes UTC date while checks use IST dates → overdue flagged ~1 day late | Compute `today` in `Asia/Kolkata` (shared helper) and add a unit test with a fixed clock |
| F-06 | Medium | Access control parity | `storage.rules:46,59` vs `firestore.rules:243-246` | Any authenticated user can read project images/documents; Firestore project doc is owner/staff-only | Restrict storage reads to `isProjectOwner || isStaff` (or move materials behind signed URLs) |
| F-07 | Medium | AuthZ | `firestore.rules:227` | `workshopRegistrations` owner update is unconstrained (any field incl. `status`, `certificateIssued`, `rating`); feature is dormant (no client writes it) | Constrain owner updates (field allow-list, no status/certificate changes), or delete the collection + rules until the feature ships |
| F-08 | Medium | Data integrity | `firestore.rules:146-168` | Users can forge `activityLog` entries: types `checkout`/`return`/`status_change` created client-side with arbitrary `resourceId` and client-supplied `createdAt`; log is "immutable" only for update/delete | Enforce server timestamps (reject client `createdAt`), route all log appends through Cloud Functions, or validate `createdAt` within server-clock bounds |
| F-09 | Medium | Ops / Delivery | `firebase.json:17-23`; `public/sw.js` whole file | `sw.js` matches `**/*.@(js|css)` → served with `max-age=31536000`, delaying SW updates; CSP `script-src` hardcodes a `sha256-` of the inline SW-registration script (brittle — breaks on any edit to `index.html`) | Exclude `sw.js` from the long cache header; add a header test in CI asserting the CSP hash matches `index.html` inline script |
| F-10 | Medium | Supply chain | `package-lock.json` (browserslist); `functions/package-lock.json` (~11 moderate via `@google-cloud/storage`→`retry-request`→`teeny-request`); `tests/package-lock.json` (1 high — undici, 9 moderate) | `npm audit`: app 1 high (GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g — browserslist); functions 11 moderate; tests 1 high/9 moderate (dev-only emulator suite) | `npm audit fix` where non-breaking; upgrade `browserslist`; pin fresh `firebase` in `tests`; add `npm audit` step to CI (non-blocking) |
| F-11 | Medium | Abuse resistance | all callables `functions/src/*.ts` (`enforceAppCheck: false`), `index.ts` | App Check disabled on every callable; no per-user quotas on `createBooking`/`createToolCheckout`/`createProject` beyond `maxInstances: 10` | Enable App Check (reCAPTCHA) or add per-user server-side rate limits; document the threat model if intentionally disabled |
| F-12 | Medium | PWA / Offline | `public/sw.js` | No offline fallback to the app shell for unvisited deep links (only exact cached URLs); no "new version available" UX; old caches never purged on `activate` | Add navigation fallback to cached `/`; prune old caches in `activate`; optional update prompt (skip `skipWaiting()` or show banner) |
| F-13 | Medium | a11y | `src/components/common/FormField.tsx` (all forms using it) | Labels are rendered but not associated with inputs (no `htmlFor`/`id`) — WCAG 1.3.1/4.1.2 failure; no skip-to-content link anywhere | Give inputs generated ids and pass `htmlFor`; add a skip link; add axe checks to CI |
| F-14 | Medium | Compliance / Data lifecycle | app-wide; no deletion flow | No user-facing account/data deletion; no documented backup/DR story; Firestore PITR status unverified | Add delete-data flow (via Cloud Function + cascades); document backup (scheduled exports or PITR) in `docs/firebase/DEPLOYMENT.md` |
| F-15 | Low | Validation | `functions/src/createBooking.ts:110-130` | Past dates not rejected (can book yesterday); `projectTitle` client-spoofable (overrides real title); `consumables` arbitrary nested shape | Reject past dates (IST); derive `projectTitle` server-side from the project doc; validate `consumables` shape |
| F-16 | Low | Abuse / Data | `functions/src/createToolCheckout.ts:55-96` | No cap on concurrent open checkouts; `toolName` is free text not linked to inventory; quantity ≤1000 unchecked against stock | Link checkouts to inventory items or add open-checkout cap; store inventory item ids |
| F-17 | Low | Performance | `dist/` (2.2 MB min JS total): `vendor-firebase-firestore` 568 KB, `vendor-charts` 393 KB, `vendor-react` 232 KB, `vendor-form` 100 KB; `useNotifications.ts:28` | Large initial vendor payload (~1 MB min on first load, firestore+auth+core+react+query+ui); notifications query fetches all docs then slices 50 client-side | Keep manualChunks (already good), add `limit`/`startAfter` pagination to notifications; measure LCP with Lighthouse after fixing the build |
| F-18 | Low | Privacy / Perf | `src/features/projects/ProjectDetailPage.tsx:141-142`, `AdminProjectDetailPage.tsx:266-267` | User-supplied `imageUrls`/`documentUrls` rendered as `<img src>` / `<a href>` — third-party URLs leak viewer IPs (CSP `img-src` allows any `https:`); `http://` URLs break on HTTPS | Validate uploaded URLs are `https://firebasestorage.googleapis.com/…` (server-side); scope CSP `img-src` |
| F-19 | Low | Config / DX | `src/lib/firebase.ts:7-17`; `.env.example` | `VITE_FIREBASE_API_KEY_B64` (only form in local `.env`) is undocumented in `.env.example`; B64 obfuscation is security-theater (Firebase API keys are public by design) | Document both vars in `.env.example`; drop the B64 variant or keep purely for legacy |
| F-20 | Info | Backend latency | `functions/` (no `region` set) | Functions default to `us-central1` — higher latency for IST users; the scheduled sweep also runs there | Consider `asia-south1`; keep scheduler region consistent |
| F-21 | Info | Team / SCM | `.git/config` | Local branch `tl-platform` has `pushRemote` to `AryanPatelOnGIT/TL-Makerspace.git` while `origin` is `notnamansinha/tinkers-lab-platform` — split-brain risk | Keep one canonical remote; remove the extra remote or document its purpose |
| F-22 | Info | Dead surface | `firestore.rules:222-228`; `src/types/index.ts:347-359` | `workshopRegistrations` rules + types exist but no client code writes them (registration feature not implemented in `WorkshopDetailPage`) | Ship the feature or remove the dormant surface (see F-07) |

---

## 3. Detailed Write-up by Audit Section

### §1 Repo Recon
Single-app Vite SPA + Firebase monorepo-ish layout (`src/`, `functions/`, `tests/`, `scripts/`, `docs/`). Npm workspaces not used — separate lockfiles per package (root, `functions`, `tests`). 191 tracked files. `.gitignore` is solid (`.env*`, `dist`, `node_modules`, `.firebase` ignored); **only `.env.example` is tracked — verified no real `.env` was ever committed**. History is 111 commits; red flags: `f8d2f26`/`eea0ecb` (Figma token), `0320a72 "fuck no bro"`, ~14 MB media blobs, unmerged working tree (F-02). Stray 0-byte files `**How`, `The`, `execute`, `root.` in the working directory are shell artifacts (untracked; from a botched `**How to use this…` heredoc).

### §2 Security
- **Supply chain:** app lockfile — 1 high (browserslist, GHSA-c83g-rgw3-j3cx + GHSA-73wf-gq98-2v4g); `functions` — 11 moderate (gaxios/teeny-request chain); `tests` — 1 high (undici) + 9 moderate, dev-only. No SRI needed (no external scripts — all self-hosted). Lockfiles committed and consistent (root + functions + tests each).
- **Secrets:** no committed `.env`, API keys, or Admin SDK service accounts. **F-01**: Figma PAT in history. Local `.env`/`.env.local` exist on disk (ignored) using an undocumented `VITE_FIREBASE_API_KEY_B64` (F-19).
- **AuthN/AuthZ:** Google OAuth via Firebase; tokens handled by SDK (not in localStorage) — no XSS token-exposure path found. No `dangerouslySetInnerHTML`/`eval` anywhere. Roles enforced server-side in rules; client role normalization is loose (`Super Admin` → admin) while the server requires the exact `super_admin` string — mismatch can show admin UI that then 403s (Info). IDOR review: project scope checks (`project.userId`), booking ownership, and subcollection reads are consistently IDOR-guarded; **F-03** is the inverse (too strict → broken UX). **F-07** (workshopRegistrations update). Password hashing: N/A (Google federated login only — no password storage in this repo).
- **Injection:** all Firestore access uses the SDK (no string-built queries); no SQL; no `exec`/shell-out; feedback/dates/purposes length-validated; `firestore.rules` field allow-lists enforced. XSS surface minimal (React escapes; user URLs in hrefs are `javascript:`-blocked by React but still external-link risks, F-18).
- **CSRF:** mutating calls are Firebase-auth-gated; no cookie-based sessions → CSRF class largely N/A. CORS: Firebase hosting; functions use `onCall` (same-origin/HTTPS). **Rate limiting:** feedback rate-limit server-side (good); nothing else (F-11).
- **Network/transport:** HSTS, XFO DENY, nosniff, Referrer-Policy, and a non-trivial CSP are set in `firebase.json` (excellent, and remediated since the Aug audit). CSP has no `unsafe-eval`; `style-src 'unsafe-inline'` (justified for Tailwind/TanStack at build-time styles are extracted — needs the inline for Vite dev; acceptable). CSP hash brittleness F-09.
- **Data protection:** no PII/field-level encryption (Firestore at-rest encryption is GCP-managed); logging is minimal and contains no tokens/passwords; storage rules size+content-type gated (client-declared content type — magic-byte validation absent, Low/Info).

### §3 Performance
First-load JS ≈ 1 MB minified (vendor-firebase-firestore 568 KB + auth 154 KB + react 232 KB + query + ui) — LCP/INP likely dominated by JS parse/execution; route-level code-splitting is already excellent (all routes lazy, manualChunks tuned, module-preload filtering). `firebase.ts` initializes Firestore with persistent cache — good for repeat loads. Charts only pulled in by Reports/Admin (393 KB on demand). Images: plain `<img>` without `srcset`/`width`/`height` → CLS risk on gallery/catalog (Low). Fonts self-hosted via fontsource + preload → no FOIT. Backend: collection-group queries are index-backed (indexes verified present and matching); `useNotifications` unbounded then `slice(0,50)` (F-17); bookings slot queries entirely denied for students (F-03). No N+1s spotted; `getUserData()` in rules costs reads per write but is bounded.

### §4 PWA / Offline
Manifest is valid (name, start_url, display standalone, theme/bg) but icons are a single SVG (`sizes: any`) with no maskable/192/512 raster and no `apple-touch-icon` — install prompts may be flaky on iOS/older Chromium (Low). SW: network-first for documents (never caches error pages — good), stale-while-revalidate for assets (safe with hashed filenames), `skipWaiting()` + `clients.claim()` (fine). Gaps: no non-`/` offline deep-link fallback, no update-available UX, no cache pruning (F-12), and `sw.js` served with 1-year cache header (F-09). No push notifications (in-app only) — permission flow N/A.

### §5 Code Quality & Architecture
Architecture is genuinely good: feature-based structure, service layer, strict TS (`strict: true`), central ErrorBoundary, auth/routing guards, server-enforced writes for the security-critical paths, and extensive in-code rationale comments. Weak spots: lax role normalization in `AuthContext.tsx:69-76`; no Prettier/Biome config (oxlint config covers only 2 React rules); `noUnusedLocals` off; some `any` (e.g., `AuthContext loadProfile(db: any)`, `ui` components). Complexity hotspots worth naming: `AuthContext` (async init + dual subscriptions), `AdminProjectDetailPage.tsx` (431 lines, multi-entity), `ProfilePage.tsx` (feedback + profile + type switching), `createProject.ts` `parseRoster`, `firestore.rules` activityLog rule (most intricate rule; also the forge-ability risk, F-08). Dead code: `src/services/firebase/teamMembers.ts`-style dead service exports removed recently (commit 901f017) — good hygiene continuing; `workshopRegistrations` dormant (F-22); migration scripts intentionally present under `scripts/migrations/`.

### §6 Testing
Unit: `src/lib/__tests__/` (utils, teamMembers) + `src/services/firebase/__tests__/overdue.test.ts` — thin coverage of the core data paths (auth, bookings, projects, uploads untested at unit level). Rules tests are the real strength: 21 Firestore + 9 Storage cases in `tests/` run against emulators (`npm run test:rules`), wired into CI — but the storage test file currently contains 9 merge conflicts (F-02) so this suite is broken as-is. CI gates on lint/build/unit/rules — good, once the merge is resolved. Missing edge cases: empty states, network failure, concurrent double-booking simulation, backdated entries (F-08). Note: votes flagged in Aug audit ("no tests") are remediated.

### §7 Accessibility
Radix components bring decent ARIA to dialog/select/tooltip. Failures: form labels not programmatically associated (`FormField.tsx` — affects every form; WCAG 1.3.1/4.1.2), no skip-to-content link, error messages not `aria-live`-announced, some custom visual components (`StepsPanel`, `TabularStatOverview`, dark stat cards) are likely div-soup without roles (spot-check). Color contrast on dark theme audited previously at 6/10 — re-verify after the merge. 30 `aria-label` usages exist — inconsistent coverage.

### §8 SEO & Metadata
Single SPA with one title + description (good but static); no OG/Twitter Card tags, no canonical, no JSON-LD, no `sitemap.xml`/`robots.txt` (hosting serves `404` for the latter — default). App is auth-gated for most value, so partial relevance; add OG tags + `robots.txt` if marketing pages land.

### §9 Infrastructure / DevOps / CI/CD
Deploy: `firebase deploy` (hosting + rules + indexes + functions via targeted scripts); **no rollback procedure documented**; no staged environments beyond emulators (`.firebaserc` has one project). CI: single workflow (lint, type-check, build, unit, rules tests) with two jobs — good, currently broken by the merge. Observability: no Sentry/error-tracking; the ErrorBoundary only logs to console; no uptime monitoring; Cloud Functions log to stdout (fine for now). Containers/IaC: none (Firebase-managed). Backup/DR: **not documented or configured** (F-14).

### §10 Data & API Design
Error shapes: Cloud Functions use consistent `HttpsError` codes — good. Callables return `{bookingId}` style envelopes; client services are promise-based. Runtime boundary validation: Cloud Functions validate deeply (field whitelists, enums, regex, date-integrity) — the rules mirror them. List endpoints: mostly bounded by ownership scoping; `useNotifications` unbounded (F-17); `getProjectBookings` orders full subcollection (fine at this scale). Data model: project-hierarchical subcollections with atomic counter — sound for Firestore costs; activity log is the intended audit trail but is user-forgeable (F-08). **Retention/deletion:** no delete cascade for users anywhere (F-14).

### §11 Documentation
Strong: README (clean-clone steps, env docs, architecture), `docs/` tree (architecture, security model, FIRESTORE matrix, TESTING, DEPLOYMENT, ENVIRONMENT), CONTRIBUTING, SECURITY.md. Gaps: `.env.example` misses `VITE_FIREBASE_API_KEY_B64` (F-19); no ADRs; no CHANGELOG (informal commit history); no API/OpenAPI doc (functions are documented in comments — acceptable); onboarding under an hour is plausible.

### §12 Legal / Licensing
No `LICENSE` file and README links a "License" section that, reviewed in context, has no license file backing it (check status before public distribution). No third-party GPL risk spotted (all permissive: MIT/Apache). No privacy policy/ToS surfaced, though the app collects names, emails, university IDs, and project abstracts — needs a privacy notice in deployment. No tracking/cookie banner needed (no third-party analytics — `measurementId` placeholder only).

### §13 UX Polish
States: React Query default loading/error handling exists; `ErrorBoundary` is styled; empty states variably implemented (some pages render empty arrays without guidance — spot-check `NotificationsPage`, `MaintenanceListPage`). Forms validate inline via RHF + Zod. Responsive: mobile bottom-nav + desktop sidebar — deliberate. i18n: none (hardcoded strings) — reasonable for a campus tool. Cross-browser: Tailwind 3 + `es2020` target; Safari quirks unverified; `Cross-Origin-Opener-Policy: same-origin-allow-popups` dev header set (good for the Google popup flow).

---

## 4. Prioritized Remediation Roadmap

### Now (before next deploy)
1. **F-02** — Resolve the `main`/`fixes` merge; pick the `isTestMode` emulator variant (both sides of each conflict are compatible; `HEAD` drops the `test` mode branch), verify `tsc -b`, `npm run lint`, `npm test`, `npm --prefix tests run test`, then commit. Delete stray 0-byte files.
2. **F-01** — Revoke the Figma PAT, scrub history, purge GitHub caches/forks of interest.
3. **F-05** — Fix the overdue sweep timezone (one-line change + test).
4. **F-07** — Constrain `workshopRegistrations` owner updates (or ship/remove the feature).

### Next (this cycle)
5. **F-03** — Booking availability architecture: dedicated occupancy docs or a scoped read path; align calendar + slot picker.
6. **F-06** — Storage read rules to owner/staff for project materials.
7. **F-09** — `sw.js` cache header exclusion; CI check for CSP hash ↔ `index.html`.
8. **F-10** — `npm audit fix` in all three packages; add non-blocking audit step to CI.
9. **F-08** — Server-stamp activity log timestamps; close the forgeable log paths.
10. **F-14** — Document backup/DR; enable Firestore PITR or scheduled exports; add a deletion flow (user-requested) via Cloud Function.
11. **F-13** — Label/input association across `FormField` forms; skip link; CI axe.

### Later (backlog)
12. **F-11** App Check / per-user quotas; **F-12** SW offline fallback + update UX; **F-04** history cleanup + remote hygiene; **F-15/F-16** booking/checkout validation hardening; **F-17** notifications pagination; **F-18** URL allow-listing + CSP `img-src`; **F-20** region `asia-south1`; **F-19** env docs; **F-21** remote cleanup; **F-22** ship or remove workshop registration; §8 SEO improvements; §9 Sentry/uptime; §12 LICENSE + privacy policy.

---

## 5. Quick Wins (high impact, low effort)

- **Fix the merge (F-02)** — unblocks everything; ~15 min.
- **Rotate the Figma token (F-01)** — 5 min, removes a live credential exposure.
- **Overdue timezone one-liner (F-05)** — 5 lines + a UTC-independent `todayInIndia()` helper; restores timely enforcement.
- **`browserslist` bump (F-10)** — `npm audit fix` in root; kills the only high CVE in the app lockfile.
- **`sw.js` cache header exclusion (F-09)** — add `sw.js` to the hosting `ignore` list for the long-cache glob or a separate header rule.
- **Delete stray files + `git rm` media blobs (F-04)** — cleaner repo state for the next PR.
- **Document `VITE_FIREBASE_API_KEY_B64` in `.env.example` (F-19)** — saves the next contributor 15 minutes of head-scratching.
- **Add `robots.txt` + OG tags (F-08§)** — few minutes; prevents crawler noise and improves link sharing.

---

*Audit method: read-only. No files were modified. All findings cite `file:line`. Inferences are marked as such inline (notably F-03, which relies on documented Firestore query+rules semantics — confirm once the build is restored). Server-side rules were reviewed line-by-line; no `allow ... if true` rules exist, and the default-deny guard at `firestore.rules:352-354` is correctly `false`.*