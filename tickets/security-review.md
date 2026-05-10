---
id: ticket-security-review
type: ticket
title: "Security review: codebase audit, immediate remediations, follow-up roadmap"
status: proposed
owner: cl303-automation
created: 2026-05-10
updated: 2026-05-10
tags: [ticket, security, audit, multi-tenancy, data-protection, p0]
project: cl303-ledger-clone-chavez
priority: P0
---

# Security review: codebase audit, immediate remediations, follow-up roadmap

## Summary

This platform is a financial system that stores and processes company P&L data, narratives generated from that data, and operator-grade integrations (Anthropic, Harvest/Forecast). The repo currently also carries **codelab303 LLC's own real financial files** in `setup_data/` — these were used to scaffold the product and to validate viability internally, and more such files will be added over time. They are the highest-sensitivity assets in the repo today.

We need cl303-automation, working with Claude, to perform a thorough security review of the codebase, ship a small set of immediate remediations to stop the bleeding, and produce a prioritized roadmap of follow-up issues that the automation can keep working through. Multi-tenancy is in scope — the schema has a `Company` boundary but enforcement across routes, queries, jobs, and AI prompts has not been audited end-to-end.

**First and foremost: protect codelab303's own financial data before anything else.** Multi-tenant isolation work follows immediately after.

## Why this matters

- `setup_data/*.xlsx` contains real codelab303 LLC P&L exports (2024, 2025, 2026 YTD cash + accrual). Those files are currently tracked in git and present in the Docker build context. Treat any past leak as ongoing until proven otherwise.
- `.env.docker` has historically held a real-looking `sk-ant-…` Anthropic key.
- The product surfaces financial data through APIs and an AI narrative pipeline. Both are channels for accidental egress.
- The data model has multi-tenancy primitives (`Company`, `companyId` on most domain models) but `User.companyId` is nullable and tenant-scoping is enforced ad-hoc per route. This is the kind of thing where one forgotten `where` clause leaks tenant A's data to tenant B.

## Scope

In scope:
- The full repository: app routes, server code, Prisma schema and migrations, seeds, scripts, Dockerfile, docker-compose, CI workflows under `.github/`, `tickets/`, `.vault/directives/`, `setup_data/` handling, and any deploy artifacts under `infra/`, `deploy/`, `docs/deploy/` if they exist.
- Authentication, authorization, multi-tenant isolation, secret handling, AI egress, file ingest paths, audit logging, dependency posture, container hygiene, and CI/CD posture.
- Git history (not just `HEAD`) for credentials and sensitive files.

Out of scope (file as separate tickets if found):
- Net-new product features.
- GCP infra build-out (tracked separately under deploy/Terraform/Helm work).
- Penetration testing of a deployed environment — this ticket is code + repo + supply chain only.

## Phase 1 — Discovery (read-only, no code changes)

Before changing anything, do a structured walk of the codebase and produce findings. Do not skip this in favor of jumping to fixes.

