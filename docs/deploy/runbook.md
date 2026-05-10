# Ledger — Operator Runbook

## Check app health

```sh
kubectl get pods -n ledger-prod
kubectl logs -n ledger-prod -l app.kubernetes.io/name=ledger-app -c ledger-app --tail=50
curl -sf https://ledger.codelab303.io/api/healthz | jq .
```

## Rollback a release

```sh
helm history ledger-app -n ledger-prod
helm rollback ledger-app <REVISION> -n ledger-prod --wait
```

## Scale manually

```sh
kubectl scale deployment ledger-app -n ledger-prod --replicas=4
```

## Force pod restart

```sh
kubectl rollout restart deployment/ledger-app -n ledger-prod
kubectl rollout status deployment/ledger-app -n ledger-prod
```

## Rotate a Secret Manager secret

```sh
# Example: rotate NEXTAUTH_SECRET
NEW_VAL=$(openssl rand -base64 32)
gcloud secrets versions add ledger-nextauth-secret-prod \
  --data-file=<(echo -n "$NEW_VAL") \
  --project codelab303-ledger

# ExternalSecret refreshes automatically within refreshInterval (1h).
# Force immediate refresh:
kubectl annotate externalsecret ledger-app-secrets \
  -n ledger-prod \
  force-sync=$(date +%s) --overwrite

# Restart pods to pick up new secret:
kubectl rollout restart deployment/ledger-app -n ledger-prod
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

# Cloud SQL and GCS automatically pick up the new primary version.
# Old versions remain for decrypting existing data until explicitly destroyed.
```

## Revoke a user's access

```sh
# 1. Disable the user in the app database:
#    UPDATE "User" SET role = 'VIEWER' WHERE email = 'user@example.com';
#    (or delete the row)

# 2. If the user has a GSA or kubectl binding, remove it:
gcloud projects remove-iam-policy-binding codelab303-ledger \
  --member="user:user@example.com" \
  --role="roles/viewer"

# 3. Invalidate active sessions by rotating NEXTAUTH_SECRET (see above).
```

## View audit logs for financial data access

```sh
# Cloud Logging — Data Access logs
gcloud logging read \
  'logName=~"cloudaudit.googleapis.com/data_access" AND resource.type="gcs_bucket"' \
  --project codelab303-ledger \
  --freshness=24h \
  --format=json | jq '.[] | {time: .timestamp, user: .protoPayload.authenticationInfo.principalEmail, method: .protoPayload.methodName, resource: .protoPayload.resourceName}'

# App-level audit logs (structured JSON from src/lib/audit.ts)
gcloud logging read \
  'jsonPayload.level="AUDIT"' \
  --project codelab303-ledger \
  --freshness=24h \
  --format=json | jq '.[] | {time: .timestamp, action: .jsonPayload.action, user: .jsonPayload.userId}'
```

## Wipe a tenant's data

```sh
# Connect to Cloud SQL via proxy:
cloud-sql-proxy codelab303-ledger:us-central1:ledger-postgres-prod &
psql "postgresql://ledger_app_prod:PASSWORD@localhost:5432/ledger_prod"

# In psql — replace COMPANY_ID with the actual cuid:
BEGIN;
DELETE FROM "IngestAudit" WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "Narrative" WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "LineItem" WHERE "periodId" IN (SELECT id FROM "FinancialPeriod" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "FinancialPeriod" WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "DataImport" WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "RevenueRecord" WHERE "projectId" IN (SELECT id FROM "Project" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "TimeEntry" WHERE "projectId" IN (SELECT id FROM "Project" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "Allocation" WHERE "projectId" IN (SELECT id FROM "Project" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "Project" WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "CompensationRecord" WHERE "personId" IN (SELECT id FROM "Person" WHERE "companyId" = 'COMPANY_ID');
DELETE FROM "Person" WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "CompanySettings" WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "User" WHERE "companyId" = 'COMPANY_ID';
DELETE FROM "Company" WHERE id = 'COMPANY_ID';
COMMIT;
```

## Debug: exec into a pod

```sh
kubectl exec -it -n ledger-prod \
  $(kubectl get pod -n ledger-prod -l app.kubernetes.io/name=ledger-app -o name | head -1) \
  -c ledger-app -- sh
```

## Check External Secrets sync status

```sh
kubectl get externalsecret -n ledger-prod
kubectl describe externalsecret ledger-app-secrets -n ledger-prod
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
# unreadable. This includes Cloud SQL data and GCS objects. Use only as a
# last resort in a confirmed breach.
```
