# Architecture Planning

Use this checklist before large or cross-cutting changes.

1. Identify whether the change touches public, protected, admin, API, or shared library code.
2. Trace the source-of-truth modules in `src/lib` and `prisma/` before editing UI.
3. Check whether README, onboarding UI, or `.context/docs/*` links need updates.
4. Decide the verification path: lint, typecheck, unit, e2e, or a combination.
5. Prefer small vertical slices that keep schema, server logic, UI, and docs in sync.
