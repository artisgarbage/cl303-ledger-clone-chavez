---
id: ticket-11-continuation
type: ticket
title: "Security Audit Phase 3 Continuation - Remaining P0 Remediations"
status: active
owner: engineer
created: 2026-05-10
updated: 2026-05-10
tags: [ticket, security, p0, audit]
project: cl303-ledger-clone-chavez
---

# Security Audit Phase 3 Continuation - Remaining P0 Remediations

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/11
**Budget:** $75 USD
**Prior work:** PRs #13 (audit doc), #14 (IDOR fix), #15 (AI egress), #16 (companyId NOT NULL) completed

## Goal

Complete the remaining P0 security remediations from the May 2026 security audit. The audit identified 6 P0 findings; 3 are shipped (SEC-01, SEC-02) or ready to merge (SEC-03). This run will complete SEC-04, SEC-05, and SEC-06.

## Context

From `.cl303/learnings.md`:
- SEC-01 ✅ Fixed IDOR in `/api/admin/users/[id]` (PR #14, merged)
- SEC-02 ✅ AI opt-in + redaction (PR #15, merged)  
- SEC-03 🔄 `User.companyId` NOT NULL (PR #16, **ready to merge**)
- SEC-04 ❌ **TODO:** Add audit logging for financial data access
- SEC-05 ❌ **TODO:** Replace `xlsx` (HIGH CVE - Prototype Pollution)
- SEC-06 ❌ **TODO:** Use `prisma migrate deploy` instead of `db push`

## Approach

### Step 1: Merge PR #16 (SEC-03)
PR #16 is open, mergeable, no conflicts. Merge it first so we're building on the latest main.

### Step 2: SEC-04 - Audit Logging (Medium effort, ~150 lines)
**Problem:** No audit trail for who accesses or mutates financial data. Compliance gap for SOC 2/GDPR.

**Solution:**
1. Create `AccessAudit` model in Prisma schema:
   ```prisma
   model AccessAudit {
     id         String   @id @default(cuid())
     userId     String
     user       User     @relation(fields: [userId], references: [id])
     companyId  String
     company    Company  @relation(fields: [companyId], references: [id])
     action     String   // "read" | "create" | "update" | "delete"
     resource   String   // "narrative" | "period" | "project" | "people" | "import"
     resourceId String?  // the ID of the thing accessed, if applicable
     metadata   Json?    // {routePath, method, ipAddress, userAgent}
     createdAt  DateTime @default(now())
     
     @@index([companyId, createdAt])
     @@index([userId, createdAt])
     @@index([resource, action, createdAt])
   }
   ```

2. Create `src/lib/audit.ts` helper:
   ```typescript
   export async function logAccess(params: {
     userId: string;
     companyId: string;
     action: 'read' | 'create' | 'update' | 'delete';
     resource: string;
     resourceId?: string;
     metadata?: Record<string, any>;
   }): Promise<void> {
     await prisma.accessAudit.create({ data: params });
   }
   ```

3. Instrument high-value routes:
   - `GET /api/narratives` - log bulk reads
   - `POST /api/narratives/generate` - log AI generation (already has IngestAudit for imports)
   - `GET /api/periods` - log financial period reads
   - `DELETE /api/periods` - log deletions
   - `POST /api/admin/ingest` - already has IngestAudit, add AccessAudit for consistency

4. Write integration tests:
   - Verify audit log entries are created on route calls
   - Verify companyId is correctly scoped

**Files to modify:**
- `prisma/schema.prisma`
- `src/lib/audit.ts` (new)
- `src/lib/audit.test.ts` (new)
- `src/app/api/narratives/route.ts`
- `src/app/api/narratives/generate/route.ts`
- `src/app/api/periods/route.ts`
- Migration file

**Acceptance:**
- [ ] `AccessAudit` table exists
- [ ] Helper function works and is tested
- [ ] At least 3 high-value routes instrumented
- [ ] Tests pass

### Step 3: SEC-05 - Replace `xlsx` dependency (Small effort, ~30 lines)
**Problem:** `xlsx` has HIGH severity Prototype Pollution CVE (exact CVE number varies by version, but multiple exist).

**Solution:**
1. Remove `xlsx` from package.json
2. Install `exceljs` (industry-standard alternative, actively maintained, no known HIGH CVEs)
3. Update `prisma/seed-financials.ts` to use `exceljs` API:
   ```typescript
   import * as ExcelJS from 'exceljs';
   
   const workbook = new ExcelJS.Workbook();
   await workbook.xlsx.readFile(filePath);
   const sheet = workbook.worksheets[0];
   sheet.eachRow((row, rowNum) => {
     const values = row.values as any[];
     // ... existing parsing logic
   });
   ```

4. Update any other files that import `xlsx` (check with `grep -r "from 'xlsx'" src/`)

**Files to modify:**
- `package.json`
- `package-lock.json` (via npm install)
- `prisma/seed-financials.ts`
- Any other importers (likely none based on prior learnings)

**Acceptance:**
- [ ] `xlsx` not in package.json
- [ ] `exceljs` installed
- [ ] Seed script runs successfully (test with sample XLSX file)
- [ ] `npm audit` shows no HIGH vulnerabilities in `exceljs`

### Step 4: SEC-06 - Migrate to `prisma migrate deploy` (Small effort, ~10 lines)
**Problem:** `prisma db push` on every container start can cause schema drift in production. It's a dev-mode command.

**Solution:**
1. Update `docker-entrypoint.sh`:
   ```bash
   #!/bin/sh
   set -e
   
   echo "Running database migrations..."
   npx prisma migrate deploy
   
   echo "Starting application..."
   exec npm start
   ```

2. Update `Dockerfile` if needed (ensure migrations/ directory is copied)
   ```dockerfile
   COPY prisma ./prisma
   # migrations are already in prisma/migrations/
   ```

3. Update `README.md` and/or `docs/deploy/` to document the change

4. Add a note in `.vault/directives/_shared.md` or `engineer.md` about migration discipline

**Files to modify:**
- `docker-entrypoint.sh`
- `README.md` or `docs/deploy/kubernetes.md`
- `.vault/directives/_shared.md` (optional)

**Acceptance:**
- [ ] `prisma migrate deploy` used instead of `prisma db push`
- [ ] Container starts successfully
- [ ] Documentation updated

### Step 5: Documentation & Breadcrumbs
Before opening PRs:
- Update `.cl303/learnings.md` with findings from this run
- Ensure all 3 PRs reference the audit doc and issue #11
- Each PR ≤ 400 lines diff

## Baseline

**Test status (before changes):**
- Tests exist but couldn't run in previous attempt due to npm install issues
- Schema is currently clean (no uncommitted changes after stashing)

**TypeScript status:**
- No errors reported in prior runs

**Dependencies:**
- `xlsx` present in package.json (to be removed)
- `exceljs` not yet present (to be added)

## Risk Areas

1. **Migration for AccessAudit table:** Should be straightforward (adding a new table, not modifying existing ones)
2. **exceljs API differences:** May require adjusting parsing logic, but both libs are row-based
3. **Container startup:** Switching from `db push` to `migrate deploy` requires migrations/ to be in the image (should already be there)

## Estimated token usage

- SEC-04: ~30,000 tokens (schema + migration + helper + 5 route updates + tests)
- SEC-05: ~10,000 tokens (package.json + seed script update)
- SEC-06: ~5,000 tokens (entrypoint script + docs)
- Planning, git ops, PR creation: ~10,000 tokens
- **Total estimate:** ~55,000 tokens (~$0.15 at GPT-4 rates)

Well within $75 budget.

## Acceptance Criteria

All items from the issue's Phase 3 checklist:
- [x] SEC-01 shipped (PR #14)
- [x] SEC-02 shipped (PR #15)
- [x] SEC-03 ready to merge (PR #16) → merge it in this run
- [ ] SEC-04 shipped (audit logging)
- [ ] SEC-05 shipped (replace xlsx)
- [ ] SEC-06 shipped (migrate deploy)
- [ ] All PRs ≤ 400 lines diff
- [ ] All PRs include tests
- [ ] `.cl303/learnings.md` updated

## References

- Security audit: `docs/security/audit-2026-05.md`
- Issue: https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/11
- Prior learnings: `.cl303/learnings.md`
