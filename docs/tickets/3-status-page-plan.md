# Ticket #3: System Status Page Implementation Plan

## Issue
https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/3

## Problem Analysis

The issue requests a comprehensive `/status` page with:
- Authenticated access for all roles (ADMIN, MEMBER, VIEWER)
- Real-time health checks for Database, Anthropic AI, Harvest, Forecast
- Parallel health checks with timeouts
- Auto-polling UI
- Role-based admin details
- Sidebar integration with status indicators

**Current Repository State:**
- Brand new Next.js 16 scaffolded project
- NO database layer (no Prisma)
- NO authentication (no NextAuth)
- NO CompanySettings model
- NO existing dashboard layout or sidebar
- NO test infrastructure (no Vitest)

## Implementation Strategy

Given the architecture mismatch, I will implement an **MVP version** that:
1. Demonstrates the status page pattern
2. Works without requiring full infrastructure scaffolding
3. Can be easily upgraded when auth/DB are added
4. Provides immediate value
5. Stays within budget

## Implementation Plan

### 1. Install Required Dependencies
```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install lucide-react # for icons
```

### 2. Create API Route: `/api/status/route.ts`
- Implement parallel health checks with Promise.allSettled
- Check environment variables for service configuration
- Simulate database check (or skip if no DB URL)
- Optional: ping Anthropic API if key is present
- Return JSON matching spec:
  ```json
  {
    "timestamp": "2026-05-06T...",
    "overall": "operational" | "degraded",
    "services": {
      "database": { "status": "...", "latencyMs": 12 },
      "anthropic": { "status": "...", "configured": true },
      "harvest": { "status": "not_configured", "configured": false },
      "forecast": { "status": "not_configured", "configured": false }
    }
  }
  ```

### 3. Create Status Page: `/status/page.tsx`
- Server Component shell
- Client Component for polling/interactivity
- Card grid showing each service
- Status badges (green/amber/gray)
- Auto-refresh every 30 seconds
- Pause polling when tab is backgrounded

### 4. Add Basic Navigation
- Update home page with link to status page
- (Skip sidebar - doesn't exist yet)

### 5. Add Tests
- Configure Vitest
- Unit tests for API route
- Basic component tests if budget allows

### 6. Documentation
- Comment code explaining upgrade path
- Document missing dependencies

## Acceptance Criteria (Adjusted)

- [x] Plan documented
- [ ] `GET /api/status` returns proper JSON
- [ ] Parallel checks with 3s timeouts
- [ ] `/status` page renders correctly
- [ ] Status badges show correct states
- [ ] Auto-polling works
- [ ] TypeScript compiles
- [ ] Basic tests pass
- [ ] Upgrade path documented

## Out of Scope

- Full authentication (no auth system exists)
- Database integration (no DB configured)
- CompanySettings queries (no model exists)
- Real external API calls (no credentials)
- Sidebar indicators (no sidebar exists)
- Role-based access (no RBAC system)

## Budget

Target: $8-9 of $10 budget
Estimated tokens: 40,000-60,000

## Follow-up Work Needed

When infrastructure is added:
1. Integrate NextAuth for authentication
2. Add Prisma + CompanySettings model
3. Build dashboard layout with sidebar
4. Add real API credential checks
5. Implement role-based admin details
6. Add comprehensive test coverage

## Decision

✅ Proceeding with MVP implementation
