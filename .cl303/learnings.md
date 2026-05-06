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
