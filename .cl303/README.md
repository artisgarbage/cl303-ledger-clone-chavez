# .cl303 — Autonomous Automation Breadcrumbs

This directory contains notes left by the cl303 autonomous product-development platform as it works on this repository.

## What's here

- **`learnings.md`** — Accumulated insights from each agent run. Read this before starting work to avoid re-discovering things.
- **`runs/`** — One file per automation run, with detailed logs (created by the orchestrator, not by individual agents).

## For humans

If you're a human developer working on this repo:
1. Read `learnings.md` to understand what the automation has learned about this codebase
2. Add your own notes if you discover something the agents should know for next time
3. Don't delete this directory — it's how the org builds institutional knowledge

## For agents

Before writing any code:
1. Read `.cl303/learnings.md` 
2. After completing work, append at least one note to `learnings.md` before opening your PR
3. Stage `.cl303/` changes with `git add .cl303/` as part of your normal commit

See `vault/40-standards/cross-repo-vault.md` in the cl303-automation repo for the full standard.
