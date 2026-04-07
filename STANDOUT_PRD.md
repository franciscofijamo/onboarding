# StandOut — Product Requirements Document & Business Proposal

**Version:** 1.0  
**Date:** April 2026  
**Audience:** Investors, Stakeholders, Product & Engineering Teams

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview & Feature Specifications](#2-product-overview--feature-specifications)
   - 2.1 [AI CV Analysis & Optimization](#21-ai-cv-analysis--optimization)
   - 2.2 [Interview Preparation & Mock Interviews](#22-interview-preparation--mock-interviews)
   - 2.3 [Workplace Scenario Simulations](#23-workplace-scenario-simulations)
   - 2.4 [AI Coach / Chat](#24-ai-coach--chat)
   - 2.5 [Credit-Based Monetization System](#25-credit-based-monetization-system)
   - 2.6 [Admin Dashboard](#26-admin-dashboard)
   - 2.7 [Internationalization](#27-internationalization)
3. [Business Analysis](#3-business-analysis)
   - 3.1 [Problem Statement](#31-problem-statement)
   - 3.2 [Target Audience & Personas](#32-target-audience--personas)
   - 3.3 [Competitive Landscape](#33-competitive-landscape)
   - 3.4 [SWOT Analysis](#34-swot-analysis)
   - 3.5 [Key Metrics & KPIs](#35-key-metrics--kpis)
4. [Market & Business Proposal](#4-market--business-proposal)
   - 4.1 [Market Opportunity & TAM/SAM/SOM](#41-market-opportunity--tamsamsom)
   - 4.2 [Revenue Model](#42-revenue-model)
   - 4.3 [Go-to-Market Strategy](#43-go-to-market-strategy)
   - 4.4 [Pricing Strategy](#44-pricing-strategy)
   - 4.5 [Growth Roadmap](#45-growth-roadmap)
   - 4.6 [Risk Analysis & Mitigation](#46-risk-analysis--mitigation)
5. [Technical Architecture Summary](#5-technical-architecture-summary)
6. [Appendix](#6-appendix)
   - 6.1 [Glossary](#61-glossary)
   - 6.2 [Feature Priority Matrix (MoSCoW)](#62-feature-priority-matrix-moscow)

---

## 1. Executive Summary

**StandOut** is an AI-powered career acceleration platform purpose-built for non-native English speakers competing for international and multinational job opportunities. The platform combines AI-driven CV analysis, personalized interview coaching, realistic workplace scenario simulations, and a conversational AI career coach — all delivered in a credit-based subscription model that is accessible, incremental, and deeply relevant to emerging market users.

The core mission of StandOut is straightforward: to close the communication and competitive gap that prevents talented professionals in markets like Mozambique, Angola, Brazil, and the broader Lusophone world from securing the opportunities their skills merit. Language barriers, unfamiliarity with Western interview formats, and lack of access to professional career coaching are not talent deficits — they are information and access deficits. StandOut eliminates those deficits by putting world-class AI coaching in every user's pocket.

StandOut's vision is to become the leading career intelligence platform for the next billion global workforce entrants. In contrast to generic AI tools, StandOut is deeply contextual: it understands the user's industry, English proficiency level, target role, and cultural communication norms, and it tailors every insight accordingly. By building natively for Portuguese-speaking Africa and Latin America, with payment rails that work locally (M-Pesa, Asaas), StandOut is positioned to capture a large and underserved market before global incumbents can adapt.

---

## 2. Product Overview & Feature Specifications

### 2.1 AI CV Analysis & Optimization

**Purpose:** Allow users to upload their CV and a target job description, then receive a detailed AI-generated fit assessment that highlights strengths, gaps, and tailored recommendations.

**Core Capabilities:**

- **Fit Score:** The system computes a numerical match score (0–100) comparing the user's resume against the job description. The score reflects keyword density, skill alignment, seniority match, and sectoral relevance.
- **Skills Gap Analysis:** The AI identifies skills present in the job description that are absent or underrepresented in the CV. Each missing skill is categorized by criticality (required vs. preferred).
- **Keyword Analysis:** An ATS-oriented review that surfaces missing job-description keywords the user should incorporate to pass automated screening filters.
- **Strengths & Improvements:** A structured breakdown of what the CV does well versus what should be rewritten, reordered, or removed.
- **Tailored Recommendations:** Concrete, actionable suggestions specific to the target role and employer — not generic advice.
- **Cover Letter Support:** Users may also upload an existing cover letter for joint analysis against the job description.

**User Flow:**
1. User navigates to the Resume section and uploads a CV (PDF or text).
2. User creates a Job Application record by providing the job title, company name, and full job description text.
3. User triggers an AI analysis. The system deducts credits and calls the AI backend.
4. Results are displayed in a structured dashboard showing fit score, skills match, missing skills, keyword gaps, and recommendations.
5. Users may re-analyze with updated CV content or request a deeper optimization through the AI Coach.

**Credit Cost:** 10 credits per analysis.

**Data Model:** `Resume`, `CoverLetter`, `JobApplication`, `ApplicationAnalysis`.

---

### 2.2 Interview Preparation & Mock Interviews

**Purpose:** Help users prepare for job interviews through AI-generated flashcard decks covering behavioral, technical, situational, culture-fit, and Business English question types.

**Core Capabilities:**

- **AI-Generated Flashcard Decks:** Upon request, the AI generates a personalized deck of interview questions tailored to the user's target role, experience level, and selected category. Each flashcard includes the question, a model answer, related skills, and coaching tips.
- **Interview Categories:**
  - **Behavioral:** Competency-based questions using the STAR model (e.g., "Tell me about a time you resolved a conflict").
  - **Technical:** Domain-specific knowledge and problem-solving questions matched to the user's industry and role.
  - **Situational:** Hypothetical workplace scenarios designed to probe judgment and decision-making.
  - **Culture Fit:** Questions probing alignment with company values, team dynamics, and work style.
  - **Business English:** Communication-focused questions that double as language practice (vocabulary, formal tone, clarity).
- **Study Sessions:** Users study flashcards in sequential or random order. Progress is tracked per deck (studied vs. total cards).
- **Deck Management:** Users can maintain multiple decks for different roles or companies and revisit them at any time.

**User Flow:**
1. User navigates to Interview Prep and selects or creates a deck.
2. User specifies their target job title and desired category.
3. The AI generates 10–20 flashcards (configurable). Credits are deducted.
4. User studies flashcards in an interactive flip-card interface.
5. Progress is saved so users can resume sessions at any time.

**Credit Cost:** 15 credits per AI-generated deck.

**Data Model:** `FlashcardDeck`, `Flashcard`, `StudySession`.

---

### 2.3 Workplace Scenario Simulations

**Purpose:** Immerse users in realistic workplace communication scenarios where they record spoken responses, receive AI transcription, and get detailed communication feedback — building both English fluency and professional confidence.

**Core Capabilities:**

- **Scenario Types:**
  - Team Meeting: Practice participating in or leading a team meeting.
  - Client Call: Simulate a professional client-facing call.
  - Presentation: Practice delivering a structured verbal presentation.
  - Email Dictation: Practice dictating professional emails.
  - Conflict Resolution: Handle a difficult interpersonal workplace situation verbally.
  - Performance Review: Simulate a performance appraisal discussion.
  - Negotiation: Practice salary or contract negotiation dialogue.
- **Audio Recording & Transcription:** The platform records the user's spoken response using the browser microphone API. Audio is uploaded to secure cloud storage and transcribed using AI.
- **Communication Feedback:** After transcription, the AI evaluates the response on dimensions including: clarity, vocabulary appropriateness, grammatical accuracy, professional tone, and STAR model adherence (for behavioral scenarios).
- **Scoring:** Each response receives a score and detailed per-criterion feedback. Session-level average scores are computed.
- **Multi-Question Sessions:** Each session contains multiple prompts, allowing users to simulate a full interaction arc rather than a single question.

**User Flow:**
1. User creates or enters an existing scenario session and selects a scenario type.
2. For each prompt, the user records an audio response.
3. Audio is uploaded and transcribed automatically.
4. AI analyzes the transcript and returns scored feedback.
5. User reviews feedback per response and sees an overall session score.

**Credit Cost:** 15 credits per session (base); additional credits deducted per AI analysis of individual responses.

**Data Model:** `WorkplaceScenarioSession`, `WorkplaceScenarioResponse`.

---

### 2.4 AI Coach / Chat

**Purpose:** Provide users with an always-available conversational AI career coach that intelligently routes each query to the most appropriate specialized skill, ensuring responses are contextually relevant and actionable.

**Core Capabilities:**

**Orchestrator Model:** The AI Coach uses an orchestrator pattern that automatically detects the user's intent based on their message and selects the most relevant specialized skill. Intent detection is keyword-weighted and context-sensitive.

**Specialized Skills:**

| Skill | Focus | Activation Signals |
|---|---|---|
| **Job Hunter** | Finding opportunities, job boards, networking, salary research, target companies | "find job", "job market", "where to apply", "networking" |
| **Application Optimizer** | CV tailoring, cover letter optimization, ATS keywords, fit score explanation | "optimize", "improve my CV", "cover letter", "keywords", "ATS" |
| **Market Fit** | Skills gap analysis, upskilling recommendations, career transitions, market demand | "market fit", "upskill", "career change", "in demand" |
| **Business English** | Grammar, vocabulary, email writing, formal vs. informal register, idioms, pronunciation | "email writing", "grammar", "formal English", "business vocabulary" |
| **Resume Builder** | Structuring, rewriting, and formatting a professional CV from scratch | "build resume", "write CV", "professional summary", "bullet points" |

**Contextual Awareness:** The AI Coach is aware of the user's profile (career path, experience level, English level, target role, industry) and their uploaded resume and job application data. This enables responses that are genuinely personalized rather than generic.

**Language Instruction Layer:** Every skill prompt is prefixed with a language instruction that ensures the AI responds in the user's preferred language (English US/UK or Portuguese Mozambique), maintaining consistent register and tone throughout.

**Credit Cost:** 1 credit per AI text chat message.

---

### 2.5 Credit-Based Monetization System

**Purpose:** Enable granular, fair monetization through a prepaid credit system that allows users to pay only for what they use, while subscription tiers bundle credits at a discount.

**Credit Consumption Table:**

| Feature | Credits per Use |
|---|---|
| AI Text Chat (per message) | 1 |
| CV Analysis | 10 |
| Job Match Analysis | 10 |
| Interview Prep Deck Generation | 15 |
| Scenario Simulation Session | 15 |
| Business English Session | 5 |
| AI Image Generation | 5 |

**System Design:**
- Every user has a `CreditBalance` record tracking their remaining credits.
- Every usage event is logged in `UsageHistory` with operation type, credits used, and timestamp — enabling full audit trails and analytics.
- Credit costs can be reconfigured by platform admins via `AdminSettings` without requiring a code deployment.
- Credit validation occurs server-side before any AI call. If the user has insufficient credits, the request is rejected with a clear error message.
- New users receive 100 free credits on registration to allow platform exploration before purchase.

---

### 2.6 Admin Dashboard

**Purpose:** Give platform administrators a comprehensive management interface to oversee users, credits, subscriptions, storage, and platform configuration.

**Core Capabilities:**

- **User Management:** View all registered users, filter by activity, plan, and registration date. Manually activate or deactivate accounts. View per-user credit balances and usage history.
- **Credit Management:** Manually adjust credit balances for individual users. Override credit consumption per feature through the admin settings interface.
- **Subscription Plan Management:** Create, edit, activate, and deactivate subscription plans. Configure plan names, credit allocations, pricing (monthly and yearly in cents), feature lists, billing source (manual, Asaas), and display settings (badge, highlight, CTA label/URL).
- **Storage Management:** View all user-uploaded files (resumes, audio recordings) with metadata including file size, content type, and upload date. Soft-delete files as needed.
- **Platform Settings:** Configure global feature credit costs through the admin settings singleton model, affecting all users without code changes.
- **Analytics:** Access platform-wide usage metrics, subscription event history, and revenue data through a built-in analytics and charting interface.

**Access Control:** The admin area is protected by Clerk authentication with role-based access checks. Only users with the `admin` role can access admin routes.

---

### 2.7 Internationalization

**Purpose:** Ensure the platform is linguistically and culturally accessible to its target audience across different English-speaking and Portuguese-speaking markets.

**Supported Language Modes:**

- **English (US):** Standard American English for users targeting North American job markets.
- **English (UK):** British English variants for users targeting UK, European, or Commonwealth employers.
- **Portuguese (Mozambique):** Brazilian Portuguese base with Mozambican localization for the primary target market, ensuring that UI labels, coaching language, and AI responses feel natural and relevant to Mozambican users.

**Implementation:**
- Each AI skill prompt is prefixed with a dynamic language instruction that tells the AI model which language variant to use for its response.
- Users select their preferred language from profile settings, and this preference is passed to every AI call throughout the session.
- The language layer is decoupled from feature logic, meaning new language variants can be added without modifying individual skill implementations.

---

## 3. Business Analysis

### 3.1 Problem Statement

In global and multinational job markets, professional English proficiency, familiarity with Western interview conventions, and a well-optimized CV are often the deciding factors between a qualified candidate being selected or overlooked. This creates a structural disadvantage for professionals from Mozambique, Angola, other Lusophone African countries, and Latin America who have strong technical skills but limited access to professional development resources in these areas.

The specific gaps are:

1. **Language Barrier:** Many qualified candidates from non-English-speaking backgrounds produce CVs and communicate in interviews in ways that do not meet the expectations of international hiring managers — not due to lack of competence, but due to unfamiliarity with conventions (formal register, achievement-oriented CV language, STAR storytelling).

2. **Access Gap:** Professional CV writers, interview coaches, and English tutors are expensive and geographically concentrated. In Mozambique, for example, quality career coaching is nearly inaccessible to the majority of the workforce.

3. **Format Unfamiliarity:** ATS (Applicant Tracking Systems) used by multinational employers filter out CVs that lack specific keywords or formatting conventions. Candidates unaware of these systems are eliminated before a human ever sees their application.

4. **Interview Preparation Deficit:** Behavioral interview frameworks such as the STAR model are standard practice at international companies, but are rarely taught in local educational or professional settings.

StandOut directly addresses all four gaps by providing automated, AI-driven, affordable, and locally accessible career development tools.

---

### 3.2 Target Audience & Personas

**Primary Persona — The Ambitious Local Graduate (Mozambique)**
- Age: 22–30
- Education: University degree (engineering, business, IT, health)
- English level: Intermediate to Upper-Intermediate
- Goal: Secure employment at a multinational company operating in Mozambique (mining, NGOs, banking, telecom) or abroad
- Pain points: CV not getting callbacks, unfamiliar with international interview formats, no access to professional coaching
- Willingness to pay: Low-to-moderate; prefers mobile payments via M-Pesa; sensitive to price

**Secondary Persona — The Experienced Professional Seeking Mobility (Lusophone Africa)**
- Age: 30–45
- Education: Degree plus 5–10 years of experience
- English level: Intermediate
- Goal: Transition to a senior role at an international company or relocate to a Portuguese-speaking country with a stronger economy (Portugal, Brazil)
- Pain points: CV is experience-rich but poorly structured; interview performance inconsistent; needs Business English polishing
- Willingness to pay: Moderate; would subscribe to a monthly plan

**Tertiary Persona — The LATAM Remote Job Seeker (Brazil / Latin America)**
- Age: 25–40
- Background: Tech, design, finance, marketing professional
- English level: Intermediate to Advanced
- Goal: Secure a fully remote position at a US or European company
- Pain points: CV not optimized for ATS, needs to sharpen spoken English for video interviews, unsure how to position their experience for foreign employers
- Willingness to pay: Moderate-to-high; comfortable with credit card and digital payments (Asaas/PIX)

**Quaternary Persona — The International Student**
- Age: 18–28
- Location: Studying abroad in Portugal, UK, or another English-speaking country
- Goal: Secure internships or graduate roles in their host country
- Pain points: CV needs to match local standards; interview prep is needed for a competitive market
- Willingness to pay: Low (student budget); highly responsive to free tier and institutional pricing

---

### 3.3 Competitive Landscape

| Competitor | Strengths | Weaknesses | StandOut Differentiation |
|---|---|---|---|
| **Grammarly** | Strong grammar/writing correction, widely adopted | No career-specific features, no CV analysis, no interview prep, not designed for job seekers | StandOut is job-search-native; Grammarly is a writing tool |
| **LinkedIn Premium** | Large professional network, job recommendations, interview prep videos | Expensive ($40–$60/month), requires existing strong English, not personalized to non-native speakers, no AI simulation | StandOut is accessible, affordable, and personalized to language learners in emerging markets |
| **Preply / iTalki** | Real human tutors, flexible scheduling | Expensive per session, not asynchronous, no AI automation, no CV/job application tools | StandOut is 10–20x cheaper per interaction, available 24/7, and job-outcome-focused |
| **ChatGPT (direct)** | Highly capable, free tier available | No career context, no structured features, no credit/subscription management, requires prompting skill | StandOut provides structured, contextual, ready-to-use tools without the user needing to know how to prompt AI |
| **Resume.io / Zety** | Good CV templates and builders | No AI coaching, no interview prep, no simulation, not localized for Africa/LATAM | StandOut covers the full job application lifecycle |

**Key differentiators:** Local payment rails (M-Pesa, Asaas), Portuguese language support with Mozambican localization, offline-friendly credit model, and a platform designed from the ground up for the non-native English speaker in an international job market.

---

### 3.4 SWOT Analysis

**Strengths**
- First-mover advantage in AI career coaching for Lusophone Africa
- Full-stack platform covering CV, interview, simulation, and coaching in one product
- Local payment integration (M-Pesa for Mozambique, Asaas/PIX for Brazil)
- Deeply personalized AI through user profile context and language preferences
- Credit model lowers the entry barrier compared to flat-rate subscriptions
- Lean technical stack enabling rapid iteration (Next.js, Clerk, Vercel, OpenRouter)

**Weaknesses**
- Brand recognition is zero at launch; requires significant marketing investment
- Dependence on third-party AI providers (OpenRouter) introduces cost and reliability risk
- Audio/transcription features require stable internet connectivity, which is inconsistent in the primary target market
- Small founding team limits initial support and content volume
- No mobile native app (web-only at launch); mobile-first users in Mozambique may face friction

**Opportunities**
- Large and growing youth population in sub-Saharan Africa with increasing smartphone penetration
- Rising demand for remote work skills as global companies expand distributed hiring
- University and employer partnerships can provide institutional B2B revenue
- Expansion into French-speaking Africa and Spanish LATAM with moderate localization effort
- Government and NGO-funded digital skills programs looking for platform partners

**Threats**
- OpenAI, Anthropic, or Google launching region-specific career products
- LinkedIn expanding AI features aggressively with their user base advantage
- Local internet infrastructure limitations reducing product usability in key markets
- Currency volatility in Mozambique (MZN) and Brazil (BRL) affecting pricing power
- Data privacy and AI regulation evolving in ways that increase compliance costs

---

### 3.5 Key Metrics & KPIs

**Acquisition**
- Monthly new user registrations
- Cost per acquisition (CPA) by channel
- Organic vs. paid traffic ratio

**Activation**
- Activation rate: % of new users who complete at least one core feature action within 7 days (target: 40%)
- Onboarding completion rate: % of users who complete the career profile setup

**Engagement & Credit Consumption**
- Average credits consumed per user per month (by feature)
- Feature usage distribution (CV analysis vs. chat vs. scenarios vs. interview prep)
- Session depth: average number of flashcards studied or scenario prompts answered per session

**Retention**
- Day-7, Day-30, Day-90 retention rates
- Monthly Active Users (MAU) vs. registered users
- Subscription renewal rate

**Revenue**
- Monthly Recurring Revenue (MRR) from subscriptions
- Average Revenue Per User (ARPU)
- Credit top-up revenue vs. subscription revenue mix
- Churn rate (monthly)

**Quality**
- Net Promoter Score (NPS)
- Average fit score improvement between first and third CV analysis
- User-reported interview outcome tracking (voluntary survey)

---

## 4. Market & Business Proposal

### 4.1 Market Opportunity & TAM/SAM/SOM

**Total Addressable Market (TAM)**

The global online education and career development market was valued at approximately $350 billion in 2024, with AI-driven edtech and career tools representing one of its fastest-growing segments. Within this, the English language learning market alone is estimated at $60 billion annually, and professional skills/career coaching adds another $15–20 billion. The addressable population of non-native English speakers actively seeking to use English professionally exceeds 1.5 billion people.

**Serviceable Addressable Market (SAM)**

Narrowing to Lusophone Africa (Mozambique, Angola, Cape Verde, São Tomé) and Portuguese-speaking Latin America (Brazil primarily), plus the international student diaspora from these regions:

- **Mozambique:** ~2 million university-educated or university-enrolled adults; ~500,000 actively employed in formal sector roles with international exposure potential.
- **Angola:** ~1.5 million formal sector workers; significant oil & gas sector with international employers.
- **Brazil:** ~50 million professionals with intermediate English who are pursuing international remote jobs or companies.
- **International students from Lusophone countries:** ~150,000 studying in Europe and North America.

**Estimated SAM:** 10–15 million professionals across primary geographies who have a meaningful need for StandOut's core value proposition.

**Serviceable Obtainable Market (SOM)**

In Year 1, targeting primarily Mozambique and Brazilian tech/remote-work audiences through digital marketing and university partnerships:

- **Target:** 5,000 paying users by end of Year 1
- **Average ARPU:** $8/month (blended across free credits, credit packs, and subscriptions)
- **Year 1 Revenue Target:** $480,000 ARR

By Year 3, with expanded LATAM presence and B2B partnerships:
- **Target:** 50,000 paying users
- **Year 3 Revenue Target:** $5M ARR

---

### 4.2 Revenue Model

StandOut operates a hybrid revenue model combining subscriptions with credit-based consumption, giving users flexibility while encouraging recurring revenue.

**Tier 1 — Free / Starter**
- 100 free credits on signup (no credit card required)
- Sufficient to try all major features at least once
- No recurring charge; designed to demonstrate value before conversion

**Tier 2 — Credit Packs (Pay-as-you-go)**
- Users purchase one-time credit bundles
- Example packs: 100 credits (~$3), 300 credits (~$8), 1,000 credits (~$22)
- Suitable for irregular users and students on tight budgets
- Purchasable via M-Pesa, PIX (Asaas), or card

**Tier 3 — Monthly Subscription Plans**
- Bundled credit allocation at a discount vs. pay-as-you-go
- Plans configured by admin with flexible credit allocation and pricing
- Example tiers:
  - Basic: 500 credits/month (~$9.99/month)
  - Professional: 1,500 credits/month (~$24.99/month)
  - Premium: Unlimited or very high-cap credits + priority AI access (~$49.99/month)
- Annual billing option available at ~20% discount

**Tier 4 — Enterprise / B2B**
- Custom plans for universities, HR firms, NGOs, and language schools
- Bulk credit allocation with team management and reporting dashboards
- Custom pricing and invoicing; quota-based access for students/employees
- Negotiated contracts; not self-serve

**Revenue diversification:** The credit model creates natural upsell moments every time a user encounters a credit gate. The conversion funnel from free to paid is therefore embedded directly in the product experience.

---

### 4.3 Go-to-Market Strategy

**Phase 1 — Mozambique Launch (Months 1–6)**

The go-to-market strategy begins with a concentrated launch in Mozambique, where the founder network, local context knowledge, and M-Pesa payment integration give StandOut a structural advantage.

- **University Partnerships:** Partner with Eduardo Mondlane University, Universidade Politécnica, and other key institutions in Maputo. Offer free institutional access or heavily subsidized plans for students. Universities gain a career development tool; StandOut gains a captive early-adopter base.
- **LinkedIn Presence:** Build an organic content strategy on LinkedIn targeting Mozambican and Lusophone African professionals with career tips, CV advice, and English communication guidance. Establish the StandOut brand as the go-to career resource for this audience.
- **HR Firm Partnerships:** Engage Mozambique-based HR and recruitment firms to recommend StandOut to candidates as part of their placement process. This creates a B2B referral channel.
- **Language Schools:** Partner with Business English language schools in Maputo to offer StandOut as a digital complement to their classroom instruction.

**Phase 2 — Brazil / LATAM Expansion (Months 6–18)**

- **Remote Work Communities:** Target Brazilian LinkedIn groups, Reddit communities (r/brdev, r/trabalho_remoto), Discord servers, and YouTube channels focused on securing remote jobs at international companies.
- **Content Marketing:** Publish guides in Portuguese on CV writing for international employers, Business English for tech workers, and interview prep for global remote roles.
- **Paid Acquisition:** Run targeted LinkedIn and Instagram ads aimed at Brazilian tech professionals aged 25–40 with English proficiency interest signals.

**Phase 3 — International Student & Diaspora (Months 12–24)**

- Target Mozambican and Lusophone African student associations in Portugal, UK, and the Netherlands via social media and partnership events.
- Partner with African diaspora professional networks in Europe.

---

### 4.4 Pricing Strategy

Pricing is calibrated to the purchasing power and payment preferences of each core market.

**Mozambique (MZN / M-Pesa)**
- Credit packs priced at MZN 150–750 (~$2.50–$12.50 USD)
- Monthly plans: MZN 500–2,500 (~$8–$40 USD)
- M-Pesa is the primary payment rail; Asaas integration enables card processing for expatriates

**Brazil (BRL / PIX)**
- Credit packs: BRL 15–110 (~$3–$22 USD)
- Monthly plans: BRL 50–250 (~$10–$50 USD)
- PIX via Asaas for instant, low-cost local payments; card payments also supported

**International / USD Pricing**
- Credit packs: $3–$25
- Monthly plans: $9.99–$49.99

**Key pricing principles:**
- No feature is paywalled permanently — all features are accessible on the free tier using starter credits, removing the first-use barrier.
- Credit costs per feature are admin-configurable, allowing rapid price adjustments without code deployments.
- Annual subscriptions are discounted ~20% to improve cash flow predictability.
- Enterprise pricing is custom and negotiated; no public rack rate.

---

### 4.5 Growth Roadmap

**6-Month Milestones**
- Platform fully launched and stable with all core features live
- 500 registered users in Mozambique; 100 paying users
- 2 university partnerships signed
- M-Pesa and Asaas payment flows tested and live
- NPS baseline established (target: >40)
- Admin analytics dashboard operational

**12-Month Milestones**
- 5,000 registered users total; 1,000 paying users
- MRR of $8,000–$12,000
- Brazil soft launch complete; 500 Brazilian registered users
- First B2B / institutional deal closed
- Mobile-responsive experience fully optimized; PWA capabilities added
- Feature: AI-generated cover letter drafting (new capability)

**24-Month Milestones**
- 25,000 registered users; 5,000+ paying users
- MRR of $40,000–$60,000 (targeting $500K ARR)
- Localization expanded to French (for Francophone Africa) and Spanish (LATAM)
- Native iOS and Android apps launched
- Enterprise dashboard with team management and reporting
- Integration with job boards (LinkedIn, Indeed) for direct application tracking
- Series A fundraising initiated

---

### 4.6 Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI cost inflation (OpenRouter / model pricing increases) | Medium | High | Implement model-level cost tracking; abstract provider layer to swap models; negotiate volume pricing |
| Internet connectivity issues in Mozambique affecting audio features | High | Medium | Graceful degradation (text fallback for scenarios); offline flashcard study mode; CDN optimization |
| Low willingness to pay in primary market | Medium | High | Free credit tier to demonstrate value; M-Pesa micro-payment support; B2B/institutional revenue as backstop |
| Competitor entry by large platform (LinkedIn, Google) | Low-Medium | High | Build community and loyalty early; invest in local partnerships and brand; deepen Lusophone-specific features that global platforms won't prioritize |
| Regulatory risk (AI content, data privacy) | Low | Medium | GDPR-adjacent data practices from day one; explicit consent flows; Clerk-managed authentication reduces data exposure |
| Key team dependency | Medium | High | Document all systems thoroughly; cross-train early hires; build on managed platforms (Vercel, Clerk, OpenRouter) to reduce operational fragility |
| Currency/exchange rate volatility | Medium | Medium | Price in local currencies using Asaas and M-Pesa; hedge USD costs by diversifying to USD-paying LATAM customers |

---

## 5. Technical Architecture Summary

StandOut is built on a modern, serverless-first technology stack chosen for its developer velocity, reliability at scale, and suitability for the product's AI-intensive workloads.

**Frontend — Next.js (App Router)**
Next.js provides the application framework, combining server-side rendering for performance and SEO with React-based client components for interactive AI-driven interfaces. The App Router enables fine-grained routing for protected user areas, public marketing pages, and the admin dashboard — all within a single unified codebase. This choice was made for its maturity, Vercel deployment integration, and its strong community ecosystem.

**Authentication — Clerk**
Clerk handles all user authentication including sign-up, sign-in, social OAuth, session management, and role-based access control. This decision eliminates the need to build and maintain a custom auth system, which is both high-risk and time-consuming. Clerk's webhook system also enables real-time user sync between Clerk's identity store and the platform's own PostgreSQL database.

**Database — PostgreSQL via Prisma**
PostgreSQL is the primary data store, accessed through Prisma ORM. Prisma provides type-safe database access, schema migrations, and a developer-friendly query API. The schema covers users, credits, resumes, job applications, flashcards, scenario sessions, subscriptions, and admin settings. PostgreSQL's reliability, ACID compliance, and rich JSON support make it suitable for the platform's diverse data types.

**AI — OpenRouter**
All AI capabilities (CV analysis, chat coaching, flashcard generation, scenario feedback) are routed through OpenRouter, which provides a unified API gateway to multiple frontier AI models (GPT-4, Claude, Gemini, and others). OpenRouter's provider abstraction means StandOut can switch underlying models based on cost, capability, or reliability without application-level changes. The Vercel AI SDK is used for streaming AI responses to the frontend.

**Payments — Asaas & M-Pesa**
Asaas is a Brazilian fintech platform supporting PIX, boleto, and card payments — covering the Brazilian market and internationally-served Portuguese-speaking users. M-Pesa integration covers Mozambique's dominant mobile money platform. Supporting both payment rails is a key competitive differentiator in the primary markets.

**File Storage — Vercel Blob / Replit Object Storage**
User-uploaded files (CV documents, audio recordings from scenario sessions) are stored in cloud object storage. Vercel Blob provides low-latency access from the Vercel-hosted application. Replit Object Storage is available as a development and fallback option.

**Hosting & Infrastructure — Vercel**
The platform is deployed on Vercel, which provides automatic scaling, global CDN distribution, preview deployments for every pull request, and native Next.js optimization. Vercel's serverless architecture means StandOut has no fixed server infrastructure to manage, reducing operational overhead significantly.

**Key Design Principles:**
- **Serverless by default:** No long-running servers; all API routes are stateless serverless functions.
- **AI abstraction layer:** The agent/skill system separates business logic from AI provider details, enabling model swaps without feature rework.
- **Credit guard at the edge:** Credit validation occurs server-side on every AI API call, preventing unauthorized consumption.
- **Admin configurability:** Feature credit costs and subscription plans are database-driven, not hardcoded, enabling business-level adjustments without engineering involvement.

---

## 6. Appendix

### 6.1 Glossary

| Term | Definition |
|---|---|
| **STAR Model** | A structured interview response framework: **S**ituation (describe the context), **T**ask (describe the responsibility), **A**ction (describe what you did), **R**esult (describe the outcome). Used in behavioral interview preparation to structure clear, compelling answers. |
| **Fit Score** | A numerical score (0–100) computed by the AI that represents how well a candidate's CV matches a specific job description. Takes into account keyword overlap, skill alignment, experience level, and role relevance. |
| **Business English** | A specialized register of English used in professional and corporate environments. Characterized by formal vocabulary, precise communication, professional email conventions, and meeting/presentation etiquette. Distinct from general conversational English. |
| **ATS (Applicant Tracking System)** | Software used by employers to automatically screen and rank incoming CVs based on keyword matching and formatting criteria. CVs that do not pass ATS filters may never be seen by a human recruiter. |
| **OpenRouter** | A unified AI API gateway that provides access to multiple large language models from different providers (OpenAI, Anthropic, Google, etc.) through a single API endpoint. |
| **Clerk** | A managed authentication and user management service that provides sign-in flows, session handling, and role-based access control as a hosted service. |
| **Prisma** | A Node.js and TypeScript ORM (Object-Relational Mapper) that provides type-safe database access and schema migration tooling for PostgreSQL and other databases. |
| **Asaas** | A Brazilian payment processing platform supporting PIX (instant bank transfer), boleto bancário, and card payments. Used by StandOut for Brazilian and Lusophone market payments. |
| **M-Pesa** | A mobile money platform widely used in Mozambique and East Africa, allowing users to send, receive, and pay using their mobile phone without a bank account. |
| **MoSCoW** | A prioritization framework categorizing requirements as **M**ust Have, **S**hould Have, **C**ould Have, and **W**on't Have (for now). |
| **TAM / SAM / SOM** | Market sizing framework: **T**otal Addressable Market (the full global opportunity), **S**erviceable Addressable Market (the portion reachable with the current model), **S**erviceable Obtainable Market (the realistic near-term capture). |
| **NPS (Net Promoter Score)** | A customer loyalty metric derived from asking users how likely they are to recommend the product to others, on a 0–10 scale. Scores above 50 are considered excellent. |
| **PIX** | Brazil's instant payment system operated by the Central Bank of Brazil, enabling real-time transfers 24/7. Widely used for e-commerce and digital services in Brazil. |
| **PWA (Progressive Web App)** | A web application that uses modern browser capabilities to deliver an app-like experience including offline support, home screen installation, and push notifications. |
| **ARPU (Average Revenue Per User)** | Total revenue divided by number of active users in a given period. A key metric for assessing monetization efficiency. |
| **MRR (Monthly Recurring Revenue)** | The predictable monthly revenue from active subscriptions. A primary financial health metric for subscription businesses. |

---

### 6.2 Feature Priority Matrix (MoSCoW)

#### Must Have (Core — MVP and current release)

| Feature | Rationale |
|---|---|
| AI CV Analysis & Fit Score | Core value proposition; drives initial activation |
| Flashcard Deck Generation (Interview Prep) | High user demand; key differentiator vs. generic AI |
| AI Coach Chat with Skill Routing | Personalized coaching; drives daily engagement and credit consumption |
| Workplace Scenario Simulations (audio + feedback) | Unique competitive feature; essential for Business English users |
| Credit Balance & Usage Tracking | Required for all monetization; safety gate for AI costs |
| Subscription Plan Management (Admin) | Required to generate revenue; admin-configurable without code changes |
| User Authentication (Clerk) | Foundation for all user-specific features |
| Admin Dashboard (user, credit, storage management) | Required for business operations from day one |
| M-Pesa Payment Integration | Required for Mozambique market viability |
| Asaas Payment Integration | Required for Brazil market viability |
| Portuguese (Mozambique) Localization | Core to target market accessibility |

#### Should Have (Planned near-term)

| Feature | Rationale |
|---|---|
| AI Cover Letter Generation | High user value; natural extension of CV analysis workflow |
| Job Application Status Tracking | Closes the loop on the application lifecycle |
| PWA / Home Screen Installation | Improves mobile experience in smartphone-first markets |
| Enhanced Analytics Dashboard | Needed for marketing and product decisions post-launch |
| Email Notifications (credit warnings, session summaries) | Drives retention and re-engagement |

#### Could Have (Future enhancements)

| Feature | Rationale |
|---|---|
| Native iOS / Android App | Improves experience but web-first strategy is viable at scale |
| Video Interview Practice | Adds a new simulation modality; technically complex |
| LinkedIn Job Board Integration | Allows direct import of job descriptions; requires API partnership |
| Peer Review / Community Features | Social features increase engagement but add moderation complexity |
| French / Spanish Localization | Opens new markets but requires content investment |
| AI-Generated Interview Audio (voice TTS feedback) | Premium feature for immersive simulation; high implementation cost |

#### Won't Have (Out of scope for current roadmap)

| Feature | Rationale |
|---|---|
| Real Human Tutors / Live Coaching | Conflicts with AI-first, scalable model; high marginal cost |
| Job Board / Marketplace (employer side) | Requires two-sided network; outside current scope |
| Payroll / HR Management Tools | Completely outside product scope |
| Fully Offline Mode | Requires significant PWA and caching investment; deprioritized |

---

*Document prepared by the StandOut product team. For questions or feedback, contact the founding team through official channels.*
