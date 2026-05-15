# Ledger — Architecture

## Overview

Single-tenant SaaS financial platform deployed on GCP Cloud Run. The active
environment is `margot-app-dev` (Cloud Run service, `us-central1`), backed by
Cloud SQL Postgres 16 and Secret Manager. All infrastructure is reproducible
via Terraform. GKE Helm manifests exist in `deploy/helm/` but are dormant.

## Component Map

```
Internet
  │
  ▼
Cloud Run Service: margot-app-dev (us-central1)
  │  Container: ledger-app (Next.js, port 3000)
  │  Identity: margot-app-dev service account (Workload Identity)
  │  Secrets:  Secret Manager refs (DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_SECRET…)
  │
  ├── Cloud SQL (unix socket via Cloud SQL connector)
  │     ledger-postgres-dev (Postgres 16, CMEK, public IP with authorized networks)
  │     Database: ledger_dev, user: ledger_app_dev
  │
  ├── Anthropic API (api.anthropic.com:443)
  │     Used by: Margot CFO agent, narrative generation
  │
  └── GCP APIs → Secret Manager, Cloud Logging, Artifact Registry

Cloud Run Job: margot-migrate-dev
  │  Runs: npx prisma migrate deploy
  │  Triggered manually before each deploy
  │
  └── Cloud SQL (same connector as above)

Artifact Registry
  us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev

Cloud Build
  gcloud builds submit → builds Dockerfile → pushes to Artifact Registry

Financial file path:
  Operator → POST /api/admin/ingest { fileData, basis }
    ▼
  App hashes → parses → writes to Cloud SQL
    │  writes IngestAudit row (fileName, fileHash, rowCount, status)
    ▼
  Never stored again; never logged as raw content
```

## Identity & Access

| Principal                     | Type                       | Roles / Bindings                                                                                                                               |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ledger-app-prod@` GSA        | GCP Service Account        | `cloudsql.client`, `logging.logWriter`, `monitoring.metricWriter`, `secretmanager.secretAccessor`, `storage.objectViewer` on financials bucket |
| `ledger-financials-prod@` GSA | GCP Service Account        | `storage.objectAdmin` on financials bucket (write path for operators)                                                                          |
| `ledger-ci@` GSA              | GCP Service Account        | `artifactregistry.writer`, `container.developer`, `iam.serviceAccountTokenCreator` (for WIF)                                                   |
| GitHub Actions OIDC           | Federated identity         | Impersonates `ledger-ci@` via WIF pool `github-actions`, attribute-condition locked to `artisgarbage/cl303-ledger-clone-chavez`                |
| KSA `ledger-app`              | Kubernetes Service Account | Annotated with `iam.gke.io/gcp-service-account` for Workload Identity; bound to `ledger-app-prod@`                                             |

## Encryption At Rest

| Store             | Encryption                                                |
| ----------------- | --------------------------------------------------------- |
| Cloud SQL         | CMEK — `ledger-cmek` (KMS `us-central1`, 90-day rotation) |
| Secret Manager    | Google-managed (built-in)                                 |
| Artifact Registry | Google-managed (GMEK)                                     |

## Threat Model (summary)

| Threat                               | Control                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Credential exfiltration via env file | No SA keys anywhere; WIF for CI; Cloud Run service identity for app                          |
| Financial data leakage via API       | Auth required on all routes; ADMIN role for ingest; never logged                             |
| Financial data leakage to LLM        | Only aggregated metrics sent to Anthropic; raw rows never included; `narrativesEnabled` flag |
| Quota/plan abuse                     | Billing entitlement checks on `/api/cfo/chat` and `/api/narratives/generate`; 402 on breach  |
| Supply chain attack (image)          | Cloud Build provenance; Artifact Registry cleanup policies                                   |
| Insider threat                       | Audit logging on all GCP data access; app-level audit trail in DB                            |
| Setup_data XLSX in git               | Documented in bootstrap.md; must run git filter-repo before any team member clones           |

## Network

Cloud Run services egress to the internet via Google's managed network infrastructure.
Cloud SQL is accessible via the Cloud SQL Auth connector (unix socket, no public IP required
for the app runtime). The Cloud SQL instance has public IP enabled for operational access
(e.g. local seeding) — authorized networks are kept empty at rest and opened only during
maintenance windows.
