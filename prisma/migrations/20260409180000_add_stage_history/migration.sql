-- CreateTable
CREATE TABLE IF NOT EXISTS "CandidateStageHistory" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "movedBy" TEXT NOT NULL,
    "fromStage" "PipelineStage" NOT NULL,
    "toStage" "PipelineStage" NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CandidateStageHistory_entryId_idx" ON "CandidateStageHistory"("entryId");
CREATE INDEX IF NOT EXISTS "CandidateStageHistory_movedBy_idx" ON "CandidateStageHistory"("movedBy");
CREATE INDEX IF NOT EXISTS "CandidateStageHistory_movedAt_idx" ON "CandidateStageHistory"("movedAt");

-- AddForeignKey
ALTER TABLE "CandidateStageHistory" ADD CONSTRAINT "CandidateStageHistory_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "CandidatePipelineEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateStageHistory" ADD CONSTRAINT "CandidateStageHistory_movedBy_fkey"
    FOREIGN KEY ("movedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
