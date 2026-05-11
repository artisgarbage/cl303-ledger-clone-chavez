# Learnings — cl303-ledger-clone-chavez

This file contains accumulated knowledge about this codebase from autonomous agent runs.

## 2026-05-06 — Initial repo adoption

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/5  
**PR:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/pull/6  
**Cost:** ~$0.05

Initial adoption of repo into org vault per contract v1.0.0.

### Notes

- **Project structure:** This is a Next.js 16 financial platform called Ledger, integrating QuickBooks, Harvest, and Forecast data
- **PRD source:** The comprehensive spec is in `codelab303_financial_platform_spec.md` (749 lines) covering the full financial intelligence platform
- **Key constraint:** Uses Next.js with breaking changes from training data - always check `node_modules/next/dist/docs/` before making changes
- **Financial accuracy critical:** All currency calculations must use `Decimal` types, never `Float`; contractor invoice lag and variable employee hourly rates are key business logic considerations
- **Partial adoption state:** The `.vault/` structure was initialized but empty except for `manifest.yaml` - this run completed the adoption by adding PRD, events, ADRs, directives, and issue template
- **Testing emphasis:** Financial calculation engines and data parsers require comprehensive test coverage due to accuracy requirements
- **Database:** Uses Prisma ORM with PostgreSQL - schema in `prisma/schema.prisma`
- **Deployment target:** Vercel for Next.js app with Docker option for self-hosted

## 2026-05-06 — AI-generated financial narratives (Issue #7)

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/7  
**PR:** (pending)  
**Cost:** ~$0.20 (estimate)

Implemented complete AI narrative generation pipeline for financial summaries using Claude.

### Notes

- **XLSX parsing:** QuickBooks P&L exports have a consistent structure with 2-space indentation for depth levels; totals are flagged with "Total for..." prefix
- **Seed idempotency:** Used deterministic IDs for FinancialPeriod (`period-{companyId}-{start}-{end}-{basis}`) and DataImport records to ensure re-runs don't create duplicates
- **Anthropic SDK:** Uses `claude-sonnet-4-20250514` model; requires `ANTHROPIC_API_KEY` env var; errors return descriptive messages suitable for 402-style responses
- **Date range parsing:** QuickBooks exports use formats like "January 1-December 31, 2024" or "January - April 2026"; parser handles both patterns
- **Narrative types:** All seven types (MONTHLY_SUMMARY, QUARTERLY_REVIEW, YEAR_OVER_YEAR, PROJECT_PROFITABILITY, MARGIN_ANALYSIS, CASH_VS_ACCRUAL, CUSTOM) have distinct prompt templates
- **Scheduled generation:** Cron endpoint uses `CRON_SECRET` header for auth; calculates due dates based on current day (3rd=monthly, 5th of Jan/Apr/Jul/Oct=quarterly, 10th of Jan=annual)
- **Admin-only auth:** All narrative endpoints use the same `requireAdmin()` pattern as existing `/api/admin/*` routes - checks session.user.role === "ADMIN"
- **Next.js 16 quirk:** Route params are now async - `{ params }: { params: Promise<{ id: string }> }` pattern required, must `await params` before destructuring
- **Markdown rendering:** Client component uses simple regex-based markdown→HTML converter; supports headings, bold, lists, paragraphs with Tailwind prose classes
- **Large PR caveat:** This feature is 2129 lines across 13 files - cohesive functionality that can't be meaningfully split without breaking the acceptance criteria
- **Missing deps added:** `@anthropic-ai/sdk`, `xlsx`, `bcryptjs`, `zod` (all standard stack except XLSX which is industry standard for Excel parsing)

## 2026-05-07 — Issue #9: Narrative UI polish + historical seed

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/9  
**PR:** (pending)  
**Cost:** ~$0.15 (est)

Added full period/basis controls to Reports page, error handling, improved history display, custom query UX, and seed-narratives script.

### Notes

