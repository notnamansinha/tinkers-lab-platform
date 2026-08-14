# Tinkers' Lab Platform — Comprehensive Audit Report

**Date:** 2026-08-12  
**Project:** Ahmedabad University Tinkering Lab Management Platform  
**Tech Stack:** React 19 + TypeScript + Vite + Firebase (Firestore + Auth) + Tailwind CSS + shadcn/ui

---

## Executive Summary

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Code Quality** | 7.5/10 | Well-structured feature-based architecture; pervasive `any`/`as` casts erode type safety |
| **Security** | 7/10 | Robust Firestore security rules; missing HTTP security headers; client-side-only rate limiting |
| **Dependencies** | 6/10 | Most packages fresh, but **4 high-severity npm audit vulnerabilities**; 30 outdated packages |
| **Configuration** | 8/10 | Vite build tuning is excellent; no Prettier config; oxlint only covers React+TS rules |
| **Testing** | 1/10 | **No automated tests** — no test framework, zero test files |
| **Maintainability** | 7/10 | Good feature-based modules; several large monolithic components; dead code present |
| **Accessibility** | 6/10 | Good `aria-*` usage; missing skip-to-content, screen-reader-visible status indicators |

**Overall Grade: B (70%)** — Production-quality for an MVP, with specific, actionable gaps.

---

## 1. Project Overview

A full-stack makerspace management platform for Ahmedabad University's Tinkering Lab. Manages equipment bookings, tool checkouts, inventory, projects, workshops, maintenance, and user administration with a 4-role RBAC system.

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React (SPA) | 19.2.7 |
| Build Tool | Vite | 8.1.3 |
| Language | TypeScript (strict mode) | 6.0.3 |
| Routing | React Router DOM | 7.18.1 |
| State/Data | TanStack React Query | 5.101.2 |
| Styling | Tailwind CSS v3 + shadcn/ui (base-nova) | 3.4.19 |
| Forms | React Hook Form + Zod | 7.81.0 / 4.4.3 |
| Backend/BaaS | Firebase (Auth + Firestore) + emulator support | 12.15.0 |
| Hosting | Firebase Hosting | — |
| Linting | Oxlint (Rust-based) | 1.73.0 |

---

## 2. Project Structure

```
tinkers-lab-platform/
├── src/
│   ├── main.tsx                    # Entry point (ErrorBoundary wrapper)
│   ├── App.tsx                     # Root: QueryClient + Router + AuthProvider
│   ├── components/
│   │   ├── common/                 # Reusable: DataPanel, EntityCard, ErrorBoundary, FilterChip, etc.
│   │   ├── layout/                 # AppLayout (sidebar + topbar + mobile nav), AppSidebar, TopBar
│   │   ├── ui/                     # shadcn/ui primitives (button, card, dialog, table, etc.)
│   │   └── visual/                 # Brand components (BrandMark, DarkStatCard, RoundedBarChart, etc.)
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth state + Firestore profile listener
│   ├── features/                   # Domain modules (lazy-loaded route pages)
│   │   ├── admin/                  # AdminDashboard, Announcements, Bookings, Inventory, Issues, Projects, Users
│   │   ├── auth/                   # LoginPage, OnboardingPage
│   │   ├── bookings/               # Calendar, Detail, Form
│   │   ├── checkout/               # ToolCheckoutPage, ToolCheckoutListPage
│   │   ├── dashboard/              # DashboardPage
│   │   ├── equipment/              # Detail, Form, List
│   │   ├── inventory/              # Checkout, Detail, Form, List
│   │   ├── issues/                 # IssueFormPage
│   │   ├── maintenance/            # Detail, Form, List
│   │   ├── notifications/          # NotificationsPage
│   │   ├── profile/                # ProfilePage
│   │   ├── projects/               # Detail, Form, List
│   │   ├── reports/                # ReportsPage
│   │   └── workshops/              # Detail, Form, List
│   ├── hooks/                      # use-mobile.ts, useNotifications.ts
│   ├── lib/                        # firebase.ts (init), utils.ts (cn, date formatters)
│   ├── routes/                     # Route definitions + guards (ProtectedRoute, AdminRoute, etc.)
│   ├── services/firebase/          # Data access layer: auth.ts, bookings.ts, firestore.ts, projects.ts, toolCheckouts.ts
│   ├── styles/                     # globals.css (design tokens + Tailwind layers)
│   └── types/                      # index.ts (518 lines — all TypeScript interfaces)
├── assets/, dist/, docs/, Inspo/, png/, public/, scripts/, temp/
├── firebase.json                   # Hosting + Firestore emulator config
├── firestore.indexes.json          # 17 composite indexes
├── firestore.rules                 # 225 lines of RBAC security rules
├── tailwind.config.ts             # Custom FigJam design system (~200 lines)
├── vite.config.ts                  # Aliases, code splitting, COOP headers
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .oxlintrc.json                  # Oxlint config
└── package.json
```

