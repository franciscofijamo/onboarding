# Backend

The backend is primarily implemented with App Router route handlers in `src/app/api` plus domain helpers in `src/lib`.

## Important Server Modules
- `src/lib/queries/` contains read-side helpers intended for server rendering.
- `src/lib/credits/` contains credit validation and deduction logic.
- `src/lib/asaas/` contains Asaas integration helpers.
- `src/lib/storage/` contains provider selection and upload helpers.
- `src/lib/onboarding/` contains developer onboarding checks surfaced in admin UI.

## Conventions
- Keep route handlers thin and move reusable logic into `src/lib`.
- Validate request data close to the boundary and avoid leaking provider-specific details across the codebase.
- Treat env-dependent features as optional unless the route or page explicitly requires them.
- If a feature consumes credits or mutates billing state, keep the server as the source of truth.

## Safe Change Pattern
1. Update domain logic in `src/lib`.
2. Update route handlers or pages that consume it.
3. Update tests in `tests/unit` or `tests/e2e`.
4. Update `.context/docs/*` when behavior or setup changes.
