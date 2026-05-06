---
id: prj-cl303-ledger-clone-chavez
type: prd
title: "Ledger — Financial Intelligence Platform"
status: active
owner: anthony@codelab303.com
created: 2026-05-06
updated: 2026-05-06
tags: [prd, fintech, nextjs, postgres]
project: cl303-ledger-clone-chavez
source: codelab303_financial_platform_spec.md
auto_generated: true
---

You are building a TypeScript/Node/Next.js application called **Ledger** (working title). This is a financial intelligence platform for a professional services company (custom software consultancy, \~$1.5M-$2M annual revenue, 5-15 team members, mix of salaried employees and contractors). The founder/CEO needs continuous, deep financial analysis that goes far beyond what QuickBooks or Harvest provide natively.

The platform must deliver immediate, tangible value from Day 1 (personal tool for a single company) while being architected so it can become a multi-tenant SaaS product for other professional services firms.

---

## Core Problem Statement

Professional services companies have financial data scattered across systems that each tell an incomplete story:

1. **QuickBooks** knows revenue, costs, and expenses, but has no concept of project-level profitability or utilization  
2. **Harvest** knows who worked on what and for how long, but has no concept of the actual cost of that labor  
3. **Forecast** knows planned allocations, but cannot compare plan vs. actual cost performance  
4. **No system** accounts for the fact that salaried employees have a **variable cost per hour** (a salaried employee who works 120 hours in a month costs more per hour than one who works 180 hours, but the payroll line item is identical)  
5. **No system** accounts for contractor invoice lag (contractors typically invoice 30 days in arrears, meaning COGS is systematically understated in any given period)  
6. Cash-basis and accrual-basis accounting tell materially different stories in any given quarter (a $100K+ gap is common), and leadership needs to understand both simultaneously

Ledger solves this by unifying these data sources, applying the missing cost logic, and producing both visual dashboards and written narrative assessments continuously.

---

## Technical Architecture

### Stack

- **Framework:** Next.js 14+ (App Router)  
- **Language:** TypeScript (strict mode, no `any` types)  
- **Database:** PostgreSQL via Prisma ORM  
- **Auth:** NextAuth.js (start with credentials, add OAuth later for multi-tenant)  
- **State Management:** React Server Components \+ TanStack Query for client-side cache  
- **Charts:** Recharts (consistent with React ecosystem; fallback to D3 for custom viz)  
- **AI/Narrative:** Anthropic Claude API (claude-sonnet-4-6) for financial narrative generation  
- **File Processing:** SheetJS (xlsx) for QuickBooks import parsing  
- **API Integration:** Harvest API v2, Forecast API  
- **Styling:** Tailwind CSS \+ shadcn/ui components  
- **Deployment:** Vercel (initially), with Docker option for self-hosted

### Project Structure

```
ledger/
  src/
    app/
      (auth)/
        login/
        register/
      (dashboard)/
        page.tsx                    # Main dashboard
        projects/
          page.tsx                  # Project profitability list
          [id]/page.tsx             # Single project deep dive
        people/
          page.tsx                  # Team cost & utilization
          [id]/page.tsx             # Individual contributor view
        reports/
          page.tsx                  # Report builder / history
          [id]/page.tsx             # Single report view
        imports/
          page.tsx                  # Data import management
        settings/
          page.tsx                  # Integrations, company config
      api/
        imports/
          quickbooks/route.ts       # QB file upload & parse
        integrations/
          harvest/route.ts          # Harvest sync
          forecast/route.ts         # Forecast sync
        analysis/
          narrative/route.ts        # Claude narrative generation
          snapshot/route.ts         # Point-in-time snapshot creation
        reports/route.ts
    lib/
      parsers/
        quickbooks.ts               # QB P&L XLSX parser
        harvest.ts                   # Harvest API data transformer
        forecast.ts                  # Forecast API data transformer
      engine/
        cost-basis.ts                # Variable employee cost calculation
        project-profitability.ts     # Project P&L engine
        period-comparison.ts         # Multi-period trend analysis
        contractor-lag.ts            # Invoice lag adjustment model
        cash-accrual-reconciler.ts   # Dual-basis reconciliation
      narrative/
        prompt-builder.ts            # Constructs analysis prompts for Claude
        templates.ts                 # Narrative templates by report type
      utils/
        currency.ts
        dates.ts
    components/
      dashboard/
        FinancialOverview.tsx
        MarginTrend.tsx
        RevenueComposition.tsx
        CashVsAccrual.tsx
      projects/
        ProfitabilityTable.tsx
        ProjectMarginChart.tsx
        BurndownView.tsx
      people/
        UtilizationGrid.tsx
        CostBasisTable.tsx
      reports/
        NarrativeCard.tsx
        SnapshotComparison.tsx
      shared/
        StatTile.tsx
        TrendIndicator.tsx
        PeriodSelector.tsx
    prisma/
      schema.prisma
```

