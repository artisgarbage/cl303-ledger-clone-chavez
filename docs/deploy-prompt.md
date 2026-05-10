# Prompt: Deploy ledger-app to GCP via Terraform + Helm

Paste everything below the `---` into Claude in VSCode (in the repo root). Adjust the **Decisions to confirm** block first if any defaults are wrong.

---

You are working in the `ledger-clone` repo (Next.js 16 + Prisma 7 + Postgres + NextAuth + Anthropic SDK). Your job is to add a complete, production-ready GCP deployment using **Terraform** for infrastructure and **Helm** for the application workload, then walk me through deploying it end-to-end.

## Read first, then plan

Before writing any code:

1. Read `CLAUDE.md`, `AGENTS.md`, and anything under `.vault/directives/` — cl303 automation is active and there are role directives that constrain how I want changes made.
2. Read `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`, `next.config.ts`, `prisma/schema.prisma`, `.env.local.example`, and `.env.docker` so you know what the runtime actually needs.
3. **Important per `AGENTS.md`:** this version of Next.js has breaking changes vs. your training data. Skim `node_modules/next/dist/docs/` for anything deployment-relevant (standalone output, runtime, env handling) before assuming behavior.
4. Then produce a short plan (file tree + decisions) and wait for me to approve it before writing files.

## What the app is (so you can size things right)

- Next.js 16, `output: "standalone"`, listens on `:3000`, runs as non-root user `nextjs` (uid 1001).
- Entrypoint runs `prisma db push --skip-generate` and seeds before `next start`. Treat that as a one-shot **migration job**, not something to run on every pod start in prod — split it out.
- Postgres 16. Schema in `prisma/schema.prisma` (User, Account, Session, Company, etc.).
- Required runtime env: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`, `CRON_SECRET`. Optional: `HARVEST_ACCESS_TOKEN`, `HARVEST_ACCOUNT_ID`, `FORECAST_ACCOUNT_ID`.
- **Security task #0:** `.env.docker` currently has a real-looking Anthropic key committed. Flag this in your plan and include steps to rotate it and scrub it from git history (`git filter-repo` or BFG) — do not proceed with deployment work until I've confirmed rotation.

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
      cloud-sql/          # Postgres 16, private IP, automated backups, IAM auth
      artifact-registry/
      secret-manager/     # secret containers (values populated out-of-band)
      iam/                # GSAs, KSA bindings, WIF pool/provider for GitHub Actions
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
    runbook.md             # rollback, scale, debug, rotate secrets
    architecture.md        # diagram + data flow + threat model summary
```

## Hard requirements

1. **No secrets in code or values files.** All sensitive values come from Secret Manager via CSI; values files reference secret *names*, never values. The migration Job and the app Deployment both pull from the same source of truth.
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
