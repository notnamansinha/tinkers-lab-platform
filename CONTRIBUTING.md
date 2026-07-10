# Contributing to Tinkers Lab Platform

Thanks for considering a contribution!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/notnamansinha/tinkers-lab-platform.git
cd tinkers-lab-platform

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Running Tests

There are currently no automated tests configured for this repository. However, you should ensure that the TypeScript compiler and linter pass before submitting your work:

```bash
npm run build
npm run lint
```

## Submitting a Pull Request

1. Fork the repo and create a branch from `UI-test` (or the default branch you are targeting).
2. Make your changes and ensure they follow the existing conventions.
3. Ensure `npm run build` passes.
4. Open a PR describing the change and its motivation.

## Code Style

- **TypeScript**: The project uses strict TypeScript. Avoid `any` types wherever possible.
- **Components**: Adhere to the established pattern in `src/components/` (shadcn/ui style components + Tailwind CSS).
- **Service Layer**: Do not access Firebase directly from UI components. Ensure all interactions with `firebase/firestore` and `firebase/auth` are appropriately handled or proxied through standard React Query caching.
