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
