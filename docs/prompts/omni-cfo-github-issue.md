<!--
Paste the body below this comment block (everything after the next divider) into a new GitHub issue at:
  https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/new?template=org-ticket.md

Suggested title:  feat(cfo-agent): omni-present CFO across web and Slack
Suggested labels: epic, feature, ai, slack, frontend, backend
Suggested milestone: create new — "CFO Agent (Margot)"

Note for PM agent: this is an EPIC. Before scheduling engineer work, decompose into 5 child issues
(M1 through M5) using the phased plan in the Approach section. Each child issue should carry its own
budget and token estimate so reviewer/engineer cycles stay within the $10–$50 per-ticket norm.
-->

---

## Description

Add **Margot Hale**, an omni-present CFO agent, to Ledger. Margot is a conversational financial partner — not a report generator. She answers ad-hoc questions, runs analysis across the existing data model, generates narrative reports on demand, and reframes financial reality for different audiences (internal leadership, prospective clients in proposal/bizdev work, board/investors). She ships on two surfaces sharing one core: a **Slack bot** (DM, `@Margot` mention, `/margot` slash command) and a **web chat** at `/cfo` plus a slide-out panel available across the dashboard. Both surfaces invoke `lib/cfo-agent/runTurn()`; persona, tools, and policy live in shared code.

The full build spec lives at `docs/prompts/omni-cfo-build-prompt.md` in this repo. **PM/architect agents should read that file before decomposing this epic.** This issue is the contract; the build prompt is the implementation reference.

## Acceptance criteria

Each child issue (M1–M5) carries a subset of these. The epic is closed only when all are checked.

**Foundation (M1)**
- [ ] `lib/cfo-agent/` core exists with `runTurn(input): AgentResponse`, persona constants, tool registry, and a tool-calling loop using `@anthropic-ai/sdk` against `claude-sonnet-4-6`
- [ ] Prisma migration `cfo_agent` adds `Conversation`, `Message`, `SlackInstallation`, `PersonaConfig` models with proper relations and indexes (no shadowing of existing `Company`/`User`)
- [ ] Web chat at `/cfo` persists conversations, supports new/continue, renders message history
- [ ] Acceptance dialogue 1 (Period diagnosis — see `docs/prompts/omni-cfo-build-prompt.md`) passes as an integration test against seeded data

**Tool registry + streaming (M2)**
- [ ] All 15 tools defined in the build prompt are implemented, schema-locked, and unit-tested under `src/lib/cfo-agent/tools/__tests__/`
- [ ] Tools wrap existing services in `src/lib/engine/{cost-basis,period-comparison,project-profitability}.ts` and `src/lib/narrative/prompt-builder.ts` — no duplicated SQL or analytical logic
- [ ] `POST /api/cfo/chat` streams via SSE; UI renders `text_delta`, `tool_call_started`, `tool_call_finished`
- [ ] "Show your work" panel renders tool calls as collapsible cards with input, output, latency
- [ ] Acceptance dialogues 2 and 3 pass

**Mode / lens system (M3)**
- [ ] Three modes implemented: `internal-cfo` (default), `proposal-bizdev`, `board-investor`
- [ ] Mode is persisted per-conversation, switchable via UI dropdown, slash command (`/mode <name>`), or auto-detected intent
- [ ] Output guard hard-strips internal cost figures, margin %, and individual comp from any `proposal-bizdev` response — enforced in code, with a fuzz test of 1000+ variants
- [ ] Output guard auto-appends basis (`(cash)`/`(accrual)`) and period label to every figure in `board-investor` mode if missing
- [ ] Acceptance dialogue 4 passes; redaction events are logged on `Message.redactionEvents`

