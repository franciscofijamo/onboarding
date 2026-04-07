# Database Development

Use this when changing Prisma models, queries, or migrations.

## Checklist
1. Update `prisma/schema.prisma`.
2. Regenerate or migrate with the appropriate `db:*` workflow.
3. Keep application code aligned with the generated client in `prisma/generated/client`.
4. Update query helpers, route handlers, and UI assumptions in the same change.
5. Add regression coverage when a schema change affects business behavior.
