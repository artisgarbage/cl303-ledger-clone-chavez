# Margot — Pricing Strategy, Positioning & Build Prompt

> Strategy doc for the product currently shipping out of `ledger-clone`.
> Audience: founder + engineering. One read, then act.
> Author posture: product strategist. Opinionated. Numbers anchored, not guessed-into-precision.

---

## 1. What we actually have

A ledger built around a character.

The repo is named `ledger-clone` and the surface area looks like an accounting tool — projects, people, periods, P&L, QuickBooks imports, narratives, reports. That framing undersells it. The center of gravity is `src/lib/cfo-agent/` — a tool-using AI persona named **Margot Hale**, a fractional CFO for creative/dev agencies in the $1M–$10M revenue band, with three first-class modes (Internal, Proposal/Bizdev, Board/Investor) and a voice spec strict enough to be a brand bible.

The accounting platform is the substrate. Margot is the product. Pricing should follow.

---

## 2. Positioning

**Name:** Margot.
**Category:** Fractional CFO, on-demand.
**Tagline (lead):** *Your CFO already knows the answer.*
**Subline:** Margot is a fractional CFO built for creative and dev agencies. She lives inside your books, speaks three audiences (team, client, board), and is on at 2am when the proposal is due.

**One-liner for the "AI for AI" audience:** *Margot is the finance brain other agents call when their user asks "how did Q1 actually go?"*

### Why this positioning wins

A human fractional CFO bills $5K–$15K/month for 4–10 hours/week, with a Slack lag measured in business days. The agency owner does not want "AI accounting software." They want their CFO answering on the spot, in three different registers, without burning a retainer hour. Margot is that, and she is also the only one of those who can be embedded inside another AI's tool registry. That second fact is the wedge into a second buyer (AI platforms) without confusing the first buyer (the agency owner).

### What we are not
- Not "QuickBooks with AI bolted on." (Intuit owns that.)
- Not a generic LLM wrapper over a CSV. (Every YC batch ships one.)
- Not an "AI bookkeeper." Bookkeeping is upstream of Margot, not her job.

### Strategic frame
- **Primary wedge:** the persona, not the ledger. Sell the CFO; the books-of-record are the moat.
- **Mode-as-feature:** the three modes (Internal / Proposal / Board) are not a setting, they're three distinct emotional jobs Margot does for one buyer. Each one anchors a pricing tier.
- **Audit-grade by default:** every narrative cites period and basis. That cite-trail is what makes her safe to embed in another AI.

---

## 3. Target customers

| Segment | Buyer | Pain | Why Margot |
| --- | --- | --- | --- |
| **Creative / dev agencies $1M–$10M** | Founder / Owner-operator | Hates QB, can't justify a real CFO, drowns in proposal-prep math | Persona-grade answers, three modes, no retainer |
| **Series A / B startups w/ services revenue** | Head of Finance / FP&A lead | Mid-quarter board prep, margin instrumentation | Board mode + narrative archive |
| **Fractional CFO firms** | Partner / Practice lead | Can't scale; every client wants their own CFO | White-label Margot per-client; rev share |
| **AI agent platforms** (Claude, Cursor, Lindy, Glean, Sierra, vertical agents) | Platform PM / Partnerships | Their agents need authoritative financial answers; can't ship a real ledger themselves | MCP-exposed Margot as a callable tool |
| **LLM vendors** (model providers, infra) | BD / Ecosystem | Want vertical depth without building it; want a default finance tool | Federation deal; revenue share on consumption |

Selling to the bottom two segments is **AI-to-AI distribution**: humans never see Margot's marketing, but Margot fields their financial questions through another agent. That's a real distribution channel, not a thought experiment — the same pattern Stripe used to win developer mindshare a decade earlier, replayed at the agent layer.

---

## 4. Pricing model

Two parallel pricing rails. Same product, two buyers. No cross-contamination.

### Rail A — Margot for Humans (the agency owner)

Per-org subscription, metered on what's actually scarce: Margot's "thinking work" (narratives + CFO chat turns) and entity count. Transactions are not metered — they're cheap and metering them punishes the customer for growing.