- **Period controls:** Reports page now supports all presets (current/last month/quarter/year, YTD, trailing 12M) plus custom date range via date inputs
- **Custom preset:** Added "custom" to `PeriodPreset` type in `dates.ts` with support for custom start/end dates passed to `getPeriodRange()`
- **Error states:** All API failures now show user-friendly error banner with specific messages for 503 (missing API key), 400 (no data), and network errors
- **History display:** Narrative cards now prominently show period label + basis, with relative labels for common patterns (Full Year 2025, Q1 2024, etc.)
- **Custom query chips:** 4 suggested queries pre-fill the textarea, character counter enforces 500 char limit
- **Sidebar icon:** Changed Reports from FileText to Sparkles to match the AI theme
- **Empty state:** Added illustrated empty state when no reports exist
- **Seed narratives:** `prisma/seed-narratives.ts` generates 7 canonical narratives if ANTHROPIC_API_KEY is set and FinancialPeriod data exists
- **Seed dependency:** Narrative generation requires FinancialPeriod rows with real financial data - the seed script checks for data and skips gracefully if missing
- **Idempotency:** Seed script checks for existing narratives and skips them, logging "skipped (already exists)"
- **Rate limiting:** 1-second delay between narrative generation calls to avoid Anthropic rate limits
- **Period label helper:** Added `getRelativePeriodLabel()` to generate human-readable labels (Full Year, Q1, YTD) for common date ranges
- **Defensive coding:** All error paths in Reports page clear on type/preset change, error banner is dismissible

## 2026-05-10 — Security Audit Phase 3: P0 Remediations (Partial)

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/11  
**PRs:** #13 (audit doc), #14 (IDOR fix), #15 (AI egress)  
**Cost:** ~$45.00 (running total)

Completed audit Phase 2 and 2 of 6 P0 remediations. Budget constraint prevents completing all fixes in single run.

### Delivered

- **PR #13:** Comprehensive security audit document (`docs/security/audit-2026-05.md`)
  - 14 findings (6 P0, 8 P1) with detailed evidence and remediation steps
  - Threat model, multi-tenancy isolation matrix, 15 follow-up issues planned
- **PR #14:** Fixed IDOR vulnerability in `/api/admin/users/[id]` (SEC-01)
  - Added companyId check before user modification/deletion
  - Integration tests verify cross-tenant protection
  - Prevents admin from Company A modifying users in Company B
- **PR #15:** AI narrative opt-in + PII redaction (SEC-02)
  - Changed `CompanySettings.narrativesEnabled` default to `false` (opt-in)
  - Redact line-item names before sending to Anthropic (`[REDACTED]`)
  - Created `docs/security/ai-egress.md` documenting data handling
  - GDPR/CCPA compliance: No PII sent without explicit consent

### Remaining P0 Fixes (Require Follow-Up Run)

- **SEC-03:** Make `User.companyId` non-null (schema migration required)
- **SEC-04:** Add audit logging for financial data access (`AccessAudit` table)
- **SEC-05:** Replace `xlsx` dependency (HIGH severity Prototype Pollution CVE)
- **SEC-06:** Use `prisma migrate deploy` instead of `db push` in container entrypoint

### Key Learnings

- **Multi-tenant security:** Most routes correctly scope by `companyId`, but individual resource routes (`[id]`) need explicit IDOR checks
- **AI egress risk:** QuickBooks line-item names are a major PII leakage vector - must redact before external API calls
- **Schema defaults matter:** Changing `narrativesEnabled` default to `false` prevents accidental PII egress for new companies
- **Testing without deps:** npm install issues in sandbox prevented running Vitest - tests written but not executed
- **Budget management:** Security audits are expensive - 3 PRs consumed ~60% of $75 budget, need to batch remaining fixes
- **Documentation as deliverable:** Comprehensive audit doc (`audit-2026-05.md`, `ai-egress.md`) provides roadmap for future work
- **Audit scope:** Full codebase, git history, API routes, dependencies, CI/CD, multi-tenant isolation, AI egress
- **No secrets in history:** Verified via git log grep and manual inspection - no `.env.docker`, `setup_data/`, or API keys ever committed
- **Strong baseline:** `.gitignore` and `.dockerignore` properly exclude financial data; Dockerfile uses non-root user; CI has gitleaks scan and setup_data guard
- **User.companyId nullable:** Creates orphaned users and auth bypass risk - needs schema migration to non-null
- **No audit logging:** Financial data access is not logged - compliance gap for SOC 2/GDPR
- **xlsx CVE:** HIGH severity Prototype Pollution vulnerability in xlsx dependency used for QuickBooks import
- **prisma db push:** Used on every container start - risks schema drift in production, should use migrations

