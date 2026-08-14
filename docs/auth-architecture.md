# Authentication & Onboarding Architecture (Google-First)

This document details the architecture for the Google-first authentication and onboarding flow. It eliminates standard email/password registration in favor of Google OAuth, followed by a mandatory onboarding step to collect Ahmedabad University profile details.

## Flow Diagram

```mermaid
graph TD
    A[Unauthenticated User] --> B[LoginPage /login]
    B --> C[Click 'Continue with Google']
    C --> D{Google Auth Success?}
    D -- Yes --> E[Firebase Auth Session Created]
    D -- No --> B
    E --> F{Fetch user profile from /users/uid}
    F -- Profile Exists --> G[Redirect to Dashboard /]
    F -- Profile Missing --> H[Redirect to Onboarding /onboarding]
    H --> I[User completes profile setup]
    I --> J[Write profile to Firestore]
    J --> G
```

## Routing States and Guards

The routes are protected by three custom guards:

1. **`PublicRoute`**: Accessible only when the user is logged out (e.g., `/login`). If logged in, redirects to `/`.
2. **`ProtectedRoute`**: Accessible when the user is logged in *and* has a complete profile in Firestore.
   * If logged out -> `/login`
   * If logged in but profile is null -> `/onboarding`
3. **`OnboardingRoute`**: Accessible when the user is logged in (used for `/onboarding` and `/profile`).
   * If logged out -> `/login`
   * If logged in and has a complete profile, accessing `/onboarding` redirects to `/profile`.

### Routes Map

| Path | Guard | Target Page |
| :--- | :--- | :--- |
| `/login` | `PublicRoute` | `LoginPage` (Only Google Auth button) |
| `/onboarding` | `OnboardingRoute` | `OnboardingPage` (Profile setup form) |
| `/profile` | `OnboardingRoute` | `ProfilePage` (Profile details & edit, feedback, logout) |
| `/` | `ProtectedRoute` | `DashboardPage` |
| `/*` (Admin, etc) | `ProtectedRoute` | Respective protected pages |

## Firestore Schema (`users` collection)

When onboarding is complete, a document is created in the `/users/{uid}` collection with the following fields:

```typescript
interface UserProfile {
  uid: string;           // Match Firebase Auth UID
  email: string;         // Pre-filled from Google Auth
  displayName: string;   // Pre-filled but editable
  contact: string;       // User's contact number
  userType: 'Student' | 'Professor or Faculty' | 'Venture Studio Startup' | 'External Visitor';
  isActive: boolean;     // Default: true
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Conditional fields based on userType
  universityId?: string; // Students
  department?: string;   // Students, Faculty
  courseName?: string;   // Students
  facultyAdvisor?: string; // Students
  teamName?: string;     // Students
  teamMembers?: string;  // Students
  
  researchArea?: string; // Faculty
  associatedCourse?: string; // Faculty
  studentsInvolved?: string; // Faculty
  
  startupName?: string;  // Venture Startup
  industryDomain?: string; // Venture Startup
  startupBrief?: string; // Venture Startup
  labTeamMembers?: string; // Venture Startup
  
  organization?: string; // External Visitor
  designation?: string;  // External Visitor
  purposeOfVisit?: string; // External Visitor
  referral?: string;     // External Visitor
  
  safetyAgreementAccepted: boolean; // Must be true
  termsAccepted: boolean;           // Must be true
}
```

## Component Breakdown

1. **`LoginPage.tsx`**:
   * Removed standard email/password login inputs.
   * Prominent "Continue with Google" button as the primary action.
   * Layout is constrained to the viewport height (`100svh`) so no scrolling is needed; the hero image scales to a square that fits the screen and the content top-aligns and scrolls internally on short mobile screens.
2. **`OnboardingPage.tsx`** (formerly `RegisterPage.tsx`):
   * Serves as the profile setup screen.
   * Reads pre-filled user details (email and name) from `useAuth()`.
   * Displays step-by-step forms based on `userType` to collect profile information.
   * Writes data directly to Firestore on submit and completes authentication.
3. **`ProfilePage.tsx`**:
   * Serves as the user details hub.
   * View Mode: Displays profile photo (Google `photoURL`), name, email, and user-type specific details. Filters out duplicate badges (e.g. Student/Student).
   * Edit Mode: Allows editing profile details (excluding roles, status, and terms/safety agreements).
   * Missing Profile: Authenticated users without a profile document see an onboarding call-to-action that routes to `/onboarding` instead of editable profile controls.
   * Feedback panel: Allows submitting text feedback up to 200 words, rate-limited to 5 minutes between submissions. Rate limiting is enforced at both layers:
     - **Client-side**: localStorage key `tl_feedback_lastSentAt` with 5-minute cooldown, plus in-form word-count validation (the 200-word limit is **UI-only** — the server rule enforces a 2000-character cap instead).
     - **Server-side**: Firestore security rules enforce deterministic document IDs (`userId_windowId`) so only one feedback document can be created per user per 5-minute window, with a 2000-character message size cap. The document ID is derived from the server clock (`request.time`).
   * Admin Panel entry: Super admins see an "Admin Panel" card (gated on `isAdmin`) that routes to `/admin` — this is the primary admin entry point on mobile, where the desktop sidebar is hidden.
   * Logout button: Explicitly signs out of Firebase Auth and redirects to `/login`.

## App Shell Navigation (`AppLayout.tsx`)

* **Mobile header**: Shows the brand lockup and profile avatar on every page. A back arrow appears only inside the admin panel (`/admin*`) so users can return to the previous page; all other pages rely on the bottom tab bar for navigation.
* **Desktop sidebar**: Sticky within the viewport (`self-start`) so the navigation and user card remain visible while the main content scrolls.
* **Sign out**: Available as a compact purple icon button in the desktop sidebar footer (replacing the previous text link).

## Auth Context (AuthContext.tsx)

* Listens for auth state via `onAuthStateChanged` and mirrors the user's `users/{uid}` document into local state with `onSnapshot`.
* **Role derivation**: A user's role comes strictly from `profile.role` in their `users/{uid}` document. The client maps it against the `ADMIN_ROLES` / `STAFF_ROLES` constants in `src/types/index.ts` (the same values enforced by `firestore.rules`): `isAdmin` = `super_admin`, `isStaff` = `super_admin | faculty | lab_assistant`. There is **no hard-coded email override** — elevated access always requires the stored role.
* **Admin navigation**: The "Admin Panel" button in the layout/sidebar/top bar is gated on `isAdmin` (not `isStaff`), matching the `AdminRoute` route guard.
* The deprecated `onAuthStateChanged` error callback is not used; auth errors surface through the individual sign-in/sign-out operations instead.

## Firebase Initialization (lib/firebase.ts)

* Initialization fails fast with a clear error if the app is not configured for the target project: it requires `VITE_FIREBASE_API_KEY` (or `VITE_FIREBASE_API_KEY_B64`) **and** `VITE_FIREBASE_PROJECT_ID` **and** `VITE_FIREBASE_APP_ID`.
* Development credential fallbacks are only applied when emulator mode is explicitly enabled (`VITE_USE_EMULATORS=true` in dev); otherwise a missing config value throws before `initializeApp`, `getAuth`, or `initializeFirestore` run. `main.tsx` renders the thrown message.
