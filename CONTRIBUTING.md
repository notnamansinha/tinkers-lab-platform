# Contributing to Tinkers' Lab Platform

Thanks for considering a contribution! Please also read the **[Documentation Index](docs/README.md)** and **[Testing Guide](docs/development/TESTING.md)**.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/notnamansinha/tinkers-lab-platform.git
cd tinkers-lab-platform

# Install dependencies
npm install

# Configure environment (Firebase web-app values; placeholders in .env.example)
cp .env.example .env.local

# Start the development server
npm run dev
```

Environment variables are documented in [`docs/firebase/ENVIRONMENT.md`](docs/firebase/ENVIRONMENT.md).
**Never commit `.env.local` or any service-account key** — see [`docs/SECURITY.md`](docs/SECURITY.md).

## Quality Gates

There is currently **no automated unit/E2E test suite**. Before submitting work, ensure the type-checker and linter pass:

```bash
npm run lint
npm run build
```

See [`docs/development/TESTING.md`](docs/development/TESTING.md) for the manual QA checklist and emulator workflow.

## Submitting a Pull Request

1. Fork the repo and create a branch from `main` (the default branch).
2. Make your changes and follow the existing conventions below.
3. Run `npm run lint` and `npm run build` — both must pass.
4. If you changed Firestore/Storage rules or indexes, update [`docs/firebase/FIRESTORE.md`](docs/firebase/FIRESTORE.md) and the access matrix in [`docs/architecture/data-architecture.md`](docs/architecture/data-architecture.md).
5. Open a PR describing the change and its motivation.

## Code Style

- **TypeScript**: The project uses strict TypeScript. Avoid `any` types wherever possible.
- **Components**: Adhere to the established pattern in `src/components/` (shadcn/ui style components + Tailwind CSS).
- **Service Layer**: Do not access Firebase directly from UI components. Ensure all interactions with `firebase/firestore` and `firebase/auth` are appropriately handled or proxied through the service layer (`src/services/firebase/`) and standard React Query caching.
- **Docs**: Keep documentation in `docs/` organized by topic (architecture, firebase, design, development). Source-of-truth files: `firestore.rules`, `firestore.indexes.json`, `src/types/index.ts`.