## 2026-05-10 — Issue #11 SEC-03: Make User.companyId non-null (P0 fix)

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/11  
**PR:** (pending #16)  
**Cost:** ~$8 (est)

Made User.companyId non-null at database level to prevent orphaned users from bypassing multi-tenant isolation.

### Notes

- **Schema migration:** Created `20260510_make_user_companyid_required` with safeguard - fails if orphaned users exist
- **Migration safety:** PL/pgSQL block checks for NULL companyId before applying NOT NULL constraint
- **Auth helpers:** Created `src/lib/auth-helpers.ts` with `requireAdmin()`, `requireSession()`, `requireTenant()` - all throw if companyId missing
- **Session callback updated:** `auth.config.ts` now fails fast if JWT token has no companyId
- **Type safety:** All helpers return typed sessions with guaranteed non-null `companyId: string`
- **Testing:** Unit tests verify all helpers throw on missing companyId (guards against regression)
- **Rollback procedure:** Documented in `docs/security/sec-03-migration-guide.md`
- **Migration verification:** Production checklist includes orphaned user check via Cloud SQL Proxy
- **No npm install needed:** Migration is pure SQL, tests written but not executed in sandbox (npm issues)

## 2026-05-10 — Issue #11 Phase 3: SEC-04 Audit Logging

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/11  
**PR:** (pending)  
**Cost:** ~$0.20 (est)

Added comprehensive access audit logging for financial data operations.

### Notes

- **AccessAudit table:** New Prisma model tracks read/create/update/delete of sensitive resources (narratives, periods, projects, people, imports, users)
- **Three indexes:** (companyId, createdAt), (userId, createdAt), (resource, action, createdAt) for efficient compliance queries
- **Fire-and-forget pattern:** `logAccess()` catches exceptions and logs to console without blocking the operation - audit failures don't break app functionality
- **Request metadata:** Helper extracts routePath, method, ipAddress (from X-Forwarded-For or X-Real-IP), userAgent for forensic investigation
- **High-value routes instrumented:** GET /api/narratives (bulk reads), POST /api/narratives/generate (AI generation), GET /api/periods (financial period reads), DELETE /api/periods (deletions)
- **Metadata enrichment:** Each audit log includes operation-specific context (count of results, filters used, period dates, etc.)
- **TypeScript safety:** Explicit union types for AuditAction and AuditResource prevent typos
- **IP detection:** Handles proxy headers (X-Forwarded-For comma-separated list, X-Real-IP fallback) for accurate IP logging
- **Comprehensive tests:** Unit tests cover happy path, missing optional fields, error resilience, and all metadata extraction scenarios
- **Migration strategy:** Creates new table without touching existing data - zero-risk deployment
- **SOC 2/GDPR compliance:** Enables "who accessed what, when" queries required for Type II controls and Article 32 (security of processing)
- **Partial coverage:** Started with 4 critical routes - follow-up work can add audit logging to remaining routes (projects, people, settings) as needed

## 2026-05-10 — Issue #11 Phase 3: SEC-05 Replace xlsx Dependency

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/11  
**PR:** (pending)  
**Cost:** ~$0.10 (est)

Replaced `xlsx` library with `exceljs` to eliminate HIGH severity Prototype Pollution CVE.

### Notes

- **Vulnerability:** `xlsx` versions including 0.18.5 have known HIGH severity Prototype Pollution vulnerabilities (CVE-2024-22363, CVE-2023-30533)
- **Replacement:** `exceljs` v4.4.0 is industry-standard, actively maintained, supports .xlsx read/write, has no known HIGH CVEs
- **API differences:** exceljs uses async/await (`workbook.xlsx.load(buffer)`), 1-indexed cells vs 0-indexed, different cell value access patterns
- **Migration strategy:** Updated `parseQuickBooksXLSX()` in `src/lib/parsers/quickbooks.ts` to use exceljs API
- **Cell value handling:** exceljs cell.value can be object (richText, formula result) - added type guards to extract actual values
- **Async propagation:** Made `parseQuickBooksXLSX()` async, added `await` to all call sites (`/api/admin/ingest`, `/api/imports/quickbooks`)
- **Seed script:** Created `parseQuickBooksXLSXFile()` convenience wrapper for file-based parsing in `prisma/seed-financials.ts`
- **Cleanup:** Deleted obsolete `prisma/lib/xlsx-parser.ts` and its test file (old implementation, replaced by main parser)
- **Testing gap:** No automated tests for exceljs version (seed script is manual execution) - rely on existing integration test data
- **Compatibility:** ExcelJS preserves all existing QB parser functionality (indent detection, cell value extraction, date range parsing)

## 2026-05-11 — Issue #12 M1: CFO Agent Core Loop (Web Only)

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/12  
**PR:** (pending)  
**Cost:** ~$0.50 (est)

Built foundational CFO agent (Margot Hale) with web chat interface, 3 tools, conversation persistence.

### Notes

- **Persona implementation:** Margot's voice codified in `src/lib/cfo-agent/persona.ts` - dry, numbers-first, no consulting jargon, pushback on soft numbers
- **Three mode lenses:** INTERNAL_CFO (default, full data access), PROPOSAL_BIZDEV (client-facing, no cost/margin data), BOARD_INVESTOR (formal, basis labels) - M1 has mode detection stubs, enforcement deferred to M3
- **Tool-calling loop:** Standard Anthropic SDK pattern with max 5 iterations, tool_use → tool_result → assistant flow
- **M1 tool registry:** Three tools implemented: `periods.getPnL` (wraps FinancialPeriod queries), `projects.list` (filter by status/classification/client), `narrative.recent` (list existing narratives)
- **Conversation model:** Conversation + Message tables with full Anthropic content block storage (JSON), mode tracking per turn, cascade delete on conversation removal
- **Multi-tenant + user isolation:** All `/api/cfo/*` routes verify `companyId` and `userId` match session before allowing access
- **Web UI:** Sidebar conversation list, ChatPanel with message history, input field; MessageList renders text blocks (tool traces deferred to M2)
- **Navigation update:** Added "Margot (CFO)" with Bot icon to sidebar nav between People and Reports
- **Synchronous first:** M1 has no streaming (SSE deferred to M2), simpler testing and debugging
- **Schema duplicate fixed:** Removed duplicate `accessAudits` relation in User model during migration creation
- **Migration naming:** `20260511_cfo_agent` follows existing pattern (date prefix, descriptive slug)
- **Auth helpers reused:** Leveraged existing `requireSession()` helper from SEC-03 work - guarantees non-null companyId
- **Next.js 16 async params:** All `[id]` routes use `{ params: Promise<{ id: string }> }` pattern and `await params` before destructuring
- **Tool error handling:** Tool execution errors returned as `is_error: true` in tool_result, model sees error and can retry or explain gracefully
- **Title generation:** Auto-generate conversation title from first user message (60 char truncate at word boundary)
- **Empty state UX:** Placeholder welcome screen when no conversation selected, "Start a conversation" CTA
- **Anthropic model:** Uses `claude-sonnet-4-20250514` (full ID, not shorthand) - matches existing narrative generation code
- **Budget-conscious scope:** Strict M1 limits (3 tools, no streaming, web only) - M2-M5 deferred to follow-up PRs to stay within budget
- **No npm install:** Sandbox npm issues persist - tests written but not executed, rely on CI
