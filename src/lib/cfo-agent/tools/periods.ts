/**
 * periods.getPnL — Fetch P&L for a given period
 *
 * Wraps existing FinancialPeriod queries. Returns structured financial data
 * with metadata for citation.
 */

import { prisma } from "@/lib/prisma";
import type { ToolDefinition } from "./index";

export const periodsGetPnLTool: ToolDefinition = {
  name: "periods_getPnL",
  description:
    "Fetch the Profit & Loss statement for a specific financial period. Returns revenue, COGS, gross profit, gross margin, operating expenses, and net income. Always cite the period and basis (cash or accrual) when presenting these numbers to the user.",
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

export default {
  periodsGetPnL,
};

// ============================================================================
// periods.compare
// ============================================================================

import { comparePeriods, type PeriodComparison } from "@/lib/engine/period-comparison";

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
    required: [
      "currentStart",
      "currentEnd",
      "priorStart",
      "priorEnd",
      "basis",
    ],
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
  input: PeriodsCompareInput
): Promise<PeriodsCompareOutput> {
  const { currentStart, currentEnd, priorStart, priorEnd, basis } = input;

  const comparison = await comparePeriods(
    companyId,
    new Date(currentStart),
    new Date(currentEnd),
    new Date(priorStart),
    new Date(priorEnd),
    basis as AccountingBasis
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
  periodsGetPnL,
  periodsCompare,
};
