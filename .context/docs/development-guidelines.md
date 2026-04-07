# Development Guidelines

Use these repo-specific habits when making changes.

## Commands
- `npm install` after dependency changes.
- `npm run dev` for local development on port `5000`.
- `npm run build` before shipping production-sensitive changes.
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:e2e`

## App Rules
- Keep Prisma on the server only.
- Prefer `src/lib/queries` for server-rendered reads.
- Keep provider-specific integration code inside `src/lib/*` modules instead of scattering it across pages.
- Update `.context` docs and onboarding references when setup or behavior changes.

## Environment
- `NEXT_PUBLIC_APP_URL` should match the deployed or local base URL used by callbacks and links.
- Admin access requires `ADMIN_EMAILS` or `ADMIN_USER_IDS`.
- Uploads require either `BLOB_READ_WRITE_TOKEN` or `REPLIT_STORAGE_BUCKET_ID`.
