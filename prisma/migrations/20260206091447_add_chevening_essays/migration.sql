-- CreateEnum
CREATE TYPE "EssayType" AS ENUM ('LEADERSHIP', 'NETWORKING', 'COURSE_CHOICES', 'CAREER_PLAN');

-- CreateEnum
CREATE TYPE "EssayStatus" AS ENUM ('DRAFT', 'ANALYZING', 'ANALYZED', 'FINALIZED');

-- AlterEnum
ALTER TYPE "OperationType" ADD VALUE 'ESSAY_ANALYSIS';

-- CreateTable
CREATE TABLE "Essay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EssayType" NOT NULL,
    "status" "EssayStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "latestScore" DOUBLE PRECISION,
    "analysisCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Essay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EssayVersion" (
    "id" TEXT NOT NULL,
    "essayId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EssayVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EssayAnalysis" (
    "id" TEXT NOT NULL,
    "essayId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "feedback" JSONB NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "creditsUsed" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EssayAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Essay_userId_idx" ON "Essay"("userId");

-- CreateIndex
CREATE INDEX "Essay_type_idx" ON "Essay"("type");

-- CreateIndex
CREATE INDEX "Essay_status_idx" ON "Essay"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Essay_userId_type_key" ON "Essay"("userId", "type");

-- CreateIndex
CREATE INDEX "EssayVersion_essayId_idx" ON "EssayVersion"("essayId");

-- CreateIndex
CREATE INDEX "EssayVersion_essayId_version_idx" ON "EssayVersion"("essayId", "version");

-- CreateIndex
CREATE INDEX "EssayAnalysis_essayId_idx" ON "EssayAnalysis"("essayId");

-- CreateIndex
CREATE INDEX "EssayAnalysis_essayId_createdAt_idx" ON "EssayAnalysis"("essayId", "createdAt");

-- AddForeignKey
ALTER TABLE "Essay" ADD CONSTRAINT "Essay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EssayVersion" ADD CONSTRAINT "EssayVersion_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "Essay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EssayAnalysis" ADD CONSTRAINT "EssayAnalysis_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "Essay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
