---
id: vault-ticket-12-m2-partial
type: ticket
title: "CFO Agent M2 Partial: Tool Registry Expansion"
status: done
owner: engineer
created: 2026-05-11
updated: 2026-05-11
tags: [cfo-agent, tools, m2]
project: cl303-ledger-clone-chavez
---

# CFO Agent M2 Partial: Tool Registry Expansion

**GitHub Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/12  
**Pull Request:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/pull/21

## Summary

Expanded Margot CFO agent tool registry from 3 to 10 tools. Partial M2 delivery focused on core analytical capabilities.

## New Tools (7)

- `periods.compare` — Period-over-period P&L comparison
- `projects.getProfitability` — Full project P&L with contributor cost breakdown
- `projects.getMarginInternal` — Internal margin metrics (proposal-mode restricted)
- `people.list` — Team roster with filters
- `people.getUtilization` — Utilization metrics (65% threshold, effective rates)
- `people.getTrueCost` — Variable employee cost + contractor expenses by month
- `people.getCompensation` — Current compensation records (internal-only)

## Architecture

- **Query helpers:** `queries/people.ts` separates SQL from tool handlers
- **Engine wrappers:** Tools delegate to existing `lib/engine/*` functions
- **Citation metadata:** All responses include `_meta` for source/period/basis

## Deferred to M2 Part 2

- SSE streaming
- Show-your-work panel UI
- 5 remaining tools (narrative.generate, proposal.frameForClient, search.semantic, artifacts.toXlsx, models.runScenario)
- Tool tests

## Cost

~$10 (within $35 M2 budget)
