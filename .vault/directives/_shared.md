# Shared Directives — cl303-ledger-clone-chavez

<!-- vault-directive: _shared -->
## Next.js Version Warning

This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- /vault-directive: _shared -->

## Repo-specific context

This is a financial intelligence platform called **Ledger** for professional services companies. It integrates data from QuickBooks, Harvest, and Forecast to provide deep financial analysis including project profitability, team utilization, and cash vs. accrual reconciliation.

Key architectural constraints:
- PostgreSQL via Prisma ORM
- Next.js 14+ App Router with Server Components
- TypeScript strict mode, no `any` types
- Claude API for narrative generation
- Tailwind CSS + shadcn/ui components