---

## Data Model (Prisma Schema)

```
model Company {
  id            String   @id @default(cuid())
  name          String
  fiscalYearStart Int    @default(1)  // Month number (1=Jan)
  createdAt     DateTime @default(now())

  people        Person[]
  projects      Project[]
  financialPeriods FinancialPeriod[]
  imports       DataImport[]
  narratives    Narrative[]
}

model Person {
  id            String   @id @default(cuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  name          String
  email         String?
  type          PersonType  // SALARIED, CONTRACTOR, PARTNER
  harvestUserId String?     // Harvest user ID for integration
  isActive      Boolean  @default(true)

  compensationRecords CompensationRecord[]
  timeEntries         TimeEntry[]
  allocations         Allocation[]
}

enum PersonType {
  SALARIED
  CONTRACTOR
  PARTNER
}

model CompensationRecord {
  id            String   @id @default(cuid())
  personId      String
  person        Person   @relation(fields: [personId], references: [id])
  effectiveDate DateTime
  endDate       DateTime?
  annualSalary  Decimal?     // For salaried employees
  hourlyRate    Decimal?     // For contractors
  burdenRate    Decimal  @default(1.0)  // Multiplier for benefits, taxes, etc.
  // For salaried: total cost = (annualSalary * burdenRate) / 12 / actualHoursWorked
  // For contractors: total cost = hourlyRate * hours (no burden adjustment)
}

model Project {
  id            String   @id @default(cuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  name          String
  clientName    String?
  harvestProjectId String?  // Harvest project ID
  classification ProjectClass  // FUND or FRONTIER
  status        ProjectStatus
  startDate     DateTime?
  endDate       DateTime?
  contractValue Decimal?    // Total contract value if fixed-bid
  monthlyRetainer Decimal?  // If retainer-based

  timeEntries   TimeEntry[]
  allocations   Allocation[]
  revenue       RevenueRecord[]
}

enum ProjectClass {
  FUND       // Repeatable, reliable client work
  FRONTIER   // Selective, high-leverage projects
}

enum ProjectStatus {
  ACTIVE
  COMPLETED
  PAUSED
  LOST
}

model TimeEntry {
  id            String   @id @default(cuid())
  personId      String
  person        Person   @relation(fields: [personId], references: [id])
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id])
  date          DateTime
  hours         Float
  billable      Boolean
  harvestEntryId String?  @unique
  notes         String?
}

model Allocation {
  id            String   @id @default(cuid())
  personId      String
  person        Person   @relation(fields: [personId], references: [id])
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id])
  startDate     DateTime
  endDate       DateTime
  hoursPerDay   Float
  forecastAssignmentId String?  @unique
}

model RevenueRecord {
  id            String   @id @default(cuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id])
  periodStart   DateTime
  periodEnd     DateTime
  amount        Decimal
  basis         AccountingBasis
  source        String   @default("manual")  // "quickbooks", "manual", "invoice"
}

enum AccountingBasis {
  CASH
  ACCRUAL
}

model FinancialPeriod {
  id            String   @id @default(cuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  periodStart   DateTime
  periodEnd     DateTime
  basis         AccountingBasis
  importId      String?
  import        DataImport? @relation(fields: [importId], references: [id])

  // Top-level P&L
  totalRevenue    Decimal
  totalCOGS       Decimal
  grossProfit     Decimal
  grossMargin     Decimal  // Stored as decimal (0.35 = 35%)
  totalOpEx       Decimal
  netIncome       Decimal
  netMargin       Decimal

  // COGS breakdown
  cogsPayroll     Decimal?
  cogsContractors Decimal?
  cogsSoftware    Decimal?

  // Adjustment fields
  estimatedContractorLag  Decimal?  // Estimated uninvoiced contractor cost
  adjustedCOGS            Decimal?  // COGS + contractor lag estimate
  adjustedGrossProfit     Decimal?
  adjustedGrossMargin     Decimal?

  lineItems     LineItem[]
}

model LineItem {
  id            String   @id @default(cuid())
  periodId      String
  period        FinancialPeriod @relation(fields: [periodId], references: [id])
  category      String       // "Income", "Cost of Goods Sold", "Expenses"
  subcategory   String?      // "Contractors", "Essential Software", etc.
  name          String       // "Engineering Contractors", "Travel", etc.
  amount        Decimal
  depth         Int          // Indentation level from QB export (0, 1, 2)
  isTotal       Boolean      // Whether this is a "Total for..." row
}

model DataImport {
  id            String   @id @default(cuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  source        String   // "quickbooks", "harvest", "forecast"
  filename      String?
  importedAt    DateTime @default(now())
  periodStart   DateTime?
  periodEnd     DateTime?
  basis         AccountingBasis?
  status        ImportStatus
  errorLog      String?
  rawData       Json?    // Store raw parsed data for reprocessing

  financialPeriods FinancialPeriod[]
}

enum ImportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model Narrative {
  id            String   @id @default(cuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  type          NarrativeType
  generatedAt   DateTime @default(now())
  periodStart   DateTime
  periodEnd     DateTime
  content       String   // Markdown narrative
  dataSnapshot  Json     // The exact data used to generate this narrative
  promptUsed    String?  // For auditability
}

enum NarrativeType {
  MONTHLY_SUMMARY
  QUARTERLY_REVIEW
  YEAR_OVER_YEAR
  PROJECT_PROFITABILITY
  MARGIN_ANALYSIS
  CASH_VS_ACCRUAL
  CUSTOM
}
```

