import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectTrueCost } from "@/lib/engine/cost-basis";
import { AccountingBasis } from "@prisma/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      revenue: { orderBy: { periodStart: "desc" } },
      timeEntries: {
        include: { person: true },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!project || project.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build trailing 12-month chart data
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthKey = format(monthDate, "yyyy-MM");
    const label = format(monthDate, "MMM yy");

    const monthRevenue = project.revenue
      .filter(
        (r) =>
          r.basis === AccountingBasis.CASH &&
          format(r.periodStart, "yyyy-MM") === monthKey,
      )
      .reduce((sum, r) => sum + r.amount, 0);

    const { totalCost, byPerson } = await getProjectTrueCost(
      id,
      monthStart,
      monthEnd,
    );

    const monthHours = project.timeEntries
      .filter((e) => format(e.date, "yyyy-MM") === monthKey)
      .reduce((sum, e) => sum + e.hours, 0);

    monthlyData.push({
      month: label,
      revenue: monthRevenue,
      cost: totalCost,
      grossProfit: monthRevenue - totalCost,
      grossMargin:
        monthRevenue > 0 ? (monthRevenue - totalCost) / monthRevenue : 0,
      hours: monthHours,
    });
  }

  // YTD totals
  const ytdStart = new Date(new Date().getFullYear(), 0, 1);
  const ytdEnd = new Date();
  const { totalCost: ytdCost, byPerson: ytdByPerson } =
    await getProjectTrueCost(id, ytdStart, ytdEnd);

  const ytdRevenue = project.revenue
    .filter(
      (r) =>
        r.basis === AccountingBasis.CASH &&
        r.periodStart >= ytdStart &&
        r.periodStart <= ytdEnd,
    )
    .reduce((sum, r) => sum + r.amount, 0);

  const ytdHours = project.timeEntries
    .filter((e) => e.date >= ytdStart && e.date <= ytdEnd)
    .reduce((sum, e) => sum + e.hours, 0);

  const ytdBillableHours = project.timeEntries
    .filter((e) => e.date >= ytdStart && e.date <= ytdEnd && e.billable)
    .reduce((sum, e) => sum + e.hours, 0);

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      classification: project.classification,
      status: project.status,
      contractValue: project.contractValue,
      monthlyRetainer: project.monthlyRetainer,
      startDate: project.startDate,
      endDate: project.endDate,
    },
    monthlyData,
    ytd: {
      revenue: ytdRevenue,
      cost: ytdCost,
      grossProfit: ytdRevenue - ytdCost,
      grossMargin: ytdRevenue > 0 ? (ytdRevenue - ytdCost) / ytdRevenue : 0,
      hours: ytdHours,
      billableHours: ytdBillableHours,
      utilizationRate: ytdHours > 0 ? ytdBillableHours / ytdHours : 0,
      effectiveBlendedRate:
        ytdBillableHours > 0 ? ytdRevenue / ytdBillableHours : 0,
      byPerson: ytdByPerson,
    },
  });
}
