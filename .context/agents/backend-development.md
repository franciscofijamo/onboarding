# Backend Development

Use this when changing route handlers, integrations, or server-side feature logic.

## Checklist
1. Start from the route or server entry point in `src/app/api`.
2. Move reusable business logic into `src/lib`.
3. Validate auth/admin requirements and credit implications.
4. Keep provider-specific code contained in the integration module.
5. Add or update tests for the changed behavior.