---

## 3. Dependencies Audit

### 3.1 npm Audit — Vulnerabilities

`npm audit` found **4 high-severity vulnerabilities** across 269 production / 67 dev dependencies:

| Package | Severity | CVE / GHSA | Issue | Fix |
|---------|----------|------------|-------|-----|
| **postcss** (direct) | High | GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp | Path traversal via sourceMappingURL allowing arbitrary `.map` file disclosure | Upgrade to 8.5.26 |
| **react-router / react-router-dom** (direct) | High | GHSA-qwww-vcr4-c8h2 | RSC mode CSRF bypass allows action execution before 400 response | Upgrade to 7.18.2 |
| **nanoid** (transitive) | High | GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8 | Non-secure generators can loop indefinitely with negative/zero size | Upgrade to 3.3.17+ |

### 3.2 Outdated Packages (Primary)

`npm outdated` found **30 packages** with newer versions available:

| Package | Current | Latest | Gap |
|---------|---------|--------|-----|
| `react` / `react-dom` | 19.2.7 | 19.2.8 | Patch |
| `firebase` | 12.15.0 | 12.17.1 | Minor |
| `react-hook-form` | 7.81.0 | 7.85.0 | Minor |
| `react-router-dom` | 7.18.1 | 7.18.2 | Patch (security fix) |
| `lucide-react` | 1.23.0 | 1.31.0 | Minor |
| `recharts` | 3.9.2 | 3.10.1 | Minor |
| `vite` | 8.1.3 | 8.2.1 | Minor |
| `postcss` | 8.5.16 | 8.5.26 | Patch (security fix) |
| `oxlint` | 1.73.0 | 1.78.0 | Minor |
| `tailwindcss` | 3.4.19 | 4.3.3 | **Major** |
| `typescript` | 6.0.3 | 7.0.2 | **Major** |
| `@hookform/resolvers` | 5.4.0 | 5.7.1 | Minor |
| All Radix packages | various | various | Minor patches |
| Font packages | various | 5.3.0 | Minor |

### 3.3 Notable Dependency Concerns

- **zod v4.4.3**: Zod v4 changed its API significantly. The codebase uses `zodResolver(schema) as any` in 8 files to work around type incompatibility with `@hookform/resolvers@5`.
- **tailwindcss v3 on v4 lifecycle**: Tailwind v4 has been released. v3 is maintained but planning a migration path is advisable.
- **typescript 6.0 vs 7.0**: TS 7 is the latest major. The current version is pinned with `~6.0.2`.

---

## 4. Security Audit

### 4.1 Firestore Security Rules (Strengths)

The `firestore.rules` file (225 lines) is **well-structured** with:
- RBAC helper functions (`isAuth`, `isOwner`, `isAdmin`, `isStaff`)
- Default deny-all catch rule
- Field-level write restrictions (role, isActive, email protected from self-modification)
- Self-registration limited to `role: 'student'`
- Immutable audit logs

