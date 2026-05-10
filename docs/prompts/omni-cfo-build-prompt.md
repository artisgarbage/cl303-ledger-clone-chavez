# Build Prompt — Omni-Present CFO Agent (web + Slack)

> Paste the contents below this line into Sonnet 4.6 inside VSCode (Claude Code, Cline, or Cursor agent mode) from the repo root. The prompt is self-contained but assumes the agent has Read/Write/Edit/Bash and can browse `src/`, `prisma/`, and `node_modules/next/dist/docs/`.

---

## Mission

You are extending **Ledger** (this repo, `ledger-app`) with an omni-present CFO agent named **Margot Hale**. Margot is not a report generator. She is a conversational financial partner who can answer ad-hoc questions, run analysis across the existing data model, generate narrative reports on demand, and help frame financial reality for *different audiences* — internal leadership, prospective clients (bizdev/proposal work), and external stakeholders (board, lenders).

The agent must ship on **two surfaces sharing one core**:

1. **Slack bot** — invokable via DM, `@Margot` mention, or slash command. Posts threaded replies, can upload generated artifacts (xlsx, pdf, charts).
2. **Web chat** — embedded in the existing Next.js dashboard at `/cfo` (and as a slide-out panel available across the app).

Both surfaces hit the same `lib/cfo-agent/` core. Slack and web are thin transports; the brain, tools, persona, and policy live in shared code.

---

## Before you write any code — required reading

Read these files in order. Do not skip. Do not guess at conventions you can verify by reading.

1. `CLAUDE.md` and `AGENTS.md` — repo automation rules. Honor `.vault/directives/` overlays.
2. `codelab303_financial_platform_spec.md` — the canonical product spec for Ledger. Internalize the cost-logic story (variable employee cost, contractor lag, cash vs accrual).
3. `prisma/schema.prisma` — full data model. Pay attention to: `Company`, `Person`, `CompensationRecord`, `Project`, `TimeEntry`, `Allocation`, `RevenueRecord`, `FinancialPeriod`, `LineItem`, `Narrative`, `IngestAudit`.
4. `src/lib/engine/{cost-basis,period-comparison,project-profitability}.ts` — the analytical primitives Margot will call as tools. Do not duplicate their logic; wrap them.
5. `src/lib/narrative/prompt-builder.ts` — the existing narrative-generation pattern. Margot's narrative tools should reuse this rather than reinvent it.
6. `src/app/api/analysis/`, `src/app/api/narratives/`, `src/app/api/projects/`, `src/app/api/people/` — existing route handlers. Margot's tools should call internal services, not re-implement queries.
7. `node_modules/next/dist/docs/` — **this is Next.js 16**. App-router conventions and APIs differ from your training. Verify route handler signatures, middleware behavior, and server-action patterns there.
8. `package.json` — confirm available deps. `@anthropic-ai/sdk@^0.95.0` is already installed and is what the existing narrative pipeline uses. Use it. Model: `claude-sonnet-4-6`.
9. `tickets/1.md` — example of how work is described in this repo. Match the tone of any ticket files you create.

When you finish reading, post a 5-bullet summary of what you found that contradicted assumptions, then proceed.

---

## Persona spec — Margot Hale

Margot is the agent's identity across both surfaces. Hard-coded in `lib/cfo-agent/persona.ts`. Treat this as product copy — write it carefully.

**Archetype:** Fractional CFO for creative/dev agencies in the $1M–$10M revenue band. Twelve years inside professional services after starting at a Big-4 firm. Has personally watched dozens of agencies blow up project margins by underestimating contractor lag and over-allocating salaried engineers to unbillable internal work. Has zero patience for vanity revenue numbers and a strong bias toward gross margin and utilization as the metrics that actually predict whether a services business will survive its next bad quarter.

**Voice:**
- Plain English. No consulting jargon unless quoting someone else.
- Numbers first, framing second. "Q1 gross margin came in at 38% — that's six points below your trailing-twelve-month average and the proximate cause is contractor spend on the Acme rebuild." Not: "Let me walk you through the gross margin story."
- Comfortable saying "I don't know" or "the data doesn't support that conclusion."
- Pushes back when asked to spin numbers. Will not invent figures, will not extrapolate beyond what the data supports, will flag when a question is asking her to launder a soft number into a hard one.
- Dry, occasionally pointed. Never performatively warm. Never uses emoji unprompted.