---

## QuickBooks P\&L Parser (`lib/parsers/quickbooks.ts`)

The QuickBooks P\&L export is an XLSX file with this exact structure:

```
Row 1: "Profit and Loss"
Row 2: Company name (e.g., "codelab303 LLC")
Row 3: Date range (e.g., "January 1-December 31, 2024")
Row 4: (blank)
Row 5: Column headers — Column A is blank, Column B is "Total"
Row 6+: Line items
```

**Line item structure:**

- Column A: Account name (indentation indicates hierarchy via cell alignment indent level)  
- Column B: Dollar amount  
- Rows starting with "Total for " are subtotal rows and should be flagged as `isTotal: true`  
- Hierarchy is determined by indent level (0 \= top category, 1 \= subcategory, 2 \= detail)  
- Top-level categories: "Income", "Cost of Goods Sold", "Expenses", "Other Income", "Other Expenses"  
- Special rows: "Gross Profit", "Net Operating Income", "Net Other Income", "Net Income"  
- Last populated row contains basis and timestamp (e.g., "Cash Basis Wednesday, April 15, 2026 09:49 PM GMT")

**Parser requirements:**

1. Extract date range from Row 3 by parsing natural language date (handle "January 1-December 31, 2024" and "January 1-April 15, 2026" formats)  
2. Detect accounting basis from the footer row (look for "Cash Basis" or "Accrual Basis")  
3. Parse indent levels using `cell.s.alignment.indent` from SheetJS (the xlsx library stores style info; use `{cellStyles: true}` option when reading)  
4. Build hierarchical line items preserving parent-child relationships  
5. Extract top-level P\&L figures: Revenue (Total for Income), COGS (Total for Cost of Goods Sold), Gross Profit, OpEx (Total for Expenses), Net Income  
6. Extract COGS sub-components: Payroll (Total for COGS \- Payroll Expense), Contractors (Total for Contractors), Software (Total for Essential Software)  
7. Handle negative values (discounts, refunds appear as negative numbers)  
8. Handle the "Unapplied Cash Payment Income" and "Unapplied Cash Bill Payment Expense" categories (these are QuickBooks artifacts, not real revenue/expense)  
9. Return a structured object that maps directly to the FinancialPeriod \+ LineItem models

