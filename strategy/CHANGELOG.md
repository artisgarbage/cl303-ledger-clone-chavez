# Changelog

All notable changes to the Margot/Ledger platform.

---

## 2026-05-15 — TIK-013 M2: Authorization Foundation

**Branch:** `issue-22-m2-authz-foundation`  
**Scope:** Capability-based authorization primitives (partial M2)

### Added

- **Authorization library** (`src/lib/authz/`):
  - `capabilities.ts` — Complete capability catalog (31 capabilities across 8 resource domains)
  - `ROLE_CAPABILITIES` — Mapping of ADMIN/MEMBER/VIEWER → capabilities
  - `can()` — Pure authorization check for UI conditional rendering
  - `assertCan()` — Authorization guard with audit logging and typed errors
  - Tenant isolation enforced BEFORE role checks (info-leak prevention)

- **Authorization errors** (`src/lib/authz/errors.ts`):
  - `AuthorizationDenied` — 403, includes capability
  - `Unauthenticated` — 401
  - `TenantMismatch` — 404 (not 403), includes both companyIds for audit

- **Auth helper** (`src/lib/auth-helpers.ts`):
  - `requireRole()` — Accept single role or array of roles
  - Extends existing `requireSession()` / `requireAdmin()` / `requireTenant()`

### Tests

- `src/lib/authz/capabilities.test.ts` — Role matrix snapshot, hierarchy validation
- `src/lib/authz/can.test.ts` — All authorization paths, tenant isolation, audit logging
- `src/lib/auth-helpers.test.ts` — Updated with requireRole() coverage

### Design Notes

- Capabilities are granular (e.g., `cfo.mode.proposal`, not just `cfo.chat`)
- VIEWER: read-only + Internal CFO mode only
- MEMBER: ledger writes + all three CFO modes, no billing/team management
- ADMIN: superset of MEMBER + billing + team + agent identities
- Tenant checks short-circuit before role checks (security-first)
- All `assertCan()` calls write AccessAudit logs (success or failure)
- `can()` does NOT audit (UI-only)

### Deferred to next M2 PR

- `withGuard()` HOF for route handlers
- Middleware refactor (agent/billing paths)
- Route conversions to use guards
- Integration tests with actual route handlers

---

## 2026-05-15 — Milestone 1: Billing Primitives

**PR:** [#23](https://github.com/artisgarbage/cl303-ledger-clone-chavez/pull/23) (squash-merged as `a4b8f4c`)  
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

---

## 2026-05-15 — Cloud Run migration + seed users

**Commits:** `d0ea67a`, `c4fd47e`

### Changed

- **Deployment**: Migrated from GKE/Helm to Cloud Run (`margot-app-dev`, `us-central1`). Cloud Build handles image builds. GKE Helm manifests remain in `deploy/helm/` but are dormant.
- **DB migration**: `20260515_add_billing_primitives` applied to production via `npx prisma migrate deploy`.
- **Plans seeded**: 9 plans (FREE → LLM_FEDERATION) upserted via `prisma/seed-plans.ts`.
- **Admin users**: `rachel@codelab303.com`, `gavin@codelab303.com` added as ADMIN to both `codelab303` and `yolo-inc` companies.
- **TS fix**: `metadata` field in `entitlements.ts` cast to `Prisma.InputJsonValue` to satisfy strict JSON type checking.

### Testing

- Unit tests: `src/lib/billing/entitlements.test.ts` (all plan/quota/overage logic)
- Integration tests: (deferred — npm install issues in sandbox)

---

_Earlier entries: none (first changelog entry)_

## 2026-05-15 — TIK-013 M1: Billing Test Completion

Completed remaining test coverage requirements for Milestone 1 (Billing Primitives):

**Added files:**
- `src/lib/billing/agent-scopes.ts` — Agent scope definitions for Rail B (M6 prep)
- `src/lib/billing/overage.test.ts` — Overage computation unit tests
- `src/lib/billing/plans.test.ts` — Plan definitions snapshot tests

**Modified:**
- `src/app/api/cfo/conversation-flow.test.ts` — Added billing enforcement integration tests:
  - FREE plan quota exhaustion (429 response)
  - STARTER plan Proposal mode denial (402 + upgrade CTA)
  - STUDIO plan multi-mode access with overage tracking

**Test coverage:**
- Overage computation: under cap, at cap, over cap, unlimited plans, FREE (no overage)
- Plan snapshot: all 9 plans, structure validation, price drift detection
- Integration: quota enforcement, mode gating, entitlement checks

All M1 requirements now complete. Schema, seed, entitlement library, errors, hooks, and comprehensive tests shipped.
