-- CreateEnum
CREATE TYPE "ApplicationAnalysisExecutionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ApplicationAnalysisExecution" (
    "id" TEXT NOT NULL,
    "jobApplicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" "ApplicationAnalysisExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "applicationAnalysisId" TEXT,
    "creditsCharged" BOOLEAN NOT NULL DEFAULT false,
    "creditsRefunded" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationAnalysisExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAnalysisExecution_applicationAnalysisId_key" ON "ApplicationAnalysisExecution"("applicationAnalysisId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAnalysisExecution_jobApplicationId_inputHash_key" ON "ApplicationAnalysisExecution"("jobApplicationId", "inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAnalysisExecution_jobApplicationId_idempotencyKey_key" ON "ApplicationAnalysisExecution"("jobApplicationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ApplicationAnalysisExecution_userId_idx" ON "ApplicationAnalysisExecution"("userId");

-- CreateIndex
CREATE INDEX "ApplicationAnalysisExecution_status_idx" ON "ApplicationAnalysisExecution"("status");

-- CreateIndex
CREATE INDEX "ApplicationAnalysisExecution_jobApplicationId_status_idx" ON "ApplicationAnalysisExecution"("jobApplicationId", "status");

-- AddForeignKey
ALTER TABLE "ApplicationAnalysisExecution" ADD CONSTRAINT "ApplicationAnalysisExecution_jobApplicationId_fkey" FOREIGN KEY ("jobApplicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
