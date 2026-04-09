-- CreateEnum
CREATE TYPE "InterviewStageFocus" AS ENUM ('TECHNICAL', 'BEHAVIORAL', 'MIXED');

-- CreateEnum
CREATE TYPE "InterviewStageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable: Add recruitmentStageId to WorkplaceScenarioSession
ALTER TABLE "WorkplaceScenarioSession" ADD COLUMN "recruitmentStageId" TEXT;

-- CreateTable: RecruitmentInterviewStage
CREATE TABLE "RecruitmentInterviewStage" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 5,
    "focusType" "InterviewStageFocus" NOT NULL DEFAULT 'MIXED',
    "status" "InterviewStageStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentInterviewStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RecruitmentInterviewQuestion
CREATE TABLE "RecruitmentInterviewQuestion" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentInterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InAppNotification
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecruitmentInterviewStage_jobPostingId_idx" ON "RecruitmentInterviewStage"("jobPostingId");
CREATE INDEX "RecruitmentInterviewStage_status_idx" ON "RecruitmentInterviewStage"("status");
CREATE INDEX "RecruitmentInterviewStage_createdAt_idx" ON "RecruitmentInterviewStage"("createdAt");
CREATE INDEX "RecruitmentInterviewQuestion_stageId_idx" ON "RecruitmentInterviewQuestion"("stageId");
CREATE INDEX "RecruitmentInterviewQuestion_stageId_order_idx" ON "RecruitmentInterviewQuestion"("stageId", "order");
CREATE INDEX "InAppNotification_userId_idx" ON "InAppNotification"("userId");
CREATE INDEX "InAppNotification_userId_read_idx" ON "InAppNotification"("userId", "read");
CREATE INDEX "InAppNotification_createdAt_idx" ON "InAppNotification"("createdAt");
CREATE INDEX "WorkplaceScenarioSession_recruitmentStageId_idx" ON "WorkplaceScenarioSession"("recruitmentStageId");

-- AddForeignKey
ALTER TABLE "RecruitmentInterviewStage" ADD CONSTRAINT "RecruitmentInterviewStage_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecruitmentInterviewQuestion" ADD CONSTRAINT "RecruitmentInterviewQuestion_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "RecruitmentInterviewStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkplaceScenarioSession" ADD CONSTRAINT "WorkplaceScenarioSession_recruitmentStageId_fkey" FOREIGN KEY ("recruitmentStageId") REFERENCES "RecruitmentInterviewStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add currentRecruitmentStageId to CandidatePipelineEntry
ALTER TABLE "CandidatePipelineEntry" ADD COLUMN "currentRecruitmentStageId" TEXT;
CREATE INDEX "CandidatePipelineEntry_currentRecruitmentStageId_idx" ON "CandidatePipelineEntry"("currentRecruitmentStageId");
ALTER TABLE "CandidatePipelineEntry" ADD CONSTRAINT "CandidatePipelineEntry_currentRecruitmentStageId_fkey" FOREIGN KEY ("currentRecruitmentStageId") REFERENCES "RecruitmentInterviewStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- UniqueConstraint: Prevent duplicate sessions per candidate+stage (race-condition guard)
--
-- Strategy note: Prisma schema declares @@unique([userId, recruitmentStageId]), but
-- Prisma handles NULLs in unique constraints differently across databases.
-- PostgreSQL treats each NULL as distinct so a plain @@unique would allow multiple
-- self-practice sessions (recruitmentStageId = NULL) per user, which is desired.
-- However, Prisma generates a standard unique index that would block that.
--
-- Solution: use a partial unique index (WHERE recruitmentStageId IS NOT NULL) so:
--   1. Exactly one session per user+recruitmentStage combination is enforced at DB level.
--   2. Sessions with recruitmentStageId = NULL (self-practice) remain unrestricted.
--   3. The P2002 error from concurrent recruiter moves is caught gracefully in the
--      pipeline move API and treated as idempotent success.
--
-- Future migration note: If Prisma regenerates this constraint, prefer the partial
-- index form below over the auto-generated @@unique index to preserve NULL behavior.
CREATE UNIQUE INDEX "WorkplaceScenarioSession_userId_recruitmentStageId_key" ON "WorkplaceScenarioSession"("userId", "recruitmentStageId") WHERE "recruitmentStageId" IS NOT NULL;