**Communication defaults:**
- Slack: short. Average reply ≤ 4 sentences. Drops into a thread for anything longer. Offers to "kick this into a doc" rather than dumping a 2,000-word answer in channel.
- Web: more room to stretch. Renders charts and tables inline. Still leads with the headline.

**Anti-patterns Margot avoids:**
- Ending answers with "Let me know if you have any other questions!"
- Restating the user's question back at them.
- "Based on my analysis…" preambles. Just give the analysis.
- Hedging language stacked three deep ("It seems like it may potentially be the case that…").

**Display identity:**
- Slack: display name `Margot`, full name `Margot Hale (CFO)`, avatar a clean monogram `MH` (generate as SVG in `public/margot-avatar.svg`).
- Web: same avatar, header label `Margot — CFO`.

---

## Architecture

```
src/
  lib/
    cfo-agent/
      index.ts              # public entrypoint: runTurn(input) -> AgentResponse
      persona.ts            # system prompt + persona constants
      modes.ts              # lens definitions + mode-switch policy
      loop.ts               # tool-calling loop (Anthropic SDK)
      tools/
        index.ts            # tool registry + JSON schemas
        projects.ts         # project profitability, burndown, margin
        people.ts           # utilization, true cost, comp lookups
        periods.ts          # P&L for a period, period-over-period
        narrative.ts        # generate narrative report (wraps existing pipeline)
        proposal.ts         # generate proposal-mode framing (sanitized)
        search.ts           # natural-language search across projects/people
        artifacts.ts        # produce xlsx/pdf and return a download URL
        models.ts            # what-if: pricing, capacity, hiring scenarios
      context/
        builder.ts          # assemble per-turn context (company, period, recent narratives)
        memory.ts            # conversation summary + long-term facts
      policy/
        guards.ts           # output filters by mode (e.g., strip true-cost in proposal mode)
        redaction.ts         # PII / comp number redaction rules
      transports/
        web.ts               # adapter for Next.js route handler
        slack.ts             # adapter for Bolt event handlers
  app/
    api/
      cfo/
        chat/route.ts        # POST: web chat turn (SSE streaming)
        conversations/route.ts          # GET list, POST create
        conversations/[id]/route.ts     # GET, DELETE
      slack/
        events/route.ts      # Slack Events API (URL verification + event_callback)
        commands/route.ts    # Slack slash commands
        interactivity/route.ts  # Slack block-kit interactivity
        oauth/route.ts       # Slack OAuth install callback
    (dashboard)/
      cfo/
        page.tsx             # full-page chat surface
        _components/
          ChatPanel.tsx      # reusable, also mountable as slide-out
          MessageList.tsx
          ToolCallTrace.tsx  # collapsible "show your work" view
```

The **loop** is a standard Anthropic tool-use loop using `@anthropic-ai/sdk`:

1. Build messages from persisted conversation + current user turn.
2. Call `messages.create({ model: "claude-sonnet-4-6", system, tools, messages })` with `stream: true` for the web surface and non-streamed for Slack.
3. While the response contains `tool_use` blocks: execute the tool, append `tool_result`, re-call the model.
4. When `stop_reason === "end_turn"`, persist messages and emit final to transport.
5. Tool execution errors are caught, returned as `tool_result.is_error`, and the model gets one retry budget per tool per turn.

Streaming on the web: server emits `text_delta` events over SSE. Tool calls emit a `tool_call_started` and `tool_call_finished` event so the UI can render the "show your work" trace.

---

## Mode / lens system

Margot has three lenses. The lens shifts (a) the system prompt overlay, (b) which tools are exposed, (c) the output guard that runs over the final assistant message.

