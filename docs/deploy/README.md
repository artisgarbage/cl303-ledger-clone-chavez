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
curl -sf https://ledger.codelab303.io/api/healthz | jq .

# Current deploy status
helm status ledger-app -n ledger-prod

# Rollback
helm rollback ledger-app <REVISION> -n ledger-prod --wait

# View logs
kubectl logs -n ledger-prod -l app.kubernetes.io/name=ledger-app -c ledger-app --tail=50
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
  templates/           # K8s manifests (Deployment, Service, Gateway, Jobs, ESO, HPA, PDB, NP)

.github/workflows/
  deploy.yml           # CI: test → build → dev (auto) → prod (manual approval)

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