**Known QuickBooks export quirks to handle:**

- Some subcategory rows have amounts AND child rows (e.g., "Contractors" has $549K on its own row PLUS child rows like "Biz Dev Contractors" that sum to $712K total; the parent row is direct/unclassified contractor spend)  
- "Total for X" rows should be used as authoritative subtotals, not the sum of visible children  
- The report may include zero-value line items  
- Currency formatting varies (no currency symbol in the data, just numbers; negatives are actual negative floats)

---

## Variable Employee Cost Engine (`lib/engine/cost-basis.ts`)

This is the core intellectual property of the platform. The logic:

### For Salaried Employees

```ts
interface MonthlyCostBasis {
  personId: string;
  month: string; // "2026-01"
  annualSalary: number;
  burdenRate: number; // e.g., 1.25 for 25% burden (taxes, benefits, etc.)
  totalMonthlyCompensation: number; // (annualSalary * burdenRate) / 12
  totalHoursWorked: number; // From Harvest time entries for this month
  effectiveHourlyRate: number; // totalMonthlyCompensation / totalHoursWorked
  billableHours: number;
  nonBillableHours: number;
  utilizationRate: number; // billableHours / totalHoursWorked
}
```

**Key insight the platform must communicate:** A salaried employee earning $120K/year with a 1.25x burden rate costs $12,500/month. If they work 160 hours, their effective rate is $78.13/hr. If they work 120 hours (vacation, sick time, light month), their effective rate jumps to $104.17/hr. This means the same person on the same project costs 33% more per hour in a low-utilization month. No existing tool surfaces this.

### For Contractors

```ts
interface ContractorCostBasis {
  personId: string;
  month: string;
  hourlyRate: number; // Fixed, from their contract
  totalHoursWorked: number;
  totalCost: number; // hourlyRate * totalHoursWorked
  invoiceLagDays: number; // Default 30, configurable per contractor
  estimatedUninvoicedCost: number; // Hours worked in last N days * hourlyRate
}
```

### Project Cost Allocation

For any project in any period:

```
Project True Cost = SUM(
  For each person who logged time to this project:
    hours_on_project * their_effective_hourly_rate_for_that_month
)
```

This is NOT the same as what QuickBooks shows (which allocates payroll as a lump and contractors by invoice), and it's not the same as what Harvest shows (which knows hours but not cost). Only the combination produces truth.

---

## Harvest/Forecast Integration (`lib/parsers/harvest.ts`, `lib/parsers/forecast.ts`)

### Harvest API v2

- Base URL: `https://api.harvestapp.com/v2`  
- Auth: Personal Access Token (initially) or OAuth2 (for multi-tenant)  
- Key endpoints:  
  - `GET /time_entries` — all time entries, filterable by date range, user, project  
  - `GET /users` — team members  
  - `GET /projects` — projects with client info, budget, active status  
  - `GET /tasks` — task types (for categorizing billable vs. non-billable)  
- Sync strategy: incremental sync by `updated_since` parameter, store `lastSyncAt` timestamp  
- Rate limit: 100 requests per 15 seconds (implement queue with exponential backoff)

### Forecast API

- Base URL: `https://api.forecastapp.com`  
- Auth: Same Harvest token works (Forecast is a Harvest product)  
- Key endpoints:  
  - `GET /assignments` — scheduled allocations (person \+ project \+ date range \+ hours/day)  
  - `GET /projects` — project list (links to Harvest project IDs)  
  - `GET /people` — people list (links to Harvest user IDs)  
- Use for: planned vs. actual comparison, forward-looking capacity modeling

### Sync Pipeline

1. On-demand or scheduled sync (daily recommended)  
2. Pull time entries since last sync  
3. Match Harvest users to Person records (by `harvestUserId`)  
4. Match Harvest projects to Project records (by `harvestProjectId`)  
5. Upsert TimeEntry records (dedupe by `harvestEntryId`)  
6. Pull Forecast assignments and upsert Allocation records  
7. After sync, trigger cost-basis recalculation for affected months  
8. After cost recalculation, trigger project profitability recalculation

---

## Dashboard Views

### 1\. Main Dashboard (`/`)

