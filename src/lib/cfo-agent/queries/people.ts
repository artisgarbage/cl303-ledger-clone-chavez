/**
 * Query helpers for people-related data (team, utilization, cost basis)
 */

import { prisma } from "@/lib/prisma";
import {
  calculateMonthlyCostBases,
  type PersonCostBasis,
} from "@/lib/engine/cost-basis";
import { toMonthKey } from "@/lib/utils/dates";

export interface PersonListItem {
  id: string;
  name: string;
  email: string | null;
  type: "SALARIED" | "PARTNER" | "CONTRACTOR";
  isActive: boolean;
}

export async function listPeople(
  companyId: string,
  filters?: {
    isActive?: boolean;
    type?: "SALARIED" | "PARTNER" | "CONTRACTOR";
  },
): Promise<PersonListItem[]> {
  const where: any = { companyId };

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  if (filters?.type) {
    where.type = filters.type;
  }

  const people = await prisma.person.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      isActive: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return people;
}

export interface PersonUtilization {
  personId: string;
  personName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilizationRate: number; // Decimal 0-1 (e.g., 0.65 = 65%)
  effectiveRate: number | null; // Revenue / billable hours
}

export async function getUtilization(
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
  personId?: string,
): Promise<PersonUtilization[]> {
  const where: any = { companyId, isActive: true };
  if (personId) {
    where.id = personId;
  }

  const people = await prisma.person.findMany({
    where,
    include: {
      timeEntries: {
        where: {
          date: { gte: periodStart, lte: periodEnd },
        },
      },
      allocations: {
        where: {
          project: {
            revenue: {
              some: {
                periodStart: { lte: periodEnd },
                periodEnd: { gte: periodStart },
              },
            },
          },
        },
        include: {
          project: {
            include: {
              revenue: {
                where: {
                  periodStart: { lte: periodEnd },
                  periodEnd: { gte: periodStart },
                },
              },
            },
          },
        },
      },
    },
  });

  const results: PersonUtilization[] = [];

  for (const person of people) {
    const totalHours = person.timeEntries.reduce((sum, e) => sum + e.hours, 0);
    const billableHours = person.timeEntries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + e.hours, 0);
    const nonBillableHours = totalHours - billableHours;
    const utilizationRate = totalHours > 0 ? billableHours / totalHours : 0;

    // Calculate effective rate (revenue attributable to this person / billable hours)
    let effectiveRate: number | null = null;
    if (billableHours > 0) {
      const projectRevenue = person.allocations
        .flatMap((a) => a.project.revenue)
        .reduce((sum, r) => sum + r.amount, 0);
      // Simplistic attribution: total project revenue / billable hours on those projects
      // A more sophisticated model would weight by allocation percentage
      effectiveRate = projectRevenue / billableHours;
    }

    results.push({
      personId: person.id,
      personName: person.name,
      totalHours,
      billableHours,
      nonBillableHours,
      utilizationRate,
      effectiveRate,
    });
  }

  return results.sort((a, b) => a.utilizationRate - b.utilizationRate);
}

export async function getTrueCostForPerson(
  companyId: string,
  personId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<PersonCostBasis[]> {
  // Generate month keys for the range
  const months: string[] = [];
  const currentDate = new Date(periodStart);
  while (currentDate <= periodEnd) {
    months.push(toMonthKey(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Calculate cost basis for each month
  const costBases: PersonCostBasis[] = [];
  for (const month of months) {
    const monthBases = await calculateMonthlyCostBases(companyId, month);
    const personBasis = monthBases.find((b) => b.personId === personId);
    if (personBasis) {
      costBases.push(personBasis);
    }
  }

  return costBases;
}

export interface CompensationInfo {
  personId: string;
  personName: string;
  type: "SALARIED" | "PARTNER" | "CONTRACTOR";
  annualSalary?: number;
  hourlyRate?: number;
  burdenRate?: number;
  effectiveDate: Date;
  endDate?: Date | null;
}

export async function getCompensation(
  companyId: string,
  personId: string,
): Promise<CompensationInfo | null> {
  const person = await prisma.person.findUnique({
    where: { id: personId, companyId },
    include: {
      compensationRecords: {
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
    },
  });

  if (!person || person.compensationRecords.length === 0) {
    return null;
  }

  const comp = person.compensationRecords[0];
  return {
    personId: person.id,
    personName: person.name,
    type: person.type,
    annualSalary: comp.annualSalary ?? undefined,
    hourlyRate: comp.hourlyRate ?? undefined,
    burdenRate: comp.burdenRate ?? undefined,
    effectiveDate: comp.effectiveDate,
    endDate: comp.endDate,
  };
}