1. **Repo and history sweep.**
   - Inventory tracked files matching: `setup_data/**`, `*.xlsx`, `*.csv`, `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `id_rsa*`, anything under `tickets/` containing real customer data.
   - Run `gitleaks` (or equivalent) against the full history, not just the working tree. Capture every hit with commit SHA + path + rule.
   - Identify any image tag pushed to a registry that may contain `setup_data/`.

2. **Auth and session.** Walk the NextAuth setup end to end: providers, callbacks, session strategy, cookie flags (`Secure`, `HttpOnly`, `SameSite`), CSRF posture, password storage (bcrypt cost, reset flow, lockout, MFA state), email verification, and any "trust" bypasses in middleware.

3. **Authorization and tenant isolation.** For every route under `src/app/api/**`:
   - Does it require an authenticated session? Admin?
   - Does every Prisma query scope by `companyId`? Are there any `findMany`/`findFirst`/`update`/`delete` calls without a tenant predicate?
   - Are list endpoints paginated and capped?
   - Are IDs in path params validated against the caller's tenant before use (IDOR)?
   - Is `User.companyId` allowed to be null in practice, and what happens at runtime if it is?
   - Are background jobs, cron handlers, and seed scripts tenant-scoped?

4. **AI egress.** Trace the narrative pipeline: what exact text is sent to Anthropic, in what shape, with what redaction? Is there a per-tenant opt-in? Are prompts or responses logged with row contents? Does the Anthropic SDK call retry on 5xx in a way that could double-send sensitive payloads?

5. **File ingest and storage.** `prisma/seed-financials.ts`, `src/app/api/admin/ingest/route.ts`, `src/app/api/imports/quickbooks/route.ts`, and the XLSX parser. What checks gate file uploads? Where do uploaded files live? Are they ever written to ephemeral pod storage and forgotten? Are filenames or sheet names trusted for path or query construction?

6. **Secrets, env, and config.** Every place that reads `process.env`, every default fallback (`process.env.X || "…"`), every `.env*` file shape. Build-time placeholders in the `Dockerfile` should not be reachable at runtime.

7. **Container and runtime hygiene.** Re-read the `Dockerfile` and `docker-entrypoint.sh`: non-root user (good), but does `prisma db push` on every start expose us to schema drift in prod? Are `tmp` dirs writable only to the app user? Are unused devDeps shipping in the runner stage? Any `apk` packages with known CVEs?

8. **Logging and audit.** What gets logged at `info`/`warn`/`error`? Is structured logging in place? Are user emails, tenant ids, or financial values ever in log lines? Is there an audit trail for read/write of financial entities?

9. **Dependencies and supply chain.** `npm audit --omit=dev`, look for outdated majors with security implications, check `package-lock.json` for unexpected packages, check if any postinstall scripts run.

10. **CI/CD and branch protection.** `.github/workflows/**`, required reviews, required checks, who can push to `main`, environment protection rules, secrets exposure in workflows, third-party action pinning (commit SHA vs. tag).

11. **Vault directives.** Read `.vault/directives/**` and `vault/40-standards/repo-vault-contract.md` (if accessible) — do not violate anything codified there. If a finding contradicts a directive, raise it as a question, don't silently override.

## Phase 2 — Triage report (deliverable)

Produce `docs/security/audit-2026-05.md` with:

- **Executive summary**: 5–10 sentences a non-engineer can act on.
- **Findings table**: each finding with `id`, `title`, `severity (P0/P1/P2/P3)`, `category` (auth, tenancy, data-handling, secrets, container, supply-chain, logging, ci, other), `evidence` (file paths + line numbers + commit SHAs), `impact`, `recommendation`, `effort (S/M/L)`. No vague "improve security" entries.
- **Threat model**: top assets (codelab303 financials, tenant financials, Anthropic key, NextAuth secret, KMS keys), top adversaries (external internet, malicious tenant user, compromised dev laptop, supply-chain attacker, curious insider), trust boundaries, and the one-paragraph "what would a leak look like" for each asset.
- **Multi-tenancy isolation matrix**: every route × {auth required, admin required, tenant-scoped query, IDOR-safe, rate-limited, audit-logged} with a checkmark or a finding id.
- **Open questions for human decision**: anything that requires policy choice, not engineering judgment (e.g. "should narratives be opt-in per tenant or org-wide default off?").

This document is the source of truth that drives Phase 3 and Phase 4.

## Phase 3 — Immediate remediations (ship in this ticket)

These are the P0s. They go in this ticket as small, focused PRs (one PR per concern, each ≤ 400 lines diff). Open a PR per item and link back to this issue.

### 3.1 Protect codelab303 scaffolding data (highest priority)

- Rotate the Anthropic key currently or historically present in `.env.docker`. Replace with a freshly minted key, stored only in a secret manager. Confirm rotation in the Anthropic console.
- Purge from git history: `setup_data/**`, `.env.docker`, and any other file flagged by `gitleaks`. Use `git filter-repo` (preferred) or BFG. Force-push to all remotes, notify any forks/clones, and rotate every secret that has ever appeared.
- Update `.gitignore` to exclude `setup_data/`, `setup_data/**`, `*.xlsx`, `*.csv` outside of allowlisted fixture paths, and `.env`, `.env.*` (keep `!.env.local.example`).
- Update `.dockerignore` to exclude `setup_data/`, `setup_data/**`, `.env`, `.env.*`, and any seed scripts that embed real data. Verify the resulting image does not contain `setup_data` (`docker run --rm <img> ls /app/setup_data` must fail).
- Add `gitleaks` (or `trufflehog`) to CI on every push and weekly against full history. Fail closed on any hit.
- Add a `pre-commit` hook config blocking new files under `setup_data/` or matching the financial-file globs above.
- Document in `docs/security/data-handling.md` exactly where codelab303 financial files may live (developer working tree only, gitignored), how they get into a deployed environment (locked-down GCS bucket with CMEK, never via the image), and how they get destroyed.

### 3.2 Lock down secrets and config

- Remove all real-looking secret values from any committed file. Replace `.env.docker` with `.env.docker.example` carrying only placeholders.
- Audit every `process.env.X || "default"` and remove insecure fallbacks for security-relevant values (`NEXTAUTH_SECRET`, `CRON_SECRET`, `ANTHROPIC_API_KEY`, `DATABASE_URL`). Fail fast on missing values at boot.
- Confirm the build-time placeholders in `Dockerfile` cannot be reached at runtime. If they can, fail the build instead.

### 3.3 Multi-tenancy quick wins

- Make `User.companyId` non-null at the schema level (with a migration that backfills or removes any orphaned users). Update all code that assumed it could be null.
- Introduce a single helper, e.g. `requireTenant(session)`, that returns a non-null `companyId` or throws a 403, and route all API handlers through it.
- Add a Prisma middleware (or a thin repository layer) that enforces `companyId` on every read/write of tenant-scoped models — defense in depth against a forgotten `where` clause. Add a unit test that demonstrates it blocks cross-tenant access.
- Add an integration test per tenant-scoped route that creates two tenants and asserts tenant B's session cannot read or mutate tenant A's data, including by guessing IDs.

### 3.4 AI egress safety

- Default the Anthropic narrative feature to **off** per company. Add a `CompanySettings.aiNarrativesEnabled` boolean and gate `src/lib/narrative-builder.ts` and the routes that call it.
- Redact or aggregate before sending to the model: no raw line items with vendor/customer names unless the tenant has explicitly opted in. Document what is and isn't sent in `docs/security/ai-egress.md`.
- Strip the Anthropic API key from any error log or stack trace path. Add a test that a forced 500 from the SDK does not leak the key into the response or logs.

### 3.5 Logging and audit baseline

- Introduce structured logging with a request id and a tenant id, never with row contents.
- Add an `IngestAudit` (or extend an existing audit table) row for every file ingest: who, when, file SHA-256, byte size, row counts, success/failure. The raw file content is never logged.

Each of the above lands as its own PR with tests. Do not bundle.

## Phase 4 — Follow-up roadmap (file as separate GitHub issues, link them here)

After Phase 3 lands, open these as individual issues with the `security` label. cl303-automation should be able to pick them up one at a time. Order is suggested priority.

1. **Tenant-scoped Prisma client.** Replace ad-hoc `where: { companyId }` with a per-request scoped client that physically cannot query across tenants. Includes property-based tests.
2. **Row-level checks for cross-tenant ID access (IDOR).** Centralized helper that, given an entity type and id, asserts the caller's tenant owns it. Migrate every `[id]` route to use it.
3. **AuthZ matrix as code.** Encode "who can do what" as a single source of truth (e.g. CASL or a small in-house policy module). Generate the isolation matrix from it.
4. **Rate limiting and abuse controls.** Per-IP and per-user limits on auth, ingest, and narrative generation. Lockout on repeated failed logins. Bot/automation detection on ingest.
5. **MFA and session hardening.** TOTP MFA for admin role, configurable session lifetime, idle timeout, device list, "log out everywhere."
6. **Secret hygiene at runtime.** Move every secret to Secret Manager (or equivalent), no `.env` files in any deployed environment. Add a startup self-check.
7. **CMEK + private storage for tenant financials.** Per-tenant bucket prefix, CMEK key per tenant or per environment, lifecycle and retention policies, audit-log alerting on `storage.objects.get` patterns.
8. **Database hardening.** Cloud SQL IAM auth, private IP only, automated backups with CMEK, PITR in prod, restore drill in the runbook. Migrate from `prisma db push` on container start to versioned migrations gated to a one-shot job.
9. **NetworkPolicy / egress allowlist.** App pods can reach: Cloud SQL Auth Proxy, Secret Manager, the financials bucket, Anthropic, DNS. Nothing else.
10. **Dependency posture.** Add Renovate (or Dependabot) with auto-PR on patch/minor, gated CI. Pin GitHub Actions to commit SHAs. SBOM generation on release.
11. **CSP and web hardening.** Strict Content-Security-Policy, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, secure cookie flags audited in CI.
12. **Audit trail UI for admins.** Surface the audit log (no row contents) so an operator can see who looked at what. Export to CSV for compliance.
13. **Data subject controls.** Per-tenant export and delete endpoints. Soft-delete with retention window, hard-delete with KMS-key destruction as the kill switch.
14. **Threat detection and alerting.** Alerts on: bulk reads, narrative generation spikes, failed authn bursts, secret access anomalies, image pulls of unsigned tags.
15. **Incident response runbook.** Suspected-leak playbook (rotate keys, invalidate sessions, audit query template, customer comms checklist). Tabletop exercise once it exists.
16. **Penetration test prep.** Once the above is in, scope an external pen test against a staging environment. File the engagement as its own ticket.

## Acceptance criteria for **this** ticket

- [ ] `docs/security/audit-2026-05.md` exists and is reviewed.
- [ ] All Phase 3 items shipped, each as its own PR with tests, all merged.
- [ ] `gitleaks` runs in CI and is green; full-history scan green or all hits documented as accepted-and-purged.
- [ ] `setup_data/` is no longer tracked, no longer in any image, and is git-ignored. A test in CI fails if either invariant breaks.
- [ ] Anthropic key historically present in `.env.docker` is rotated; revocation confirmed.
- [ ] `User.companyId` is non-null; all routes go through `requireTenant`; cross-tenant integration tests pass.
- [ ] AI narratives default to off per tenant; redaction documented.
- [ ] Each Phase 4 roadmap item exists as its own GitHub issue, labeled `security`, linked back here.
- [ ] No new findings of severity P0 or P1 remain open at close-out.

## Working agreement

- Read `CLAUDE.md`, `AGENTS.md`, and `.vault/directives/**` before changing anything. Honor any constraint encoded there.
- Phase 1 is read-only. Do not modify code during discovery — collect findings, then plan.
- Open one PR per concern. Keep diffs ≤ 400 lines where possible. Each PR includes tests and a one-paragraph "what changed and why" in the description.
- For any decision that costs money, touches IAM, modifies the schema in a way that requires data migration, or rewrites git history: **stop and ask** before acting.
- Never paste real codelab303 financial values into PR descriptions, commit messages, issue comments, or test fixtures. Use synthetic data for tests.
- Update `.cl303/learnings.md` with anything future automation should know.

## Risk areas

- **History rewrite** is destructive and breaks every open clone/fork. Coordinate before force-push.
- **Schema migration** to make `companyId` non-null can fail on orphaned rows. Plan the backfill and a rollback.
- **Multi-tenant test coverage** can give a false sense of security if the test setup leaks across tenants. Verify tests fail when isolation is intentionally broken.
- **AI redaction** is easy to under-do. Default to *more* redaction; loosen later behind opt-in.

## References

- `CLAUDE.md`, `AGENTS.md`, `.vault/directives/**`
- `prisma/schema.prisma` (tenant boundary lives here)
- `src/app/api/**` (per-route enforcement audit target)
- `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`
- `.env.docker`, `.env.local.example`
- Existing tickets: `tickets/1.md` (healthz), `tickets/7.md` (AI narratives)
