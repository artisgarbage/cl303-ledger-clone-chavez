/**
 * periods.getPnL — Fetch P&L for a given period
 *
 * Wraps existing FinancialPeriod queries. Returns structured financial data
 * with metadata for citation.
 */

import { prisma } from "@/lib/prisma";
import type { ToolDefinition } from "./index";
import {
  comparePeriods,
  type PeriodComparison,
} from "@/lib/engine/period-comparison";
import type { AccountingBasis } from "@prisma/client";

export const periodsListTool: ToolDefinition = {
  name: "periods_list",
  description:
    "List all available financial periods for this company. Call this FIRST before using periods_getPnL or periods_compare — it returns the exact periodStart and periodEnd dates you must pass to those tools. Never guess period dates; always discover them with this tool. Each period includes an isFullYear flag: full-year periods (Jan 1 – Dec 31) are annual income statements; monthly periods are complete closed months (e.g. Apr 2026 means all of April is closed and available).",
  input_schema: {
    type: "object",
    properties: {
      basis: {
        type: "string",
        enum: ["CASH", "ACCRUAL"],
        description:
          "Optional. Filter to only periods with this accounting basis. Omit to return all available periods.",
      },
    },
    required: [],
  },
};

export interface PeriodsListInput {
  basis?: "CASH" | "ACCRUAL";
}

