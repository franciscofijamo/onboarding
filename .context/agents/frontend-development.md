# Frontend Development

Use this when changing pages, layouts, or components.

## Checklist
1. Find the route segment in `src/app` and the feature components it composes.
2. Reuse existing UI primitives from `src/components/ui` when possible.
3. Keep server-only logic out of Client Components.
4. Verify loading, auth, and empty states for the changed screen.
5. Run `npm run lint` and `npm run typecheck`; add Playwright coverage if the flow is important.