The landing page. Shows at-a-glance financial health.

**Components:**

- **Period Selector** (top bar): Current month, current quarter, YTD, trailing 12 months, custom range. Toggle between cash and accrual basis.  
- **Stat Tiles Row:** Revenue, Gross Profit, Gross Margin %, Net Income, Net Margin %. Each tile shows current value \+ trend arrow \+ comparison to same period prior year.  
- **Revenue Trend Chart:** Line or bar chart showing monthly revenue over trailing 12+ months. Overlay prior year as ghost line for comparison.  
- **Gross Margin Trend:** Line chart of gross margin % over time with a target band (e.g., 28-32% shaded zone).  
- **Cash vs. Accrual Delta:** Side-by-side stat tiles showing the gap between cash and accrual views for the selected period, with a one-sentence explanation of why they differ.  
- **Contractor Lag Warning:** If estimated uninvoiced contractor cost exceeds a threshold (e.g., $10K), show an amber banner with the estimate.  
- **Latest Narrative Card:** The most recent AI-generated financial narrative, with timestamp and a "Regenerate" button.

### 2\. Project Profitability (`/projects`)

The money view. Where leadership sees which projects make money and which don't.

**Table columns:**

- Project name / Client  
- Classification (Fund or Frontier tag)  
- Status  
- Contract value (if applicable)  
- Revenue recognized (selected period)  
- True cost (calculated via cost engine)  
- Gross profit  
- Gross margin %  
- Hours logged (billable / total)  
- Effective blended rate (revenue / billable hours)

**Sort and filter by:** classification, status, margin range, client, date range.

**Single Project View (`/projects/[id]`):**

- Monthly P\&L chart for this project  
- Team members and their hours \+ cost contribution  
- Planned (Forecast) vs. Actual (Harvest) hours comparison  
- Burn rate and runway (for fixed-bid projects)  
- Margin trend over project lifetime  
- AI narrative: "How is this project performing?"

### 3\. Team & Utilization (`/people`)

The capacity view. Who is utilized, who isn't, and what it's costing.

**Table columns:**