export interface PeriodsListOutput {
  _meta: { source: string; count: number };
  periods: Array<{
    periodStart: string; // YYYY-MM-DD
    periodEnd: string; // YYYY-MM-DD
    basis: "CASH" | "ACCRUAL";
    isFullYear: boolean; // true only when period spans Jan 1 – Dec 31 of a single year
    label: string; // e.g. "FY 2025 (Jan 1 – Dec 31, Cash)" or "YTD 2026 (Jan 1 – Apr 15, Cash)"
  }>;
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDateShort(d: Date): string {
  return `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

async function periodsList(
  companyId: string,
  input: PeriodsListInput,
): Promise<PeriodsListOutput> {
  const { basis } = input;

  const where: { companyId: string; basis?: AccountingBasis } = { companyId };
  if (basis) where.basis = basis as AccountingBasis;

  const periods = await prisma.financialPeriod.findMany({
    where,
    select: { periodStart: true, periodEnd: true, basis: true },
    orderBy: { periodStart: "asc" },
  });

  const formatted = periods.map((p) => {
    const start = p.periodStart.toISOString().slice(0, 10);
    const end = p.periodEnd.toISOString().slice(0, 10);
    const startYear = p.periodStart.getUTCFullYear();
    const endYear = p.periodEnd.getUTCFullYear();
    const basisLabel = p.basis === "CASH" ? "Cash" : "Accrual";

    // A full calendar year: starts Jan 1 and ends Dec 31 of the same year
    const isFullYear =
      startYear === endYear &&
      p.periodStart.getUTCMonth() === 0 &&
      p.periodStart.getUTCDate() === 1 &&
      p.periodEnd.getUTCMonth() === 11 &&
      p.periodEnd.getUTCDate() === 31;

    const dateRange = `${formatDateShort(p.periodStart)} – ${formatDateShort(p.periodEnd)}`;
    // Check if this is a single calendar month
    const startMonth = p.periodStart.getUTCMonth();
    const endMonth = p.periodEnd.getUTCMonth();
    const isSingleMonth =
      !isFullYear &&
      startYear === endYear &&
      startMonth === endMonth &&
      p.periodStart.getUTCDate() === 1;
    const label = isFullYear
      ? `FY ${startYear} (${dateRange}, ${basisLabel})`
      : isSingleMonth
        ? `${MONTH_ABBR[startMonth]} ${startYear} (${basisLabel})`
        : `YTD ${endYear} (${dateRange}, ${basisLabel})`;

    return {
      periodStart: start,
      periodEnd: end,
      basis: p.basis as "CASH" | "ACCRUAL",
      isFullYear,
      label,
    };
  });

  return {
    _meta: { source: "FinancialPeriod", count: formatted.length },
    periods: formatted,
  };
}

export const periodsGetPnLTool: ToolDefinition = {
  name: "periods_getPnL",
  description:
    "Fetch the Profit & Loss statement for a specific financial period. The periodStart and periodEnd dates must exactly match a period returned by periods_list — call that tool first if you have not already. Returns revenue, COGS, gross profit, gross margin, operating expenses, and net income. Always cite the period and basis (cash or accrual) when presenting numbers.",
  input_schema: {
    type: "object",
    properties: {
      periodStart: {
        type: "string",
        description:
          "Start date of the period in ISO 8601 format (YYYY-MM-DD). Example: 2026-01-01 for January 2026.",
      },
      periodEnd: {
        type: "string",
        description:
          "End date of the period in ISO 8601 format (YYYY-MM-DD). Example: 2026-01-31 for January 2026.",
      },
      basis: {
        type: "string",
        enum: ["CASH", "ACCRUAL"],
        description:
          "Accounting basis for the P&L. Use CASH for cash-basis accounting, ACCRUAL for accrual-basis. If unsure, try both and explain the difference.",
      },
    },
    required: ["periodStart", "periodEnd", "basis"],
  },
};

export interface PeriodsGetPnLInput {
  periodStart: string;
  periodEnd: string;
  basis: "CASH" | "ACCRUAL";
}

export interface PeriodsGetPnLOutput {
  _meta: {
    source: string;
    period: string;
    basis: "CASH" | "ACCRUAL";
  };
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number; // Decimal (e.g., 0.35 = 35%)
  totalOpEx: number;
  netIncome: number;
  netMargin: number;
  cogsBreakdown?: {
    payroll?: number;
    contractors?: number;
    software?: number;
  };
  adjustments?: {
    estimatedContractorLag?: number;
    adjustedCOGS?: number;
    adjustedGrossProfit?: number;
    adjustedGrossMargin?: number;
  };
  lineItems?: Array<{
    category: string;
    subcategory?: string;
    name: string;
    amount: number;
  }>;
}

async function periodsGetPnL(
  companyId: string,
  input: PeriodsGetPnLInput,
): Promise<PeriodsGetPnLOutput> {
  const { periodStart, periodEnd, basis } = input;

  // Parse dates — use a 24-hour window to tolerate timezone offsets in stored timestamps
  const startDay = new Date(periodStart);
  const startDayNext = new Date(startDay.getTime() + 86_400_000);
  const endDay = new Date(periodEnd);
  const endDayNext = new Date(endDay.getTime() + 86_400_000);

  // Find matching FinancialPeriod
  const period = await prisma.financialPeriod.findFirst({
    where: {
      companyId,
      periodStart: { gte: startDay, lt: startDayNext },
      periodEnd: { gte: endDay, lt: endDayNext },
      basis,
    },
    include: {
      lineItems: {
        orderBy: { id: "asc" },
      },
    },
  });

  if (!period) {
    throw new Error(
      `No financial period found for ${periodStart} to ${periodEnd} (${basis} basis). You may need to import QuickBooks data for this period first.`,
    );
  }

  // Build response
  const result: PeriodsGetPnLOutput = {
    _meta: {
      source: "FinancialPeriod",
      period: `${periodStart} to ${periodEnd}`,
      basis: basis,
    },
    totalRevenue: period.totalRevenue,
    totalCOGS: period.totalCOGS,
    grossProfit: period.grossProfit,
    grossMargin: period.grossMargin,
    totalOpEx: period.totalOpEx,
    netIncome: period.netIncome,
    netMargin: period.netMargin,
  };

  // Add COGS breakdown if available
  if (
    period.cogsPayroll !== null ||
    period.cogsContractors !== null ||
    period.cogsSoftware !== null
  ) {
    result.cogsBreakdown = {
      payroll: period.cogsPayroll ?? undefined,
      contractors: period.cogsContractors ?? undefined,
      software: period.cogsSoftware ?? undefined,
    };
  }

  // Add contractor lag adjustment if present
  if (period.estimatedContractorLag !== null || period.adjustedCOGS !== null) {
    result.adjustments = {
      estimatedContractorLag: period.estimatedContractorLag ?? undefined,
      adjustedCOGS: period.adjustedCOGS ?? undefined,
      adjustedGrossProfit: period.adjustedGrossProfit ?? undefined,
      adjustedGrossMargin: period.adjustedGrossMargin ?? undefined,
    };
  }

  // Include line items for detailed breakdown
  if (period.lineItems.length > 0) {
    result.lineItems = period.lineItems.map((item) => ({
      category: item.category,
      subcategory: item.subcategory ?? undefined,
      name: item.name,
      amount: item.amount,
    }));
  }

  return result;
}

// ============================================================================
// periods.compare
// ============================================================================

export const periodsCompareTool: ToolDefinition = {
  name: "periods_compare",
  description:
    "Compare two financial periods side-by-side. Returns current vs prior P&L, deltas (absolute and %), and revenue/margin trends. Use this to answer 'how did X compare to Y' questions.",
  input_schema: {
    type: "object",
    properties: {
      currentStart: {
        type: "string",
        description: "Start date of current period (YYYY-MM-DD).",
      },
      currentEnd: {
        type: "string",
        description: "End date of current period (YYYY-MM-DD).",
      },
      priorStart: {
        type: "string",
        description: "Start date of prior period (YYYY-MM-DD).",
      },
      priorEnd: {
        type: "string",
        description: "End date of prior period (YYYY-MM-DD).",
      },
      basis: {
        type: "string",
        enum: ["CASH", "ACCRUAL"],
        description: "Accounting basis for both periods.",
      },
    },
    required: ["currentStart", "currentEnd", "priorStart", "priorEnd", "basis"],
  },
};

export interface PeriodsCompareInput {
  currentStart: string;
  currentEnd: string;
  priorStart: string;
  priorEnd: string;
  basis: "CASH" | "ACCRUAL";
}

export interface PeriodsCompareOutput {
  _meta: {
    source: string;
    currentPeriod: string;
    priorPeriod: string;
    basis: "CASH" | "ACCRUAL";
  };
  current: {
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number;
    totalOpEx: number;
    netIncome: number;
    netMargin: number;
  };
  prior: {
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number;
    totalOpEx: number;
    netIncome: number;
    netMargin: number;
  } | null;
  deltas: {
    revenueDelta: number | null; // Absolute
    revenueYoY: number | null; // Pct change (0.15 = 15% growth)
    marginDelta: number | null; // Absolute margin point change
    netIncomeDelta: number | null; // Absolute
  };
}

async function periodsCompare(
  companyId: string,
  input: PeriodsCompareInput,
): Promise<PeriodsCompareOutput> {
  const { currentStart, currentEnd, priorStart, priorEnd, basis } = input;

  const comparison = await comparePeriods(
    companyId,
    new Date(currentStart),
    new Date(currentEnd),
    new Date(priorStart),
    new Date(priorEnd),
    basis as AccountingBasis,
  );

  return {
    _meta: {
      source: "FinancialPeriod",
      currentPeriod: `${currentStart} to ${currentEnd}`,
      priorPeriod: `${priorStart} to ${priorEnd}`,
      basis,
    },
    current: {
      totalRevenue: comparison.current.totalRevenue,
      totalCOGS: comparison.current.totalCOGS,
      grossProfit: comparison.current.grossProfit,
      grossMargin: comparison.current.grossMargin,
      totalOpEx: comparison.current.totalOpEx,
      netIncome: comparison.current.netIncome,
      netMargin: comparison.current.netMargin,
    },
    prior: comparison.prior
      ? {
          totalRevenue: comparison.prior.totalRevenue,
          totalCOGS: comparison.prior.totalCOGS,
          grossProfit: comparison.prior.grossProfit,
          grossMargin: comparison.prior.grossMargin,
          totalOpEx: comparison.prior.totalOpEx,
          netIncome: comparison.prior.netIncome,
          netMargin: comparison.prior.netMargin,
        }
      : null,
    deltas: {
      revenueDelta: comparison.revenueDelta,
      revenueYoY: comparison.revenueYoY,
      marginDelta: comparison.marginDelta,
      netIncomeDelta: comparison.netIncomeDelta,
    },
  };
}

export default {
  periodsList,
  periodsGetPnL,
  periodsCompare,
};
