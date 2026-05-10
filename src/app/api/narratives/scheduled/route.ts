import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  generateNarrative,
  type FinancialSnapshot,
} from "@/lib/narrative-builder";
import { NarrativeType, Prisma } from "@prisma/client";

interface GenerationResult {
  type: NarrativeType;
  periodStart: Date;
  periodEnd: Date;
  status: "ok" | "skipped" | "error";
  error?: string;
}

/**
 * GET /api/narratives/scheduled
 * Cron-triggered scheduled generation of narratives
 */
export async function GET(req: NextRequest) {
  // Verify CRON_SECRET header
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const providedSecret = authHeader?.replace("Bearer ", "") ?? "";
  const providedBuf = Buffer.from(providedSecret);
  const expectedBuf = Buffer.from(expectedSecret);
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: GenerationResult[] = [];
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth(); // 0-indexed

  try {
    // Get all companies (for multi-tenant support)
    const companies = await prisma.company.findMany({
      include: { settings: true },
    });

    for (const company of companies) {
      // MONTHLY: Due on 3rd of each month for prior month
      if (currentDay === 3) {
        const result = await generateMonthly(company.id, now);
        results.push(result);
      }

      // QUARTERLY: Due on 5th of Jan, Apr, Jul, Oct for prior quarter
      if (currentDay === 5 && currentMonth % 3 === 0) {
        const result = await generateQuarterly(company.id, now);
        results.push(result);
      }

      // ANNUAL: Due on 10th of January for prior year
      if (currentDay === 10 && currentMonth === 0) {
        const result = await generateAnnual(company.id, now);
        results.push(result);
      }
    }

    const summary = {
      generated: results.filter((r) => r.status === "ok").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results
        .filter((r) => r.status === "error")
        .map((r) => r.error || "Unknown error"),
    };

    // Log results
    results.forEach((r) => {
      const periodStr = `${r.periodStart.toISOString().split("T")[0]}→${r.periodEnd.toISOString().split("T")[0]}`;
      console.log(
        `[narrative] ${r.type} ${periodStr} — ${r.status}${r.error ? `: ${r.error}` : ""}`,
      );
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Scheduled narrative generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * Generate monthly summary for the prior calendar month
 */
async function generateMonthly(
  companyId: string,
  now: Date,
): Promise<GenerationResult> {
  const priorMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodStart = new Date(
    priorMonth.getFullYear(),
    priorMonth.getMonth(),
    1,
  );
  const periodEnd = new Date(
    priorMonth.getFullYear(),
    priorMonth.getMonth() + 1,
    0,
  );

  return generateNarrativeForPeriod(
    companyId,
    "MONTHLY_SUMMARY",
    periodStart,
    periodEnd,
  );
}

/**
 * Generate quarterly review for the prior quarter
 */
async function generateQuarterly(
  companyId: string,
  now: Date,
): Promise<GenerationResult> {
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const priorQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const periodStart = new Date(year, priorQuarter * 3, 1);
  const periodEnd = new Date(year, priorQuarter * 3 + 3, 0);

  return generateNarrativeForPeriod(
    companyId,
    "QUARTERLY_REVIEW",
    periodStart,
    periodEnd,
  );
}

/**
 * Generate year-over-year analysis for the prior full year
 */
async function generateAnnual(
  companyId: string,
  now: Date,
): Promise<GenerationResult> {
  const priorYear = now.getFullYear() - 1;
  const periodStart = new Date(priorYear, 0, 1);
  const periodEnd = new Date(priorYear, 11, 31);

  return generateNarrativeForPeriod(
    companyId,
    "YEAR_OVER_YEAR",
    periodStart,
    periodEnd,
  );
}

/**
 * Generate a narrative for a specific period (idempotent)
 */
async function generateNarrativeForPeriod(
  companyId: string,
  type: NarrativeType,
  periodStart: Date,
  periodEnd: Date,
): Promise<GenerationResult> {
  try {
    // Check if narrative already exists
    const existing = await prisma.narrative.findFirst({
      where: {
        companyId,
        type,
        periodStart,
        periodEnd,
      },
    });

    if (existing) {
      return { type, periodStart, periodEnd, status: "skipped" };
    }

    // Fetch financial periods
    const periods = await prisma.financialPeriod.findMany({
      where: {
        companyId,
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
      include: {
        lineItems: {
          where: { isTotal: false },
          orderBy: { amount: "desc" },
          take: 20,
        },
        company: {
          include: { settings: true },
        },
      },
    });

    if (periods.length === 0) {
      return {
        type,
        periodStart,
        periodEnd,
        status: "error",
        error: "No financial data found",
      };
    }

    // Aggregate data
    const aggregated = periods.reduce(
      (acc, period) => ({
        totalRevenue: acc.totalRevenue + period.totalRevenue,
        totalCOGS: acc.totalCOGS + period.totalCOGS,
        grossProfit: acc.grossProfit + period.grossProfit,
        totalOpEx: acc.totalOpEx + period.totalOpEx,
        netIncome: acc.netIncome + period.netIncome,
        cogsPayroll: (acc.cogsPayroll || 0) + (period.cogsPayroll || 0),
        cogsContractors:
          (acc.cogsContractors || 0) + (period.cogsContractors || 0),
        cogsSoftware: (acc.cogsSoftware || 0) + (period.cogsSoftware || 0),
      }),
      {
        totalRevenue: 0,
        totalCOGS: 0,
        grossProfit: 0,
        totalOpEx: 0,
        netIncome: 0,
        cogsPayroll: 0,
        cogsContractors: 0,
        cogsSoftware: 0,
      },
    );

    const grossMargin =
      aggregated.totalRevenue > 0
        ? aggregated.grossProfit / aggregated.totalRevenue
        : 0;
    const netMargin =
      aggregated.totalRevenue > 0
        ? aggregated.netIncome / aggregated.totalRevenue
        : 0;

    const company = periods[0].company;
    const settings = company.settings;

    // Top line items
    const allLineItems = periods.flatMap((p) => p.lineItems);
    const topLineItems = allLineItems
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 20)
      .map((item) => ({
        category: item.category,
        name: item.name,
        amount: item.amount,
      }));

    // Prior periods for YoY
    let priorPeriods: FinancialSnapshot["priorPeriods"] = undefined;
    if (type === "YEAR_OVER_YEAR") {
      const priorYearStart = new Date(periodStart);
      priorYearStart.setFullYear(priorYearStart.getFullYear() - 1);
      const priorYearEnd = new Date(periodEnd);
      priorYearEnd.setFullYear(priorYearEnd.getFullYear() - 1);

      const priorYearPeriods = await prisma.financialPeriod.findMany({
        where: {
          companyId,
          periodStart: { lte: priorYearEnd },
          periodEnd: { gte: priorYearStart },
        },
      });

      if (priorYearPeriods.length > 0) {
        const priorAggregated = priorYearPeriods.reduce(
          (acc, p) => ({
            totalRevenue: acc.totalRevenue + p.totalRevenue,
            netIncome: acc.netIncome + p.netIncome,
            grossProfit: acc.grossProfit + p.grossProfit,
          }),
          { totalRevenue: 0, netIncome: 0, grossProfit: 0 },
        );

        priorPeriods = [
          {
            periodStart: priorYearStart.toISOString(),
            periodEnd: priorYearEnd.toISOString(),
            totalRevenue: priorAggregated.totalRevenue,
            netIncome: priorAggregated.netIncome,
            grossMargin:
              priorAggregated.totalRevenue > 0
                ? priorAggregated.grossProfit / priorAggregated.totalRevenue
                : 0,
          },
        ];
      }
    }

    // Build snapshot
    const snapshot: FinancialSnapshot = {
      companyName: company.name,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      basis: periods[0].basis,
      totalRevenue: aggregated.totalRevenue,
      totalCOGS: aggregated.totalCOGS,
      grossProfit: aggregated.grossProfit,
      grossMargin,
      totalOpEx: aggregated.totalOpEx,
      netIncome: aggregated.netIncome,
      netMargin,
      cogsPayroll: aggregated.cogsPayroll || null,
      cogsContractors: aggregated.cogsContractors || null,
      cogsSoftware: aggregated.cogsSoftware || null,
      revenueTarget: settings?.revenueTarget || null,
      grossMarginTargetMin: settings?.grossMarginTargetMin || null,
      grossMarginTargetMax: settings?.grossMarginTargetMax || null,
      netProfitTarget: settings?.netProfitTarget || null,
      topLineItems,
      priorPeriods,
    };

    // Generate narrative
    const result = await generateNarrative(type, snapshot);

    // Store narrative
    await prisma.narrative.create({
      data: {
        companyId,
        type,
        periodStart,
        periodEnd,
        content: result.content,
        title: result.title,
        promptUsed: result.promptUsed,
        dataSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    return { type, periodStart, periodEnd, status: "ok" };
  } catch (error) {
    return {
      type,
      periodStart,
      periodEnd,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
