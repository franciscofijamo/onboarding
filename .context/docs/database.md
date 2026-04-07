# Database

Persistence uses PostgreSQL with Prisma.

## Source Of Truth
- Schema: `prisma/schema.prisma`
- Generated client used by the app: `prisma/generated/client`

## Commands
- `npm run db:push` for syncing schema in development.
- `npm run db:migrate` for creating/applying development migrations.
- `npm run db:reset` for resetting the local database.
- `npm run db:studio` for inspection.

## Repo Rules
- Do not hand-edit files inside `prisma/generated/client`.
- Regenerate Prisma artifacts whenever schema changes affect runtime code.
- Keep schema changes, generated output, and any related code updates in the same change.
- Prefer query helpers in `src/lib/queries` for server-rendered reads.
