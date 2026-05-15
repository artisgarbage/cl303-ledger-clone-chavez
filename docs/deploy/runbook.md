# Ledger — Operator Runbook

## Check app health

```sh
curl -sf https://margot-app-dev-aywfwftmeq-uc.a.run.app/api/healthz | jq .
gcloud run services describe margot-app-dev --region us-central1 --project codelab303-ledger
```

## View logs

```sh
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=margot-app-dev" \
  --project=codelab303-ledger --limit=50 --order=desc \
  --format="value(timestamp,textPayload,jsonPayload.message)"
```

## Rollback a release

```sh
# List available revisions
gcloud run revisions list --service=margot-app-dev --region=us-central1 --project=codelab303-ledger

# Route 100% of traffic to a previous revision
gcloud run services update-traffic margot-app-dev \
  --to-revisions=<REVISION_NAME>=100 \
  --region=us-central1 --project=codelab303-ledger
```

## Scale manually

```sh
gcloud run services update margot-app-dev \
  --min-instances=2 --max-instances=10 \
  --region=us-central1 --project=codelab303-ledger
```

## Force restart (redeploy same image)

```sh
gcloud run deploy margot-app-dev \
  --image us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev:latest \
  --region us-central1 --project codelab303-ledger
```

## Run database migrations

```sh
gcloud run jobs execute margot-migrate-dev \
  --region us-central1 --project codelab303-ledger --wait

# Check job logs
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=margot-migrate-dev" \
  --project=codelab303-ledger --limit=20 --order=asc --format="value(textPayload)"
```

## Rotate a Secret Manager secret

```sh
# Example: rotate NEXTAUTH_SECRET
NEW_VAL=$(openssl rand -base64 32)
gcloud secrets versions add ledger-nextauth-secret-dev \
  --data-file=<(echo -n "$NEW_VAL") \
  --project codelab303-ledger

# Cloud Run picks up "latest" version on next deploy.
# Force pickup by deploying a new revision:
gcloud run deploy margot-app-dev \
  --image us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev:latest \
  --region us-central1 --project codelab303-ledger
```

## Rotate the KMS key

```sh
# Initiate a new key version (rotation_period handles this automatically,
# but you can also trigger manually):
gcloud kms keys versions create \
  --key ledger-cmek \
  --keyring ledger-keyring \
  --location us-central1 \
  --project codelab303-ledger

# Cloud SQL automatically picks up the new primary version.
# Old versions remain for decrypting existing data until explicitly destroyed.
```

## Revoke a user's access

```sh
# 1. Disable the user in the app database:
#    UPDATE "User" SET role = 'VIEWER' WHERE email = 'user@example.com';
#    (or delete the row)

# 2. If the user has a GCP IAM binding, remove it:
gcloud projects remove-iam-policy-binding codelab303-ledger \
  --member="user:user@example.com" \
  --role="roles/viewer"

# 3. Invalidate active sessions by rotating NEXTAUTH_SECRET (see above).
```

## View audit logs for financial data access

```sh
# App-level audit logs (structured JSON from src/lib/audit.ts)
gcloud logging read \
  'jsonPayload.level="AUDIT"' \
  --project codelab303-ledger \
  --freshness=24h \
  --format=json | jq '.[] | {time: .timestamp, action: .jsonPayload.action, user: .jsonPayload.userId}'
```

## Wipe a tenant's data

```sh
# Open Cloud SQL authorized networks to your IP temporarily:
MY_IP=$(curl -sf https://checkip.amazonaws.com)/32
gcloud sql instances patch ledger-postgres-dev \
  --authorized-networks="$MY_IP" \
  --project=codelab303-ledger --quiet

# Connect directly (replace PASSWORD with actual credential from Secret Manager):
psql "postgresql://ledger_app_dev:PASSWORD@34.60.4.43:5432/ledger_dev?sslmode=require"

# In psql — replace COMPANY_ID with the actual cuid:
BEGIN;
DELETE FROM "UsageEvent"          WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "OverageCharge"        WHERE "subscriptionId" IN (SELECT id FROM "Subscription" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "Subscription"         WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "IngestAudit"          WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "Narrative"            WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "LineItem"             WHERE "periodId" IN (SELECT id FROM "FinancialPeriod" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "FinancialPeriod"      WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "DataImport"           WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "RevenueRecord"        WHERE "projectId" IN (SELECT id FROM "Project" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "TimeEntry"            WHERE "projectId" IN (SELECT id FROM "Project" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "Allocation"           WHERE "projectId" IN (SELECT id FROM "Project" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "Project"              WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "CompensationRecord"   WHERE "personId" IN (SELECT id FROM "Person" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "Person"               WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "CompanySettings"      WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "User"                 WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "Company"              WHERE id = 'COMPANY_ID';
COMMIT;

# Clear authorized networks when done:
gcloud sql instances patch ledger-postgres-dev \
  --clear-authorized-networks \
  --project=codelab303-ledger --quiet
```

## KMS key destruction (kill switch — irreversible)

```sh
# Schedule key version for destruction (24h grace period):
gcloud kms keys versions destroy VERSION_NUMBER \
  --key ledger-cmek \
  --keyring ledger-keyring \
  --location us-central1 \
  --project codelab303-ledger

# WARNING: After destruction, all data encrypted with this key is permanently
# unreadable. This includes Cloud SQL data. Use only as a last resort in a
# confirmed breach.
```
