# Uploads

Authenticated uploads are handled by `POST /api/upload`.

## Storage Providers
- Vercel Blob via `BLOB_READ_WRITE_TOKEN`
- Replit App Storage via `REPLIT_STORAGE_BUCKET_ID`

At least one of those storage env vars must be configured for uploads to work.

## Behavior
- Files are stored under a user-scoped path like `uploads/<clerkUserId>/...`.
- The API returns metadata including URL, pathname, content type, size, and original name.
- The feature is used by AI chat attachments and potentially other user-generated content flows.

## Change Notes
- Keep provider selection logic inside `src/lib/storage`.
- If upload response shapes or env requirements change, update onboarding docs and checks.
