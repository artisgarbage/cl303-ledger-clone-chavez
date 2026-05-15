---
id: TIK-013-m2-foundation-complete
type: ticket
title: "TIK-013 M2 Foundation Complete"
status: done
owner: engineer
created: 2026-05-15
updated: 2026-05-15
tags: [billing, authz, milestone-2, foundation]
project: cl303-ledger-clone-chavez
---

# TIK-013 M2 Authorization Foundation — Session Complete

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/22  
**PR:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/pull/25 (draft)  
**Branch:** `issue-22-m2-authz-foundation`  
**Cost:** ~$8 (well under $20 budget)

---

## Summary

Successfully implemented the **foundation** of Milestone 2 (Authorization layer) for the TIK-013 epic. This session focused on establishing the capability-based authorization primitives that will be used by route handlers and the `withGuard()` HOF in the full M2 implementation.

---

## What Was Completed

### ✅ Core Authorization Library (`src/lib/authz/`)

1. **`capabilities.ts`**
   - Complete capability catalog: 31 capabilities across 8 resource domains
   - `ROLE_CAPABILITIES` map: ADMIN/MEMBER/VIEWER → capabilities
   - Granular capabilities (e.g., `cfo.mode.proposal` separate from `cfo.chat`)
   - Helper functions: `getCapabilitiesForRole()`, `roleHasCapability()`

2. **`can.ts`**
   - `can()` — Pure boolean check for UI conditional rendering (no audit)
   - `assertCan()` — Guard that throws + audits every authorization decision
   - Tenant isolation checked BEFORE role checks (info-leak prevention)
   - Full AccessAudit integration for both success and failure

3. **`errors.ts`**
   - `AuthorizationDenied` (maps to 403) — includes capability name
   - `TenantMismatch` (maps to 404, not 403) — prevents resource existence leaks
   - `Unauthenticated` (maps to 401)

### ✅ Auth Helpers Extension

- **`requireRole()`** in `src/lib/auth-helpers.ts`
  - Accept single role or array of roles
  - Example: `requireRole(["ADMIN", "MEMBER"])`
  - Cleaner than manual role checks in every route

### ✅ Comprehensive Tests

- `capabilities.test.ts` — 20+ tests including:
  - Role matrix snapshot (ensures changes are reviewed)
  - Hierarchy validation (VIEWER ⊂ MEMBER ⊂ ADMIN)
  - Specific capability checks per role
  
- `can.test.ts` — 25+ tests including:
  - All authorization paths (success, denial, no session)
  - Tenant isolation (same-tenant ok, cross-tenant denied)
  - Audit logging for all assertCan() calls
  - Error properties validation
  
- `auth-helpers.test.ts` — Updated with `requireRole()` coverage

### ✅ Documentation

- Updated `strategy/CHANGELOG.md` with M2 foundation entry
- Updated `.cl303/learnings.md` with implementation notes
- Comprehensive PR description with security design rationale

---

## Security Design Highlights

1. **Tenant isolation first** — All `assertCan()` calls check tenant match BEFORE role check
2. **404 on tenant mismatch** — Return 404 (not 403) to avoid leaking resource existence
3. **Audit everything** — Every `assertCan()` call writes AccessAudit log (success or failure)
4. **Role hierarchy** — VIEWER ⊂ MEMBER ⊂ ADMIN validated by snapshot test

---

## Role Capabilities Summary

### VIEWER
- Read-only ledger access
- Internal CFO mode only
- No narrative generation
- No billing management
- No team management

### MEMBER
- All VIEWER capabilities +
- Ledger writes (people, projects, periods)
- All three CFO modes (Internal, Proposal, Board)
- Narrative generation
- Imports

### ADMIN
- All MEMBER capabilities +
- Billing management
- Team management (invite, remove, role changes)
- Agent identity issuance/revocation
- Admin panel access

---

## What's Deferred to Next M2 PR

The following items are required to complete M2 but were intentionally deferred to stay within budget:

1. **`withGuard()` HOF** — Higher-order function for route handlers
   - Unified entry point combining capability check + entitlement check + usage recording
   - Error mapping (PlanUpgradeRequired → 402, AuthorizationDenied → 403, etc.)
   
2. **Middleware refactor** — Remove admin enforcement from middleware, add agent/billing paths

3. **Route conversions** — Convert existing routes to use `withGuard()`
   - Start with one route per resource type as proof-of-concept
   - Full conversion in separate PR

4. **Integration tests** — E2E tests with actual route handlers

---

## Files Changed

```
src/lib/authz/
  capabilities.ts          (new, 123 lines)
  capabilities.test.ts     (new, 156 lines)
  can.ts                   (new, 140 lines)
  can.test.ts              (new, 384 lines)
  errors.ts                (new, 44 lines)

src/lib/auth-helpers.ts    (modified, +47 lines)
src/lib/auth-helpers.test.ts (modified, +58 lines)

.cl303/learnings.md        (updated)
strategy/CHANGELOG.md      (updated)
```

**Total:** ~950 lines of new code + tests

---

## Budget Usage

- Planning & reconnaissance: ~$1
- Implementation: ~$5
- Testing: ~$2
- Documentation & PR: ~$1
- **Total: ~$9** (45% of $20 budget)

---

## Next Steps

The next engineer session on TIK-013 should:

1. Review and merge PR #25
2. Implement `withGuard()` HOF in `src/lib/authz/guard.ts`
3. Refactor middleware to remove admin-specific logic
4. Convert 2-3 routes as proof-of-concept (suggestions: `/api/people`, `/api/narratives`, `/api/billing/subscription`)
5. Write integration tests
6. Open PR to complete M2

Estimated effort for full M2: ~$12-15 additional budget

---

## Testing Status

All new tests pass:

```bash
✓ src/lib/authz/capabilities.test.ts (20 tests)
✓ src/lib/authz/can.test.ts (25 tests)
✓ src/lib/auth-helpers.test.ts (9 tests)
```

Snapshot file created: `src/lib/authz/__snapshots__/capabilities.test.ts.snap`

---

## Risks Mitigated

- **No breaking changes** — This is additive; no existing code paths modified
- **Tenant isolation guaranteed** — Checked before role checks, logged on failure
- **Audit trail complete** — All authorization decisions logged to AccessAudit
- **Role changes reviewable** — Snapshot test catches unintended capability changes

---

## Known Issues

None — all functionality within scope works as designed.

---

## Acknowledgments

- M1 learnings (PR #23, #24) provided solid foundation
- Existing auth-helpers pattern made integration clean
- AccessAudit table already existed (from SEC-03) — zero schema changes needed
