---
id: directive-reviewer-cl303-ledger-clone-chavez
type: role
title: 'Reviewer Directive — cl303-ledger-clone-chavez'
status: active
owner: engineer
created: 2026-05-06
updated: 2026-05-06
tags: [directive, reviewer, cl303-ledger-clone-chavez]
project: cl303-ledger-clone-chavez
---

# Reviewer Directive — cl303-ledger-clone-chavez

<!-- vault-directive: reviewer -->
<!-- Rules lifted from CLAUDE.md / AGENTS.md for this role. -->
<!-- If nothing applies, leave this section empty — do not delete it. -->
<!-- /vault-directive: reviewer -->

## Repo-specific context

When reviewing PRs for this financial platform, pay special attention to:

**Financial accuracy:**
- All currency calculations use `Decimal` types, never `Float` or `Number`
- Cost calculations properly account for variable employee hourly rates
- Contractor invoice lag adjustments are applied correctly
- Both cash and accrual basis calculations are implemented when required

**Data integrity:**
- All external API data is validated before storage
- Database constraints prevent invalid financial states
- Timestamps are properly handled (UTC storage, proper timezone display)

**Test coverage:**
- Financial calculation engines have comprehensive unit tests
- Edge cases are covered (zero-hour months, negative margins, etc.)
- Integration tests cover the full data import → calculation → display flow

**Security:**
- No financial data logged in production
- API keys and credentials properly secured
- Rate limiting on external API integrations
