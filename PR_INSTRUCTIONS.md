# PR Creation Instructions for Issue #22 M1

The code is ready and committed to branch `issue-22-m1-billing-primitives`. The GH_TOKEN lacks permissions to push/create PRs, so this must be completed manually.

## Branch Status

**Branch:** `issue-22-m1-billing-primitives`  
**Base:** `main`  
**Commits:** 4 commits

1. `fe0012d` - Add billing schema and migration
2. `5645f3a` - Add entitlement library and plan definitions
3. `71de093` - Add entitlement enforcement to narrative and CFO endpoints
4. `4de3cb0` - Add M1 documentation

## Manual Steps Required

### 1. Push the Branch

Since the token lacks write permissions, you need to push manually:

```bash
git push origin issue-22-m1-billing-primitives
```

### 2. Create the PR

Use the GitHub web UI or CLI with proper permissions:

**Title:**
```
feat(billing): Milestone 1 — Pricing & Entitlements (Backend)
```

**Body:**
```markdown
## Summary

Implements TIK-013 Milestone 1: Complete billing metering substrate with plans, subscriptions, usage tracking, and entitlement enforcement.

## What Changed

### Schema (Prisma + Migration)
- Added 5 new models: `Plan`, `Subscription`, `UsageEvent`, `OverageCharge`, `AgentIdentity`
- Added 5 new enums: `PlanSlug`, `BillingCadence`, `PricingRail`, `SubscriptionStatus`, `UsageKind`
- Migration: `20260515_add_billing_primitives`

### Billing Library
- `src/lib/billing/plans.ts`: 9 plan definitions (5 Human-rail + 4 Agent-rail) with entitlements
- `src/lib/billing/entitlements.ts`: Core entitlement resolution, quota tracking, usage recording
- `src/lib/billing/errors.ts`: Typed errors (`PlanUpgradeRequired`, `QuotaExceeded`, `EntitlementDenied`)

### API Route Changes
- `POST /api/narratives/generate`: Check quota → generate → record `NARRATIVE_GENERATED` usage
- `POST /api/cfo/chat`: Assert mode entitlement → execute turn → record `CFO_TURN` usage
- Both return 402 with structured error JSON on quota/entitlement failure

### Seeding
- `prisma/seed-plans.ts`: Idempotent plan seeding
- Wired into `prisma/seed.ts`

### Testing
- Full unit test suite: `src/lib/billing/entitlements.test.ts`
- Tests cover plan resolution, quota math, overage computation, mode entitlement checks
- (Not executed in sandbox due to npm install issues — rely on CI)

## Pricing Source

All prices and caps directly from `strategy/PRICING_AND_GTM.md` §4. No invented numbers.

## Key Design Decisions

1. **FREE plan auto-assignment**: Companies without a `Subscription` row default to FREE plan via `getActivePlan()` fallback. No DB write on read, no backfill needed.

2. **Entitlements as JSON**: `Plan.entitlementsJson` stores full capability set. Simpler than normalized tables, easy to version.

3. **Hard cap vs. overage**:
   - FREE: Hard cap (throws `QuotaExceeded`, returns 429)
   - STARTER+: Soft cap (allows overage, `OverageCharge` rows written at period-close in M3)

4. **Mode entitlement enforced at turn-time**: `/api/cfo/chat` checks mode on every request, not at conversation creation. Allows seamless plan upgrades mid-conversation.

5. **Usage recorded after success**: `recordUsage()` called AFTER work completes, never before. Don't bill for failed operations.

## Error Response Shape

All 402 responses:

```json
{
  "error": "PlanUpgradeRequired" | "QuotaExceeded",
  "message": "...",
  "code": "...",
  "requiredPlanSlug"?: "...",
  "upgradeUrl"?: "..."
}
```

## Out of Scope (Deferred to M2/M3)

- Agent rail endpoints (`/api/agent/v1/*`)
- Stripe integration
- UI for billing/usage/upgrade affordances
- Overage period-close job
- MCP server
- Marketing site

## Migration Instructions

```bash
npx prisma migrate dev
npm run db:seed
```

## Risks

1. **Seed timing**: Plan seed must run before entitlement checks. Mitigated: seed is idempotent, runs on every `db:seed`.
2. **Existing conversations**: If enforcement is too aggressive, existing FREE users can't continue. Mitigated: mode check is per-turn, existing INTERNAL conversations continue working.
3. **Migration on existing data**: Backfilling subscriptions for all companies. Mitigated: migration is in a transaction, small dataset.

## Resolves

Part of #22 (Milestone 1 only — M2/M3 follow in separate PRs)
```

## Files Changed

Total: 13 files

### New Files (9)
1. `prisma/migrations/20260515_add_billing_primitives/migration.sql`
2. `prisma/seed-plans.ts`
3. `src/lib/billing/plans.ts`
4. `src/lib/billing/errors.ts`
5. `src/lib/billing/entitlements.ts`
6. `src/lib/billing/entitlements.test.ts`
7. `strategy/CHANGELOG.md`
8. `.vault/tickets/22.md`
9. `PR_INSTRUCTIONS.md` (this file)

### Modified Files (4)
1. `prisma/schema.prisma` — Added billing models + back-relations on Company
2. `prisma/seed.ts` — Imported and called `seedPlans()`
3. `src/app/api/narratives/generate/route.ts` — Added usage recording
4. `src/app/api/cfo/chat/route.ts` — Added mode entitlement check + usage recording
5. `.cl303/learnings.md` — Added M1 notes

## Verification Steps (After Merge)

1. **Migration applies cleanly:**
   ```bash
   npx prisma migrate dev
   ```

2. **Plans seed successfully:**
   ```bash
   npm run db:seed
   # Should see "Seeding plans..." with 9 plan confirmations
   ```

3. **Entitlement checks work:**
   - Try generating 6th narrative on FREE plan → should return 402
   - Try using PROPOSAL mode on FREE plan → should return 402
   - Try generating narrative on STUDIO plan → should succeed

4. **Usage recording works:**
   - Generate narrative → check UsageEvent table for NARRATIVE_GENERATED row
   - Send CFO chat message → check UsageEvent table for CFO_TURN row

## Budget Actual

~$15 USD (within $100 budget for full epic)

## Notes

This is M1 only. M2 (agent rail endpoints) and M3 (Stripe + UI) follow in separate PRs per the epic specification.
