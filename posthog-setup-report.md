<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Standout Next.js App Router project. Here is a summary of all changes made:

- **`instrumentation-client.ts`** (new): Initializes PostHog client-side using the Next.js 15.3+ `instrumentation-client` pattern, with EU host, reverse proxy, exception capturing, and debug mode in development.
- **`next.config.ts`**: Added `/ingest` reverse proxy rewrites routing through `eu.i.posthog.com` and `eu-assets.i.posthog.com`, plus `skipTrailingSlashRedirect: true`.
- **`src/lib/posthog-server.ts`** (new): Singleton server-side PostHog Node.js client used across all API routes.
- **`src/app/(protected)/layout.tsx`**: Added `posthog.identify()` call whenever an authenticated user loads the app, linking Clerk's `userId` with email and full name.
- **`src/app/api/webhooks/clerk/route.ts`**: Captures `user_signed_up` server-side on Clerk `user.created` webhook, including user email, name, and free credits. Also calls `posthog.identify()` server-side to set user properties.
- **`src/app/api/webhooks/asaas/route.ts`**: Captures `subscription_payment_confirmed` server-side when Asaas sends `PAYMENT_RECEIVED` or `PAYMENT_CONFIRMED`, including plan name, credits granted, and payment value.
- **`src/app/api/subscription/cancel/route.ts`**: Captures `subscription_cancelled` server-side on successful cancellation for both M-Pesa and Asaas providers.
- **`src/app/api/job-application/route.ts`**: Captures `job_application_created` server-side for all new job applications (public job board and manual), including job title, company, and whether analysis was triggered.
- **`src/app/(protected)/scenarios/[sessionId]/page.tsx`**: Captures `scenario_response_analyzed` client-side after successful audio upload + AI analysis, with session ID, question index, and duration.
- **`src/app/(protected)/billing/page.tsx`**: Captures `billing_page_viewed` on mount and `credit_purchase_initiated` when the user clicks "Buy Now" on the M-Pesa credits modal.
- **`src/app/(protected)/interview-prep/study/[deckId]/page.tsx`**: Captures `flashcard_studied` client-side each time a new card is flipped for the first time, with card category and deck ID.
- **`src/app/(protected)/onboarding/page.tsx`**: Captures `onboarding_analysis_submitted` client-side when a candidate submits their job description for AI analysis during onboarding.
- **`src/app/subscribe/page.tsx`**: Captures `subscribe_page_viewed` client-side on mount.

## LLM analytics integration

PostHog LLM analytics has been added using the Vercel AI SDK + OpenTelemetry approach. Every `generateText` and `streamText` call in the project now emits `$ai_generation` events automatically, capturing model name, token counts, latency, and cost.

**New files:**
- **`instrumentation.ts`** (new): Server-side Next.js instrumentation hook. Starts the OpenTelemetry SDK with `PostHogSpanProcessor` so all AI SDK calls export `gen_ai.*` spans to PostHog's OTLP endpoint.

**Modified files (telemetry added):**
- **`src/app/api/ai/chat/route.ts`**: `streamText` call — `functionId: 'ai-chat'`, linked to authenticated Clerk user.
- **`src/app/api/scenarios/sessions/[id]/responses/[questionIndex]/analyze/route.ts`**: `generateText` call for scenario audio analysis — `functionId: 'scenario-analysis'`, linked to authenticated user.
- **`src/lib/job-application/analyze.ts`**: `generateText` call for CV/job description analysis — `functionId: 'job-application-analysis'`, linked to authenticated user.
- **`src/app/api/guest/analyze/route.ts`**: `generateText` call for unauthenticated guest analysis — `functionId: 'guest-analysis'`, anonymous (no distinct ID).
- **`src/app/api/mock-interview/decks/route.ts`**: `generateText` call for flashcard deck generation — `functionId: 'mock-interview-deck-generation'`, linked to authenticated user.

LLM generations are visible in PostHog under [LLM Analytics → Generations](https://eu.posthog.com/project/125552/llm-analytics/generations).

| Event | Description | File |
|---|---|---|
| `user_signed_up` | New user account created via Clerk webhook | `src/app/api/webhooks/clerk/route.ts` |
| `job_application_created` | Candidate submitted a new job application | `src/app/api/job-application/route.ts` |
| `scenario_response_analyzed` | Candidate submitted audio and received AI feedback | `src/app/(protected)/scenarios/[sessionId]/page.tsx` |
| `subscription_payment_confirmed` | Payment confirmed via Asaas webhook | `src/app/api/webhooks/asaas/route.ts` |
| `subscription_cancelled` | User cancelled their subscription | `src/app/api/subscription/cancel/route.ts` |
| `credit_purchase_initiated` | User clicked Buy Now on the billing page | `src/app/(protected)/billing/page.tsx` |
| `flashcard_studied` | Candidate flipped a flashcard in interview prep | `src/app/(protected)/interview-prep/study/[deckId]/page.tsx` |
| `onboarding_analysis_submitted` | Candidate submitted for AI analysis during onboarding | `src/app/(protected)/onboarding/page.tsx` |
| `subscribe_page_viewed` | User visited the subscription/plans page | `src/app/subscribe/page.tsx` |
| `billing_page_viewed` | Authenticated user opened the billing page | `src/app/(protected)/billing/page.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/125552/dashboard/645796
- **Signup to Payment Conversion Funnel**: https://eu.posthog.com/project/125552/insights/w1u53fIX
- **New Signups (Daily)**: https://eu.posthog.com/project/125552/insights/ILWTNem2
- **Revenue Events: Payments vs Cancellations**: https://eu.posthog.com/project/125552/insights/RUEY8j8Z
- **Feature Engagement: AI Scenarios & Flashcards**: https://eu.posthog.com/project/125552/insights/9aQCuIsg
- **Job Applications Created (Weekly)**: https://eu.posthog.com/project/125552/insights/YzmNZrvO

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
