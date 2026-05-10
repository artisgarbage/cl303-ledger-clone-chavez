# Ledger — Incident Response

## Severity levels

| Level | Example                                                                 | Response                            |
| ----- | ----------------------------------------------------------------------- | ----------------------------------- |
| P0    | Financial data exfiltrated; DB accessible from internet                 | Immediate kill switch; page on-call |
| P1    | Unauthorized user accessing another company's data; prod down           | Engage within 30 min                |
| P2    | Secret Manager secret possibly exposed; single user account compromised | Engage within 2h                    |
| P3    | Suspected brute force; anomalous API call volume                        | Investigate next business day       |

---

## Playbook: Suspected data leak

### 1. Contain immediately

```sh
# Option A: Scale app to zero (fastest, reversible)
kubectl scale deployment/ledger-app --replicas=0 -n ledger-prod

# Option B: Block external traffic at Gateway level
kubectl delete httproute ledger-app-https -n ledger-prod

# Option C: Nuclear — KMS key destruction (irreversible, see runbook.md)
# Use ONLY if you have confirmed exfiltration of the DB or GCS.
```

### 2. Identify the breach scope

```sh
# Who accessed the GCS financials bucket in the last 24h?
gcloud logging read \
  'logName=~"cloudaudit.googleapis.com/data_access" AND resource.type="gcs_bucket" AND resource.labels.bucket_name="codelab303-ledger-financials-prod"' \
  --project codelab303-ledger \
  --freshness=24h \
  --format=json | jq '.[] | {time:.timestamp, user:.protoPayload.authenticationInfo.principalEmail, method:.protoPayload.methodName}'

# Who accessed Secret Manager?
gcloud logging read \
  'logName=~"cloudaudit.googleapis.com/data_access" AND resource.type="secretmanager.googleapis.com/Secret"' \
  --project codelab303-ledger \
  --freshness=24h \
  --format=json | jq '.[] | {time:.timestamp, user:.protoPayload.authenticationInfo.principalEmail, secret:.protoPayload.resourceName}'

# App-level ingest operations
gcloud logging read \
  'jsonPayload.action=~"INGEST"' \
  --project codelab303-ledger \
  --freshness=48h \
  --format=json | jq '.'
```

### 3. Rotate all secrets

```sh
# NEXTAUTH_SECRET (invalidates all active sessions)
NEW=$(openssl rand -base64 32)
gcloud secrets versions add ledger-nextauth-secret-prod \
  --data-file=<(echo -n "$NEW") --project codelab303-ledger

# DATABASE_URL (create a new DB user, update secret)
# Revoke Anthropic API key at console.anthropic.com
# CRON_SECRET
NEW=$(openssl rand -hex 32)
gcloud secrets versions add ledger-cron-secret-prod \
  --data-file=<(echo -n "$NEW") --project codelab303-ledger

# Force ESO to re-sync
kubectl annotate externalsecret ledger-app-secrets \
  -n ledger-prod force-sync=$(date +%s) --overwrite
```

### 4. Revoke the suspected principal

```sh
# Revoke GCP IAM for a compromised service account
gcloud iam service-accounts disable ledger-ci@codelab303-ledger.iam.gserviceaccount.com

# Revoke an individual user
gcloud projects remove-iam-policy-binding codelab303-ledger \
  --member="user:suspect@example.com" --role="roles/viewer"

# Disable app user in DB
# UPDATE "User" SET role = 'VIEWER' WHERE email = 'suspect@example.com';
```

### 5. Collect forensic evidence before restoring

```sh
# Snapshot current DB state
gcloud sql backups create --instance=ledger-postgres-prod \
  --project codelab303-ledger --description="forensic-$(date +%Y%m%d)"

# Export Cloud Logging to GCS for preservation
gcloud logging sinks create forensic-$(date +%Y%m%d) \
  storage.googleapis.com/codelab303-ledger-tfstate/forensics/$(date +%Y%m%d) \
  --log-filter='timestamp>="2025-01-01T00:00:00Z"' \
  --project codelab303-ledger
```

### 6. Restore service

```sh
# After rotating secrets and removing suspect access:
kubectl scale deployment/ledger-app --replicas=2 -n ledger-prod
kubectl rollout status deployment/ledger-app -n ledger-prod
curl -sf https://ledger.codelab303.io/api/healthz | jq .
```

---

## Playbook: Production is down

```sh
# Check pod status
kubectl get pods -n ledger-prod

# Check recent events
kubectl get events -n ledger-prod --sort-by=.lastTimestamp | tail -30

# Check app logs
kubectl logs -n ledger-prod -l app.kubernetes.io/name=ledger-app \
  -c ledger-app --previous --tail=100

# Check proxy logs
kubectl logs -n ledger-prod -l app.kubernetes.io/name=ledger-app \
  -c cloud-sql-proxy --tail=50

# Check if ESO sync succeeded
kubectl describe externalsecret ledger-app-secrets -n ledger-prod

# Rollback to last known good revision
helm history ledger-app -n ledger-prod
helm rollback ledger-app <REVISION> -n ledger-prod --wait
```

---

## Playbook: Secret Manager secret compromised

1. Add a new secret version with a new value
2. Disable the old version: `gcloud secrets versions disable VERSION_NUMBER --secret=SECRET_NAME`
3. Force ESO resync (see above)
4. Restart app pods

Do NOT destroy old versions until you confirm the new value is live and
no older deployment references the old version.

---

## Contacts

- GCP Project Owner: update this with team contact
- On-call rotation: update this with PagerDuty/OpsGenie link
- Anthropic: report compromised key at support@anthropic.com
