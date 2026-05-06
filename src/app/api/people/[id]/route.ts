import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateMonthlyCostBases,
  isSalariedCostBasis,
} from "@/lib/engine/cost-basis";
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

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      compensationRecords: {
        orderBy: { effectiveDate: "desc" },
      },
      allocations: {
        include: { project: true },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!person || person.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build trailing 12-month data
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthKey = format(monthDate, "yyyy-MM");
    const label = format(monthDate, "MMM yy");

    const cb = await calculateMonthlyCostBases(companyId, monthKey).then(
      (bases) => bases.find((b) => b.personId === id),
    );

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        personId: id,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { project: true },
    });

    const totalHours = timeEntries.reduce((s, e) => s + e.hours, 0);
    const billableHours = timeEntries
      .filter((e) => e.billable)
      .reduce((s, e) => s + e.hours, 0);
    const utilization = totalHours > 0 ? billableHours / totalHours : 0;
    const effectiveRate = cb
      ? isSalariedCostBasis(cb)
        ? cb.effectiveHourlyRate
        : cb.hourlyRate
      : null;
    const totalCost = cb
      ? isSalariedCostBasis(cb)
        ? cb.totalMonthlyCompensation
        : cb.totalCost
      : 0;

    monthlyData.push({
      month: monthKey,
      label,
      totalHours,
      billableHours,
      utilization,
      effectiveRate,
      totalCost,
    });
  }

  // YTD totals
  const ytdYear = new Date().getFullYear();
  const ytdMonths = monthlyData.filter((m) =>
    m.month.startsWith(ytdYear.toString()),
  );
  const ytdTotalHours = ytdMonths.reduce((s, m) => s + m.totalHours, 0);
  const ytdBillableHours = ytdMonths.reduce((s, m) => s + m.billableHours, 0);
  const ytdTotalCost = ytdMonths.reduce((s, m) => s + m.totalCost, 0);
  const ytdUtilization =
    ytdTotalHours > 0 ? ytdBillableHours / ytdTotalHours : 0;

  // Current month effective rate
  const currentCb = await calculateMonthlyCostBases(
    companyId,
    format(new Date(), "yyyy-MM"),
  ).then((bases) => bases.find((b) => b.personId === id));
  const currentRate = currentCb
    ? isSalariedCostBasis(currentCb)
      ? currentCb.effectiveHourlyRate
      : currentCb.hourlyRate
    : null;

  // Project allocation breakdown (time entries per project this year)
  const ytdStart = new Date(ytdYear, 0, 1);
  const ytdTimeEntries = await prisma.timeEntry.findMany({
    where: {
      personId: id,
      date: { gte: ytdStart },
    },
    include: { project: true },
  });

  const projectMap = new Map<
    string,
    { name: string; hours: number; billableHours: number }
  >();
  for (const entry of ytdTimeEntries) {
    const existing = projectMap.get(entry.projectId) ?? {
      name: entry.project.name,
      hours: 0,
      billableHours: 0,
    };
    existing.hours += entry.hours;
    if (entry.billable) existing.billableHours += entry.hours;
    projectMap.set(entry.projectId, existing);
  }
  const projectAllocation = Array.from(projectMap.entries())
    .map(([projectId, data]) => ({ projectId, ...data }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  const latestComp =
    person.compensationRecords.length > 0
      ? person.compensationRecords[0]
      : null;

  return NextResponse.json({
    person: {
      id: person.id,
      name: person.name,
      email: person.email,
      type: person.type,
      isActive: person.isActive,
    },
    compensation: latestComp
      ? {
          annualSalary: latestComp.annualSalary,
          hourlyRate: latestComp.hourlyRate,
          burdenRate: latestComp.burdenRate,
          effectiveDate: latestComp.effectiveDate,
        }
      : null,
    currentRate,
    ytd: {
      totalHours: ytdTotalHours,
      billableHours: ytdBillableHours,
      utilization: ytdUtilization,
      totalCost: ytdTotalCost,
    },
    monthlyData,
    projectAllocation,
    allocations: person.allocations.slice(0, 5).map((a) => ({
      id: a.id,
      projectId: a.projectId,
      projectName: a.project.name,
      startDate: a.startDate,
      endDate: a.endDate,
      hoursPerDay: a.hoursPerDay,
    })),
  });
}
