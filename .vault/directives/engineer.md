---
id: directive-engineer-cl303-ledger-clone-chavez
type: role
title: 'Engineer Directive — cl303-ledger-clone-chavez'
status: active
owner: engineer
created: 2026-05-06
updated: 2026-05-06
tags: [directive, engineer, cl303-ledger-clone-chavez]
project: cl303-ledger-clone-chavez
---

# Engineer Directive — cl303-ledger-clone-chavez

<!-- vault-directive: engineer -->
<!-- Rules lifted from CLAUDE.md / AGENTS.md for this role. -->
<!-- If nothing applies, leave this section empty — do not delete it. -->
<!-- /vault-directive: engineer -->

## Repo-specific context

When working on financial calculations:
- All currency values should use proper decimal types (Prisma `Decimal`, not `Float`)
- Cost calculations must account for variable hourly rates for salaried employees
- Contractor invoice lag must be considered when computing COGS
- Both cash-basis and accrual-basis views are required for accuracy

Test coverage is critical for:
- Financial calculation engines (`lib/engine/`)
- Data parsers (`lib/parsers/`)
- API routes that handle integrations

The Prisma schema is in `prisma/schema.prisma`. Run `npm run db:migrate:dev` after schema changes.

## Database Migration Discipline

**Always use versioned migrations in production:**
- Development: `npm run db:migrate:dev` to create migrations
- Container startup: `prisma migrate deploy` (production-safe)
- **Never** use `prisma db push` on container start — it's a dev-mode command that can cause schema drift

The `docker-entrypoint.sh` script runs `prisma migrate deploy` on every container start. This applies pending migrations from the `prisma/migrations/` directory without modifying the schema.