| Mode | Trigger | System overlay | Restricted tools | Output guard |
|---|---|---|---|---|
| `internal-cfo` (default) | default; `/mode internal` | "You are speaking to leadership. Full access to all internal numbers." | none | none |
| `proposal-bizdev` | `/mode proposal` or detected intent ("frame this for the Acme proposal", "prep numbers for the SOW") | "You are framing financials for a *prospective client*. Reveal capability and outcomes; never expose internal cost basis, individual comp, utilization gaps, or margin percentages. Speak in delivered-value terms." | `people.getTrueCost`, `people.getCompensation`, `projects.getMarginInternal` are hidden | Hard filter strips any number that matches an internal-cost or comp record; replaces with rounded ranges or qualitative language. Logs a redaction event. |
| `board-investor` | `/mode board` | "You are preparing material for the board. Use formal financial framing. Cite period and basis on every number." | none | Adds basis (`(cash)` / `(accrual)`) and period label after every figure if missing |

**Intent detection** lives in `modes.ts`. A small classifier (single-shot Haiku call, or rule-based fallback) decides the mode from the latest user message. The user can always override via slash or `/mode <name>` inline. When mode auto-switches, Margot says so explicitly: *"Switching to proposal framing. Internal cost figures will be excluded from this thread until you tell me otherwise."*

---

## Tool registry

Each tool is a function with a `name`, JSON-schema `input_schema`, and a TS handler that calls existing services in `src/lib/engine/` or new query helpers. Do not put SQL inside tool handlers; query helpers live in `src/lib/cfo-agent/queries/`. Every tool returns structured JSON with a `_meta` block carrying `{ source: string, period?: string, basis?: 'cash' | 'accrual' }` so Margot can cite.

Build at minimum:

1. **`projects.list`** — list projects with optional filters (status, client, date range). Returns id, name, client, status, dates, headline margin.
2. **`projects.getProfitability`** — wraps `lib/engine/project-profitability.ts`. Input: project id, period range. Returns full P&L, true cost breakdown, margin, burndown.
3. **`projects.getMarginInternal`** — internal-only tool exposing margin %, true cost, and contributor cost detail. Hidden in `proposal-bizdev` mode.
4. **`people.list`** — team roster with role, type (employee/contractor), active flag.
5. **`people.getUtilization`** — wraps utilization queries. Input: person id (or "all"), period. Returns billable %, total hours, effective rate.
6. **`people.getTrueCost`** — wraps `lib/engine/cost-basis.ts`. Internal only.
7. **`people.getCompensation`** — comp record lookup. Internal only. Hidden in proposal mode.
8. **`periods.getPnL`** — P&L for a period at a given basis. Wraps existing financial period queries.
9. **`periods.compare`** — wraps `lib/engine/period-comparison.ts`. Input: two periods, basis. Returns deltas per line item.
10. **`narrative.generate`** — wraps `src/lib/narrative/prompt-builder.ts`. Input: narrative type (monthly, quarterly, project-deep-dive), period, project id (optional). Returns the generated narrative *and* persists a `Narrative` record.
11. **`narrative.recent`** — list recent persisted narratives (so Margot can reference rather than regenerate).
12. **`proposal.frameForClient`** — proposal-mode framing tool. Input: project id (optional, for "we did similar work for X" reference), focus areas (cost-efficiency, speed, capability, outcomes). Output is sanitized prose suitable for a client-facing doc. Internally calls projects/people tools but runs every output through the proposal guard.
13. **`search.semantic`** — natural-language search across project names, descriptions, and persisted narratives. Use Postgres `tsvector` or a simple LIKE-based fallback. Do not pull in a vector DB for v1.
14. **`artifacts.toXlsx`** — given a structured table, write an `.xlsx` to `/tmp/cfo-artifacts/` and return a signed URL valid for 1 hour. Use the existing `xlsx` package in deps.
15. **`models.runScenario`** — what-if engine. Input: scenario type (`hire`, `raise-rates`, `lose-client`, `add-contractor-hours`), parameters. Returns delta on revenue, COGS, gross margin, runway. Document assumptions in the response.

Each tool has a vitest test in `src/lib/cfo-agent/tools/__tests__/` that locks the JSON schema and exercises the handler against seeded test data.

---

## Data model additions

Add to `prisma/schema.prisma` (then run a migration named `cfo_agent`):

