import { prisma } from "@/lib/prisma";
import { toMonthKey } from "@/lib/utils/dates";

export interface MonthlyCostBasis {
  personId: string;
  personName: string;
  month: string;
  annualSalary: number;
  burdenRate: number;
  totalMonthlyCompensation: number;
  totalHoursWorked: number;
  effectiveHourlyRate: number;
  billableHours: number;
  nonBillableHours: number;
  utilizationRate: number;
}

export interface ContractorCostBasis {
  personId: string;
  personName: string;
  month: string;
  hourlyRate: number;
  totalHoursWorked: number;
  totalCost: number;
  invoiceLagDays: number;
  estimatedUninvoicedCost: number;
}

export type PersonCostBasis = MonthlyCostBasis | ContractorCostBasis;

export function isSalariedCostBasis(
  basis: PersonCostBasis,
): basis is MonthlyCostBasis {
  return "annualSalary" in basis;
}

export async function calculateMonthlyCostBases(
  companyId: string,
  month: string, // "2026-01"
): Promise<PersonCostBasis[]> {
  const [year, mo] = month.split("-").map(Number);
  const monthStart = new Date(year, mo - 1, 1);
  const monthEnd = new Date(year, mo, 0, 23, 59, 59, 999);

  const people = await prisma.person.findMany({
    where: { companyId, isActive: true },
    include: {
      compensationRecords: {
        where: {
          effectiveDate: { lte: monthEnd },
          OR: [{ endDate: null }, { endDate: { gte: monthStart } }],
        },
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
      timeEntries: {
        where: {
          date: { gte: monthStart, lte: monthEnd },
        },
      },
    },
  });

  const results: PersonCostBasis[] = [];

  for (const person of people) {
    const comp = person.compensationRecords[0];
    if (!comp) continue;

    const totalHours = person.timeEntries.reduce((sum, e) => sum + e.hours, 0);
    const billableHours = person.timeEntries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + e.hours, 0);

    if (person.type === "SALARIED" || person.type === "PARTNER") {
      if (!comp.annualSalary) continue;
      const monthlyComp = (comp.annualSalary * comp.burdenRate) / 12;
      const effectiveRate = totalHours > 0 ? monthlyComp / totalHours : 0;

      results.push({
        personId: person.id,
        personName: person.name,
        month,
        annualSalary: comp.annualSalary,
        burdenRate: comp.burdenRate,
        totalMonthlyCompensation: monthlyComp,
        totalHoursWorked: totalHours,
        effectiveHourlyRate: effectiveRate,
        billableHours,
        nonBillableHours: totalHours - billableHours,
        utilizationRate: totalHours > 0 ? billableHours / totalHours : 0,
      });
    } else if (person.type === "CONTRACTOR") {
      if (!comp.hourlyRate) continue;
      const totalCost = comp.hourlyRate * totalHours;
      const lagDays = comp.invoiceLagDays ?? 30;

      // Estimate uninvoiced cost: hours worked in the last N days of the month
      const lagCutoff = new Date(
        monthEnd.getTime() - lagDays * 24 * 60 * 60 * 1000,
      );
      const recentHours = person.timeEntries
        .filter((e) => e.date >= lagCutoff)
        .reduce((sum, e) => sum + e.hours, 0);

      results.push({
        personId: person.id,
        personName: person.name,
        month,
        hourlyRate: comp.hourlyRate,
        totalHoursWorked: totalHours,
        totalCost,
        invoiceLagDays: lagDays,
        estimatedUninvoicedCost: recentHours * comp.hourlyRate,
      });
    }
  }

  return results;
}

export async function getProjectTrueCost(
  projectId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{
  totalCost: number;
  byPerson: Array<{
    personId: string;
    personName: string;
    hours: number;
    cost: number;
  }>;
}> {
  // Get all unique months in the period
  const months = new Set<string>();
  const d = new Date(periodStart);
  while (d <= periodEnd) {
    months.add(toMonthKey(d));
    d.setMonth(d.getMonth() + 1);
  }

  // Get time entries for this project in the period
  const entries = await prisma.timeEntry.findMany({
    where: {
      projectId,
      date: { gte: periodStart, lte: periodEnd },
    },
    include: { person: { include: { compensationRecords: true } } },
  });

  // Build a map of personId -> month -> effective rate
  const costBases = new Map<string, Map<string, number>>();

  if (entries.length > 0) {
    // Get the company from the first entry's person
    const firstPerson = await prisma.person.findUnique({
      where: { id: entries[0].personId },
    });
    if (firstPerson?.companyId) {
      for (const month of months) {
        const bases = await calculateMonthlyCostBases(
          firstPerson.companyId,
          month,
        );
        for (const basis of bases) {
          if (!costBases.has(basis.personId)) {
            costBases.set(basis.personId, new Map());
          }
          const rate = isSalariedCostBasis(basis)
            ? basis.effectiveHourlyRate
            : basis.hourlyRate;
          costBases.get(basis.personId)!.set(month, rate);
        }
      }
    }
  }

  // Aggregate by person
  const byPerson = new Map<
    string,
    { personId: string; personName: string; hours: number; cost: number }
  >();

  for (const entry of entries) {
    const month = toMonthKey(entry.date);
    const rate = costBases.get(entry.personId)?.get(month) ?? 0;
    const cost = entry.hours * rate;

    if (!byPerson.has(entry.personId)) {
      byPerson.set(entry.personId, {
        personId: entry.personId,
        personName: entry.person.name,
        hours: 0,
        cost: 0,
      });
    }
    const agg = byPerson.get(entry.personId)!;
    agg.hours += entry.hours;
    agg.cost += cost;
  }

  const byPersonArr = Array.from(byPerson.values());
  const totalCost = byPersonArr.reduce((sum, p) => sum + p.cost, 0);

  return { totalCost, byPerson: byPersonArr };
}

export async function getCompanyContractorLag(
  companyId: string,
): Promise<number> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const contractors = await prisma.person.findMany({
    where: { companyId, type: "CONTRACTOR", isActive: true },
    include: {
      compensationRecords: {
        where: { effectiveDate: { lte: now } },
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
      timeEntries: {
        where: { date: { gte: thirtyDaysAgo } },
      },
    },
  });

  let totalLag = 0;

  for (const contractor of contractors) {
    const comp = contractor.compensationRecords[0];
    if (!comp?.hourlyRate) continue;

    const lagDays = comp.invoiceLagDays ?? 30;
    const lagCutoff = new Date(now.getTime() - lagDays * 24 * 60 * 60 * 1000);

    const uninvoicedHours = contractor.timeEntries
      .filter((e) => e.date >= lagCutoff)
      .reduce((sum, e) => sum + e.hours, 0);

    totalLag += uninvoicedHours * comp.hourlyRate;
  }

  return totalLag;
}
