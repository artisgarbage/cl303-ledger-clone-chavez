# Ledger — Financial Intelligence Platform

Financial analytics and AI-powered reporting for professional-services agencies. Built on Next.js 16, PostgreSQL, and Claude AI.

**Production (dev):** https://margot-app-dev-aywfwftmeq-uc.a.run.app  
**Local dev:** http://localhost:3000

---

## What it does

- **P&L dashboard** — cash and accrual gross margin, net margin, COGS breakdown, revenue velocity, and EOY projections across multiple financial periods
- **Project profitability** — true cost per project (payroll + contractor lag + overhead allocation), billable-hour tracking, blended rate analysis
- **People / utilization** — per-person true cost, billable vs. internal allocation, compensation records
- **QuickBooks import** — XLSX ingestion pipeline with audit trail (`IngestAudit`)
- **AI narratives** — opt-in Claude-generated financial summaries; line-item names are redacted before transmission (see [docs/security/ai-egress.md](docs/security/ai-egress.md))
- **Margot — CFO agent** — conversational AI CFO at `/cfo`; tool-calling loop over real financial data; three audience modes (Internal, Proposal/BizDev, Board/Investor)
- **Billing & entitlements** — plan catalog (9 plans across Human and Agent rails), quota enforcement, usage metering; 402 responses on limit breach
- **System status** — `/status` page with live health checks for DB and AI services

---

## Quick start (local dev)

Full setup instructions: **[docs/environments.md](docs/environments.md)**

```bash
# 1. Start Docker Postgres
docker compose up -d

# 2. Apply migrations + generate Prisma client
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx prisma migrate deploy
npx prisma generate

# 3. Seed with sample financial data (codelab303 LLC + Yolo, Inc.)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx tsx prisma/seed.ts
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx tsx prisma/seed-yolo.ts

# 4. Start dev server
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  NEXTAUTH_URL="http://localhost:3000" \
  npm run dev
```

Test companies:

- **codelab303 LLC**: `anthony@codelab303.com` / `ledger2026!`
- **Yolo, Inc.**: `anthony+yolo@codelab303.com` / `ledger2026!`

---

## Running tests

```bash
# All tests (267 tests, all mocked — no live DB required)
npx vitest run

# CFO agent + API routes only
npx vitest run src/lib/cfo-agent/ src/app/api/cfo/ --reporter=verbose

# Billing entitlements only
npx vitest run src/lib/billing/ --reporter=verbose

# Watch mode
npx vitest

# With coverage
npx vitest run --coverage
```

---

## Architecture

```
src/
  app/
    (auth)/          # Login page
    (dashboard)/     # Authenticated pages: dashboard, projects, people, cfo, reports, imports, settings
    api/             # Route handlers (all auth-required; companyId-scoped)
    status/          # Public health status page
  lib/
    billing/         # Plan catalog, entitlements, quota, usage metering
      plans.ts       # 9 plan definitions (Human rail: FREE–ENTERPRISE; Agent rail: AGENT_DEV–LLM_FEDERATION)
      entitlements.ts# getActivePlan, assertEntitlement, assertMode, checkQuota, recordUsage
      errors.ts      # PlanUpgradeRequired, QuotaExceeded, EntitlementDenied
    cfo-agent/       # Margot — conversational CFO (Anthropic tool-use loop)
      tools/         # periods_getPnL, projects_list, narrative_recent, people_*
      context/       # Per-turn context builder
      policy/        # Output guards by audience mode
      transports/    # Web adapter
    engine/          # Financial computation: cost-basis, period-comparison, profitability
    narrative/       # Claude prompt builder for AI narrative generation
    parsers/         # QuickBooks XLSX parser
    utils/           # Currency, dates, chart data, comparison helpers
  components/
    dashboard/       # Charts
    layout/          # Sidebar
    shared/          # DataTable, Badge, StatTile, TrendIndicator, etc.
  middleware.ts      # Auth guard (NextAuth)

prisma/
  schema.prisma      # Full data model
  seed.ts            # codelab303 LLC data (2023–2026 P&L)
  seed-yolo.ts       # Yolo, Inc. data (fictional $5M/yr digital agency)
  seed-plans.ts      # Billing plan catalog (9 plans) — runs inside seed.ts

infra/terraform/     # GCP infrastructure (Cloud SQL, KMS, IAM, Artifact Registry, DNS)
deploy/helm/         # GKE Helm manifests (dormant — active deploy is Cloud Run)
docs/
  deploy/            # Bootstrap, architecture, runbook, incident response
  security/          # Audit report, AI egress policy, SEC-03 migration guide
  environments.md    # Local dev + production environment reference
```

Key data models: `Company`, `User`, `FinancialPeriod`, `LineItem`, `Project`, `Person`, `CompensationRecord`, `TimeEntry`, `Allocation`, `Narrative`, `IngestAudit`, `Conversation`, `Message`, `AccessAudit`, `Plan`, `Subscription`, `UsageEvent`, `OverageCharge`, `AgentIdentity`.

---

## Deployment

Deployed to GCP Cloud Run (`margot-app-dev`, `us-central1`). Images are built via Cloud Build and pushed to Artifact Registry.

```bash
# Build + push image
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev:latest \
  --project codelab303-ledger .

# Deploy new revision
gcloud run deploy margot-app-dev \
  --image us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev:latest \
  --region us-central1 \
  --project codelab303-ledger

# Run DB migrations (Cloud Run Job)
gcloud run jobs execute margot-migrate-dev \
  --region us-central1 --project codelab303-ledger --wait
```

Full deploy guide: **[docs/deploy/README.md](docs/deploy/README.md)**

---

## Security

Security audit completed May 2026. All P0 findings remediated. See **[docs/security/audit-2026-05.md](docs/security/audit-2026-05.md)**.

Key controls:

- All routes require NextAuth session; `companyId` scoping on every Prisma query
- IDOR guards: company + user isolation on `/api/cfo/conversations` and admin routes
- AI narrative opt-in required (`CompanySettings.narrativesEnabled`); line-item names redacted before Anthropic transmission
- Access audit log (`AccessAudit` table) for all financial data reads
- `prisma migrate deploy` (not `db push`) in container entrypoint
- Billing entitlement enforcement on `/api/cfo/chat` and `/api/narratives/generate`; 402 on quota breach
- No SA key files; Cloud Run service identity + Secret Manager for secrets