```prisma
model Conversation {
  id          String         @id @default(cuid())
  companyId   String
  company     Company        @relation(fields: [companyId], references: [id])
  userId      String
  user        User           @relation(fields: [userId], references: [id])
  surface     ChatSurface
  mode        ChatMode       @default(INTERNAL_CFO)
  slackChannel String?
  slackThreadTs String?
  title       String?        // auto-generated from first user message
  summary     String?        // running summary, refreshed every N turns
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  messages    Message[]

  @@index([companyId, userId, updatedAt])
  @@index([slackChannel, slackThreadTs])
}

model Message {
  id             String        @id @default(cuid())
  conversationId String
  conversation   Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           MessageRole
  content        Json          // anthropic-shaped content blocks (text + tool_use + tool_result)
  modeAtTurn     ChatMode
  redactionEvents Json?        // log of any guard-driven redactions
  createdAt      DateTime      @default(now())

  @@index([conversationId, createdAt])
}

enum ChatSurface { WEB SLACK }
enum ChatMode    { INTERNAL_CFO PROPOSAL_BIZDEV BOARD_INVESTOR }
enum MessageRole { USER ASSISTANT TOOL SYSTEM }

model SlackInstallation {
  id             String   @id @default(cuid())
  companyId      String   @unique
  company        Company  @relation(fields: [companyId], references: [id])
  teamId         String   @unique
  teamName       String
  botUserId      String
  botToken       String   // encrypt at rest — use the existing pattern if any, else add a simple AES helper
  appId          String
  installedById  String
  installedAt    DateTime @default(now())
}

model PersonaConfig {
  id        String  @id @default(cuid())
  companyId String  @unique
  company   Company @relation(fields: [companyId], references: [id])
  // Overrides — keep persona.ts as the source of truth; this allows per-company tweaks later
  voiceOverrides Json?
  toolOverrides  Json?
  updatedAt DateTime @updatedAt
}
```

Add the back-relations on `Company` and `User`. Update the existing `Company` model rather than dropping a duplicate.

---

## Web surface

Page: `src/app/(dashboard)/cfo/page.tsx`. Server component fetches the user's conversations; client component (`ChatPanel.tsx`) handles the live thread.

- New conversation creates a `Conversation` row eagerly so Slack and web can both reference it.
- POST `/api/cfo/chat` receives `{ conversationId, message, mode? }`, runs `loop.runTurn`, streams SSE.
- "Show your work" panel renders tool calls as collapsible cards with input/output JSON, latency, and any redaction events.
- Mode toggle is a dropdown in the header. Changing mode mid-conversation inserts a system message marker (`Mode changed to proposal-bizdev`) into the message log so Margot sees the boundary.
- Slide-out panel: extract the chat into a `<CfoSlideOut>` available from the app shell. Hotkey: ⌘K then `c`.
- Markdown rendering: reuse `react-markdown` (already in deps). Tables and code blocks must render. Charts: when a tool returns a `chart_spec` block (Recharts-shaped), render it inline.

---

## Slack surface

Use **`@slack/bolt`** in HTTP-receiver mode (not Socket Mode — we deploy on Vercel/Fly behind HTTPS). Add as a dep.

Create a Slack app manifest at `infra/slack/manifest.yaml` with:
- Bot scopes: `app_mentions:read`, `chat:write`, `chat:write.public`, `commands`, `files:write`, `im:history`, `im:read`, `im:write`, `users:read`.
- Slash command: `/margot` — opens a modal for picking mode + sending a message; supports inline use (`/margot what was Q1 margin`).
- Event subscriptions: `app_mention`, `message.im`.
- Interactivity: enabled (for mode-toggle buttons in messages).

Endpoints:
- `POST /api/slack/events` — verify signing secret, handle `url_verification`, route `event_callback` to `transports/slack.ts`. Always 200 within 3s; offload work via a queued worker (use the existing background-job pattern if any, otherwise spawn a server action with `after()`).
- `POST /api/slack/commands` — handle `/margot`. If the body has text, treat it as a one-off ask; if empty, open a modal.
- `POST /api/slack/interactivity` — handle button clicks (e.g., "switch to proposal mode", "kick this to a doc").
- `GET /api/slack/oauth` — install/redirect handler. Persist the `SlackInstallation`.

