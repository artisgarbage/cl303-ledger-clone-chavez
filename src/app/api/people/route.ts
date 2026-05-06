import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateMonthlyCostBases,
  isSalariedCostBasis,
} from "@/lib/engine/cost-basis";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month") ?? format(new Date(), "yyyy-MM");

  const [people, costBases] = await Promise.all([
    prisma.person.findMany({
      where: { companyId, isActive: true },
      include: {
        compensationRecords: {
          orderBy: { effectiveDate: "desc" },
          take: 1,
        },
      },
    }),
    calculateMonthlyCostBases(companyId, monthParam),
  ]);

  const costBaseMap = new Map(costBases.map((cb) => [cb.personId, cb]));

  const result = people.map((person) => {
    const cb = costBaseMap.get(person.id);
    return {
      personId: person.id,
      name: person.name,
      type: person.type,
      email: person.email,
      totalHours: cb?.totalHoursWorked ?? 0,
      billableHours: cb
        ? isSalariedCostBasis(cb)
          ? cb.billableHours
          : cb.totalHoursWorked
        : 0,
      utilization: cb ? (isSalariedCostBasis(cb) ? cb.utilizationRate : 1) : 0,
      effectiveRate: cb
        ? isSalariedCostBasis(cb)
          ? cb.effectiveHourlyRate
          : cb.hourlyRate
        : null,
      totalCost: cb
        ? isSalariedCostBasis(cb)
          ? cb.totalMonthlyCompensation
          : cb.totalCost
        : 0,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  const body = (await req.json()) as {
    name: string;
    email?: string;
    type: "SALARIED" | "CONTRACTOR" | "PARTNER";
    annualSalary?: number;
    hourlyRate?: number;
    burdenRate?: number;
    invoiceLagDays?: number;
  };

  const person = await prisma.person.create({
    data: {
      companyId,
      name: body.name,
      email: body.email ?? null,
      type: body.type,
    },
  });

  if (body.annualSalary || body.hourlyRate) {
    await prisma.compensationRecord.create({
      data: {
        personId: person.id,
        effectiveDate: new Date(),
        annualSalary: body.annualSalary ?? null,
        hourlyRate: body.hourlyRate ?? null,
        burdenRate: body.burdenRate ?? 1.25,
        invoiceLagDays: body.invoiceLagDays ?? 30,
      },
    });
  }

  return NextResponse.json(person, { status: 201 });
}