| Tier | Price | Who it's for | Entities | Narratives / mo | CFO chat turns / mo | Modes | Imports | Seats |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Free** | $0 | Solo operators, kicking the tires | 1 | 5 | 25 | Internal only | Manual CSV | 1 |
| **Starter** | **$49 / mo** | 1–5 person agencies | 1 | 50 | 250 | Internal only | QB + CSV | 3 |
| **Studio** | **$199 / mo** | $1M–$3M agencies, the heart of the ICP | 3 | 500 | 2,000 | All three modes | QB + CSV + bank | 10 |
| **Practice** | **$599 / mo** | $3M–$10M, multi-entity, doing real board prep | 10 | 2,500 | 10,000 | All three + custom voice tuning | All + API | 25 |
| **Enterprise** | **Custom (from $2,500 / mo)** | Holdcos, fractional CFO firms, regulated | Unlimited | Custom | Custom | All + white-label + SSO/SAML, audit log export, dedicated support | All + private connectors | Unlimited |

**Design notes:**
- The price ladder is **4x** Free → Starter → Studio → Practice. That's deliberate. The ICP is *Studio*; the tiers above and below exist to (a) qualify-out hobbyists and (b) leave room for a real account exec to land Practice contracts.
- **Narratives and CFO turns are the value metrics, not transactions.** A LLM call is the marginal cost; bill on the unit that creates marginal cost.
- **Modes are a tier gate.** Internal mode is the on-ramp. Proposal and Board modes are why founders upgrade — those are the modes that replace billable hours of a human CFO. Holding them behind Studio is honest gating: those modes only matter once you have clients and a board.
- **Overage, not throttling.** Hitting a cap doesn't lock Margot — it bills overage at: **$0.50 per additional narrative**, **$0.05 per additional CFO turn**. Cap-then-degrade is what cheap tools do; Margot bills like a CFO bills.

### Rail B — Margot for Agents (the wedge)

This is the AI-to-AI rail. The customer is *another piece of software* — an agent platform, an LLM vendor, or a developer building one. They don't want seats. They want a callable Margot.

| Tier | Price | Who it's for | What you get |
| --- | --- | --- | --- |
| **Agent Dev (Free)** | $0 | Builders evaluating | 1,000 reads / mo, 25 narratives / mo, no SLA, sandboxed data, MCP endpoint, signed agent identity required |
| **Agent Pro** | **Usage-based**: $0.002 / read · $0.05 / narrative · $0.10 / CFO synthesis call | Production agents serving real users | Same endpoints, real data (customer-authorized), p95 < 800ms, $5K spend cap by default |
| **Agent Scale** | **Committed-use** from $2K/mo, ~30–50% off list at $20K/mo+ | High-volume vertical agents | Volume rates, dedicated capacity, named partner manager |
| **LLM Federation** | **Revenue share** (negotiated, typically 30/70 in favor of the platform on first $X, flipping at scale) | LLM vendors and major agent platforms (Anthropic, OpenAI, Cursor, etc.) embedding Margot as a default tool | Co-marketed listing, federated identity, joint reliability SLA, customer co-ownership, white-glove integration |

**Design notes:**
- Pricing the read at **$0.002** is a deliberate anchor below "GPT-class" token cost so an integrating agent never sees Margot as the expensive hop. The narrative and synthesis prices reflect that those calls do real model work and should not be loss-leaders.
- **Signed agent identity** is required even on the free tier. We need to know which agent is asking what, both for safety (Margot must refuse Proposal-mode data to an unauthorized caller) and for distribution analytics. This is also how we eventually price by agent reputation.
- **No "API access" in Rail A.** If you want Margot programmatically, you're on Rail B. This keeps the human pricing legible and protects the unit economics. Practice tier gets read-only API for the org's *own* data — that's an exception, not a contradiction.
- The **LLM Federation** tier exists to be picked up by exactly two or three deals over the next 18 months. It is priced like a partnership, not a product, on purpose.

### Why two rails, not one matrix

A unified usage-meter sounds elegant and signs zero contracts. Agency owners want predictable monthly bills; agent platforms want predictable unit economics. Forcing either onto the other's model is how AI products lose deals to a competitor whose pricing fits the buyer's mental model.

