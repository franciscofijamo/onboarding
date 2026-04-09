-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('RECEIVED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'REJECTED', 'ACCEPTED');

-- AlterTable: add jobPostingId and isPublicApplication to JobApplication
ALTER TABLE "JobApplication" ADD COLUMN "jobPostingId" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN "isPublicApplication" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CandidatePipelineEntry" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobApplicationId" TEXT NOT NULL,
    "currentStage" "PipelineStage" NOT NULL DEFAULT 'RECEIVED',
    "fitScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidatePipelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePipelineEntry_jobApplicationId_key" ON "CandidatePipelineEntry"("jobApplicationId");

-- CreateIndex
CREATE INDEX "CandidatePipelineEntry_jobPostingId_idx" ON "CandidatePipelineEntry"("jobPostingId");

-- CreateIndex
CREATE INDEX "CandidatePipelineEntry_userId_idx" ON "CandidatePipelineEntry"("userId");

-- CreateIndex
CREATE INDEX "CandidatePipelineEntry_jobPostingId_currentStage_idx" ON "CandidatePipelineEntry"("jobPostingId", "currentStage");

-- CreateIndex
CREATE INDEX "CandidatePipelineEntry_createdAt_idx" ON "CandidatePipelineEntry"("createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_jobPostingId_idx" ON "JobApplication"("jobPostingId");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePipelineEntry" ADD CONSTRAINT "CandidatePipelineEntry_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePipelineEntry" ADD CONSTRAINT "CandidatePipelineEntry_jobApplicationId_fkey" FOREIGN KEY ("jobApplicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
