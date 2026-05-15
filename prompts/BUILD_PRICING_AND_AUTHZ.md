# Build Prompt — Pricing, Entitlements & Authorization (run in VS Code with Claude Sonnet)

> Paste the entire prompt block below into your agentic coder of choice (Claude in VS Code, Cursor, Continue, Cline, Copilot Workspace). It is self-contained and assumes the agent has read access to the repo and write access via Edit/Write/Bash.
>
> This prompt picks up after the marketing site and the pricing strategy (see `strategy/PRICING_AND_GTM.md`) have shipped. It implements the system that makes the pricing real: plans, entitlements, role-based authorization, billing, quota metering, and UI gating — end-to-end.
>
> Expect this to span 7 PRs. Do not collapse them — each one needs to be reviewable on its own.

---

## How to use

1. Open the repo in VS Code.
2. Open your agentic coder pane and ensure the model is Claude Sonnet (4.5 or 4.6).
3. Paste the prompt block (everything between the ``` fences below) as one message.
4. Let it work milestone by milestone. After each milestone the agent should pause for review, push a PR, and wait for you to merge before continuing.

---

```
You are an agentic coding assistant working in the `ledger-clone` repo. Before
writing any code, read the following in order:

  1. `CLAUDE.md` and `AGENTS.md` (and any file referenced from them)
  2. `strategy/PRICING_AND_GTM.md` — the pricing & GTM strategy. This is the
     authoritative source of plan shapes, prices, value metrics, and which
     features sit behind which tier. If you find yourself inventing a number
     or a tier, stop and re-read §4 of that doc.
  3. `prisma/schema.prisma` — current data model. Note that `Company` is the
     tenant boundary, `UserRole` is `ADMIN | MEMBER | VIEWER`, and
     `IngestAudit` / `AccessAudit` already exist. Do not duplicate them.
  4. `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/lib/auth-helpers.ts`
     — current auth surface. `requireAdmin`, `requireSession`, `requireTenant`
     exist. Build on top of them; do not replace them.
  5. `src/middleware.ts` — current public-path and admin-gate behavior.
  6. `src/lib/cfo-agent/` — the Margot agent. Pay special attention to
     `loop.ts`, `modes.ts`, `persona.ts`, and `tools/`.
  7. Every file under `src/app/api/` — these are the surfaces that need to be
     gated.

Stack: Next.js 16 (App Router), React 19, Prisma 7 on Postgres, NextAuth v5
(credentials provider), Tailwind v4, Zod 4, vitest. The Anthropic SDK is
already installed. Do not introduce new top-level dependencies without
justification. Specifically you MAY add: `stripe` (server SDK),
`@stripe/stripe-js` (browser, only if needed for redirects). You MAY NOT
add: CASL, accesscontrol, any ORM that isn't Prisma, any new state lib.

Heed `.vault/directives/` and any `<!-- vault-directive: ... -->` anchors.
This is NOT vanilla Next.js — read `node_modules/next/dist/docs/` for any
API you are not 100% sure about. Heed deprecation notices.

Open a SEPARATE PR per milestone. Each PR must:
  - Include vitest coverage for new code paths (unit + at least one
    integration test against the route or component it touches).
  - Include a `strategy/CHANGELOG.md` entry summarizing the change.
  - Include a "Risks" section in the PR description.
  - Be runnable (`npm run build` green, `npm test` green) before opening.

If a step is ambiguous, prefer the option that is reversible. If you find a
contradiction between this prompt and the strategy doc, surface it in the PR
description and follow the strategy doc.

When you complete a milestone, output a short summary and STOP. Wait for me
to say "continue" before starting the next milestone.

══════════════════════════════════════════════════════════════════════════
MILESTONE 1 — Plans, subscriptions, usage events (schema + core lib)
══════════════════════════════════════════════════════════════════════════

Goal: introduce the billing primitives. No behavior changes yet — code paths
remain unchanged. New tables, new helpers, seeds, and unit tests only.

1.1  Prisma schema additions (one migration, name it
     `add_billing_primitives`):

     model Plan {
       id             String   @id @default(cuid())
       slug           PlanSlug @unique
       displayName    String
       priceUsdCents  Int
       billingCadence BillingCadence
       rail           PricingRail
       entitlements   Json     // see §1.2
       isPublic       Boolean  @default(true)  // false for grandfathered/custom
       sortOrder      Int      @default(0)
       createdAt      DateTime @default(now())
       updatedAt      DateTime @updatedAt
       subscriptions  Subscription[]
     }

     enum PlanSlug {
       FREE
       STARTER
       STUDIO
       PRACTICE
       ENTERPRISE
       AGENT_DEV
       AGENT_PRO
       AGENT_SCALE
       LLM_FEDERATION
     }

     enum BillingCadence { MONTHLY ANNUAL USAGE CUSTOM }
     enum PricingRail   { HUMAN AGENT }

     model Subscription {
       id                   String              @id @default(cuid())
       companyId            String              @unique
       company              Company             @relation(fields: [companyId], references: [id])
       planId               String
       plan                 Plan                @relation(fields: [planId], references: [id])
       status               SubscriptionStatus  @default(TRIALING)
       currentPeriodStart   DateTime
       currentPeriodEnd     DateTime
       cancelAtPeriodEnd    Boolean             @default(false)
       trialEndsAt          DateTime?
       stripeCustomerId     String?
       stripeSubscriptionId String?             @unique
       createdAt            DateTime            @default(now())
       updatedAt            DateTime            @updatedAt
     }

     enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELED PAUSED }

     model UsageEvent {
       id              String      @id @default(cuid())
       companyId       String
       company         Company     @relation(fields: [companyId], references: [id])
       userId          String?
       agentIdentityId String?
       kind            UsageKind
       units           Int         @default(1)
       occurredAt      DateTime    @default(now())
       metadata        Json?

       @@index([companyId, kind, occurredAt])
       @@index([agentIdentityId, kind, occurredAt])
     }

     enum UsageKind {
       NARRATIVE_GENERATED
       CFO_TURN
       MODE_PROPOSAL_USED
       MODE_BOARD_USED
       IMPORT_RUN
       AGENT_READ
       AGENT_NARRATIVE
       AGENT_SYNTHESIS
     }

     model OverageCharge {
       id            String   @id @default(cuid())
       companyId     String
       company       Company  @relation(fields: [companyId], references: [id])
       periodStart   DateTime
       periodEnd     DateTime
       kind          UsageKind
       units         Int
       unitPriceCents Int
       totalCents    Int
       settledAt     DateTime?
       createdAt     DateTime @default(now())

       @@index([companyId, periodStart])
     }

     model AgentIdentity {
       id           String   @id @default(cuid())
       ownerCompanyId String
       ownerCompany Company  @relation(fields: [ownerCompanyId], references: [id])
       displayName  String
       publicKeyPem String   @db.Text
       scopes       String[] // see §1.3 for scope strings
       issuedAt     DateTime @default(now())
       revokedAt    DateTime?
       lastUsedAt   DateTime?

       @@index([ownerCompanyId])
     }

     Add the new back-relations on `Company`:
       subscription   Subscription?
       usageEvents    UsageEvent[]
       overageCharges OverageCharge[]
       agentIdentities AgentIdentity[]

