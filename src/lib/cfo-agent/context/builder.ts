/**
 * Context Builder
 *
 * Assembles per-turn context: company info, conversation history, relevant data snippets.
 */

import { prisma } from "@/lib/prisma";

export interface TurnContext {
  companyName: string;
  fiscalYearStart: number;
  latestPeriodLabel?: string;
}

/**
 * Build context for a turn
 */
export async function buildTurnContext(
  companyId: string,
): Promise<TurnContext> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      fiscalYearStart: true,
    },
  });

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  // Find the most recent closed monthly period so Margot knows it's queryable
  const latestPeriod = await prisma.financialPeriod.findFirst({
    where: { companyId },
    orderBy: { periodStart: "desc" },
    select: { periodStart: true, periodEnd: true, basis: true },
  });

  let latestPeriodLabel: string | undefined;
  if (latestPeriod) {
    const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const m = latestPeriod.periodStart.getUTCMonth();
    const y = latestPeriod.periodStart.getUTCFullYear();
    const basisLabel = latestPeriod.basis === "CASH" ? "Cash" : "Accrual";
    latestPeriodLabel = `${MONTH_ABBR[m]} ${y} (${basisLabel})`;
  }

  return {
    companyName: company.name,
    fiscalYearStart: company.fiscalYearStart,
    latestPeriodLabel,
  };
}
