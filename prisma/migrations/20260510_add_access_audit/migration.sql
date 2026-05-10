-- SEC-04: Add AccessAudit table for compliance and forensics
-- Required for SOC 2 Type II and GDPR Article 30 (records of processing)

-- CreateTable
CREATE TABLE "AccessAudit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessAudit_companyId_createdAt_idx" ON "AccessAudit"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessAudit_userId_createdAt_idx" ON "AccessAudit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessAudit_resource_action_idx" ON "AccessAudit"("resource", "action");