Behavior rules (Margot in Slack):
- DM: every message is a turn. Conversation is keyed on `(team_id, user_id)` for DMs.
- Channel: only responds to `@Margot` mentions or `/margot` commands. Conversation is keyed on the thread (`channel_id` + `thread_ts`); replies stay in-thread.
- Long answers (> ~1,200 chars or any artifact request): reply with a one-line headline + an `Open full reply` button that links to the corresponding web `/cfo/c/[id]`.
- Artifacts: `artifacts.toXlsx` results are uploaded as Slack file attachments via `files.uploadV2`, *not* as raw URLs.
- Rate-limit defense: if the same user fires three turns within five seconds, queue them and reply once with a combined response.

---

## Phased delivery

Ship in this order. Each phase ends with a working demoable state and a passing test suite. Open a ticket file at `tickets/<n>.md` per phase using the format from `tickets/1.md`.

- **M1 — Core loop (web only, no Slack).** Persona, agent loop, three tools (`projects.list`, `periods.getPnL`, `narrative.recent`), web chat at `/cfo`, conversation persistence, no streaming (sync first). Acceptance: ask "what's our gross margin trend over the last three months" — get a plain answer with cited periods.
- **M2 — Tool registry expansion + streaming.** Add the rest of the tools, switch to SSE, build the show-your-work panel. Acceptance: "show me the Acme project P&L and explain why margin slipped" — Margot calls `projects.getProfitability`, then `periods.compare`, then narrates.
- **M3 — Mode system.** Implement `internal-cfo`, `proposal-bizdev`, `board-investor`. Build output guards. Add tests that prove proposal mode never emits internal cost or margin percentages. Acceptance: in proposal mode, ask for "the numbers we'd put in front of Acme" — confirm no margin %, no individual comp, no utilization figures appear.
- **M4 — Slack transport.** Bolt receiver, `/margot` slash, mention handling, threaded replies, install flow. Acceptance: install in a workspace, `@Margot` her in #leadership, get an answer in-thread; same conversation continued works.
- **M5 — Artifacts + scenarios.** `artifacts.toXlsx`, `models.runScenario`, file upload on Slack, downloadable links on web. Acceptance: "model what happens to gross margin if we hire two more senior engineers in Q3" — get a numeric scenario plus a downloadable xlsx.

Do not move to phase N+1 until phase N's acceptance dialogues run cleanly.

---

## Acceptance dialogues

These must work end-to-end before this feature is considered shipped. Wire them as integration tests in `src/lib/cfo-agent/__tests__/dialogues.test.ts` using a seeded test database.

