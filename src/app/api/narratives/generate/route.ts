import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAccess, extractRequestMetadata } from "@/lib/audit";
import {
  generateNarrative,
  type FinancialSnapshot,
} from "@/lib/narrative-builder";
import { NarrativeType, Prisma } from "@prisma/client";
import { z } from "zod";

const generateRequestSchema = z.object({
  type: z.nativeEnum(NarrativeType),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  companyId: z.string().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return session;
}

/**
 * POST /api/narratives/generate
 * Generate a new AI narrative for a given period
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userCompanyId = (session.user as { companyId?: string }).companyId;
  if (!userCompanyId) {
    return NextResponse.json({ error: "No company" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = generateRequestSchema.parse(body);

    const companyId = parsed.companyId || userCompanyId;

    // Verify user has access to this company
    if (companyId !== userCompanyId) {
      return NextResponse.json(
        { error: "Cannot generate narratives for other companies" },
        { status: 403 },
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SECURITY: Check if AI narratives are enabled for this company
    // Default is OFF (narrativesEnabled=false) to prevent PII egress to
    // Anthropic without explicit opt-in. Line-item names often contain
    // vendor/customer names that would violate GDPR/CCPA data processing.
    // ───────────────────────────────────────────────────────────────────────
    const companySettings = await prisma.companySettings.findUnique({
      where: { companyId },
    });

    if (!companySettings?.narrativesEnabled) {
      return NextResponse.json(
        {
          error:
            "AI narratives are disabled for this company. Enable them in Settings to generate reports.",
        },
        { status: 403 },
      );
    }

    const periodStart = new Date(parsed.periodStart);
    const periodEnd = new Date(parsed.periodEnd);

    // Fetch financial periods for the requested range
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
          include: {
            settings: true,
          },
        },
      },
      orderBy: { periodStart: "asc" },
    });

    if (periods.length === 0) {
      return NextResponse.json(
        { error: "No financial data found for the requested period" },
        { status: 400 },
      );
    }

    // Aggregate data from all periods in the range
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

    // Get company settings for targets
    const company = periods[0].company;
    const settings = company.settings;

    // ───────────────────────────────────────────────────────────────────────
    // SECURITY: Redact line-item names to prevent vendor/customer PII egress
    // QuickBooks line-item "name" field often contains:
    //   - Customer names ("Acme Corp - Invoice #1234")
    //   - Vendor names ("John Doe - Contractor")
    //   - Employee names, project codes, etc.
    // We send only category + amount to Claude, never the raw name field.
    // ───────────────────────────────────────────────────────────────────────
    const allLineItems = periods.flatMap((p) => p.lineItems);
    const topLineItems = allLineItems
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 20)
      .map((item) => ({
        category: item.category,
        name: "[REDACTED]", // Never send line-item names to AI
        amount: item.amount,
      }));

    // For year-over-year narratives, fetch prior periods
    let priorPeriods: FinancialSnapshot["priorPeriods"] = undefined;
    if (parsed.type === "YEAR_OVER_YEAR") {
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

    // Build the snapshot
    const snapshot: FinancialSnapshot = {
      companyName: company.name,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      basis: periods[0].basis, // Use basis of first period
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

    // Generate the narrative
    const result = await generateNarrative(parsed.type, snapshot);

    // Store the narrative
    const narrative = await prisma.narrative.create({
      data: {
        companyId,
        type: parsed.type,
        periodStart,
        periodEnd,
        content: result.content,
        title: result.title,
        promptUsed: result.promptUsed,
        dataSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });


    // Audit log: AI narrative generation
    await logAccess({
      userId: session.user!.id!,
      companyId,
      action: 'create',
      resource: 'narrative',
      resourceId: narrative.id,
      metadata: {
        ...extractRequestMetadata(req),
        type: parsed.type,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
      },
    });

    return NextResponse.json({
      narrativeId: narrative.id,
      title: narrative.title,
      content: narrative.content,
      generatedAt: narrative.generatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      console.error("Error generating narrative:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
