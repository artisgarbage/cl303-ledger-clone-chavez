---
id: ticket-12-m2-partial
type: ticket
title: "Issue #12 M2 Partial: Tool Registry Expansion (7 new tools)"
status: done
owner: engineer
created: 2026-05-11
updated: 2026-05-11
tags: [cfo-agent, tools, m2]
project: cl303-ledger-clone-chavez
---

# Issue #12 M2 Partial: Tool Registry Expansion

**Parent Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/12  
**PR:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/pull/21  
**Status:** ✅ PR open, awaiting review  
**Cost:** ~$10 (within M2 budget allocation of $35)

## Delivery Summary

Expanded Margot's tool registry from 3 tools (M1) to 10 tools. This is a **partial M2 delivery** — core analytical tools implemented first. Remaining M2 work (streaming, UI, 5 additional tools) deferred to follow-up PRs to stay within session budget.

## Tools Implemented (7 new)

### Periods (1 new)
- ✅ `periods.compare` — Side-by-side P&L comparison with deltas and YoY %

### Projects (2 new)  
- ✅ `projects.getProfitability` — Full project P&L with contributor breakdown
- ✅ `projects.getMarginInternal` — Internal margin metrics (will be hidden in proposal mode)

### People (4 new)
- ✅ `people.list` — Team roster with filters
- ✅ `people.getUtilization` — Utilization metrics (billable %, effective rate, 65% threshold)
- ✅ `people.getTrueCost` — Variable employee cost + contractor expenses
- ✅ `people.getCompensation` — Current comp records (internal-only)

## Architecture Decisions

1. **Query helpers pattern:** Created `queries/people.ts` to keep SQL out of tool handlers
2. **Engine wrappers:** Tools delegate to `lib/engine/*` instead of duplicating logic
3. **Metadata for citation:** All responses include `_meta: { source, period?, basis? }`
4. **Internal-only marking:** Tools that expose sensitive data marked in descriptions
5. **Dynamic imports:** Tool handlers use dynamic imports to avoid circular dependencies

## Acceptance Dialogues

✅ **Dialogue #2:** "Walk me through the Acme rebuild project"
- Tool: `projects.getProfitability`
- Returns: revenue, cost, margin, contributors, hours breakdown

✅ **Dialogue #3:** "Who is under-utilized this quarter?"
- Tool: `people.getUtilization`
- Returns: team members below 65% threshold with context

## Deferred Work (M2 Part 2)

- [ ] 5 remaining tools: `narrative.generate`, `proposal.frameForClient`, `search.semantic`, `artifacts.toXlsx`, `models.runScenario`
- [ ] SSE streaming for `/api/cfo/chat`
- [ ] Show-your-work panel UI component
- [ ] Tool tests in `tools/__tests__/`
- [ ] Context builder: conversation summary after 30 turns

## Files Changed

```
.cl303/learnings.md                      |  18 +
src/lib/cfo-agent/queries/people.ts      | 214 +++++
src/lib/cfo-agent/tools/index.ts         | 108 ++-
src/lib/cfo-agent/tools/people.ts        | 367 ++++++++
src/lib/cfo-agent/tools/periods.ts       | 115 ++-
src/lib/cfo-agent/tools/projects.ts      | 287 +++++-
6 files changed, 1086 insertions(+), 23 deletions(-)
```

## Learnings

- **Utilization threshold:** 65% is industry standard for services firms
- **Cost attribution:** Naive model (cost × hours-ratio) sufficient for v1
- **Mode filtering:** Stub implemented, enforcement deferred to M3
- **Budget-conscious scoping:** Focused on analytical tools first; defer artifact generation

## Next Steps

M2 Part 2 PR will add:
1. Remaining 5 tools
2. SSE streaming
3. Show-your-work panel
4. Tool tests

Estimated cost: ~$25 (streaming + UI work is time-intensive)
