---
id: directive-architect-cl303-ledger-clone-chavez
type: role
title: 'Architect Directive — cl303-ledger-clone-chavez'
status: active
owner: engineer
created: 2026-05-06
updated: 2026-05-06
tags: [directive, architect, cl303-ledger-clone-chavez]
project: cl303-ledger-clone-chavez
---

# Architect Directive — cl303-ledger-clone-chavez

<!-- vault-directive: architect -->
<!-- Rules lifted from CLAUDE.md / AGENTS.md for this role. -->
<!-- If nothing applies, leave this section empty — do not delete it. -->
<!-- /vault-directive: architect -->

## Repo-specific context

The architecture must support:
- Single-tenant operation today, multi-tenant SaaS tomorrow
- Both cash-basis and accrual-basis accounting views simultaneously
- Integration with external APIs (QuickBooks, Harvest, Forecast)
- AI-generated narrative analysis via Claude API
- Large financial dataset processing (years of transaction history)

Data flow:
1. Import/sync from external sources
2. Transform and normalize into unified schema
3. Calculate derived metrics (project profitability, utilization, etc.)
4. Generate point-in-time snapshots for historical comparison
5. Produce visualizations and AI narratives

Critical non-functional requirements:
- Accurate financial calculations (no floating-point errors)
- Auditability (all calculations must be traceable)
- Performance (sub-second dashboard loads even with years of data)
