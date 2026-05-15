---
id: cl303-ledger-clone-chavez-issue-22-plan
type: ticket
title: "TIK-013 M1 PR Finalization Plan"
status: active
owner: engineer
created: 2026-05-15
updated: 2026-05-15
tags: [plan, billing, tik-013, m1]
project: cl303-ledger-clone-chavez
---

# Plan: Issue #22 TIK-013 Milestone 1 PR Finalization

**Issue:** https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/22  
**Branch:** `issue-22-m1-billing-primitives`  
**Budget:** $100 USD (epic total), ~$15 estimated for M1

---

## Situation Assessment

### Work Already Completed

The previous engineer session completed all M1 implementation:

1. ✅ Prisma schema + migration (`20260515_add_billing_primitives`)
2. ✅ Plan definitions in `src/lib/billing/plans.ts` (9 plans, 2 rails)
3. ✅ Entitlement library in `src/lib/billing/entitlements.ts`
4. ✅ Typed errors in `src/lib/billing/errors.ts`
5. ✅ Enforcement in `/api/narratives/generate` and `/api/cfo/chat`
6. ✅ Seed script `prisma/seed-plans.ts`
7. ✅ Full test suite `src/lib/billing/entitlements.test.ts`
8. ✅ Documentation in `strategy/CHANGELOG.md` and `.vault/tickets/22.md`

**Commits (5 total):**
- `fe0012d` Add billing schema and migration
- `5645f3a` Add entitlement library and plan definitions
- `71de093` Add entitlement enforcement to narrative and CFO endpoints
- `4de3cb0` Add M1 documentation
- `087388a` Add PR creation instructions

**Status:** Branch is ahead of `origin/main` by 5 commits. Needs push and PR creation.

### Issue with Previous Session

The previous engineer session encountered GH_TOKEN permission issues and could not push the branch or create the PR. They documented the manual steps in `PR_INSTRUCTIONS.md`.

### Current Session Goal

1. ✅ Verify auth is working (`gh api /user`)
2. ✅ Update `.cl303/learnings.md` with PR finalization notes
3. ✅ Push branch to origin
4. ✅ Create PR with the documented title and body
5. ✅ Emit PR URL for orchestrator

---

## Approach

### 1. Verify GitHub Auth

```bash
gh api /user 2>&1 | head -5
```

Expected: JSON with `"login"` field proves auth works.

### 2. Push Branch

```bash
git push origin issue-22-m1-billing-primitives
```

### 3. Create PR

Use `gh pr create` with:
- **Title:** `feat(billing): Milestone 1 — Pricing & Entitlements (Backend)`
- **Body:** From `PR_INSTRUCTIONS.md` (structured markdown with summary, changes, risks, etc.)
- **Base:** `main`

### 4. Record PR URL

Extract URL from `gh pr create` output and ensure it's visible to orchestrator.

### 5. Update Learnings

Append entry to `.cl303/learnings.md` documenting:
- PR successfully created
- Auth method (GH_TOKEN)
- Any gotchas encountered

---

## Acceptance Criteria

- [ ] Branch `issue-22-m1-billing-primitives` pushed to `origin`
- [ ] PR created with correct title, body, and base branch
- [ ] PR URL emitted to stdout (orchestrator requirement)
- [ ] `.cl303/learnings.md` updated with PR finalization notes
- [ ] No new code changes (only push + PR creation)

---

## Risks

1. **GH_TOKEN permissions**: Previous session reported issues. Mitigation: Verify with `gh api /user` first.
2. **Branch conflicts**: If `main` has moved forward. Mitigation: Check diff, rebase if needed (but unlikely in 15 minutes).
3. **PR body formatting**: Complex markdown with code blocks. Mitigation: Use heredoc or temp file for `gh pr create --body-file`.

---

## Budget

Estimated: $2 USD (push + PR creation is cheap, no code changes)

---

## Notes

- This is a **finalization-only** task. All implementation is done.
- M2 (agent rail) and M3 (Stripe + UI) are follow-up PRs, not part of this session.
- The epic has 7 milestones total; M1 is the foundation.
