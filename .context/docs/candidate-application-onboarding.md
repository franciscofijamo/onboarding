# Candidate Application Onboarding

## Overview
The onboarding flow lives at `src/app/(protected)/onboarding/page.tsx` (≈1 976 lines).  
It is a multi-step wizard that supports two modes:  
1. **Platform application** (`?jobPostingId=<id>`) — candidate applies to an internal job posting.  
2. **Private application** — candidate tracks a job from an external source.

## Step Model
Steps are defined by the `STEPS` constant:

| Key | Label | Required |
|---|---|---|
| `resume` | CV / Resume | yes |
| `cover-letter` | Cover Letter | no |
| `job-description` | Descrição da Vaga | yes |
| `analysis` | AI Analysis / Enviar Candidatura | no |

> **UX decision (April 2026):** The cover-letter step is hidden from the stepper for platform applications (`isPublicApplication === true`). Navigation jumps directly from `resume` to `job-description` for those flows.

## Key UX Rules Implemented (April 2026)

### CV / Resume Step
- User can **select an existing CV** from their library (stored via `GET /api/resume`).
- User can **upload a new file** (PDF / DOCX extraction via `POST /api/resume/extract`).
- User can **delete a CV** from the library — `deleteResumeMutation` calls `DELETE /api/resume?id=<id>`.  
  If the deleted CV was selected, selection is cleared (`savedResumeId`, `resumeTitle`, `resumeText` reset).
- The "Save & Continue" handler (`handleSaveResumeAndContinue`) skips to `job-description` for platform applications.
- Instructional copy is candidate-centric (e.g., "Carregue o seu CV" rather than recruiter language).

### Cover Letter Step
- **Hidden** for platform applications — `isPublicApplication` toggles visibility in the stepper.
- Still functional for private applications.

### Send Application Step (`analysis` step in public mode)
- Label becomes **"Enviar Candidatura"** when `isPublicApplication === true`.
- Shows a confirmation summary with two collapsible sections:
  - **Job details** (`expandedVaga` state) — title, company, description.
  - **Selected CV** (`expandedCV` state) — title, with inline "edit" shortcut back to the resume step via `Edit2` icon.
- Submission triggers `POST /api/jobs/<jobPostingId>/apply` via `isSubmittingPlatformApp` / `platformAppSubmitted` / `platformAppError` state.

### Navigation Flow for Platform Applications
```
resume → job-description → analysis (Enviar Candidatura)
```
Cover letter is bypassed entirely.

## State Variables (core selection)
| Variable | Purpose |
|---|---|
| `selectedJobApplicationId` | Currently active job application ID |
| `savedResumeId` | ID of the saved/selected resume |
| `jobPostingId` | URL param — signals platform application mode |
| `isPublicApplication` | Derived boolean from `jobPostingId` |
| `expandedVaga` | Controls job detail accordion in confirmation step |
| `expandedCV` | Controls CV accordion in confirmation step |
| `isSubmittingPlatformApp` | Loading state for platform apply POST |
| `platformAppSubmitted` | Submission success flag |
| `platformAppError` | Submission error message |

## API Integration
| Action | Endpoint |
|---|---|
| Load resumes | `GET /api/resume` |
| Save / update resume | `POST /api/resume` / `PATCH /api/resume` |
| Delete resume | `DELETE /api/resume?id=<id>` |
| Extract text from file | `POST /api/resume/extract` |
| Load cover letters | `GET /api/cover-letter` |
| Save / update cover letter | `POST /api/cover-letter` / `PATCH /api/cover-letter` |
| Save draft application | `POST /api/job-application` / `PATCH /api/job-application/<id>` |
| Run AI analysis | `POST /api/job-application/<id>/analyze` |
| Submit platform application | `POST /api/jobs/<jobPostingId>/apply` |
| Crawl job URL | `POST /api/job-application/crawl` |

## Kanban Integration
After the analysis step, a candidate can change application status using `updateApplicationStatusMutation`:
- `APPLIED` → moves card to the **Applied** column in the Kanban hub.
- `INTERVIEWING` → moves to the **Interview** column.

Status mapping logic lives in `src/lib/job-application/kanban.ts` (shared with `applications/page.tsx`).

## Maintenance Notes
- Keep `STEPS` array in sync with the `StepIndicator` component labels.
- Any new step must be added to both `STEPS` and the step-specific render block in the main component body.
- Platform vs. private mode is branched throughout via `isPublicApplication` — verify both paths when changing step logic.
- The confirmation summary anchors in the `analysis` step should stay in sync with `expandedVaga` / `expandedCV` state.
