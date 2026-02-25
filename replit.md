# StandOut

## Overview
StandOut — Business English Job Onboarding Platform. AI-powered career preparation for English-speaking job environments. Features include CV/resume analysis, job application optimization, interview preparation flashcards, workplace scenario simulations, and an AI career coach with specialized skills. Built with Next.js 16, Clerk auth, Prisma/PostgreSQL, Tailwind CSS v4, Radix UI, and React Query.

## Project Architecture
- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI components
- **Auth**: Clerk (`@clerk/nextjs`)
- **Database**: PostgreSQL via Prisma ORM (client generated to `prisma/generated/client`)
- **AI**: OpenRouter AI SDK (google/gemini-2.0-flash-001)
- **AI Agent System**: Orchestrator + 5 specialized skills
- **Payments**: Asaas (sandbox) + M-Pesa (sandbox) integrations
- **Storage**: Replit Object Storage (`@replit/object-storage`)
- **State Management**: React Query (`@tanstack/react-query`)

## Directory Structure
```
src/
  app/
    (protected)/   - Auth-required pages (dashboard, onboarding, interview-prep, scenarios, ai-chat, billing)
    (public)/      - Public pages (landing, sign-in, sign-up)
    admin/         - Admin dashboard pages
    api/           - API routes (resume, job-application, mock-interview, scenarios, ai, admin, webhooks)
  components/      - UI and feature components
  contexts/        - React contexts
  hooks/           - Custom hooks
  lib/
    agents/        - AI Agent orchestrator and skills
      skills/      - Individual skill modules (job-hunter, application-optimizer, market-fit, business-english, resume-builder)
    credits/       - Credit system (deduct, refund, feature-config)
    storage/       - File storage utilities
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
- `FREE_CREDITS_ON_SIGNUP` - Number of free credits granted to new users (default: 20)

### Configured as Secrets
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` / `CLERK_WEBHOOK_SECRET` - Clerk auth
- `OPENROUTER_API_KEY` - AI features
- `ASAAS_API_KEY` / `ASAAS_WEBHOOK_SECRET` - Asaas payments
- `MPESA_API_KEY` / `MPESA_PUBLIC_KEY` - M-Pesa payments

## AI Agent & Skills System
- **Architecture**: Orchestrator pattern — main orchestrator routes user requests to specialized skills
- **Location**: `src/lib/agents/`
- **Skills**:
  - **Job Hunter** (5 credits) — Job search strategies, market trends, salary insights
  - **Application Optimizer** (10 credits) — CV vs job description comparison, match scoring, improvement recommendations
  - **Market Fit** (10 credits) — Skills gap analysis, upskilling paths, competitive positioning
  - **Business English** (5 credits) — Level-adaptive English coaching (beginner to proficient)
  - **Resume Builder** (10 credits) — Resume building, ATS optimization, STAR method bullet points
- **Skill Detection**: Keyword-based + context-based skill detection from user message
- **Integration**: Called from API routes via `routeToSkill()` which returns system message, user prompt, and credit cost

## Job Onboarding Flow
- **Feature**: Multi-step onboarding for job preparation
- **Pages**: `/onboarding` (4-step wizard: Upload CV → Cover Letter → Job Description → AI Analysis)
- **Models**: Resume, CoverLetter, JobApplication, ApplicationAnalysis (Prisma schema)
- **Credits**: CV_ANALYSIS costs 10 credits per analysis
- **Analysis Output**: Fit score, matching skills, missing skills, strengths, improvements, recommendations

## Interview Preparation (Flashcards)
- **Feature**: AI-generated job interview flashcards based on user's CV and target job
- **Models**: FlashcardDeck, Flashcard, StudySession (Prisma schema)
- **Credits**: INTERVIEW_PREP costs 15 credits per deck generation
- **Pages**: `/interview-prep` (dashboard), `/interview-prep/study/[deckId]` (study interface)
- **Prerequisites**: User must have uploaded CV and job description
- **Categories**: behavioral, technical, situational, culture_fit, business_english
- **Study Modes**: Sequential and Random (Fisher-Yates shuffle)

## Workplace Scenario Simulations (Audio)
- **Feature**: AI-powered workplace scenario practice via audio recording
- **Models**: WorkplaceScenarioSession, WorkplaceScenarioResponse (Prisma schema)
- **Credits**: SCENARIO_SIMULATION costs 15 credits per session, 10 credits per analysis
- **Pages**: `/scenarios` (dashboard), `/scenarios/[sessionId]` (recording + feedback)
- **Scenario Types**: TEAM_MEETING, CLIENT_CALL, PRESENTATION, EMAIL_DICTATION, CONFLICT_RESOLUTION, PERFORMANCE_REVIEW, NEGOTIATION
- **Analysis Criteria**: Business English proficiency, communication clarity, professionalism, contextual appropriateness, confidence/fluency
- **Audio Storage**: Replit Object Storage (workplace-scenarios/{userId}/{sessionId}/q{index}.{ext})

## Multi-Language (i18n) System
- **Languages**: Português de Moçambique (pt-MZ, default), English US (en-US), English UK (en-GB)
- **Architecture**: Context-based (LanguageProvider), no URL routing, localStorage persistence
- **Files**: src/i18n/index.ts (translate/getTranslationArray), src/i18n/locales/*.json (dictionaries)
- **Translation Keys**: Hierarchical (common.*, nav.*, onboarding.*, mockInterview.*, audioMock.*, feedback.*, dashboard.*, marketing.*)

## Recent Changes
- 2026-02-25: Major platform refactoring — pivoted from scholarship essay preparation (Chevening/Fulbright) to Business English Job Onboarding Platform
  - New AI Agent & Skills system (orchestrator + 5 specialized skills)
  - New onboarding flow (CV upload, cover letter, job description, AI analysis)
  - Adapted flashcards to job interview Q&A based on career/industry
  - Adapted audio module to workplace scenario simulations
  - Updated database schema (new models: Resume, CoverLetter, JobApplication, ApplicationAnalysis, WorkplaceScenarioSession)
  - Removed all Chevening/Fulbright/scholarship references
  - Updated all navigation, branding, i18n, and marketing content
- 2026-02-25: Initial Replit environment setup — installed Node.js 22, all npm packages, configured workflows
