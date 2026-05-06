import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildMonthlyPrompt,
  buildCustomPrompt,
} from "@/lib/narrative/prompt-builder";
import { getProjectProfitability } from "@/lib/engine/project-profitability";
import {
  calculateMonthlyCostBases,
  isSalariedCostBasis,
  getCompanyContractorLag,
} from "@/lib/engine/cost-basis";
import { getPeriodsForCompany } from "@/lib/engine/period-comparison";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { format } from "date-fns";
import { NarrativeType, AccountingBasis } from "@prisma/client";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "No company associated" },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as {
    type: NarrativeType;
    periodStart: string;
    periodEnd: string;
    basis?: AccountingBasis;
    question?: string;
    compareMode?: string;
    comparePeriodStart?: string;
    comparePeriodEnd?: string;
  };

  const {
    type,
    periodStart,
    periodEnd,
    basis = AccountingBasis.CASH,
    question,
    compareMode,
    comparePeriodStart,
    comparePeriodEnd,
  } = body;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { settings: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  try {
    let prompt: string;
    let dataSnapshot: Record<string, unknown>;

    if (type === NarrativeType.CUSTOM && question) {
      const allPeriods = await getPeriodsForCompany(companyId);
      const context = allPeriods
        .map(
          (p) =>
            `Period: ${format(p.periodStart, "MMM yyyy")} (${p.basis})\n` +
            `  Revenue: $${p.totalRevenue.toFixed(0)}, Gross Margin: ${(p.grossMargin * 100).toFixed(1)}%, Net Income: $${p.netIncome.toFixed(0)}`,
        )
        .join("\n");

      prompt = buildCustomPrompt({
        companyName: company.name,
        question,
        context,
      });
      dataSnapshot = { type: "custom", question, periods: allPeriods.length };
    } else {
      // Build monthly data package
      const [currentPeriod, projects, contractorLag] = await Promise.all([
        prisma.financialPeriod.findFirst({
          where: {
            companyId,
            basis,
            periodStart: { lte: end },
            periodEnd: { gte: start },
          },
          orderBy: { periodStart: "desc" },
        }),
        getProjectProfitability(companyId, start, end, basis),
        getCompanyContractorLag(companyId),
      ]);

      // Get prior period for delta calculation
      const priorStart = new Date(start);
      priorStart.setMonth(priorStart.getMonth() - 1);
      const priorEnd = new Date(end);
      priorEnd.setMonth(priorEnd.getMonth() - 1);

      const priorPeriod = await prisma.financialPeriod.findFirst({
        where: {
          companyId,
          basis,
          periodStart: { lte: priorEnd },
          periodEnd: { gte: priorStart },
        },
        orderBy: { periodStart: "desc" },
      });

      // Get accrual period for cash vs. accrual delta
      const accrualBasis =
        basis === AccountingBasis.CASH
          ? AccountingBasis.ACCRUAL
          : AccountingBasis.CASH;
      const altPeriod = await prisma.financialPeriod.findFirst({
        where: {
          companyId,
          basis: accrualBasis,
          periodStart: { lte: end },
          periodEnd: { gte: start },
        },
      });

      const monthKey = format(start, "yyyy-MM");
      const costBases = await calculateMonthlyCostBases(companyId, monthKey);

      const avgUtilization =
        costBases.length > 0
          ? costBases.reduce((sum, cb) => {
              const util = isSalariedCostBasis(cb) ? cb.utilizationRate : 1;
              return sum + util;
            }, 0) / costBases.length
          : 0;

      const utilizationByPerson = costBases.map((cb) => ({
        name: cb.personName,
        utilization: isSalariedCostBasis(cb) ? cb.utilizationRate : 1,
        billableHours: isSalariedCostBasis(cb)
          ? cb.billableHours
          : cb.totalHoursWorked,
        totalHours: cb.totalHoursWorked,
        effectiveRate: isSalariedCostBasis(cb)
          ? cb.effectiveHourlyRate
          : cb.hourlyRate,
      }));

      const revenue = currentPeriod?.totalRevenue ?? 0;
      const cogs = currentPeriod?.totalCOGS ?? 0;
      const adjustedCogs = cogs + contractorLag;
      const adjustedGrossMargin =
        revenue > 0 ? (revenue - adjustedCogs) / revenue : 0;

      const revenueDelta =
        priorPeriod && priorPeriod.totalRevenue > 0
          ? (revenue - priorPeriod.totalRevenue) / priorPeriod.totalRevenue
          : null;

      const dataPackage = {
        companyName: company.name,
        periodLabel: `${format(start, "MMMM yyyy")} (${basis})`,
        basis,
        revenue,
        revenueDelta,
        revenueYoY: null,
        cogs,
        cogsPayroll: currentPeriod?.cogsPayroll ?? 0,
        cogsContractors: currentPeriod?.cogsContractors ?? 0,
        cogsSoftware: currentPeriod?.cogsSoftware ?? 0,
        grossProfit: currentPeriod?.grossProfit ?? 0,
        grossMargin: currentPeriod?.grossMargin ?? 0,
        opex: currentPeriod?.totalOpEx ?? 0,
        netIncome: currentPeriod?.netIncome ?? 0,
        netMargin: currentPeriod?.netMargin ?? 0,
        cashRevenue:
          basis === AccountingBasis.CASH ? revenue : altPeriod?.totalRevenue,
        accrualRevenue:
          basis === AccountingBasis.ACCRUAL ? revenue : altPeriod?.totalRevenue,
        cashAccrualDelta: altPeriod
          ? Math.abs(revenue - (altPeriod?.totalRevenue ?? 0))
          : undefined,
        contractorLag,
        adjustedCogs,
        adjustedGrossMargin,
        projects: projects.slice(0, 10).map((p) => ({
          name: p.projectName,
          revenue: p.revenue,
          trueCost: p.trueCost,
          margin: p.grossMargin,
        })),
        utilizationByPerson,
        avgUtilization,
        revenueTarget: company.settings?.revenueTarget ?? null,
        grossMarginTarget:
          company.settings?.grossMarginTargetMin &&
          company.settings?.grossMarginTargetMax
            ? `${(company.settings.grossMarginTargetMin * 100).toFixed(0)}%-${(company.settings.grossMarginTargetMax * 100).toFixed(0)}%`
            : null,
        netProfitTarget: company.settings?.netProfitTarget ?? null,
        compareMode: compareMode ?? undefined,
        comparisonContext: undefined as string | undefined,
      };

      // Fetch and attach comparison period context when requested
      if (
        compareMode &&
        compareMode !== "none" &&
        comparePeriodStart &&
        comparePeriodEnd
      ) {
        const cmpStart = new Date(comparePeriodStart);
        const cmpEnd = new Date(comparePeriodEnd);
        const cmpPeriod = await prisma.financialPeriod.findFirst({
          where: {
            companyId,
            basis,
            periodStart: { lte: cmpEnd },
            periodEnd: { gte: cmpStart },
          },
          orderBy: { periodStart: "desc" },
        });
        if (cmpPeriod) {
          const cmpPeriodLabel = `${format(cmpPeriod.periodStart, "MMM d, yyyy")} – ${format(cmpPeriod.periodEnd, "MMM d, yyyy")}`;
          const cmpRevenueDelta =
            cmpPeriod.totalRevenue > 0
              ? ((revenue - cmpPeriod.totalRevenue) /
                  Math.abs(cmpPeriod.totalRevenue)) *
                100
              : null;
          const cmpMarginDelta =
            (currentPeriod?.grossMargin ?? 0) - cmpPeriod.grossMargin;
          const cmpNetDelta =
            cmpPeriod.netIncome !== 0
              ? (((currentPeriod?.netIncome ?? 0) - cmpPeriod.netIncome) /
                  Math.abs(cmpPeriod.netIncome)) *
                100
              : null;

          dataPackage.comparisonContext =
            `COMPARISON PERIOD (${compareMode.toUpperCase()} — ${cmpPeriodLabel}):\n` +
            `Revenue: ${formatCurrency(cmpPeriod.totalRevenue)} → ${formatCurrency(revenue)}` +
            (cmpRevenueDelta !== null
              ? ` (${cmpRevenueDelta >= 0 ? "+" : ""}${cmpRevenueDelta.toFixed(1)}%)\n`
              : ` (N/A)\n`) +
            `Gross Margin: ${formatPercent(cmpPeriod.grossMargin)} → ${formatPercent(currentPeriod?.grossMargin ?? 0)}` +
            ` (${cmpMarginDelta >= 0 ? "+" : ""}${(cmpMarginDelta * 100).toFixed(1)} pp)\n` +
            `Net Income: ${formatCurrency(cmpPeriod.netIncome)} → ${formatCurrency(currentPeriod?.netIncome ?? 0)}` +
            (cmpNetDelta !== null
              ? ` (${cmpNetDelta >= 0 ? "+" : ""}${cmpNetDelta.toFixed(1)}%)\n`
              : ` (N/A)\n`) +
            `OpEx: ${formatCurrency(cmpPeriod.totalOpEx)} → ${formatCurrency(currentPeriod?.totalOpEx ?? 0)}\n`;
        }
      }

      prompt = buildMonthlyPrompt(dataPackage);
      dataSnapshot = dataPackage as unknown as Record<string, unknown>;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const narrative = await prisma.narrative.create({
      data: {
        companyId,
        type,
        periodStart: start,
        periodEnd: end,
        content: content.text,
        dataSnapshot:
          dataSnapshot as import("@prisma/client").Prisma.InputJsonValue,
        promptUsed: prompt,
        title: `${type.replace(/_/g, " ")} - ${format(start, "MMM yyyy")}`,
      },
    });

    return NextResponse.json({
      narrativeId: narrative.id,
      content: content.text,
    });
  } catch (err) {
    console.error("Narrative generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as { companyId: string }).companyId;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "10");

  const narratives = await prisma.narrative.findMany({
    where: { companyId },
    orderBy: { generatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      generatedAt: true,
      periodStart: true,
      periodEnd: true,
      content: true,
      title: true,
    },
  });

  return NextResponse.json(narratives);
}
