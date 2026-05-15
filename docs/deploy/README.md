# Ledger — Deployment Guide

| Document                                     | Purpose                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| [bootstrap.md](bootstrap.md)                 | **Start here.** One-time setup: history purge, Terraform, Secret Manager seeding |
| [architecture.md](architecture.md)           | System overview, component map, identity model, threat model                     |
| [data-handling.md](data-handling.md)         | Financial data lifecycle, what's sent to Anthropic, audit trail                  |
| [runbook.md](runbook.md)                     | Day-two ops: rollback, scale, rotate secrets, wipe tenant                        |
| [incident-response.md](incident-response.md) | P0/P1 playbooks: data leak, production down, secret compromise                   |

## Quick reference

```sh
# Health check
curl -sf https://margot-app-dev-aywfwftmeq-uc.a.run.app/api/healthz | jq .

# Current deploy status
gcloud run services describe margot-app-dev --region us-central1 --project codelab303-ledger

# Rollback — route traffic to a previous revision
gcloud run services update-traffic margot-app-dev \
  --to-revisions=<REVISION_NAME>=100 \
  --region us-central1 --project codelab303-ledger

# View logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=margot-app-dev" \
  --project=codelab303-ledger --limit=50 --order=desc
```

## Repository layout

```
infra/terraform/
  versions.tf          # root provider pins
  modules/             # reusable modules (one per GCP service)
  envs/dev/            # dev environment root config
  envs/prod/           # prod environment root config

deploy/helm/ledger-app/
  Chart.yaml
  values.yaml          # defaults
  values-dev.yaml      # dev overrides
  values-prod.yaml     # prod overrides
  templates/           # GKE manifests (dormant — active deploy is Cloud Run)

docs/deploy/           # this directory
```

## Security gates

Two security items require manual action before the first push:

1. **Rotate the Anthropic API key** — the key in `.env.docker` is real.
   Revoke it at <https://console.anthropic.com> and add the new key to
   Secret Manager only. Never put it in a file again.

2. **Purge `setup_data/` from git history** — real P&L files exist in every
   commit since `f921988`. See [bootstrap.md](bootstrap.md#2-purge-setup_data-from-git-history)
   for exact commands. This requires force-pushing and team re-cloning.
