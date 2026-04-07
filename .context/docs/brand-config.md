# Brand Config

Brand metadata is centralized in `src/lib/brand-config.ts`.

## What Lives There
- Site name, short name, description, author, and public URL
- Logo/icon paths
- Open Graph image
- Social links
- Support contact details
- Analytics identifiers with env-driven values

## Consumers
- Global metadata in app layout
- Public header/footer
- Analytics and pixel injection
- Admin onboarding copy that tells maintainers where to change branding

## Editing Guidance
- Keep paths aligned with files in `public/`.
- Prefer env vars for analytics IDs when they differ by environment.
- If branding fields or defaults change, update admin onboarding copy if needed.
