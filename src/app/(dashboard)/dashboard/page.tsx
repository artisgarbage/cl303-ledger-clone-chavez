import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardClient } from "../DashboardClient";
import { getPeriodsForCompany } from "@/lib/engine/period-comparison";
import { getCompanyContractorLag } from "@/lib/engine/cost-basis";
import { AccountingBasis } from "@prisma/client";
import { buildChartPoints } from "@/lib/utils/chart-data";
import {
  buildProjections,
  proRatedToDate,
  annualizedRunRate,
  projectedEOY,
  revenueVelocity,
} from "@/lib/utils/projection";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = (session.user as { companyId: string }).companyId;
  if (!companyId) redirect("/settings");

  const [periods, contractorLag, latestNarrative, settings] = await Promise.all(
    [
      getPeriodsForCompany(companyId, AccountingBasis.CASH),
      getCompanyContractorLag(companyId),
      prisma.narrative.findFirst({
        where: { companyId },
        orderBy: { generatedAt: "desc" },
      }),
      prisma.companySettings.findUnique({ where: { companyId } }),
    ],
  );

  // ── Projections ────────────────────────────────────────────────────────────
  const today = new Date();
  const projections = buildProjections(periods, 6);
  const chartData = buildChartPoints(periods, projections);

  // ── Insights ───────────────────────────────────────────────────────────────
  const currentPeriod = periods[periods.length - 1] ?? null;
  const priorPeriod = periods[periods.length - 2] ?? null;

  const arr = currentPeriod ? annualizedRunRate(currentPeriod) : null;
  const proratedMTD = proRatedToDate(periods, today);
  const eoyProj = projectedEOY(periods, today.getFullYear());
  const velocity = revenueVelocity(periods, 4);

  return (
    <DashboardClient
      allPeriods={periods}
      currentPeriod={currentPeriod}
      priorPeriod={priorPeriod}
      chartData={chartData}
      contractorLag={contractorLag}
      latestNarrative={
        latestNarrative
          ? {
              id: latestNarrative.id,
              content: latestNarrative.content,
              generatedAt: latestNarrative.generatedAt,
              title: latestNarrative.title ?? "Financial Summary",
            }
          : null
      }
      settings={{
        grossMarginTargetMin: settings?.grossMarginTargetMin ?? 0.28,
        grossMarginTargetMax: settings?.grossMarginTargetMax ?? 0.32,
        revenueTarget: settings?.revenueTarget ?? null,
      }}
      companyId={companyId}
      arr={arr}
      proratedMTD={proratedMTD}
      eoyProjection={eoyProj}
      dataAsOf={currentPeriod ? currentPeriod.periodEnd.toISOString() : null}
      today={today.toISOString()}
      velocity={velocity}
    />
  );
}