**Slack transport (M4)**
- [ ] `@slack/bolt` added in HTTP-receiver mode; routes live at `/api/slack/{events,commands,interactivity,oauth}`
- [ ] Slack app manifest committed at `infra/slack/manifest.yaml` with required scopes
- [ ] DMs are full conversations; channel responses only on `@Margot` mention or `/margot`; replies stay in-thread; thread state keyed on `(channel_id, thread_ts)`
- [ ] Long answers (>1,200 chars) post a one-line headline + `Open full reply` button linking to `/cfo/c/[id]`
- [ ] Slack signing-secret verification + 3s ack budget enforced (background work offloaded via `after()` or equivalent)
- [ ] OAuth install flow persists `SlackInstallation` (one per Company in v1); bot tokens encrypted at rest
- [ ] Acceptance dialogue 6 passes against a real workspace install

**Artifacts + scenarios (M5)**
- [ ] `artifacts.toXlsx` produces .xlsx files; web returns a signed URL valid 1h, Slack uploads via `files.uploadV2`
- [ ] `models.runScenario` supports at minimum: `hire`, `raise-rates`, `lose-client`, `add-contractor-hours`. Returns delta on revenue, COGS, gross margin, and runway with stated assumptions
- [ ] Acceptance dialogues 5 and 7 pass

**Cross-cutting (every phase must hold)**
- [ ] TypeScript strict, zero `any`, explicit return types on exported functions
- [ ] All tools, both guards, the loop, and one full integration test per acceptance dialogue have vitest coverage
- [ ] `npm run lint`, `npm run test`, `npm run build` clean
- [ ] No new infrastructure dependencies (no Redis, no vector DB, no external queue) — Postgres + Next.js + Anthropic SDK only
- [ ] `.vault/directives/` and `AGENTS.md` honored; any conflicts flagged with `// vault-conflict:` comments and a follow-up ticket
- [ ] Tools are read-only against financial source-of-truth tables (`Project`, `TimeEntry`, `RevenueRecord`, `LineItem`, `Person`, `CompensationRecord`); only `Conversation`, `Message`, and `Narrative` are written

## Out of scope

Explicitly deferred to follow-up issues:

- Voice / telephony / audio in or out
- Scheduled or auto-posting digests (Margot is reactive only in v1)
- Multi-Slack-install per Company (schema supports it; UI/UX does not)
- Cross-conversation long-term memory ("remember my preferences")
- Native mobile app (web is responsive; Slack is the mobile experience)
- Migration to a vector database for `search.semantic` — Postgres `tsvector` or LIKE-based fallback is the v1 implementation
- Per-user persona customization at runtime — `PersonaConfig` is scaffolded but not wired to UI in v1

## Notes

### Required reading (in order, before any code)

1. `CLAUDE.md`, `AGENTS.md`, `.vault/directives/{pm,architect,engineer,reviewer}.md`
2. `docs/prompts/omni-cfo-build-prompt.md` — full build spec; this issue is its contract
3. `codelab303_financial_platform_spec.md` — product spec; internalize cost-logic story
4. `prisma/schema.prisma` — full data model
5. `src/lib/engine/{cost-basis,period-comparison,project-profitability}.ts` — analytical primitives the tool registry wraps
6. `src/lib/narrative/prompt-builder.ts` — existing narrative pipeline pattern
7. `node_modules/next/dist/docs/` — **this is Next.js 16**, App Router APIs differ from training data
8. `tickets/1.md`, `tickets/7.md` — format reference for child tickets

### Persona — Margot Hale

Hard-coded in `lib/cfo-agent/persona.ts`. Archetype: fractional CFO for creative/dev agencies in the $1M–$10M revenue band; Big-4 trained; twelve years inside professional services. Voice: plain English, numbers first, dry, will not invent figures, will not spin numbers, never uses emoji unprompted, never restates the user's question, never ends with "Let me know if you have any other questions!" Slack replies average ≤4 sentences. Display name: `Margot Hale (CFO)`; avatar: `MH` monogram SVG at `public/margot-avatar.svg`.

### Architecture (target)

