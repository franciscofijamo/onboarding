# StandOut

## Overview
StandOut — Plataforma inteligente para candidatos a bolsas de estudo. Avaliação de essays com IA (Chevening e Fulbright), feedback detalhado, sistema de créditos, pagamentos (Asaas/M-Pesa), e painel admin. Built with Next.js 16, Clerk auth, Prisma/PostgreSQL, Tailwind CSS v4, Radix UI, and React Query.

## Project Architecture
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI components
- **Auth**: Clerk (`@clerk/nextjs`)
- **Database**: PostgreSQL via Prisma ORM (client generated to `prisma/generated/client`)
- **AI**: OpenRouter AI SDK
- **Payments**: Asaas (sandbox) + M-Pesa (sandbox) integrations
- **Storage**: Replit Object Storage (`@replit/object-storage`)
- **State Management**: React Query (`@tanstack/react-query`)

## Directory Structure
```
src/
  app/
    (protected)/   - Auth-required pages (dashboard, billing, ai-chat)
    (public)/      - Public pages (landing, sign-in, sign-up)
    admin/         - Admin dashboard pages
    api/           - API routes (admin, ai, checkout, credits, fulbright, webhooks)
  components/      - UI and feature components
  contexts/        - React contexts
  hooks/           - Custom hooks
  lib/             - Shared utilities (storage, asaas, mpesa, clerk, etc.)
prisma/
  schema.prisma    - Database schema
  migrations/      - Database migrations
public/            - Static assets
scripts/           - Dev/helper scripts
```

## Environment Setup
- **Port**: Dev and production both run on port 5000
- **Database**: Replit PostgreSQL (DATABASE_URL auto-configured)
- **Host**: 0.0.0.0 for all network binding
- **Dev Origins**: `*.picard.replit.dev`, `*.replit.dev`, `*.repl.co`
- **Storage**: Replit Object Storage (STORAGE_PROVIDER=replit)

## Key Environment Variables

### Auto-configured by Replit
- `DATABASE_URL` - PostgreSQL connection
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Object storage bucket
- `PUBLIC_OBJECT_SEARCH_PATHS` - Public object paths
- `PRIVATE_OBJECT_DIR` - Private object directory

### Configured as Env Vars (shared)
- `NEXT_PUBLIC_APP_URL` - Public URL of the app
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `SIGN_UP_URL` / `AFTER_SIGN_IN_URL` / `AFTER_SIGN_UP_URL` - Clerk routes
- `ADMIN_EMAILS` - Admin access emails
- `STORAGE_PROVIDER` - Set to "replit"
- `REPLIT_STORAGE_BUCKET_ID` - Replit storage bucket ID
- `BLOB_MAX_SIZE_MB` - Upload size limit (25MB)
- `PAYMENT_PROVIDER` - Payment provider selection (auto)
- `ASAAS_API_URL` - Asaas API URL (sandbox)
- `MPESA_BASE_URL` / `MPESA_C2B_PATH` / `MPESA_ORIGIN` / `MPESA_SERVICE_PROVIDER_CODE` / `MPESA_TIMEOUT_MS` - M-Pesa config
- `API_LOGGING` / `API_LOG_LEVEL` / `API_LOG_MIN_STATUS` - Logging config
- `FREE_CREDITS_ON_SIGNUP` - Number of free credits granted to new users (default: 20)
- `DEBUG_CLERK_SYNC` / `IMAGE_DEBUG` / `E2E_AUTH_BYPASS` / `NEXT_PUBLIC_E2E_TEST` - Debug flags

