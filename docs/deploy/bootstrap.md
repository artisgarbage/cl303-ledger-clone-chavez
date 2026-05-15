# Ledger — Deployment Bootstrap

One-time setup steps. Run these in order before `terraform apply`.

## 0. Prerequisites

```sh
brew install google-cloud-sdk terraform git-filter-repo
gcloud auth login
gcloud config set project codelab303-ledger
```

---

## 1. REQUIRED: Rotate the Anthropic API key

The key in `.env.docker` is real. It was **never committed to git** but
the file exists on local disk. Before doing anything else:

1. Go to <https://console.anthropic.com> → API Keys
2. Revoke the key starting with `sk-ant-api03-lqfLs…`
3. Create a new key — copy it to clipboard only; do not paste into any file
4. Store it in Secret Manager in step 5 below

---

## 2. Purge `setup_data/` from git history

**⚠ DESTRUCTIVE — run these commands only after confirming with the team.**
The `.xlsx` files were committed in the initial sync commit `f921988` and
exist in every subsequent commit. This rewrites all 20 commits.

```sh
# Install git-filter-repo (if not done via brew)
pip3 install git-filter-repo

cd /Users/anthonychavez/_dev/ledger-clone

# Remove setup_data/ from all commits
git filter-repo --path setup_data --invert-paths --force

# Force-push all refs
git push origin --force --all
git push origin --force --tags

# Verify: must return empty
git ls-files setup_data/
```

After the force-push:

- Notify all teammates to delete their local clones and re-clone
- If any forks exist, delete and re-fork
- If any CI artifact caches have clones, invalidate them

---

## 3. Create TF state bucket (manual, once)

```sh
gsutil mb -p codelab303-ledger -l us-central1 \
  gs://codelab303-ledger-tfstate

gsutil versioning set on gs://codelab303-ledger-tfstate
gsutil uniformbucketlevelaccess set on gs://codelab303-ledger-tfstate

# Only project Owner / Editor should have access
gsutil iam ch -d allUsers gs://codelab303-ledger-tfstate
```

> Note: The user provided `TF_LEDGER` as the bucket name reference.
> Actual GCS bucket name is `codelab303-ledger-tfstate` (lowercase, descriptive).

---

## 4. Enable core APIs (bootstrap only — Terraform enables the rest)

```sh
gcloud services enable cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  storage.googleapis.com \
  --project codelab303-ledger
```

---

## 5. Run Terraform for dev

```sh
cd infra/terraform/envs/dev
terraform init
terraform plan -out=tfplan
# Review plan, then:
terraform apply tfplan
```

Save outputs:

```sh
terraform output -json > /tmp/tf-dev-outputs.json
```

---

## 6. Seed Secret Manager (dev)

```sh
# Get DB connection info from TF output
DB_USER=$(terraform output -raw db_user)
DB_PASS=$(terraform output -raw db_password)
DB_NAME=$(terraform output -raw db_name)
SQL_CONN=$(terraform output -raw sql_connection_name)

# DATABASE_URL connects via Cloud SQL proxy (localhost:5432)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"

gcloud secrets versions add ledger-database-url-dev \
  --data-file=<(echo -n "$DATABASE_URL") \
  --project codelab303-ledger

# Generate NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)
gcloud secrets versions add ledger-nextauth-secret-dev \
  --data-file=<(echo -n "$NEXTAUTH_SECRET") \
  --project codelab303-ledger

gcloud secrets versions add ledger-nextauth-url-dev \
  --data-file=<(echo -n "https://margot-app-dev-aywfwftmeq-uc.a.run.app") \
  --project codelab303-ledger

# Paste your NEW Anthropic key (rotated in step 1):
read -s ANTHROPIC_KEY
gcloud secrets versions add ledger-anthropic-api-key-dev \
  --data-file=<(echo -n "$ANTHROPIC_KEY") \
  --project codelab303-ledger

CRON_SECRET=$(openssl rand -hex 32)
gcloud secrets versions add ledger-cron-secret-dev \
  --data-file=<(echo -n "$CRON_SECRET") \
  --project codelab303-ledger
```

---

## 7. Enable Cloud Run APIs

```sh
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  --project codelab303-ledger
```

---

## 8. First Cloud Run deploy (dev)

```sh
# Build and push image via Cloud Build
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev:latest \
  --project codelab303-ledger .

# Create the Cloud Run service (first time)
gcloud run deploy margot-app-dev \
  --image us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev:latest \
  --region us-central1 \
  --project codelab303-ledger \
  --allow-unauthenticated

# Create the migrate Cloud Run Job
gcloud run jobs create margot-migrate-dev \
  --image us-central1-docker.pkg.dev/codelab303-ledger/cloud-run-source-deploy/margot-app-dev:latest \
  --command="npx" --args="prisma,migrate,deploy" \
  --region us-central1 --project codelab303-ledger

# Run migrations
gcloud run jobs execute margot-migrate-dev \
  --region us-central1 --project codelab303-ledger --wait
```

---

## 9. Verify

```sh
curl -sf https://$(gcloud run services describe margot-app-dev \
  --region us-central1 --project codelab303-ledger \
  --format='value(status.url)')/api/healthz | jq .
```

---

## 10. Seed plans and initial data

```sh
# Open Cloud SQL authorized networks temporarily
gcloud sql instances patch ledger-postgres-dev \
  --authorized-networks="$(curl -sf https://checkip.amazonaws.com)/32" \
  --project=codelab303-ledger --quiet

DATABASE_URL="postgresql://ledger_app_dev:PASSWORD@34.60.4.43:5432/ledger_dev?ssl=true" \
  NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx prisma/seed.ts
DATABASE_URL="postgresql://ledger_app_dev:PASSWORD@34.60.4.43:5432/ledger_dev?ssl=true" \
  NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx prisma/seed-yolo.ts

# Clear authorized networks when done
gcloud sql instances patch ledger-postgres-dev \
  --clear-authorized-networks --project=codelab303-ledger --quiet
```