### 4.2 Authentication (Strengths)

- Firebase Auth (Google Sign-In only) with popup + redirect fallback
- Auth state managed via `onAuthStateChanged` listener + Firestore `onSnapshot` for live profile
- Route guards: `ProtectedRoute`, `AdminRoute`, `OnboardingRoute`, `PublicRoute`
- Profile auto-creation forces `student` role server-side

### 4.3 Security Gaps

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | ~~**High**~~ **Remediated** | ~~**Missing HTTP security headers**~~ **HTTP security headers implemented** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy are now set | `firebase.json` (headers block, lines 34-58) |
| 2 | **High** | **Client-side-only rate limiting** — Feedback cooldown uses bypassable `localStorage` | `src/features/profile/ProfilePage.tsx:23,99-149` |
| 3 | **High** | **No server-side feedback rate limit** — Firestore rules allow unlimited authenticated creates | `firestore.rules:207-216` |
| 4 | **Medium** | **4 npm audit highs** — postcss, react-router, nanoid | See §3.1 |
| 5 | **Medium** | **Base64-encoded API key in `.env`** — Real Firebase key present (though gitignored) | `.env:1` |
| 6 | **Low** | **No max booking date** — Users can book arbitrarily far into the future | `src/features/bookings/BookingFormPage.tsx:314` |
| 7 | **Low** | **`console.error` in production** — 7 instances of raw console logging | AuthContext, LoginPage, AdminProjectsPage, IssueFormPage |

### 4.4 XSS Assessment

**No XSS vulnerabilities found.** Zero instances of `dangerouslySetInnerHTML`, `innerHTML` assignment, `document.write()`, or `eval()`. React's JSX auto-escaping handles all output safely.

### 4.5 Env File Verification

- `.env` — **Gitignored** (confirmed via `git status`). Contains real Firebase config. **Not committed.**
- `.env.example` — Committed with placeholder values. Correct practice.
- `.env.local.backup` — Gitignored. Contains fake placeholder values.

---

## 5. Code Quality Audit

### 5.1 Strengths

- **Feature-based architecture**: Clean separation of domain modules under `src/features/`
- **Service layer**: Firebase operations isolated in `src/services/firebase/`
- **Lazy loading**: All route components use `React.lazy()` via `routes/index.tsx`
- **Manual code splitting**: 6 named chunks in `vite.config.ts` (react, firebase, query, charts, form, ui)
- **Comprehensive types**: 518-line `src/types/index.ts` with well-documented interfaces
- **Zod validation**: All forms validated with Zod schemas
- **TanStack Query caching**: Aggressive `staleTime: 5min`, no refetch on focus/mount — good for Firebase free tier
- **Free-tier Firestore optimizations**: `getCountFromServer()`, persistent cache, narrow queries
- **Responsive design**: `clamp()` fluid typography, mobile nav bar, responsive tables
- **Consistent async/await**: No raw promise chains in application code

### 5.2 Type Safety Issues

| # | Severity | Issue | Count / Location |
|---|----------|-------|------------------|
| 1 | **High** | `zodResolver(schema) as any` — repeated in 8 files | BookingFormPage, EquipmentFormPage, InventoryFormPage, ToolCheckoutPage, ProjectFormPage, etc. |
| 2 | **High** | `CheckoutForm` component props typed as `any` — complete type safety loss | `src/features/checkout/ToolCheckoutPage.tsx:94` |
| 3 | **Medium** | `formatDate`, `formatDateTime`, `formatRelativeTime` all take `any` params | `src/lib/utils.ts:9,11,12,14` |
| 4 | **Medium** | `db: any`, `docSnap: any` in AuthContext | `src/contexts/AuthContext.tsx:23,71` |
| 5 | **Medium** | `cleanFirestoreData` uses `Record<string, any>` and unsafe generic | `src/lib/utils.ts:46` |
| 6 | **Medium** | 30+ occurrences of `snap.docs.map(d => ({ id: d.id, ...d.data() }) as Type)` — no runtime validation | 30+ files |
| 7 | **Medium** | `catch (error: any)` in service functions — error type lost | `src/services/firebase/auth.ts:30`, `src/main.tsx:40,45` |
| 8 | **Low** | `transactions.map((t: any) => ...)` | `src/features/inventory/InventoryDetailPage.tsx:142` |

