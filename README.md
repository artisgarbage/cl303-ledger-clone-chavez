# Ledger — Financial Intelligence Platform

Financial analytics and AI-powered reporting for professional-services agencies. Built on Next.js 16, PostgreSQL, and Claude AI.

**Production:** https://ledger-dev.codelab303.io  
**Local dev:** http://localhost:3000

---

## What it does

- **P&L dashboard** — cash and accrual gross margin, net margin, COGS breakdown, revenue velocity, and EOY projections across multiple financial periods
- **Project profitability** — true cost per project (payroll + contractor lag + overhead allocation), billable-hour tracking, blended rate analysis
- **People / utilization** — per-person true cost, billable vs. internal allocation, compensation records
- **QuickBooks import** — XLSX ingestion pipeline with audit trail (`IngestAudit`)
- **AI narratives** — opt-in Claude-generated financial summaries; line-item names are redacted before transmission (see [docs/security/ai-egress.md](docs/security/ai-egress.md))
- **Margot — CFO agent** — conversational AI CFO at `/cfo`; tool-calling loop over real financial data; three audience modes (Internal, Proposal/BizDev, Board/Investor)
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

# 3. Seed with sample financial data
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx tsx prisma/seed.ts

# 4. Start dev server
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  NEXTAUTH_URL="http://localhost:3000" \
  npm run dev
```

Login: `anthony@codelab303.com` / `ledger2026!`

---

## Running tests

```bash
# All tests
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" npx vitest run

# CFO agent + API routes (109 tests)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx vitest run src/lib/cfo-agent/ src/app/api/cfo/ --reporter=verbose

# With coverage
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
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
  seed.ts            # Sample codelab303 LLC data (2023–2026 P&L)

infra/terraform/     # GCP infrastructure (GKE, Cloud SQL, KMS, IAM, DNS)
deploy/helm/         # Kubernetes manifests (Deployment, Gateway, ESO, Jobs, HPA, PDB, NP)
docs/
  deploy/            # Bootstrap, architecture, runbook, incident response
  security/          # Audit report, AI egress policy, SEC-03 migration guide
  environments.md    # Local dev + production environment reference
```

Key data models: `Company`, `User`, `FinancialPeriod`, `LineItem`, `Project`, `Person`, `CompensationRecord`, `TimeEntry`, `Allocation`, `Narrative`, `IngestAudit`, `Conversation`, `Message`, `AccessAudit`.

---

## Deployment

Deployed to GCP GKE via Helm. Images tagged by git SHA and pushed to Artifact Registry.

```bash
IMAGE_TAG=$(git rev-parse HEAD)
IMAGE="us-central1-docker.pkg.dev/codelab303-ledger/ledger-app/ledger-app:${IMAGE_TAG}"

docker build --platform linux/amd64 -t "$IMAGE" .
docker push "$IMAGE"

helm upgrade --install ledger-app deploy/helm/ledger-app \
  --namespace ledger-dev \
  --create-namespace \
  -f deploy/helm/ledger-app/values.yaml \
  -f deploy/helm/ledger-app/values-dev.yaml \
  --set image.tag="$IMAGE_TAG" \
  --set gateway.certificateMapId="ledger-cert-map-dev" \
  --set cloudSql.connectionName="codelab303-ledger:us-central1:ledger-postgres-dev" \
  --wait --timeout 15m
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
- No SA key files; GKE Workload Identity + ESO for secrets
