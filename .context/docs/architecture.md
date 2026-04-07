# Architecture

`standout` is a Next.js App Router application with three main surfaces:

- Public pages in `src/app/(public)` for marketing and entry flows.
- Protected product pages in `src/app/(protected)` for authenticated user workflows like dashboard, billing, AI chat, interview prep, and scenarios.
- Admin pages in `src/app/admin` for plans, credits, storage, usage, onboarding, and user management.

## Runtime Layers
- Routing and page composition live in `src/app/`.
- UI building blocks live in `src/components/`.
- Shared state and hooks live in `src/contexts/` and `src/hooks/`.
- Domain logic and integrations live in `src/lib/`.
- Persistence is modeled in `prisma/schema.prisma` and accessed through the generated client in `prisma/generated/client`.

## Data Access Guidance
- Prefer `src/lib/queries/*` for read-heavy access used by Server Components.
- API routes and server actions may use Prisma directly or reuse query-layer helpers.
- Do not import the Prisma client into Client Components.

## Integrations
- Clerk handles auth and user identity.
- PostgreSQL plus Prisma handle persistence.
- Asaas handles payments and subscription lifecycle updates.
- OpenRouter plus the Vercel AI SDK power chat and image flows.
- Uploads use Vercel Blob or Replit App Storage depending on environment.
