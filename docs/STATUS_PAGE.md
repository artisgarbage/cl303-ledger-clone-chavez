# System Status Page

## Overview

The `/status` page provides real-time health monitoring for platform services:

- Database (PostgreSQL)
- AI Narratives (Anthropic Claude)
- Harvest Sync (Time tracking)
- Forecast Sync (Capacity planning)

## Implementation

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

- Link from authenticated dashboard sidebar to status page

✅ **Authentication**

- Protected by NextAuth.js session middleware (`src/middleware.ts`)
- ADMIN role: sees configuration labels and detailed error messages

✅ **Tests**

- 27 unit tests for API route
- Full coverage of status calculations
- Security checks (no secret leakage)

### Configuration

Services are configured via environment variables (local) or GCP Secret Manager via ESO (production):

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

In production these are managed by External Secrets Operator pulling from GCP Secret Manager (see [docs/deploy/architecture.md](deploy/architecture.md)).

## Tests

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx vitest run src/app/api/status/ src/app/api/healthz/ --reporter=verbose
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
