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
