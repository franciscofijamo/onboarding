-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('AI_TEXT_CHAT', 'AI_IMAGE_GENERATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asaasCustomerId" TEXT,
    "asaasCustomerIdSandbox" TEXT,
    "asaasCustomerIdProduction" TEXT,
    "asaasSubscriptionId" TEXT,
    "currentPlanId" TEXT,
    "cpfCnpj" TEXT,
    "billingPeriodEnd" TIMESTAMP(3),
    "cancellationScheduled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationDate" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "creditsRemaining" INTEGER NOT NULL DEFAULT 100,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditBalanceId" TEXT NOT NULL,
    "operationType" "OperationType" NOT NULL,
    "creditsUsed" INTEGER NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "featureCosts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "asaasId" TEXT,
    "clerkId" TEXT,
    "clerkName" TEXT,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT DEFAULT 'brl',
    "priceMonthlyCents" INTEGER,
    "priceYearlyCents" INTEGER,
    "description" TEXT,
    "features" JSONB,
    "badge" TEXT,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "ctaType" TEXT DEFAULT 'contact',
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "billingSource" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageObject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'vercel_blob',
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" TEXT,
    "size" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clerkUserId" TEXT NOT NULL,
    "planKey" TEXT,
    "status" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_asaasCustomerId_key" ON "User"("asaasCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_asaasCustomerIdSandbox_key" ON "User"("asaasCustomerIdSandbox");

-- CreateIndex
CREATE UNIQUE INDEX "User_asaasCustomerIdProduction_key" ON "User"("asaasCustomerIdProduction");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_currentPlanId_idx" ON "User"("currentPlanId");

-- CreateIndex
CREATE INDEX "Feature_workspaceId_idx" ON "Feature"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditBalance_userId_key" ON "CreditBalance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditBalance_clerkUserId_key" ON "CreditBalance"("clerkUserId");

-- CreateIndex
CREATE INDEX "CreditBalance_userId_idx" ON "CreditBalance"("userId");

-- CreateIndex
CREATE INDEX "CreditBalance_clerkUserId_idx" ON "CreditBalance"("clerkUserId");

-- CreateIndex
CREATE INDEX "CreditBalance_creditsRemaining_idx" ON "CreditBalance"("creditsRemaining");

-- CreateIndex
CREATE INDEX "CreditBalance_lastSyncedAt_idx" ON "CreditBalance"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "UsageHistory_userId_idx" ON "UsageHistory"("userId");

-- CreateIndex
CREATE INDEX "UsageHistory_creditBalanceId_idx" ON "UsageHistory"("creditBalanceId");

-- CreateIndex
CREATE INDEX "UsageHistory_timestamp_idx" ON "UsageHistory"("timestamp");

-- CreateIndex
CREATE INDEX "UsageHistory_operationType_idx" ON "UsageHistory"("operationType");

-- CreateIndex
CREATE INDEX "UsageHistory_userId_timestamp_idx" ON "UsageHistory"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "UsageHistory_operationType_timestamp_idx" ON "UsageHistory"("operationType", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_asaasId_key" ON "Plan"("asaasId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_clerkId_key" ON "Plan"("clerkId");

-- CreateIndex
CREATE INDEX "Plan_active_idx" ON "Plan"("active");

-- CreateIndex
CREATE INDEX "Plan_sortOrder_idx" ON "Plan"("sortOrder");

-- CreateIndex
CREATE INDEX "StorageObject_userId_idx" ON "StorageObject"("userId");

-- CreateIndex
CREATE INDEX "StorageObject_createdAt_idx" ON "StorageObject"("createdAt");

-- CreateIndex
CREATE INDEX "StorageObject_clerkUserId_idx" ON "StorageObject"("clerkUserId");

-- CreateIndex
CREATE INDEX "StorageObject_contentType_idx" ON "StorageObject"("contentType");

-- CreateIndex
CREATE INDEX "StorageObject_deletedAt_idx" ON "StorageObject"("deletedAt");

-- CreateIndex
CREATE INDEX "StorageObject_name_idx" ON "StorageObject"("name");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_clerkUserId_occurredAt_idx" ON "SubscriptionEvent"("clerkUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_userId_occurredAt_idx" ON "SubscriptionEvent"("userId", "occurredAt");

-- AddForeignKey
ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageHistory" ADD CONSTRAINT "UsageHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageHistory" ADD CONSTRAINT "UsageHistory_creditBalanceId_fkey" FOREIGN KEY ("creditBalanceId") REFERENCES "CreditBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
