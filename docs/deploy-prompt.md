# Prompt: Deploy ledger-app to GCP via Terraform + Helm

Paste everything below the `---` into Claude in VSCode (in the repo root). Adjust the **Decisions to confirm** block first if any defaults are wrong.

---

You are working in the `ledger-clone` repo (Next.js 16 + Prisma 7 + Postgres + NextAuth + Anthropic SDK). Your job is to add a complete, production-ready GCP deployment using **Terraform** for infrastructure and **Helm** for the application workload, then walk me through deploying it end-to-end.

## Read first, then plan

Before writing any code:

1. Read `CLAUDE.md`, `AGENTS.md`, and anything under `.vault/directives/` — cl303 automation is active and there are role directives that constrain how I want changes made.
2. Read `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`, `next.config.ts`, `prisma/schema.prisma`, `.env.local.example`, and `.env.docker` so you know what the runtime actually needs.
3. **Important per `AGENTS.md`:** this version of Next.js has breaking changes vs. your training data. Skim `node_modules/next/dist/docs/` for anything deployment-relevant (standalone output, runtime, env handling) before assuming behavior.
4. Read the **Sensitive data handling** section below carefully — it is not optional and changes how you build the image, the chart, and the IAM bindings.
5. Then produce a short plan (file tree + decisions) and wait for me to approve it before writing files.

## What the app is (so you can size things right)

