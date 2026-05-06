# System Status Page

## Overview

The `/status` page provides real-time health monitoring for platform services:
- Database (PostgreSQL)
- AI Narratives (Anthropic Claude)
- Harvest Sync (Time tracking)
- Forecast Sync (Capacity planning)

## Current Implementation (MVP)

This is an **MVP implementation** that demonstrates the status page pattern without requiring full infrastructure scaffolding.

### Features Implemented

✅ **API Endpoint**: `GET /api/status`
- Returns JSON with health status for all services
- Parallel checks with 3-second timeouts
- Graceful error handling
- No secrets exposed in responses

✅ **Status Page UI**: `/status`
- Card grid showing each service
- Status badges (Operational, Degraded, Not Configured)
- Auto-polling every 30 seconds
- Pauses when tab is backgrounded
- Manual refresh button
- Overall system status indicator

✅ **Navigation**
- Link from home page to status page

✅ **Tests**
- 27 unit tests for API route
- Full coverage of status calculations
- Security checks (no secret leakage)

### Configuration

Services are configured via environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-...

# Harvest (Time tracking)
HARVEST_ACCESS_TOKEN=your-token
HARVEST_ACCOUNT_ID=12345

# Forecast (Capacity planning)
FORECAST_ACCOUNT_ID=12345
```

If environment variables are not set, services will show as "Not Configured".

## What's Missing (Production Requirements)

The original issue (#3) requires additional infrastructure that doesn't exist in this repo yet:

### 🔐 Authentication System
- **Required**: NextAuth.js (Auth.js) with session management
- **Required**: User model with roles (ADMIN, MEMBER, VIEWER)
- **Issue**: No auth system exists yet
- **Impact**: Status page is currently public (should be authenticated)

### 🗄️ Database Layer
- **Required**: Prisma ORM + PostgreSQL connection
- **Required**: CompanySettings model to store API credentials per company
- **Issue**: No database schema exists yet
- **Impact**: Using environment variables instead of per-company settings

### 🎨 Dashboard Layout
- **Required**: Sidebar navigation component
- **Required**: Dashboard layout wrapper
- **Issue**: No shared layout exists yet
- **Impact**: Status page is standalone, no sidebar integration

### 👥 Role-Based Access
- **Required**: Admin-only configuration details
- **Required**: Middleware for role checking
- **Issue**: No RBAC system exists yet
- **Impact**: All users see the same view

### 📊 Sidebar Status Indicator
- **Required**: Degraded service indicator dot in sidebar
- **Required**: Lightweight status polling
- **Issue**: No sidebar component exists yet
- **Impact**: No navigation-level status indicator

## Upgrade Path

To implement the full production version, follow these steps:

### Step 1: Set up Database
```bash
npm install prisma @prisma/client
npx prisma init
```

Create schema with User, Company, and CompanySettings models.

### Step 2: Add Authentication
```bash
npm install next-auth @auth/prisma-adapter
```

Configure NextAuth with database adapter and role-based sessions.

### Step 3: Create Dashboard Layout
- Create `src/app/(dashboard)/layout.tsx`
- Add Sidebar component with navigation
- Move status page to `src/app/(dashboard)/status/page.tsx`

### Step 4: Add Middleware
```typescript
// src/middleware.ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Step 5: Update Status API
- Check session with `await auth()`
- Return 401 if no session
- Query CompanySettings from database
- Use company-specific credentials for checks

### Step 6: Add Admin Details
- Check user role in StatusClient
- Show configuration labels for ADMIN users
- Show error details for ADMIN users

### Step 7: Add Sidebar Indicator
- Poll `/api/status` from layout
- Show amber/red dot when degraded
- Update on status changes

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Build for production:
```bash
npm run build
```

## API Reference

### GET /api/status

Returns current health status for all services.

**Response:**
```json
{
  "timestamp": "2026-05-06T19:00:00.000Z",
  "overall": "operational" | "degraded",
  "services": {
    "database": {
      "status": "operational" | "degraded" | "not_configured",
      "configured": true | false,
      "latencyMs": 12
    },
    "anthropic": {
      "status": "operational" | "degraded" | "not_configured",
      "configured": true | false
    },
    "harvest": {
      "status": "operational" | "degraded" | "not_configured",
      "configured": true | false
    },
    "forecast": {
      "status": "operational" | "degraded" | "not_configured",
      "configured": true | false
    }
  }
}
```

**Status Values:**
- `operational`: Service is working correctly
- `degraded`: Service is configured but failing (API error, timeout, bad credentials)
- `not_configured`: Required credentials are missing

**Overall Status:**
- `operational`: All configured services are operational
- `degraded`: At least one configured service is degraded

Note: Unconfigured services (`not_configured`) do not affect the overall status.

## Related Issues

- Issue #3: System status page (this implementation)
- Follow-up needed: Authentication system
- Follow-up needed: Database schema
- Follow-up needed: Dashboard layout

## License

See repository LICENSE file.
