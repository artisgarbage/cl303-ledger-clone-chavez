# SEC-03: User.companyId Non-Null Migration Guide

**Security Finding:** P0 - Orphaned users (companyId=null) bypass multi-tenant isolation  
**PR:** #16 (pending)  
**Migration:** `20260510_make_user_companyid_required`

## What Changed

- **Database:** `User.companyId` is now `NOT NULL` at the schema level
- **Auth:** Session callbacks fail fast if `companyId` is missing
- **API:** New shared helpers (`requireAdmin`, `requireSession`, `requireTenant`) in `src/lib/auth-helpers.ts`

## Pre-Migration Checklist

Before running this migration in any environment:

1. **Check for orphaned users:**
   ```sql
   SELECT id, email, name, "createdAt"
   FROM "User"
   WHERE "companyId" IS NULL;
   ```

2. **If orphaned users exist, decide on cleanup strategy:**

   **Option A: Delete orphans (recommended if test/dev data):**
   ```sql
   DELETE FROM "User" WHERE "companyId" IS NULL;
   ```

   **Option B: Assign to a default company (production):**
   ```sql
   -- First, create an "Orphaned Users" company if needed
   INSERT INTO "Company" (id, name, "fiscalYearStart", "createdAt")
   VALUES ('orphaned-company', 'Orphaned Users', 1, NOW())
   ON CONFLICT (id) DO NOTHING;

   -- Then assign orphaned users
   UPDATE "User"
   SET "companyId" = 'orphaned-company'
   WHERE "companyId" IS NULL;
   ```

## Running the Migration

### Local Development

```bash
# 1. Check for orphaned users first
docker compose exec db psql -U ledger_user -d ledger_dev \
  -c "SELECT COUNT(*) FROM \"User\" WHERE \"companyId\" IS NULL;"

# 2. If any exist, clean them up (see above)

# 3. Run the migration
npm run prisma:migrate:deploy
# or
docker compose exec app npx prisma migrate deploy
```

### Production (Cloud SQL)

```bash
# 1. Backup the database
gcloud sql backups create --instance=ledger-prod

# 2. Check for orphaned users via Cloud SQL Proxy
gcloud sql connect ledger-prod --user=ledger_user --database=ledger_prod
> SELECT COUNT(*) FROM "User" WHERE "companyId" IS NULL;

# 3. If any exist, decide: delete or assign to default company

# 4. Deploy the migration via CI/CD
# The migration is applied automatically on container startup if using:
# prisma migrate deploy --skip-generate

# 5. Verify constraint is active
> \d "User"
# Should show: "companyId" character varying NOT NULL
```

## Rollback Procedure

If the migration fails or causes issues:

```sql
-- Revert to nullable column
ALTER TABLE "User" ALTER COLUMN "companyId" DROP NOT NULL;

-- Update the _prisma_migrations table to mark as rolled back
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name = '20260510_make_user_companyid_required';
```

Then revert the code changes and redeploy.

## Impact on Application Code

### Before (SEC-03)

```typescript
const companyId = (session.user as { companyId?: string }).companyId;
if (!companyId) {
  return NextResponse.json({ error: "No company" }, { status: 400 });
}
```

### After (SEC-03)

```typescript
import { requireTenant } from "@/lib/auth-helpers";

const companyId = await requireTenant();
// companyId is guaranteed to be a non-null string
```

## Testing

Unit tests in `src/lib/auth-helpers.test.ts` verify:
- `requireAdmin()` throws if companyId is missing
- `requireSession()` throws if companyId is missing
- `requireTenant()` returns a string, never null

Integration tests should verify:
- User creation fails if companyId is not provided
- Session initialization fails if user has no companyId (should never happen after migration)

## Security Rationale

**Before:** Orphaned users (companyId=null) could access the system but had no tenant boundary, potentially seeing all companies' data or causing null-pointer errors in tenant-scoped queries.

**After:** Schema-level constraint ensures every user belongs to exactly one company. Multi-tenant isolation is enforced at the database level, not just in application logic.

**Compliance:** Required for SOC 2 Type II "Logical Access Controls" and GDPR Article 32 "data segregation between tenants."

## References

- **Security Audit:** `docs/security/audit-2026-05.md` (Finding SEC-03)
- **Migration SQL:** `prisma/migrations/20260510_make_user_companyid_required/migration.sql`
- **Auth Helpers:** `src/lib/auth-helpers.ts`
- **Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/11
