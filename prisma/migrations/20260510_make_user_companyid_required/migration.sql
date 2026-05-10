-- SEC-03: Make User.companyId NOT NULL
-- This migration enforces tenant isolation at the database level.
-- It fails if any orphaned users exist (companyId IS NULL).

-- First, verify there are no orphaned users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make companyId NOT NULL: orphaned users exist. Clean up first with: DELETE FROM "User" WHERE "companyId" IS NULL';
  END IF;
END $$;

-- Make the column NOT NULL
ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;

-- Make the relation non-optional
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companyId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
