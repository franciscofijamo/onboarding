# Language Unification SDD

## Problem
- The UI language was stored in local storage instead of the user profile.
- Language switching was visible in page chrome instead of profile settings.
- Some UI areas used hardcoded copy or PT-only hints, which allowed mixed-language experiences.
- AI responses already accepted a language parameter, but the platform did not enforce a single account-level source of truth.

## Goal
- A signed-in user chooses one language in profile settings.
- That language becomes the source of truth for UI copy, formatting choices, and AI generation prompts.
- The visible language switcher is removed from public/protected chrome.
- The system no longer mixes languages because of local-only state or special-case hint paths.

## Scope
1. Persist `User.locale` in Prisma.
2. Extend `/api/profile` and `useProfile()` to read and update locale.
3. Make `LanguageProvider` hydrate from profile first, with local storage only as a guest fallback.
4. Remove visible language controls from top-level page chrome.
5. Add `/settings/profile` as the dedicated profile settings surface for language changes.
6. Remove PT-only hint fallback and keep all touched UI copy behind locale dictionaries.
7. Add tests that guard locale dictionary structure parity.

## Acceptance Criteria
1. A signed-in user changing language in profile settings sees the app switch immediately.
2. Refreshing the page or signing in on another session keeps the chosen locale.
3. AI routes continue to receive the same locale used by the account.
4. Public header, protected topbar, and onboarding modal no longer expose a page-level language selector.
5. Translation dictionaries stay shape-compatible across `en-US`, `en-GB`, and `pt-MZ`.

## Rollout Notes
- Guest users still use local storage until authentication is available.
- Existing users without a locale record backfill to `en-US`.
- Follow-up work should continue migrating remaining hardcoded strings in recruiter/admin surfaces to complete full-system coverage.
