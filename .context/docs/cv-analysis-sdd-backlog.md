# CV Analysis Module - SDD Backlog and Jira/Linear Template

## Scope
This backlog covers the CV analysis flow per job application:
- Resume step (upload new CV or select existing CV)
- Cover letter step
- Job description step (including future URL crawler entry)
- AI analysis step
- Multi-application workflow per user

## Prioritization Rule
- `P2` = lower criticality
- `P1` = medium criticality
- `P0` = highest criticality

## Import Template (Jira/Linear Ready)
Use the table below to copy into Jira/Linear.  
Suggested labels: `cv-analysis`, `sdd`, `onboarding`, `job-application`.

| Key | Title | Type | Priority | Estimate | Owner | Labels | Dependencies | Description | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CVA-101 | Job Applications List with Status and Progress | Story | P2 | 3 pts | TBD | cv-analysis, ui | - | Add list view with job title, company, status, updated date, and continue action. | 1. List shows `jobTitle`, `companyName`, `status`, `updatedAt`. 2. Includes `New Application` and `Continue` actions. 3. Ordered by `updatedAt desc`. |
| CVA-102 | Persistent Stepper per Application | Story | P2 | 3 pts | TBD | cv-analysis, ui | CVA-101 | Keep step completion and active step state tied to application id. | 1. Step completion persists after reload. 2. Reopening an application restores previous state. 3. Navigation between steps does not lose saved data. |
| CVA-103 | Application Detail with Latest Analysis and History | Story | P2 | 3 pts | TBD | cv-analysis, ui, api | CVA-202 | Add detail screen with step data, latest analysis, and compact analysis history. | 1. Shows resume/cover letter/job description data. 2. Shows latest analysis summary and fit score. 3. Shows list of prior analyses by date. |
| CVA-201 | Incremental Save Endpoint for Job Application | Story | P2 | 5 pts | TBD | cv-analysis, api | - | Implement `PATCH /api/job-application/:id` for step-by-step updates. | 1. Updates only fields sent in payload. 2. Validates ownership by `userId`. 3. Returns updated application. |
| CVA-202 | Analysis Versioning (Append-Only) | Story | P1 | 5 pts | TBD | cv-analysis, api, database | CVA-201 | Ensure each re-run creates a new `ApplicationAnalysis` row, never overwriting previous data. | 1. Reanalysis creates new row. 2. API returns `latestAnalysis` and `allAnalyses`. 3. Existing data is preserved. |
| CVA-203 | Query and Index Optimization for Application Flows | Story | P1 | 2 pts | TBD | cv-analysis, database | CVA-202 | Optimize read paths for list/detail/history. | 1. Index coverage for `jobApplicationId, createdAt`. 2. No N+1 query regressions. 3. Baseline performance validated for list/detail. |
| CVA-301 | New Application Wizard Bootstrapping | Story | P1 | 5 pts | TBD | cv-analysis, ui, api | CVA-201 | Create application in `DRAFT` at start and route by `jobApplicationId`. | 1. `New Application` creates draft record. 2. Route includes application id. 3. Editing one application does not change others. |
| CVA-302 | Resume Step: Upload New or Select Existing | Story | P1 | 8 pts | TBD | cv-analysis, ui, upload, api | CVA-301 | Allow choosing an existing resume or uploading a new one and linking it to the application. | 1. User can select existing resume. 2. User can upload file and persist metadata. 3. Selected/uploaded resume links to current application. |
| CVA-303 | Cover Letter per Application (Optional) | Story | P1 | 3 pts | TBD | cv-analysis, ui, api | CVA-301 | Support optional cover letter linking/creation per application context. | 1. Step can be skipped. 2. Existing or new cover letter can be linked. 3. Relation is saved to current application only. |
| CVA-401 | Dedicated Analyze Endpoint by Application ID | Story | P0 | 8 pts | TBD | cv-analysis, api, ai | CVA-201 | Add `POST /api/job-application/:id/analyze` with explicit precondition validation and lifecycle updates. | 1. Validates ownership and preconditions. 2. Runs status `DRAFT -> ANALYZING -> ANALYZED`. 3. Returns latest analysis payload. |
| CVA-402 | Idempotency for Analysis Trigger | Story | P0 | 8 pts | TBD | cv-analysis, api, reliability | CVA-401 | Prevent duplicate analysis and double charging on repeated requests. | 1. Duplicate request with same payload does not create duplicate analysis. 2. Only one active run per application/payload hash. 3. Caller receives active/completed run response consistently. |
| CVA-403 | Transaction-Safe Credit Deduction | Story | P0 | 8 pts | TBD | cv-analysis, credits, api | CVA-401, CVA-402 | Ensure credit deduction is atomic with valid analysis attempt semantics. | 1. Exactly one deduction per valid analysis execution. 2. Failed execution does not leave inconsistent charging state. 3. Usage log includes `jobApplicationId`. |
| CVA-404 | Robust Failure Handling and Recovery | Story | P0 | 5 pts | TBD | cv-analysis, reliability, api | CVA-401 | Improve retry behavior and prevent stuck states. | 1. AI/provider failure restores status from `ANALYZING` to `DRAFT`. 2. Error message is retry-friendly. 3. Structured logs allow debugging by application id. |
| CVA-501 | Unit Tests for Status, Idempotency, Credits | Task | P0 | 5 pts | TBD | cv-analysis, tests | CVA-401, CVA-402, CVA-403 | Add unit tests for critical business rules. | 1. Status transition rules covered. 2. Idempotency behavior covered. 3. Credit logic covered. |
| CVA-502 | Integration Tests for API Ownership and Versioning | Task | P0 | 5 pts | TBD | cv-analysis, tests, api | CVA-201, CVA-202, CVA-401 | Add integration tests for incremental save, ownership, and analysis history. | 1. Cross-user access blocked. 2. Incremental save works. 3. History and latest analysis retrieval verified. |
| CVA-503 | E2E Multi-Application Journey | Task | P1 | 8 pts | TBD | cv-analysis, tests, e2e | CVA-301, CVA-302, CVA-401 | Validate full journey with 2+ applications in parallel. | 1. Create two applications and switch safely. 2. Analyze one without contaminating another. 3. Reanalysis updates history correctly. |
| CVA-504 | Migration and Backward Compatibility | Task | P1 | 3 pts | TBD | cv-analysis, migration | CVA-201, CVA-401 | Roll out with no regression in current onboarding flow. | 1. Existing users can still access current flow during migration. 2. Data integrity preserved. 3. Build and unit tests pass. |

## Suggested Sprint Plan
1. Sprint 1: CVA-101, CVA-102, CVA-201, CVA-202
2. Sprint 2: CVA-301, CVA-302, CVA-303, CVA-203
3. Sprint 3: CVA-401, CVA-402, CVA-403, CVA-404
4. Sprint 4: CVA-501, CVA-502, CVA-503, CVA-504

## Definition of Done (Global)
1. `npm run build` passes.
2. `npm run test:unit` passes.
3. New/updated API contracts documented.
4. No cross-application data leakage.
5. Credit and status logic verified in automated tests.