```
src/
  lib/
    cfo-agent/
      index.ts              # runTurn(input) -> AgentResponse
      persona.ts            # system prompt + persona constants
      modes.ts              # lens definitions + mode-switch policy
      loop.ts               # tool-calling loop (Anthropic SDK)
      tools/
        index.ts            # registry + JSON schemas
        projects.ts people.ts periods.ts narrative.ts
        proposal.ts search.ts artifacts.ts models.ts
      context/builder.ts    # per-turn context assembly
      context/memory.ts     # rolling summary
      policy/guards.ts      # mode-aware output filters
      policy/redaction.ts   # PII / comp redaction rules
      transports/web.ts transports/slack.ts
  app/
    api/
      cfo/chat/route.ts                       # SSE streaming
      cfo/conversations/route.ts              # GET, POST
      cfo/conversations/[id]/route.ts         # GET, DELETE
      slack/{events,commands,interactivity,oauth}/route.ts
    (dashboard)/cfo/page.tsx
    (dashboard)/cfo/_components/{ChatPanel,MessageList,ToolCallTrace}.tsx
infra/slack/manifest.yaml
```

### Tool registry (15 tools)

`projects.list`, `projects.getProfitability`, `projects.getMarginInternal` (internal-only), `people.list`, `people.getUtilization`, `people.getTrueCost` (internal-only), `people.getCompensation` (internal-only), `periods.getPnL`, `periods.compare`, `narrative.generate`, `narrative.recent`, `proposal.frameForClient`, `search.semantic`, `artifacts.toXlsx`, `models.runScenario`. Each returns structured JSON with a `_meta` block carrying `{ source, period?, basis? }` so Margot can cite. Full schemas in the build prompt.

### Modes — policy table

| Mode | Default trigger | Restricted tools | Output guard |
|---|---|---|---|
| `internal-cfo` | default; `/mode internal` | none | none |
| `proposal-bizdev` | `/mode proposal` or detected intent | `people.getTrueCost`, `people.getCompensation`, `projects.getMarginInternal` hidden | hard filter strips internal cost / margin % / individual comp; replaces with rounded ranges; logs redaction event |
| `board-investor` | `/mode board` | none | auto-appends basis + period to every figure |

When mode auto-switches, Margot announces it explicitly.

### Hard constraints (non-negotiable)

- Never invent numbers. If a tool returned no data, say so.
- Proposal-mode redaction is enforced in **code**, not prompt — fuzz test required.
- Tools are read-only against financial source-of-truth tables.
- Always cite period and basis on internal-cfo and board-investor responses.
- Per-turn input cap: 80k tokens. Context builder summarizes after 30 turns.
- Tool latency >8s emits a heartbeat (Slack: ephemeral interim message; web: SSE heartbeat).
- TypeScript strict, zero `any`, explicit return types on exported functions.

### Acceptance dialogues (integration tests)

Wire these in `src/lib/cfo-agent/__tests__/dialogues.test.ts` against a seeded test database. Full text of each in the build prompt.

1. Period diagnosis — "Why did April look worse than March?"
2. Project deep-dive — "Walk me through the Acme rebuild project."
3. Utilization concern — "Who is under-utilized this quarter?"
4. Bizdev framing — "Frame our last three Shopify projects for the WeMakeSocks proposal." Test asserts zero internal cost / margin % / comp in response.
5. Scenario — "What if we lose Acme next quarter?"
6. Slack-native — `@Margot how's gross margin tracking?` in a channel.
7. Mode override — `/mode board what should I tell the board about Q1?`

### Phased delivery (PM agent: decompose into 5 child issues)

| Milestone | Scope | Child-issue budget | Tokens |
|---|---|---|---|
| M1 — Core loop, web only, 3 tools, no streaming | core skeleton + persistence + dialogue 1 | $40 | ~50k |
| M2 — Full tool registry + SSE streaming + show-your-work | tools + UI affordances + dialogues 2,3 | $50 | ~70k |
| M3 — Mode system + output guards + redaction logging | policy layer + dialogue 4 + fuzz test | $35 | ~45k |
| M4 — Slack transport + OAuth install + threaded replies | Bolt integration + dialogue 6 | $50 | ~60k |
| M5 — Artifacts + scenarios + xlsx upload | dialogues 5,7 + file plumbing | $30 | ~40k |
| **Epic total** | | **$205** | **~265k** |

