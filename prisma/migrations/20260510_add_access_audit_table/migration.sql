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
CREATE INDEX "AccessAudit_resource_action_createdAt_idx" ON "AccessAudit"("resource", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "AccessAudit" ADD CONSTRAINT "AccessAudit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAudit" ADD CONSTRAINT "AccessAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