- Next.js 16, `output: "standalone"`, listens on `:3000`, runs as non-root user `nextjs` (uid 1001).
- Entrypoint runs `prisma db push --skip-generate` and seeds before `next start`. Treat that as a one-shot **migration job**, not something to run on every pod start in prod — split it out.
- Postgres 16. Schema in `prisma/schema.prisma` (User, Account, Session, Company, etc.).
- Required runtime env: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`, `CRON_SECRET`. Optional: `HARVEST_ACCESS_TOKEN`, `HARVEST_ACCOUNT_ID`, `FORECAST_ACCOUNT_ID`.
- `setup_data/` contains **real codelab303 LLC financials** (P&L exports, more files will be added over time). Treat this directory and everything in it as the highest-sensitivity data in the repo. It is **not test fixtures** — leakage = real-world harm.

## Security task #0 — blockers (do these before any deployment work)

These are pre-flight remediations. Stop and confirm with me after each one before moving on.

1. **Rotate the leaked Anthropic key.** `.env.docker` has a real-looking `sk-ant-…` value committed. Revoke it in the Anthropic console, issue a new one, and only ever store the new one in Secret Manager.
2. **Purge sensitive files from git history.** `setup_data/*.xlsx` is currently tracked (`git ls-files setup_data/` returns hits) and `.env.docker` has been committed. Use `git filter-repo` (preferred) or BFG to remove `setup_data/` and `.env.docker` from all refs, force-push to all remotes, invalidate any forks, and rotate every credential that has ever appeared in those files. Document the exact commands you ran in `docs/deploy/bootstrap.md`.
3. **Update `.gitignore`** to exclude `setup_data/`, `setup_data/**`, `.env`, `.env.*` (keep `!.env.local.example`), and any future `*.xlsx`/`*.csv` financial dumps. Add a pre-commit hook (or CI check) that fails on any tracked path matching those globs.
4. **Update `.dockerignore`** to exclude `setup_data/`, `setup_data/**`, `.env`, `.env.*`, `prisma/seed-financials.ts` if it embeds data, and anything under `tickets/` or `.vault/` that isn't needed at runtime. Verify by running `docker build` and then `docker run --rm <image> sh -c 'ls -la /app && ls -la /app/setup_data 2>&1 || true'` — `setup_data` must not exist in the image.
5. **Audit current image and registry.** If any image already pushed to a registry contains `setup_data/`, treat it as a leak: delete the tag/digest, flush caches, and note it in the runbook.

Do not start writing Terraform or Helm until items 1–4 are done and I've confirmed.

## Sensitive data handling (codelab303 financials)

This is non-negotiable and shapes the design. Apply it to everything you build:

**Never in the image, never in the chart, never in CI logs.**
- The runtime container must not contain `setup_data/` or any financial file. Confirm with the verification command above.
- Helm values files, Terraform tfvars, and CI workflows must not reference paths inside `setup_data/`. No `kubectl cp`, no `gsutil cp` from a developer laptop into a running pod as part of the documented flow.
- CI workflows must mask any env that could carry financial content and must not `cat` files from `setup_data/` for "debugging." Add a CI step that fails if `setup_data/` is present in the build context.

**Storage at rest (when this data needs to live in GCP).**
- Stand up a dedicated **GCS bucket** per environment (e.g. `codelab303-ledger-financials-prod`) with: uniform bucket-level access on, public access prevention enforced, **CMEK** using a Cloud KMS key in the same region, object versioning on, lifecycle rule for noncurrent versions, retention policy if compliance requires it, and **Data Access audit logs** enabled for `storage.objects.{get,create,delete,list}`.
- Bucket IAM: only a dedicated GSA (e.g. `ledger-financials-reader@…`) gets `roles/storage.objectViewer` scoped to that bucket. No project-level grants. No `allUsers`, no `allAuthenticatedUsers`, ever.
- App pods access the bucket via **Workload Identity** binding to that GSA — no keys, no broad `roles/storage.admin`. Document the KSA→GSA binding explicitly.
- The Cloud SQL instance that stores any data derived from these files uses **CMEK** with the same KMS key family, private IP only, and `cloudsql.iam_authentication=on`. Backups are CMEK-encrypted; PITR enabled in prod.
- KMS key has rotation enabled (e.g. 90 days) and `roles/cloudkms.cryptoKeyEncrypterDecrypter` granted only to the bucket service agent and the Cloud SQL service agent.

**Loading data into the platform.**
- Prod must not be seeded from local `setup_data/` files. Choose one of these patterns and recommend with reasoning:
  - (a) Operator uploads file to the locked-down GCS bucket; an authenticated admin-only endpoint or a one-shot Job (image pulls the file via Workload Identity, parses, writes to DB, deletes the local copy) ingests it.
  - (b) Direct authenticated upload through an admin-only route that streams to GCS, then triggers ingest.
- Whichever you pick: the upload/ingest path requires NextAuth admin role, rate-limits, virus scan if files come from outside the org, and writes an audit row (who, when, file hash, row counts) to a dedicated `IngestAudit` table. The raw file is **never** logged.
- Local dev can keep using `setup_data/` from a developer's working tree, but only because that tree is gitignored. Document this clearly.

**Egress and AI.**
- The Anthropic narrative feature must not send raw financial rows or PII to the API by default. Either redact/aggregate before the prompt, or gate the feature behind an explicit per-tenant opt-in flag stored in the DB. Document what is and isn't sent.
- Add `NetworkPolicy` that restricts app-pod egress to: Cloud SQL Auth Proxy, Secret Manager, the financials bucket, Anthropic's API hostname, and DNS. Block everything else by default.

**Access controls in the running app.**
- All routes that read or list financial data require an authenticated admin session. Add server-side authorization checks; do not rely on UI hiding. If `/api/healthz` is added for probes, it must return 200 with no business data.
- Add structured audit logging for any read/write of financial entities, with user id, action, entity, and a request id — but never the row contents.

**Backups and disposal.**
- Bucket and DB backups inherit CMEK and the same IAM scope. Document the restore procedure and a destroy procedure (key destruction is the kill switch).
- The runbook must include: how to revoke a user's access, how to rotate the KMS key, how to wipe a tenant's data, and how to handle a suspected leak (rotate keys, invalidate sessions, audit-log review query).

**CI and developer hygiene.**
- Add `gitleaks` (or `trufflehog`) to CI, scanning the diff and full history weekly. Fail the build on hits.
- Add a `pre-commit` config that blocks commits adding files under `setup_data/` or matching `*.xlsx`, `*.csv` outside of allowlisted dirs.
- The deploy workflow must fail closed if any required Secret Manager secret is missing — never fall back to a default.

## Decisions to confirm (edit these before pasting if you want different defaults)

- GCP project: `<PROJECT_ID>`
- Region / zone: `us-central1` / `us-central1-a`
- Environments: `dev` and `prod` (separate GKE clusters or separate namespaces — recommend and pick one)
- Cluster: **GKE Autopilot** (default) unless you have a strong reason for Standard
- Database: **Cloud SQL for Postgres 16**, private IP, accessed via the Cloud SQL Auth Proxy sidecar + Workload Identity
- Image registry: **Artifact Registry** (Docker format) in the same region
- Ingress: GKE Gateway API + Google-managed cert + Cloud DNS, hostname `<APP_HOSTNAME>` (e.g. `ledger.example.com`)
- Secrets: **Secret Manager**, mounted via the Secret Manager CSI driver (or External Secrets Operator — pick one and justify)
- CI/CD: GitHub Actions using Workload Identity Federation (no long-lived JSON keys). Build → push to Artifact Registry → `helm upgrade --install` with image tag = git SHA
- Terraform state: GCS bucket `<TFSTATE_BUCKET>` with object versioning + uniform bucket-level access

## Deliverables

Create the following, in this layout, and keep each file focused:

```
infra/
  terraform/
    envs/
      dev/   { backend.tf, terraform.tfvars, main.tf }
      prod/  { backend.tf, terraform.tfvars, main.tf }
    modules/
      project-services/   # enable required APIs
      network/            # VPC, subnets, NAT, private service access for Cloud SQL
      gke/                # Autopilot cluster + Workload Identity
      cloud-sql/          # Postgres 16, private IP, CMEK, IAM auth, PITR (prod)
      kms/                # KMS keyring + CMEK keys, rotation enabled
      financials-bucket/  # GCS bucket for codelab303 financials: CMEK, UBLA, PAP, audit logs, versioning
      artifact-registry/
      secret-manager/     # secret containers (values populated out-of-band)
      iam/                # GSAs, KSA bindings, WIF pool/provider for GitHub Actions
      audit-logging/      # Data Access logs for storage + cloudsql + secretmanager
      dns-cert/           # managed zone records + cert
    versions.tf            # pin terraform >= 1.9, google provider, helm/kubernetes providers
deploy/
  helm/
    ledger-app/
      Chart.yaml
      values.yaml          # safe defaults (replicas, resources, probes, HPA)
      values-dev.yaml
      values-prod.yaml
      templates/
        deployment.yaml         # app container + cloud-sql-proxy sidecar
        service.yaml
        gateway.yaml or ingress # Gateway API preferred
        httproute.yaml
        managedcertificate.yaml (if using legacy ingress) OR Gateway cert ref
        serviceaccount.yaml     # KSA annotated for Workload Identity
        secretproviderclass.yaml  # Secret Manager CSI mapping
        migrate-job.yaml        # runs prisma db push + seed, helm hook pre-install/pre-upgrade
        cronjob.yaml            # any scheduled jobs that need CRON_SECRET
        hpa.yaml
        pdb.yaml
        networkpolicy.yaml
        _helpers.tpl
.github/
  workflows/
    deploy.yml             # build, push, helm upgrade, gated on branch/env
docs/
  deploy/
    README.md              # one-page operator runbook
    bootstrap.md           # first-time setup (TF state bucket, WIF, secrets seeding)
    runbook.md             # rollback, scale, debug, rotate secrets, rotate KMS, wipe data
    architecture.md        # diagram + data flow + threat model summary
    data-handling.md       # how financials enter, where they live, who can read them, audit
    incident-response.md   # suspected leak playbook
```

## Hard requirements

1. **No secrets and no financial data in code, images, or values files.** All sensitive values come from Secret Manager via CSI; values files reference secret *names*, never values. Financial files live only in the locked-down GCS bucket. The migration Job and the app Deployment both pull from the same source of truth.
2. **Migrations as a Helm hook**, not an init container that runs on every pod. Use `helm.sh/hook: pre-install,pre-upgrade` with `hook-weight` and `hook-delete-policy: before-hook-creation`. Strip the seed step from the prod path or make it idempotent and gated by an env flag — confirm with me before deciding.
3. **Workload Identity Federation** for GitHub Actions auth. No service account JSON keys anywhere. Document the WIF principal and the conditions on the binding.
4. **Cloud SQL access via the Auth Proxy sidecar** with IAM database authentication where feasible; otherwise password from Secret Manager. Private IP only — no public IP on the instance.
5. **Resource requests/limits, liveness + readiness probes, PDB, HPA, NetworkPolicy** all set. Probes must hit a real Next.js endpoint — if one doesn't exist, add a minimal `/api/healthz` route and wire it up.
6. **Terraform** must be runnable with `terraform init && terraform plan` against an empty project (after APIs are enabled by the bootstrap module). State in GCS with locking. No `local-exec` shell-outs for anything that has a native resource.
7. **Helm chart** must `helm lint` clean and `helm template` to valid manifests. Pin chart version and appVersion. Image tag is a required value, no `:latest`.
8. **CI workflow** builds a multi-arch (linux/amd64) image, pushes to Artifact Registry tagged with the git SHA, then deploys via `helm upgrade --install --atomic --wait` with a timeout. Prod deploy is gated on a manual approval environment.
9. Follow any conventions encoded in `.vault/directives/` and existing repo style. Don't restructure code outside `infra/`, `deploy/`, `docs/`, `.github/` without asking.

## How I want you to work

- Plan first. Show me the file tree and call out every decision where you picked a default. Wait for approval.
- Then implement in small, reviewable commits, grouped by concern (terraform modules, then helm chart, then CI, then docs). Run `terraform fmt`, `terraform validate`, `helm lint`, and `helm template` after each group and paste the output.
- After the code is in, give me a numbered runbook for the first deploy: bootstrap state bucket → enable APIs → `terraform apply` for dev → seed Secret Manager values → push image → `helm install` → verify → DNS cutover.
- Be terse in commit messages and PR descriptions. No marketing copy.
- If you hit a decision I didn't cover, ask — don't guess on anything that costs money or touches IAM.

Start by reading the files listed in "Read first, then plan" and then post your plan.
