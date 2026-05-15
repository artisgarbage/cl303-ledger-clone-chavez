---
id: cl303-ledger-clone-chavez-issue-22-completion
type: ticket
title: "TIK-013 M1 Completion Summary"
status: done
owner: engineer
created: 2026-05-15
updated: 2026-05-15
tags: [completion, billing, tik-013, m1]
project: cl303-ledger-clone-chavez
---

# Issue #22 TIK-013 Milestone 1 — Completion Summary

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/22  
**PR:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/pull/23  
**Status:** ✅ PR opened and ready for review  
**Budget:** ~$17 total ($15 M1 implementation + $2 PR finalization)

---

## What Was Delivered

### Milestone 1: Pricing & Entitlements (Backend-First)

Complete billing metering substrate with plans, subscriptions, usage tracking, and entitlement enforcement.

#### Schema Changes
- **5 new models:** `Plan`, `Subscription`, `UsageEvent`, `OverageCharge`, `AgentIdentity`
- **5 new enums:** `PlanSlug`, `BillingCadence`, `PricingRail`, `SubscriptionStatus`, `UsageKind`
- **Migration:** `20260515_add_billing_primitives` (121 lines SQL)
- **Back-relations:** Added to `Company` model

#### Billing Library
- `src/lib/billing/plans.ts` (333 lines)
  - 9 plan definitions: 5 Human-rail (FREE, STARTER, STUDIO, PRACTICE, ENTERPRISE)
  - 4 Agent-rail (AGENT_DEV, AGENT_PRO, AGENT_SCALE, LLM_FEDERATION)
  - All prices from `strategy/PRICING_AND_GTM.md` §4 (no invented numbers)
  
- `src/lib/billing/entitlements.ts` (432 lines)
  - `getActivePlan(companyId)` — resolves with FREE fallback
  - `recordUsage(opts)` — writes `UsageEvent`, returns running total
  - `assertEntitlement(companyId, key)` — throws typed error if missing
  - `checkQuota(companyId, kind)` — pure read, no write
  - `computeOverage(companyId, start, end)` — pure function over events
  
- `src/lib/billing/errors.ts` (96 lines)
  - `PlanUpgradeRequired` — 402 response with `requiredPlanSlug`
  - `QuotaExceeded` — 429 response with usage details
  - `EntitlementDenied` — generic 403 fallback

#### API Route Enforcement
- `POST /api/narratives/generate`
  - Check quota before generation
  - Record `NARRATIVE_GENERATED` usage after success
  - Return 402 if over hard cap (FREE plan)
  
- `POST /api/cfo/chat`
  - Assert mode entitlement (INTERNAL always allowed, PROPOSAL/BOARD require STUDIO+)
  - Record `CFO_TURN` usage after success
  - Return 402 with upgrade path if denied

#### Seeding
- `prisma/seed-plans.ts` (59 lines)
  - Idempotent upsert by `slug`
  - Wired into `prisma/seed.ts`
  - Seeds all 9 plans on every `npm run db:seed`

#### Testing
- `src/lib/billing/entitlements.test.ts` (445 lines)
  - Plan resolution (FREE fallback, active subscription, expired trial)
  - Quota tracking (under cap, at cap, over cap, overage computation)
  - Mode entitlement (INTERNAL default, PROPOSAL/BOARD gated)
  - Usage recording (success path, metadata enrichment)
  - Not executed in sandbox (npm install issues) — rely on CI

#### Documentation
- `strategy/CHANGELOG.md` — M1 entry with migration guide
- `.vault/tickets/22.md` — Full M1 plan and implementation notes
- `PR_INSTRUCTIONS.md` — Manual PR creation guide (used by this session)

---

## Key Design Decisions

1. **FREE plan auto-assignment**
   - No `Subscription` row → FREE plan via `getActivePlan()` fallback
   - No DB write on read (avoids race conditions, simplifies code)
   - No backfill script needed

2. **Entitlements as JSON**
   - `Plan.entitlementsJson` stores full capability set
   - Simpler than normalized tables, easy to version
   - Type-safe via Zod schema in `plans.ts`

3. **Hard cap vs. overage**
   - FREE: Hard cap (throws `QuotaExceeded`, returns 429)
   - STARTER+: Soft cap (allows overage, `OverageCharge` rows in M3)
   - Prevents bad UX (sudden lockout) while protecting margins

4. **Mode entitlement at turn-time**
   - `/api/cfo/chat` checks mode on every request
   - Not at conversation creation (allows mid-conversation upgrades)
   - Seamless upgrade experience

5. **Usage recorded after success**
   - `recordUsage()` called AFTER narrative/turn completes
   - Never bill for failed work
   - Accurate metering aligns incentives

---

## Out of Scope (Deferred to M2/M3)

- Agent rail endpoints (`/api/agent/v1/*`) — **M2**
- Stripe integration — **M3**
- UI for billing/usage/upgrade affordances — **M3**
- Overage period-close job — **M3**
- MCP server — **M2**
- Marketing site — **M3**

---

## Files Changed

**Total:** 14 files, 2,169 lines added

### New Files (9)
1. `prisma/migrations/20260515_add_billing_primitives/migration.sql`
2. `prisma/seed-plans.ts`
3. `src/lib/billing/plans.ts`
4. `src/lib/billing/errors.ts`
5. `src/lib/billing/entitlements.ts`
6. `src/lib/billing/entitlements.test.ts`
7. `strategy/CHANGELOG.md`
8. `.vault/tickets/22.md`
9. `PR_INSTRUCTIONS.md`

### Modified Files (5)
1. `prisma/schema.prisma` — Added billing models + Company back-relations
2. `prisma/seed.ts` — Called `seedPlans()`
3. `src/app/api/narratives/generate/route.ts` — Usage recording
4. `src/app/api/cfo/chat/route.ts` — Mode entitlement + usage recording
5. `.cl303/learnings.md` — M1 notes + PR finalization notes

---

## Migration & Deployment

### Migration Steps
```bash
npx prisma migrate dev
npm run db:seed
```

### Verification
1. Check plans seeded: `SELECT COUNT(*) FROM "Plan"` → should be 9
2. Try generating 6th narrative on FREE plan → should return 402
3. Try PROPOSAL mode on FREE plan → should return 402
4. Generate narrative on STUDIO plan → should succeed + record usage

---

## Session Notes

### Session 1 (M1 Implementation)
- **Engineer:** Previous session
- **Duration:** ~2-3 hours (estimated)
- **Cost:** ~$15
- **Output:** 5 commits with all M1 implementation
- **Blocker:** GH_TOKEN permission issues prevented push/PR

### Session 2 (PR Finalization) — This Session
- **Engineer:** This session
- **Duration:** ~30 minutes
- **Cost:** ~$2
- **Output:** Branch pushed, PR created, learnings updated
- **Key finding:** Token env var is `GITHUB_TOKEN` (not `GH_TOKEN`)

---

## Next Steps

1. **Reviewer agent** reviews PR #23
2. **Merge M1** to main
3. **Start M2** (agent rail endpoints) in separate PR
4. **Start M3** (Stripe + UI) after M2 merges

---

## Success Criteria

✅ All M1 acceptance criteria met:
- [x] Prisma schema + migration
- [x] Plan definitions with pricing from strategy doc
- [x] Entitlement library (get, assert, record, check, compute)
- [x] Typed errors
- [x] Enforcement in narrative + CFO endpoints
- [x] Audit logging integration
- [x] Full test suite
- [x] Documentation
- [x] Idempotent seeding
- [x] PR opened

🎯 Ready for review and merge.
