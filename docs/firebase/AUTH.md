# 🔐 Authentication & Authorization — Tinkers' Lab Platform

> How identity and permissions work: Google sign-in, profile bootstrapping, the role model, and route guards.
>
> **Companion docs:** [`FIRESTORE.md`](FIRESTORE.md) (user schema & rules) · [`../specs/auth-architecture.md`](../specs/auth-architecture.md) (original spec) · [`../specs/roles_and_permissions.md`](../specs/roles_and_permissions.md) (permission matrix)

---

## 1. Identity flow (Google sign-in)

1. User clicks **Sign in with Google** → `signInWithGoogle()` in [`src/services/firebase/auth.ts`](../../src/services/firebase/auth.ts).
2. `signInWithPopup(auth, googleProvider)` is attempted first. On `auth/popup-blocked`, `auth/popup-closed-by-user`, or `auth/cross-origin-opener-policy-failed`, it falls back to `signInWithRedirect`.
3. `AuthContext` (`src/contexts/AuthContext.tsx`) listens via `onAuthStateChanged` and live-subscribes to `users/{uid}` with `onSnapshot`.
4. `ensureUserProfile(user)` checks `users/{uid}`; if missing, `createUserProfile` writes it with `setDoc(..., { merge: true })`:

```ts
{
  uid, email, displayName,
  role: 'student',        // hard-coded — rules only allow 'student' on self-create
  userType: 'Student',
  isActive: true,
  department: '',
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  ...safeExtraData        // privilege fields (role/isActive/email/uid) are STRIPPED
}
```

**Defence in depth:** `createUserProfile`/`updateUserProfile` strip `uid`, `email`, `role`, `isActive` from any caller-supplied data *before* writing, and the Firestore rules independently block self-service changes to `role`/`isActive`/`email`.

## 2. Profile lifecycle

| State | Behavior |
|---|---|
| No user doc | Created on first sign-in with defaults above |
| Missing `contact` | Route guards redirect to `/onboarding` to complete registration |
| `isActive = false` | All elevated and self-service writes denied server-side (rules treat account as inactive) |
| Role change | `super_admin`-only via Admin Panel (`AdminUsersPage`) |

## 3. Role model

Decouples **identity** (`userType`) from **permissions** (`role`):

| `role` | Meaning | Elevated capabilities |
|---|---|---|
| `student` | Default | Register projects, book Tier-1 machines, check out Tier-2 tools, register for workshops, report issues |
| `faculty` | Professors/researchers | Staff set: view all projects/bookings, manage equipment/workshops, analytics |
| `lab_assistant` | Student workers/technicians | Staff set: inventory transactions, maintenance, tool management |
| `super_admin` | Lab director / system admin | Full access incl. role management, settings, audit logs |

**Server-side helpers** (`firestore.rules`): `isAdmin()` = active `super_admin`; `isStaff()` = active `super_admin | faculty | lab_assistant`.

## 4. Route guards (`src/routes/index.tsx`)

| Guard | Purpose |
|---|---|
| `PublicRoute` | Login page only when signed out; redirects signed-in users |
| `OnboardingRoute` | Requires a signed-in user; redirects completed profiles away from `/onboarding` |
| `ProtectedRoute` | Requires user + completed profile (`contact` set) → else `/login` or `/onboarding` |
| `AdminRoute` | ProtectedRoute + `isAdmin` → else redirect to `/` |

All routes are lazy-loaded (`React.lazy`) with a shared `<LoadingSpinner fullScreen />` fallback.

## 5. What to touch when changing auth

- Provider & sign-in: `src/services/firebase/auth.ts`
- Session state & live profile subscription: `src/contexts/AuthContext.tsx`
- Route gating: `src/routes/index.tsx`
- Server-side enforcement: `firestore.rules` (helper functions at the top)
- Identity/role types: `src/types/index.ts` (`UserRole`, `UserType`, `UserProfile`)

> ⚠️ No real credentials or service accounts appear anywhere in this repo. See [`ENVIRONMENT.md`](ENVIRONMENT.md).
