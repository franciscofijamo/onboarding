# API

API routes live under `src/app/api`.

## Major Route Groups
- `api/admin/*` powers admin dashboards, plans, credits, invites, sync, and settings.
- `api/ai/*` powers chat and image generation.
- `api/credits/*` exposes credit balances and settings to the UI.
- `api/upload/*` handles authenticated file uploads.
- `api/webhooks/*` processes provider callbacks such as Asaas.
- Feature-specific routes like `api/profile`, `api/resume`, `api/mock-interview`, `api/scenarios`, and `api/job-application` support product workflows.

## Route Expectations
- Authenticated routes should rely on Clerk session state and server-side checks.
- Admin routes should enforce admin identity from `ADMIN_EMAILS` or `ADMIN_USER_IDS`.
- Routes that spend credits should validate and deduct on the server, not in the client.
- Webhook routes must validate signatures before mutating data.

## When Editing APIs
- Preserve JSON shapes when possible to avoid silent UI regressions.
- Update unit or e2e coverage for behavior changes.
- Update docs if env vars, route contracts, or setup steps change.
