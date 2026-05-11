/**
 * periods.getPnL — Fetch P&L for a given period
 *
 * Wraps existing FinancialPeriod queries. Returns structured financial data
 * with metadata for citation.
 */

import { prisma } from "@/lib/prisma";
import type { ToolDefinition } from "./index";

export const periodsGetPnLTool: ToolDefinition = {
  name: "periods.getPnL",
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

  // Parse dates
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // Find matching FinancialPeriod
  const period = await prisma.financialPeriod.findFirst({
    where: {
      companyId,
      periodStart: start,
      periodEnd: end,
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
  if (
    period.estimatedContractorLag !== null ||
    period.adjustedCOGS !== null
  ) {
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
