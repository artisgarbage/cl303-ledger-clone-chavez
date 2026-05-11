# Environments

## Local Development

| Item | Value |
|---|---|
| URL | `http://localhost:3000` |
| Test credentials | `anthony@codelab303.com` / `ledger2026!` |
| Database | Docker Postgres on port `5433` — start with `docker compose up -d` |
| Database name | `ledger` |
| Connection string | `postgresql://postgres:postgres@localhost:5433/ledger` |

**Start the dev server:**
```bash
docker compose up -d
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  NEXTAUTH_URL="http://localhost:3000" \
  npm run dev
```

**After a Prisma migration:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx prisma migrate dev
npx prisma generate
# Then restart the dev server (Turbopack caches the old client)
```

---

## Production (GCP / GKE)

| Item | Value |
|---|---|
| URL | `https://ledger-dev.codelab303.io` |
| GCP project | `codelab303-ledger` |
| Cluster | `ledger-cluster-dev` (us-central1) |
| Namespace | `ledger-dev` |
| Helm release | `ledger-app` |
| Cloud SQL instance | `codelab303-ledger:us-central1:ledger-postgres-dev` |
| Artifact Registry | `us-central1-docker.pkg.dev/codelab303-ledger/ledger-app/ledger-app:<git-sha>` |

**Check live deployment:**
```bash
helm status ledger-app -n ledger-dev
kubectl get pods -n ledger-dev
```

**Connect to Cloud SQL (via proxy):**
```bash
cloud-sql-proxy codelab303-ledger:us-central1:ledger-postgres-dev --port 5434
```

**Deploy:** Images are tagged by git SHA and deployed via Helm. Increment the image tag in the Helm values to roll out a new image:
```bash
helm upgrade ledger-app ./helm -n ledger-dev \
  --set image.tag=<git-sha>
```

---

## Running Tests

```bash
# Full Margot (CFO agent) test suite
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx vitest run src/lib/cfo-agent/ src/app/api/cfo/ --reporter=verbose

# All tests
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx vitest run

# With coverage
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" \
  npx vitest run --coverage
```

Current coverage scope (configured in `vitest.config.mts`):
- `src/lib/utils/comparison.ts`
- `src/lib/utils/chart-data.ts`
- `src/lib/cfo-agent/**/*.ts`
- `src/app/api/cfo/**/*.ts`
