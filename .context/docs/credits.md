# Credits

The app uses a server-enforced credit system for AI and other paid actions.

## Core Expectations
- Credit balances are fetched from the backend, not trusted from client state.
- Validation and deduction happen on the server.
- Costs and plan settings are configurable from the admin area.

## Relevant Areas
- UI components: `src/components/credits`
- Hooks/client access: likely `useCredits` and related frontend helpers
- Server logic: `src/lib/credits`
- Public/admin APIs: `src/app/api/credits` and admin settings routes

## When Changing Credit Logic
- Update both validation and refund behavior when applicable.
- Verify any AI or billing route that consumes credits.
- Add or update tests for balance changes and failure rollback paths.