- Person name  
- Type (salaried / contractor)  
- Total hours (period)  
- Billable hours  
- Utilization %  
- Effective hourly rate (for salaried, this changes monthly)  
- Total cost (period)  
- Revenue generated (sum of their project allocations' revenue share)

**Single Person View (`/people/[id]`):**

- Monthly utilization trend  
- Effective hourly rate trend (for salaried: this fluctuates and is the key insight)  
- Project allocation breakdown (pie or bar)  
- Planned (Forecast) vs. Actual (Harvest) comparison  
- Cost to the company trend line

### 4\. Reports (`/reports`)

Where AI-generated narratives live alongside manual snapshots.

**Report types:**

- Monthly Financial Summary  
- Quarterly Review  
- Year-over-Year Comparison  
- Project Profitability Deep Dive  
- Margin Analysis  
- Cash vs. Accrual Reconciliation  
- Custom (user provides a question, Claude analyzes the data to answer it)

**Each report:**

- Shows the narrative (markdown rendered)  
- Shows the exact data tables and charts used to generate it  
- Shows the prompt used (for transparency and iteration)  
- Can be regenerated with updated data  
- Can be exported as PDF or markdown

---

## AI Narrative Engine (`lib/narrative/`)

### How It Works

1. User requests a narrative (or it auto-generates monthly)  
2. System assembles a data package: relevant P\&L data, project profitability, utilization metrics, trend comparisons  
3. `prompt-builder.ts` constructs a structured prompt with the data and analysis type  
4. Claude API call generates the narrative  
5. Narrative is stored with its data snapshot for auditability

### Prompt Template Example (Monthly Summary)

```ts
const buildMonthlyPrompt = (data: MonthlyDataPackage): string => `
You are a fractional CFO writing a monthly financial summary for the CEO of a
professional services company. Be direct, specific, and honest. Do not use
em-dashes. Use plain language, not accounting jargon. When numbers tell a story,
lead with the story and support with the numbers.

COMPANY: ${data.companyName}
PERIOD: ${data.periodLabel}
BASIS: Showing both Cash and Accrual where available

INCOME STATEMENT (${data.basis}):
Revenue: $${data.revenue.toLocaleString()}
  vs. Prior Month: ${data.revenueDelta}%
  vs. Same Month Last Year: ${data.revenueYoY}%
COGS: $${data.cogs.toLocaleString()}
  Payroll: $${data.cogsPayroll.toLocaleString()}
  Contractors: $${data.cogsContractors.toLocaleString()}
  Software: $${data.cogsSoftware.toLocaleString()}
Gross Profit: $${data.grossProfit.toLocaleString()} (${data.grossMargin}%)
OpEx: $${data.opex.toLocaleString()}
Net Income: $${data.netIncome.toLocaleString()} (${data.netMargin}%)

${data.cashAccrualDelta ? `
CASH VS ACCRUAL DELTA:
Cash Revenue: $${data.cashRevenue.toLocaleString()}
Accrual Revenue: $${data.accrualRevenue.toLocaleString()}
Delta: $${data.cashAccrualDelta.toLocaleString()} (primarily A/R timing)
` : ''}

CONTRACTOR LAG ESTIMATE:
Estimated uninvoiced contractor cost: $${data.contractorLag.toLocaleString()}
Adjusted COGS (including lag): $${data.adjustedCogs.toLocaleString()}
Adjusted Gross Margin: ${data.adjustedGrossMargin}%

PROJECT PROFITABILITY (Top/Bottom):
${data.projects.map(p => `- ${p.name}: Revenue $${p.revenue.toLocaleString()}, True Cost $${p.trueCost.toLocaleString()}, Margin ${p.margin}%`).join('\n')}

UTILIZATION:
Team Average: ${data.avgUtilization}%
${data.utilizationByPerson.map(p => `- ${p.name}: ${p.utilization}% (${p.billableHours}h billable / ${p.totalHours}h total, effective rate $${p.effectiveRate}/hr)`).join('\n')}

TARGETS:
Revenue Target: $${data.revenueTarget.toLocaleString()}
Gross Margin Target: ${data.grossMarginTarget}%
Net Profit Target: $${data.netProfitTarget.toLocaleString()}

Write a 3-5 paragraph narrative covering:
1. The headline: what is the single most important thing about this month's numbers?
2. Revenue trajectory: are we on track for annual targets? What's the run rate?
3. Margin health: what's driving margin up or down? Call out specific projects or cost drivers.
4. The honest assessment: what should the CEO be worried about, and what's going well?
5. One concrete recommendation for next month.

Do not sugarcoat. Do not hedge excessively. Be the CFO who tells the truth.
`;
```

---

## MVP Scope (Phase 1: Immediate Personal Value)

Build these features first. They should work end-to-end within 1-2 weeks of focused development.

### P1 Features:

1. **QuickBooks P\&L Import** — Upload XLSX, auto-parse, store structured data. Support both cash and accrual uploads for the same period.  
2. **Financial Dashboard** — Main dashboard with stat tiles, margin trend, revenue trend, cash vs. accrual comparison.  
3. **Multi-Period Comparison** — Side-by-side and trend views for any combination of imported periods. Year-over-year and quarter-over-quarter.  
4. **Contractor Lag Estimator** — Simple model: configurable lag days per contractor, estimates uninvoiced cost based on recent Harvest hours.  
5. **AI Narrative Generation** — Monthly and quarterly narrative reports via Claude API. Store and browse history.  
6. **Manual Project Revenue Mapping** — Before full Harvest integration, allow manual entry of revenue per project per month (so project profitability can work even with just QB \+ manual input).

### P2 Features (Week 3-4):

7. **Harvest Integration** — OAuth connection, time entry sync, automatic project/person matching.  
8. **Variable Cost Engine** — Full implementation of salaried employee cost basis calculation.  
9. **Project Profitability View** — True project P\&L with cost engine applied.  
10. **Team Utilization View** — Utilization grid with effective hourly rate display.

### P3 Features (Month 2):

11. **Forecast Integration** — Planned vs. actual comparison.  
12. **Forward Projections** — Given current run rate, project EOY revenue/profit/margin with confidence bands.  
13. **Custom Report Builder** — Ask Claude any question about your financial data.  
14. **PDF Export** — Generate presentation-ready financial reports.

### P4 Features (Market Product Prep):

15. **Multi-Tenant Architecture** — Company-scoped data, team invitations, role-based access.  
16. **QuickBooks Online API Integration** — Direct connection instead of file upload.  
17. **Stripe Integration** — For SaaS billing.  
18. **Onboarding Wizard** — Guided setup for new companies.  
19. **Benchmark Data** — Anonymous aggregation across tenants for industry comparison.

---

## Key Implementation Notes

### On the Variable Cost Calculation

This is the platform's primary insight and defensible value. Every other tool either ignores this problem or treats salary as a fixed monthly cost divided by standard hours (e.g., 160). The reality for a small services company is that hours fluctuate significantly, and that fluctuation changes the economics of every project. Build the UI to make this viscerally obvious: show the same person's effective rate across 6 months as a line chart, and the variation will tell the story.

### On the Cash vs. Accrual Presentation

Always show both when both are available. Never default to one without surfacing the other. The delta between them IS the story in many periods. Design the UI so that switching between bases is a single toggle, and the delta is always visible as a badge or subtitle.

### On Contractor Invoice Lag

This is a known systematic bias. The platform should not just note it but actively model it. Default to 30-day lag, allow per-contractor configuration, and show "adjusted" figures alongside raw figures. The adjusted COGS should always appear alongside the QB-reported COGS.

### On the AI Narratives

The narratives are the product's second key differentiator (after the cost engine). They must be specific, honest, and cite actual numbers. Template prompts should enforce a structure but let Claude's analysis surface non-obvious connections. Store every narrative with its data snapshot so the user can see what data produced what conclusions. Never hallucinate numbers: the prompt must include all data; the model should not be expected to "remember" prior periods.

### On the "Fund vs. Frontier" Classification

This is specific to codelab303's operating model but generalizable. In the multi-tenant version, this becomes a configurable project taxonomy. For MVP, hardcode FUND and FRONTIER as the two classifications. The profitability view should be filterable and aggregatable by classification, because the margin expectations are different: Fund projects should target 30%+ margin; Frontier projects may accept lower margin for strategic value.

### On Data Freshness

Display "last updated" timestamps prominently on every view. Financial data that looks current but isn't is worse than no data. Show amber warnings when data is older than 7 days. Show red warnings when data is older than 30 days.

---

## Database Seeding for Immediate Use

On first run, create a seed script that:

1. Creates a "codelab303 LLC" company  
2. Creates a default admin user ([anthony@codelab303.com](mailto:anthony@codelab303.com))  
3. Pre-populates the QuickBooks import instructions with the exact format documented above  
4. Sets default contractor lag to 30 days  
5. Sets default burden rate to 1.25x (adjust based on actual benefits cost)  
6. Sets 2026 targets: Revenue $1.7M-$1.9M, Net Profit $100K-$150K, Gross Margin 28-32%

---

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

ANTHROPIC_API_KEY=...

HARVEST_ACCESS_TOKEN=...
HARVEST_ACCOUNT_ID=...

FORECAST_ACCOUNT_ID=...
```

---

## Design Direction

- Dark theme by default (professional financial tools should feel like Bloomberg, not Mint)  
- High contrast, data-dense layouts  
- Monospace numbers in tables for alignment  
- Color coding: green for positive margin/growth, amber for warning thresholds, red for losses/declines  
- Minimal chrome. The data is the interface.  
- Mobile-responsive but optimized for desktop (this is a sit-down-and-analyze tool)

---

## Success Criteria (MVP)

The platform delivers value when Anthony can:

1. Upload a QuickBooks P\&L and see a parsed, structured financial dashboard in under 30 seconds  
2. Compare any two periods (month-over-month, year-over-year) with one click  
3. See cash and accrual views side-by-side with the delta explained  
4. Read an AI-generated narrative that identifies the 2-3 most important financial signals in any period  
5. Understand project-level profitability accounting for actual employee cost (not flat salary allocation)  
6. Know, at any point, what the estimated uninvoiced contractor cost is

If it does those six things, it replaces a manual analysis process that currently takes hours and happens infrequently, with an always-on financial intelligence layer.

---

*Build this as if you are building it for yourself and your business depends on the accuracy of every number. Because it does.*  