PR size: each phase should split if its diff exceeds the project's PR limit (referenced in ticket 7 as ~400 lines). Open follow-up tickets for any deferred work.

### Risk areas

- **Slack signing-secret + 3s ack** — easy to miss; must offload work via `after()` or equivalent or Slack will retry the event and double-respond.
- **Proposal-mode redaction** — the model will *try* to be helpful and slip an internal figure through. Code guard is the only safe boundary; fuzz testing is non-negotiable.
- **Next.js 16 deviations** — App Router APIs and middleware behavior have changed. Read `node_modules/next/dist/docs/` per the repo standard before writing route handlers.
- **Token budget on long conversations** — context builder must summarize past turns or per-turn cost balloons. Reuse Haiku for rolling summaries if no existing summarizer in `narrative/prompt-builder.ts` fits.
- **Tool latency** — `models.runScenario` and large `periods.compare` queries may exceed 8s. Heartbeat is mandatory; do not let Slack or SSE silent-fail.

### Files to create / modify (high-level)

**New (M1–M5 combined, ~30 files):**

- `src/lib/cfo-agent/{index,persona,modes,loop}.ts`
- `src/lib/cfo-agent/tools/{index,projects,people,periods,narrative,proposal,search,artifacts,models}.ts`
- `src/lib/cfo-agent/context/{builder,memory}.ts`
- `src/lib/cfo-agent/policy/{guards,redaction}.ts`
- `src/lib/cfo-agent/transports/{web,slack}.ts`
- `src/lib/cfo-agent/queries/*.ts` (new query helpers, no SQL inside tool handlers)
- `src/lib/cfo-agent/__tests__/dialogues.test.ts`
- `src/lib/cfo-agent/tools/__tests__/*.test.ts`
- `src/app/api/cfo/chat/route.ts`
- `src/app/api/cfo/conversations/{route,[id]/route}.ts`
- `src/app/api/slack/{events,commands,interactivity,oauth}/route.ts`
- `src/app/(dashboard)/cfo/{page.tsx,_components/{ChatPanel,MessageList,ToolCallTrace}.tsx}`
- `infra/slack/manifest.yaml`
- `public/margot-avatar.svg`
- `prisma/migrations/<ts>_cfo_agent/migration.sql`

**Modified:**

- `prisma/schema.prisma` — add 4 models + back-relations on `Company`/`User`
- `package.json` — add `@slack/bolt`
- `src/middleware.ts` — allowlist `/api/slack/*` for Slack signature verification path
- `docs/STATUS_PAGE.md` — document new endpoints + surfaces
- `.env.local.example` — add `SLACK_*` keys, confirm `ANTHROPIC_API_KEY` already present

### Stack adherence

- Next.js 16 App Router, TypeScript strict, Prisma, Postgres, NextAuth, Vitest — all already in repo
- `@anthropic-ai/sdk@^0.95.0` already installed; model `claude-sonnet-4-6` already used in narrative pipeline; reuse client setup
- `xlsx` already in deps for artifact generation
- `react-markdown` already in deps for chat rendering
- `recharts` already in deps for inline tool-output charts

### Deviations from default stack

**One new dependency only:** `@slack/bolt` for the Slack transport. No alternative in the existing tree.

No new infrastructure (no Redis, no vector DB, no external queue) — explicit non-goal.

### Definition of done (epic)

- All 5 child issues closed; their PRs merged to `main`
- All 7 acceptance dialogues run cleanly in the seeded test environment
- Slack app installed in the codelab303 workspace, smoke-tested in `#leadership` and via DM
- `docs/STATUS_PAGE.md` updated; PR descriptions include transcripts of every acceptance dialogue and screenshots of web + Slack surfaces
- `.cl303/learnings.md` updated with anything surprising the agents hit during the build

---

<sub>Build prompt reference: `docs/prompts/omni-cfo-build-prompt.md`. PM agent: this is the implementation contract; the build prompt is the implementation reference. If they conflict, this issue wins for *what*; the build prompt wins for *how*.</sub>