1. **Period diagnosis.** *User:* "Why did April look worse than March?" *Expected:* tool calls to `periods.getPnL` (both months) and `periods.compare`; reply identifies the largest line-item delta, attributes it to a project or category, cites cash/accrual basis.
2. **Project deep-dive.** *User:* "Walk me through the Acme rebuild project." *Expected:* `projects.getProfitability` for the project; reply gives revenue, true cost, margin, top contributors by cost, current burn vs budget.
3. **Utilization concern.** *User:* "Who is under-utilized this quarter?" *Expected:* `people.getUtilization` for current quarter; reply lists names below threshold (configurable, default 65%), notes contractor-vs-employee context.
4. **Bizdev framing.** *User:* "Frame our last three Shopify projects for the WeMakeSocks proposal." *Expected:* mode auto-switches to `proposal-bizdev` and Margot announces it. `projects.list` filtered by client/tags; `proposal.frameForClient` produces sanitized prose. **Test asserts** the response contains zero internal cost figures, zero margin percentages, and no individual-person compensation.
5. **Scenario.** *User:* "What if we lose Acme next quarter?" *Expected:* `models.runScenario` runs with assumptions stated; reply gives revenue and margin impact, runway delta, suggests one or two countermeasures grounded in current capacity.
6. **Slack-native.** *User (in #leadership):* "@Margot how's gross margin tracking?" *Expected:* threaded reply, ≤ 4 sentences, with a `Open full report` button if the underlying data is large.
7. **Mode override.** *User:* "/mode board what should I tell the board about Q1?" *Expected:* mode confirmed; every figure in the response carries a basis label (`(cash)` / `(accrual)`) and a period label.

---

## Hard constraints (non-negotiable)

- **Never invent numbers.** If a tool didn't return data, Margot says so. No "approximately ~$X based on industry benchmarks" — there are no industry benchmarks in this product.
- **Never expose internal cost in proposal mode.** This is enforced by code (the output guard), not by hoping the model behaves. Add a fuzz test that throws a thousand variants at the guard.
- **Never write to financial source-of-truth tables from a tool call.** Tools are read-only against `Project`, `TimeEntry`, `RevenueRecord`, `LineItem`, `Person`, `CompensationRecord`. The only writes the agent performs are `Conversation`, `Message`, and `Narrative` (via the existing narrative pipeline).
- **Always cite period and basis** for any P&L number on internal-cfo and board-investor modes. The output guard auto-appends if missing.
- **Tool latency budget:** any single tool call > 8s should stream a "still working on it" tick to the surface. Slack: post an interim ephemeral message. Web: emit a heartbeat SSE event.
- **Token budget:** keep the per-turn input under 80k tokens. The context builder must summarize older messages once a conversation crosses 30 turns. Use the existing summarization pattern from `narrative/prompt-builder.ts` if one exists; otherwise call Haiku for a rolling summary.
- **Do not introduce a vector database, Redis, or a queue service in this feature.** Postgres + Next.js + the Anthropic SDK are sufficient. If you find yourself reaching for one, stop and write a comment explaining why, then proceed without it.
- **TypeScript strict, zero `any`.** Match the existing codebase. New code without explicit return types on exported functions will be rejected.
- **Tests for every tool, the loop, both guards, and one full integration test per acceptance dialogue.** Use vitest, the project's existing harness.
- **Honor `.vault/directives/` and `AGENTS.md`.** If a directive forbids a pattern you were about to use, comply. If you think a directive is wrong, leave a `// vault-conflict:` comment and write a ticket — do not silently override.

---

## Non-goals (explicitly out of scope for v1)

- Voice. No telephony, no audio.
- Auto-posting on a schedule. Margot is reactive only in v1; scheduled digests come later.
- Multi-tenant Slack — assume one Slack install per Company for now, even though the schema supports more.
- Cross-conversation memory (e.g., "remember I prefer XLSX over PDF"). v1 has per-conversation context only. Long-term memory is M6+.
- A mobile app. Web is responsive; Slack is the mobile experience.

---

## Test prompts to run after build (in order)

Run these manually against your dev instance before opening a PR.

1. `/cfo` web — "Hi" → expect Margot's voice, no fluff, suggests three things she can do.
2. `/cfo` web — "What's our cash position right now?" → expect tool call, expect explicit basis.
3. `/cfo` web — "Compare Q4 last year to Q1 this year." → expect `periods.compare`, expect deltas per line item, expect a one-paragraph narrative summary.
4. `/cfo` web → switch to `proposal-bizdev` → "Pull our last three Next.js projects and give me three sentences I could drop into a proposal." → inspect the response: must contain zero margin %, zero true-cost figures, zero comp figures.
5. Slack — DM Margot with "afternoon" → expect a brief, in-character greeting (not a help menu).
6. Slack — `@Margot` in a channel with "what's my biggest project margin risk this month" → threaded reply, ≤ 4 sentences, ends with an action-oriented sentence.
7. Slack — `/margot model losing acme` → modal opens, fill in, expect an in-thread response with scenario numbers and an attached xlsx.

---

## When you finish

1. Open a PR titled `feat(cfo-agent): omni-present CFO across web and slack`.
2. PR description includes: phase summary, acceptance-dialogue results (paste actual transcripts), screenshots of the web surface and a Slack thread.
3. Update `docs/STATUS_PAGE.md` with the new endpoints and surface.
4. Add an entry under `tickets/` for any deferred work or follow-ups.
5. Confirm `npm run lint`, `npm run test`, and `npm run build` all pass before requesting review.

If anything in this prompt conflicts with what you find when reading the repo, **trust the repo, flag the conflict in your PR description, and proceed with the repo's conventions.**
