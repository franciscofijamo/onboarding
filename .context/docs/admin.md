# Admin

Admin functionality lives under `src/app/admin` and related `api/admin/*` routes.

## Access
- Users must pass both auth checks and admin identity checks.
- Configure either `ADMIN_EMAILS` or `ADMIN_USER_IDS`.

## Main Areas
- `admin/settings` for plans, costs, and feature settings
- `admin/users` for user management and credit adjustments
- `admin/credits`, `admin/usage`, and `admin/storage` for operational views
- `admin/onboarding` for setup guidance

## Maintenance Notes
- If you change admin requirements or onboarding language, update `src/lib/onboarding/env-check.ts` and the corresponding `.context/docs/*` files.
- Admin behavior is a good candidate for Playwright coverage because access control and workflows are easy to regress.