**Total: 97+ `as` type assertions, 24+ explicit `any` uses** across the codebase.

### 5.3 React Anti-Patterns

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | **BUG** | `document.querySelector()` used in render function for radio state — will not reactively update | `src/features/checkout/ToolCheckoutPage.tsx:317` |
| 2 | **High** | 5 instances of `window.prompt()`/`window.confirm()` used in production UI (booking rejection, cancellation, seeding) | BookingDetailPage, AdminDashboard, AdminBookingsPage, AdminProjectsPage |
| 3 | **Medium** | `Field` form wrapper component duplicated inline in 4 files instead of using shared component | OnboardingPage, BookingFormPage, ToolCheckoutPage, ProjectFormPage |
| 4 | **Medium** | Suppressed `useEffect` dependency warnings via eslint-disable comments | BookingFormPage:136, ProfilePage:144 |
| 5 | **Medium** | Direct DOM query (see Bug #1 above) | ToolCheckoutPage:317 |
| 6 | **Low** | `catch {}` swallows profile load errors silently | `src/contexts/AuthContext.tsx:32` |

### 5.4 Dead / Unused Code

**Oxlint identified 26 unused import warnings.** Key dead code:

| File | Issue |
|------|-------|
| `src/components/layout/AppSidebar.tsx` | Entire file — imported nowhere in routes |
| `src/components/layout/TopBar.tsx` | Entire file (235 lines) — imported nowhere in routes |
| `src/services/firebase/firestore.ts` | `db` imported but unused |
| `src/services/firebase/auth.ts` | `updateProfile` imported but unused |
| `src/services/firebase/bookings.ts` | `BookingConsumables` imported but unused |
| `src/features/issues/IssueFormPage.tsx` | `getFirestore`, `doc`, `getDoc`, `updateDoc`, `Issue` — 5 unused imports |
| `src/features/notifications/NotificationsPage.tsx` | `useMutation`, `collection`, `Check`, `qc` — 4 unused items |
| `src/features/reports/ReportsPage.tsx` | `ToolCheckout`, unused `inLab` variable |
| 2 root-level scripts | `migrate_ui.cjs`, `migrate_ui2.cjs` — have useless escape character warnings |

### 5.5 Large Components (>400 lines)

| Component | Approx. Lines | Recommendation |
|-----------|---------------|----------------|
| `ProfilePage.tsx` | ~590 | Break into ProfileForm, FeedbackSection, ActivityLog sub-components |
| `ReportsPage.tsx` | ~510 | Break into per-report-type tab components |
| `BookingFormPage.tsx` | ~460 | Extract DateRangePicker, EquipmentSelector, ConsumablesSelector |
| `OnboardingPage.tsx` | ~410 | Extract per-user-type form sections |
| `ToolCheckoutPage.tsx` | ~410 | Extract CheckoutForm and ReturnForm into separate files |

### 5.6 Code Duplication

| Pattern | Occurrences | Recommendation |
|---------|-------------|----------------|
| `Field` form wrapper component | 4 files | Use existing `src/components/common/FormField.tsx` |
| `snap.docs.map(d => ({ id: d.id, ...d.data() }) as Type)` | 30+ | Create `mapDocs<T>()` helper |
| `zodResolver(schema) as any` | 8 files | Create typed `useTypedForm()` wrapper |
| Search + filter pattern | 6 files | Extract `useFilteredList<T>` hook |
| `useQuery` with `collection(db, COLLECTIONS.X)` | 15+ | Create typed `useCollection<T>()` hook |
| `statusInfo()` status config mapping | 2 files | Extract shared status config utility |

### 5.7 Naming Inconsistencies

- State variable abbreviations: `qc` (AdminBookingsPage) vs `queryClient` (EquipmentFormPage)
- Kebab-case file: `use-mobile.ts` (should be `useMobile.ts` to match convention)
- Event handlers: `handleGoogleSignIn` vs `onSubmit` — inconsistent prefix
- Abbreviations: `si` vs `statusInfo`, `cfg` vs `statusConfig`

---

## 6. Configuration Audit

### 6.1 Vite Configuration (`vite.config.ts`)

**Strengths:**
- Path alias `@` → `./src`
- Manual chunk splitting for 6 vendor bundles — excellent for caching
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` for Firebase auth popups
- Module preload polyfill enabled
- Build target ES2020, chunk size warning at 600KB

**No issues.**

### 6.2 TypeScript Configuration

- `strict: true` in `tsconfig.app.json`
- `noUnusedLocals: false`, `noUnusedParameters: false` — oxlint catches these instead
- Project references pattern with `tsconfig.json` root, `tsconfig.app.json` for src, `tsconfig.node.json` for vite config

**Minor concern:** `noUnusedLocals` and `noUnusedParameters` are disabled despite TypeScript being able to catch these. Oxlint currently catches 26 unused imports, but disabling TS-level checks means the build (`tsc -b`) won't fail on these.

### 6.3 Linting (`oxlint`)

- **26 warnings** across 16 files (all `no-unused-vars`, `only-export-components`, `no-useless-escape`)
- Only React + TypeScript rules enabled
- **No Prettier** or any code formatter configured — code style is not enforced

### 6.4 Firebase Hosting (`firebase.json`)

- Only `Cache-Control` headers set
- **Missing:** `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- Firestore emulator configured on port 8080, Auth emulator on 9099

### 6.5 Testing

**No testing infrastructure exists.** No Vitest, Jest, Playwright, or Cypress configured. The `CONTRIBUTING.md` explicitly acknowledges this. Pre-submit validation is `npm run build && npm run lint`.

---

## 7. Performance Audit

### Strengths
- All routes lazy-loaded via `React.lazy()`
- Aggressive TanStack Query caching: stale 5min, gc 30min, no refetch on focus/mount
- Firestore free-tier optimizations: `getCountFromServer()`, persistent cache, narrow queries
- Manual vendor chunk splitting

### Concerns
- **No pagination** on admin bookings list and equipment list — fetches all documents
- **No `React.memo`/`useMemo`** on presentation list items
- **7 aggregation queries** on AdminDashboard mount — could be batched
- **`useNotifications`** uses `onSnapshot` real-time listener without cleanup if user ID changes

---

## 8. Accessibility Audit

### Strengths
- Good `aria-label` on icon buttons
- `aria-current="page"` on navigation
- `role="status"` on loading spinners
- `aria-selected` on date picker cells
- `aria-labelledby` on SVG chart elements
- `aria-pressed` on filter chips

### Gaps
- No skip-to-content link for keyboard users
- Status indicators (colored dots) have no text alternative for screen readers
- Some filter buttons lack `aria-label`
- Form validation errors not linked via `aria-describedby`

---

## 9. Prioritized Recommendations

### Immediate (P0-P1)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Fix npm audit highs** — `npm install postcss@latest react-router-dom@latest` | 5 min | Security |
| 2 | **Add HTTP security headers** in `firebase.json` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) | 30 min | Security |
| 3 | **Add server-side rate limiting** for feedback in `firestore.rules` (time-based throttle) | 30 min | Security |
| 4 | **Fix `document.querySelector` bug** in ToolCheckoutPage — replace with React state | 30 min | Bug fix |
| 5 | **Replace `window.prompt()`/`window.confirm()`** with Radix Dialog components | 2 hrs | UX |
| 6 | **Create typed `zodResolver` wrapper** to eliminate all 8 `as any` casts | 30 min | Type safety |

