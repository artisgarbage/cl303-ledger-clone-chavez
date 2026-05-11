# Margot M1 — Integration Test Results

**Date:** 2026-05-10  
**Branch:** `main` (post PR #20 squash-merge, commit `e16d731`)  
**Environment:** Local (`localhost:3000` + Docker Postgres 5433)

---

## What Was Tested

The M1 CFO agent (Margot Hale) was exercised end-to-end against the seeded production dataset. Testing covered: auth flow → conversation creation → tool-calling loop → multi-turn context → response quality.

---

## Screenshots

### 1. Dashboard — Seeded Financial Data
![Dashboard](assets/margot-m1/dashboard.png)

Real codelab303 LLC data: $386K YTD revenue, -17.1% net margin (2026 partial year through Apr 15). Margot is visible in the sidebar.

---

### 2. Margot — Welcome State
![Margot Welcome](assets/margot-m1/margot-welcome.png)

Empty state with "New Conversation" CTA. Conversation list (with existing session) visible in left panel.

---

### 3. Margot — Conversation Loaded
![Margot Conversation](assets/margot-m1/margot-conversation-loaded.png)

Full conversation panel showing multi-turn history. Message input is active.

---

### 4. Margot — First Tool Call: 2024 P&L
![Margot First Answer](assets/margot-m1/margot-chat-full-conversation.png)

**Prompt:** "What was our gross margin for full-year 2024 on a cash basis?"

**Margot's response:**
> 35.4% gross margin for full-year 2024 on a cash basis. Revenue of $1.81M against COGS of $1.17M. The bulk of your cost structure is wages ($437K) and contractors ($549K), with some software and platform costs.

Tool called: `periods_getPnL(periodStart: "2024-01-01", periodEnd: "2024-12-31", basis: "CASH")` — matched `FinancialPeriod` record, returned $1.81M revenue, 35.4% grossMargin.

---

### 5. Margot — Multi-Turn YoY Analysis
![Margot YoY Analysis](assets/margot-m1/margot-chat-yoy-analysis.png)

**Prompt:** "How did that compare to 2025? And what's driving the margin compression we're seeing in early 2026?"

**Margot's response:**
> 2024: 35.4% gross margin  
> 2025: 25.5% gross margin  
> 
> That's a 990 basis point drop year-over-year. The driver is labor cost inflation — wages jumped from $437K to $641K while revenue only grew from $1.81M to $1.57M. You're carrying more expensive talent on lower revenue.  
> 
> Can't analyze early 2026 compression without data for that period. You'll need to import the QuickBooks data first.

Two tool calls in sequence: `periods_getPnL` for 2024, then `periods_getPnL` for 2025. Multi-turn context preserved (Margot remembered the 2024 figure from the prior turn). Correctly refused to fabricate 2026 data.

---

## Bugs Found and Fixed During Testing

### BUG-1: Tool names rejected by Anthropic API (dot notation)
**Error:** `tools.0.custom.name: String should match pattern '^[a-zA-Z0-9_-]{1,128}$'`

Tool names used dots (`periods.getPnL`) which the API doesn't allow. Fixed by renaming to underscore: `periods_getPnL`, `projects_list`, `narrative_recent`.

**Files changed:** `tools/periods.ts`, `tools/projects.ts`, `tools/narrative.ts`, `tools/index.ts`, `modes.ts`

---

### BUG-2: Period date lookup missed timezone-offset records
**Symptom:** `periods_getPnL` called correctly but returned "No financial period found" despite the record existing.

**Root cause:** Seed data was created with PST-local midnight dates (stored as `2024-01-01 07:00:00 UTC`), while the tool queried exact UTC midnight (`2024-01-01 00:00:00 UTC`). Prisma's exact timestamp match failed.

**Fix:** Changed the Prisma `findFirst` query to use a 24-hour window (`gte: startDay, lt: startDayNext`) instead of an exact match, tolerating timezone offsets in stored timestamps.

**File changed:** `tools/periods.ts`

Both fixes committed in `e16d731` → pushed to `main`.

---

## What Worked ✅

- Authentication flow (login → session → `/cfo` page load)
- Prisma client regeneration picks up `Conversation` / `Message` / `PersonaConfig` models
- `POST /api/cfo/conversations` → creates conversation scoped to `companyId + userId`
- `GET /api/cfo/conversations` → lists only user's conversations
- `POST /api/cfo/chat` → auth, IDOR check, Zod validation, tool-calling loop all execute
- `periods_getPnL` tool queries `FinancialPeriod` scoped by `companyId`, returns structured P&L
- Multi-turn conversation context: Margot remembers prior tool results across messages
- "Numbers first" Margot voice: no hedge language, direct data presentation
- Graceful refusal: acknowledged missing 2026 data without hallucinating

## Known Limitations (M1 by design)

- No streaming: response blocked until full loop completes (~2–4s for multi-tool turns)
- No tool trace UI: tool calls are invisible to the user (M2 will add trace panel)
- `projects_list` and `narrative_recent` tools not yet exercised in this session
- 2026 periods stored with `06:00 UTC` offsets (DST) — date window handles it correctly

---

## Environment Setup Notes

For local dev, seed requires:
```bash
# 1. Start Docker Postgres
docker-compose up -d

# 2. Apply migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" npx prisma migrate deploy

# 3. Fix schema drift (narrativesEnabled column added post-baseline)
docker exec ledger-clone-db-1 psql -U postgres ledger \
  -c 'ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "narrativesEnabled" BOOLEAN NOT NULL DEFAULT false;'

# 4. Regenerate Prisma client (must include new CFO models)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" npx prisma generate

# 5. Install exceljs (required for seed parser, not in node_modules)
npm install exceljs

# 6. Seed (setup_data/ XLSX files must exist for financial periods)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" npx tsx prisma/seed.ts

# 7. Run dev server
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ledger" NEXTAUTH_URL="http://localhost:3000" npm run dev
```