1.2  Entitlement shape (single source of truth). Create
     `src/lib/billing/plans.ts` exporting a TYPED const matching what
     `Plan.entitlements` JSON will hold:

     export type Entitlements = {
       maxEntities: number | "unlimited";
       narrativesPerMonth: number | "unlimited";
       cfoTurnsPerMonth: number | "unlimited";
       modes: ("INTERNAL_CFO" | "PROPOSAL_BIZDEV" | "BOARD_INVESTOR")[];
       seats: number | "unlimited";
       imports: ("CSV" | "QB" | "BANK" | "ALL")[];
       apiReadEnabled: boolean;          // Rail A: read-only own data
       agentRailEnabled: boolean;        // Rail B endpoints
       overage: {
         narrative: { unitPriceCents: number } | null;
         cfoTurn:   { unitPriceCents: number } | null;
       };
       support: "COMMUNITY" | "EMAIL" | "PRIORITY" | "DEDICATED";
       sso: boolean;
       auditLogExport: boolean;
       whiteLabel: boolean;
     };

     Then export PLAN_DEFINITIONS: Record<PlanSlug, { displayName, price,
     cadence, rail, entitlements }> that EXACTLY matches §4 of
     `strategy/PRICING_AND_GTM.md`. Do not invent. If a number is missing,
     stop and add a TODO with the field name and a question for the
     product owner.

1.3  Agent scope strings (used in §1.1 AgentIdentity.scopes and in
     Milestone 6):
       "agent:read"
       "agent:narrative"
       "agent:synthesis"
       "agent:mode:internal"
       "agent:mode:proposal"
       "agent:mode:board"

     Encode these as a const `AGENT_SCOPES` in
     `src/lib/billing/agent-scopes.ts`.