### Short-term (P2)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 7 | **Remove dead code**: `AppSidebar.tsx`, `TopBar.tsx`, 26 unused imports | 30 min | Maintainability |
| 8 | **Create `mapDocs<T>()` utility** to replace 30+ unsafe `as Type` casts with Zod-validated reads | 2 hrs | Type safety |
| 9 | **Add pagination** to admin bookings list and equipment dashboard query | 2 hrs | Performance |
| 10 | **Extract shared `Field` component** from 4 duplicated implementations | 30 min | DRY |
| 11 | **Replace production `console.error`** with structured logging (gated on `import.meta.env.DEV`) | 30 min | Cleanliness |
| 12 | **Add `aria-label`** to all filter/search controls and color-only status indicators | 1 hr | Accessibility |

### Long-term (P3)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 13 | **Add test framework** (Vitest + React Testing Library) with critical-path tests | 1 week | Quality |
| 14 | **Break down large components** (ProfilePage 590L, ReportsPage 510L, BookingFormPage 460L) | 3 days | Maintainability |
| 15 | **Extract `useFilteredList<T>` hook** to DRY up search+filter in 6 admin pages | 3 hrs | DRY |
| 16 | **Create typed `useCollection<T>()` hooks** for Firestore queries | 3 hrs | Type safety |
| 17 | **Plan Tailwind v4 migration** | 1-2 days | Future-proofing |
| 18 | **Add skip-to-content link** and improve screen reader support for status indicators | 2 hrs | Accessibility |
| 19 | **Add error tracking service** (Sentry or similar) | 2 hrs | Observability |
| 20 | **Move direct Firestore queries from page components into services layer** for consistency | 4 hrs | Architecture |

