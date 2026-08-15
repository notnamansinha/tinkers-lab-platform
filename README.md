# ⚡ Tinkers' Lab Platform

> **Modern Makerspace & Fabrication Lab Management Platform** for Ahmedabad University's Innovation & Tinkering Lab.
> Streamlines machine reservations, tool borrowing, project consumable logging, inventory control, workshop registrations, and laboratory maintenance across mobile and desktop.

**Repo:** [`github.com/notnamansinha/tinkers-lab-platform`](https://github.com/notnamansinha/tinkers-lab-platform) · **Docs:** [`docs/README.md`](docs/README.md)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Tech Stack](#-tech-stack)
- [Repository Layout](#-repository-layout)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

The **Tinkers' Lab Platform** is an enterprise-grade web application built to digitize and automate the day-to-day operations of an academic makerspace. It connects students, faculty researchers, startup founders, external visitors, lab assistants, and super admins into a single unified operating system.

### Core Objectives
1. **Equipment Tiering**: Categorizes physical apparatus into single-unit bookable machinery (Tier 1), multi-unit checkout hand/power tools (Tier 2), and freely accessible equipment (Tier 3).
2. **Project-Centric Consumable Tracking**: Mandates project registration so material usage (e.g., PLA/ABS filament in grams, acrylic sheets) is logged per project, feeding directly into lab procurement forecasting.
3. **High-Performance Mobile UX**: Responsive layouts, 52px touch targets, OLED dark-mode aesthetics, and bold typography optimized for on-the-go use in the workshop.
4. **Zero-Trust Security**: Enforced server-side via Firebase Security Rules with strict schema validation, role gating, and rate-limiting.

---

## 🚀 Key Features

- **Tier 1 machine booking** — calendar-based time-slot reservations for laser cutters, 3D printers, CNC routers; auto-confirm with client & server-side conflict detection; consumable logging; safety pre-requisites.
- **Tier 2 tool checkout** — rapid checkout/return for power drills, soldering kits, multimeters, hand tools; location tracking (in-lab / off-site); condition inspection; automated overdue tracking.
- **Project registration & unified timelines** — Form-1 intake (scope, faculty mentor, team, safety protocols, domain); atomic `TL-YYYY-NNNN` project codes; immutable activity timeline per project.
- **Consumables & inventory** — real-time stock, restock/adjustment/damage ledger, low-stock alerts.
- **Maintenance & issue reporting** — preventative/corrective maintenance, issue & hazard reporting, resolution tracking.
- **Workshops & events** — announcements, seat registration with capacity & waitlists.
- **Admin dashboard & analytics** — live lab pulse KPIs, exportable usage reports, user management.

---

## 🛡 Role-Based Access Control (RBAC)

The platform decouples **Identity** (`userType`) from **Permissions** (`role`):

| Role | Description |
|---|---|
| `student` | Default. Register projects, book Tier-1 machines, check out Tier-2 tools, register for workshops, report issues, view own logs. |
| `faculty` | All student capabilities + view department projects, approve research requests, access lab analytics. |
| `lab_assistant` | All faculty capabilities + manage equipment, log maintenance, approve issues, inventory transactions, tool checkouts. |
| `super_admin` | Full access: user role management, system settings, audit logs. |

**Enforcement is server-side** via `firestore.rules` / `storage.rules`. See [`docs/SECURITY.md`](docs/SECURITY.md) and [`docs/firebase/FIRESTORE.md`](docs/firebase/FIRESTORE.md).

---

## 💻 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/) (Rolldown)
- **Routing**: [React Router 7](https://reactrouter.com/) — data router with protected layouts
- **Data Fetching**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) + CSS variables
- **UI Primitives**: [Radix UI](https://www.radix-ui.com/) + [Lucide React](https://lucide.dev/) (shadcn/ui patterns)
- **Charts**: [Recharts](https://recharts.org/)
- **Forms**: React Hook Form + Zod 4

### Backend & Cloud
- **Auth**: [Firebase Auth](https://firebase.google.com/docs/auth) — Google sign-in (popup + redirect fallback)
- **Database**: [Cloud Firestore](https://firebase.google.com/docs/firestore) — project-centric subcollection architecture
- **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage) — equipment images
- **Hosting**: [Firebase Hosting](https://firebase.google.com/docs/hosting) — edge CDN, security headers, SPA rewrites

---

## 📂 Repository Layout

```
tinkers-lab-platform/
├── src/                       # Application source code
│   ├── components/            # UI primitives (ui/), layout shell, common & visual components
│   ├── contexts/              # React context providers (AuthContext)
│   ├── features/              # Feature-sliced modules (auth, bookings, checkout, admin, …)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Firebase init (firebase.ts), form helpers, utilities
│   ├── routes/                # Route tree + ProtectedRoute/AdminRoute guards
│   ├── services/firebase/     # Firestore service layer (auth, projects, bookings, …)
│   ├── styles/                # Global CSS / Tailwind layer
│   └── types/                 # Domain model types (single source of truth)
├── functions/                 # ☁️ Cloud Functions (server-side enforcement)
│   └── src/                   # createProject, createBooking, submitFeedback,
│                              #   sweepOverdueCheckouts, notifyOnProject/BookingUpdate
├── tests/                     # 🔐 Emulator-based security-rule tests (requires Java)
├── docs/                      # 📚 All documentation (start here → docs/README.md)
│   ├── architecture/          # overview.md, data-architecture.md
│   ├── firebase/              # FIRESTORE.md, AUTH.md, STORAGE.md, DEPLOYMENT.md, ENVIRONMENT.md
│   ├── design/                # DESIGN.md, design-system.md
│   ├── development/           # TESTING.md
│   ├── specs/                 # Historical product specifications
│   ├── audits/                # Codebase & security audit reports
│   ├── prompts/               # Design/architecture prompts
│   ├── planning/              # Implementation plans
│   └── archive/               # Superseded design tokens/assets
├── scripts/                   # Seeders & migrations (seedEquipment.ts, migrateToSubcollections.ts)
├── public/                    # Static assets (favicon, PWA manifest, sw.js, fonts)
├── assets/                    # Raw design assets (fonts)
├── firebase.json              # Hosting/Firestore/Storage deployment config
├── firestore.rules            # Firestore security rules (server-side enforcement)
├── firestore.indexes.json     # Composite index definitions
├── storage.rules              # Firebase Storage security rules
├── .env.example               # Environment variable template (placeholders only)
└── ...                        # Vite / TS / Tailwind config
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+, **npm** v9+
- **Firebase CLI**: `npm install -g firebase-tools` (only for emulators/deploys)

### 1. Clone & install
```bash
git clone https://github.com/notnamansinha/tinkers-lab-platform.git
cd tinkers-lab-platform
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# fill in your Firebase web-app values (Firebase Console → Project Settings → Your apps)
```
Full variable reference: [`docs/firebase/ENVIRONMENT.md`](docs/firebase/ENVIRONMENT.md). ⚠️ Never commit `.env.local`.

### 3. Run locally
```bash
npm run dev          # → http://localhost:5173
```

### 4. Emulators (no credentials needed)
```bash
npm run emulators
VITE_USE_EMULATORS=true npm run dev
```

> ⚠️ Project & booking creation, feedback, and overdue sweeping are **server-enforced by Cloud Functions** — run the emulator suite locally, or deploy functions (`npm run deploy:functions`) before exercising those flows.

### 5. Verify / build
```bash
npm run lint
npm run build
npm test            # unit tests
npm run test:rules  # security-rule tests (requires Java — CI runs these)
```

---

## 📚 Documentation

All documentation lives in [`docs/`](docs/) — see the **[Documentation Index](docs/README.md)** for the full map.

| Area | Document |
|---|---|
| **Firestore** | [`docs/firebase/FIRESTORE.md`](docs/firebase/FIRESTORE.md) — collections, schemas, rules, indexes |
| **Firebase** | [`docs/firebase/DEPLOYMENT.md`](docs/firebase/DEPLOYMENT.md) · [`docs/firebase/AUTH.md`](docs/firebase/AUTH.md) · [`docs/firebase/STORAGE.md`](docs/firebase/STORAGE.md) · [`docs/firebase/ENVIRONMENT.md`](docs/firebase/ENVIRONMENT.md) |
| **Architecture** | [`docs/architecture/overview.md`](docs/architecture/overview.md) · [`docs/architecture/data-architecture.md`](docs/architecture/data-architecture.md) |
| **Security** | [`docs/SECURITY.md`](docs/SECURITY.md) |
| **Design** | [`docs/design/DESIGN.md`](docs/design/DESIGN.md) · [`docs/design/design-system.md`](docs/design/design-system.md) |
| **Development** | [`docs/development/TESTING.md`](docs/development/TESTING.md) |
| **Contributing** | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

---

## 🤝 Contributing

Contributions are welcome! Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for code standards, branching, and the pull-request process. Run `npm run lint` and `npm run build` before opening a PR.

---

## 📄 License

Proprietary software developed for the Innovation & Tinkering Lab, Ahmedabad University. All rights reserved.
