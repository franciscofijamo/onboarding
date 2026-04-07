# Frontend

The UI is built with Next.js App Router, React 19, Tailwind CSS, Radix primitives, and feature components organized by domain.

## Main Areas
- Marketing and auth entry points live in `src/app/(public)` and `src/app/(auth)`.
- Authenticated experiences live in `src/app/(protected)`.
- Admin flows live in `src/app/admin`.
- Reusable UI primitives live in `src/components/ui`.

## Working Style
- Prefer composing existing feature components before adding a new abstraction.
- Use hooks from `src/hooks` and contexts from `src/contexts` when shared client state already exists.
- Keep server-only logic out of Client Components.
- When adding UI primitives, align with `components.json` aliases and styling conventions.

## Quality Checks
- Run `npm run lint` and `npm run typecheck` for UI changes.
- Run Playwright specs when navigation, auth, admin, or critical flows change.