---

## 10. Oxlint Issues Summary

96 files analyzed, 26 warnings found (all in warning severity — no errors):

- **21 unused imports/variables** across 12 `.tsx`/`.ts` files
- **4 `only-export-components`** warnings (button, badge, sidebar, AuthContext — mix component and non-component exports)
- **2 useless escape characters** in root-level migration scripts
- **1 unnecessary escape** of `#` in `migrate_ui2.cjs`

---

## 11. Firestore Collections Inventory

| Collection | Purpose | RLS Protected |
|------------|---------|---------------|
| `users` | User profiles with role, userType, contact, department | Yes |
| `equipment` | Machines/tools with 3-tier system | Yes |
| `bookings` | Calendar-based machine reservations | Yes |
| `toolCheckouts` | Hand/power tool borrow/return log | Yes |
| `inventory` | Raw materials, consumables, components | Yes |
| `inventoryTransactions` | Admin stock movements | Yes |
| `maintenance` | Equipment maintenance records | Yes |
| `workshops` | Training/workshop events | Yes |
| `workshopRegistrations` | User registrations | Yes |
| `projects` | User project registrations (TL-001 format) | Yes |
| `notifications` | In-app user notifications | Yes |
| `announcements` | Admin announcements | Yes |
| `issues` | Bug reports and suggestions | Yes |
| `auditLogs` | Immutable audit logs (admin-only) | Yes |
| `settings` | Application settings | Yes |
| `feedback` | User feedback | Yes (but no rate limit) |

---

## 12. Conclusion

The Tinkers' Lab Platform is a **well-architected, production-quality MVP** with thoughtful Firebase free-tier optimizations, a clean feature-based module structure, and solid Firestore security rules. The primary areas requiring attention are:

1. **Security**: HTTP headers and server-side rate limiting are missing
2. **Dependencies**: 4 high-severity audit vulnerabilities and 30 outdated packages
3. **Type safety**: Pervasive `any`/`as` casts undermine TypeScript strict mode
4. **Testing**: Zero automated test coverage
5. **Dead code**: Two entire layout components and 26 unused imports

Addressing the P0-P2 recommendations would bring the project to an **A-grade (90%+)** codebase.
