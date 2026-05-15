# Environments

## Local Development

| Item              | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| URL               | `http://localhost:3000`                                            |
| Test credentials  | codelab303 LLC: `anthony@codelab303.com` / `ledger2026!`           |
|                   | Yolo, Inc.: `anthony+yolo@codelab303.com` / `ledger2026!`          |
| Database          | Docker Postgres on port `5433` — start with `docker compose up -d` |
| Database name     | `ledger`                                                           |
| Connection string | `postgresql://postgres:postgres@localhost:5433/ledger`             |

**Start the dev server:**

```bash
docker compose up -d
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  NEXTAUTH_URL="http://localhost:3000" \
  npm run dev
```

**First-time seed (two test companies):**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" npx tsx prisma/seed.ts
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" npx tsx prisma/seed-yolo.ts
```

**After a Prisma migration:**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx prisma migrate dev
npx prisma generate
# Then restart the dev server (Turbopack caches the old client)
```

---

## Production (GCP / Cloud Run)

| Item               | Value                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------- |
| URL                | `https://margot-app-dev-aywfwftmeq-uc.a.run.app`                                             |
| GCP project        | `codelab303-ledger`                                                                          |
| Cloud Run service  | `margot-app-dev` (us-central1)                                                               |
| Migrate job        | `margot-migrate-dev` (Cloud Run Job)                                                         |
| Cloud SQL instance | `codelab303-ledger:us-central1:ledger-postgres-dev` (public IP `34.60.4.43`)                 |
| DB name            | `ledger_dev` / user `ledger_app_dev`                                                         |
| Secret Manager key | `ledger-database-url-dev`                                                                    |
| Artifact Registry  | `us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev:latest` |

**Check live deployment:**

```bash
gcloud run services describe margot-app-dev --region us-central1 --project codelab303-ledger
curl -sf https://margot-app-dev-aywfwftmeq-uc.a.run.app/api/healthz | jq .
```

**Full deploy pipeline:**

```bash
# Build + push image via Cloud Build
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

**Rollback to a previous revision:**

```bash
# List revisions
gcloud run revisions list --service=margot-app-dev --region=us-central1 --project=codelab303-ledger

# Route 100% traffic to a previous revision
gcloud run services update-traffic margot-app-dev \
  --to-revisions=margot-app-dev-00010-jxh=100 \
  --region=us-central1 --project=codelab303-ledger
```

**View logs:**

```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=margot-app-dev" \
  --project=codelab303-ledger --limit=50 --order=desc \
  --format="value(timestamp,textPayload)"
```

Full deploy guide: [docs/deploy/README.md](deploy/README.md)

---

## Running Tests

Tests are fully mocked — no live DB or external services required.

```bash
# All tests (267 tests)
npx vitest run

# CFO agent + billing + API routes
npx vitest run src/lib/cfo-agent/ src/lib/billing/ src/app/api/ --reporter=verbose

# With coverage
npx vitest run --coverage
```
