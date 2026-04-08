# OpenCode Guidelines

## Commands
- Build: `npm run build`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- E2E Tests (all): `npm run test:e2e`
- E2E Tests (single): `npx playwright test tests/e2e/[test-file].spec.ts`
- Unit Tests (all): `npm run test:unit`
- Unit Tests (single): `npx vitest run tests/unit/[test-path].test.ts`

## Code Style
- **Imports**: Named imports; organize by external, internal, relative
- **Formatting**: ESLint & Prettier with 2 space indentation
- **Types**: TypeScript with explicit return types on exported functions
- **Naming**: Components (PascalCase), hooks (use* prefix), utils (camelCase)
- **Error Handling**: Try/catch with specific error types; use logger
- **Components**: shadcn/ui patterns; functional components with hooks
- **API Routes**: Next.js App Router patterns with middleware for auth
- **State Management**: React Query for server state, React hooks for local state