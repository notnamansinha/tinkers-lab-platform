# 📚 Tinkers' Lab Platform — Documentation Index

> Everything you need to understand, run, extend, and deploy the **Tinkers' Lab Platform**.
> This is the single entry point for all project documentation.

---

## 🗂 Documentation Map

### 🏛 Architecture
| Document | Purpose |
|---|---|
| [`architecture/overview.md`](architecture/overview.md) | High-level system architecture: components, data flow, design decisions, security model, tech stack. |
| [`architecture/data-architecture.md`](architecture/data-architecture.md) | In-depth Firestore collection models, document-ID strategies, atomic counters, end-to-end walkthroughs, rules access matrix, indexes, free-tier optimizations. |

### 🔥 Firebase & Firestore
| Document | Purpose |
|---|---|
| [`firebase/FIRESTORE.md`](firebase/FIRESTORE.md) | **The Firestore reference**: every collection, every field, security-rule behavior, and index definitions. |
| [`firebase/AUTH.md`](firebase/AUTH.md) | Authentication & authorization flow: Google sign-in, profile bootstrapping, role model, route guards. |
| [`firebase/STORAGE.md`](firebase/STORAGE.md) | Firebase Storage layout, rules, and the equipment-image upload pipeline. |
| [`firebase/DEPLOYMENT.md`](firebase/DEPLOYMENT.md) | Deploying Hosting, Firestore rules, composite indexes, and Storage rules. |
| [`firebase/ENVIRONMENT.md`](firebase/ENVIRONMENT.md) | Environment variable reference (placeholders only — never real values). |

### 🎨 Design
| Document | Purpose |
|---|---|
| [`design/DESIGN.md`](design/DESIGN.md) | Full product visual design: layouts, screens, interaction patterns. |
| [`design/design-system.md`](design/design-system.md) | Design system: tokens, color palette, typography scale, geometry, UI rules. |

### 🛠 Development
| Document | Purpose |
|---|---|
| [`development/TESTING.md`](development/TESTING.md) | Quality gates: unit tests (vitest), security-rule tests (emulators), build, lint, manual QA checklist. |

### ☁️ Cloud Functions (server-side enforcement)
| Document | Purpose |
|---|---|
| [`firebase/FIRESTORE.md`](firebase/FIRESTORE.md) §7 | Every function, its trigger, and what it enforces server-side. |
| [`../functions/src/index.ts`](../functions/src/index.ts) | The deployed functions themselves (createProject, createBooking, submitFeedback, sweepOverdueCheckouts, notifyOnProject/BookingUpdate). |
| [`tests/firestore.rules.test.ts`](../tests/firestore.rules.test.ts) · [`tests/storage.rules.test.ts`](../tests/storage.rules.test.ts) | Emulator-based security-rule tests (run with `npm run test:rules`, Java required, CI runs them). |

### 📐 Specifications (historical)
| Document | Purpose |
|---|---|
| [`specs/roles_and_permissions.md`](specs/roles_and_permissions.md) | Role-based access control matrix (human-readable summary). |
| [`specs/auth-architecture.md`](specs/auth-architecture.md) | Original authentication architecture spec. |
| [`specs/device-management-system.md`](specs/device-management-system.md) | Device management system spec (Form 2A / 2B origin). |
| [`specs/tool-access-system.md`](specs/tool-access-system.md) | Tool access system spec. |
| [`specs/tinkerer-ui-redesign-implementation-plan.md`](specs/tinkerer-ui-redesign-implementation-plan.md) | UI redesign implementation plan. |
| [`specs/mathical-visual-system.md`](specs/mathical-visual-system.md) | Mathical visual system reference. |
| [`specs/figjam-illustration-style.md`](specs/figjam-illustration-style.md) | FigJam illustration style guide. |

### 📈 Audits & Reviews
| Document | Purpose |
|---|---|
| [`audits/audit-report.md`](audits/audit-report.md) | Codebase & security audit report. |

### 🤖 Prompts
| Document | Purpose |
|---|---|
| [`prompts/codex-visual-replication-prompt.md`](prompts/codex-visual-replication-prompt.md) | Visual replication prompt used with Codex. |
| [`prompts/codex-visual-restructure-prompt.md`](prompts/codex-visual-restructure-prompt.md) | Visual restructure prompt used with Codex. |

### 🗄 Archive
| Document | Purpose |
|---|---|
| [`archive/`](archive/) | Superseded assets & design tokens (kept for reference). |

### 📋 Planning
| Document | Purpose |
|---|---|
| [`planning/implementation-plan.md`](planning/implementation-plan.md) | Firestore project-centric restructure plan (history & rationale). |

---

## 🧭 Where to start

| I'm a… | Read this first |
|---|---|
| New developer setting up the repo | Root [`README.md`](../README.md) → [`firebase/ENVIRONMENT.md`](firebase/ENVIRONMENT.md) → [`development/TESTING.md`](development/TESTING.md) |
| Contributor | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Someone who wants to understand the database | [`firebase/FIRESTORE.md`](firebase/FIRESTORE.md) |
| Someone who wants to understand the whole system | [`architecture/overview.md`](architecture/overview.md) → [`architecture/data-architecture.md`](architecture/data-architecture.md) |
| Deploying or releasing | [`firebase/DEPLOYMENT.md`](firebase/DEPLOYMENT.md) |
| Designer / UI reviewer | [`design/design-system.md`](design/design-system.md) |

---

## ✍️ Keeping docs in sync

- **`firestore.rules` / `firestore.indexes.json`** are the source of truth for the database. If you change them, update [`firebase/FIRESTORE.md`](firebase/FIRESTORE.md) and the access matrix in [`architecture/data-architecture.md`](architecture/data-architecture.md).
- **`src/types/index.ts`** is the source of truth for TypeScript domain types. Mirror any type changes into the field tables in `FIRESTORE.md` and `data-architecture.md`.
- **Never commit real credentials.** Env values live only in local `.env.local` (git-ignored). Docs use placeholders only — see [`firebase/ENVIRONMENT.md`](firebase/ENVIRONMENT.md).
