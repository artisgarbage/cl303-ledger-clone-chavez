# Ledger — Data Handling Policy

This document describes the lifecycle of financial data in the system,
which personnel can access it, and what is and is not sent to external services.

---

## How financial data enters the system

1. **Operator uploads** a QuickBooks P&L `.xlsx` export to the GCS financials
   bucket (`codelab303-ledger-financials-prod`) using the `ledger-financials-prod`
   GCP service account (or via the GCS console if IAM allows).

2. **Admin user** logs into the app and calls:

   ```
   POST /api/admin/ingest
   { "gcsUri": "gs://codelab303-ledger-financials-prod/uploads/2024-q4.xlsx", "basis": "CASH" }
   ```

3. The app:
   - Validates the caller is `ADMIN` role
   - Validates the `gcsUri` points to the correct bucket
   - Fetches the file bytes from GCS using Workload Identity (no SA key)
   - Computes `sha256(bytes)` for deduplication and audit
   - Parses the XLSX with `parseQuickBooksXlsx()`
   - Writes parsed rows to `DataImport`, `FinancialPeriod`, `LineItem` tables
   - Writes an `IngestAudit` row (fileName, fileHash, rowCount, status)

4. The raw file bytes are **never stored to disk** inside the app container
   and **never logged**. The file remains in GCS as the source of truth.

---

## Where financial data lives

| Store                        | What                                                         | Access                                                              |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Cloud SQL (`ledger_prod` DB) | Parsed line items, period summaries, project P&L             | App pods via Cloud SQL Auth Proxy + DB credentials (Secret Manager) |
| GCS financials bucket        | Raw XLSX upload                                              | `ledger-financials-prod` GSA (write), `ledger-app-prod` GSA (read)  |
| App memory (runtime only)    | Parsed rows during ingest; aggregated metrics for dashboard  | Never persisted beyond DB write                                     |
| Cloud Logging                | Audit events (action, userId, companyId, fileHash, rowCount) | GCP IAM; no row-level data                                          |

---

## Who can read financial data

| Role                | Access                                            |
| ------------------- | ------------------------------------------------- |
| `ADMIN` (app role)  | All data for their company; can trigger ingest    |
| `MEMBER` (app role) | Dashboard, reports, projects for their company    |
| `VIEWER` (app role) | Read-only dashboard                               |
| Operators (GCP IAM) | GCS bucket objects only (raw files); no DB access |
| GCP Org Admins      | Via Cloud Audit Logs — access events are logged   |
| Anthropic API       | Aggregated metrics only — see section below       |

**Inter-company data isolation**: All queries are scoped to `companyId` from
the authenticated session. No cross-company joins exist in the codebase.

---

## What is and is not sent to Anthropic

The AI narrative feature (`POST /api/analysis/narrative`) constructs a prompt
using `buildNarrativePrompt()` from `src/lib/narrative/prompt-builder.ts`.

**What IS sent:**

- Aggregated percentage changes (e.g., "Revenue up 12%")
- Period labels (e.g., "Q4 2024 vs Q3 2024")
- Project count, headcount
- Top-level category totals (no line item names)

**What is NEVER sent:**

- Individual vendor names or employee names
- Raw dollar amounts at line-item level
- Customer names or PII of any kind
- Raw row data from the database
- GCS URIs or file names

**Gate:** The `narrativesEnabled` boolean on `CompanySettings` (default: `true`)
must be `true` for narratives to be generated. Tenants can disable it.

Anthropic receives no PII and no granular financial data. Prompts are
structured to prevent reconstruction of the underlying dataset.

---

## Audit trail

Every financial data access and mutation generates an audit event via
`src/lib/audit.ts`. Events are written as structured JSON to stdout and
captured by Cloud Logging.

Key events logged:

- `INGEST_START` — who triggered the ingest, which file (by hash, not content)
- `INGEST_SUCCESS` — rowCount, duration
- `INGEST_FAILED` — error type (not raw error message if it contains data)
- `NARRATIVE_REQUEST` — companyId, periodId (no prompt contents)

The `IngestAudit` table in Cloud SQL additionally records every ingest:

- `fileHash` (sha256)
- `fileName` (original name from GCS path)
- `rowCount`
- `status` (PENDING → SUCCESS | FAILED)
- `userId` of the triggering admin

---

## Retention

| Data                       | Retention                                       |
| -------------------------- | ----------------------------------------------- |
| Cloud SQL DB               | Until explicitly deleted (PITR 7 days in prod)  |
| GCS raw uploads            | No automatic deletion — operator manages bucket |
| Cloud Logging audit events | Default 30 days (configurable)                  |
| IngestAudit rows           | Until admin deletes (no automated purge)        |

---

## Data deletion (off-boarding)

See `docs/deploy/runbook.md` → "Wipe a tenant's data" for the SQL procedure
to remove all company data. GCS files must be deleted separately.
