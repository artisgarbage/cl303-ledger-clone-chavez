# Ledger — Deployment Bootstrap

One-time setup steps. Run these in order before `terraform apply`.

## 0. Prerequisites

```sh
brew install google-cloud-sdk terraform helm git-filter-repo
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
  --data-file=<(echo -n "https://ledger-dev.codelab303.io") \
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

## 7. Install External Secrets Operator

```sh
gcloud container clusters get-credentials ledger-cluster-dev \
  --region us-central1 --project codelab303-ledger

helm repo add external-secrets https://charts.external-secrets.io
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace \
  --set installCRDs=true
```

---

## 8. First Helm deploy (dev)

```sh
IMAGE_TAG=$(git rev-parse HEAD)
CERT_MAP_ID=$(cd infra/terraform/envs/dev && terraform output -raw certificate_map_id)

helm upgrade --install ledger-app deploy/helm/ledger-app \
  --namespace ledger-dev --create-namespace \
  --values deploy/helm/ledger-app/values.yaml \
  --values deploy/helm/ledger-app/values-dev.yaml \
  --set image.tag="$IMAGE_TAG" \
  --set gateway.certificateMapId="$CERT_MAP_ID" \
  --atomic --wait --timeout 15m
```

---

## 9. Update DNS A record

```sh
GW_IP=$(kubectl get gateway ledger-app-gateway -n ledger-dev \
  -o jsonpath='{.status.addresses[0].value}')

gcloud dns record-sets update ledger-dev.codelab303.io. \
  --zone=codelab303-io \
  --type=A \
  --ttl=300 \
  --rrdatas="$GW_IP" \
  --project codelab303-ledger
```

---

## 10. Repeat for prod

Run steps 5–9 using `envs/prod`, `values-prod.yaml`, namespace `ledger-prod`,
cluster `ledger-cluster-prod`, and secrets suffixed `-prod`.
Prod deploy requires manual approval in GitHub → Environments → prod.
