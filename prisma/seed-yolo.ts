/**
 * seed-yolo.ts
 * Seeds Yolo, Inc. — a fictional $5M/yr digital agency.
 *
 * Profile:
 *   - Revenue: ~$5.0M/yr (2024) → ~$5.2M (2025), ~$2.3M YTD 2026
 *   - Gross margin: 34–38% (healthy for an agency, slight pressure)
 *   - Net margin: 8–11% (profitable but squeezed by headcount)
 *   - Typical agency challenges: key-person dependency, contractor reliance,
 *     slow-paying clients, one churned anchor client in Q3 2024,
 *     Q1 2025 recovery, 2026 growth mode
 *
 * Run:  DATABASE_URL="..." npx tsx prisma/seed-yolo.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  PersonType,
  ProjectClass,
  ProjectStatus,
  AccountingBasis,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const COMPANY_ID = "yolo-inc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function d(yyyy: number, mm: number, dd = 1) {
  return new Date(yyyy, mm - 1, dd);
}

function monthEnd(yyyy: number, mm: number) {
  return new Date(yyyy, mm, 0);
}

function lineItem(
  category: string,
  subcategory: string | null,
  name: string,
  amount: number,
  depth: number,
  isTotal: boolean,
  parentName: string | null = null,
) {
  return { category, subcategory, name, amount, depth, isTotal, parentName };
}

// ─── Financial Period factory ─────────────────────────────────────────────────

interface PeriodSpec {
  periodStart: Date;
  periodEnd: Date;
  basis: AccountingBasis;
  totalRevenue: number;
  totalCOGS: number;
  totalOpEx: number;
  cogsPayroll: number;
  cogsContractors: number;
  cogsSoftware: number;
}

function derived(spec: PeriodSpec) {
  const grossProfit = spec.totalRevenue - spec.totalCOGS;
  const grossMargin =
    spec.totalRevenue > 0 ? grossProfit / spec.totalRevenue : 0;
  const netIncome = grossProfit - spec.totalOpEx;
  const netMargin = spec.totalRevenue > 0 ? netIncome / spec.totalRevenue : 0;
  return { ...spec, grossProfit, grossMargin, netIncome, netMargin };
}

// ─── Build typical agency line items ──────────────────────────────────────────

function buildLineItems(
  rev: number,
  cogs: number,
  opex: number,
  cogsPayroll: number,
  cogsContractors: number,
  cogsSoftware: number,
) {
  const grossProfit = rev - cogs;
  const netIncome = grossProfit - opex;

  // OpEx split (typical agency)
  const salariesOpex = opex * 0.52;
  const rentUtil = opex * 0.1;
  const marketing = opex * 0.08;
  const techSaas = opex * 0.07;
  const legalAcct = opex * 0.05;
  const insurance = opex * 0.04;
  const travel = opex * 0.05;
  const misc =
    opex -
    salariesOpex -
    rentUtil -
    marketing -
    techSaas -
    legalAcct -
    insurance -
    travel;

  return [
    // Revenue
    lineItem("Income", null, "Services Revenue", rev, 1, false),
    lineItem("Income", null, "Total Income", rev, 0, true),

    // COGS
    lineItem(
      "Cost of Goods Sold",
      "Payroll",
      "Delivery Payroll & Benefits",
      cogsPayroll,
      2,
      false,
      "Cost of Goods Sold",
    ),
    lineItem(
      "Cost of Goods Sold",
      "Contractors",
      "Freelancers & Subcontractors",
      cogsContractors,
      2,
      false,
      "Cost of Goods Sold",
    ),
    lineItem(
      "Cost of Goods Sold",
      "Software",
      "Project Software & Licenses",
      cogsSoftware,
      2,
      false,
      "Cost of Goods Sold",
    ),
    lineItem(
      "Cost of Goods Sold",
      null,
      "Total Cost of Goods Sold",
      cogs,
      1,
      true,
    ),

    // Gross Profit
    lineItem("Gross Profit", null, "Gross Profit", grossProfit, 0, true),

    // OpEx
    lineItem(
      "Operating Expenses",
      "Payroll",
      "G&A Salaries & Benefits",
      salariesOpex,
      2,
      false,
      "Operating Expenses",
    ),
    lineItem(
      "Operating Expenses",
      "Facilities",
      "Rent & Utilities",
      rentUtil,
      2,
      false,
      "Operating Expenses",
    ),
    lineItem(
      "Operating Expenses",
      "Marketing",
      "Marketing & Business Development",
      marketing,
      2,
      false,
      "Operating Expenses",
    ),
    lineItem(
      "Operating Expenses",
      "Technology",
      "SaaS & Infrastructure",
      techSaas,
      2,
      false,
      "Operating Expenses",
    ),
    lineItem(
      "Operating Expenses",
      "Professional",
      "Legal & Accounting",
      legalAcct,
      2,
      false,
      "Operating Expenses",
    ),
    lineItem(
      "Operating Expenses",
      "Insurance",
      "Business Insurance",
      insurance,
      2,
      false,
      "Operating Expenses",
    ),
    lineItem(
      "Operating Expenses",
      "Travel",
      "Travel & Entertainment",
      travel,
      2,
      false,
      "Operating Expenses",
    ),
    lineItem(
      "Operating Expenses",
      "Miscellaneous",
      "Miscellaneous",
      misc,
      2,
      false,
      "Operating Expenses",
    ),
    lineItem(
      "Operating Expenses",
      null,
      "Total Operating Expenses",
      opex,
      1,
      true,
    ),

    // Net Income
    lineItem("Net Income", null, "Net Income", netIncome, 0, true),
  ];
}

// ─── Annual periods (cash basis, monthly cadence) ────────────────────────────

type MonthlySpec = {
  yyyy: number;
  mm: number;
  rev: number;
  cogsRate: number;
  opex: number;
  payrollFrac: number;
  contractorFrac: number;
};

function buildMonthlyPeriod(s: MonthlySpec) {
  const cogs = s.rev * s.cogsRate;
  const cogsPayroll = cogs * s.payrollFrac;
  const cogsContractors = cogs * s.contractorFrac;
  const cogsSoftware = cogs - cogsPayroll - cogsContractors;
  return derived({
    periodStart: d(s.yyyy, s.mm, 1),
    periodEnd: monthEnd(s.yyyy, s.mm),
    basis: AccountingBasis.CASH,
    totalRevenue: s.rev,
    totalCOGS: cogs,
    totalOpEx: s.opex,
    cogsPayroll,
    cogsContractors,
    cogsSoftware,
  });
}

// 2024 monthly data — anchor client churn in Aug-Sep → recovery Q4
const MONTHS_2024: MonthlySpec[] = [
  // Q1 — strong start, growing
  {
    yyyy: 2024,
    mm: 1,
    rev: 388_000,
    cogsRate: 0.62,
    opex: 95_000,
    payrollFrac: 0.52,
    contractorFrac: 0.38,
  },
  {
    yyyy: 2024,
    mm: 2,
    rev: 370_000,
    cogsRate: 0.63,
    opex: 93_000,
    payrollFrac: 0.52,
    contractorFrac: 0.38,
  },
  {
    yyyy: 2024,
    mm: 3,
    rev: 415_000,
    cogsRate: 0.61,
    opex: 96_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  // Q2 — peak season
  {
    yyyy: 2024,
    mm: 4,
    rev: 450_000,
    cogsRate: 0.6,
    opex: 98_000,
    payrollFrac: 0.54,
    contractorFrac: 0.36,
  },
  {
    yyyy: 2024,
    mm: 5,
    rev: 445_000,
    cogsRate: 0.61,
    opex: 99_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2024,
    mm: 6,
    rev: 430_000,
    cogsRate: 0.62,
    opex: 98_000,
    payrollFrac: 0.52,
    contractorFrac: 0.38,
  },
  // Q3 — anchor client (MegaCorp) churns in August → revenue dip
  {
    yyyy: 2024,
    mm: 7,
    rev: 420_000,
    cogsRate: 0.62,
    opex: 97_000,
    payrollFrac: 0.52,
    contractorFrac: 0.38,
  },
  {
    yyyy: 2024,
    mm: 8,
    rev: 285_000,
    cogsRate: 0.68,
    opex: 96_000,
    payrollFrac: 0.55,
    contractorFrac: 0.33,
  }, // churn month — cogs% spikes on fixed payroll
  {
    yyyy: 2024,
    mm: 9,
    rev: 295_000,
    cogsRate: 0.67,
    opex: 95_000,
    payrollFrac: 0.55,
    contractorFrac: 0.33,
  }, // still rebuilding
  // Q4 — recovery + holiday push
  {
    yyyy: 2024,
    mm: 10,
    rev: 360_000,
    cogsRate: 0.63,
    opex: 96_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2024,
    mm: 11,
    rev: 395_000,
    cogsRate: 0.62,
    opex: 97_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2024,
    mm: 12,
    rev: 430_000,
    cogsRate: 0.61,
    opex: 102_000,
    payrollFrac: 0.52,
    contractorFrac: 0.38,
  }, // bonuses in opex
];

// 2025 monthly — full recovery, growing, healthy margins
const MONTHS_2025: MonthlySpec[] = [
  {
    yyyy: 2025,
    mm: 1,
    rev: 400_000,
    cogsRate: 0.62,
    opex: 98_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2025,
    mm: 2,
    rev: 388_000,
    cogsRate: 0.63,
    opex: 97_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2025,
    mm: 3,
    rev: 430_000,
    cogsRate: 0.61,
    opex: 99_000,
    payrollFrac: 0.54,
    contractorFrac: 0.36,
  },
  {
    yyyy: 2025,
    mm: 4,
    rev: 460_000,
    cogsRate: 0.6,
    opex: 101_000,
    payrollFrac: 0.54,
    contractorFrac: 0.36,
  },
  {
    yyyy: 2025,
    mm: 5,
    rev: 455_000,
    cogsRate: 0.6,
    opex: 101_000,
    payrollFrac: 0.54,
    contractorFrac: 0.36,
  },
  {
    yyyy: 2025,
    mm: 6,
    rev: 448_000,
    cogsRate: 0.61,
    opex: 100_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2025,
    mm: 7,
    rev: 440_000,
    cogsRate: 0.61,
    opex: 100_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2025,
    mm: 8,
    rev: 432_000,
    cogsRate: 0.62,
    opex: 99_000,
    payrollFrac: 0.52,
    contractorFrac: 0.38,
  },
  {
    yyyy: 2025,
    mm: 9,
    rev: 445_000,
    cogsRate: 0.61,
    opex: 100_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2025,
    mm: 10,
    rev: 462_000,
    cogsRate: 0.6,
    opex: 101_000,
    payrollFrac: 0.54,
    contractorFrac: 0.36,
  },
  {
    yyyy: 2025,
    mm: 11,
    rev: 478_000,
    cogsRate: 0.6,
    opex: 102_000,
    payrollFrac: 0.54,
    contractorFrac: 0.36,
  },
  {
    yyyy: 2025,
    mm: 12,
    rev: 455_000,
    cogsRate: 0.61,
    opex: 108_000,
    payrollFrac: 0.52,
    contractorFrac: 0.38,
  }, // year-end bonuses
];

// 2026 YTD through April (4 months)
const MONTHS_2026_YTD: MonthlySpec[] = [
  {
    yyyy: 2026,
    mm: 1,
    rev: 480_000,
    cogsRate: 0.61,
    opex: 103_000,
    payrollFrac: 0.54,
    contractorFrac: 0.36,
  },
  {
    yyyy: 2026,
    mm: 2,
    rev: 468_000,
    cogsRate: 0.62,
    opex: 102_000,
    payrollFrac: 0.53,
    contractorFrac: 0.37,
  },
  {
    yyyy: 2026,
    mm: 3,
    rev: 510_000,
    cogsRate: 0.6,
    opex: 104_000,
    payrollFrac: 0.55,
    contractorFrac: 0.35,
  },
  {
    yyyy: 2026,
    mm: 4,
    rev: 495_000,
    cogsRate: 0.61,
    opex: 103_000,
    payrollFrac: 0.54,
    contractorFrac: 0.36,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding Yolo, Inc. ...\n");

  // ── 1. Company ──────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: COMPANY_ID },
    update: {},
    create: {
      id: COMPANY_ID,
      name: "Yolo, Inc.",
      fiscalYearStart: 1,
    },
  });
  console.log(`✅  Company: ${company.name}`);

  await prisma.companySettings.upsert({
    where: { companyId: COMPANY_ID },
    update: {},
    create: {
      companyId: COMPANY_ID,
      defaultBurdenRate: 1.25,
      defaultContractorLag: 30,
      revenueTarget: 5_800_000,
      grossMarginTargetMin: 0.34,
      grossMarginTargetMax: 0.4,
      netProfitTarget: 450_000,
      narrativesEnabled: false,
    },
  });

  // ── 2. Admin user (me) ───────────────────────────────────────────────────────
  const hashedPw = await bcrypt.hash("ledger2026!", 12);
  const user = await prisma.user.upsert({
    where: { email: "anthony+yolo@codelab303.com" },
    update: {},
    create: {
      email: "anthony+yolo@codelab303.com",
      name: "Anthony Chavez",
      password: hashedPw,
      role: "ADMIN",
      companyId: COMPANY_ID,
    },
  });
  console.log(`✅  Admin user: ${user.email}`);

  // ── 3. Team (People) ─────────────────────────────────────────────────────────

  const teamSpec = [
    // Partners
    {
      id: "yolo-sarah",
      name: "Sarah Kim",
      email: "sarah@yoloinc.com",
      type: PersonType.PARTNER,
      annualSalary: 220_000,
      burdenRate: 1.15,
    },
    {
      id: "yolo-marcos",
      name: "Marcos Rivera",
      email: "marcos@yoloinc.com",
      type: PersonType.PARTNER,
      annualSalary: 215_000,
      burdenRate: 1.15,
    },
    // Salaried delivery
    {
      id: "yolo-taylor",
      name: "Taylor Nguyen",
      email: "taylor@yoloinc.com",
      type: PersonType.SALARIED,
      annualSalary: 135_000,
      burdenRate: 1.25,
    },
    {
      id: "yolo-priya",
      name: "Priya Mehta",
      email: "priya@yoloinc.com",
      type: PersonType.SALARIED,
      annualSalary: 125_000,
      burdenRate: 1.25,
    },
    {
      id: "yolo-devonte",
      name: "DeVonte Harris",
      email: "devonte@yoloinc.com",
      type: PersonType.SALARIED,
      annualSalary: 130_000,
      burdenRate: 1.25,
    },
    {
      id: "yolo-lena",
      name: "Lena Vasquez",
      email: "lena@yoloinc.com",
      type: PersonType.SALARIED,
      annualSalary: 115_000,
      burdenRate: 1.25,
    },
    {
      id: "yolo-james",
      name: "James Oduya",
      email: "james@yoloinc.com",
      type: PersonType.SALARIED,
      annualSalary: 120_000,
      burdenRate: 1.25,
    },
    // G&A salaried
    {
      id: "yolo-rachel",
      name: "Rachel Chen",
      email: "rachel@yoloinc.com",
      type: PersonType.SALARIED,
      annualSalary: 95_000,
      burdenRate: 1.25,
    },
    // Contractors
    {
      id: "yolo-cts-dev",
      name: "Dev Contractor (FTE-equiv)",
      email: null,
      type: PersonType.CONTRACTOR,
      hourlyRate: 145,
      invoiceLagDays: 30,
    },
    {
      id: "yolo-cts-des",
      name: "Design Contractor",
      email: null,
      type: PersonType.CONTRACTOR,
      hourlyRate: 125,
      invoiceLagDays: 30,
    },
    {
      id: "yolo-cts-copy",
      name: "Copywriter",
      email: null,
      type: PersonType.CONTRACTOR,
      hourlyRate: 95,
      invoiceLagDays: 30,
    },
  ];

  for (const p of teamSpec) {
    await prisma.person.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        companyId: COMPANY_ID,
        name: p.name,
        email: p.email ?? null,
        type: p.type,
        isActive: true,
      },
    });

    const existing = await prisma.compensationRecord.findFirst({
      where: { personId: p.id },
    });
    if (!existing) {
      await prisma.compensationRecord.create({
        data: {
          personId: p.id,
          effectiveDate: new Date("2024-01-01"),
          annualSalary: "annualSalary" in p ? (p.annualSalary as number) : null,
          hourlyRate: "hourlyRate" in p ? (p.hourlyRate as number) : null,
          burdenRate: p.burdenRate ?? 1.25,
          invoiceLagDays:
            "invoiceLagDays" in p ? (p.invoiceLagDays as number) : 30,
        },
      });
    }
    console.log(`  👤  ${p.name} (${p.type})`);
  }

  // ── 4. Projects ────────────────────────────────────────────────────────────

  const projectSpec = [
    {
      id: "yolo-proj-pulse",
      name: "PulseHealth — Product Build",
      clientName: "PulseHealth",
      classification: ProjectClass.FUND,
      status: ProjectStatus.ACTIVE,
      contractValue: 480_000,
      monthlyRetainer: null,
      start: d(2024, 1),
      end: null,
    },
    {
      id: "yolo-proj-apex",
      name: "Apex Ventures — Brand & Digital",
      clientName: "Apex Ventures",
      classification: ProjectClass.FUND,
      status: ProjectStatus.ACTIVE,
      contractValue: null,
      monthlyRetainer: 38_000,
      start: d(2024, 3),
      end: null,
    },
    {
      id: "yolo-proj-bloom",
      name: "Bloom CPG — Campaign",
      clientName: "Bloom CPG",
      classification: ProjectClass.FUND,
      status: ProjectStatus.COMPLETED,
      contractValue: 185_000,
      monthlyRetainer: null,
      start: d(2024, 4),
      end: d(2024, 10),
    },
    {
      id: "yolo-proj-megacorp",
      name: "MegaCorp — Anchor Retainer",
      clientName: "MegaCorp",
      classification: ProjectClass.FUND,
      status: ProjectStatus.LOST,
      contractValue: null,
      monthlyRetainer: 95_000,
      start: d(2023, 6),
      end: d(2024, 8),
    },
    {
      id: "yolo-proj-nova",
      name: "Nova Tech — UX & Strategy",
      clientName: "Nova Technology",
      classification: ProjectClass.FUND,
      status: ProjectStatus.ACTIVE,
      contractValue: 220_000,
      monthlyRetainer: null,
      start: d(2025, 1),
      end: null,
    },
    {
      id: "yolo-proj-trio",
      name: "TrioMedia — Ongoing Retainer",
      clientName: "TrioMedia",
      classification: ProjectClass.FUND,
      status: ProjectStatus.ACTIVE,
      contractValue: null,
      monthlyRetainer: 28_000,
      start: d(2025, 3),
      end: null,
    },
    {
      id: "yolo-proj-cedar",
      name: "Cedar Logistics — Rebrand",
      clientName: "Cedar Logistics",
      classification: ProjectClass.FUND,
      status: ProjectStatus.ACTIVE,
      contractValue: 140_000,
      monthlyRetainer: null,
      start: d(2026, 1),
      end: null,
    },
    {
      id: "yolo-proj-invest",
      name: "Internal R&D / IP",
      clientName: null,
      classification: ProjectClass.FRONTIER,
      status: ProjectStatus.ACTIVE,
      contractValue: null,
      monthlyRetainer: null,
      start: d(2024, 1),
      end: null,
    },
    {
      id: "yolo-proj-nonbill",
      name: "Business Development",
      clientName: null,
      classification: ProjectClass.FRONTIER,
      status: ProjectStatus.ACTIVE,
      contractValue: null,
      monthlyRetainer: null,
      start: d(2024, 1),
      end: null,
    },
  ];

  for (const proj of projectSpec) {
    await prisma.project.upsert({
      where: { id: proj.id },
      update: {},
      create: {
        id: proj.id,
        companyId: COMPANY_ID,
        name: proj.name,
        clientName: proj.clientName ?? null,
        classification: proj.classification,
        status: proj.status,
        startDate: proj.start,
        endDate: proj.end ?? null,
        contractValue: proj.contractValue ?? null,
        monthlyRetainer: proj.monthlyRetainer ?? null,
      },
    });
    console.log(`  📁  ${proj.name}`);
  }

  // ── 5. Time entries (representative sample — Apr 2026 + monthly cadence) ───
  console.log("\n  ⏱  Generating time entries...");

  // Delivery people and their project mix
  const deliveryAlloc: Array<{
    personId: string;
    projectId: string;
    billable: boolean;
    hoursPerWeek: number;
  }> = [
    {
      personId: "yolo-sarah",
      projectId: "yolo-proj-pulse",
      billable: true,
      hoursPerWeek: 15,
    },
    {
      personId: "yolo-sarah",
      projectId: "yolo-proj-nova",
      billable: true,
      hoursPerWeek: 10,
    },
    {
      personId: "yolo-sarah",
      projectId: "yolo-proj-nonbill",
      billable: false,
      hoursPerWeek: 15,
    },
    {
      personId: "yolo-marcos",
      projectId: "yolo-proj-apex",
      billable: true,
      hoursPerWeek: 20,
    },
    {
      personId: "yolo-marcos",
      projectId: "yolo-proj-cedar",
      billable: true,
      hoursPerWeek: 10,
    },
    {
      personId: "yolo-marcos",
      projectId: "yolo-proj-nonbill",
      billable: false,
      hoursPerWeek: 10,
    },
    {
      personId: "yolo-taylor",
      projectId: "yolo-proj-pulse",
      billable: true,
      hoursPerWeek: 30,
    },
    {
      personId: "yolo-taylor",
      projectId: "yolo-proj-nova",
      billable: true,
      hoursPerWeek: 8,
    },
    {
      personId: "yolo-priya",
      projectId: "yolo-proj-trio",
      billable: true,
      hoursPerWeek: 25,
    },
    {
      personId: "yolo-priya",
      projectId: "yolo-proj-apex",
      billable: true,
      hoursPerWeek: 10,
    },
    {
      personId: "yolo-devonte",
      projectId: "yolo-proj-nova",
      billable: true,
      hoursPerWeek: 30,
    },
    {
      personId: "yolo-devonte",
      projectId: "yolo-proj-cedar",
      billable: true,
      hoursPerWeek: 8,
    },
    {
      personId: "yolo-lena",
      projectId: "yolo-proj-apex",
      billable: true,
      hoursPerWeek: 28,
    },
    {
      personId: "yolo-james",
      projectId: "yolo-proj-trio",
      billable: true,
      hoursPerWeek: 20,
    },
    {
      personId: "yolo-james",
      projectId: "yolo-proj-cedar",
      billable: true,
      hoursPerWeek: 12,
    },
    {
      personId: "yolo-rachel",
      projectId: "yolo-proj-nonbill",
      billable: false,
      hoursPerWeek: 20,
    },
    {
      personId: "yolo-cts-dev",
      projectId: "yolo-proj-pulse",
      billable: true,
      hoursPerWeek: 40,
    },
    {
      personId: "yolo-cts-des",
      projectId: "yolo-proj-apex",
      billable: true,
      hoursPerWeek: 30,
    },
    {
      personId: "yolo-cts-copy",
      projectId: "yolo-proj-trio",
      billable: true,
      hoursPerWeek: 20,
    },
  ];

  // Generate time entries for the last 4 months (Jan-Apr 2026)
  const entryMonths = [
    { yyyy: 2026, mm: 1 },
    { yyyy: 2026, mm: 2 },
    { yyyy: 2026, mm: 3 },
    { yyyy: 2026, mm: 4 },
  ];

  for (const { yyyy, mm } of entryMonths) {
    for (const alloc of deliveryAlloc) {
      // ~4 weeks per month, spread over weekdays
      const weeksInMonth = 4;
      const dailyHours = alloc.hoursPerWeek / 5; // 5 day week

      for (let week = 0; week < weeksInMonth; week++) {
        for (let dow = 1; dow <= 5; dow++) {
          // Mon-Fri
          const dayOfMonth = week * 7 + dow;
          if (dayOfMonth > 28) continue; // keep it simple

          const entryDate = new Date(yyyy, mm - 1, dayOfMonth);
          // Add some variation ±15%
          const variation = 0.85 + Math.random() * 0.3;
          const hours = Math.round(dailyHours * variation * 10) / 10;

          const entryId = `yolo-te-${alloc.personId}-${alloc.projectId}-${yyyy}${String(mm).padStart(2, "0")}-w${week}-d${dow}`;

          await prisma.timeEntry.upsert({
            where: { id: entryId },
            update: {},
            create: {
              id: entryId,
              personId: alloc.personId,
              projectId: alloc.projectId,
              date: entryDate,
              hours,
              billable: alloc.billable,
            },
          });
        }
      }
    }
  }
  console.log("  ✅  Time entries seeded (Jan–Apr 2026)");

  // ── 6. Revenue Records ────────────────────────────────────────────────────

  const revenueRecords: Array<{
    projectId: string;
    yyyy: number;
    mm: number;
    amount: number;
  }> = [
    // MegaCorp retainer (ended Aug 2024)
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((mm) => ({
      projectId: "yolo-proj-megacorp",
      yyyy: 2024,
      mm,
      amount: 95_000,
    })),
    // Apex retainer (ongoing)
    ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mm) => ({
      projectId: "yolo-proj-apex",
      yyyy: 2024,
      mm,
      amount: 38_000,
    })),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mm) => ({
      projectId: "yolo-proj-apex",
      yyyy: 2025,
      mm,
      amount: 38_000,
    })),
    ...[1, 2, 3, 4].map((mm) => ({
      projectId: "yolo-proj-apex",
      yyyy: 2026,
      mm,
      amount: 40_000,
    })),
    // TrioMedia (started Mar 2025)
    ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mm) => ({
      projectId: "yolo-proj-trio",
      yyyy: 2025,
      mm,
      amount: 28_000,
    })),
    ...[1, 2, 3, 4].map((mm) => ({
      projectId: "yolo-proj-trio",
      yyyy: 2026,
      mm,
      amount: 28_000,
    })),
    // PulseHealth
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mm) => ({
      projectId: "yolo-proj-pulse",
      yyyy: 2024,
      mm,
      amount: mm <= 8 ? 38_000 : 42_000,
    })),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mm) => ({
      projectId: "yolo-proj-pulse",
      yyyy: 2025,
      mm,
      amount: 45_000,
    })),
    ...[1, 2, 3, 4].map((mm) => ({
      projectId: "yolo-proj-pulse",
      yyyy: 2026,
      mm,
      amount: 48_000,
    })),
    // Bloom CPG
    ...[4, 5, 6, 7, 8, 9, 10].map((mm) => ({
      projectId: "yolo-proj-bloom",
      yyyy: 2024,
      mm,
      amount: mm <= 6 ? 22_000 : 28_000,
    })),
    // Nova Tech (2025+)
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mm) => ({
      projectId: "yolo-proj-nova",
      yyyy: 2025,
      mm,
      amount: 18_000,
    })),
    ...[1, 2, 3, 4].map((mm) => ({
      projectId: "yolo-proj-nova",
      yyyy: 2026,
      mm,
      amount: 20_000,
    })),
    // Cedar Logistics (2026 only)
    ...[1, 2, 3, 4].map((mm) => ({
      projectId: "yolo-proj-cedar",
      yyyy: 2026,
      mm,
      amount: 35_000,
    })),
  ];

  for (const r of revenueRecords) {
    const recId = `yolo-rev-${r.projectId}-${r.yyyy}${String(r.mm).padStart(2, "0")}`;
    await prisma.revenueRecord.upsert({
      where: { id: recId },
      update: {},
      create: {
        id: recId,
        projectId: r.projectId,
        periodStart: d(r.yyyy, r.mm, 1),
        periodEnd: monthEnd(r.yyyy, r.mm),
        amount: r.amount,
        basis: AccountingBasis.CASH,
        source: "seed",
      },
    });
  }
  console.log("  ✅  Revenue records seeded");

  // ── 7. Financial Periods ──────────────────────────────────────────────────

  console.log("\n  📊  Seeding financial periods...");

  const importId = `yolo-seed-import`;
  await prisma.dataImport.upsert({
    where: { id: importId },
    update: {},
    create: {
      id: importId,
      companyId: COMPANY_ID,
      source: "SEED",
      filename: "yolo-seed.ts",
      periodStart: d(2024, 1),
      periodEnd: d(2026, 4, 30),
      basis: AccountingBasis.CASH,
      status: "COMPLETED",
    },
  });

  const allMonths = [...MONTHS_2024, ...MONTHS_2025, ...MONTHS_2026_YTD];

  for (const spec of allMonths) {
    const p = buildMonthlyPeriod(spec);
    const periodId = `yolo-period-${spec.yyyy}${String(spec.mm).padStart(2, "0")}-CASH`;

    await prisma.financialPeriod.upsert({
      where: { id: periodId },
      update: {
        totalRevenue: p.totalRevenue,
        totalCOGS: p.totalCOGS,
        grossProfit: p.grossProfit,
        grossMargin: p.grossMargin,
        totalOpEx: p.totalOpEx,
        netIncome: p.netIncome,
        netMargin: p.netMargin,
        cogsPayroll: p.cogsPayroll,
        cogsContractors: p.cogsContractors,
        cogsSoftware: p.cogsSoftware,
      },
      create: {
        id: periodId,
        companyId: COMPANY_ID,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        basis: AccountingBasis.CASH,
        importId,
        totalRevenue: p.totalRevenue,
        totalCOGS: p.totalCOGS,
        grossProfit: p.grossProfit,
        grossMargin: p.grossMargin,
        totalOpEx: p.totalOpEx,
        netIncome: p.netIncome,
        netMargin: p.netMargin,
        cogsPayroll: p.cogsPayroll,
        cogsContractors: p.cogsContractors,
        cogsSoftware: p.cogsSoftware,
      },
    });

    // Line items
    await prisma.lineItem.deleteMany({ where: { periodId } });
    const lineItems = buildLineItems(
      p.totalRevenue,
      p.totalCOGS,
      p.totalOpEx,
      p.cogsPayroll,
      p.cogsContractors,
      p.cogsSoftware,
    );
    await prisma.lineItem.createMany({
      data: lineItems.map((li) => ({ ...li, periodId })),
    });

    console.log(
      `  📅  ${spec.yyyy}-${String(spec.mm).padStart(2, "0")}  Rev: $${p.totalRevenue.toLocaleString()}  GM: ${(p.grossMargin * 100).toFixed(1)}%  NI: $${p.netIncome.toLocaleString()}`,
    );
  }

  // Also seed two annual roll-up periods (full 2024, full 2025) for YoY charts
  const annualSpecs: Array<{
    label: string;
    months: MonthlySpec[];
    yyyy: number;
  }> = [
    { label: "2024", months: MONTHS_2024, yyyy: 2024 },
    { label: "2025", months: MONTHS_2025, yyyy: 2025 },
  ];

  for (const { label, months, yyyy } of annualSpecs) {
    const totRev = months.reduce((s, m) => s + m.rev, 0);
    const cogs = months.reduce((s, m) => s + m.rev * m.cogsRate, 0);
    const opex = months.reduce((s, m) => s + m.opex, 0);
    const cpayroll = months.reduce(
      (s, m) => s + m.rev * m.cogsRate * m.payrollFrac,
      0,
    );
    const cctrs = months.reduce(
      (s, m) => s + m.rev * m.cogsRate * m.contractorFrac,
      0,
    );
    const csoft = cogs - cpayroll - cctrs;

    const ap = derived({
      periodStart: d(yyyy, 1),
      periodEnd: d(yyyy, 12, 31),
      basis: AccountingBasis.CASH,
      totalRevenue: totRev,
      totalCOGS: cogs,
      totalOpEx: opex,
      cogsPayroll: cpayroll,
      cogsContractors: cctrs,
      cogsSoftware: csoft,
    });

    const annualId = `yolo-period-${yyyy}-annual-CASH`;
    await prisma.financialPeriod.upsert({
      where: { id: annualId },
      update: {
        totalRevenue: ap.totalRevenue,
        totalCOGS: ap.totalCOGS,
        grossProfit: ap.grossProfit,
        grossMargin: ap.grossMargin,
        totalOpEx: ap.totalOpEx,
        netIncome: ap.netIncome,
        netMargin: ap.netMargin,
        cogsPayroll: ap.cogsPayroll,
        cogsContractors: ap.cogsContractors,
        cogsSoftware: ap.cogsSoftware,
      },
      create: {
        id: annualId,
        companyId: COMPANY_ID,
        periodStart: ap.periodStart,
        periodEnd: ap.periodEnd,
        basis: AccountingBasis.CASH,
        importId,
        totalRevenue: ap.totalRevenue,
        totalCOGS: ap.totalCOGS,
        grossProfit: ap.grossProfit,
        grossMargin: ap.grossMargin,
        totalOpEx: ap.totalOpEx,
        netIncome: ap.netIncome,
        netMargin: ap.netMargin,
        cogsPayroll: ap.cogsPayroll,
        cogsContractors: ap.cogsContractors,
        cogsSoftware: ap.cogsSoftware,
      },
    });

    await prisma.lineItem.deleteMany({ where: { periodId: annualId } });
    await prisma.lineItem.createMany({
      data: buildLineItems(
        ap.totalRevenue,
        ap.totalCOGS,
        ap.totalOpEx,
        ap.cogsPayroll,
        ap.cogsContractors,
        ap.cogsSoftware,
      ).map((li) => ({ ...li, periodId: annualId })),
    });

    console.log(
      `  📅  Annual ${label}  Rev: $${ap.totalRevenue.toLocaleString()}  GM: ${(ap.grossMargin * 100).toFixed(1)}%  NI: $${ap.netIncome.toLocaleString()}`,
    );
  }

  // ── 8. Narrative (sample) ─────────────────────────────────────────────────

  const latestPeriod = await prisma.financialPeriod.findFirst({
    where: { companyId: COMPANY_ID, basis: AccountingBasis.CASH },
    orderBy: { periodEnd: "desc" },
  });

  if (latestPeriod) {
    const gm = (latestPeriod.grossMargin * 100).toFixed(1);
    const nm = (latestPeriod.netMargin * 100).toFixed(1);
    await prisma.narrative.upsert({
      where: { id: "yolo-narrative-apr2026" },
      update: {},
      create: {
        id: "yolo-narrative-apr2026",
        companyId: COMPANY_ID,
        type: "MONTHLY_SUMMARY",
        periodStart: latestPeriod.periodStart,
        periodEnd: latestPeriod.periodEnd,
        title: "April 2026 — CFO Summary",
        content: `## April 2026 Financial Summary — Yolo, Inc.

**Revenue:** $${latestPeriod.totalRevenue.toLocaleString()} | **Gross Margin:** ${gm}% | **Net Income:** $${latestPeriod.netIncome.toLocaleString()} (${nm}%)

### Highlights

Revenue held steady at $${latestPeriod.totalRevenue.toLocaleString()} in April, on track to exceed the $5.8M annual target. The Cedar Logistics rebrand project added $35K in new recognized revenue, partially offset by the end of the MegaCorp retainer (churned August 2024) now fully lapped in the comps.

Gross margin of ${gm}% is within the target range of 34–40%. Contractor mix (${((latestPeriod.cogsContractors! / latestPeriod.totalCOGS) * 100).toFixed(0)}% of COGS) remained elevated — the Pulse Health engineering sprint drove incremental contractor hours. Worth monitoring as we approach H2 budget season.

### Risks & Watchpoints

1. **Contractor concentration** — Dev Contractor represents ~${(((latestPeriod.cogsContractors ?? 0) / latestPeriod.totalCOGS) * 100 * 0.6).toFixed(0)}% of total COGS. A rate renegotiation or departure would materially impact margin.
2. **Apex Ventures renewal** — Month-to-month retainer ($40K/mo) is up for annual review in Q3. No signal of churn, but this is the largest active recurring revenue line.
3. **TrioMedia scope creep** — Hours logged have exceeded the contracted retainer budget by ~12% over the past two months. A change order conversation is overdue.

### Outlook

With Q1 actuals above plan and Cedar onboarding well, the full-year revenue projection sits at ~$5.85M. Net income is trending toward $490K (8.4% net margin), slightly above the $450K target. The primary lever to improve margin is converting the Dev Contractor to a salaried FTE — the all-in cost would be roughly equivalent, but it eliminates rate risk and builds institutional knowledge.

*Generated by Margot — Yolo, Inc. internal CFO analysis*`,
        dataSnapshot: {
          periodStart: latestPeriod.periodStart,
          periodEnd: latestPeriod.periodEnd,
          totalRevenue: latestPeriod.totalRevenue,
          grossMargin: latestPeriod.grossMargin,
          netIncome: latestPeriod.netIncome,
        },
        generatedAt: new Date(),
      },
    });
    console.log("\n  ✅  Sample narrative seeded");
  }

  console.log(`
╔══════════════════════════════════════════════════════╗
║  Yolo, Inc. seed complete!                           ║
║                                                      ║
║  Login:    anthony+yolo@codelab303.com               ║
║  Password: ledger2026!                               ║
║                                                      ║
║  2024 Revenue:  ~$4.98M  (anchor client churned Q3)  ║
║  2025 Revenue:  ~$5.29M  (full recovery + growth)    ║
║  2026 YTD:      ~$1.95M  (4 months, on track $5.85M) ║
╚══════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
