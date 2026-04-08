# Documentation Index

This folder is the project context pack for the `standout` app. It is meant to give humans and agents a fast, repo-specific map before making changes.

## Start Here
- `architecture.md` explains the major runtime slices and request flow.
- `development-guidelines.md` captures the practical coding rules for this repo.
- `frontend.md` and `components.md` cover the UI layer.
- `backend.md` and `api.md` cover server behavior and route patterns.

## Product Areas
- `authentication.md` covers Clerk integration and route protection.
- `database.md` covers Prisma, generated client usage, and schema workflow.
- `credits.md` explains the credit system and where it is enforced.
- `ai-chat.md` covers chat/image generation and model configuration.
- `uploads.md` covers the upload pipeline and storage providers.
- `admin.md` covers the admin panel and environment requirements.
- `cv-analysis-sdd-backlog.md` contains the Spec-Driven Development backlog and Jira/Linear import template for CV analysis by application.
- `brand-config.md` documents the branding source of truth.
- `asaas-webhooks.md` documents subscription/payment webhook flow.

## Maintenance Rule
- When README links, onboarding copy, or environment checks point at a `.context/docs/*` file, keep that file updated in the same change.