---

## 5. Discounting & motion

- **Annual plans:** 2 months free (≈17% off) on Studio and Practice. Cash flow + reduces churn measurement noise.
- **Founder discount:** 50% off Studio for 12 months if the agency is < 18 months old. Capped at 100 codes.
- **Fractional CFO firm partner program:** 30% rev share on Margot seats sold under a firm's name. Practice tier minimum.
- **Anthropic / OpenAI / Cursor first-listing deal:** if Margot is the *default* finance tool in their agent registry, base price → free for first 18 months in exchange for distribution. This is the deal worth losing the line item to win.

---

## 6. What this changes about the product

This is what the engineering team needs to know.

1. **Metering is now a first-class concern.** Today the app has no concept of plan, quota, or overage. The schema needs `Plan`, `Subscription`, `UsageEvent`, and `OverageCharge`. Narratives and CFO turns already exist as distinct events — instrument them.
2. **Modes become entitlement-gated.** Internal mode = all tiers. Proposal + Board = Studio and up. The mode picker UI should show locked modes with an upgrade affordance, not hide them. Aspiration sells.
3. **Agent endpoints are net-new.** A `/api/agent/v1/*` namespace with signed JWT auth (agent identity), and an MCP server exposing the same surface. Re-use the existing tool implementations in `src/lib/cfo-agent/tools/` — that's the moat. Don't fork.
4. **Public-facing site does not currently exist.** `src/app/page.tsx` is still the Next.js template. The marketing site is greenfield.
5. **Trust pages are not optional.** Audit log, status page (already exists at `/status`), security overview, data residency, sub-processor list. These are deal-blockers for Practice and Enterprise and reassurance for Studio.

---

## 7. Public web experience — strategic direction

The site has two audiences and must not feel split-brained. Solve by leading with the human story and giving agents a clearly-marked door.

### Structure

- **`/` Home** — Hero: *"Your CFO already knows the answer."* Live, scripted "Margot says…" demo (typed answers, no chat input — set expectations, don't promise interactivity). Three-mode showcase with toggle. Logos strip (testimonials from agencies once we have them; founders' notes until then). Single primary CTA: *Start with Margot — $49/mo*. Secondary CTA, smaller and lower: *Building an agent? Meet Margot's API →*.
- **`/product`** — Long-scroll. Sections: The Ledger (substrate), The Persona (voice, modes), The Narratives (sample artifacts as visual proof), The Imports, The Trust Layer (cites, audit log, period/basis on every number).
- **`/modes`** — One page that walks through Internal / Proposal / Board side-by-side with the same financial moment ("Q1 closed last night") rendered three ways. This page is the upgrade engine for Free → Studio.
- **`/pricing`** — Tabs: **For Teams** (Rail A) · **For Agents** (Rail B) · **For LLM Platforms** (Federation, contact). FAQ underneath. Annual toggle. Live overage calculator.
- **`/agents`** — Developer-marketing page. MCP endpoint, code samples, signed agent identity flow, pricing for Rail B, a 60-second "call Margot from your agent" quickstart. Link to docs.
- **`/docs`** — Full developer docs. Hosted under same domain. Includes the agent identity spec, narrative schema, and rate-limit rules.
- **`/customers`** — Case studies. Empty at launch is fine; structure the template now.
- **`/security`** — Sub-processors, encryption at rest/in transit, data residency, retention, audit log policy. Link to status page.
- **`/about`** — Founder note. The "why Margot is a person, not a feature" essay. Short.
- **`/blog`** — Two posts at launch: (1) *Why our CFO has a name*, (2) *What it means to build a tool for other AIs to use*.
- **`/login` · `/signup`** — Signup chooses path: *I run an agency* (Rail A onboarding) or *I'm building an agent* (Rail B onboarding with agent identity registration).

### Visual & voice direction

