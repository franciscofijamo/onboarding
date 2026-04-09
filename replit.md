# StandOut

## Overview
StandOut — B2B Recruitment Platform (pivoted from B2C career preparation). Connects companies (recruiters) with candidates using AI-powered scoring, interview scenario generation, and pipeline management. Built with Next.js 16, Clerk auth, Prisma/PostgreSQL, Tailwind CSS v4, Radix UI, and React Query.

**Dual Role System**: Users are either CANDIDATE (job seekers, existing tools preserved) or RECRUITER (companies, new B2B features).

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
    (protected)/   - Auth-required pages (dashboard, onboarding, interview-prep, scenarios, ai-chat, billing, role-select, company/*)
    (protected)/recruiter/ - Recruiter-only pages (postings)
    (protected)/company/   - Company profile management (onboarding, profile)
    (protected)/role-select/ - New user role selection page
    (public)/      - Public pages (landing, sign-in, sign-up)
    admin/         - Admin dashboard pages
    api/           - API routes (resume, job-application, mock-interview, scenarios, ai, admin, webhooks, role, company)
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

## Language & i18n System
- **Primary Language**: English (US default, UK option via switcher)
- **Portuguese Hints**: Small pt-MZ guide text shown below key navigation items and UI elements to help Mozambican users navigate
- **No standalone Portuguese mode**: Portuguese was removed as a full language option; only English is available as the interface language
- **Architecture**: Context-based (LanguageProvider), localStorage persistence, `hint()` function returns pt-MZ translations for guide text
- **Files**: src/i18n/index.ts (translate/getHint), src/i18n/locales/*.json (en-US primary, en-GB alternate, pt-MZ for hints only)
- **AI Responses**: Always in English (US or UK based on user selection); default fallback is en-US
- **Translation Keys**: Hierarchical (common.*, nav.*, onboarding.*, mockInterview.*, audioMock.*, scenarios.*, feedback.*, dashboard.*, marketing.*)

## Recent Changes
- 2026-04-09: B2B pivot — F6: AI Interview Sessions (Recruiter)
  - New Prisma models: `RecruitmentInterviewStage`, `RecruitmentInterviewQuestion`, `InAppNotification`
  - Added `recruitmentStageId` FK to `WorkplaceScenarioSession`
  - New API routes:
    - `GET/POST /api/recruiter/postings/[id]/stages` — list/create interview stages
    - `POST /api/recruiter/postings/[id]/stages/[stageId]/generate` — AI question generation (OpenRouter)
    - `PUT /api/recruiter/stages/[stageId]/questions/[questionId]` — edit individual question
    - `DELETE /api/recruiter/stages/[stageId]/questions/[questionId]` — delete question
    - `POST /api/recruiter/stages/[stageId]/publish` — publish stage (DRAFT → PUBLISHED)
    - `GET /api/recruiter/postings/[id]/candidates/[userId]/sessions` — view candidate's interview sessions
    - `GET /api/notifications` — in-app notifications list with unread count
    - `POST /api/notifications/[id]/read` — mark notification as read
  - Pipeline GET extended: returns `interviewStages` + published stages as virtual columns in `stages` array
  - Pipeline move (PATCH /pipeline/[entryId]/move): accepts `recruitmentStageId`; auto-creates `WorkplaceScenarioSession` + `InAppNotification` when candidate moved to a published interview stage
  - Recruiter kanban UI fully rewritten: "Fase de entrevista" modal (configure → AI generate → edit questions → publish), interview stage columns with purple theme, "Respostas" button to view candidate session scores/transcripts
  - `NotificationBell` component added to topbar — polls every 30s, unread count badge, popover list, click-to-navigate
  - Candidate `/scenarios` page: recruiter-assigned sessions shown with purple "Entrevista da empresa" badge + company/job info
  - Migration file: `prisma/migrations/20260409200000_add_interview_stages_and_notifications/`
  - **Engineering note — unique index strategy**: `WorkplaceScenarioSession` uses a partial unique index (`WHERE recruitmentStageId IS NOT NULL`) instead of a plain `@@unique` so that self-practice sessions (`recruitmentStageId = NULL`) remain unrestricted. The Prisma schema declares `@@unique([userId, recruitmentStageId])` which Prisma uses for type-level awareness; the SQL migration overrides the generated index with the partial variant. Future Prisma-generated migrations must preserve the `WHERE IS NOT NULL` condition on this index.
  - **Engineering note — re-entry notification behavior**: A candidate receives an `INTERVIEW_STAGE_ASSIGNED` notification only on first session creation for a given stage (`shouldCreateSession = !existingSession`). If a recruiter moves the candidate out and back into the same interview stage, no duplicate session or notification is created — the existing session is reused. This is intentional: one session per candidate per stage.
- 2026-04-09: B2B pivot — F3: Public job board (Bolsa de Vagas)
  - `/jobs` and `/jobs/[id]` moved to `(public)` route group — accessible without authentication
  - Middleware updated to mark `/jobs(.*)` and `/api/jobs(.*)` as public routes
  - `GET /api/jobs` updated with `?q=` text search (title/company), `?salary=` alias for salaryRange
  - `GET /api/jobs/[id]` — new public endpoint returning PUBLISHED posting with company info
  - Public jobs listing page: search bar, filter panel (category/type/salary), 3-column grid, skeleton loading
  - Public job detail page: rich text description, company info block, Apply button with auth-aware logic
    - Unauthenticated → redirects to `/sign-up?redirect_url=/jobs/[id]`
    - Candidate → routes to `/applications/new?postingId=[id]` (F4 will build this)
    - Recruiter → disabled button with "Recrutadores não podem candidatar-se" message
  - `PublicHeader` enhanced with "Vagas" nav link (all users), sign-in/sign-up buttons, mobile hamburger menu
  - `useProfile` hook updated to accept optional `enabled` parameter (prevents 401 calls for unauthenticated users)
  - Removed old `(protected)/jobs/page.tsx` placeholder
- 2026-04-09: B2B pivot — F2: Job posting creation & management (Kanban + Wizard + Rich text editor)
  - Added `JobPosting` Prisma model with 4 new enums (JobPostingStatus, JobPostingCategory, SalaryRange, JobType)
  - API routes: `GET/POST /api/recruiter/postings`, `GET/PUT/DELETE /api/recruiter/postings/[id]`
  - Kanban board at `/recruiter/postings` with 4 columns (Rascunho/Publicada/Pausada/Encerrada)
  - 2-step posting wizard at `/recruiter/postings/new`
  - Edit page at `/recruiter/postings/[id]/edit`
  - `RichTextEditor` + `RichTextViewer` Tiptap components in `src/components/editor/`
  - Installed: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tailwindcss/typography`
  - Tiptap styles + placeholder CSS added to `globals.css`
- 2026-04-09: B2B pivot — F1: Dual role system + Company profile
  - Added `UserRole` enum (CANDIDATE | RECRUITER) and `role` field to `User` model
  - Added `Company` model (1:1 with User) for recruiter company profiles
  - New pages: `/role-select` (first-visit role selector), `/company/onboarding`, `/company/profile`
  - New API routes: `GET/PUT /api/role`, `GET/PUT /api/company/profile`
  - Profile API (`/api/profile`) now returns `role` field
  - `useProfile` hook extended with `role` and `hasRole`
  - Sidebar and Topbar now show role-based navigation (candidate vs recruiter items)
  - Protected layout redirects to `/role-select` if role is not set
  - Dashboard shows recruiter-specific content for RECRUITER role
  - Placeholder page at `/recruiter/postings` (F2 task)
- 2026-02-25: Major platform refactoring — pivoted from scholarship essay preparation (Chevening/Fulbright) to Business English Job Onboarding Platform
  - New AI Agent & Skills system (orchestrator + 5 specialized skills)
  - New onboarding flow (CV upload, cover letter, job description, AI analysis)
  - Adapted flashcards to job interview Q&A based on career/industry
  - Adapted audio module to workplace scenario simulations
  - Updated database schema (new models: Resume, CoverLetter, JobApplication, ApplicationAnalysis, WorkplaceScenarioSession)
  - Removed all Chevening/Fulbright/scholarship references
  - Updated all navigation, branding, i18n, and marketing content
- 2026-02-25: Initial Replit environment setup — installed Node.js 22, all npm packages, configured workflows
