# Job Applications Kanban Plan

## Goal
- Turn `Applications` into the candidate's single management hub for application progress and outcomes.
- Minimize steps between creating an application, updating its stage, and understanding overall performance.
- Keep the current onboarding flow as the deep-edit experience, while the Kanban becomes the daily operating view.

## UX Principles
- One home for all applications: the candidate should not need to jump between multiple pages to understand status.
- Fast actions over long flows: moving an application from one stage to another should take one interaction.
- Progressive disclosure: summary on the board, deeper context on selection.
- Strong signal density: each card should show status, company, role, score, and recency without overwhelming the user.
- Mobile coherence: no fragile drag-and-drop dependency for the first version; controls should remain usable on touch devices.

## Kanban Model
- The board will expose exactly 3 candidate-facing stages:
  - `In progress`
  - `Applied`
  - `Interview`
- Internal database statuses stay richer and are mapped into those 3 stages:
  - `DRAFT`, `ANALYZING`, `ANALYZED` -> `In progress`
  - `APPLIED` -> `Applied`
  - `INTERVIEWING`, `OFFERED`, `REJECTED`, `ACCEPTED` -> `Interview`
- Final states such as `OFFERED`, `REJECTED`, and `ACCEPTED` remain visible on the card as outcome badges so historical performance is preserved.

## Implementation Scope

### 1. Shared status mapping
- Create a small helper module for:
  - mapping backend status -> Kanban column
  - mapping Kanban selection -> backend status
  - friendly UI labels for status and outcomes
- Reuse this helper in `Applications` and onboarding to avoid inconsistent stage logic.

### 2. Applications page becomes the Kanban hub
- Replace the current flat list in `src/app/(protected)/applications/page.tsx` with:
  - top summary metrics
  - 3 Kanban columns
  - cards with quick actions
  - selected-application detail panel
- Each card should include:
  - role title
  - company name
  - latest fit score when available
  - current internal status label
  - final outcome badge when applicable
  - last updated timestamp
- Card actions should include:
  - continue editing in onboarding
  - quick stage update
  - delete

### 3. Performance visibility
- Add top-level summary cards showing:
  - total applications
  - number in progress
  - number applied
  - number in interview
  - average fit score
- Add a detail panel for the selected application showing:
  - current stage
  - current backend status
  - latest AI summary
  - recommended next action
  - direct CTA back to onboarding

### 4. Onboarding integration
- Keep onboarding as the deep-edit and analysis flow.
- After a successful analysis:
  - show the application status clearly
  - provide a `Mark as Applied` action
  - redirect to `/applications` after marking as applied
- For existing applications already in later stages:
  - surface current status in the context card
  - allow quick transition to `Interview` from the analysis section
  - always provide a fast path back to the Kanban board

### 5. Data and API usage
- Reuse existing endpoints:
  - `GET /api/job-application`
  - `PATCH /api/job-application/[id]`
  - `DELETE /api/job-application/[id]`
- Use optimistic updates for stage changes so the board feels immediate.
- Invalidate `jobApplications` queries after mutations to keep onboarding and board aligned.

### 6. Responsiveness and interaction model
- Desktop:
  - 3-column board layout
  - persistent detail panel below the board
- Mobile:
  - stacked sections by column
  - card actions remain tap-friendly
  - no drag-and-drop dependency in v1

### 7. Quality gates
- Add a small unit test for the status mapping helper.
- Run `npm run build`.
- Run `npm run test:unit`.

## Execution Order
1. Create the plan doc and link it from `.context/docs/README.md`.
2. Add shared Kanban status helper and unit test.
3. Refactor `Applications` into the Kanban hub.
4. Integrate onboarding actions for status progression.
5. Run build and unit tests.

## Expected Outcome
- The candidate can see every application in one place.
- Updating a stage becomes a one-step action.
- The product communicates both pipeline status and performance quality.
- The journey stays coherent: create and optimize in onboarding, manage and track in the Kanban hub.
