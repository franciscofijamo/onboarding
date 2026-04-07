# Authentication

Authentication is powered by Clerk.

## Current Shape
- Sign-in and sign-up pages live under `src/app/(auth)`.
- Route protection is enforced by `src/middleware.ts` and server-side checks on protected/admin routes.
- Admin access is additionally gated by `ADMIN_EMAILS` or `ADMIN_USER_IDS`.

## Environment Variables
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`

## Change Notes
- If you add a new protected area, make sure both routing and server checks agree.
- If you change onboarding or env requirements, update `src/lib/onboarding/env-check.ts` and this doc together.
