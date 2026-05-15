# Changelog

All notable changes to the Margot/Ledger platform.

---

## 2026-05-15 — Milestone 1: Billing Primitives

**PR:** (pending)  
**Scope:** Plans, subscriptions, usage metering, entitlement enforcement

### Added

- **Billing schema** — 5 new Prisma models:
  - `Plan` — product catalog (9 plans across Human and Agent rails)
  - `Subscription` — company → plan mapping with billing period tracking
  - `UsageEvent` — append-only log of metered actions (narratives, CFO turns)
  - `OverageCharge` — settled overage billing records (period-close job in M3)
  - `AgentIdentity` — agent-rail credentials (stub for M2)

- **Entitlement library** (`src/lib/billing/entitlements.ts`):
  - `getActivePlan()` — resolve plan + entitlements for a company
  - `assertEntitlement()` / `assertMode()` — throw PlanUpgradeRequired if missing
  - `checkQuota()` — pure read of usage vs. cap
  - `recordUsage()` — write UsageEvent after successful work
  - `computeOverage()` — pure function for period-close billing (M3)

- **Plan definitions** (`src/lib/billing/plans.ts`):
  - 5 Human-rail plans: FREE, STARTER, STUDIO, PRACTICE, ENTERPRISE
  - 4 Agent-rail plans: AGENT_DEV, AGENT_PRO, AGENT_SCALE, LLM_FEDERATION
  - Prices and caps match `strategy/PRICING_AND_GTM.md` §4

- **Seed script** (`prisma/seed-plans.ts`):
  - Idempotent plan seeding, runs on every `npm run db:seed`
  - Wired into main seed.ts

### Changed

- **`/api/narratives/generate`** — Added quota check + usage recording after successful generation. Returns 402 with PlanUpgradeRequired/QuotaExceeded JSON on failure.

- **`/api/cfo/chat`** — Added mode entitlement check (PROPOSAL/BOARD require STUDIO+) and CFO_TURN usage recording. Returns 402 on missing entitlement or quota exceeded.

- **Error responses** — All 402 responses follow standard shape:
  ```json
  {
    "error": "PlanUpgradeRequired" | "QuotaExceeded",
    "message": "...",
    "code": "...",
    "requiredPlanSlug"?: "...",
    "upgradeUrl"?: "..."
  }
  ```

### Deferred to M2/M3

- Agent rail endpoints (`/api/agent/v1/*`)
- Stripe integration
- UI for billing/usage/upgrade affordances
- Overage period-close job
- MCP server
- Marketing site

### Migration

Run `npx prisma migrate dev` to apply `20260515_add_billing_primitives`.
Run `npm run db:seed` to populate plans.

Companies without a `Subscription` row automatically default to FREE plan (no backfill needed).

### Testing

- Unit tests: `src/lib/billing/entitlements.test.ts` (all plan/quota/overage logic)
- Integration tests: (deferred — npm install issues in sandbox)

---

_Earlier entries: none (first changelog entry)_
