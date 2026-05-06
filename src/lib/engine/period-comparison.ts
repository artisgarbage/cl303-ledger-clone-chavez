import { prisma } from "@/lib/prisma";
import { AccountingBasis } from "@prisma/client";

export interface PeriodSummary {
  periodId: string;
  periodStart: Date;
  periodEnd: Date;
  basis: AccountingBasis;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  grossMargin: number;
  totalOpEx: number;
  netIncome: number;
  netMargin: number;
  cogsPayroll: number | null;
  cogsContractors: number | null;
  cogsSoftware: number | null;
  adjustedCOGS: number | null;
  adjustedGrossProfit: number | null;
  adjustedGrossMargin: number | null;
}

export interface PeriodComparison {
  current: PeriodSummary;
  prior: PeriodSummary | null;
  revenueDelta: number | null;
  revenueYoY: number | null;
  marginDelta: number | null;
  netIncomeDelta: number | null;
}

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return (current - prior) / Math.abs(prior);
}

export async function getPeriodsForCompany(
  companyId: string,
  basis?: AccountingBasis,
): Promise<PeriodSummary[]> {
  const where = basis ? { companyId, basis } : { companyId };
  const periods = await prisma.financialPeriod.findMany({
    where,
    orderBy: { periodStart: "asc" },
  });

  return periods.map((p) => ({
    periodId: p.id,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    basis: p.basis,
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
    adjustedCOGS: p.adjustedCOGS,
    adjustedGrossProfit: p.adjustedGrossProfit,
    adjustedGrossMargin: p.adjustedGrossMargin,
  }));
}

export async function comparePeriods(
  companyId: string,
  currentStart: Date,
  currentEnd: Date,
  priorStart: Date,
  priorEnd: Date,
  basis: AccountingBasis,
): Promise<PeriodComparison> {
  const [current, prior] = await Promise.all([
    prisma.financialPeriod.findFirst({
      where: {
        companyId,
        basis,
        periodStart: { gte: currentStart },
        periodEnd: { lte: currentEnd },
      },
      orderBy: { periodStart: "asc" },
    }),
    prisma.financialPeriod.findFirst({
      where: {
        companyId,
        basis,
        periodStart: { gte: priorStart },
        periodEnd: { lte: priorEnd },
      },
      orderBy: { periodStart: "asc" },
    }),
  ]);

  const toPeriodSummary = (p: NonNullable<typeof current>): PeriodSummary => ({
    periodId: p.id,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    basis: p.basis,
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
    adjustedCOGS: p.adjustedCOGS,
    adjustedGrossProfit: p.adjustedGrossProfit,
    adjustedGrossMargin: p.adjustedGrossMargin,
  });

  if (!current) {
    throw new Error("No financial period found for the specified range");
  }

  const currentSummary = toPeriodSummary(current);
  const priorSummary = prior ? toPeriodSummary(prior) : null;

  return {
    current: currentSummary,
    prior: priorSummary,
    revenueDelta: priorSummary
      ? pctChange(currentSummary.totalRevenue, priorSummary.totalRevenue)
      : null,
    revenueYoY: priorSummary
      ? pctChange(currentSummary.totalRevenue, priorSummary.totalRevenue)
      : null,
    marginDelta: priorSummary
      ? currentSummary.grossMargin - priorSummary.grossMargin
      : null,
    netIncomeDelta: priorSummary
      ? pctChange(currentSummary.netIncome, priorSummary.netIncome)
      : null,
  };
}
