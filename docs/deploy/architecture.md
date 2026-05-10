# Ledger — Architecture

## Overview

Single-tenant SaaS financial platform deployed on GCP. One GKE Autopilot
cluster per environment (dev, prod), private VPC, Cloud SQL Postgres 16,
GCS for raw financial file storage. All infrastructure is reproducible via
Terraform; all workload config is expressed as Helm values.

## Component Map

```
Internet
  │
  ▼
Google Cloud Load Balancer (GKE Gateway — L7 HTTPS)
  │  TLS terminated via Certificate Manager (Google-managed cert)
  ▼
HTTPRoute (ledger-app-gateway, namespace ledger-prod)
  │
  ▼
Service: ledger-app :3000 (ClusterIP)
  │
  ▼
Deployment: ledger-app
  ├── Container: ledger-app (Next.js, port 3000, uid 1001)
  │     envFrom: K8s Secret "ledger-app-secrets"  ◄── ESO sync from Secret Manager
  │     volumes: none (stateless)
  │
  └── Sidecar: cloud-sql-proxy (uid 65532, private-ip, port 5432)
        │  authenticates via Workload Identity (no SA keys)
        ▼
      Cloud SQL Auth Proxy Wire (private VPC)
        ▼
      Cloud SQL Postgres 16 (private IP, CMEK, REGIONAL HA, PITR)

App egress:
  ├── 127.0.0.1:5432 → cloud-sql-proxy → Cloud SQL (private IP)
  ├── GCP APIs (Private Google Access) → Secret Manager, GCS, Logging, Monitoring
  └── 0.0.0.0/0:443 → Anthropic API (api.anthropic.com)

Financial file path:
  Operator → GCS Bucket (codelab303-ledger-financials-prod, CMEK, UBLA)
    │  admin hits POST /api/admin/ingest { gcsUri, basis }
    ▼
  App reads blob via Workload Identity → hashes → parses → writes to Cloud SQL
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

| Store                 | Encryption                                                |
| --------------------- | --------------------------------------------------------- |
| Cloud SQL             | CMEK — `ledger-cmek` (KMS `us-central1`, 90-day rotation) |
| GCS financials bucket | CMEK — same key                                           |
| GCS TF state bucket   | Google-managed (GMEK) — acceptable for infra state        |
| K8s etcd              | GKE-managed encryption                                    |
| Secret Manager        | Google-managed (built-in)                                 |

## Threat Model (summary)

| Threat                               | Control                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Credential exfiltration via env file | No SA keys anywhere; WIF for CI; Workload Identity for pods                                  |
| Financial data leakage via API       | Auth required on all routes; ADMIN role for ingest; never logged                             |
| Financial data leakage to LLM        | Only aggregated metrics sent to Anthropic; raw rows never included; `narrativesEnabled` flag |
| Lateral movement from pod            | NetworkPolicy restricts egress; read-only filesystem on proxy                                |
| Supply chain attack (image)          | Binary Authorization (policy TBD), Artifact Registry cleanup policies                        |
| Insider threat                       | Audit logging on all GCP data access; app-level audit trail in DB                            |
| Setup_data XLSX in git               | Documented in bootstrap.md; must run git filter-repo before any team member clones           |

## Namespace Layout

```
Cluster: ledger-cluster-{env}
  ├── ledger-dev      ← dev workloads
  ├── ledger-prod     ← prod workloads
  └── external-secrets ← ESO operator
```

## Network

```
VPC: ledger-vpc
  Subnet: ledger-subnet (10.10.0.0/20)
    Pod range:     10.20.0.0/14
    Service range: 10.24.0.0/20

Private Service Access → Cloud SQL (10.200.0.0/16)
Cloud NAT → outbound internet (Anthropic API)
Private Google Access → GCP APIs without internet path
```