1.4  Seed script: `prisma/seed-plans.ts` that upserts every PLAN_DEFINITIONS
     row. Wire it into `prisma/seed.ts` (create if it doesn't exist) and
     into `package.json` scripts as `db:seed`. Calling it twice must be a
     no-op (use upsert keyed on slug).

1.5  Entitlement resolution library at `src/lib/billing/entitlements.ts`:

     - `getActivePlan(companyId): Promise<{ plan, subscription, entitlements }>`
       Resolves the company's current subscription. If none exists, returns
       the FREE plan with a synthetic "implicit" subscription (do NOT write
       to DB on read). Cache per request using React's `cache()`.

     - `recordUsage(opts: { companyId, userId?, agentIdentityId?, kind, units?, metadata? }): Promise<{ runningTotal, withinCap, overageUnits }>`
       Writes a UsageEvent and returns the running total for the current
       billing period. Use the subscription's currentPeriodStart/End if
       present; otherwise calendar month UTC.

     - `assertEntitlement(companyId, key: EntitlementKey): Promise<void>`
       Throws a `PlanUpgradeRequired` typed error (see §1.6) if the
       entitlement is missing. EntitlementKey is a discriminated union
       covering all gated capabilities (e.g. `{ kind: "mode", mode:
       "PROPOSAL_BIZDEV" }`, `{ kind: "feature", feature: "imports.QB" }`,
       `{ kind: "quota", quota: "narrativesPerMonth" }`).

     - `checkQuota(companyId, kind: UsageKind): Promise<{ used, cap, remaining, overageUnitPriceCents | null }>`
       Pure read; does not write. Used by UI meters and by route handlers
       before the work.

     - `computeOverage(companyId, periodStart, periodEnd): Promise<OverageBreakdown>`
       Pure function over UsageEvent rows. Returns per-kind units beyond
       cap and total cents. Does NOT write OverageCharge rows — that's
       Milestone 3's job (Stripe webhook close-of-period).

1.6  Typed errors at `src/lib/billing/errors.ts`:

     export class PlanUpgradeRequired extends Error {
       constructor(public requiredPlanSlug: PlanSlug, public reason: string) {
         super(`Plan upgrade required: ${reason}`);
         this.name = "PlanUpgradeRequired";
       }
     }
     export class QuotaExceeded extends Error {
       constructor(
         public kind: UsageKind,
         public used: number,
         public cap: number,
         public overageAvailable: boolean
       ) {
         super(`Quota exceeded for ${kind}: ${used}/${cap}`);
         this.name = "QuotaExceeded";
       }
     }
     export class EntitlementDenied extends Error { /* generic fallback */ }

1.7  Tests:
     - `entitlements.test.ts`: every plan resolves; mode gating works;
       quota math correct across calendar boundaries; FREE fallback when no
       subscription row.
     - `overage.test.ts`: under-cap returns 0; at-cap returns 0; over-cap
       computes correct cents using the plan's overage unitPriceCents.
     - `plans.test.ts`: snapshot test of PLAN_DEFINITIONS so any price
       drift trips review.

When green, open PR #1 titled `feat(billing): plans, subscriptions, usage
events`. STOP. Wait for "continue".

══════════════════════════════════════════════════════════════════════════
MILESTONE 2 — Authorization layer (roles × capabilities) and unified guard
══════════════════════════════════════════════════════════════════════════

Goal: a single place that answers "can THIS user, in THIS company, on THIS
plan, do THIS thing?" — for use in API routes, server components, and
client guards.

2.1  Role/capability map at `src/lib/authz/capabilities.ts`:

     type Capability =
       | "company.settings.read"        | "company.settings.write"
       | "people.read"                  | "people.write"
       | "projects.read"                | "projects.write"
       | "periods.read"                 | "periods.write"
       | "imports.run"
       | "narratives.read"              | "narratives.generate"
       | "cfo.chat"
       | "cfo.mode.internal"            | "cfo.mode.proposal"  | "cfo.mode.board"
       | "billing.read"                 | "billing.manage"
       | "members.invite"               | "members.remove"     | "members.role.change"
       | "agent.identity.issue"         | "agent.identity.revoke"
       | "admin.users.read"             | "admin.users.write"
       | "admin.ingest.run";

     const ROLE_CAPABILITIES: Record<UserRole, Set<Capability>> = {
       ADMIN:  /* all of the above except agent.identity.* outside of
                   billing.manage scope handled below */,
       MEMBER: /* read everything in tenant, write everything except
                   billing.*, members.*, admin.* */,
       VIEWER: /* read-only across tenant; no cfo.mode.* writes */,
     };

     Justify any deviation from this matrix inline. Add a vitest snapshot
     so future role changes require updating the test.

2.2  Capability helper at `src/lib/authz/can.ts`:

     export async function can(
       session: SessionLike,
       capability: Capability,
       resource?: { companyId: string; ownerId?: string }
     ): Promise<boolean>;

     export async function assertCan(
       session: SessionLike,
       capability: Capability,
       resource?: { companyId: string; ownerId?: string }
     ): Promise<void>;

     `can` returns false on any role miss, tenant mismatch, or revoked
     subscription. `assertCan` throws an `AuthorizationDenied` typed error.
     Both must short-circuit on tenant mismatch BEFORE evaluating role —
     leaking which capabilities a tenant has is a small but real info-leak.

2.3  Unified route guard at `src/lib/authz/guard.ts`:

     export type GuardOptions = {
       capability?: Capability;
       entitlement?: EntitlementKey;
       recordUsage?: { kind: UsageKind; units?: number };
       allowAgentRail?: boolean;  // see Milestone 6
     };

     export function withGuard<TArgs extends unknown[], TRet>(
       opts: GuardOptions,
       handler: (ctx: GuardContext, ...args: TArgs) => Promise<TRet>
     ): (req: Request, ...args: TArgs) => Promise<Response>;

     GuardContext exposes `{ session, companyId, plan, entitlements,
     recordUsage(): Promise<void> }`. The guard:
       (a) resolves session via existing requireSession() helper
       (b) asserts capability (if provided)
       (c) asserts entitlement (if provided)
       (d) executes handler
       (e) on success, records usage (if recordUsage opt set) AFTER the
           work succeeded — never bill for a failed call.
       (f) on any thrown PlanUpgradeRequired → 402 with structured JSON
           on QuotaExceeded → 429 with structured JSON
           on AuthorizationDenied → 403
           on missing session → 401

     All thrown audit entries should flow into `AccessAudit` via the
     existing `src/lib/audit.ts` helper. Every guard hit writes an audit
     row regardless of outcome.

2.4  Update `src/lib/auth-helpers.ts`:
     - Add `requireRole(role: UserRole | UserRole[])` for places that still
       want the simpler check. Keep `requireAdmin` as a thin wrapper.
     - Do NOT remove existing helpers. Migration to `withGuard` is gradual.

2.5  Refactor `src/middleware.ts`:
     - Keep the public-paths list. Move `/api/admin` enforcement out of
       middleware; admin routes will use `withGuard({ capability:
       "admin.*" })` per-route instead. (Middleware can't see DB; we want
       a single enforcement path.)
     - Add `/api/agent/v1` to public paths AT THE MIDDLEWARE LAYER (the
       agent rail does its own JWT auth in Milestone 6). Do NOT mark them
       as public elsewhere.
     - Add `/api/billing/webhook` to public paths (Stripe webhook).
     - Add `/api/billing/*` (non-webhook) as session-required, no role
       check at middleware (guard handles per-action).

2.6  Tests:
     - `can.test.ts`: each role × each capability, plus cross-tenant
       denials.
     - `guard.test.ts`: 401/402/403/429 paths, audit row written on all
       outcomes, recordUsage only on success.
     - One canary integration test: convert
       `src/app/api/people/route.ts` GET to use the guard and confirm a
       VIEWER from another company is 403'd.

Open PR #2 titled `feat(authz): capabilities, can(), unified withGuard`.
STOP.

══════════════════════════════════════════════════════════════════════════
MILESTONE 3 — Stripe integration (Rail A subscriptions + overage billing)
══════════════════════════════════════════════════════════════════════════

Goal: connect Subscription/OverageCharge to a real billing provider so
upgrades, downgrades, cancellations, and overage settlement work.

3.1  Provider abstraction at `src/lib/billing/provider/index.ts`:

     export interface BillingProvider {
       ensureCustomer(company: Company): Promise<{ customerId: string }>;
       startCheckout(opts: { companyId, planSlug, returnUrl }): Promise<{ url: string }>;
       openPortal(opts: { companyId, returnUrl }): Promise<{ url: string }>;
       reportUsage(opts: { companyId, kind: UsageKind, units, occurredAt }): Promise<void>;
       cancel(opts: { companyId, atPeriodEnd: boolean }): Promise<void>;
     }

     Implement Stripe in `src/lib/billing/provider/stripe.ts`. Read
     STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET from env. Add a noop
     provider at `src/lib/billing/provider/noop.ts` for local dev when no
     Stripe key is set. Choose at boot via env, default to noop in
     development.

3.2  Stripe product/price mapping:
     - Document in `docs/billing-stripe.md` how to create the products and
       prices in the Stripe dashboard (or via `stripe` CLI) and how to
       record the resulting Price IDs into env (`STRIPE_PRICE_STARTER`,
       `STRIPE_PRICE_STUDIO`, `STRIPE_PRICE_PRACTICE`,
       `STRIPE_PRICE_NARRATIVE_OVERAGE`, `STRIPE_PRICE_CFO_TURN_OVERAGE`).
     - Add an env validation step at boot: if `BILLING_PROVIDER=stripe`,
       all required env vars must be present or the process refuses to
       start.

3.3  Routes:
     - `POST /api/billing/checkout` — guard with `capability:
       "billing.manage"`. Body: `{ planSlug }`. Calls provider
       startCheckout, returns `{ url }`.
     - `POST /api/billing/portal` — same capability. Returns portal URL.
     - `GET /api/billing/subscription` — `billing.read`. Returns current
       plan + usage summary (uses `checkQuota` for each metered kind).
     - `POST /api/billing/webhook` — Stripe webhook. Verify signature.
       Handle: `customer.subscription.created`,
       `customer.subscription.updated`, `customer.subscription.deleted`,
       `invoice.paid`, `invoice.payment_failed`. Update Subscription rows
       atomically. Never trust client input.
     - `POST /api/billing/cancel` — `billing.manage`. Marks
       cancelAtPeriodEnd; defers actual cancel to webhook.

3.4  Overage close-of-period job:
     - Add `src/lib/billing/close-period.ts`:
       `closePeriodForCompany(companyId)` reads UsageEvents for the period,
       computes overage via `computeOverage`, writes OverageCharge rows,
       and posts usage to Stripe via `provider.reportUsage`. Idempotent
       per (companyId, kind, periodStart).
     - Webhook for `invoice.created` triggers close for the company whose
       period is closing.
     - Add `scripts/close-period.ts` for manual replay.

3.5  Migration: every existing Company row gets a Subscription seeded to
     FREE on first run of the new seeder, UNLESS one exists. Wire into
     `prisma/seed.ts`. For non-empty production tenants, add a one-shot
     `scripts/backfill-subscriptions.ts` that the owner can run once.

3.6  Tests:
     - Unit: each webhook event type mutates Subscription correctly.
     - Unit: `closePeriodForCompany` idempotency (run twice, one set of
       OverageCharge rows).
     - Integration: end-to-end with the Stripe test mode using `nock` or
       Stripe's official test fixtures. If the Stripe SDK is hard to mock,
       isolate the provider behind the interface and test
       `closePeriodForCompany` against the noop provider.

Open PR #3 titled `feat(billing): Stripe provider, checkout, webhook,
overage close`. STOP.

══════════════════════════════════════════════════════════════════════════
MILESTONE 4 — API enforcement (every existing route)
══════════════════════════════════════════════════════════════════════════

Goal: every existing API surface is wrapped by `withGuard`, with the right
capability + entitlement + usage recording. No surface goes ungated.

Walk through each route below. For each, the agent must:
  (a) Convert handler to `withGuard(...)` form.
  (b) Add capability + entitlement + recordUsage as specified.
  (c) Replace any ad-hoc `requireAdmin`/`requireSession` with the guard.
  (d) Add or extend a vitest covering 401/402/403/429.

Route map (apply in this order):

| Route                                             | Method  | Capability                 | Entitlement                                     | Record usage              |
|---------------------------------------------------|---------|----------------------------|--------------------------------------------------|---------------------------|
| /api/account                                      | GET     | (session only)             | —                                                | —                         |
| /api/settings                                     | GET/PUT | company.settings.read/write| —                                                | —                         |
| /api/projects, /api/projects/[id]                 | GET     | projects.read              | —                                                | —                         |
| /api/projects, /api/projects/[id]                 | POST/PUT/DELETE | projects.write     | —                                                | —                         |
| /api/people, /api/people/[id]                     | GET     | people.read                | —                                                | —                         |
| /api/people, /api/people/[id]                     | POST/PUT/DELETE | people.write       | —                                                | —                         |
| /api/periods                                      | GET     | periods.read               | —                                                | —                         |
| /api/imports/quickbooks                           | POST    | imports.run                | `{ kind: "feature", feature: "imports.QB" }`     | `IMPORT_RUN`              |
| /api/narratives                                   | GET     | narratives.read            | —                                                | —                         |
| /api/narratives/[id]                              | GET     | narratives.read            | —                                                | —                         |
| /api/narratives/generate                          | POST    | narratives.generate        | `{ kind: "quota", quota: "narrativesPerMonth" }` | `NARRATIVE_GENERATED`     |
| /api/narratives/scheduled                         | POST    | narratives.generate        | same                                              | `NARRATIVE_GENERATED`     |
| /api/analysis/narrative                           | POST    | narratives.generate        | same                                              | `NARRATIVE_GENERATED`     |
| /api/cfo/conversations                            | GET/POST| cfo.chat                   | —                                                | —                         |
| /api/cfo/conversations/[id]                       | GET/DELETE | cfo.chat                | —                                                | —                         |
| /api/cfo/chat                                     | POST    | cfo.chat + cfo.mode.<mode> | `{ kind: "quota", quota: "cfoTurnsPerMonth" }` AND `{ kind: "mode", mode: <mode> }` | `CFO_TURN` (always) plus `MODE_PROPOSAL_USED` / `MODE_BOARD_USED` if applicable |
| /api/admin/users, /api/admin/users/[id]           | *       | admin.users.read/write     | —                                                | —                         |
| /api/admin/ingest                                 | POST    | admin.ingest.run           | —                                                | —                         |
| /api/healthz, /api/status                         | GET     | (public)                   | —                                                | —                         |

Special handling:

4.1  Mode enforcement on `/api/cfo/chat`:
     - Read the `mode` field from request body (typed via Zod).
     - Map to capability AND entitlement:
         INTERNAL_CFO → cfo.mode.internal (capability) + always entitled
         PROPOSAL_BIZDEV → cfo.mode.proposal + entitlement check
         BOARD_INVESTOR  → cfo.mode.board    + entitlement check
     - On entitlement denial return 402 with body
       `{ error: "PlanUpgradeRequired", requiredPlanSlug: "STUDIO",
          reason: "Proposal mode requires Studio or higher",
          upgradeUrl: "/account/billing?upgrade=STUDIO" }`.
     - Record `CFO_TURN` always. Record the mode-specific UsageKind only
       on success.

4.2  Hard cap on FREE plan:
     - FREE: hitting narrative or cfo-turn cap returns 402 (NOT 429). Free
       has no overage; upsell path is the only correct response.
     - STARTER and above: hitting cap returns 200 (work proceeds) and
       records an OverageEligible flag in the response so the UI can show
       "you're now in overage at $0.05/turn". OverageCharge rows are NOT
       written here (close-of-period job owns that).

4.3  Tenant isolation audit:
     - For every route, inspect every Prisma query touched. If any query
       does not constrain by `companyId`, fix it. Add a vitest case that
       attempts cross-tenant read/write and asserts 404 (not 403 — leak
       less).

4.4  Conversation-flow integration test:
     - Extend `src/app/api/cfo/conversation-flow.test.ts` to cover:
         (i)   FREE hits 5-narrative cap → 402 with upgrade payload
         (ii)  STARTER selects PROPOSAL mode → 402
         (iii) STUDIO hits narrative cap → 200 with overageEligible: true,
               UsageEvent recorded
         (iv)  VIEWER attempts narratives.generate → 403

Open PR #4 titled `feat(authz): enforce entitlements + capabilities on all
API routes`. STOP.

══════════════════════════════════════════════════════════════════════════
MILESTONE 5 — UI gating, quota meters, upgrade affordances
══════════════════════════════════════════════════════════════════════════

Goal: the app surfaces what's locked, what's about to be locked, and how to
unlock. Margot's voice on every piece of copy. No emoji.

5.1  Server-rendered entitlement context:
     - `src/app/(dashboard)/layout.tsx` resolves entitlements once and
       passes via a server component down. For the few client components
       that need it live, expose
       `GET /api/billing/subscription` and call from a
       `useEntitlements()` SWR-free fetch hook in
       `src/lib/billing/use-entitlements.ts`. Do NOT introduce SWR/Query.
       Use `use()` + cached fetch.

5.2  Components:
     - `<UpgradeLock plan="STUDIO" reason="…">{children}</UpgradeLock>`
       Renders children with a blur overlay and a CTA when the current
       plan is below the required plan. Aspirational, not punitive.
     - `<QuotaMeter kind="NARRATIVE_GENERATED" />` — bar + "X of Y used
       this month" + overage rate if applicable.
     - `<PlanBadge />` — small chip in the top nav showing current plan;
       click → /account/billing.
     - `<OveragePill />` — appears only when current period has overage
       units > 0.

5.3  Surface-by-surface:
     - `/cfo` page: mode selector — Proposal and Board appear, but if
       locked render `<UpgradeLock plan="STUDIO" reason="Proposal mode is
       part of Studio.">` over the option. Clicking lands them on
       `/account/billing?upgrade=STUDIO`.
     - `/narratives` page: above the list, a `<QuotaMeter kind=
       "NARRATIVE_GENERATED" />`. If at cap and FREE, the "Generate"
       button is replaced with "Upgrade to keep generating".
     - `/imports` page: if `imports.QB` isn't entitled, the QuickBooks
       card shows the lock overlay.
     - `/dashboard` page: at top, a thin banner ONLY when subscription
       status ∈ {PAST_DUE, PAUSED} OR a quota is ≥ 80% consumed.
     - `/admin` page: members table gains a Role column with role-change
       dropdown gated by `members.role.change`.

5.4  New page: `/account/billing`
     - Current plan card with rail badge.
     - Quota meters for every metered kind.
     - Plan comparison table (reads PLAN_DEFINITIONS).
     - "Change plan" button → /api/billing/checkout
     - "Manage billing" button → /api/billing/portal
     - Recent invoices summary (read from Stripe via portal link; do not
       reimplement an invoices viewer).
     - If on AGENT rail (post-Milestone 6), link to /account/agents.

5.5  Voice/copy rules (mirror the marketing site):
     - "You're at 487 of 500 narratives this period." Not "You've almost
       hit your limit!"
     - "Proposal mode is part of Studio." Not "Unlock Proposal mode!"
     - No exclamation marks anywhere in upgrade copy. No emoji.

5.6  Tests:
     - Component tests for each new component (math, locked state,
       overage state).
     - One Playwright (or RTL-level) test that simulates FREE plan
       attempting to switch to PROPOSAL mode and sees the upgrade affordance.
     - Visual snapshot for `<UpgradeLock />` in locked vs unlocked.

Open PR #5 titled `feat(ui): entitlement-aware UI, quota meters, upgrade
affordances`. STOP.

══════════════════════════════════════════════════════════════════════════
MILESTONE 6 — Agent rail authorization (Rail B from strategy doc §4)
══════════════════════════════════════════════════════════════════════════

Goal: the same entitlement engine drives the agent endpoints. AgentIdentity
maps to scopes which map to capabilities + entitlements.

6.1  Agent JWT scheme:
     - Bearer JWT signed by the AgentIdentity's private key (Ed25519
       preferred). We hold only the public key.
     - Required claims: iss (agent identity id), aud ("margot-agent-rail"),
       exp (≤ 10 min from iat), sub (companyId being acted on), scope
       (space-separated subset of AGENT_SCOPES).
     - Implement verification in `src/lib/agent-auth.ts`. Use Node's
       `crypto.subtle` — do not introduce a JOSE library unless absolutely
       required (justify in PR if so).

6.2  Identity issuance:
     - `POST /api/agent/v1/identity/register`
       Guard: capability `agent.identity.issue`. Body includes
       `publicKeyPem`, requested `scopes`. Plan must have
       `agentRailEnabled: true` — FREE/STARTER/STUDIO do not; PRACTICE,
       AGENT_DEV, AGENT_PRO, AGENT_SCALE, LLM_FEDERATION do.
     - `DELETE /api/agent/v1/identity/:id`
       Guard: `agent.identity.revoke`.

6.3  Agent endpoints (each calls `withGuard({ allowAgentRail: true, …})`):
     - `POST /api/agent/v1/query` — scope `agent:read` plus optional
       `agent:mode:*` if `mode` provided. Entitlement: mode entitlement on
       the company's plan (NOT the agent's plan). Records `AGENT_READ`,
       and `MODE_*_USED` if applicable.
     - `POST /api/agent/v1/narrative` — scope `agent:narrative`.
       Entitlement: `narratives.generate` on company plan. Records
       `AGENT_NARRATIVE` and (because narratives are LLM-generated) also
       `NARRATIVE_GENERATED` so the company sees consistent usage.
     - `POST /api/agent/v1/synthesis` — scope `agent:synthesis`. Records
       `AGENT_SYNTHESIS` + `CFO_TURN`.
     - `GET /api/agent/v1/usage` — scope `agent:read`. Returns current
       period usage and remaining quota for the bound company.

6.4  Agent rail handling inside `withGuard`:
     - When `allowAgentRail: true`, the guard accepts either a session
       cookie OR a verified agent JWT.
     - If agent JWT: resolves companyId from JWT sub claim; loads
       AgentIdentity; checks scope ⊇ required scopes; populates
       `GuardContext.agent` with identity + scopes.
     - Capability checks for agent calls map to scopes, not roles. A
       table:
         capability cfo.chat        ← any of agent:read / agent:synthesis
         capability narratives.generate ← agent:narrative
         capability cfo.mode.proposal ← agent:mode:proposal
       The mapping lives in `src/lib/authz/agent-capability-map.ts`.

6.5  Margot's mode safety for agents:
     - Proposal mode for an agent caller requires BOTH
       `agent:mode:proposal` scope AND a verified `actsOnBehalfOf` claim
       in the JWT (free-form string, recorded in audit). This is the
       guardrail that prevents an off-the-shelf agent from impersonating
       the customer's biz-dev rep.
     - Board mode for an agent caller is DENIED unless the AgentIdentity
       was issued by an ADMIN (track via `AgentIdentity.issuedByUserId`).

6.6  Rate limiting:
     - In-memory token bucket at `src/lib/agent-auth/rate-limit.ts`.
     - Default 60 req/min per AgentIdentity; override per identity via a
       new optional `rateLimitPerMinute` column on AgentIdentity (add to
       schema in this milestone).
     - Add a TODO to move to Redis once we have more than one server
       process in prod.

6.7  MCP entry point:
     - `scripts/mcp-server.ts` exposes the same query/narrative tools via
       MCP (Anthropic's Model Context Protocol). Document the manifest at
       `docs/mcp.md`. The MCP entry point reuses the same `withGuard`
       internals — no parallel auth stack.

6.8  Tests:
     - JWT verification edge cases (expired, wrong key, revoked, scope
       mismatch, aud mismatch, sub mismatch).
     - Agent quota exhaustion path.
     - Mode safety: a non-admin-issued AgentIdentity cannot use Board mode.
     - Cross-tenant safety: an AgentIdentity bound to Company A cannot
       query Company B by changing the `sub` claim.

Open PR #6 titled `feat(agent-rail): agent identity, scopes, MCP, JWT
auth`. STOP.

══════════════════════════════════════════════════════════════════════════
MILESTONE 7 — Backfill, observability, hardening
══════════════════════════════════════════════════════════════════════════

Goal: ship safely.

7.1  Backfill scripts:
     - `scripts/backfill-subscriptions.ts` — every Company without a
       Subscription gets FREE. Idempotent. Logs counts.
     - `scripts/backfill-usage.ts` — for the last 90 days, reconstruct
       UsageEvent rows from existing Narrative.generatedAt and Message
       createdAt rows where feasible. Mark backfilled events with
       `metadata.backfilled = true`.
     - Both scripts gated behind `--confirm=YES_I_MEAN_IT` flag.

7.2  Observability:
     - Add an `entitlement_denied` and `quota_exceeded` audit kind to
       AccessAudit metadata (no schema change needed; metadata is JSON).
     - Add an admin page `/admin/billing` (gate with `admin.users.read`)
       showing: subscriptions by plan, MoM upgrade/downgrade counts, top
       overage companies, top 10 AgentIdentities by call volume.
     - Add a Prometheus-friendly endpoint at `/api/metrics` (basic
       counters: route hits, 402/403/429 counts, narratives generated,
       cfo turns, agent calls). Gate this endpoint with a shared secret
       in `METRICS_BEARER_TOKEN` env.

7.3  Documentation:
     - `docs/billing-architecture.md` — diagram of Plan ↔ Subscription ↔
       UsageEvent ↔ OverageCharge ↔ Stripe.
     - `docs/authz.md` — how `withGuard` works, how to add a new
       capability, how to add a new gated route.
     - `docs/agent-rail.md` — full developer-facing guide for Rail B
       customers (issuing identity, JWT shape, scopes, rate limits,
       prices).
     - Update `strategy/CHANGELOG.md` with a release-notes-ready summary.

7.4  Final verification:
     - `npm run build` green.
     - `npm test` green.
     - Run `scripts/backfill-subscriptions.ts` against a local seeded DB
       and verify every Company has a Subscription.
     - Run a manual end-to-end check (document in PR description) of:
         (a) FREE → STARTER upgrade flow via Stripe test card
         (b) STUDIO using Proposal mode end-to-end
         (c) Agent identity issuance and a signed /api/agent/v1/query call
         (d) Hitting STUDIO narrative cap → overage tracked correctly

7.5  Production checklist (in `docs/production-checklist.md`):
     - Required env vars
     - Stripe products/prices to create
     - Webhook URL to configure
     - Backfill script run order
     - Rollback plan if entitlements gate too aggressively
       (env flag `BILLING_ENFORCE=soft` → guard logs denials but lets
       requests through). Implement this soft mode in
       `withGuard`. Default to `strict` in production, `soft` in
       development.

Open PR #7 titled `chore(billing): backfill, observability, docs,
production checklist`. STOP.

══════════════════════════════════════════════════════════════════════════
Cross-cutting constraints (apply to every milestone)
══════════════════════════════════════════════════════════════════════════

- DO NOT remove or weaken existing security controls. The `requireSession`
  / `requireAdmin` helpers stay until every caller is migrated.
- DO NOT silently change Prisma queries to skip tenant filters. The single
  most likely place this breaks is admin routes — be paranoid.
- DO NOT generate marketing or upgrade copy with an LLM at runtime. All
  upgrade text is hand-written in code, reviewable in the PR.
- DO NOT introduce new top-level deps beyond `stripe` and (only if
  necessary) a JWT library. If you reach for one, justify in the PR.
- DO NOT break the existing CFO conversation flow. The chat must keep
  working for STUDIO+ customers throughout the migration. If a refactor
  risks breaking it, ship behind a `BILLING_ENFORCE=soft` flag first.
- DO surface clear, structured error bodies on 401/402/403/429:
    { error: "<ErrorName>", message: "<human>", code: "<machine>",
      requiredPlanSlug?, upgradeUrl?, retryAfter? }
- DO keep Margot's voice. No exclamation marks. No emoji. No "unlock,"
  "supercharge," "revolutionize," "next-generation."
- DO log every guard outcome to AccessAudit. Cheap insurance.

══════════════════════════════════════════════════════════════════════════
Definition of done
══════════════════════════════════════════════════════════════════════════

All seven PRs merged. The following statements are true:

  1. Every API route exits through `withGuard`. There is no path from an
     authenticated session to a metered resource that doesn't record
     usage.
  2. A FREE-plan user cannot generate a 6th narrative in a calendar
     month, cannot switch to Proposal or Board mode, and sees an upgrade
     affordance everywhere those limits bind.
  3. A STUDIO-plan user crosses 500 narratives and continues working;
     OverageCharge rows materialize at period close; Stripe invoice
     reflects the overage on the next cycle.
  4. A VIEWER cannot generate a narrative, cannot manage billing,
     cannot invite members.
  5. A registered AgentIdentity can call /api/agent/v1/query with a
     valid JWT and receive Margot's answer; an unsigned or wrong-key
     request is rejected with 401; a missing scope is rejected with 403.
  6. The `/account/billing` page lets a user upgrade, downgrade, cancel,
     and see exact usage. The Stripe Customer Portal handles cards and
     invoices.
  7. `BILLING_ENFORCE=soft` exists and works as documented for safe
     rollout.
  8. `npm run build` and `npm test` are green.

When all eight statements hold, output a final summary listing: tables
added, routes gated, components introduced, env vars required, manual
verification steps performed. That summary becomes the launch announcement
draft.
```

---

## Appendix — pre-flight checks before you press go

Run these once before pasting the prompt, so the agent doesn't waste cycles on a misaligned start:

1. Confirm the strategy doc is in sync — open `strategy/PRICING_AND_GTM.md` and re-read §4. If the prices there are stale, update that file first.
2. Confirm `.env.example` doesn't yet have the Stripe vars listed in Milestone 3. The agent will add them; you just want to know they're net-new.
3. Confirm you can hit Stripe in test mode locally (`stripe login`) before Milestone 3. The agent will not configure your Stripe account for you.
4. Confirm you're on a clean working branch (`git status` empty). The agent will create branches per milestone; a dirty starting state will confuse it.

If any of those fail, fix locally first. The prompt assumes a clean rev to work against.