- **Voice:** Margot's voice on the marketing site too. Numbers-first. No exclamation marks. No "transform your business." Headlines are sentences a CFO would actually say.
- **Visual:** restrained. Editorial. Closer to *Stripe c.2019* than *current SaaS gradient soup*. Off-white background, deep ink primary, a single saturated accent (suggested: a muted oxblood — financial, serious, not a tech-bro purple).
- **Type:** a serif for display (e.g., Tiempos, IBM Plex Serif), a clean grotesque for body (Inter, or matching the app). The serif signals "this is a person, with judgment," not "this is a SaaS chart."
- **Proof artifacts everywhere:** render real Margot narratives as inline screenshots. The product *is* the marketing.

### What the site must NOT do

- No chat bubble pretending to be Margot. She's a real product, not a popup gimmick.
- No "AI" as a hero word. The persona is the hero; AI is the substrate.
- No three-step "Connect → Sync → Magic" diagram. That's table stakes; showing it cheapens the brand.

---

## 8. KPIs we'll watch

- **Activation:** new sign-up → first narrative generated (target: < 10 minutes, > 60%).
- **ICP fit:** % of paid accounts that are agencies in $1M–$10M (target: > 65% by month 6).
- **Mode unlock conversion:** % of Starter accounts that hit a Proposal/Board mode lock per month, % that upgrade (target: > 8% upgrade within 30 days of first lock).
- **Rail B leading indicator:** signed agent identities issued / mo, MCP read calls / mo. We won't have revenue here for a while; we need to see the call graph forming.
- **Federation deals:** binary, target 1–2 closed within 12 months.

---

## 9. Risks worth naming

- **Persona-as-product is brittle if Margot ever says something wrong.** Our cite-the-period-and-basis discipline is the seatbelt. Don't loosen it for cute copy.
- **Rail B has a long sales cycle and small early revenue.** Don't let Rail B distract from Rail A's first $1M ARR. Build the endpoints, ship the page, let it compound.
- **QB import is a commodity expectation.** Customers won't pay for it, but they'll churn without it. Stay current.
- **Anthropic / OpenAI build a "default finance tool" in-house.** This is the existential risk to the federation play. Mitigation: be the obvious partner before they decide to build, and lean into the data layer + persona, which are not what an LLM vendor wants to operate.

---

## 10. The build prompt

What follows is a single, self-contained prompt to paste into an agentic coding tool inside VS Code (Claude in VS Code, Cursor, Continue, Cline, Copilot Workspace — they all accept this shape). It assumes the agent has read access to the repo and write access via Edit/Write.

Paste this as one block. Do not edit unless you have a reason.