### Configured as Secrets
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` / `CLERK_WEBHOOK_SECRET` - Clerk auth
- `OPENROUTER_API_KEY` - AI features
- `ASAAS_API_KEY` / `ASAAS_WEBHOOK_SECRET` - Asaas payments
- `MPESA_API_KEY` / `MPESA_PUBLIC_KEY` - M-Pesa payments
- `USER_WEBHOOK_SECRET` - User webhook secret

## Chevening Essay Evaluator
- **Feature**: AI-powered essay evaluation for Chevening scholarship applicants
- **Models**: Essay, EssayVersion, EssayAnalysis (Prisma schema)
- **Credits**: ESSAY_ANALYSIS costs 10 credits per analysis
- **AI Model**: google/gemini-2.0-flash-001 via OpenRouter
- **Pages**: /chevening (dashboard), /chevening/essay/[type] (editor), /chevening/essay/[type]/feedback
- **Essay Types**: LEADERSHIP, NETWORKING, COURSE_CHOICES, CAREER_PLAN
- **Word Limits**: 100 min, 300 max
- **Auto-save**: Every 30 seconds, keeps last 10 versions
- **Credit Flow**: Deduct first → perform analysis → refund on failure (with .catch guards)
- **Access**: Available without active subscription (added to allowedPaths)

## Mock Interview Flashcards
- **Feature**: AI-generated flashcards for Chevening interview preparation
- **Models**: FlashcardDeck, Flashcard, StudySession (Prisma schema)
- **Credits**: MOCK_INTERVIEW_DECK costs 15 credits per deck generation
- **AI Model**: google/gemini-2.0-flash-001 via OpenRouter
- **Pages**: /chevening/mock-interview (dashboard), /chevening/mock-interview/study/[deckId] (study interface)
- **Prerequisites**: User must have all 4 Chevening essays analyzed
- **Deck Generation**: 18 flashcards per deck with questions based on user's essays
- **Question Categories**: validation (40%), deepening (30%), situational (20%), consistency (10%)
- **Anti-Duplication**: AI avoids repeating questions from existing user decks
- **Study Modes**: Sequential and Random (Fisher-Yates shuffle)
- **Tracking**: Cards studied, study sessions, duration, streak (consecutive days)
- **Export**: JSON endpoint for client-side PDF generation
- **Credit Flow**: Deduct first → generate flashcards → refund on AI failure

## Audio Mock Interview (Chevening)
- **Feature**: AI-powered audio interview practice for Chevening scholarship applicants
- **Models**: AudioInterviewSession, AudioInterviewResponse (Prisma schema)
- **Credits**: AUDIO_INTERVIEW costs 15 credits per session generation (5 questions), ESSAY_ANALYSIS costs 10 credits per individual response analysis
- **AI Model**: google/gemini-2.0-flash-001 via OpenRouter
- **Pages**: /chevening/mock-interview/audio (dashboard), /chevening/mock-interview/audio/[sessionId] (interview + feedback)
- **Prerequisites**: User must have all 4 Chevening essays analyzed
- **Session Generation**: 5 AI-generated interview questions based on user's essays (like flashcards)
- **Question Categories**: validation (2), deepening (1), situational (1), consistency (1)
- **Anti-Duplication**: AI avoids repeating questions from existing user sessions
- **Audio Recording**: MediaRecorder API (browser) + file upload fallback (max 25MB)
- **Audio Storage**: Replit Object Storage (audio-interviews/{userId}/{sessionId}/q{index}.{ext})
- **Analysis Pipeline**: Upload audio → Transcribe with AI → Analyze with AI → Store feedback
- **Feedback**: Score (1-10), 6 criteria (clarity, content, fluency, confidence, examples, Chevening alignment), strengths, improvements, model answer, communication tips
- **Credit Flow**: Deduct first → generate questions/analyze → refund on AI failure
- **New OperationType**: AUDIO_INTERVIEW enum value in Prisma schema

## Fulbright Essay Evaluator
- **Feature**: AI-powered essay evaluation for Fulbright scholarship applicants
- **Models**: Reuses Essay, EssayVersion, EssayAnalysis (with scholarship='fulbright' discriminator)
- **Credits**: ESSAY_ANALYSIS costs 10 credits per analysis
- **AI Model**: google/gemini-2.0-flash-001 via OpenRouter
- **Pages**: /fulbright (dashboard), /fulbright/essay/[type] (editor), /fulbright/essay/[type]/feedback
- **Essay Types**: GRANT_PURPOSE, PERSONAL_STATEMENT
- **Word Limits**: 50 min, 1000 max
- **Categories**: FulbrightCategory enum (STUDENT, YOUNG_PROFESSIONAL, RESEARCHER) - affects analysis weighting
- **Host Institution**: Optional field for host institution compatibility analysis
- **Evaluation Criteria**: 6 axes (clareza_projeto, viabilidade, preparo_academico, impacto_intercultural, adaptabilidade, escrita_persuasiva)
- **Feedback Extras**: viabilidade_projeto section (project viability + host compatibility), readiness_entrevista in final comments
- **Credit Flow**: Deduct first → perform analysis → refund on failure (with .catch guards)
- **Access**: Available without active subscription (added to allowedPaths)

## M-Pesa Production Config
- **BASE_URL**: https://api.vm.co.mz:18352
- **SERVICE_PROVIDER_CODE**: 901819
- **C2B_PATH**: /ipg/v1x/c2bPayment/singleStage/

## Multi-Language (i18n) System
- **Languages**: Português de Moçambique (pt-MZ, default), English US (en-US), English UK (en-GB)
- **Architecture**: Context-based (LanguageProvider), no URL routing, localStorage persistence
- **Files**: src/i18n/index.ts (translate/getTranslationArray), src/i18n/locales/*.json (dictionaries)
- **Context**: src/contexts/language.tsx → useLanguage() hook provides { locale, setLocale, t, tArray }
- **Switcher**: src/components/app/language-switcher.tsx (flag icons in topbar)
- **AI Language**: src/lib/ai-language.ts → wrapPromptWithLanguage(prompt, locale) prepends language instruction
- **Translation Keys**: Hierarchical (common.*, nav.*, chevening.*, fulbright.*, editor.*, feedback.*, topbar.*, dashboard.*, marketing.*)
- **Variable Interpolation**: t("key", { var: value }) replaces {var} in strings
- **Array Translations**: tArray("key") for arrays like analysis steps
- **AI Responses**: Frontend sends `{ language: locale }` in POST body to analyze endpoints; API wraps prompt with language instruction
- **JSON Keys**: AI response JSON keys (nota_geral, criterios, etc.) stay constant; only text values translate

## Recent Changes
- 2026-02-09: Built complete Audio Mock Interview module (Chevening) - schema, API routes, dashboard, session page with audio recorder, AI analysis + feedback, i18n translations
- 2026-02-06: Free plan with 20 credits on signup - created "Grátis" plan, updated Clerk + custom webhooks to grant FREE_CREDITS_ON_SIGNUP credits automatically
- 2026-02-06: Full multi-language support (pt-MZ, en-US, en-GB) - i18n context, translation dictionaries, language switcher, all pages translated, AI responses in user's language
- 2026-02-06: Built complete Fulbright Essay Evaluator module (schema, API routes, dashboard, editor, feedback pages, sidebar nav)
- 2026-02-06: Rebranded entire app from "SaaS Template/STKV2" to "StandOut" - brand config, sidebar, topbar, header, footer, hero, FAQ, marketing sections
- 2026-02-06: Improved error handling in essay analysis - deduct credits first with proper rollback, .catch guards on refund/status reset
- 2026-02-06: Built complete Chevening Essay Evaluator MVP (schema, API, dashboard, editor, feedback pages)
- 2026-02-06: Updated M-Pesa to production URLs and service provider code
- 2026-02-06: Full environment migration from .env.example to Replit secrets and env vars
- 2026-02-06: Configured Replit Object Storage (bucket created, STORAGE_PROVIDER=replit)
- 2026-02-06: Fixed allowedDevOrigins for Replit proxy (wildcard subdomain patterns)
- 2026-02-06: Initial Replit setup - configured port 5000, PostgreSQL, Prisma migrations

## User Preferences
- Language: Multi-language support (pt-MZ default, en-US, en-GB), choice persisted in localStorage
