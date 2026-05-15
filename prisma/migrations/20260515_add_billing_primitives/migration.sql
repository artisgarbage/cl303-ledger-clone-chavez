-- CreateEnum for billing-related enums
CREATE TYPE "PlanSlug" AS ENUM ('FREE', 'STARTER', 'STUDIO', 'PRACTICE', 'ENTERPRISE', 'AGENT_DEV', 'AGENT_PRO', 'AGENT_SCALE', 'LLM_FEDERATION');
CREATE TYPE "BillingCadence" AS ENUM ('MONTHLY', 'ANNUAL', 'USAGE', 'CUSTOM');
CREATE TYPE "PricingRail" AS ENUM ('HUMAN', 'AGENT');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED');
CREATE TYPE "UsageKind" AS ENUM ('NARRATIVE_GENERATED', 'CFO_TURN', 'MODE_PROPOSAL_USED', 'MODE_BOARD_USED', 'IMPORT_RUN', 'AGENT_READ', 'AGENT_NARRATIVE', 'AGENT_SYNTHESIS');

-- CreateTable Plan
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "slug" "PlanSlug" NOT NULL,
    "displayName" TEXT NOT NULL,
    "priceUsdCents" INTEGER NOT NULL,
    "billingCadence" "BillingCadence" NOT NULL,
    "rail" "PricingRail" NOT NULL,
    "entitlementsJson" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable UsageEvent
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "agentIdentityId" TEXT,
    "kind" "UsageKind" NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable OverageCharge
CREATE TABLE "OverageCharge" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "kind" "UsageKind" NOT NULL,
    "units" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OverageCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable AgentIdentity
CREATE TABLE "AgentIdentity" (
    "id" TEXT NOT NULL,
    "ownerCompanyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "publicKeyPem" TEXT NOT NULL,
    "scopes" TEXT[],
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "AgentIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "UsageEvent_companyId_kind_occurredAt_idx" ON "UsageEvent"("companyId", "kind", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageEvent_agentIdentityId_kind_occurredAt_idx" ON "UsageEvent"("agentIdentityId", "kind", "occurredAt");

-- CreateIndex
CREATE INDEX "OverageCharge_companyId_periodStart_idx" ON "OverageCharge"("companyId", "periodStart");

-- CreateIndex
CREATE INDEX "AgentIdentity_ownerCompanyId_idx" ON "AgentIdentity"("ownerCompanyId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverageCharge" ADD CONSTRAINT "OverageCharge_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentIdentity" ADD CONSTRAINT "AgentIdentity_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
