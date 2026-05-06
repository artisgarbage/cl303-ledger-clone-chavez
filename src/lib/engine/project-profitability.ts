import { prisma } from "@/lib/prisma";
import { getProjectTrueCost } from "./cost-basis";
import { AccountingBasis } from "@prisma/client";

export interface ProjectProfitability {
  projectId: string;
  projectName: string;
  clientName: string | null;
  classification: string;
  status: string;
  contractValue: number | null;
  revenue: number;
  trueCost: number;
  grossProfit: number;
  grossMargin: number;
  billableHours: number;
  totalHours: number;
  effectiveBlendedRate: number;
}

export async function getProjectProfitability(
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  basis: AccountingBasis = AccountingBasis.CASH,
): Promise<ProjectProfitability[]> {
  const projects = await prisma.project.findMany({
    where: { companyId },
    include: {
      revenue: {
        where: {
          periodStart: { lte: periodEnd },
          periodEnd: { gte: periodStart },
          basis,
        },
      },
      timeEntries: {
        where: {
          date: { gte: periodStart, lte: periodEnd },
        },
      },
    },
  });

  const results: ProjectProfitability[] = [];

  for (const project of projects) {
    const revenue = project.revenue.reduce((sum, r) => sum + r.amount, 0);
    const billableHours = project.timeEntries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + e.hours, 0);
    const totalHours = project.timeEntries.reduce((sum, e) => sum + e.hours, 0);

    const { totalCost } = await getProjectTrueCost(
      project.id,
      periodStart,
      periodEnd,
    );

    const grossProfit = revenue - totalCost;
    const grossMargin = revenue > 0 ? grossProfit / revenue : 0;
    const effectiveBlendedRate =
      billableHours > 0 ? revenue / billableHours : 0;

    results.push({
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      classification: project.classification,
      status: project.status,
      contractValue: project.contractValue,
      revenue,
      trueCost: totalCost,
      grossProfit,
      grossMargin,
      billableHours,
      totalHours,
      effectiveBlendedRate,
    });
  }

  return results.sort((a, b) => b.grossMargin - a.grossMargin);
}