```
You are working in the `ledger-clone` Next.js 16 / React 19 / Prisma / Postgres
repo. Read `CLAUDE.md`, `AGENTS.md`, and `strategy/PRICING_AND_GTM.md` before
writing any code. Heed the `.vault/directives/` files and any
`<!-- vault-directive: ... -->` anchors. Follow existing conventions
(`src/app/(dashboard)`, `src/lib/cfo-agent`, vitest, tailwind v4). Do not
introduce new top-level dependencies without justification — Anthropic SDK,
NextAuth v5, Prisma 7, Zod 4, Recharts, exceljs, react-markdown are already
present.

Ship the following in three milestones, opening a separate PR per milestone.
Each PR must include tests (vitest) and an updated `strategy/CHANGELOG.md`
entry. Use small commits with messages in present tense.

──────────────────────────────────────────────
Milestone 1 — Pricing & entitlements (backend-first)
──────────────────────────────────────────────
Build the metering substrate. No UI changes yet.

1. Prisma schema additions:
   - `Plan` (id, slug ∈ {free, starter, studio, practice, enterprise,
     agent_dev, agent_pro, agent_scale, llm_federation},
     displayName, priceUsdCents, billingCadence, entitlementsJson)
   - `Subscription` (id, orgId, planId, status, currentPeriodStart,
     currentPeriodEnd, cancelAtPeriodEnd)
   - `UsageEvent` (id, orgId, agentIdentityId nullable, kind ∈
     {narrative_generated, cfo_turn, agent_read, agent_narrative,
     agent_synthesis}, units, occurredAt, metadataJson)
   - `OverageCharge` (id, orgId, periodStart, periodEnd, kind, units,
     unitPriceCents, totalCents, settledAt nullable)
   - `AgentIdentity` (id, ownerOrgId, publicKeyPem, displayName,
     issuedAt, revokedAt nullable, scopes string[])
   Create a migration; do not edit existing migrations.

2. Seed the five Rail A plans + four Rail B plans with the prices and caps
   in `strategy/PRICING_AND_GTM.md` §4. Entitlements JSON shape:
   `{ entities, narrativesPerMonth, cfoTurnsPerMonth, modes:
     ("internal"|"proposal"|"board")[], seats, importsEnabled,
     apiReadEnabled }`.

3. Add `src/lib/billing/entitlements.ts`:
   - `getEntitlements(orgId)`: resolves current plan + entitlements
   - `assertEntitlement(orgId, key)`: throws typed error
   - `recordUsage(orgId, kind, units, metadata?)`: writes UsageEvent and
     returns running period total
   - `computeOverage(orgId, periodStart, periodEnd)`: pure function

4. Wire entitlement checks into:
   - `src/app/api/narratives/generate/route.ts` — gate by plan, record usage
   - `src/app/api/cfo/chat/route.ts` — same; reject if over hard cap on Free
   - The CFO mode selector — proposal/board modes return 403 with a typed
     `PlanUpgradeRequired` error if entitlement is missing
   Use existing audit logging (`src/lib/audit.ts`) for every gate hit.

5. Tests:
   - Unit: `entitlements.test.ts`, `overage.test.ts`
   - Integration: extend `src/app/api/cfo/conversation-flow.test.ts` to
     cover Free hitting cap, Starter blocked from Proposal mode, Studio
     allowed
   - Run `pnpm test` (or `npm test`) and ensure green before opening PR.

──────────────────────────────────────────────
Milestone 2 — Agent rail (Rail B)
──────────────────────────────────────────────
Expose Margot to other agents. Reuse existing tool implementations; do not
fork them.

1. New route namespace `src/app/api/agent/v1/`:
   - `POST /api/agent/v1/identity/register` — accepts a public key, returns
     an AgentIdentity record. Free tier auto-issued; paid tiers require an
     associated Subscription.
   - `POST /api/agent/v1/query` — accepts `{ question, mode?, orgId }`,
     verifies signed JWT against AgentIdentity, calls the existing CFO
     agent loop in `src/lib/cfo-agent/loop.ts`, returns
     `{ answer, citations, usage }`. Records `agent_read` and, if a
     narrative is produced, `agent_narrative`.
   - `POST /api/agent/v1/narrative` — direct narrative generation surface.
   - `GET /api/agent/v1/usage` — current period usage and remaining quota.

2. Auth: bearer JWT signed by the agent's registered key. Implement in
   `src/lib/agent-auth.ts`. Verify signature, scopes, and revocation.
   Reject unsigned calls with 401; out-of-scope with 403.

3. MCP server: add `src/lib/mcp/server.ts` exposing the same query and
   narrative tools through MCP transport. Document the manifest in
   `docs/mcp.md`. Do not bundle into the Next.js runtime; ship as a
   sibling Node entry (`scripts/mcp-server.ts`) launchable via
   `npm run mcp`.

4. Rate limits: 60 req/min default on agent endpoints, configurable per
   AgentIdentity. Use an in-memory token bucket for now with a TODO to
   move to Redis. Do not introduce a new dep yet.

5. Tests:
   - JWT verification edge cases (expired, wrong key, revoked, scope
     mismatch)
   - Quota exhaustion path
   - Mode entitlement on the agent rail mirrors the human rail

──────────────────────────────────────────────
Milestone 3 — Public-facing marketing site
──────────────────────────────────────────────
Replace `src/app/page.tsx` (the Next.js template) with a real marketing
surface. Build at routes under a new `(marketing)` route group so it
doesn't inherit dashboard layout.

1. Routes to create (each its own `page.tsx`):
   - `/`           Home
   - `/product`    Product long-scroll
   - `/modes`      Three modes side-by-side
   - `/pricing`    Tabs: Teams / Agents / LLM Platforms
   - `/agents`     Rail B developer-marketing page
   - `/security`   Trust page
   - `/about`      Founder note
   - `/blog`       Index + two MDX posts
   - `/customers`  Empty-state template, ready for case studies

   Plus a marketing-shell `layout.tsx` with header (logo, Product, Modes,
   Pricing, Docs, Sign in, Start with Margot CTA) and footer
   (security, status, blog, about, X/LinkedIn).

2. Visual system (Tailwind v4, no new CSS framework):
   - Background: `bg-stone-50` light / `bg-stone-950` dark
   - Ink: `text-stone-900` / `text-stone-100`
   - Accent: a muted oxblood — define `--color-accent: oklch(0.42 0.13 25)`
     in `globals.css` and expose as `bg-accent` / `text-accent` via Tailwind
     v4 `@theme`.
   - Display type: a serif via `next/font` (suggested: `Newsreader` from
     Google Fonts — free, editorial, no licensing risk). Body type stays as
     the existing sans.
   - No gradients. No glassmorphism. No emoji. Margot would hate it.

3. Required content / components:
   - `<Hero />` with the scripted "Margot says…" rotating answer.
     Build it as a deterministic typewriter that cycles three real
     narrative excerpts (sourced from `src/lib/cfo-agent/persona.ts`'s
     voice constraints, hand-written — NOT generated at request time).
   - `<ModesSideBySide />` — three columns rendering the same financial
     moment in Internal / Proposal / Board voice. Hand-write the copy
     so it ships well; do not call the LLM on a public page.
   - `<PricingTable />` driven by the same Plan rows seeded in Milestone 1.
     Read from DB at build time (Next.js `generateStaticParams` or
     a static fetch in a server component). Annual / monthly toggle.
   - `<OverageCalculator />` — pure client component. Sliders for
     narratives/turns over cap; live total.
   - `<AgentQuickstart />` — copy-able `curl` and TypeScript snippets
     showing a signed agent call. Pulls API base URL from env.
   - `<TrustStrip />` — period+basis cites, audit log, sub-processors.

4. Voice rules for ALL marketing copy:
   - Numbers first. No "transform your business."
   - No emoji. No exclamation marks.
   - Headlines are sentences a CFO would say out loud.
   - Forbidden phrases (add to a lint rule if cheap): "unlock," "supercharge,"
     "revolutionize," "powered by AI," "next-generation."

5. SEO baseline:
   - Per-route `metadata` exports with real titles + descriptions
   - `app/sitemap.ts` and `app/robots.ts`
   - OG images: a single shared template at `/og` route returning
     dynamic OG via `next/og`, rendered server-side in Newsreader on a
     stone background with the page title and Margot's wordmark

6. Tests:
   - Component tests for `<PricingTable />` (reads correct plan rows,
     shows overage rates, toggles annual)
   - Component test for `<OverageCalculator />` math
   - E2E smoke (Playwright is fine; if not installed, defer with a TODO
     and ship vitest+RTL only)
   - Lighthouse: targets perf > 90, a11y > 95 on `/` and `/pricing`

──────────────────────────────────────────────
Cross-cutting constraints
──────────────────────────────────────────────
- Do not modify `src/lib/cfo-agent/persona.ts` voice rules. They are the
  brand bible.
- Do not invent pricing not in §4 of the strategy doc. If a number is
  missing, leave a TODO and surface it in the PR description.
- Every new route, function, and Prisma model gets at minimum one test.
- Every PR description includes: scope, what's NOT in scope, screenshots
  for UI changes, and a "risks" section.
- If a step is ambiguous, prefer the option that is easiest to undo.

When all three milestones are merged, output a final summary message
listing: routes created, models added, endpoints exposed, plans seeded,
and any deferred TODOs. Do not mark the work done until tests pass and
`npm run build` succeeds.
```

---

## Appendix — sanity-check numbers

Margot's marginal LLM cost per narrative: assume ~8K input tokens + ~1.5K output ≈ $0.04–$0.08 at Sonnet rates. Studio includes 500 narratives → ~$30 cost at the ceiling on a $199 plan. Gross margin on Studio ≥ 80% even at full burn. Practice 2,500 narratives → ~$150 cost on $599 → still ≥ 70%. Numbers hold. (Re-run when actual telemetry exists. These are estimating envelopes, not commitments.)
